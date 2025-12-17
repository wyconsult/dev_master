import { conLicitacaoAPI } from './conlicitacao-api';
import { 
  Bidding, Boletim, Filtro, Acompanhamento, User, InsertUser, Favorite, InsertFavorite, 
  favorites, biddings, boletins, acompanhamentos, filtros
} from '../shared/schema';
import { db } from "./db";
import { eq, and, desc, sql, like, inArray } from "drizzle-orm";

export interface IConLicitacaoStorage {
  // Users (mantemos localmente - gerenciado por DatabaseStorage)
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Filtros - vem da API real
  getFiltros(): Promise<Filtro[]>;
  
  // Boletins - Persistidos no banco
  getBoletins(filtroId: number, page?: number, perPage?: number): Promise<{ boletins: Boletim[], total: number }>;
  getBoletim(id: number): Promise<{ boletim: Boletim, licitacoes: Bidding[], acompanhamentos: Acompanhamento[] } | undefined>;
  markBoletimAsViewed(id: number): Promise<void>;
  
  // Biddings - Persistidos no banco
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
  
  // Favorites (gerenciado por DatabaseStorage)
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
  private periodicRefreshInProgress: boolean = false;
  private autoRefreshTimer?: NodeJS.Timeout;

  constructor() {
    // Iniciar sincronização em background
    this.startAutoRefresh();
  }

  // Métodos de compatibilidade (não devem ser usados diretamente, usar storage.ts)
  async getUser(id: number): Promise<User | undefined> { return undefined; }
  async getUserByEmail(email: string): Promise<User | undefined> { return undefined; }
  async createUser(user: InsertUser): Promise<User> { throw new Error("Use storage.ts"); }
  async getFavorites(userId: number): Promise<Bidding[]> { return []; }
  async addFavorite(favorite: InsertFavorite): Promise<Favorite> { throw new Error("Use storage.ts"); }
  async removeFavorite(userId: number, biddingId: number): Promise<void> { }
  async isFavorite(userId: number, biddingId: number): Promise<boolean> { return false; }
  async updateFavoriteCategorization(): Promise<void> { }
  async pinBidding(bidding: Bidding): Promise<void> { }

  private startAutoRefresh() {
    if (this.autoRefreshTimer) return;
    
    // Executar sync imediatamente
    this.syncBoletins().catch(err => console.error('Erro no sync inicial:', err));

    // Agendar sync a cada 10 minutos
    this.autoRefreshTimer = setInterval(() => {
      this.syncBoletins().catch(err => console.error('Erro no sync periódico:', err));
    }, 10 * 60 * 1000);
  }

  private async syncBoletins() {
    if (this.periodicRefreshInProgress) return;
    this.periodicRefreshInProgress = true;
    console.log('🔄 [Sync] Iniciando sincronização de boletins e licitações...');

    try {
      const filtrosList = await this.getFiltros();
      // Limitar a 1 filtro por enquanto para evitar sobrecarga no teste
      const targetFiltros = filtrosList.slice(0, 1); 

      for (const filtro of targetFiltros) {
        console.log(`📥 [Sync] Buscando boletins para filtro ${filtro.id}...`);
        // Buscar últimos 10 boletins
        const { boletins: boletinsApi } = await conLicitacaoAPI.getBoletins(filtro.id, 1, 10);
        
        for (const boletim of boletinsApi) {
          await this.processBoletim(boletim);
        }
      }
      console.log('✅ [Sync] Sincronização concluída.');
    } catch (error) {
      console.error('❌ [Sync] Erro durante sincronização:', error);
    } finally {
      this.periodicRefreshInProgress = false;
    }
  }

  private async processBoletim(boletimData: any) {
    try {
      console.log(`📥 [Sync] Processando boletim ${boletimData.id}...`);
      
      // Buscar detalhes completos do boletim na API (inclui licitações)
      const details = await conLicitacaoAPI.getBoletimData(boletimData.id);
      
      // Salvar/Atualizar Boletim no DB
      await db.insert(boletins).values({
        id: details.boletim.id,
        numero_edicao: details.boletim.numero_edicao,
        datahora_fechamento: details.boletim.datahora_fechamento,
        filtro_id: details.boletim.cliente.filtro.id,
        quantidade_licitacoes: details.licitacoes?.length || 0,
        quantidade_acompanhamentos: details.acompanhamentos?.length || 0,
        visualizado: false
      }).onDuplicateKeyUpdate({
        set: {
          quantidade_licitacoes: details.licitacoes?.length || 0,
          quantidade_acompanhamentos: details.acompanhamentos?.length || 0,
        }
      });

      // Processar Licitações
      if (details.licitacoes && details.licitacoes.length > 0) {
        const licitacoesValues = details.licitacoes.map((l: any) => {
           return this.transformLicitacaoFromAPI(l, details.boletim.id, 'api');
        });

        for (const lic of licitacoesValues) {
           const existing = await db.select().from(biddings).where(eq(biddings.conlicitacao_id, lic.conlicitacao_id)).limit(1);
           
           if (existing.length === 0) {
             const { id, ...insertData } = lic; 
             await db.insert(biddings).values(insertData);
           }
        }
      }

      // Processar Acompanhamentos
      if (details.acompanhamentos && details.acompanhamentos.length > 0) {
        const acompValues = details.acompanhamentos.map((acomp: any) => ({
          conlicitacao_id: acomp.id,
          licitacao_id: acomp.licitacao_id,
          orgao_nome: acomp.orgao?.nome || '',
          orgao_cidade: acomp.orgao?.cidade || '',
          orgao_uf: acomp.orgao?.uf || '',
          objeto: acomp.objeto || '',
          sintese: acomp.sintese || '',
          data_fonte: acomp.data_fonte || '',
          edital: acomp.edital || '',
          processo: acomp.processo || '',
          boletim_id: details.boletim.id
        }));

        for (const ac of acompValues) {
          const existing = await db.select().from(acompanhamentos).where(eq(acompanhamentos.conlicitacao_id, ac.conlicitacao_id)).limit(1);
          if (existing.length === 0) {
             await db.insert(acompanhamentos).values(ac);
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ [Sync] Erro ao processar boletim ${boletimData.id}:`, error);
    }
  }

  async getFiltros(): Promise<Filtro[]> {
    try {
      const response = await conLicitacaoAPI.getFiltros();
      
      const filtrosMapped: Filtro[] = response.filtros.map((filtro: any) => ({
        id: filtro.id,
        descricao: filtro.descricao,
        cliente_id: response.cliente.id,
        cliente_razao_social: response.cliente.razao_social,
        manha: filtro.periodos?.manha || true,
        tarde: filtro.periodos?.tarde || true,
        noite: filtro.periodos?.noite || true,
      }));

      if (!filtrosMapped.length) {
        return this.getMockFiltro();
      }

      return filtrosMapped;
    } catch (error: any) {
      console.error('❌ [MOBILE DEBUG] Erro ao buscar filtros da API:', error);
      return this.getMockFiltro();
    }
  }

  private getMockFiltro(): Filtro[] {
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

  async getBoletins(filtroId: number, page: number = 1, perPage: number = 100): Promise<{ boletins: Boletim[], total: number }> {
    const offset = (page - 1) * perPage;
    
    const boletinsList = await db.select()
      .from(boletins)
      .where(eq(boletins.filtro_id, filtroId))
      .orderBy(desc(boletins.datahora_fechamento))
      .limit(perPage)
      .offset(offset);

    const totalResult = await db.select({ count: sql<number>`count(*)` })
      .from(boletins)
      .where(eq(boletins.filtro_id, filtroId));
    
    const total = Number(totalResult[0]?.count || 0);

    return { boletins: boletinsList, total };
  }

  async getBoletim(id: number): Promise<{ boletim: Boletim, licitacoes: Bidding[], acompanhamentos: Acompanhamento[] } | undefined> {
    const boletimResult = await db.select().from(boletins).where(eq(boletins.id, id)).limit(1);
    
    if (boletimResult.length === 0) {
      // Tenta buscar da API se não existir no banco (lazy load)
      try {
        console.log(`⚠️ Boletim ${id} não encontrado no banco, buscando da API...`);
        await this.processBoletim({ id });
        const retry = await db.select().from(boletins).where(eq(boletins.id, id)).limit(1);
        if (retry.length === 0) return undefined;
        // Continue com o retry[0]
        boletimResult[0] = retry[0];
      } catch (e) {
        return undefined;
      }
    }

    const boletim = boletimResult[0];

    let licitacoesList = await db.select()
      .from(biddings)
      .where(eq(biddings.boletim_id, id));

    // Auto-repair: Se a quantidade de licitações no banco for muito menor que a esperada, forçar re-sync
    // Aceitamos uma margem de erro pequena, mas se tiver 0 ou muito poucas vs 113, algo deu errado.
    if (boletim.quantidade_licitacoes > 0 && licitacoesList.length < boletim.quantidade_licitacoes * 0.9) {
      console.log(`⚠️ Boletim ${id} tem ${boletim.quantidade_licitacoes} licitações declaradas mas apenas ${licitacoesList.length} no banco. Forçando re-sync...`);
      try {
        await this.processBoletim({ id });
        // Re-fetch após sync
        licitacoesList = await db.select()
          .from(biddings)
          .where(eq(biddings.boletim_id, id));
        
        console.log(`✅ Re-sync do Boletim ${id} concluído. Agora com ${licitacoesList.length} licitações.`);
      } catch (error) {
        console.error(`❌ Falha no auto-repair do Boletim ${id}:`, error);
      }
    }

    const acompanhamentosList = await db.select()
      .from(acompanhamentos)
      .where(eq(acompanhamentos.boletim_id, id));

    return { boletim, licitacoes: licitacoesList, acompanhamentos: acompanhamentosList };
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
      conditions.push(sql`${biddings.conlicitacao_id} LIKE ${'%' + filters.conlicitacao_id + '%'}`);
    }

    if (filters?.orgao && filters.orgao.length > 0) {
      const orgaoConditions = filters.orgao.map(org => like(biddings.orgao_nome, `%${org}%`));
      if (orgaoConditions.length > 0) {
        conditions.push(or(...orgaoConditions));
      }
    }

    if (filters?.uf && filters.uf.length > 0) {
      conditions.push(inArray(biddings.orgao_uf, filters.uf));
    }

    if (filters?.numero_controle) {
      const num = parseInt(filters.numero_controle);
      if (!isNaN(num)) {
        conditions.push(eq(biddings.conlicitacao_id, num));
      }
    }

    let whereClause = undefined;
    if (conditions.length > 0) {
      whereClause = and(...conditions);
    }

    return await db.select()
      .from(biddings)
      .where(whereClause)
      .limit(50);
  }

  async getBiddingsPaginated(filters?: { 
    conlicitacao_id?: string; 
    orgao?: string[]; 
    uf?: string[];
    numero_controle?: string;
  }, page: number = 1, limit: number = 50): Promise<{ biddings: Bidding[], total: number }> {
    const offset = (page - 1) * limit;
    
    const conditions = [];

    if (filters?.conlicitacao_id) {
      conditions.push(sql`${biddings.conlicitacao_id} LIKE ${'%' + filters.conlicitacao_id + '%'}`);
    }

    if (filters?.orgao && filters.orgao.length > 0) {
      const orgaoConditions = filters.orgao.map(org => like(biddings.orgao_nome, `%${org}%`));
      if (orgaoConditions.length > 0) {
        conditions.push(or(...orgaoConditions));
      }
    }

    if (filters?.uf && filters.uf.length > 0) {
      conditions.push(inArray(biddings.orgao_uf, filters.uf));
    }

    if (filters?.numero_controle) {
      const num = parseInt(filters.numero_controle);
      if (!isNaN(num)) {
        conditions.push(eq(biddings.conlicitacao_id, num));
      }
    }

    let whereClause = undefined;
    if (conditions.length > 0) {
      whereClause = and(...conditions);
    }

    const result = await db.select()
      .from(biddings)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(biddings.id));
      
    const totalResult = await db.select({ count: sql<number>`count(*)` })
      .from(biddings)
      .where(whereClause);
    
    return { biddings: result, total: totalResult[0]?.count || 0 };
  }

  async getBiddingsCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(biddings);
    return result[0]?.count || 0;
  }

  async getBidding(id: number): Promise<Bidding | undefined> {
    const result = await db.select().from(biddings).where(eq(biddings.id, id)).limit(1);
    return result[0];
  }

  async getBiddingsByIds(ids: number[]): Promise<Bidding[]> {
    if (ids.length === 0) return [];
    return await db.select().from(biddings).where(inArray(biddings.id, ids));
  }

  // Helpers
  async getDataSourcesDebugInfo(): Promise<any> {
    const totalBoletins = await db.select({ count: sql<number>`count(*)` }).from(boletins);
    const totalBiddings = await db.select({ count: sql<number>`count(*)` }).from(biddings);
    return {
      storageType: 'MySQL',
      boletinsCount: totalBoletins[0]?.count || 0,
      biddingsCount: totalBiddings[0]?.count || 0,
      lastSync: new Date().toISOString()
    };
  }

  async manualRefreshBoletins(): Promise<{ updated: boolean, lastUpdate: number }> {
    await this.syncBoletins();
    return { updated: true, lastUpdate: Date.now() };
  }

  private expandTruncatedStatus(status: string): string {
    if (!status) return "NOVA";
    const truncatedMappings: { [key: string]: string } = {
      "URGEN": "URGENTE", "RET": "RETIFICAÇÃO", "ADIA": "ADIADA", "PRO": "PRORROGADA",
      "ALTER": "ALTERADA", "REAB": "REABERTA", "CANCE": "CANCELADA", "SUS": "SUSPENSA",
      "REVO": "REVOGADA", "ABERTA": "ABERTA", "NOVA": "NOVA", "EM_ANAL": "EM ANÁLISE",
      "PRORROG": "PRORROGADA", "ALTERA": "ALTERADA", "FINALI": "FINALIZADA",
      "SUSP": "SUSPENSA", "CANCEL": "CANCELADA", "DESERTA": "DESERTA", "FRACAS": "FRACASSADA"
    };
    const upperStatus = status.toString().toUpperCase().trim();
    if (truncatedMappings[upperStatus]) return truncatedMappings[upperStatus];
    for (const [truncated, full] of Object.entries(truncatedMappings)) {
      if (truncated.startsWith(upperStatus) || upperStatus.startsWith(truncated)) return full;
    }
    return upperStatus;
  }

  private transformLicitacaoFromAPI(licitacao: any, boletimId: number, dataSource: 'api' | 'mock' = 'api'): any {
    const telefones = licitacao.orgao?.telefone?.map((tel: any) => 
      `${tel.ddd ? '(' + tel.ddd + ')' : ''} ${tel.numero}${tel.ramal ? ' ramal ' + tel.ramal : ''}`
    ).join(', ') || '';

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

    const situacaoOriginal = licitacao.situacao || 'NOVA';
    const situacaoExpandida = this.expandTruncatedStatus(situacaoOriginal);

    const normalizedId = Number(licitacao.id); // Pode ser 0 ou undefined se vier sem ID
    
    // Se a API não mandar ID (ex: mock), o banco gera auto-increment.
    // Mas aqui estamos preparando o objeto para inserção ou retorno.
    // O schema diz que 'id' é autoincrement. Se passarmos um ID, o MySQL tenta usar.
    // Se a API manda um ID único, devemos usar ele como conlicitacao_id e deixar o id do banco ser gerado?
    // No schema atual: id é PK auto-increment. conlicitacao_id é int not null.
    // Então devemos mapear licitacao.id da API para conlicitacao_id.

    return {
      conlicitacao_id: normalizedId || Math.floor(Math.random() * 1000000), // Fallback se não tiver ID
      orgao_nome: licitacao.orgao?.nome || '',
      orgao_codigo: licitacao.orgao?.codigo || '',
      orgao_cidade: licitacao.orgao?.cidade || '',
      orgao_uf: licitacao.orgao?.uf || '',
      orgao_endereco: licitacao.orgao?.endereco || '',
      orgao_telefone: telefones,
      orgao_site: licitacao.orgao?.site || '',
      objeto: licitacao.objeto || '',
      situacao: situacaoExpandida,
      datahora_abertura: licitacao.datahora_abertura || '',
      datahora_documento: licitacao.datahora_documento || null,
      datahora_retirada: licitacao.datahora_retirada || null,
      datahora_visita: licitacao.datahora_visita || null,
      datahora_prazo: licitacao.datahora_prazo || '',
      edital: licitacao.edital || '',
      link_edital: documentoUrl,
      documento_url: documentoUrl,
      processo: licitacao.processo || '',
      observacao: licitacao.observacao || '',
      item: licitacao.item || '',
      preco_edital: licitacao.preco_edital || 0,
      valor_estimado: licitacao.valor_estimado || 0,
      boletim_id: boletimId,
    };
  }
}

export const conLicitacaoStorage = new ConLicitacaoStorage();
