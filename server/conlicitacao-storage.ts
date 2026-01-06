import { conLicitacaoAPI } from './conlicitacao-api';
import { Bidding, Boletim, Filtro, Acompanhamento, User, InsertUser, Favorite, InsertFavorite, favorites, biddings, boletins, filtros } from '../shared/schema';
import { db } from "./db";
import { eq, and, sql, desc, inArray } from "drizzle-orm";

export interface IConLicitacaoStorage {
  // Users (mantemos localmente)
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Filtros - vem da API real
  getFiltros(): Promise<Filtro[]>;
  
  // Boletins - vem da API real
  getBoletins(filtroId: number, page?: number, perPage?: number): Promise<{ boletins: Boletim[], total: number }>;
  getBoletim(id: number): Promise<{ boletim: Boletim, licitacoes: Bidding[], acompanhamentos: Acompanhamento[] } | undefined>;
  markBoletimAsViewed(id: number): Promise<void>;
  
  // Biddings - transformados da API real
  getBiddings(filters?: { 
    conlicitacao_id?: string; 
    orgao?: string[]; 
    uf?: string[];
    numero_controle?: string;
  }): Promise<Bidding[]>;
  getBiddingsPaginated(filters?: { 
    conlicitacao_id?: string; 
    orgao?: string[]; 
    uf?: string[];
    numero_controle?: string;
  }, page?: number, limit?: number): Promise<{ biddings: Bidding[], total: number }>;
  getBiddingsCount(): Promise<number>;
  getBidding(id: number): Promise<Bidding | undefined>;
  getBiddingsByIds(ids: number[]): Promise<Bidding[]>;

  // Favorites (mantemos localmente)
  getFavorites(userId: number, date?: string, dateFrom?: string, dateTo?: string): Promise<Bidding[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: number, biddingId: number): Promise<void>;
  isFavorite(userId: number, biddingId: number): Promise<boolean>;
  updateFavoriteCategorization(userId: number, biddingId: number, data: {
    category?: string;
    customCategory?: string;
    notes?: string;
  }): Promise<void>;

  pinBidding(bidding: Bidding): Promise<void>;
}

export class ConLicitacaoStorage implements IConLicitacaoStorage {
  private users: Map<number, User>;
  private favorites: Map<number, Favorite>;
  private currentUserId: number;
  private currentFavoriteId: number;
  private periodicRefreshInProgress: boolean = false;
  private autoRefreshTimer?: NodeJS.Timeout;

  constructor() {
    this.users = new Map();
    this.favorites = new Map();
    this.currentUserId = 1;
    this.currentFavoriteId = 1;
    
    this.startAutoRefresh();
  }

  private startAutoRefresh() {
    if (this.autoRefreshTimer) return;
    this.autoRefreshTimer = setInterval(() => {
      this.refreshRecentBoletins().catch(() => {});
    }, 10 * 60 * 1000); // 10 minutes
    setTimeout(() => {
      this.refreshRecentBoletins().catch(() => {});
    }, 2000);
  }

  private async refreshRecentBoletins(): Promise<void> {
    if (this.periodicRefreshInProgress) return;
    this.periodicRefreshInProgress = true;
    
    try {
      const filtros = await this.getFiltros();
      const targetFiltros = filtros.slice(0, 1);
      
      // AUMENTADO: Carregar últimos 180 boletins (~6 meses) conforme solicitado
      // Implementação com paginação para garantir que a API não limite a quantidade
      const TARGET_TOTAL = 180;
      const PAGE_SIZE = 50;
      
      for (const filtro of targetFiltros) {
        try {
          let allBoletins: any[] = [];
          let page = 1;
          let keepFetching = true;

          while (keepFetching && allBoletins.length < TARGET_TOTAL) {
            const response = await this.getBoletins(filtro.id, page, PAGE_SIZE);
            const pageBoletins = response.boletins || [];
            
            if (pageBoletins.length === 0) {
              keepFetching = false;
            } else {
              allBoletins = [...allBoletins, ...pageBoletins];
              page++;
            }
            
            // Proteção contra loop infinito se a API falhar
            if (page > 10) keepFetching = false;
          }

          // Limitar ao target se passou
          if (allBoletins.length > TARGET_TOTAL) {
            allBoletins = allBoletins.slice(0, TARGET_TOTAL);
          }
          
          // Processar em paralelo com controle de concorrência (chunks) para agilizar
          const chunkSize = 5; // 5 requisições simultâneas
          
          for (let i = 0; i < allBoletins.length; i += chunkSize) {
            const chunk = allBoletins.slice(i, i + chunkSize);
            await Promise.all(chunk.map(async (boletim: any) => {
              try {
                const boletimData = await conLicitacaoAPI.getBoletimData(boletim.id);
                if (boletimData?.licitacoes) {
                  const biddingsToUpsert: any[] = [];
                  boletimData.licitacoes.forEach((licitacao: any) => {
                    const transformed = this.transformLicitacaoFromAPI(licitacao, boletim.id, 'api');
                    biddingsToUpsert.push(transformed);
                  });
                  await this.upsertBiddings(biddingsToUpsert);
                }
              } catch (e) {
                // Erro pontual em boletim ignora
              }
            }));
          }
        } catch (err) {
          console.error(`Erro ao processar filtro ${filtro.id}:`, err);
        }
      }
      
    } catch (err) {
      console.error('Erro geral na atualização de boletins:', err);
    }
    this.periodicRefreshInProgress = false;
  }

  public async manualRefreshBoletins(): Promise<{ updated: number; lastUpdate: number }> {
    await this.refreshRecentBoletins();
    const count = await this.getBiddingsCount();
    return { updated: count, lastUpdate: Date.now() };
  }

  // Métodos de usuário (mantemos localmente)
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Métodos da API ConLicitação
  async getFiltros(): Promise<Filtro[]> {
    try {
      const response = await conLicitacaoAPI.getFiltros();
      
      // Transformar resposta da API para nosso formato
      const filtros: Filtro[] = response.filtros.map((filtro: any) => ({
        id: filtro.id,
        descricao: filtro.descricao,
        cliente_id: response.cliente.id,
        cliente_razao_social: response.cliente.razao_social,
        manha: filtro.periodos?.manha || true,
        tarde: filtro.periodos?.tarde || true,
        noite: filtro.periodos?.noite || true,
      }));

      // Se a API responder com nenhum filtro, garantir um filtro de teste em desenvolvimento
      if (!filtros.length) {
        return [{
          id: 1,
          descricao: "Filtro teste - aguardando autorização IP",
          cliente_id: response?.cliente?.id ?? 1,
          cliente_razao_social: response?.cliente?.razao_social ?? "Cliente Teste",
          manha: true,
          tarde: true,
          noite: true,
        }];
      }

      return filtros;
    } catch (error: any) {
      if (error.message !== 'IP_NOT_AUTHORIZED') {
        console.error('❌ [MOBILE DEBUG] Erro ao buscar filtros da API:', error);
      }
      
      // Dados de teste para desenvolvimento enquanto IP não está autorizado
      return [{
        id: 1,
        descricao: "Filtro teste - aguardando autorização IP",
        cliente_id: 1,
        cliente_razao_social: "Cliente Teste",
        manha: true,
        tarde: true,
        noite: true,
      }];
    }
  }



  async getBoletins(filtroId: number, page: number = 1, perPage: number = 100): Promise<{ boletins: Boletim[], total: number }> {
    try {
      let apiBoletins: any[] = [];
      let totalItems = 0;
      const API_LIMIT = 100;

      // Lógica de paginação virtual para contornar limite da API
      if (perPage > API_LIMIT) {
        
        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;
        
        const startApiPage = Math.floor(startIndex / API_LIMIT) + 1;
        const endApiPage = Math.ceil(endIndex / API_LIMIT);
        
        
        for (let p = startApiPage; p <= endApiPage; p++) {
          const response = await conLicitacaoAPI.getBoletins(filtroId, p, API_LIMIT);
          const pageBoletins = response.boletins || [];
          
          if (pageBoletins.length === 0) break;
          
          apiBoletins = [...apiBoletins, ...pageBoletins];
          
          // Tentar extrair o total da primeira resposta válida
          if (totalItems === 0) {
             const r: any = response as any;
             const candidates = [r?.total, r?.filtro?.total_boletins, r?.total_boletins, r?.pagination?.total];
             const found = candidates.find((v: any) => typeof v === 'number');
             if (typeof found === 'number') totalItems = found;
          }
        }
        
        // Ajustar o slice para retornar a página correta relativa ao pedido original
        const apiStartIndexGlobal = (startApiPage - 1) * API_LIMIT;
        const sliceStart = startIndex - apiStartIndexGlobal;
        const sliceEnd = sliceStart + perPage;
        
        if (apiBoletins.length > sliceStart) {
          apiBoletins = apiBoletins.slice(sliceStart, Math.min(apiBoletins.length, sliceEnd));
        } else {
          apiBoletins = [];
        }
        
      } else {
        // Fluxo padrão (<= 100)
        const response = await conLicitacaoAPI.getBoletins(filtroId, page, perPage);
        apiBoletins = response.boletins || [];
        const r: any = response as any;
        const candidates = [r?.total, r?.filtro?.total_boletins, r?.total_boletins, r?.pagination?.total];
        const found = candidates.find((v: any) => typeof v === 'number');
        if (typeof found === 'number') totalItems = found;
      }

      if (totalItems === 0) totalItems = apiBoletins.length;

      // CORREÇÃO: A API básica não retorna quantidades, precisamos buscar de forma híbrida
      
      // Buscar status de visualização no banco
      const boletimIds = apiBoletins.map((b: any) => b.id);
      let viewedIds = new Set<number>();
      
      if (boletimIds.length > 0) {
        const viewed = await db.select({ id: boletins.id })
          .from(boletins)
          .where(and(
            inArray(boletins.id, boletimIds),
            eq(boletins.visualizado, true)
          ));
        viewedIds = new Set(viewed.map(v => v.id));
      }

      // Buscar contagens em paralelo usando cache para performance
      const boletinsWithCounts = apiBoletins.map((boletim: any) => {
        return {
          id: boletim.id,
          numero_edicao: boletim.numero_edicao,
          datahora_fechamento: boletim.datahora_fechamento,
          filtro_id: boletim.filtro_id,
          // Quantidades não disponíveis na listagem rápida
          quantidade_licitacoes: boletim.quantidade_licitacoes || 0,
          quantidade_acompanhamentos: boletim.quantidade_acompanhamentos || 0,
          visualizado: viewedIds.has(boletim.id),
        };
      });
      

      return {
        boletins: boletinsWithCounts,
        total: totalItems
      };
    } catch (error: any) {
      if (error.message !== 'IP_NOT_AUTHORIZED') {
        console.error('Erro ao buscar boletins da API:', error);
      }
      
      throw error;
    }
  }





  async getBoletim(id: number): Promise<{ boletim: Boletim, licitacoes: Bidding[], acompanhamentos: Acompanhamento[] } | undefined> {
    try {
      const response = await conLicitacaoAPI.getBoletimData(id);
      
      // Transformar licitações e acompanhamentos
      const licitacoes: Bidding[] = (response.licitacoes || []).map((licitacao: any) => this.transformLicitacaoFromAPI(licitacao, id, 'api'));
      const acompanhamentos: Acompanhamento[] = (response.acompanhamentos || []).map((acomp: any) => ({
        id: acomp.id,
        conlicitacao_id: acomp.id,
        licitacao_id: acomp.licitacao_id,
        orgao_nome: acomp.orgao.nome,
        orgao_cidade: acomp.orgao.cidade,
        orgao_uf: acomp.orgao.uf,
        objeto: acomp.objeto,
        sintese: acomp.sintese,
        data_fonte: acomp.data_fonte,
        edital: acomp.edital,
        processo: acomp.processo,
        boletim_id: id,
      }));

      const existingBoletim = await db.select().from(boletins).where(eq(boletins.id, id));
      const isViewed = existingBoletim[0]?.visualizado || false;

      const boletim: Boletim = {
        id: response.boletim.id,
        numero_edicao: response.boletim.numero_edicao,
        datahora_fechamento: response.boletim.datahora_fechamento,
        filtro_id: response.boletim.cliente.filtro.id,
        quantidade_licitacoes: licitacoes.length,
        quantidade_acompanhamentos: acompanhamentos.length,
        visualizado: isViewed,
      };

      // Atualizar banco de dados com as licitações
      await this.upsertBiddings(licitacoes);

      return { boletim, licitacoes, acompanhamentos };
    } catch (error: any) {
      if (error.message !== 'IP_NOT_AUTHORIZED') {
        console.error('Erro ao buscar boletim da API:', error);
      }
      
      throw error;
    }
  }



  // Função para expandir status truncados da API (centralizada no backend)
  private expandTruncatedStatus(status: string): string {
    if (!status) return "NOVA";
    
    const truncatedMappings: { [key: string]: string } = {
      "URGEN": "URGENTE",
      "RET": "RETIFICAÇÃO", 
      "ADIA": "ADIADA",
      "PRO": "PRORROGADA",
      "ALTER": "ALTERADA",
      "REAB": "REABERTA",
      "CANCE": "CANCELADA",
      "SUS": "SUSPENSA",
      "REVO": "REVOGADA",
      "ABERTA": "ABERTA", 
      "NOVA": "NOVA",
      "EM_ANAL": "EM ANÁLISE",
      "PRORROG": "PRORROGADA",
      "ALTERA": "ALTERADA",
      "FINALI": "FINALIZADA",
      "SUSP": "SUSPENSA",
      "CANCEL": "CANCELADA",
      "DESERTA": "DESERTA",
      "FRACAS": "FRACASSADA"
    };

    const upperStatus = status.toString().toUpperCase().trim();
    
    // Procura por correspondência exata primeiro
    if (truncatedMappings[upperStatus]) {
      return truncatedMappings[upperStatus];
    }
    
    // Procura por correspondência parcial (status truncado)
    for (const [truncated, full] of Object.entries(truncatedMappings)) {
      if (truncated.startsWith(upperStatus) || upperStatus.startsWith(truncated)) {
        return full;
      }
    }
    
    return upperStatus;
  }

  // Transformar licitação conforme estrutura da documentação da API ConLicitação
  private transformLicitacaoFromAPI(licitacao: any, boletimId: number, dataSource: 'api' | 'mock' = 'api'): Bidding {
    // Processar telefones conforme estrutura da API: orgao.telefone[].ddd, numero, ramal
    const telefones = licitacao.orgao?.telefone?.map((tel: any) => 
      `${tel.ddd ? '(' + tel.ddd + ')' : ''} ${tel.numero}${tel.ramal ? ' ramal ' + tel.ramal : ''}`
    ).join(', ') || '';

    // Extrair URL do documento conforme documentação: documento[] array
    const documentoItem = licitacao.documento?.[0];
    let documentoUrl = '';
    
    if (documentoItem) {
      const baseUrl = 'https://consultaonline.conlicitacao.com.br';
      if (typeof documentoItem === 'string') {
        documentoUrl = documentoItem.startsWith('http') ? documentoItem : baseUrl + documentoItem;
      } else if (documentoItem.url) {
        documentoUrl = documentoItem.url.startsWith('http') ? documentoItem.url : baseUrl + documentoItem.url;
      }
    }

    // Normalizar situação (campo 'situacao' da API) com expansão de truncamentos
    const situacaoOriginal = licitacao.situacao || 'NOVA';
    const situacaoExpandida = this.expandTruncatedStatus(situacaoOriginal);
    
    // Log de debug para rastrear transformações de status
    if (situacaoOriginal !== situacaoExpandida) {
      // Status expandido
    }

    const normalizedId = Number(licitacao.id);
    return {
      id: normalizedId, 
      conlicitacao_id: normalizedId,
      orgao_nome: licitacao.orgao?.nome || '', // Unidade licitante
      orgao_codigo: licitacao.orgao?.codigo || '', // Código UASG
      orgao_cidade: licitacao.orgao?.cidade || '', // Cidade
      orgao_uf: licitacao.orgao?.uf || '', // UF
      orgao_endereco: licitacao.orgao?.endereco || '', // Endereço
      orgao_telefone: telefones, // Telefone processado
      orgao_site: licitacao.orgao?.site || '', // Site
      objeto: licitacao.objeto || '', // Objeto
      situacao: situacaoExpandida, // Situação (expandida no backend)
      datahora_abertura: licitacao.datahora_abertura || '', // Data/Hora abertura
      datahora_documento: licitacao.datahora_documento || null, // Data/Hora documento
      datahora_retirada: licitacao.datahora_retirada || null, // Data/Hora retirada
      datahora_visita: licitacao.datahora_visita || null, // Data/Hora visita
      datahora_prazo: licitacao.datahora_prazo || '', // Data/Hora prazo
      edital: licitacao.edital || '', // Edital
      link_edital: documentoUrl, // Link edital
      documento_url: documentoUrl, // URL do documento
      processo: licitacao.processo || '', // Processo
      observacao: licitacao.observacao || '', // Observações
      item: licitacao.item || '', // Itens
      preco_edital: licitacao.preco_edital || 0, // Valor do edital
      valor_estimado: licitacao.valor_estimado || 0, // Valor estimado
      boletim_id: boletimId,
    };
  }

  private async upsertBiddings(newBiddings: Bidding[]): Promise<void> {
    if (newBiddings.length === 0) return;

    for (const biddingData of newBiddings) {
      try {
        await db.insert(biddings).values(biddingData).onDuplicateKeyUpdate({
          set: {
            orgao_nome: biddingData.orgao_nome,
            orgao_codigo: biddingData.orgao_codigo,
            orgao_cidade: biddingData.orgao_cidade,
            orgao_uf: biddingData.orgao_uf,
            orgao_endereco: biddingData.orgao_endereco,
            orgao_telefone: biddingData.orgao_telefone,
            orgao_site: biddingData.orgao_site,
            objeto: biddingData.objeto,
            situacao: biddingData.situacao,
            datahora_abertura: biddingData.datahora_abertura,
            datahora_documento: biddingData.datahora_documento,
            datahora_retirada: biddingData.datahora_retirada,
            datahora_visita: biddingData.datahora_visita,
            datahora_prazo: biddingData.datahora_prazo,
            edital: biddingData.edital,
            link_edital: biddingData.link_edital,
            documento_url: biddingData.documento_url,
            processo: biddingData.processo,
            observacao: biddingData.observacao,
            item: biddingData.item,
            preco_edital: biddingData.preco_edital,
            valor_estimado: biddingData.valor_estimado,
            boletim_id: biddingData.boletim_id
          }
        });
      } catch (error) {
        console.error(`Erro ao salvar licitação ${biddingData.id}:`, error);
      }
    }
  }

  async markBoletimAsViewed(id: number): Promise<void> {
    await db.update(boletins)
      .set({ visualizado: true })
      .where(eq(boletins.id, id));
  }

  async getBiddings(filters?: { 
    conlicitacao_id?: string; 
    orgao?: string[]; 
    uf?: string[];
    numero_controle?: string;
  }): Promise<Bidding[]> {
    const conditions = [];

    if (filters?.conlicitacao_id) {
      conditions.push(sql`${biddings.conlicitacao_id} LIKE ${`%${filters.conlicitacao_id}%`}`);
    }

    if (filters?.numero_controle) {
      const term = `%${filters.numero_controle}%`;
      conditions.push(sql`(${biddings.conlicitacao_id} LIKE ${term} OR ${biddings.orgao_codigo} LIKE ${term} OR ${biddings.processo} LIKE ${term} OR ${biddings.edital} LIKE ${term})`);
    }

    if (filters?.orgao && filters.orgao.length > 0) {
      const orgaoConditions = filters.orgao.map(o => sql`${biddings.orgao_nome} LIKE ${`%${o}%`}`);
      conditions.push(sql`(${sql.join(orgaoConditions, sql` OR `)})`);
    }

    if (filters?.uf && filters.uf.length > 0) {
      conditions.push(inArray(biddings.orgao_uf, filters.uf));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await db.select().from(biddings).where(whereClause).limit(50);
  }

  // Método removido: refreshBiddingsCache - agora usamos apenas banco de dados

  // Métodos de carregamento removidos - agora usamos apenas dados reais sob demanda


  // Nova função específica para busca por número de controle
  public async findBiddingByControlNumber(numeroControle: string): Promise<Bidding[]> {
    
    // Primeiro verificar no banco de dados
    const term = `%${numeroControle}%`;
    let biddingsFound = await db.select().from(biddings).where(
        sql`(${biddings.conlicitacao_id} LIKE ${term} OR ${biddings.orgao_codigo} LIKE ${term} OR ${biddings.processo} LIKE ${term} OR ${biddings.edital} LIKE ${term})`
    );
    
    if (biddingsFound.length > 0) {
      return biddingsFound;
    }
    
    // Se não encontrou no banco, fazer busca específica
    await this.searchSpecificBidding(numeroControle);
    
    // Tentar novamente após busca específica
    biddingsFound = await db.select().from(biddings).where(
        sql`(${biddings.conlicitacao_id} LIKE ${term} OR ${biddings.orgao_codigo} LIKE ${term} OR ${biddings.processo} LIKE ${term} OR ${biddings.edital} LIKE ${term})`
    );
    
    return biddingsFound;
  }

  // Busca específica COMPLETA para número de controle não encontrado
  private async searchSpecificBidding(numeroControle: string): Promise<void> {
    try {
      const filtros = await this.getFiltros();
      let totalBuscados = 0;
      let encontrou = false;
      
      // Buscar em TODOS os boletins até encontrar ou esgotar possibilidades
      for (const filtro of filtros) {
        try {
          // Pegar informação total de boletins
          const boletinsResponse = await this.getBoletins(filtro.id, 1, 100);
          
          // Buscar em lotes de 20 boletins
          const batchSize = 20;
          const totalPages = Math.ceil(boletinsResponse.total / batchSize);
          
          for (let page = 1; page <= Math.min(totalPages, 10); page++) { // Limite: máximo 10 páginas (200 boletins) por filtro
            const pageBoletins = await this.getBoletins(filtro.id, page, batchSize);
            
            const chunkSize = 5;
            for (let i = 0; i < pageBoletins.boletins.length; i += chunkSize) {
              const chunk = pageBoletins.boletins.slice(i, i + chunkSize);
              const results = await Promise.all(chunk.map(async (boletim) => {
                try {
                  const boletimData = await this.getBoletim(boletim.id);
                  totalBuscados++;
                  if (boletimData && boletimData.licitacoes) {
                    const matching = boletimData.licitacoes.filter((licitacao: any) => 
                      licitacao.id?.toString().includes(numeroControle) ||
                      licitacao.orgao?.codigo?.toLowerCase().includes(numeroControle.toLowerCase()) ||
                      licitacao.processo?.toLowerCase().includes(numeroControle.toLowerCase()) ||
                      licitacao.edital?.toLowerCase().includes(numeroControle.toLowerCase())
                    );
                    const biddingsToUpsert: any[] = [];
                    matching.forEach((licitacao: any) => {
                      // Already transformed in getBoletim
                      biddingsToUpsert.push(licitacao);
                    });
                    if (biddingsToUpsert.length > 0) {
                        // Already upserted in getBoletim
                    }
                    if (matching.length > 0) {
                      return true;
                    }
                  }
                } catch (error) {
                  // Erro em boletim
                }
                return false;
              }));
              if (results.some(r => r)) {
                return;
              }
            }
          }
        } catch (error) {
          // Erro no filtro
        }
      }
      
      if (!encontrou) {
        // Número de controle não encontrado após busca
      }
      
    } catch (error) {
      // Erro crítico na busca específica
    }
  }

  // Atualiza dados de uma licitação via boletim associado
  public async refreshBoletimForBidding(biddingId: number): Promise<void> {
    // Try to find in DB first
    const existing = await this.getBidding(biddingId);
    const boletimId = existing?.boletim_id;
    if (!boletimId) {
      return;
    }
    try {
      const boletimData = await conLicitacaoAPI.getBoletimData(boletimId);
      if (boletimData?.licitacoes) {
        const biddingsToUpsert: any[] = [];
        boletimData.licitacoes.forEach((licitacao: any) => {
          const transformed = this.transformLicitacaoFromAPI(licitacao, boletimId, 'api');
          biddingsToUpsert.push(transformed);
        });
        await this.upsertBiddings(biddingsToUpsert);
      }
    } catch {
      // silencioso
    }
  }
  
  

  // Nova versão paginada e otimizada
  async getBiddingsPaginated(filters?: { 
    conlicitacao_id?: string; 
    orgao?: string[]; 
    uf?: string[];
    numero_controle?: string;
    cidade?: string;
    objeto?: string;
    valor_min?: number;
    valor_max?: number;
    mostrar_sem_valor?: boolean;
    data_inicio?: string;
    data_fim?: string;
    tipo_data?: 'abertura' | 'documento';
  }, page: number = 1, limit: number = 50): Promise<{ biddings: Bidding[], total: number }> {
    
    const conditions = [];

    if (filters?.conlicitacao_id) {
        conditions.push(sql`${biddings.conlicitacao_id} LIKE ${`%${filters.conlicitacao_id}%`}`);
    }

    if (filters?.numero_controle) {
        const term = `%${filters.numero_controle}%`;
        conditions.push(sql`(${biddings.conlicitacao_id} LIKE ${term} OR ${biddings.orgao_codigo} LIKE ${term} OR ${biddings.processo} LIKE ${term} OR ${biddings.edital} LIKE ${term})`);
    }

    if (filters?.orgao && filters.orgao.length > 0) {
        const orgaoConditions = filters.orgao.map(o => sql`${biddings.orgao_nome} LIKE ${`%${o}%`}`);
        conditions.push(sql`(${sql.join(orgaoConditions, sql` OR `)})`);
    }

    if (filters?.uf && filters.uf.length > 0) {
        conditions.push(inArray(biddings.orgao_uf, filters.uf));
    }

    if (filters?.cidade) {
        conditions.push(sql`${biddings.orgao_cidade} LIKE ${`%${filters.cidade}%`}`);
    }

    if (filters?.objeto) {
        conditions.push(sql`${biddings.objeto} LIKE ${`%${filters.objeto}%`}`);
    }

    // Value filters
    if (filters?.valor_min !== undefined || filters?.valor_max !== undefined) {
        if (filters.valor_min !== undefined) {
             conditions.push(sql`${biddings.valor_estimado} >= ${filters.valor_min}`);
        }
        if (filters.valor_max !== undefined) {
             conditions.push(sql`${biddings.valor_estimado} <= ${filters.valor_max}`);
        }
    }
    
    // Date filters
    if (filters?.data_inicio || filters?.data_fim) {
        const column = filters.tipo_data === 'documento' ? biddings.datahora_documento : biddings.datahora_abertura;
        
        if (filters.data_inicio) {
             conditions.push(sql`${column} >= ${filters.data_inicio}`);
        }
        if (filters.data_fim) {
             conditions.push(sql`${column} <= ${filters.data_fim + ' 23:59:59'}`);
        }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Check if DB is empty and no filters, trigger refresh if needed
    if (!whereClause) {
       const [{ count: totalCount }] = await db.select({ count: sql<number>`count(*)` }).from(biddings);
       if (totalCount === 0) {
           await this.refreshRecentBoletins();
       }
    }

    // Count
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(biddings).where(whereClause);

    // Fetch
    const result = await db.select().from(biddings)
        .where(whereClause)
        .orderBy(desc(biddings.datahora_abertura))
        .limit(limit)
        .offset((page - 1) * limit);

    return { biddings: result, total: count };
  }

  // Contagem estimada fixa para evitar carregar dados
  async getBiddingsCount(): Promise<number> {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(biddings);
    return count;
  }

  async getBidding(id: number): Promise<Bidding | undefined> {
    const result = await db.select().from(biddings).where(eq(biddings.id, id));
    return result[0];
  }

  // Buscar múltiplas licitações por IDs (usado para favoritos - batch fetching)
  async getBiddingsByIds(ids: number[]): Promise<Bidding[]> {
    if (ids.length === 0) return [];
    
    // Tentar buscar do banco primeiro
    const dbBiddings = await db.select().from(biddings).where(inArray(biddings.id, ids));
    
    // Se faltarem IDs, talvez tentar buscar da API? 
    // Por enquanto vamos assumir que o banco é a fonte da verdade.
    // Se quisermos manter a lógica de refresh, teríamos que checar quais IDs faltam e buscar.
    // Mas como o objetivo é remover o cache e usar o banco, vamos confiar no banco.
    
    return dbBiddings;
  }

  // Método para manter uma licitação em memória (usado para favoritos) -> Agora salva no banco
  async pinBidding(bidding: Bidding): Promise<void> {
    if (bidding && bidding.id) {
       await this.upsertBiddings([bidding]);
    }
  }

  // Métodos de favoritos com timestamps precisos em memória -> Agora banco de dados
  async getFavorites(userId: number, date?: string, dateFrom?: string, dateTo?: string): Promise<Bidding[]> {
    const conditions = [eq(favorites.userId, userId)];

    if (date) {
        conditions.push(sql`DATE(${favorites.createdAt}) = ${date}`);
    }

    if (dateFrom) {
        conditions.push(sql`DATE(${favorites.createdAt}) >= ${dateFrom}`);
    }

    if (dateTo) {
        conditions.push(sql`DATE(${favorites.createdAt}) <= ${dateTo}`);
    }

    const result = await db.select({
        bidding: biddings,
        favorite: favorites
    }).from(favorites)
    .innerJoin(biddings, eq(favorites.biddingId, biddings.id))
    .where(and(...conditions));

    return result.map(({ bidding, favorite }) => ({
        ...bidding,
        category: favorite.category,
        customCategory: favorite.customCategory,
        notes: favorite.notes,
        uf: favorite.uf,
        codigoUasg: favorite.codigoUasg,
        valorEstimado: favorite.valorEstimado,
        fornecedor: favorite.fornecedor,
        site: favorite.site
    })) as any;
  }

  async addFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    const [result] = await db.insert(favorites).values({
        ...insertFavorite,
        createdAt: new Date()
    });
    
    return {
        ...insertFavorite,
        id: result.insertId,
        createdAt: new Date(),
        category: null,
        customCategory: null,
        notes: null,
        uf: null,
        codigoUasg: null,
        valorEstimado: null,
        fornecedor: null,
        site: null,
    } as Favorite;
  }


  async removeFavorite(userId: number, biddingId: number): Promise<void> {
    await db.delete(favorites).where(and(
      eq(favorites.userId, userId),
      eq(favorites.biddingId, biddingId)
    ));
  }

  async isFavorite(userId: number, biddingId: number): Promise<boolean> {
    const [result] = await db.select().from(favorites).where(and(
      eq(favorites.userId, userId),
      eq(favorites.biddingId, biddingId)
    ));
    return !!result;
  }

  async updateFavoriteCategorization(userId: number, biddingId: number, data: {
    category?: string;
    customCategory?: string;
    notes?: string;
    uf?: string;
    codigoUasg?: string;
    valorEstimado?: string;
    fornecedor?: string;
    site?: string;
    orgaoLicitante?: string;
    status?: string;
  }): Promise<void> {
    // Buscar o favorito existente
    const [existingFavorite] = await db.select().from(favorites).where(and(
      eq(favorites.userId, userId),
      eq(favorites.biddingId, biddingId)
    ));
    
    if (existingFavorite) {
      // Atualizar favorito existente
      await db.update(favorites).set({
        category: data.category ?? existingFavorite.category,
        customCategory: data.customCategory ?? existingFavorite.customCategory,
        notes: data.notes ?? existingFavorite.notes,
        uf: data.uf ?? existingFavorite.uf,
        codigoUasg: data.codigoUasg ?? existingFavorite.codigoUasg,
        valorEstimado: data.valorEstimado ?? existingFavorite.valorEstimado,
        fornecedor: data.fornecedor ?? existingFavorite.fornecedor,
        site: data.site ?? existingFavorite.site,
        orgaoLicitante: (data as any).orgaoLicitante ?? existingFavorite.orgaoLicitante,
        status: (data as any).status ?? existingFavorite.status,
      }).where(eq(favorites.id, existingFavorite.id));
    } else {
      // Criar novo favorito com categorização e timestamp atual
      await db.insert(favorites).values({
        userId,
        biddingId,
        createdAt: new Date(),
        category: data.category ?? null,
        customCategory: data.customCategory ?? null,
        notes: data.notes ?? null,
        uf: data.uf ?? null,
        codigoUasg: data.codigoUasg ?? null,
        valorEstimado: data.valorEstimado ?? null,
        fornecedor: data.fornecedor ?? null,
        site: data.site ?? null,
        orgaoLicitante: (data as any).orgaoLicitante ?? null,
        status: (data as any).status ?? null,
      });
    }
  }

  // Método de debug para validar fonte dos dados
  async getDataSourcesDebugInfo() {
    
    // Count biddings in DB
    const [biddingsCount] = await db.select({ count: sql<number>`count(*)` }).from(biddings);
    
    // Count boletins in DB
    const [boletinsCount] = await db.select({ count: sql<number>`count(*)` }).from(boletins);

    // Testar conectividade com API
    let apiStatus = 'unknown';
    let apiError = null;
    
    try {
      const testResponse = await conLicitacaoAPI.getFiltros();
      apiStatus = Array.isArray(testResponse) && testResponse.length > 0 ? 'connected' : 'empty_response';
    } catch (error) {
      apiStatus = 'error';
      apiError = error instanceof Error ? error.message : 'Unknown error';
    }

    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      apiStatus,
      apiError,
      cache: {
        biddings: {
          total: biddingsCount.count,
          source: 'database'
        },
        boletins: {
          total: boletinsCount.count,
          source: 'database'
        }
      },
      dataQuality: {
        message: "Using database as single source of truth"
      },
      recommendations: [] as string[]
    };
    
    // Adicionar recomendações baseadas na análise
    if (apiStatus === 'error') {
      debugInfo.recommendations.push('API ConLicitação não está acessível - dados podem estar desatualizados');
    }
    
    return debugInfo;
  }
}

export const conLicitacaoStorage = new ConLicitacaoStorage();
