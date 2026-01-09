import { conLicitacaoAPI } from './conlicitacao-api';
import { Bidding, Boletim, Filtro, Acompanhamento, User, InsertUser, Favorite, InsertFavorite, favorites, biddings, boletins, acompanhamentos } from '../shared/schema';
import { db } from "./db";
import { eq, and, like, desc, or, gte, lte, inArray, sql } from "drizzle-orm";
import { syncService } from "./sync-service";

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
  private currentUserId: number;

  constructor() {
    this.users = new Map();
    this.currentUserId = 1;
    
    this.initializeMockData();
    this.startAutoRefresh();
  }



  private initializeMockData() {
    // Criar usuário de teste se não existe
    if (!this.users.has(1)) {
      const testUser: User = {
        id: 1,
        email: "admin@test.com",
        password: "admin123"
      };
      this.users.set(1, testUser);
      this.currentUserId = 2;
    }

    // Sistema configurado para usar apenas dados reais da API ConLicitação
    // Cache será populado quando IP estiver autorizado
  }

  private startAutoRefresh() {
    // Iniciar serviço de sincronização real com o banco de dados
    syncService.startAutoSync(10 * 60 * 1000); // 10 minutos
  }

  private async refreshRecentBoletins(forceRefresh: boolean = false): Promise<void> {
    // Mantido para compatibilidade, mas agora delega para o syncService se necessário
    return;
  }

  public async manualRefreshBoletins(): Promise<{ updated: number; lastUpdate: number }> {
    try {
      const result = await syncService.incrementalSync();
      return { 
        updated: result.biddingsSynced, 
        lastUpdate: Date.now() 
      };
    } catch (error) {
      console.error('Erro no refresh manual:', error);
      return { updated: 0, lastUpdate: Date.now() };
    }
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

      // Buscar status de visualização no banco para os boletins retornados
      const boletimIds = apiBoletins.map((b: any) => b.id);
      let viewedMap = new Set<number>();
      
      if (boletimIds.length > 0) {
        const viewedBoletinsList = await db.select({ id: boletins.id, visualizado: boletins.visualizado })
          .from(boletins)
          .where(inArray(boletins.id, boletimIds));
        
        viewedBoletinsList.forEach(b => {
          if (b.visualizado) viewedMap.add(b.id);
        });
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
          visualizado: viewedMap.has(boletim.id),
        };
      });
      

      return {
        boletins: boletinsWithCounts,
        total: totalItems
      };
    } catch (error: any) {
      console.error('Erro ao buscar boletins da API, tentando banco de dados:', error);
      
      // Fallback to database
      try {
        const dbBoletins = await db.select().from(boletins)
          .orderBy(desc(boletins.data_envio))
          .limit(perPage)
          .offset((page - 1) * perPage);
          
        const total = await db.select({ count: sql<number>`count(*)` }).from(boletins).then(rows => rows[0].count);
        
        const mappedBoletins = dbBoletins.map(b => ({
          id: b.id,
          numero_edicao: b.numero_edicao,
          datahora_fechamento: b.data_envio ? b.data_envio.toISOString() : new Date().toISOString(),
          filtro_id: b.filtro_id,
          quantidade_licitacoes: 0,
          quantidade_acompanhamentos: 0,
          visualizado: b.visualizado || false
        }));

        return { boletins: mappedBoletins, total };
      } catch (dbError) {
        console.error('Erro ao buscar do banco:', dbError);
        return { boletins: [], total: 0 };
      }
    }
  }

  // Método para obter dados de boletim (direto da API com sync)
  private async getCachedBoletimData(id: number, forceRefresh: boolean = false): Promise<any> {
    try {
      const data = await conLicitacaoAPI.getBoletimData(id);
      
      // Sincronizar com o banco de dados sempre que buscar da API
      try {
        await syncService.syncLicitacoesData(data.licitacoes || [], id);
      } catch (syncError) {
        console.error(`[AutoSync] Erro ao sincronizar boletim ${id}:`, syncError);
      }

      return data;
    } catch (error: any) {
      throw error;
    }
  }



  async getBoletim(id: number): Promise<{ boletim: Boletim, licitacoes: Bidding[], acompanhamentos: Acompanhamento[] } | undefined> {
    try {
      const response = await this.getCachedBoletimData(id);
      
      // Transformar licitações e acompanhamentos primeiro para contar corretamente
      const dataSource = 'api';
      const licitacoes: Bidding[] = (response.licitacoes || []).map((licitacao: any) => this.transformLicitacaoFromAPI(licitacao, id, dataSource));
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

      // Verificar status de visualizado no banco
      const boletimDb = await db.select({ visualizado: boletins.visualizado })
        .from(boletins)
        .where(eq(boletins.id, id))
        .limit(1);
      
      const visualizado = boletimDb[0]?.visualizado || false;

      const boletim: Boletim = {
        id: response.boletim.id,
        numero_edicao: response.boletim.numero_edicao,
        datahora_fechamento: response.boletim.datahora_fechamento,
        filtro_id: response.boletim.cliente.filtro.id,
        quantidade_licitacoes: licitacoes.length, // Contar dados reais
        quantidade_acompanhamentos: acompanhamentos.length, // Contar dados reais
        visualizado: visualizado,
      };

      return { boletim, licitacoes, acompanhamentos };
    } catch (error: any) {
      console.error('Erro ao buscar boletim da API, tentando banco de dados:', error);
      
      try {
        // Fallback to database
        const boletimResult = await db.select().from(boletins).where(eq(boletins.id, id)).limit(1);
        const boletimData = boletimResult[0];
        
        if (!boletimData) return undefined;
        
        const licitacoesData = await db.select().from(biddings).where(eq(biddings.boletim_id, id));
        const acompanhamentosData = await db.select().from(acompanhamentos).where(eq(acompanhamentos.boletim_id, id));
        
        const boletim: Boletim = {
          id: boletimData.id,
          numero_edicao: boletimData.numero_edicao,
          datahora_fechamento: boletimData.data_envio ? boletimData.data_envio.toISOString() : new Date().toISOString(),
          filtro_id: boletimData.filtro_id,
          quantidade_licitacoes: licitacoesData.length,
          quantidade_acompanhamentos: acompanhamentosData.length,
          visualizado: boletimData.visualizado || false
        };

        return { boletim, licitacoes: licitacoesData as any[], acompanhamentos: acompanhamentosData as any[] };
      } catch (dbError) {
         console.error('Erro ao buscar boletim do banco:', dbError);
         return undefined;
      }
    }
  }



  // Função para expandir status truncados da API (centralizada no backend)
  private expandTruncatedStatus(status: string): string {
    if (!status) return "NOVA";
    
    const truncatedMappings: Record<string, string> = {
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
      // Prioridade de Datas:
      // 1. datahora_abertura (padrão)
      // 2. datahora_documento (usado para alterações/prorrogações)
      // 3. datahora_prazo (data limite)
      datahora_abertura: licitacao.datahora_abertura || licitacao.datahora_documento || licitacao.datahora_prazo || '', 
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
      preco_edital: licitacao.preco_edital ? String(licitacao.preco_edital) : '0', // Valor do edital (convert to string for decimal)
      valor_estimado: licitacao.valor_estimado ? String(licitacao.valor_estimado) : '0', // Valor estimado (convert to string for decimal)
      boletim_id: boletimId,
      synced_at: new Date(),
      updated_at: new Date()
    };
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
      conditions.push(like(biddings.conlicitacao_id, `%${filters.conlicitacao_id}%`));
    }

    if (filters?.numero_controle) {
      // Se há busca por número de controle, fazer busca específica primeiro
      // Nota: Idealmente, a busca específica deveria ser feita separadamente ou integrada de outra forma
      // Por enquanto, vamos buscar no banco
      conditions.push(or(
        like(biddings.conlicitacao_id, `%${filters.numero_controle}%`),
        like(biddings.orgao_codigo, `%${filters.numero_controle}%`),
        like(biddings.processo, `%${filters.numero_controle}%`),
        like(biddings.edital, `%${filters.numero_controle}%`)
      ));
    }

    if (filters?.orgao && filters.orgao.length > 0) {
      conditions.push(inArray(biddings.orgao_nome, filters.orgao));
    }

    if (filters?.uf && filters.uf.length > 0) {
      conditions.push(inArray(biddings.orgao_uf, filters.uf));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await db.select().from(biddings).where(whereClause).limit(100);
  }



  // Nova versão paginada e otimizada
  // Nova versão paginada e otimizada (CONSULTA AO BANCO DE DADOS)
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
      conditions.push(eq(biddings.conlicitacao_id, parseInt(filters.conlicitacao_id)));
    }

    if (filters?.numero_controle) {
      conditions.push(eq(biddings.conlicitacao_id, parseInt(filters.numero_controle)));
    }

    if (filters?.orgao && filters.orgao.length > 0) {
      conditions.push(inArray(biddings.orgao_nome, filters.orgao));
    }

    if (filters?.uf && filters.uf.length > 0) {
      conditions.push(inArray(biddings.orgao_uf, filters.uf));
    }

    if (filters?.cidade) {
      conditions.push(like(biddings.orgao_cidade, `%${filters.cidade}%`));
    }

    if (filters?.objeto) {
      conditions.push(like(biddings.objeto, `%${filters.objeto}%`));
    }

    if (filters?.valor_min !== undefined) {
      conditions.push(gte(biddings.valor_estimado, String(filters.valor_min)));
    }

    if (filters?.valor_max !== undefined) {
      conditions.push(lte(biddings.valor_estimado, String(filters.valor_max)));
    }

    const campoData = filters?.tipo_data === 'documento' ? biddings.datahora_documento : biddings.datahora_abertura;
    
    if (filters?.data_inicio) {
      conditions.push(gte(campoData, filters.data_inicio));
    }

    if (filters?.data_fim) {
      const fim = filters.data_fim.includes(' ') ? filters.data_fim : `${filters.data_fim} 23:59:59`;
      conditions.push(lte(campoData, fim));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(biddings).where(whereClause);
    const total = totalResult[0]?.count || 0;

    const biddingsResult = await db.select()
      .from(biddings)
      .where(whereClause)
      .orderBy(desc(biddings.datahora_abertura))
      .limit(limit)
      .offset((page - 1) * limit);

    return { biddings: biddingsResult, total };
  }

  // Contagem estimada fixa para evitar carregar dados
  async getBiddingsCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(biddings);
    return result[0]?.count || 0;
  }

  async getBidding(id: number): Promise<Bidding | undefined> {
    const result = await db.select().from(biddings).where(eq(biddings.id, id));
    return result[0];
  }

  // Buscar múltiplas licitações por IDs (usado para favoritos - batch fetching)
  async getBiddingsByIds(ids: number[]): Promise<Bidding[]> {
    if (!ids.length) return [];
    return await db.select().from(biddings).where(inArray(biddings.id, ids));
  }

  // Deprecated: No longer needed with database storage
  async pinBidding(bidding: Bidding): Promise<void> {
    // No-op
  }

  // Métodos de favoritos usando banco de dados
  async getFavorites(userId: number, date?: string, dateFrom?: string, dateTo?: string): Promise<Bidding[]> {
    // 1. Buscar favoritos do usuário
    const userFavorites = await db.select().from(favorites).where(eq(favorites.userId, userId));
    
    // 2. Filtrar por data (em memória para simplificar manipulação de data/hora)
    let filteredFavorites = userFavorites;
    if (date) {
      filteredFavorites = filteredFavorites.filter(fav => {
        const favDate = fav.createdAt?.toISOString().split('T')[0];
        return favDate === date;
      });
    }
    if (dateFrom || dateTo) {
      filteredFavorites = filteredFavorites.filter(fav => {
        const favDate = fav.createdAt?.toISOString().split('T')[0];
        if (!favDate) return false;
        let isInRange = true;
        if (dateFrom) isInRange = isInRange && favDate >= dateFrom;
        if (dateTo) isInRange = isInRange && favDate <= dateTo;
        return isInRange;
      });
    }

    if (filteredFavorites.length === 0) return [];

    // 3. Buscar licitações associadas
    const biddingIds = filteredFavorites.map(f => f.biddingId);
    const biddingsList = await this.getBiddingsByIds(biddingIds);
    const biddingsMap = new Map(biddingsList.map(b => [b.id, b]));

    // 4. Montar resultado combinando dados
    const result: Bidding[] = [];
    for (const fav of filteredFavorites) {
      const bidding = biddingsMap.get(fav.biddingId);
      if (bidding) {
        result.push({
          ...bidding,
          category: fav.category,
          customCategory: fav.customCategory,
          notes: fav.notes,
          uf: fav.uf,
          codigoUasg: fav.codigoUasg,
          valorEstimado: fav.valorEstimado,
          fornecedor: fav.fornecedor,
          site: fav.site
        } as any);
      }
    }
    return result;
  }

  async addFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    // Check if already exists
    const [existing] = await db.select().from(favorites)
      .where(and(
        eq(favorites.userId, insertFavorite.userId),
        eq(favorites.biddingId, insertFavorite.biddingId)
      ));
      
    if (existing) return existing;

    await db.insert(favorites).values({
      ...insertFavorite,
      createdAt: new Date(),
    });
    
    // Return the inserted item
    const [inserted] = await db.select().from(favorites)
      .where(and(
        eq(favorites.userId, insertFavorite.userId),
        eq(favorites.biddingId, insertFavorite.biddingId)
      ));
      
    return inserted;
  }

  async removeFavorite(userId: number, biddingId: number): Promise<void> {
    await db.delete(favorites).where(and(
      eq(favorites.userId, userId),
      eq(favorites.biddingId, biddingId)
    ));
  }

  async isFavorite(userId: number, biddingId: number): Promise<boolean> {
    const [fav] = await db.select().from(favorites).where(and(
      eq(favorites.userId, userId),
      eq(favorites.biddingId, biddingId)
    ));
    return !!fav;
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
    const [existing] = await db.select().from(favorites).where(and(
      eq(favorites.userId, userId),
      eq(favorites.biddingId, biddingId)
    ));
    
    if (existing) {
      await db.update(favorites).set(data).where(eq(favorites.id, existing.id));
    } else {
      await this.addFavorite({
        userId,
        biddingId,
        ...data
      } as any);
    }
  }

  // Método de debug para validar fonte dos dados
  async getDataSourcesDebugInfo() {
    const biddingsCount = await this.getBiddingsCount();
    const boletinsResult = await db.select({ count: sql<number>`count(*)` }).from(boletins);
    const boletinsCount = boletinsResult[0]?.count || 0;
    
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

    return {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      apiStatus,
      apiError,
      storage: 'database',
      stats: {
        biddings: biddingsCount,
        boletins: boletinsCount
      }
    };
  }
}

export const conLicitacaoStorage = new ConLicitacaoStorage();
