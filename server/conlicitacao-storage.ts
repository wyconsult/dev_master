import { conLicitacaoAPI } from './conlicitacao-api';
import { Bidding, Boletim, Filtro, Acompanhamento, User, InsertUser, Favorite, InsertFavorite, favorites } from '../shared/schema';
import { db } from "./db";
import { eq, and } from "drizzle-orm";

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
  private viewedBoletins: Set<number>; // Armazena IDs dos boletins visualizados
  private currentUserId: number;
  private currentFavoriteId: number;
  private cachedBiddings: Map<number, Bidding & { cacheTimestamp: number, dataSource: 'api' | 'mock' }>; // Cache das licitações com metadata
  private pinnedBiddings: Map<number, Bidding>; // Licitações favoritadas que devem persistir mesmo após limpeza de cache
  private lastCacheUpdate: number;
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutos
  private boletimCache = new Map<number, { data: any, timestamp: number, dataSource: 'api' | 'mock' }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private fullLoadCompleted: boolean = false;
  private backgroundLoadingInProgress: boolean = false;
  private periodicRefreshInProgress: boolean = false;
  private autoRefreshTimer?: NodeJS.Timeout;

  constructor() {
    this.users = new Map();
    this.favorites = new Map();
    this.viewedBoletins = new Set();
    this.cachedBiddings = new Map();
    this.pinnedBiddings = new Map();
    this.currentUserId = 1;
    this.currentFavoriteId = 1;
    this.lastCacheUpdate = 0;
    
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
    if (this.autoRefreshTimer) return;
    this.autoRefreshTimer = setInterval(() => {
      this.refreshRecentBoletins().catch(() => {});
    }, this.CACHE_DURATION);
    setTimeout(() => {
      this.refreshRecentBoletins().catch(() => {});
    }, 2000);
  }

  private async refreshRecentBoletins(): Promise<void> {
    if (this.periodicRefreshInProgress) return;
    this.periodicRefreshInProgress = true;
    try {
      const newCache = new Map<number, Bidding & { cacheTimestamp: number, dataSource: 'api' | 'mock' }>();
      const filtros = await this.getFiltros();
      const targetFiltros = filtros.slice(0, 1);
      for (const filtro of targetFiltros) {
        try {
          const boletinsResponse = await this.getBoletins(filtro.id, 1, 10);
          for (const boletim of boletinsResponse.boletins) {
            try {
              const boletimData = await this.getCachedBoletimData(boletim.id);
              if (boletimData?.licitacoes) {
                boletimData.licitacoes.forEach((licitacao: any) => {
                  const transformed = this.transformLicitacaoFromAPI(licitacao, boletim.id, 'api');
                  newCache.set(transformed.id, transformed);
                });
              }
            } catch {}
          }
        } catch {}
      }
      this.cachedBiddings = newCache;
      this.lastCacheUpdate = Date.now();
    } catch {}
    this.periodicRefreshInProgress = false;
  }

  public async manualRefreshBoletins(): Promise<{ updated: number; lastUpdate: number }> {
    await this.refreshRecentBoletins();
    return { updated: this.cachedBiddings.size, lastUpdate: this.lastCacheUpdate };
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
      if (error.message === 'IP_NOT_AUTHORIZED') {
        console.log('🚫 [MOBILE DEBUG] API ConLicitação: IP não autorizado.');
        console.log('💡 Para acesso aos dados reais, execute em ambiente com IP autorizado:');
        console.log('   - Desenvolvimento (Replit): 35.227.80.200');
        console.log('   - Produção: 31.97.26.138');
      } else {
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
      const response = await conLicitacaoAPI.getBoletins(filtroId, page, perPage);
      
      // CORREÇÃO: A API básica não retorna quantidades, precisamos buscar de forma híbrida
      console.log(`📡 Buscando quantidades para ${response.boletins.length} boletins...`);
      
      // Buscar contagens em paralelo usando cache para performance
      const boletinsWithCounts = await Promise.all(
        response.boletins.map(async (boletim: any) => {
          try {
            // Verificar cache primeiro
            const cached = this.boletimCache.get(boletim.id);
            let quantidade_licitacoes = 0;
            let quantidade_acompanhamentos = 0;
            
            if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
              // Usar cache válido
              quantidade_licitacoes = cached.data.licitacoes?.length || 0;
              quantidade_acompanhamentos = cached.data.acompanhamentos?.length || 0;
              console.log(`🎯 Cache hit para contagem do boletim ${boletim.id}: ${quantidade_licitacoes} licitações, ${quantidade_acompanhamentos} acompanhamentos`);
            } else {
              // Buscar dados frescos
              const data = await conLicitacaoAPI.getBoletimData(boletim.id);
              quantidade_licitacoes = data.licitacoes?.length || 0;
              quantidade_acompanhamentos = data.acompanhamentos?.length || 0;
              
              // Cachear para próximas requisições
              this.boletimCache.set(boletim.id, { data, timestamp: Date.now() });
              console.log(`📊 Boletim ${boletim.id}: ${quantidade_licitacoes} licitações, ${quantidade_acompanhamentos} acompanhamentos`);
            }
            
            return {
              id: boletim.id,
              numero_edicao: boletim.numero_edicao,
              datahora_fechamento: boletim.datahora_fechamento,
              filtro_id: boletim.filtro_id,
              quantidade_licitacoes,
              quantidade_acompanhamentos,
              visualizado: this.viewedBoletins.has(boletim.id),
            };
          } catch (error) {
            console.warn(`⚠️ Erro ao buscar contagem do boletim ${boletim.id}, usando valores padrão`);
            return {
              id: boletim.id,
              numero_edicao: boletim.numero_edicao,
              datahora_fechamento: boletim.datahora_fechamento,
              filtro_id: boletim.filtro_id,
              quantidade_licitacoes: 0,
              quantidade_acompanhamentos: 0,
              visualizado: this.viewedBoletins.has(boletim.id),
            };
          }
        })
      );
      
      console.log(`✅ Carregados ${boletinsWithCounts.length} boletins com contagens corretas!`);

      return {
        boletins: boletinsWithCounts,
        total: (() => {
          const r: any = response as any;
          const candidates = [r?.total, r?.filtro?.total_boletins, r?.total_boletins, r?.pagination?.total];
          const found = candidates.find((v: any) => typeof v === 'number');
          return typeof found === 'number'
            ? found
            : (Array.isArray(r?.boletins) ? r.boletins.length : 0);
        })()
      };
    } catch (error: any) {
      if (error.message === 'IP_NOT_AUTHORIZED') {
        console.log('🚫 API ConLicitação: IP não autorizado.');
        console.log('💡 Para acesso aos dados reais, execute em ambiente com IP autorizado:');
        console.log('   - Desenvolvimento (Replit): 35.227.80.200');
        console.log('   - Produção: 31.97.26.138');
      } else {
        console.error('Erro ao buscar boletins da API:', error);
      }
      
      // Dados de teste para desenvolvimento enquanto IP não está autorizado
      
      // Mock com datas do dia atual (manhã, tarde, noite)
      const hoje = new Date();
      const baseData = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
      const toISOAt = (h: number, m: number) => {
        const d = new Date(baseData);
        d.setHours(h, m, 0, 0);
        return d.toISOString();
      };

      const boletinsTeste: Boletim[] = [
        {
          id: 1,
          numero_edicao: 1000 + hoje.getDate(),
          datahora_fechamento: toISOAt(17, 0), // NOITE
          filtro_id: filtroId,
          quantidade_licitacoes: 25,
          quantidade_acompanhamentos: 8,
          visualizado: this.viewedBoletins.has(1)
        },
        {
          id: 2,
          numero_edicao: 999 + hoje.getDate(),
          datahora_fechamento: toISOAt(12, 30), // TARDE
          filtro_id: filtroId,
          quantidade_licitacoes: 32,
          quantidade_acompanhamentos: 12,
          visualizado: this.viewedBoletins.has(2)
        },
        {
          id: 3,
          numero_edicao: 998 + hoje.getDate(),
          datahora_fechamento: toISOAt(9, 0), // MANHÃ
          filtro_id: filtroId,
          quantidade_licitacoes: 18,
          quantidade_acompanhamentos: 5,
          visualizado: this.viewedBoletins.has(3)
        }
      ];

      return { boletins: boletinsTeste, total: boletinsTeste.length };
    }
  }

  // Método otimizado para obter dados de boletim com cache
  private async getCachedBoletimData(id: number): Promise<any> {
    // Verificar cache primeiro
    const cached = this.boletimCache.get(id);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      console.log(`🎯 Cache hit para boletim ${id} (fonte: ${cached.dataSource})`);
      return cached.data;
    }
    
    console.log(`📡 Buscando dados frescos para boletim ${id}`);
    try {
      const data = await conLicitacaoAPI.getBoletimData(id);
      this.boletimCache.set(id, { data, timestamp: Date.now(), dataSource: 'api' });
      console.log(`✅ Dados do boletim ${id} obtidos da API real`);
      return data;
    } catch (error: any) {
      if (error.message === 'IP_NOT_AUTHORIZED') {
        console.log(`⚠️ IP não autorizado para boletim ${id}, usando dados mock se disponíveis`);
        // Se temos dados em cache (mesmo expirados), usar eles
        if (cached) {
          console.log(`🔄 Usando cache expirado para boletim ${id} (fonte: ${cached.dataSource})`);
          return cached.data;
        }
      }
      throw error;
    }
  }



  async getBoletim(id: number): Promise<{ boletim: Boletim, licitacoes: Bidding[], acompanhamentos: Acompanhamento[] } | undefined> {
    try {
      const response = await this.getCachedBoletimData(id);
      
      // Transformar licitações e acompanhamentos primeiro para contar corretamente
      const dataSource = this.boletimCache.get(id)?.dataSource || 'api';
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

      const boletim: Boletim = {
        id: response.boletim.id,
        numero_edicao: response.boletim.numero_edicao,
        datahora_fechamento: response.boletim.datahora_fechamento,
        filtro_id: response.boletim.cliente.filtro.id,
        quantidade_licitacoes: licitacoes.length, // Contar dados reais
        quantidade_acompanhamentos: acompanhamentos.length, // Contar dados reais
        visualizado: this.viewedBoletins.has(id),
      };



      // Atualizar cache das licitações somente se não existir (evitar duplicação)
      licitacoes.forEach(licitacao => {
        if (!this.cachedBiddings.has(licitacao.id)) {
          this.cachedBiddings.set(licitacao.id, licitacao);
        }
      });
      this.lastCacheUpdate = Date.now();

      return { boletim, licitacoes, acompanhamentos };
    } catch (error: any) {
      if (error.message === 'IP_NOT_AUTHORIZED') {
        console.log('🚫 API ConLicitação: IP não autorizado.');
        console.log('💡 Para acesso aos dados reais, execute em ambiente com IP autorizado:');
        console.log('   - Desenvolvimento (Replit): 35.227.80.200');
        console.log('   - Produção: 31.97.26.138');
      } else {
        console.error('Erro ao buscar boletim da API:', error);
      }
      
      const licitacoesTeste: Bidding[] = [
        {
          id: 1,
          conlicitacao_id: 17942339,
          orgao_nome: "Fundação de Apoio ao Ensino, Pesquisa, Extensão e Interiorização do IFAM- FAEPI",
          orgao_codigo: "UASG123",
          orgao_cidade: "Manaus",
          orgao_uf: "AM",
          orgao_endereco: "Endereço teste",
          orgao_telefone: "(92) 1234-5678",
          orgao_site: "www.teste.gov.br",
          objeto: "Produto/Serviço Quant. Unidade Produto/Serviço: Serviço de apoio logístico para evento",
          situacao: "URGENTE",
          datahora_abertura: "2025-07-15 09:00:00",
          datahora_documento: "2025-07-10 14:30:00",
          datahora_retirada: "2025-07-12 16:00:00",
          datahora_visita: null,
          datahora_prazo: "2025-07-20 17:00:00",
          edital: "SM/715/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=teste1",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=teste1",
          processo: "23456.789012/2025-01",
          observacao: "Observação teste",
          item: "Item teste",
          preco_edital: 50000.00,
          valor_estimado: 50000.00,
          boletim_id: id,
        },
        {
          id: 2,
          conlicitacao_id: 17942355,
          orgao_nome: "Fundação de Apoio ao Ensino, Pesquisa, Extensão e Interiorização do IFAM- FAEPI",
          orgao_codigo: "UASG456",
          orgao_cidade: "Manaus",
          orgao_uf: "AM",
          orgao_endereco: "Endereço teste 2",
          orgao_telefone: "(92) 9876-5432",
          orgao_site: "www.teste2.gov.br",
          objeto: "Produto/Serviço Quant. Unidade Produto/Serviço: Iogurte zero açúcar",
          situacao: "URGENTE",
          datahora_abertura: "2025-07-17 07:59:00",
          datahora_documento: null,
          datahora_retirada: null,
          datahora_visita: "2025-07-16 10:30:00",
          datahora_prazo: "",
          edital: "SM/711/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=teste2",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=teste2",
          processo: "98765.432109/2025-02",
          observacao: "Observação teste 2",
          item: "Item teste 2",
          preco_edital: 25000.00,
          valor_estimado: 25000.00,
          boletim_id: id,
        },
        {
          id: 3,
          conlicitacao_id: 17942403,
          orgao_nome: "Secretaria de Saúde de São Paulo",
          orgao_codigo: "UASG1001",
          orgao_cidade: "São Paulo",
          orgao_uf: "SP",
          orgao_endereco: "Av. Paulista, 1000",
          orgao_telefone: "(11) 1111-1111",
          orgao_site: "www.saude.sp.gov.br",
          objeto: "Aquisição de material hospitalar",
          situacao: "ABERTA",
          datahora_abertura: "2025-08-01 10:00:00",
          datahora_documento: "2025-07-28 09:00:00",
          datahora_retirada: "2025-07-30 16:00:00",
          datahora_visita: null,
          datahora_prazo: "2025-08-05 17:00:00",
          edital: "SS/801/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock3",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock3",
          processo: "10000.000001/2025-08",
          observacao: "Mock teste",
          item: "Item saúde",
          preco_edital: 10000.00,
          valor_estimado: 120000.00,
          boletim_id: id,
        },
        {
          id: 4,
          conlicitacao_id: 17942404,
          orgao_nome: "Prefeitura do Rio de Janeiro",
          orgao_codigo: "UASG1002",
          orgao_cidade: "Rio de Janeiro",
          orgao_uf: "RJ",
          orgao_endereco: "Rua das Laranjeiras, 50",
          orgao_telefone: "(21) 2222-2222",
          orgao_site: "www.rio.rj.gov.br",
          objeto: "Serviços de manutenção de vias",
          situacao: "ABERTA",
          datahora_abertura: "2025-08-01 10:00:00",
          datahora_documento: "2025-07-29 10:00:00",
          datahora_retirada: null,
          datahora_visita: null,
          datahora_prazo: "2025-08-05 17:00:00",
          edital: "PRJ/802/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock4",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock4",
          processo: "20000.000002/2025-08",
          observacao: "Mock manutenção",
          item: "Item manutenção",
          preco_edital: 15000.00,
          valor_estimado: 300000.00,
          boletim_id: id,
        },
        {
          id: 5,
          conlicitacao_id: 17942405,
          orgao_nome: "Secretaria de Educação de Minas Gerais",
          orgao_codigo: "UASG1003",
          orgao_cidade: "Belo Horizonte",
          orgao_uf: "MG",
          orgao_endereco: "Praça da Liberdade, 10",
          orgao_telefone: "(31) 3333-3333",
          orgao_site: "www.educacao.mg.gov.br",
          objeto: "Compra de mobiliário escolar",
          situacao: "ABERTA",
          datahora_abertura: "2025-08-01 10:00:00",
          datahora_documento: null,
          datahora_retirada: "2025-07-31 15:00:00",
          datahora_visita: null,
          datahora_prazo: "2025-08-05 17:00:00",
          edital: "SEMG/803/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock5",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock5",
          processo: "30000.000003/2025-08",
          observacao: "Mock mobiliário",
          item: "Item escolar",
          preco_edital: 8000.00,
          valor_estimado: 180000.00,
          boletim_id: id,
        },
        {
          id: 6,
          conlicitacao_id: 17942406,
          orgao_nome: "Secretaria de Administração da Bahia",
          orgao_codigo: "UASG1004",
          orgao_cidade: "Salvador",
          orgao_uf: "BA",
          orgao_endereco: "Av. Sete de Setembro, 700",
          orgao_telefone: "(71) 4444-4444",
          orgao_site: "www.adm.ba.gov.br",
          objeto: "Contratação de serviços de limpeza",
          situacao: "ABERTA",
          datahora_abertura: "2025-08-01 10:00:00",
          datahora_documento: "2025-07-28 08:00:00",
          datahora_retirada: null,
          datahora_visita: null,
          datahora_prazo: "2025-08-05 17:00:00",
          edital: "SAB/804/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock6",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock6",
          processo: "40000.000004/2025-08",
          observacao: "Mock limpeza",
          item: "Item limpeza",
          preco_edital: 5000.00,
          valor_estimado: 100000.00,
          boletim_id: id,
        },
        {
          id: 7,
          conlicitacao_id: 17942407,
          orgao_nome: "Secretaria de Obras do Rio Grande do Sul",
          orgao_codigo: "UASG1005",
          orgao_cidade: "Porto Alegre",
          orgao_uf: "RS",
          orgao_endereco: "Rua dos Andradas, 123",
          orgao_telefone: "(51) 5555-5555",
          orgao_site: "www.obras.rs.gov.br",
          objeto: "Serviços de pavimentação",
          situacao: "ABERTA",
          datahora_abertura: "2025-08-01 10:00:00",
          datahora_documento: null,
          datahora_retirada: null,
          datahora_visita: null,
          datahora_prazo: "2025-08-05 17:00:00",
          edital: "SORS/805/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock7",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock7",
          processo: "50000.000005/2025-08",
          observacao: "Mock pavimentação",
          item: "Item obras",
          preco_edital: 20000.00,
          valor_estimado: 500000.00,
          boletim_id: id,
        },
        {
          id: 8,
          conlicitacao_id: 17942408,
          orgao_nome: "Secretaria de Turismo do Paraná",
          orgao_codigo: "UASG1006",
          orgao_cidade: "Curitiba",
          orgao_uf: "PR",
          orgao_endereco: "Rua XV de Novembro, 200",
          orgao_telefone: "(41) 6666-6666",
          orgao_site: "www.turismo.pr.gov.br",
          objeto: "Serviços de organização de eventos",
          situacao: "ABERTA",
          datahora_abertura: null,
          datahora_documento: "2025-08-10 14:00:00",
          datahora_retirada: null,
          datahora_visita: null,
          datahora_prazo: "2025-08-18 17:00:00",
          edital: "STPR/806/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock8",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock8",
          processo: "60000.000006/2025-08",
          observacao: "Mock eventos",
          item: "Item turismo",
          preco_edital: 7000.00,
          valor_estimado: 160000.00,
          boletim_id: id,
        },
        {
          id: 9,
          conlicitacao_id: 17942409,
          orgao_nome: "Secretaria de Esportes de Santa Catarina",
          orgao_codigo: "UASG1007",
          orgao_cidade: "Florianópolis",
          orgao_uf: "SC",
          orgao_endereco: "Av. Beira-Mar, 400",
          orgao_telefone: "(48) 7777-7777",
          orgao_site: "www.esportes.sc.gov.br",
          objeto: "Compra de equipamentos esportivos",
          situacao: "ABERTA",
          datahora_abertura: null,
          datahora_documento: "2025-08-10 14:00:00",
          datahora_retirada: "2025-08-12 16:00:00",
          datahora_visita: null,
          datahora_prazo: "2025-08-19 12:00:00",
          edital: "SESC/807/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock9",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock9",
          processo: "70000.000007/2025-08",
          observacao: "Mock esportes",
          item: "Item esportivo",
          preco_edital: 6000.00,
          valor_estimado: 90000.00,
          boletim_id: id,
        },
        {
          id: 10,
          conlicitacao_id: 17942410,
          orgao_nome: "Governo de Pernambuco",
          orgao_codigo: "UASG1008",
          orgao_cidade: "Recife",
          orgao_uf: "PE",
          orgao_endereco: "Rua da Aurora, 123",
          orgao_telefone: "(81) 8888-8888",
          orgao_site: "www.pe.gov.br",
          objeto: "Serviços de publicidade institucional",
          situacao: "ABERTA",
          datahora_abertura: "",
          datahora_documento: "2025-08-10 14:00:00",
          datahora_retirada: null,
          datahora_visita: null,
          datahora_prazo: "2025-08-25 17:00:00",
          edital: "GPE/808/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock10",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock10",
          processo: "80000.000008/2025-08",
          observacao: "Mock publicidade",
          item: "Item publicidade",
          preco_edital: 12000.00,
          valor_estimado: 250000.00,
          boletim_id: id,
        },
        {
          id: 11,
          conlicitacao_id: 17942411,
          orgao_nome: "Prefeitura de Fortaleza",
          orgao_codigo: "UASG1009",
          orgao_cidade: "Fortaleza",
          orgao_uf: "CE",
          orgao_endereco: "Av. Dom Luís, 90",
          orgao_telefone: "(85) 9999-9999",
          orgao_site: "www.fortaleza.ce.gov.br",
          objeto: "Fornecimento de alimentação escolar",
          situacao: "ABERTA",
          datahora_abertura: null,
          datahora_documento: "2025-08-10 14:00:00",
          datahora_retirada: null,
          datahora_visita: "",
          datahora_prazo: "2025-08-22 11:00:00",
          edital: "PFF/809/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock11",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock11",
          processo: "90000.000009/2025-08",
          observacao: "Mock alimentação",
          item: "Item merenda",
          preco_edital: 9000.00,
          valor_estimado: 140000.00,
          boletim_id: id,
        },
        {
          id: 12,
          conlicitacao_id: 17942412,
          orgao_nome: "Governo do Distrito Federal",
          orgao_codigo: "UASG1010",
          orgao_cidade: "Brasília",
          orgao_uf: "DF",
          orgao_endereco: "Esplanada dos Ministérios",
          orgao_telefone: "(61) 1010-1010",
          orgao_site: "www.df.gov.br",
          objeto: "Locação de veículos",
          situacao: "ABERTA",
          datahora_abertura: "",
          datahora_documento: "2025-08-10 14:00:00",
          datahora_retirada: "",
          datahora_visita: null,
          datahora_prazo: "2025-08-28 18:00:00",
          edital: "GDF/810/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock12",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock12",
          processo: "100000.000010/2025-08",
          observacao: "Mock locação",
          item: "Item frota",
          preco_edital: 11000.00,
          valor_estimado: 320000.00,
          boletim_id: id,
        },
        {
          id: 13,
          conlicitacao_id: 17942413,
          orgao_nome: "Secretaria de Infraestrutura do Pará",
          orgao_codigo: "UASG1011",
          orgao_cidade: "Belém",
          orgao_uf: "PA",
          orgao_endereco: "Av. Nazaré, 50",
          orgao_telefone: "(91) 1313-1313",
          orgao_site: "www.infra.pa.gov.br",
          objeto: "Construção de ponte",
          situacao: "ABERTA",
          datahora_abertura: null,
          datahora_documento: null,
          datahora_retirada: "2025-08-12 16:00:00",
          datahora_visita: "2025-08-15 09:00:00",
          datahora_prazo: "2025-08-30 17:00:00",
          edital: "SIPA/811/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock13",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock13",
          processo: "110000.000011/2025-08",
          observacao: "Mock ponte",
          item: "Item obra",
          preco_edital: 25000.00,
          valor_estimado: 1000000.00,
          boletim_id: id,
        },
        {
          id: 14,
          conlicitacao_id: 17942414,
          orgao_nome: "Prefeitura de Goiânia",
          orgao_codigo: "UASG1012",
          orgao_cidade: "Goiânia",
          orgao_uf: "GO",
          orgao_endereco: "Av. T-63, 120",
          orgao_telefone: "(62) 1414-1414",
          orgao_site: "www.goiania.go.gov.br",
          objeto: "Manutenção de praças",
          situacao: "ABERTA",
          datahora_abertura: null,
          datahora_documento: null,
          datahora_retirada: "2025-08-12 16:00:00",
          datahora_visita: "2025-08-15 09:00:00",
          datahora_prazo: "2025-08-27 09:00:00",
          edital: "PGO/812/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock14",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock14",
          processo: "120000.000012/2025-08",
          observacao: "Mock praças",
          item: "Item urbano",
          preco_edital: 4000.00,
          valor_estimado: 85000.00,
          boletim_id: id,
        },
        {
          id: 15,
          conlicitacao_id: 17942415,
          orgao_nome: "Secretaria de Segurança do Espírito Santo",
          orgao_codigo: "UASG1013",
          orgao_cidade: "Vitória",
          orgao_uf: "ES",
          orgao_endereco: "Av. Vitória, 500",
          orgao_telefone: "(27) 1515-1515",
          orgao_site: "www.seguranca.es.gov.br",
          objeto: "Compra de viaturas",
          situacao: "ABERTA",
          datahora_abertura: null,
          datahora_documento: null,
          datahora_retirada: "2025-08-12 16:00:00",
          datahora_visita: "2025-08-15 09:00:00",
          datahora_prazo: "2025-08-29 17:00:00",
          edital: "SEES/813/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock15",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock15",
          processo: "130000.000013/2025-08",
          observacao: "Mock viaturas",
          item: "Item segurança",
          preco_edital: 18000.00,
          valor_estimado: 600000.00,
          boletim_id: id,
        },
        {
          id: 16,
          conlicitacao_id: 17942416,
          orgao_nome: "Secretaria de Agricultura do Mato Grosso",
          orgao_codigo: "UASG1014",
          orgao_cidade: "Cuiabá",
          orgao_uf: "MT",
          orgao_endereco: "Av. Getúlio Vargas, 320",
          orgao_telefone: "(65) 1616-1616",
          orgao_site: "www.agricultura.mt.gov.br",
          objeto: "Aquisição de sementes",
          situacao: "ABERTA",
          datahora_abertura: null,
          datahora_documento: null,
          datahora_retirada: "2025-08-12 16:00:00",
          datahora_visita: "2025-08-15 09:00:00",
          datahora_prazo: "2025-09-02 10:00:00",
          edital: "SAMT/814/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock16",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock16",
          processo: "140000.000014/2025-08",
          observacao: "Mock sementes",
          item: "Item agricultura",
          preco_edital: 3000.00,
          valor_estimado: 50000.00,
          boletim_id: id,
        },
        {
          id: 17,
          conlicitacao_id: 17942417,
          orgao_nome: "Secretaria de Meio Ambiente do Mato Grosso do Sul",
          orgao_codigo: "UASG1015",
          orgao_cidade: "Campo Grande",
          orgao_uf: "MS",
          orgao_endereco: "Rua 14 de Julho, 210",
          orgao_telefone: "(67) 1717-1717",
          orgao_site: "www.meioambiente.ms.gov.br",
          objeto: "Serviços de reflorestamento",
          situacao: "ABERTA",
          datahora_abertura: null,
          datahora_documento: null,
          datahora_retirada: "2025-08-12 16:00:00",
          datahora_visita: "2025-08-15 09:00:00",
          datahora_prazo: "2025-09-03 15:30:00",
          edital: "SMAMS/815/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock17",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock17",
          processo: "150000.000015/2025-08",
          observacao: "Mock reflorestamento",
          item: "Item ambiental",
          preco_edital: 7000.00,
          valor_estimado: 150000.00,
          boletim_id: id,
        },
        {
          id: 18,
          conlicitacao_id: 17942418,
          orgao_nome: "Secretaria de Educação do Ceará",
          orgao_codigo: "UASG1016",
          orgao_cidade: "Fortaleza",
          orgao_uf: "CE",
          orgao_endereco: "Av. Barão de Studart, 300",
          orgao_telefone: "(85) 1818-1818",
          orgao_site: "www.educacao.ce.gov.br",
          objeto: "Aquisição de livros didáticos",
          situacao: "ABERTA",
          datahora_abertura: "2025-08-10 09:00:00",
          datahora_documento: "2025-08-05 10:30:00",
          datahora_retirada: "2025-08-07 15:00:00",
          datahora_visita: null,
          datahora_prazo: "2025-08-20 17:00:00",
          edital: "SEC/816/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock18",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock18",
          processo: "160000.000016/2025-08",
          observacao: "Mock educação",
          item: "Item livros",
          preco_edital: 8000.00,
          valor_estimado: 200000.00,
          boletim_id: id,
        },
        {
          id: 19,
          conlicitacao_id: 17942419,
          orgao_nome: "Secretaria de Saúde do Rio de Janeiro",
          orgao_codigo: "UASG1017",
          orgao_cidade: "Rio de Janeiro",
          orgao_uf: "RJ",
          orgao_endereco: "Rua México, 180",
          orgao_telefone: "(21) 1919-1919",
          orgao_site: "www.saude.rj.gov.br",
          objeto: "Aquisição de material hospitalar",
          situacao: "ABERTA",
          datahora_abertura: "2025-08-12 10:00:00",
          datahora_documento: "2025-08-06 09:00:00",
          datahora_retirada: "2025-08-08 16:00:00",
          datahora_visita: null,
          datahora_prazo: "2025-08-22 17:00:00",
          edital: "SSRJ/817/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock19",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock19",
          processo: "170000.000017/2025-08",
          observacao: "Mock hospitalar",
          item: "Item saúde",
          preco_edital: 10000.00,
          valor_estimado: 250000.00,
          boletim_id: id,
        },
        {
          id: 20,
          conlicitacao_id: 17942420,
          orgao_nome: "Prefeitura de Belo Horizonte",
          orgao_codigo: "UASG1018",
          orgao_cidade: "Belo Horizonte",
          orgao_uf: "MG",
          orgao_endereco: "Av. Afonso Pena, 400",
          orgao_telefone: "(31) 2020-2020",
          orgao_site: "www.pbh.gov.br",
          objeto: "Serviços de limpeza urbana",
          situacao: "ABERTA",
          datahora_abertura: null,
          datahora_documento: "2025-08-14 11:00:00",
          datahora_retirada: null,
          datahora_visita: null,
          datahora_prazo: "2025-08-26 17:00:00",
          edital: "PBH/818/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock20",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock20",
          processo: "180000.000018/2025-08",
          observacao: "Mock limpeza urbana",
          item: "Item limpeza",
          preco_edital: 6000.00,
          valor_estimado: 130000.00,
          boletim_id: id,
        },
        {
          id: 21,
          conlicitacao_id: 17942421,
          orgao_nome: "Governo da Bahia",
          orgao_codigo: "UASG1019",
          orgao_cidade: "Salvador",
          orgao_uf: "BA",
          orgao_endereco: "Centro Administrativo da Bahia",
          orgao_telefone: "(71) 2121-2121",
          orgao_site: "www.ba.gov.br",
          objeto: "Reforma de escolas estaduais",
          situacao: "ABERTA",
          datahora_abertura: "2025-08-18 09:30:00",
          datahora_documento: "2025-08-12 08:45:00",
          datahora_retirada: null,
          datahora_visita: "2025-08-20 10:00:00",
          datahora_prazo: "2025-08-31 17:00:00",
          edital: "GBA/819/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock21",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock21",
          processo: "190000.000019/2025-08",
          observacao: "Mock reformas",
          item: "Item obras",
          preco_edital: 15000.00,
          valor_estimado: 700000.00,
          boletim_id: id,
        },
        {
          id: 22,
          conlicitacao_id: 17942422,
          orgao_nome: "Secretaria de Cultura do Maranhão",
          orgao_codigo: "UASG1020",
          orgao_cidade: "São Luís",
          orgao_uf: "MA",
          orgao_endereco: "Rua da Cultura, 50",
          orgao_telefone: "(98) 2222-2222",
          orgao_site: "www.cultura.ma.gov.br",
          objeto: "Produção de eventos culturais",
          situacao: "ABERTA",
          datahora_abertura: null,
          datahora_documento: "2025-08-15 13:00:00",
          datahora_retirada: "2025-08-17 16:00:00",
          datahora_visita: null,
          datahora_prazo: "2025-09-01 18:00:00",
          edital: "SCMA/820/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock22",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock22",
          processo: "200000.000020/2025-08",
          observacao: "Mock cultura",
          item: "Item evento",
          preco_edital: 7000.00,
          valor_estimado: 95000.00,
          boletim_id: id,
        },
        {
          id: 23,
          conlicitacao_id: 17942423,
          orgao_nome: "Companhia de Saneamento de Goiás",
          orgao_codigo: "UASG1021",
          orgao_cidade: "Goiânia",
          orgao_uf: "GO",
          orgao_endereco: "Av. Anhanguera, 1000",
          orgao_telefone: "(62) 2323-2323",
          orgao_site: "www.saneago.go.gov.br",
          objeto: "Ampliação de rede de água",
          situacao: "ABERTA",
          datahora_abertura: null,
          datahora_documento: "2025-08-16 10:00:00",
          datahora_retirada: null,
          datahora_visita: "2025-08-22 09:00:00",
          datahora_prazo: "2025-09-03 17:00:00",
          edital: "SANEGO/821/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock23",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock23",
          processo: "210000.000021/2025-08",
          observacao: "Mock saneamento",
          item: "Item rede",
          preco_edital: 12000.00,
          valor_estimado: 300000.00,
          boletim_id: id,
        },
        {
          id: 24,
          conlicitacao_id: 17942424,
          orgao_nome: "Universidade Federal de Minas Gerais",
          orgao_codigo: "UASG1022",
          orgao_cidade: "Belo Horizonte",
          orgao_uf: "MG",
          orgao_endereco: "Av. Antônio Carlos, 6627",
          orgao_telefone: "(31) 2424-2424",
          orgao_site: "www.ufmg.br",
          objeto: "Fornecimento de equipamentos de laboratório",
          situacao: "ABERTA",
          datahora_abertura: "2025-08-25 09:00:00",
          datahora_documento: "2025-08-18 14:00:00",
          datahora_retirada: null,
          datahora_visita: null,
          datahora_prazo: "2025-09-05 17:00:00",
          edital: "UFMG/822/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock24",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock24",
          processo: "220000.000022/2025-08",
          observacao: "Mock laboratório",
          item: "Item laboratório",
          preco_edital: 15000.00,
          valor_estimado: 400000.00,
          boletim_id: id,
        },
        {
          id: 25,
          conlicitacao_id: 17942425,
          orgao_nome: "Secretaria de Transportes do Amazonas",
          orgao_codigo: "UASG1023",
          orgao_cidade: "Manaus",
          orgao_uf: "AM",
          orgao_endereco: "Av. Djalma Batista, 1000",
          orgao_telefone: "(92) 2525-2525",
          orgao_site: "www.transportes.am.gov.br",
          objeto: "Pavimentação de rodovias",
          situacao: "ABERTA",
          datahora_abertura: null,
          datahora_documento: "2025-08-19 11:30:00",
          datahora_retirada: "2025-08-21 16:00:00",
          datahora_visita: "2025-08-23 08:30:00",
          datahora_prazo: "2025-09-06 17:00:00",
          edital: "STAM/823/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock25",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock25",
          processo: "230000.000023/2025-08",
          observacao: "Mock rodovias",
          item: "Item pavimentação",
          preco_edital: 20000.00,
          valor_estimado: 800000.00,
          boletim_id: id,
        },
        {
          id: 26,
          conlicitacao_id: 17942426,
          orgao_nome: "Tribunal de Justiça de São Paulo",
          orgao_codigo: "UASG1024",
          orgao_cidade: "São Paulo",
          orgao_uf: "SP",
          orgao_endereco: "Praça da Sé, 1",
          orgao_telefone: "(11) 2626-2626",
          orgao_site: "www.tjsp.jus.br",
          objeto: "Serviços de TI e suporte",
          situacao: "ABERTA",
          datahora_abertura: "2025-08-27 10:00:00",
          datahora_documento: "2025-08-20 09:00:00",
          datahora_retirada: null,
          datahora_visita: null,
          datahora_prazo: "2025-09-08 18:00:00",
          edital: "TJSP/824/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock26",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock26",
          processo: "240000.000024/2025-08",
          observacao: "Mock TI",
          item: "Item tecnologia",
          preco_edital: 9000.00,
          valor_estimado: 220000.00,
          boletim_id: id,
        },
        {
          id: 27,
          conlicitacao_id: 17942427,
          orgao_nome: "Prefeitura de Natal",
          orgao_codigo: "UASG1025",
          orgao_cidade: "Natal",
          orgao_uf: "RN",
          orgao_endereco: "Av. Senador Salgado Filho, 500",
          orgao_telefone: "(84) 2727-2727",
          orgao_site: "www.natal.rn.gov.br",
          objeto: "Recuperação de vias públicas",
          situacao: "ABERTA",
          datahora_abertura: null,
          datahora_documento: "2025-08-22 14:00:00",
          datahora_retirada: null,
          datahora_visita: null,
          datahora_prazo: "2025-09-10 12:00:00",
          edital: "PNAT/825/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock27",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock27",
          processo: "250000.000025/2025-08",
          observacao: "Mock vias",
          item: "Item recuperação",
          preco_edital: 7000.00,
          valor_estimado: 180000.00,
          boletim_id: id,
        }
      ];

      // Adicionar ao cache somente se não existir (evitar duplicação)
      licitacoesTeste.forEach(licitacao => {
        if (!this.cachedBiddings.has(licitacao.id)) {
          this.cachedBiddings.set(licitacao.id, licitacao);
        }
      });
      this.lastCacheUpdate = Date.now();

      // Dados de teste para verificar badge URGENTE e links - calcular contagem correta
      const acompanhamentosTeste: Acompanhamento[] = []; // Vazio para teste
      
      const boletimTeste: Boletim = {
        id: id,
        numero_edicao: 341,
        datahora_fechamento: "2025-07-29T12:00:00.000Z", // Data fixa para hoje ser encontrada no calendário
        filtro_id: 1,
        quantidade_licitacoes: licitacoesTeste.length, // Contar dados reais de teste
        quantidade_acompanhamentos: acompanhamentosTeste.length, // Contar dados reais de teste
        visualizado: this.viewedBoletins.has(id)
      };

      return { 
        boletim: boletimTeste, 
        licitacoes: licitacoesTeste, 
        acompanhamentos: acompanhamentosTeste 
      };
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
  private transformLicitacaoFromAPI(licitacao: any, boletimId: number, dataSource: 'api' | 'mock' = 'api'): Bidding & { cacheTimestamp: number, dataSource: 'api' | 'mock' } {
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
      console.log(`🔄 Status expandido: "${situacaoOriginal}" → "${situacaoExpandida}" (ID: ${licitacao.id})`);
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
      // Metadata de cache
      cacheTimestamp: Date.now(),
      dataSource: dataSource,
    };
  }

  async markBoletimAsViewed(id: number): Promise<void> {
    this.viewedBoletins.add(id);
  }

  async getBiddings(filters?: { 
    conlicitacao_id?: string; 
    orgao?: string[]; 
    uf?: string[];
    numero_controle?: string;
  }): Promise<Bidding[]> {
    // NOVO SISTEMA: SÓ carregar dados quando há filtros específicos

    // Se não há filtros, retornar apenas dados de exemplo mínimos
    if (!filters || (!filters.numero_controle && !filters.conlicitacao_id && 
        (!filters.orgao || filters.orgao.length === 0) && 
        (!filters.uf || filters.uf.length === 0))) {
      await this.loadMinimalSampleData();
      if (Date.now() - this.lastCacheUpdate > this.CACHE_DURATION) {
        this.refreshRecentBoletins().catch(() => {});
      }
      const result = Array.from(this.cachedBiddings.values()).slice(0, 50);
      return result;
    }

    // Se há busca por número de controle, fazer busca específica
    if (filters.numero_controle) {
      return await this.searchByControlNumber(filters.numero_controle);
    }

    // Para outros filtros, carregar dados limitados
    if (this.cachedBiddings.size === 0) {
      await this.loadMinimalSampleData();
    }

    let biddings = Array.from(this.cachedBiddings.values());

    if (filters?.conlicitacao_id) {
      biddings = biddings.filter(b => 
        b.conlicitacao_id.toString().includes(filters.conlicitacao_id!)
      );
    }
    
    if (filters?.orgao && filters.orgao.length > 0) {
      biddings = biddings.filter(b => 
        filters.orgao!.some(orgao => 
          b.orgao_nome?.toLowerCase().includes(orgao.toLowerCase())
        )
      );
    }

    if (filters?.uf && filters.uf.length > 0) {
      biddings = biddings.filter(b => 
        filters.uf!.includes(b.orgao_uf)
      );
    }
    
    if (Date.now() - this.lastCacheUpdate > this.CACHE_DURATION) {
      this.refreshRecentBoletins().catch(() => {});
    }
    
    return biddings;
  }

  private async refreshBiddingsCache(): Promise<void> {
    const newCache = new Map<number, Bidding & { cacheTimestamp: number, dataSource: 'api' | 'mock' }>();
    const licitacoesTeste: Bidding[] = [
      {
        id: 1,
        conlicitacao_id: 17942339,
        orgao_nome: "Fundação de Apoio ao Ensino, Pesquisa, Extensão e Interiorização do IFAM- FAEPI",
        orgao_codigo: "UASG123",
        orgao_cidade: "Manaus",
        orgao_uf: "AM",
        orgao_endereco: "Endereço teste",
        orgao_telefone: "(92) 1234-5678",
        orgao_site: "www.teste.gov.br",
        objeto: "Produto/Serviço Quant. Unidade Produto/Serviço: Serviço de apoio logístico para evento",
        situacao: "URGENTE",
        datahora_abertura: "2025-07-15 09:00:00",
        datahora_documento: "2025-07-10 14:30:00",
        datahora_retirada: "2025-07-12 16:00:00",
        datahora_visita: null,
        datahora_prazo: "2025-07-20 17:00:00",
        edital: "SM/715/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=teste1",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=teste1",
        processo: "23456.789012/2025-01",
        observacao: "Observação teste",
        item: "Item teste",
        preco_edital: 50000.00,
        valor_estimado: 50000.00,
        boletim_id: 1,
      },
      {
        id: 2,
        conlicitacao_id: 17942355,
        orgao_nome: "Fundação de Apoio ao Ensino, Pesquisa, Extensão e Interiorização do IFAM- FAEPI",
        orgao_codigo: "UASG456",
        orgao_cidade: "Manaus",
        orgao_uf: "AM",
        orgao_endereco: "Endereço teste 2",
        orgao_telefone: "(92) 9876-5432",
        orgao_site: "www.teste2.gov.br",
        objeto: "Produto/Serviço Quant. Unidade Produto/Serviço: Iogurte zero açúcar",
        situacao: "URGENTE",
        datahora_abertura: "2025-07-17 07:59:00",
        datahora_documento: null,
        datahora_retirada: null,
        datahora_visita: "2025-07-16 10:30:00",
        datahora_prazo: "",
        edital: "SM/711/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=teste2",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=teste2",
        processo: "98765.432109/2025-02",
        observacao: "Observação teste 2",
        item: "Item teste 2",
        preco_edital: 25000.00,
        valor_estimado: 25000.00,
        boletim_id: 1,
      },
      {
        id: 3,
        conlicitacao_id: 17942403,
        orgao_nome: "Secretaria de Saúde de São Paulo",
        orgao_codigo: "UASG1001",
        orgao_cidade: "São Paulo",
        orgao_uf: "SP",
        orgao_endereco: "Av. Paulista, 1000",
        orgao_telefone: "(11) 1111-1111",
        orgao_site: "www.saude.sp.gov.br",
        objeto: "Aquisição de material hospitalar",
        situacao: "ABERTA",
        datahora_abertura: "2025-08-01 10:00:00",
        datahora_documento: "2025-07-28 09:00:00",
        datahora_retirada: "2025-07-30 16:00:00",
        datahora_visita: null,
        datahora_prazo: "2025-08-05 17:00:00",
        edital: "SS/801/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock3",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock3",
        processo: "10000.000001/2025-08",
        observacao: "Mock teste",
        item: "Item saúde",
        preco_edital: 10000.00,
        valor_estimado: 120000.00,
        boletim_id: 1,
      },
      {
        id: 4,
        conlicitacao_id: 17942404,
        orgao_nome: "Prefeitura do Rio de Janeiro",
        orgao_codigo: "UASG1002",
        orgao_cidade: "Rio de Janeiro",
        orgao_uf: "RJ",
        orgao_endereco: "Rua das Laranjeiras, 50",
        orgao_telefone: "(21) 2222-2222",
        orgao_site: "www.rio.rj.gov.br",
        objeto: "Serviços de manutenção de vias",
        situacao: "ABERTA",
        datahora_abertura: "2025-08-01 10:00:00",
        datahora_documento: "2025-07-29 10:00:00",
        datahora_retirada: null,
        datahora_visita: null,
        datahora_prazo: "2025-08-05 17:00:00",
        edital: "PRJ/802/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock4",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock4",
        processo: "20000.000002/2025-08",
        observacao: "Mock manutenção",
        item: "Item manutenção",
        preco_edital: 15000.00,
        valor_estimado: 300000.00,
        boletim_id: 1,
      },
      {
        id: 5,
        conlicitacao_id: 17942405,
        orgao_nome: "Secretaria de Educação de Minas Gerais",
        orgao_codigo: "UASG1003",
        orgao_cidade: "Belo Horizonte",
        orgao_uf: "MG",
        orgao_endereco: "Praça da Liberdade, 10",
        orgao_telefone: "(31) 3333-3333",
        orgao_site: "www.educacao.mg.gov.br",
        objeto: "Compra de mobiliário escolar",
        situacao: "ABERTA",
        datahora_abertura: "2025-08-01 10:00:00",
        datahora_documento: null,
        datahora_retirada: "2025-07-31 15:00:00",
        datahora_visita: null,
        datahora_prazo: "2025-08-05 17:00:00",
        edital: "SEMG/803/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock5",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock5",
        processo: "30000.000003/2025-08",
        observacao: "Mock mobiliário",
        item: "Item escolar",
        preco_edital: 8000.00,
        valor_estimado: 180000.00,
        boletim_id: 1,
      },
      {
        id: 6,
        conlicitacao_id: 17942406,
        orgao_nome: "Secretaria de Administração da Bahia",
        orgao_codigo: "UASG1004",
        orgao_cidade: "Salvador",
        orgao_uf: "BA",
        orgao_endereco: "Av. Sete de Setembro, 700",
        orgao_telefone: "(71) 4444-4444",
        orgao_site: "www.adm.ba.gov.br",
        objeto: "Contratação de serviços de limpeza",
        situacao: "ABERTA",
        datahora_abertura: "2025-08-01 10:00:00",
        datahora_documento: "2025-07-28 08:00:00",
        datahora_retirada: null,
        datahora_visita: null,
        datahora_prazo: "2025-08-05 17:00:00",
        edital: "SAB/804/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock6",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock6",
        processo: "40000.000004/2025-08",
        observacao: "Mock limpeza",
        item: "Item limpeza",
        preco_edital: 5000.00,
        valor_estimado: 100000.00,
        boletim_id: 1,
      },
      {
        id: 7,
        conlicitacao_id: 17942407,
        orgao_nome: "Secretaria de Obras do Rio Grande do Sul",
        orgao_codigo: "UASG1005",
        orgao_cidade: "Porto Alegre",
        orgao_uf: "RS",
        orgao_endereco: "Rua dos Andradas, 123",
        orgao_telefone: "(51) 5555-5555",
        orgao_site: "www.obras.rs.gov.br",
        objeto: "Serviços de pavimentação",
        situacao: "ABERTA",
        datahora_abertura: "2025-08-01 10:00:00",
        datahora_documento: null,
        datahora_retirada: null,
        datahora_visita: null,
        datahora_prazo: "2025-08-05 17:00:00",
        edital: "SORS/805/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock7",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock7",
        processo: "50000.000005/2025-08",
        observacao: "Mock pavimentação",
        item: "Item obras",
        preco_edital: 20000.00,
        valor_estimado: 500000.00,
        boletim_id: 1,
      },
      {
        id: 8,
        conlicitacao_id: 17942408,
        orgao_nome: "Secretaria de Turismo do Paraná",
        orgao_codigo: "UASG1006",
        orgao_cidade: "Curitiba",
        orgao_uf: "PR",
        orgao_endereco: "Rua XV de Novembro, 200",
        orgao_telefone: "(41) 6666-6666",
        orgao_site: "www.turismo.pr.gov.br",
        objeto: "Serviços de organização de eventos",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: "2025-08-10 14:00:00",
        datahora_retirada: null,
        datahora_visita: null,
        datahora_prazo: "2025-08-18 17:00:00",
        edital: "STPR/806/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock8",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock8",
        processo: "60000.000006/2025-08",
        observacao: "Mock eventos",
        item: "Item turismo",
        preco_edital: 7000.00,
        valor_estimado: 160000.00,
        boletim_id: 1,
      },
      {
        id: 9,
        conlicitacao_id: 17942409,
        orgao_nome: "Secretaria de Esportes de Santa Catarina",
        orgao_codigo: "UASG1007",
        orgao_cidade: "Florianópolis",
        orgao_uf: "SC",
        orgao_endereco: "Av. Beira-Mar, 400",
        orgao_telefone: "(48) 7777-7777",
        orgao_site: "www.esportes.sc.gov.br",
        objeto: "Compra de equipamentos esportivos",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: "2025-08-10 14:00:00",
        datahora_retirada: "2025-08-12 16:00:00",
        datahora_visita: null,
        datahora_prazo: "2025-08-19 12:00:00",
        edital: "SESC/807/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock9",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock9",
        processo: "70000.000007/2025-08",
        observacao: "Mock esportes",
        item: "Item esportivo",
        preco_edital: 6000.00,
        valor_estimado: 90000.00,
        boletim_id: 1,
      },
      {
        id: 10,
        conlicitacao_id: 17942410,
        orgao_nome: "Governo de Pernambuco",
        orgao_codigo: "UASG1008",
        orgao_cidade: "Recife",
        orgao_uf: "PE",
        orgao_endereco: "Rua da Aurora, 123",
        orgao_telefone: "(81) 8888-8888",
        orgao_site: "www.pe.gov.br",
        objeto: "Serviços de publicidade institucional",
        situacao: "ABERTA",
        datahora_abertura: "",
        datahora_documento: "2025-08-10 14:00:00",
        datahora_retirada: null,
        datahora_visita: null,
        datahora_prazo: "2025-08-25 17:00:00",
        edital: "GPE/808/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock10",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock10",
        processo: "80000.000008/2025-08",
        observacao: "Mock publicidade",
        item: "Item publicidade",
        preco_edital: 12000.00,
        valor_estimado: 250000.00,
        boletim_id: 1,
      },
      {
        id: 11,
        conlicitacao_id: 17942411,
        orgao_nome: "Prefeitura de Fortaleza",
        orgao_codigo: "UASG1009",
        orgao_cidade: "Fortaleza",
        orgao_uf: "CE",
        orgao_endereco: "Av. Dom Luís, 90",
        orgao_telefone: "(85) 9999-9999",
        orgao_site: "www.fortaleza.ce.gov.br",
        objeto: "Fornecimento de alimentação escolar",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: "2025-08-10 14:00:00",
        datahora_retirada: null,
        datahora_visita: "",
        datahora_prazo: "2025-08-22 11:00:00",
        edital: "PFF/809/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock11",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock11",
        processo: "90000.000009/2025-08",
        observacao: "Mock alimentação",
        item: "Item merenda",
        preco_edital: 9000.00,
        valor_estimado: 140000.00,
        boletim_id: 1,
      },
      {
        id: 12,
        conlicitacao_id: 17942412,
        orgao_nome: "Governo do Distrito Federal",
        orgao_codigo: "UASG1010",
        orgao_cidade: "Brasília",
        orgao_uf: "DF",
        orgao_endereco: "Esplanada dos Ministérios",
        orgao_telefone: "(61) 1010-1010",
        orgao_site: "www.df.gov.br",
        objeto: "Locação de veículos",
        situacao: "ABERTA",
        datahora_abertura: "",
        datahora_documento: "2025-08-10 14:00:00",
        datahora_retirada: "",
        datahora_visita: null,
        datahora_prazo: "2025-08-28 18:00:00",
        edital: "GDF/810/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock12",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock12",
        processo: "100000.000010/2025-08",
        observacao: "Mock locação",
        item: "Item frota",
        preco_edital: 11000.00,
        valor_estimado: 320000.00,
        boletim_id: 1,
      },
      {
        id: 13,
        conlicitacao_id: 17942413,
        orgao_nome: "Secretaria de Infraestrutura do Pará",
        orgao_codigo: "UASG1011",
        orgao_cidade: "Belém",
        orgao_uf: "PA",
        orgao_endereco: "Av. Nazaré, 50",
        orgao_telefone: "(91) 1313-1313",
        orgao_site: "www.infra.pa.gov.br",
        objeto: "Construção de ponte",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: null,
        datahora_retirada: "2025-08-12 16:00:00",
        datahora_visita: "2025-08-15 09:00:00",
        datahora_prazo: "2025-08-30 17:00:00",
        edital: "SIPA/811/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock13",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock13",
        processo: "110000.000011/2025-08",
        observacao: "Mock ponte",
        item: "Item obra",
        preco_edital: 25000.00,
        valor_estimado: 1000000.00,
        boletim_id: 1,
      },
      {
        id: 14,
        conlicitacao_id: 17942414,
        orgao_nome: "Prefeitura de Goiânia",
        orgao_codigo: "UASG1012",
        orgao_cidade: "Goiânia",
        orgao_uf: "GO",
        orgao_endereco: "Av. T-63, 120",
        orgao_telefone: "(62) 1414-1414",
        orgao_site: "www.goiania.go.gov.br",
        objeto: "Manutenção de praças",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: null,
        datahora_retirada: "2025-08-12 16:00:00",
        datahora_visita: "2025-08-15 09:00:00",
        datahora_prazo: "2025-08-27 09:00:00",
        edital: "PGO/812/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock14",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock14",
        processo: "120000.000012/2025-08",
        observacao: "Mock praças",
        item: "Item urbano",
        preco_edital: 4000.00,
        valor_estimado: 85000.00,
        boletim_id: 1,
      },
      {
        id: 15,
        conlicitacao_id: 17942415,
        orgao_nome: "Secretaria de Segurança do Espírito Santo",
        orgao_codigo: "UASG1013",
        orgao_cidade: "Vitória",
        orgao_uf: "ES",
        orgao_endereco: "Av. Vitória, 500",
        orgao_telefone: "(27) 1515-1515",
        orgao_site: "www.seguranca.es.gov.br",
        objeto: "Compra de viaturas",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: null,
        datahora_retirada: "2025-08-12 16:00:00",
        datahora_visita: "2025-08-15 09:00:00",
        datahora_prazo: "2025-08-29 17:00:00",
        edital: "SEES/813/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock15",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock15",
        processo: "130000.000013/2025-08",
        observacao: "Mock viaturas",
        item: "Item segurança",
        preco_edital: 18000.00,
        valor_estimado: 600000.00,
        boletim_id: 1,
      },
      {
        id: 16,
        conlicitacao_id: 17942416,
        orgao_nome: "Secretaria de Agricultura do Mato Grosso",
        orgao_codigo: "UASG1014",
        orgao_cidade: "Cuiabá",
        orgao_uf: "MT",
        orgao_endereco: "Av. Getúlio Vargas, 320",
        orgao_telefone: "(65) 1616-1616",
        orgao_site: "www.agricultura.mt.gov.br",
        objeto: "Aquisição de sementes",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: null,
        datahora_retirada: "2025-08-12 16:00:00",
        datahora_visita: "2025-08-15 09:00:00",
        datahora_prazo: "2025-09-02 10:00:00",
        edital: "SAMT/814/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock16",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock16",
        processo: "140000.000014/2025-08",
        observacao: "Mock sementes",
        item: "Item agricultura",
        preco_edital: 3000.00,
        valor_estimado: 50000.00,
        boletim_id: 1,
      },
      {
        id: 17,
        conlicitacao_id: 17942417,
        orgao_nome: "Secretaria de Meio Ambiente do Mato Grosso do Sul",
        orgao_codigo: "UASG1015",
        orgao_cidade: "Campo Grande",
        orgao_uf: "MS",
        orgao_endereco: "Rua 14 de Julho, 210",
        orgao_telefone: "(67) 1717-1717",
        orgao_site: "www.meioambiente.ms.gov.br",
        objeto: "Serviços de reflorestamento",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: null,
        datahora_retirada: "2025-08-12 16:00:00",
        datahora_visita: "2025-08-15 09:00:00",
        datahora_prazo: "2025-09-03 15:30:00",
        edital: "SMAMS/815/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock17",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock17",
        processo: "150000.000015/2025-08",
        observacao: "Mock reflorestamento",
        item: "Item ambiental",
        preco_edital: 7000.00,
        valor_estimado: 150000.00,
        boletim_id: 1,
      }
      ,
      {
        id: 18,
        conlicitacao_id: 17942418,
        orgao_nome: "Secretaria de Educação do Rio de Janeiro",
        orgao_codigo: "UASG1016",
        orgao_cidade: "Rio de Janeiro",
        orgao_uf: "RJ",
        orgao_endereco: "Rua das Laranjeiras, 200",
        orgao_telefone: "(21) 1818-1818",
        orgao_site: "www.educacao.rj.gov.br",
        objeto: "Aquisição de material didático",
        situacao: "ABERTA",
        datahora_abertura: "2025-09-05 10:00:00",
        datahora_documento: "2025-09-01 09:00:00",
        datahora_retirada: "2025-09-03 16:00:00",
        datahora_visita: null,
        datahora_prazo: "2025-09-10 17:00:00",
        edital: "SERJ/816/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock18",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock18",
        processo: "160000.000016/2025-09",
        observacao: "Mock educação",
        item: "Item didático",
        preco_edital: 5000.00,
        valor_estimado: 80000.00,
        boletim_id: 1,
      },
      {
        id: 19,
        conlicitacao_id: 17942419,
        orgao_nome: "Prefeitura de Salvador",
        orgao_codigo: "UASG1017",
        orgao_cidade: "Salvador",
        orgao_uf: "BA",
        orgao_endereco: "Av. Sete de Setembro, 150",
        orgao_telefone: "(71) 1919-1919",
        orgao_site: "www.salvador.ba.gov.br",
        objeto: "Serviços de limpeza urbana",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: "2025-09-01 11:00:00",
        datahora_retirada: null,
        datahora_visita: "2025-09-06 09:00:00",
        datahora_prazo: "2025-09-12 12:00:00",
        edital: "PSAL/817/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock19",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock19",
        processo: "170000.000017/2025-09",
        observacao: "Mock limpeza",
        item: "Item limpeza",
        preco_edital: 7000.00,
        valor_estimado: 120000.00,
        boletim_id: 2,
      },
      {
        id: 20,
        conlicitacao_id: 17942420,
        orgao_nome: "Secretaria de Ciência e Tecnologia de Minas Gerais",
        orgao_codigo: "UASG1018",
        orgao_cidade: "Belo Horizonte",
        orgao_uf: "MG",
        orgao_endereco: "Av. Afonso Pena, 1200",
        orgao_telefone: "(31) 2020-2020",
        orgao_site: "www.ciencia.mg.gov.br",
        objeto: "Implementação de rede de fibra óptica",
        situacao: "ABERTA",
        datahora_abertura: "2025-09-07 09:00:00",
        datahora_documento: "2025-09-02 14:00:00",
        datahora_retirada: "2025-09-04 16:00:00",
        datahora_visita: null,
        datahora_prazo: "2025-09-15 18:00:00",
        edital: "SECTMG/818/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock20",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock20",
        processo: "180000.000018/2025-09",
        observacao: "Mock fibra",
        item: "Item tecnologia",
        preco_edital: 15000.00,
        valor_estimado: 450000.00,
        boletim_id: 3,
      },
      {
        id: 21,
        conlicitacao_id: 17942421,
        orgao_nome: "Prefeitura de Curitiba",
        orgao_codigo: "UASG1019",
        orgao_cidade: "Curitiba",
        orgao_uf: "PR",
        orgao_endereco: "Rua Barão do Rio Branco, 300",
        orgao_telefone: "(41) 2121-2121",
        orgao_site: "www.curitiba.pr.gov.br",
        objeto: "Aquisição de equipamentos de TI",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: "2025-09-03 09:30:00",
        datahora_retirada: "2025-09-05 16:00:00",
        datahora_visita: null,
        datahora_prazo: "2025-09-18 17:30:00",
        edital: "PCUR/819/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock21",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock21",
        processo: "190000.000019/2025-09",
        observacao: "Mock TI",
        item: "Item tecnologia",
        preco_edital: 8000.00,
        valor_estimado: 160000.00,
        boletim_id: 1,
      },
      {
        id: 22,
        conlicitacao_id: 17942422,
        orgao_nome: "Secretaria de Cultura do Rio Grande do Sul",
        orgao_codigo: "UASG1020",
        orgao_cidade: "Porto Alegre",
        orgao_uf: "RS",
        orgao_endereco: "Rua dos Andradas, 250",
        orgao_telefone: "(51) 2222-2222",
        orgao_site: "www.cultura.rs.gov.br",
        objeto: "Produção de eventos culturais",
        situacao: "ABERTA",
        datahora_abertura: "2025-09-08 11:00:00",
        datahora_documento: "2025-09-03 10:00:00",
        datahora_retirada: null,
        datahora_visita: null,
        datahora_prazo: "2025-09-20 16:00:00",
        edital: "SCRS/820/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock22",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock22",
        processo: "200000.000020/2025-09",
        observacao: "Mock cultura",
        item: "Item cultural",
        preco_edital: 6000.00,
        valor_estimado: 130000.00,
        boletim_id: 2,
      },
      {
        id: 23,
        conlicitacao_id: 17942423,
        orgao_nome: "Governo do Amazonas",
        orgao_codigo: "UASG1021",
        orgao_cidade: "Manaus",
        orgao_uf: "AM",
        orgao_endereco: "Av. Djalma Batista, 400",
        orgao_telefone: "(92) 2323-2323",
        orgao_site: "www.am.gov.br",
        objeto: "Aquisição de embarcações fluviais",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: "2025-09-04 13:00:00",
        datahora_retirada: "2025-09-06 16:00:00",
        datahora_visita: null,
        datahora_prazo: "2025-09-22 11:00:00",
        edital: "GAM/821/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock23",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock23",
        processo: "210000.000021/2025-09",
        observacao: "Mock embarcação",
        item: "Item transporte",
        preco_edital: 20000.00,
        valor_estimado: 500000.00,
        boletim_id: 3,
      },
      {
        id: 24,
        conlicitacao_id: 17942424,
        orgao_nome: "Secretaria de Turismo de Alagoas",
        orgao_codigo: "UASG1022",
        orgao_cidade: "Maceió",
        orgao_uf: "AL",
        orgao_endereco: "Pajuçara, 100",
        orgao_telefone: "(82) 2424-2424",
        orgao_site: "www.turismo.al.gov.br",
        objeto: "Serviços de promoção turística",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: "2025-09-04 15:00:00",
        datahora_retirada: null,
        datahora_visita: null,
        datahora_prazo: "2025-09-25 17:00:00",
        edital: "STAL/822/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock24",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock24",
        processo: "220000.000022/2025-09",
        observacao: "Mock turismo",
        item: "Item turismo",
        preco_edital: 4000.00,
        valor_estimado: 90000.00,
        boletim_id: 1,
      },
      {
        id: 25,
        conlicitacao_id: 17942425,
        orgao_nome: "Prefeitura de Natal",
        orgao_codigo: "UASG1023",
        orgao_cidade: "Natal",
        orgao_uf: "RN",
        orgao_endereco: "Av. Prudente de Morais, 250",
        orgao_telefone: "(84) 2525-2525",
        orgao_site: "www.natal.rn.gov.br",
        objeto: "Reforma de escolas municipais",
        situacao: "ABERTA",
        datahora_abertura: "2025-09-09 08:30:00",
        datahora_documento: "2025-09-05 10:15:00",
        datahora_retirada: "2025-09-07 16:00:00",
        datahora_visita: null,
        datahora_prazo: "2025-09-28 17:00:00",
        edital: "PNAT/823/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock25",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock25",
        processo: "230000.000023/2025-09",
        observacao: "Mock reforma",
        item: "Item obras",
        preco_edital: 10000.00,
        valor_estimado: 300000.00,
        boletim_id: 2,
      },
      {
        id: 26,
        conlicitacao_id: 17942426,
        orgao_nome: "Secretaria de Transportes do Pará",
        orgao_codigo: "UASG1024",
        orgao_cidade: "Belém",
        orgao_uf: "PA",
        orgao_endereco: "Av. João Paulo II, 600",
        orgao_telefone: "(91) 2626-2626",
        orgao_site: "www.transportes.pa.gov.br",
        objeto: "Aquisição de ônibus urbanos",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: "2025-09-05 11:30:00",
        datahora_retirada: null,
        datahora_visita: null,
        datahora_prazo: "2025-09-30 12:00:00",
        edital: "SETRPA/824/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock26",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock26",
        processo: "240000.000024/2025-09",
        observacao: "Mock ônibus",
        item: "Item transporte",
        preco_edital: 22000.00,
        valor_estimado: 650000.00,
        boletim_id: 3,
      },
      {
        id: 27,
        conlicitacao_id: 17942427,
        orgao_nome: "Governo da Bahia",
        orgao_codigo: "UASG1025",
        orgao_cidade: "Salvador",
        orgao_uf: "BA",
        orgao_endereco: "Centro Administrativo da Bahia",
        orgao_telefone: "(71) 2727-2727",
        orgao_site: "www.ba.gov.br",
        objeto: "Serviços de saneamento básico",
        situacao: "ABERTA",
        datahora_abertura: "2025-09-10 09:00:00",
        datahora_documento: "2025-09-06 09:00:00",
        datahora_retirada: "2025-09-09 16:00:00",
        datahora_visita: null,
        datahora_prazo: "2025-10-03 18:00:00",
        edital: "GBA/825/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock27",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock27",
        processo: "250000.000025/2025-09",
        observacao: "Mock saneamento",
        item: "Item infraestrutura",
        preco_edital: 18000.00,
        valor_estimado: 700000.00,
        boletim_id: 1,
      }
    ];
    
    licitacoesTeste.forEach(licitacao => {
      newCache.set(licitacao.id, licitacao as any);
    });
    
    try {
      // Tentar buscar dados reais da API (se IP autorizado)
      const filtros = await this.getFiltros();
      
      for (const filtro of filtros) {
        try {
          // Buscar TODOS os boletins do filtro para garantir cobertura completa
          console.log(`🔍 Carregando todos os boletins do filtro ${filtro.id}...`);
          let page = 1;
          let totalLoaded = 0;
          let hasMoreBoletins = true;
          
          while (hasMoreBoletins) {
            const boletinsResponse = await this.getBoletins(filtro.id, page, 50);
            console.log(`📄 Página ${page}: ${boletinsResponse.boletins.length} boletins encontrados`);
            
            if (boletinsResponse.boletins.length === 0) {
              hasMoreBoletins = false;
              break;
            }
            
            for (const boletim of boletinsResponse.boletins) {
              try {
                // Buscar licitações de cada boletim e adicionar ao cache
                console.log(`📥 Carregando licitações do boletim ${boletim.id}...`);
                const boletimData = await conLicitacaoAPI.getBoletimData(boletim.id);
                
                if (boletimData.licitacoes) {
                  boletimData.licitacoes.forEach((licitacao: any) => {
                    const transformedLicitacao = this.transformLicitacaoFromAPI(licitacao, boletim.id, 'api');
                    newCache.set(transformedLicitacao.id, transformedLicitacao);
                  });
                }
              } catch (error) {
                console.log(`⚠️ Erro ao carregar boletim ${boletim.id}, continuando...`);
              }
            }
            
            totalLoaded += boletinsResponse.boletins.length;
            page++;
            
            // Evitar loop infinito - se encontramos menos boletins que o esperado, provavelmente chegamos ao fim
            if (boletinsResponse.boletins.length < 50) {
              hasMoreBoletins = false;
            }
            
            // Limite de segurança para evitar carregar dados excessivos
            if (totalLoaded >= 500) {
              console.log(`⚠️ Limite de ${totalLoaded} boletins atingido para filtro ${filtro.id}`);
              hasMoreBoletins = false;
            }
          }
          
          console.log(`✅ Carregados ${totalLoaded} boletins do filtro ${filtro.id}`);
        } catch (error) {
          console.log(`⚠️ Erro ao processar filtro ${filtro.id}, continuando...`);
        }
      }

      
      this.lastCacheUpdate = Date.now();
      this.cachedBiddings = newCache;
      console.log(`✅ Pré-carregamento concluído: ${this.cachedBiddings.size} licitações disponíveis para busca`);
      
    } catch (error: any) {
      console.log('🚫 Usando dados de teste - IP não autorizado para API real');
      this.cachedBiddings = newCache;
    }
    
    // Garantir que sempre tenha dados no cache
    this.lastCacheUpdate = Date.now();
  }

  // Carregamento mínimo apenas para demonstração
  private async loadMinimalSampleData(): Promise<void> {
    // Desativado: não carregar mocks; usar apenas dados reais
    return;
  }

  // Carregamento inicial rápido - apenas boletins mais recentes
  private async loadInitialBiddings(): Promise<void> {
    this.cachedBiddings = new Map<number, any>();
    // Dados de teste primeiro
    const licitacoesTeste: Bidding[] = [
      {
        id: 1,
        conlicitacao_id: 17942339,
        orgao_nome: "Fundação de Apoio ao Ensino, Pesquisa, Extensão e Interiorização do IFAM- FAEPI",
        orgao_codigo: "UASG123",
        orgao_cidade: "Manaus",
        orgao_uf: "AM",
        orgao_endereco: "Endereço teste",
        orgao_telefone: "(92) 1234-5678",
        orgao_site: "www.teste.gov.br",
        objeto: "Produto/Serviço Quant. Unidade Produto/Serviço: Serviço de apoio logístico para evento",
        situacao: "URGENTE",
        datahora_abertura: "2025-07-15 09:00:00",
        datahora_documento: "2025-07-10 14:30:00",
        datahora_retirada: "2025-07-12 16:00:00",
        datahora_visita: null,
        datahora_prazo: "2025-07-20 17:00:00",
        edital: "SM/715/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=teste1",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=teste1",
        processo: "23456.789012/2025-01",
        observacao: "Observação teste",
        item: "Item teste",
        preco_edital: 50000.00,
        valor_estimado: 50000.00,
        boletim_id: 1,
      },
      {
        id: 2,
        conlicitacao_id: 17942355,
        orgao_nome: "Fundação de Apoio ao Ensino, Pesquisa, Extensão e Interiorização do IFAM- FAEPI",
        orgao_codigo: "UASG456",
        orgao_cidade: "Manaus",
        orgao_uf: "AM",
        orgao_endereco: "Endereço teste 2",
        orgao_telefone: "(92) 9876-5432",
        orgao_site: "www.teste2.gov.br",
        objeto: "Produto/Serviço Quant. Unidade Produto/Serviço: Iogurte zero açúcar",
        situacao: "URGENTE",
        datahora_abertura: "2025-07-17 07:59:00",
        datahora_documento: null,
        datahora_retirada: null,
        datahora_visita: "2025-07-16 10:30:00",
        datahora_prazo: "",
        edital: "SM/711/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=teste2",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=teste2",
        processo: "98765.432109/2025-02",
        observacao: "Observação teste 2",
        item: "Item teste 2",
        preco_edital: 25000.00,
        valor_estimado: 25000.00,
        boletim_id: 1,
      },
      {
        id: 3,
        conlicitacao_id: 17942403,
        orgao_nome: "Secretaria de Saúde de São Paulo",
        orgao_codigo: "UASG1001",
        orgao_cidade: "São Paulo",
        orgao_uf: "SP",
        orgao_endereco: "Av. Paulista, 1000",
        orgao_telefone: "(11) 1111-1111",
        orgao_site: "www.saude.sp.gov.br",
        objeto: "Aquisição de material hospitalar",
        situacao: "ABERTA",
        datahora_abertura: "2025-08-01 10:00:00",
        datahora_documento: "2025-07-28 09:00:00",
        datahora_retirada: "2025-07-30 16:00:00",
        datahora_visita: null,
        datahora_prazo: "2025-08-05 17:00:00",
        edital: "SS/801/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock3",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock3",
        processo: "10000.000001/2025-08",
        observacao: "Mock teste",
        item: "Item saúde",
        preco_edital: 10000.00,
        valor_estimado: 120000.00,
        boletim_id: 1,
      },
      {
        id: 4,
        conlicitacao_id: 17942404,
        orgao_nome: "Prefeitura do Rio de Janeiro",
        orgao_codigo: "UASG1002",
        orgao_cidade: "Rio de Janeiro",
        orgao_uf: "RJ",
        orgao_endereco: "Rua das Laranjeiras, 50",
        orgao_telefone: "(21) 2222-2222",
        orgao_site: "www.rio.rj.gov.br",
        objeto: "Serviços de manutenção de vias",
        situacao: "ABERTA",
        datahora_abertura: "2025-08-01 10:00:00",
        datahora_documento: "2025-07-29 10:00:00",
        datahora_retirada: null,
        datahora_visita: null,
        datahora_prazo: "2025-08-05 17:00:00",
        edital: "PRJ/802/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock4",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock4",
        processo: "20000.000002/2025-08",
        observacao: "Mock manutenção",
        item: "Item manutenção",
        preco_edital: 15000.00,
        valor_estimado: 300000.00,
        boletim_id: 1,
      },
      {
        id: 5,
        conlicitacao_id: 17942405,
        orgao_nome: "Secretaria de Educação de Minas Gerais",
        orgao_codigo: "UASG1003",
        orgao_cidade: "Belo Horizonte",
        orgao_uf: "MG",
        orgao_endereco: "Praça da Liberdade, 10",
        orgao_telefone: "(31) 3333-3333",
        orgao_site: "www.educacao.mg.gov.br",
        objeto: "Compra de mobiliário escolar",
        situacao: "ABERTA",
        datahora_abertura: "2025-08-01 10:00:00",
        datahora_documento: null,
        datahora_retirada: "2025-07-31 15:00:00",
        datahora_visita: null,
        datahora_prazo: "2025-08-05 17:00:00",
        edital: "SEMG/803/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock5",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock5",
        processo: "30000.000003/2025-08",
        observacao: "Mock mobiliário",
        item: "Item escolar",
        preco_edital: 8000.00,
        valor_estimado: 180000.00,
        boletim_id: 1,
      },
      {
        id: 6,
        conlicitacao_id: 17942406,
        orgao_nome: "Secretaria de Administração da Bahia",
        orgao_codigo: "UASG1004",
        orgao_cidade: "Salvador",
        orgao_uf: "BA",
        orgao_endereco: "Av. Sete de Setembro, 700",
        orgao_telefone: "(71) 4444-4444",
        orgao_site: "www.adm.ba.gov.br",
        objeto: "Contratação de serviços de limpeza",
        situacao: "ABERTA",
        datahora_abertura: "2025-08-01 10:00:00",
        datahora_documento: "2025-07-28 08:00:00",
        datahora_retirada: null,
        datahora_visita: null,
        datahora_prazo: "2025-08-05 17:00:00",
        edital: "SAB/804/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock6",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock6",
        processo: "40000.000004/2025-08",
        observacao: "Mock limpeza",
        item: "Item limpeza",
        preco_edital: 5000.00,
        valor_estimado: 100000.00,
        boletim_id: 1,
      },
      {
        id: 7,
        conlicitacao_id: 17942407,
        orgao_nome: "Secretaria de Obras do Rio Grande do Sul",
        orgao_codigo: "UASG1005",
        orgao_cidade: "Porto Alegre",
        orgao_uf: "RS",
        orgao_endereco: "Rua dos Andradas, 123",
        orgao_telefone: "(51) 5555-5555",
        orgao_site: "www.obras.rs.gov.br",
        objeto: "Serviços de pavimentação",
        situacao: "ABERTA",
        datahora_abertura: "2025-08-01 10:00:00",
        datahora_documento: null,
        datahora_retirada: null,
        datahora_visita: null,
        datahora_prazo: "2025-08-05 17:00:00",
        edital: "SORS/805/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock7",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock7",
        processo: "50000.000005/2025-08",
        observacao: "Mock pavimentação",
        item: "Item obras",
        preco_edital: 20000.00,
        valor_estimado: 500000.00,
        boletim_id: 1,
      },
      {
        id: 8,
        conlicitacao_id: 17942408,
        orgao_nome: "Secretaria de Turismo do Paraná",
        orgao_codigo: "UASG1006",
        orgao_cidade: "Curitiba",
        orgao_uf: "PR",
        orgao_endereco: "Rua XV de Novembro, 200",
        orgao_telefone: "(41) 6666-6666",
        orgao_site: "www.turismo.pr.gov.br",
        objeto: "Serviços de organização de eventos",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: "2025-08-10 14:00:00",
        datahora_retirada: null,
        datahora_visita: null,
        datahora_prazo: "2025-08-18 17:00:00",
        edital: "STPR/806/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock8",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock8",
        processo: "60000.000006/2025-08",
        observacao: "Mock eventos",
        item: "Item turismo",
        preco_edital: 7000.00,
        valor_estimado: 160000.00,
        boletim_id: 1,
      },
      {
        id: 9,
        conlicitacao_id: 17942409,
        orgao_nome: "Secretaria de Esportes de Santa Catarina",
        orgao_codigo: "UASG1007",
        orgao_cidade: "Florianópolis",
        orgao_uf: "SC",
        orgao_endereco: "Av. Beira-Mar, 400",
        orgao_telefone: "(48) 7777-7777",
        orgao_site: "www.esportes.sc.gov.br",
        objeto: "Compra de equipamentos esportivos",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: "2025-08-10 14:00:00",
        datahora_retirada: "2025-08-12 16:00:00",
        datahora_visita: null,
        datahora_prazo: "2025-08-19 12:00:00",
        edital: "SESC/807/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock9",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock9",
        processo: "70000.000007/2025-08",
        observacao: "Mock esportes",
        item: "Item esportivo",
        preco_edital: 6000.00,
        valor_estimado: 90000.00,
        boletim_id: 1,
      },
      {
        id: 10,
        conlicitacao_id: 17942410,
        orgao_nome: "Governo de Pernambuco",
        orgao_codigo: "UASG1008",
        orgao_cidade: "Recife",
        orgao_uf: "PE",
        orgao_endereco: "Rua da Aurora, 123",
        orgao_telefone: "(81) 8888-8888",
        orgao_site: "www.pe.gov.br",
        objeto: "Serviços de publicidade institucional",
        situacao: "ABERTA",
        datahora_abertura: "",
        datahora_documento: "2025-08-10 14:00:00",
        datahora_retirada: null,
        datahora_visita: null,
        datahora_prazo: "2025-08-25 17:00:00",
        edital: "GPE/808/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock10",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock10",
        processo: "80000.000008/2025-08",
        observacao: "Mock publicidade",
        item: "Item publicidade",
        preco_edital: 12000.00,
        valor_estimado: 250000.00,
        boletim_id: 1,
      },
      {
        id: 11,
        conlicitacao_id: 17942411,
        orgao_nome: "Prefeitura de Fortaleza",
        orgao_codigo: "UASG1009",
        orgao_cidade: "Fortaleza",
        orgao_uf: "CE",
        orgao_endereco: "Av. Dom Luís, 90",
        orgao_telefone: "(85) 9999-9999",
        orgao_site: "www.fortaleza.ce.gov.br",
        objeto: "Fornecimento de alimentação escolar",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: "2025-08-10 14:00:00",
        datahora_retirada: null,
        datahora_visita: "",
        datahora_prazo: "2025-08-22 11:00:00",
        edital: "PFF/809/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock11",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock11",
        processo: "90000.000009/2025-08",
        observacao: "Mock alimentação",
        item: "Item merenda",
        preco_edital: 9000.00,
        valor_estimado: 140000.00,
        boletim_id: 1,
      },
      {
        id: 12,
        conlicitacao_id: 17942412,
        orgao_nome: "Governo do Distrito Federal",
        orgao_codigo: "UASG1010",
        orgao_cidade: "Brasília",
        orgao_uf: "DF",
        orgao_endereco: "Esplanada dos Ministérios",
        orgao_telefone: "(61) 1010-1010",
        orgao_site: "www.df.gov.br",
        objeto: "Locação de veículos",
        situacao: "ABERTA",
        datahora_abertura: "",
        datahora_documento: "2025-08-10 14:00:00",
        datahora_retirada: "",
        datahora_visita: null,
        datahora_prazo: "2025-08-28 18:00:00",
        edital: "GDF/810/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock12",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock12",
        processo: "100000.000010/2025-08",
        observacao: "Mock locação",
        item: "Item frota",
        preco_edital: 11000.00,
        valor_estimado: 320000.00,
        boletim_id: 1,
      },
      {
        id: 13,
        conlicitacao_id: 17942413,
        orgao_nome: "Secretaria de Infraestrutura do Pará",
        orgao_codigo: "UASG1011",
        orgao_cidade: "Belém",
        orgao_uf: "PA",
        orgao_endereco: "Av. Nazaré, 50",
        orgao_telefone: "(91) 1313-1313",
        orgao_site: "www.infra.pa.gov.br",
        objeto: "Construção de ponte",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: null,
        datahora_retirada: "2025-08-12 16:00:00",
        datahora_visita: "2025-08-15 09:00:00",
        datahora_prazo: "2025-08-30 17:00:00",
        edital: "SIPA/811/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock13",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock13",
        processo: "110000.000011/2025-08",
        observacao: "Mock ponte",
        item: "Item obra",
        preco_edital: 25000.00,
        valor_estimado: 1000000.00,
        boletim_id: 1,
      },
      {
        id: 14,
        conlicitacao_id: 17942414,
        orgao_nome: "Prefeitura de Goiânia",
        orgao_codigo: "UASG1012",
        orgao_cidade: "Goiânia",
        orgao_uf: "GO",
        orgao_endereco: "Av. T-63, 120",
        orgao_telefone: "(62) 1414-1414",
        orgao_site: "www.goiania.go.gov.br",
        objeto: "Manutenção de praças",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: null,
        datahora_retirada: "2025-08-12 16:00:00",
        datahora_visita: "2025-08-15 09:00:00",
        datahora_prazo: "2025-08-27 09:00:00",
        edital: "PGO/812/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock14",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock14",
        processo: "120000.000012/2025-08",
        observacao: "Mock praças",
        item: "Item urbano",
        preco_edital: 4000.00,
        valor_estimado: 85000.00,
        boletim_id: 1,
      },
      {
        id: 15,
        conlicitacao_id: 17942415,
        orgao_nome: "Secretaria de Segurança do Espírito Santo",
        orgao_codigo: "UASG1013",
        orgao_cidade: "Vitória",
        orgao_uf: "ES",
        orgao_endereco: "Av. Vitória, 500",
        orgao_telefone: "(27) 1515-1515",
        orgao_site: "www.seguranca.es.gov.br",
        objeto: "Compra de viaturas",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: null,
        datahora_retirada: "2025-08-12 16:00:00",
        datahora_visita: "2025-08-15 09:00:00",
        datahora_prazo: "2025-08-29 17:00:00",
        edital: "SEES/813/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock15",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock15",
        processo: "130000.000013/2025-08",
        observacao: "Mock viaturas",
        item: "Item segurança",
        preco_edital: 18000.00,
        valor_estimado: 600000.00,
        boletim_id: 1,
      },
      {
        id: 16,
        conlicitacao_id: 17942416,
        orgao_nome: "Secretaria de Agricultura do Mato Grosso",
        orgao_codigo: "UASG1014",
        orgao_cidade: "Cuiabá",
        orgao_uf: "MT",
        orgao_endereco: "Av. Getúlio Vargas, 320",
        orgao_telefone: "(65) 1616-1616",
        orgao_site: "www.agricultura.mt.gov.br",
        objeto: "Aquisição de sementes",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: null,
        datahora_retirada: "2025-08-12 16:00:00",
        datahora_visita: "2025-08-15 09:00:00",
        datahora_prazo: "2025-09-02 10:00:00",
        edital: "SAMT/814/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock16",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock16",
        processo: "140000.000014/2025-08",
        observacao: "Mock sementes",
        item: "Item agricultura",
        preco_edital: 3000.00,
        valor_estimado: 50000.00,
        boletim_id: 1,
      },
      {
        id: 17,
        conlicitacao_id: 17942417,
        orgao_nome: "Secretaria de Meio Ambiente do Mato Grosso do Sul",
        orgao_codigo: "UASG1015",
        orgao_cidade: "Campo Grande",
        orgao_uf: "MS",
        orgao_endereco: "Rua 14 de Julho, 210",
        orgao_telefone: "(67) 1717-1717",
        orgao_site: "www.meioambiente.ms.gov.br",
        objeto: "Serviços de reflorestamento",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: null,
        datahora_retirada: "2025-08-12 16:00:00",
        datahora_visita: "2025-08-15 09:00:00",
        datahora_prazo: "2025-09-03 15:30:00",
        edital: "SMAMS/815/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock17",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock17",
        processo: "150000.000015/2025-08",
        observacao: "Mock reflorestamento",
        item: "Item ambiental",
        preco_edital: 7000.00,
        valor_estimado: 150000.00,
        boletim_id: 1,
      }
      ,
      {
        id: 18,
        conlicitacao_id: 17942418,
        orgao_nome: "Secretaria de Educação do Rio de Janeiro",
        orgao_codigo: "UASG1016",
        orgao_cidade: "Rio de Janeiro",
        orgao_uf: "RJ",
        orgao_endereco: "Rua das Laranjeiras, 200",
        orgao_telefone: "(21) 1818-1818",
        orgao_site: "www.educacao.rj.gov.br",
        objeto: "Aquisição de material didático",
        situacao: "ABERTA",
        datahora_abertura: "2025-09-05 10:00:00",
        datahora_documento: "2025-09-01 09:00:00",
        datahora_retirada: "2025-09-03 16:00:00",
        datahora_visita: null,
        datahora_prazo: "2025-09-10 17:00:00",
        edital: "SERJ/816/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock18",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock18",
        processo: "160000.000016/2025-09",
        observacao: "Mock educação",
        item: "Item didático",
        preco_edital: 5000.00,
        valor_estimado: 80000.00,
        boletim_id: 1,
      },
      {
        id: 19,
        conlicitacao_id: 17942419,
        orgao_nome: "Prefeitura de Salvador",
        orgao_codigo: "UASG1017",
        orgao_cidade: "Salvador",
        orgao_uf: "BA",
        orgao_endereco: "Av. Sete de Setembro, 150",
        orgao_telefone: "(71) 1919-1919",
        orgao_site: "www.salvador.ba.gov.br",
        objeto: "Serviços de limpeza urbana",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: "2025-09-01 11:00:00",
        datahora_retirada: null,
        datahora_visita: "2025-09-06 09:00:00",
        datahora_prazo: "2025-09-12 12:00:00",
        edital: "PSAL/817/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock19",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock19",
        processo: "170000.000017/2025-09",
        observacao: "Mock limpeza",
        item: "Item limpeza",
        preco_edital: 7000.00,
        valor_estimado: 120000.00,
        boletim_id: 2,
      },
      {
        id: 20,
        conlicitacao_id: 17942420,
        orgao_nome: "Secretaria de Ciência e Tecnologia de Minas Gerais",
        orgao_codigo: "UASG1018",
        orgao_cidade: "Belo Horizonte",
        orgao_uf: "MG",
        orgao_endereco: "Av. Afonso Pena, 1200",
        orgao_telefone: "(31) 2020-2020",
        orgao_site: "www.ciencia.mg.gov.br",
        objeto: "Implementação de rede de fibra óptica",
        situacao: "ABERTA",
        datahora_abertura: "2025-09-07 09:00:00",
        datahora_documento: "2025-09-02 14:00:00",
        datahora_retirada: "2025-09-04 16:00:00",
        datahora_visita: null,
        datahora_prazo: "2025-09-15 18:00:00",
        edital: "SECTMG/818/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock20",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock20",
        processo: "180000.000018/2025-09",
        observacao: "Mock fibra",
        item: "Item tecnologia",
        preco_edital: 15000.00,
        valor_estimado: 450000.00,
        boletim_id: 3,
      },
      {
        id: 21,
        conlicitacao_id: 17942421,
        orgao_nome: "Prefeitura de Curitiba",
        orgao_codigo: "UASG1019",
        orgao_cidade: "Curitiba",
        orgao_uf: "PR",
        orgao_endereco: "Rua Barão do Rio Branco, 300",
        orgao_telefone: "(41) 2121-2121",
        orgao_site: "www.curitiba.pr.gov.br",
        objeto: "Aquisição de equipamentos de TI",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: "2025-09-03 09:30:00",
        datahora_retirada: "2025-09-05 16:00:00",
        datahora_visita: null,
        datahora_prazo: "2025-09-18 17:30:00",
        edital: "PCUR/819/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock21",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock21",
        processo: "190000.000019/2025-09",
        observacao: "Mock TI",
        item: "Item tecnologia",
        preco_edital: 8000.00,
        valor_estimado: 160000.00,
        boletim_id: 1,
      },
      {
        id: 22,
        conlicitacao_id: 17942422,
        orgao_nome: "Secretaria de Cultura do Rio Grande do Sul",
        orgao_codigo: "UASG1020",
        orgao_cidade: "Porto Alegre",
        orgao_uf: "RS",
        orgao_endereco: "Rua dos Andradas, 250",
        orgao_telefone: "(51) 2222-2222",
        orgao_site: "www.cultura.rs.gov.br",
        objeto: "Produção de eventos culturais",
        situacao: "ABERTA",
        datahora_abertura: "2025-09-08 11:00:00",
        datahora_documento: "2025-09-03 10:00:00",
        datahora_retirada: null,
        datahora_visita: null,
        datahora_prazo: "2025-09-20 16:00:00",
        edital: "SCRS/820/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock22",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock22",
        processo: "200000.000020/2025-09",
        observacao: "Mock cultura",
        item: "Item cultural",
        preco_edital: 6000.00,
        valor_estimado: 130000.00,
        boletim_id: 2,
      },
      {
        id: 23,
        conlicitacao_id: 17942423,
        orgao_nome: "Governo do Amazonas",
        orgao_codigo: "UASG1021",
        orgao_cidade: "Manaus",
        orgao_uf: "AM",
        orgao_endereco: "Av. Djalma Batista, 400",
        orgao_telefone: "(92) 2323-2323",
        orgao_site: "www.am.gov.br",
        objeto: "Aquisição de embarcações fluviais",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: "2025-09-04 13:00:00",
        datahora_retirada: "2025-09-06 16:00:00",
        datahora_visita: null,
        datahora_prazo: "2025-09-22 11:00:00",
        edital: "GAM/821/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock23",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock23",
        processo: "210000.000021/2025-09",
        observacao: "Mock embarcação",
        item: "Item transporte",
        preco_edital: 20000.00,
        valor_estimado: 500000.00,
        boletim_id: 3,
      },
      {
        id: 24,
        conlicitacao_id: 17942424,
        orgao_nome: "Secretaria de Turismo de Alagoas",
        orgao_codigo: "UASG1022",
        orgao_cidade: "Maceió",
        orgao_uf: "AL",
        orgao_endereco: "Pajuçara, 100",
        orgao_telefone: "(82) 2424-2424",
        orgao_site: "www.turismo.al.gov.br",
        objeto: "Serviços de promoção turística",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: "2025-09-04 15:00:00",
        datahora_retirada: null,
        datahora_visita: null,
        datahora_prazo: "2025-09-25 17:00:00",
        edital: "STAL/822/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock24",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock24",
        processo: "220000.000022/2025-09",
        observacao: "Mock turismo",
        item: "Item turismo",
        preco_edital: 4000.00,
        valor_estimado: 90000.00,
        boletim_id: 1,
      },
      {
        id: 25,
        conlicitacao_id: 17942425,
        orgao_nome: "Prefeitura de Natal",
        orgao_codigo: "UASG1023",
        orgao_cidade: "Natal",
        orgao_uf: "RN",
        orgao_endereco: "Av. Prudente de Morais, 250",
        orgao_telefone: "(84) 2525-2525",
        orgao_site: "www.natal.rn.gov.br",
        objeto: "Reforma de escolas municipais",
        situacao: "ABERTA",
        datahora_abertura: "2025-09-09 08:30:00",
        datahora_documento: "2025-09-05 10:15:00",
        datahora_retirada: "2025-09-07 16:00:00",
        datahora_visita: null,
        datahora_prazo: "2025-09-28 17:00:00",
        edital: "PNAT/823/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock25",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock25",
        processo: "230000.000023/2025-09",
        observacao: "Mock reforma",
        item: "Item obras",
        preco_edital: 10000.00,
        valor_estimado: 300000.00,
        boletim_id: 2,
      },
      {
        id: 26,
        conlicitacao_id: 17942426,
        orgao_nome: "Secretaria de Transportes do Pará",
        orgao_codigo: "UASG1024",
        orgao_cidade: "Belém",
        orgao_uf: "PA",
        orgao_endereco: "Av. João Paulo II, 600",
        orgao_telefone: "(91) 2626-2626",
        orgao_site: "www.transportes.pa.gov.br",
        objeto: "Aquisição de ônibus urbanos",
        situacao: "ABERTA",
        datahora_abertura: null,
        datahora_documento: "2025-09-05 11:30:00",
        datahora_retirada: null,
        datahora_visita: null,
        datahora_prazo: "2025-09-30 12:00:00",
        edital: "SETRPA/824/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock26",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock26",
        processo: "240000.000024/2025-09",
        observacao: "Mock ônibus",
        item: "Item transporte",
        preco_edital: 22000.00,
        valor_estimado: 650000.00,
        boletim_id: 3,
      },
      {
        id: 27,
        conlicitacao_id: 17942427,
        orgao_nome: "Governo da Bahia",
        orgao_codigo: "UASG1025",
        orgao_cidade: "Salvador",
        orgao_uf: "BA",
        orgao_endereco: "Centro Administrativo da Bahia",
        orgao_telefone: "(71) 2727-2727",
        orgao_site: "www.ba.gov.br",
        objeto: "Serviços de saneamento básico",
        situacao: "ABERTA",
        datahora_abertura: "2025-09-10 09:00:00",
        datahora_documento: "2025-09-06 09:00:00",
        datahora_retirada: "2025-09-09 16:00:00",
        datahora_visita: null,
        datahora_prazo: "2025-10-03 18:00:00",
        edital: "GBA/825/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock27",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=mock27",
        processo: "250000.000025/2025-09",
        observacao: "Mock saneamento",
        item: "Item infraestrutura",
        preco_edital: 18000.00,
        valor_estimado: 700000.00,
        boletim_id: 1,
      }
    ];
    
    // Adicionar dados de teste ao cache
    licitacoesTeste.forEach(licitacao => {
      this.cachedBiddings.set(licitacao.id, licitacao);
    });

    try {
      // Carregamento rápido: apenas os 3 boletins mais recentes
      const filtros = await this.getFiltros();
      
      for (const filtro of filtros) {
        try {
          console.log(`⚡ Carregamento rápido: primeiros boletins do filtro ${filtro.id}`);
          const boletinsResponse = await this.getBoletins(filtro.id, 1, 3);
          
          for (const boletim of boletinsResponse.boletins) {
            try {
              const boletimData = await conLicitacaoAPI.getBoletimData(boletim.id);
              
              if (boletimData.licitacoes) {
                boletimData.licitacoes.forEach((licitacao: any) => {
                  const transformedLicitacao = this.transformLicitacaoFromAPI(licitacao, boletim.id, 'api');
                  this.cachedBiddings.set(transformedLicitacao.id, transformedLicitacao);
                });
              }
            } catch (error) {
              console.log(`⚠️ Erro ao carregar boletim ${boletim.id} (carregamento rápido)`);
            }
          }
        } catch (error) {
          console.log(`⚠️ Erro no carregamento rápido do filtro ${filtro.id}`);
        }
      }
      
      console.log(`⚡ Carregamento inicial concluído: ${this.cachedBiddings.size} licitações carregadas`);
      
    } catch (error) {
      console.log('⚡ Usando dados de teste para carregamento inicial');
    }
    
    this.lastCacheUpdate = Date.now();
  }

  // Carregamento completo em background
  private async loadAllBiddingsInBackground(): Promise<void> {
    if (this.backgroundLoadingInProgress || this.fullLoadCompleted) {
      return;
    }
    
    this.backgroundLoadingInProgress = true;
    console.log('🔄 Iniciando carregamento completo em background...');
    
    try {
      await this.refreshBiddingsCache();
      this.fullLoadCompleted = true;
      console.log('✅ Carregamento completo em background finalizado');
    } catch (error) {
      console.log('⚠️ Erro no carregamento em background:', error);
    } finally {
      this.backgroundLoadingInProgress = false;
    }
  }

  // Nova função específica para busca por número de controle
  private async searchByControlNumber(numeroControle: string): Promise<Bidding[]> {
    console.log(`🎯 [DEBUG] Iniciando busca por número de controle: ${numeroControle}`);
    console.log(`📊 [DEBUG] Cache atual contém ${this.cachedBiddings.size} licitações`);
    
    // Primeiro verificar no cache
    let biddings = Array.from(this.cachedBiddings.values()).filter(b => 
      b.conlicitacao_id?.toString().includes(numeroControle) ||
      b.orgao_codigo?.toLowerCase().includes(numeroControle.toLowerCase()) ||
      b.processo?.toLowerCase().includes(numeroControle.toLowerCase()) ||
      b.edital?.toLowerCase().includes(numeroControle.toLowerCase())
    );
    
    if (biddings.length > 0) {
      console.log(`✅ [DEBUG] Encontrado no cache: ${biddings.length} licitações`);
      // Log das fontes dos dados encontrados
      const sourcesFound = biddings.reduce((acc, b) => {
        acc[b.dataSource] = (acc[b.dataSource] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`📈 [DEBUG] Fontes dos dados encontrados:`, sourcesFound);
      return biddings;
    }
    
    console.log(`🔍 [DEBUG] Não encontrado no cache, iniciando busca específica...`);
    // Se não encontrou no cache, fazer busca específica
    await this.searchSpecificBidding(numeroControle);
    
    // Tentar novamente após busca específica
    biddings = Array.from(this.cachedBiddings.values()).filter(b => 
      b.conlicitacao_id?.toString().includes(numeroControle) ||
      b.orgao_codigo?.toLowerCase().includes(numeroControle.toLowerCase()) ||
      b.processo?.toLowerCase().includes(numeroControle.toLowerCase()) ||
      b.edital?.toLowerCase().includes(numeroControle.toLowerCase())
    );
    
    console.log(`✅ [DEBUG] Busca específica finalizada: ${biddings.length} licitações encontradas`);
    if (biddings.length > 0) {
      const sourcesFound = biddings.reduce((acc, b) => {
        acc[b.dataSource] = (acc[b.dataSource] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`📈 [DEBUG] Fontes dos dados encontrados após busca:`, sourcesFound);
    }
    return biddings;
  }

  // Busca específica COMPLETA para número de controle não encontrado
  private async searchSpecificBidding(numeroControle: string): Promise<void> {
    try {
      console.log(`🔍 Busca específica COMPLETA para: ${numeroControle}`);
      const filtros = await this.getFiltros();
      let totalBuscados = 0;
      let encontrou = false;
      
      // Buscar em TODOS os boletins até encontrar ou esgotar possibilidades
      for (const filtro of filtros) {
        try {
          // Pegar informação total de boletins
          const boletinsResponse = await this.getBoletins(filtro.id, 1, 100);
          console.log(`📊 Filtro ${filtro.id}: ${boletinsResponse.total} boletins disponíveis`);
          
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
                  const boletimData = await this.getCachedBoletimData(boletim.id);
                  totalBuscados++;
                  if (boletimData.licitacoes) {
                    const matching = boletimData.licitacoes.filter((licitacao: any) => 
                      licitacao.id?.toString().includes(numeroControle) ||
                      licitacao.orgao?.codigo?.toLowerCase().includes(numeroControle.toLowerCase()) ||
                      licitacao.processo?.toLowerCase().includes(numeroControle.toLowerCase()) ||
                      licitacao.edital?.toLowerCase().includes(numeroControle.toLowerCase())
                    );
                    matching.forEach((licitacao: any) => {
                      const transformedLicitacao = this.transformLicitacaoFromAPI(licitacao, boletim.id, 'api');
                      this.cachedBiddings.set(transformedLicitacao.id, transformedLicitacao);
                    });
                    if (matching.length > 0) {
                      console.log(`🎯 ENCONTRADO em boletim ${boletim.id}!`);
                      return true;
                    }
                  }
                } catch (error) {
                  console.log(`⚠️ Erro em boletim ${boletim.id}, continuando...`);
                }
                return false;
              }));
              if (results.some(r => r)) {
                console.log(`✅ Busca específica finalizada - SUCESSO! Total boletins verificados: ${totalBuscados}`);
                return;
              }
            }
          }
        } catch (error) {
          console.log(`⚠️ Erro no filtro ${filtro.id}, continuando para próximo...`);
        }
      }
      
      if (!encontrou) {
        console.log(`❌ Número de controle ${numeroControle} não encontrado após buscar ${totalBuscados} boletins`);
      }
      
    } catch (error) {
      console.log('⚠️ Erro crítico na busca específica:', error);
    }
  }

  async getBidding(id: number): Promise<Bidding | undefined> {
    return this.cachedBiddings.get(id);
  }

  // Atualiza dados de uma licitação via boletim associado
  public async refreshBoletimForBidding(biddingId: number): Promise<void> {
    const existing = this.cachedBiddings.get(biddingId);
    const boletimId = existing?.boletim_id;
    if (!boletimId) {
      return;
    }
    try {
      const boletimData = await conLicitacaoAPI.getBoletimData(boletimId);
      if (boletimData?.licitacoes) {
        boletimData.licitacoes.forEach((licitacao: any) => {
          const transformed = this.transformLicitacaoFromAPI(licitacao, boletimId, 'api');
          this.cachedBiddings.set(transformed.id, transformed);
        });
        this.lastCacheUpdate = Date.now();
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
  }, page: number = 1, limit: number = 50): Promise<{ biddings: Bidding[], total: number }> {
    if (this.cachedBiddings.size === 0 || Date.now() - this.lastCacheUpdate > this.CACHE_DURATION) {
      await this.refreshRecentBoletins();
    }
    
    // Combinar cache recente com favoritos pinados para busca completa
    const allBiddings = new Map<number, Bidding>();
    this.cachedBiddings.forEach((b, id) => allBiddings.set(id, b));
    this.pinnedBiddings.forEach((b, id) => allBiddings.set(id, b));
    
    let biddings = Array.from(allBiddings.values());
    
    // Aplicar filtros
    if (filters?.conlicitacao_id) {
      biddings = biddings.filter(b => 
        b.conlicitacao_id.toString().includes(filters.conlicitacao_id!)
      );
    }
    
    if (filters?.numero_controle) {
      biddings = biddings.filter(b => 
        b.conlicitacao_id?.toString().includes(filters.numero_controle!) ||
        b.orgao_codigo?.toLowerCase().includes(filters.numero_controle!.toLowerCase()) ||
        b.processo?.toLowerCase().includes(filters.numero_controle!.toLowerCase()) ||
        b.edital?.toLowerCase().includes(filters.numero_controle!.toLowerCase())
      );
      
      // Se não encontrou resultado, tentar busca específica
      if (biddings.length === 0) {
        console.log(`🔍 Busca específica paginada para: ${filters.numero_controle}`);
        await this.searchSpecificBidding(filters.numero_controle);
        biddings = Array.from(this.cachedBiddings.values()).filter(b => 
          b.conlicitacao_id?.toString().includes(filters.numero_controle!) ||
          b.orgao_codigo?.toLowerCase().includes(filters.numero_controle!.toLowerCase()) ||
          b.processo?.toLowerCase().includes(filters.numero_controle!.toLowerCase()) ||
          b.edital?.toLowerCase().includes(filters.numero_controle!.toLowerCase())
        );
      }
    }
    
    if (filters?.orgao && filters.orgao.length > 0) {
      biddings = biddings.filter(b => 
        filters.orgao!.some(orgao => 
          b.orgao_nome?.toLowerCase().includes(orgao.toLowerCase())
        )
      );
    }
    
    if (filters?.uf && filters.uf.length > 0) {
      biddings = biddings.filter(b => 
        filters.uf!.includes(b.orgao_uf || '')
      );
    }
    
    const total = biddings.length;
    const startIndex = (page - 1) * limit;
    const paginatedBiddings = biddings.slice(startIndex, startIndex + limit);
    
    if (Date.now() - this.lastCacheUpdate > this.CACHE_DURATION) {
      this.refreshRecentBoletins().catch(() => {});
    }
    
    return { biddings: paginatedBiddings, total };
  }

  // Contagem estimada fixa para evitar carregar dados
  async getBiddingsCount(): Promise<number> {
    return this.cachedBiddings.size;
  }

  async getBidding(id: number): Promise<Bidding | undefined> {
    return this.cachedBiddings.get(id) || this.pinnedBiddings.get(id);
  }

  // Método para manter uma licitação em memória (usado para favoritos)
  async pinBidding(bidding: Bidding): Promise<void> {
    if (bidding && bidding.id) {
      this.pinnedBiddings.set(bidding.id, bidding);
    }
  }

  // Métodos de favoritos com timestamps precisos em memória
  async getFavorites(userId: number, date?: string, dateFrom?: string, dateTo?: string): Promise<Bidding[]> {
    let userFavorites = Array.from(this.favorites.values())
      .filter(fav => fav.userId === userId);

    if (date) {
      userFavorites = userFavorites.filter(fav => {
        const favDate = fav.createdAt?.toISOString().split('T')[0];
        return favDate === date;
      });
    }
    
    if (dateFrom || dateTo) {
      userFavorites = userFavorites.filter(fav => {
        const favDate = fav.createdAt?.toISOString().split('T')[0];
        if (!favDate) return false;
        
        let isInRange = true;
        
        if (dateFrom) {
          isInRange = isInRange && favDate >= dateFrom;
        }
        
        if (dateTo) {
          isInRange = isInRange && favDate <= dateTo;
        }
        
        return isInRange;
      });
    }
    
    const favoriteBiddings: Bidding[] = [];
    for (const fav of userFavorites) {
      const bidding = await this.getBidding(fav.biddingId);
      if (bidding) {
        // Incluir dados de categorização salvos no favorito
        const biddingWithCategorization = {
          ...bidding,
          category: fav.category,
          customCategory: fav.customCategory,
          notes: fav.notes,
          uf: fav.uf,
          codigoUasg: fav.codigoUasg,
          valorEstimado: fav.valorEstimado,
          fornecedor: fav.fornecedor,
          site: fav.site
        };
        favoriteBiddings.push(biddingWithCategorization as any);
      }
    }
    
    return favoriteBiddings;
  }

  async addFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    const id = this.currentFavoriteId++;
    const favorite: Favorite = { 
      ...insertFavorite, 
      id, 
      createdAt: new Date(), // Timestamp atual preciso
      category: null,
      customCategory: null,
      notes: null,
      uf: null,
      codigoUasg: null,
      valorEstimado: null,
      fornecedor: null,
      site: null,
    };
    this.favorites.set(id, favorite);
    return favorite;
  }

  async removeFavorite(userId: number, biddingId: number): Promise<void> {
    let keyToDelete: number | undefined;
    this.favorites.forEach((favorite, id) => {
      if (favorite.userId === userId && favorite.biddingId === biddingId) {
        keyToDelete = id;
      }
    });
    if (keyToDelete !== undefined) {
      this.favorites.delete(keyToDelete);
    }
  }

  async isFavorite(userId: number, biddingId: number): Promise<boolean> {
    let found = false;
    this.favorites.forEach(favorite => {
      if (favorite.userId === userId && favorite.biddingId === biddingId) {
        found = true;
      }
    });
    return found;
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
    let foundFavoriteId: number | undefined;
    let foundFavorite: Favorite | undefined;
    
    this.favorites.forEach((favorite, id) => {
      if (favorite.userId === userId && favorite.biddingId === biddingId) {
        foundFavorite = favorite;
        foundFavoriteId = id;
      }
    });
    
    if (foundFavorite && foundFavoriteId !== undefined) {
      // Atualizar favorito existente mantendo o timestamp original
      this.favorites.set(foundFavoriteId, {
        ...foundFavorite,
        category: data.category ?? null,
        customCategory: data.customCategory ?? null,
        notes: data.notes ?? null,
        uf: data.uf ?? null,
        codigoUasg: data.codigoUasg ?? null,
        valorEstimado: data.valorEstimado ?? null,
        fornecedor: data.fornecedor ?? null,
        site: data.site ?? null,
        orgaoLicitante: (data as any).orgaoLicitante ?? (foundFavorite as any).orgaoLicitante ?? null,
        status: (data as any).status ?? (foundFavorite as any).status ?? null,
      });
    } else {
      // Criar novo favorito com categorização e timestamp atual
      const id = this.currentFavoriteId++;
      const favorite: Favorite = { 
        userId,
        biddingId,
        id, 
        createdAt: new Date(), // Timestamp preciso do momento atual
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
      };
      this.favorites.set(id, favorite);
    }
  }

  // Método de debug para validar fonte dos dados
  async getDataSourcesDebugInfo() {
    console.log('🔍 [DEBUG] Coletando informações de fonte dos dados...');
    
    const now = Date.now();
    const cacheStats = {
      biddings: {
        total: this.cachedBiddings.size,
        byDataSource: {} as Record<string, number>,
        oldestEntry: null as string | null,
        newestEntry: null as string | null,
        cacheAge: null as number | null
      },
      boletins: {
        total: this.boletimCache.size,
        byDataSource: {} as Record<string, number>,
        oldestEntry: null as string | null,
        newestEntry: null as string | null,
        cacheAge: null as number | null
      }
    };

    // Analisar cache de biddings
    let oldestBiddingTime = Infinity;
    let newestBiddingTime = 0;
    
    for (const bidding of this.cachedBiddings.values()) {
      const dataSource = bidding.dataSource || 'unknown';
      cacheStats.biddings.byDataSource[dataSource] = (cacheStats.biddings.byDataSource[dataSource] || 0) + 1;
      
      if (bidding.cacheTimestamp) {
        if (bidding.cacheTimestamp < oldestBiddingTime) {
          oldestBiddingTime = bidding.cacheTimestamp;
          cacheStats.biddings.oldestEntry = new Date(bidding.cacheTimestamp).toISOString();
        }
        if (bidding.cacheTimestamp > newestBiddingTime) {
          newestBiddingTime = bidding.cacheTimestamp;
          cacheStats.biddings.newestEntry = new Date(bidding.cacheTimestamp).toISOString();
        }
      }
    }
    
    if (newestBiddingTime > 0) {
      cacheStats.biddings.cacheAge = Math.round((now - newestBiddingTime) / 1000 / 60); // em minutos
    }

    // Analisar cache de boletins
    let oldestBoletimTime = Infinity;
    let newestBoletimTime = 0;
    
    for (const boletim of this.boletimCache.values()) {
      const dataSource = boletim.dataSource || 'unknown';
      cacheStats.boletins.byDataSource[dataSource] = (cacheStats.boletins.byDataSource[dataSource] || 0) + 1;
      
      if (boletim.cacheTimestamp) {
        if (boletim.cacheTimestamp < oldestBoletimTime) {
          oldestBoletimTime = boletim.cacheTimestamp;
          cacheStats.boletins.oldestEntry = new Date(boletim.cacheTimestamp).toISOString();
        }
        if (boletim.cacheTimestamp > newestBoletimTime) {
          newestBoletimTime = boletim.cacheTimestamp;
          cacheStats.boletins.newestEntry = new Date(boletim.cacheTimestamp).toISOString();
        }
      }
    }
    
    if (newestBoletimTime > 0) {
      cacheStats.boletins.cacheAge = Math.round((now - newestBoletimTime) / 1000 / 60); // em minutos
    }

    // Testar conectividade com API
    let apiStatus = 'unknown';
    let apiError = null;
    
    try {
      console.log('🔍 [DEBUG] Testando conectividade com API ConLicitação...');
      const testResponse = await conLicitacaoAPI.getFiltros();
      apiStatus = Array.isArray(testResponse) && testResponse.length > 0 ? 'connected' : 'empty_response';
    } catch (error) {
      apiStatus = 'error';
      apiError = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ [DEBUG] Erro na conectividade com API:', apiError);
    }

    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      apiStatus,
      apiError,
      cache: cacheStats,
      dataQuality: {
        potentialFallbackData: cacheStats.biddings.byDataSource['fallback'] || 0,
        realApiData: cacheStats.biddings.byDataSource['api'] || 0,
        unknownSource: cacheStats.biddings.byDataSource['unknown'] || 0
      },
      recommendations: []
    };

    // Adicionar recomendações baseadas na análise
    if (apiStatus === 'error') {
      debugInfo.recommendations.push('API ConLicitação não está acessível - dados podem estar desatualizados');
    }
    
    if (cacheStats.biddings.cacheAge && cacheStats.biddings.cacheAge > 60) {
      debugInfo.recommendations.push(`Cache de biddings está antigo (${cacheStats.biddings.cacheAge} minutos) - considere atualizar`);
    }
    
    if (debugInfo.dataQuality.potentialFallbackData > 0) {
      debugInfo.recommendations.push(`${debugInfo.dataQuality.potentialFallbackData} registros podem ser dados de fallback`);
    }
    
    if (debugInfo.dataQuality.unknownSource > 0) {
      debugInfo.recommendations.push(`${debugInfo.dataQuality.unknownSource} registros têm fonte desconhecida - verificar integridade`);
    }

    console.log('✅ [DEBUG] Informações de debug coletadas:', debugInfo);
    return debugInfo;
  }
}

export const conLicitacaoStorage = new ConLicitacaoStorage();
