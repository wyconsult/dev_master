import { conLicitacaoAPI } from './conlicitacao-api';
import { Bidding, Boletim, Filtro, Acompanhamento, User, InsertUser, Favorite, InsertFavorite } from '../shared/schema';

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
  getBidding(id: number): Promise<Bidding | undefined>;
  
  // Favorites (mantemos localmente)
  getFavorites(userId: number, date?: string, dateFrom?: string, dateTo?: string): Promise<Bidding[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: number, biddingId: number): Promise<void>;
  isFavorite(userId: number, biddingId: number): Promise<boolean>;
}

export class ConLicitacaoStorage implements IConLicitacaoStorage {
  private users: Map<number, User>;
  private favorites: Map<number, Favorite>;
  private viewedBoletins: Set<number>; // Armazena IDs dos boletins visualizados
  private currentUserId: number;
  private currentFavoriteId: number;
  private cachedBiddings: Map<number, Bidding>; // Cache das licitações
  private lastCacheUpdate: number;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  constructor() {
    this.users = new Map();
    this.favorites = new Map();
    this.viewedBoletins = new Set();
    this.cachedBiddings = new Map();
    this.currentUserId = 1;
    this.currentFavoriteId = 1;
    this.lastCacheUpdate = 0;
    
    this.initializeMockData();
  }

  private initializeMockData() {
    // Criar usuário de teste
    const testUser: User = {
      id: 1,
      email: "admin@test.com",
      password: "admin123"
    };
    this.users.set(1, testUser);
    this.currentUserId = 2;
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

      return filtros;
    } catch (error: any) {
      if (error.message === 'IP_NOT_AUTHORIZED') {
        console.log('❌ IP não autorizado na ConLicitação API. Execute localmente com IP autorizado.');
        return [];
      }
      console.error('Erro ao buscar filtros da API real:', error);
      throw new Error('Falha ao conectar com a API ConLicitação. Verifique sua conexão e autorização de IP.');
    }
  }



  async getBoletins(filtroId: number, page: number = 1, perPage: number = 100): Promise<{ boletins: Boletim[], total: number }> {
    try {
      const response = await conLicitacaoAPI.getBoletins(filtroId, page, perPage);
      
      const boletins: Boletim[] = response.boletins.map((boletim: any) => ({
        id: boletim.id,
        numero_edicao: boletim.numero_edicao,
        datahora_fechamento: boletim.datahora_fechamento,
        filtro_id: boletim.filtro_id,
        quantidade_licitacoes: 0, // Será preenchido quando buscarmos os dados do boletim
        quantidade_acompanhamentos: 0,
        visualizado: this.viewedBoletins.has(boletim.id),
      }));

      return {
        boletins,
        total: response.filtro.total_boletins
      };
    } catch (error: any) {
      if (error.message === 'IP_NOT_AUTHORIZED') {
        console.log('❌ IP não autorizado na ConLicitação API. Execute localmente com IP autorizado.');
        return { boletins: [], total: 0 };
      }
      console.error('Erro ao buscar boletins da API real:', error);
      throw new Error('Falha ao conectar com a API ConLicitação. Verifique sua conexão e autorização de IP.');
    }
  }



  async getBoletim(id: number): Promise<{ boletim: Boletim, licitacoes: Bidding[], acompanhamentos: Acompanhamento[] } | undefined> {
    try {
      const response = await conLicitacaoAPI.getBoletimData(id);
      
      const boletim: Boletim = {
        id: response.boletim.id,
        numero_edicao: response.boletim.numero_edicao,
        datahora_fechamento: response.boletim.datahora_fechamento,
        filtro_id: response.boletim.cliente.filtro.id,
        quantidade_licitacoes: response.boletim.quantidade_licitacoes,
        quantidade_acompanhamentos: response.boletim.quantidade_acompanhamentos,
        visualizado: this.viewedBoletins.has(id),
      };

      // Transformar licitações
      const licitacoes: Bidding[] = (response.licitacoes || []).map((licitacao: any) => this.transformLicitacao(licitacao, id));
      
      // Transformar acompanhamentos
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

      // Atualizar cache das licitações
      licitacoes.forEach(licitacao => {
        this.cachedBiddings.set(licitacao.id, licitacao);
      });
      this.lastCacheUpdate = Date.now();

      return { boletim, licitacoes, acompanhamentos };
    } catch (error: any) {
      if (error.message === 'IP_NOT_AUTHORIZED') {
        console.log('❌ IP não autorizado na ConLicitação API. Execute localmente com IP autorizado.');
        return undefined;
      }
      console.error('Erro ao buscar boletim da API real:', error);
      throw new Error('Falha ao conectar com a API ConLicitação. Verifique sua conexão e autorização de IP.');
    }
  }



  private transformLicitacao(licitacao: any, boletimId: number): Bidding {
    const telefones = licitacao.orgao.telefone?.map((tel: any) => 
      `${tel.ddd ? '(' + tel.ddd + ')' : ''} ${tel.numero}${tel.ramal ? ' ramal ' + tel.ramal : ''}`
    ).join(', ') || '';

    const documentoUrl = licitacao.documento?.[0]?.url || '';

    return {
      id: licitacao.id,
      conlicitacao_id: licitacao.id,
      orgao_nome: licitacao.orgao.nome,
      orgao_codigo: licitacao.orgao.codigo,
      orgao_cidade: licitacao.orgao.cidade,
      orgao_uf: licitacao.orgao.uf,
      orgao_endereco: licitacao.orgao.endereco,
      orgao_telefone: telefones,
      orgao_site: licitacao.orgao.site,
      objeto: licitacao.objeto,
      situacao: licitacao.situacao,
      datahora_abertura: licitacao.datahora_abertura,
      datahora_documento: licitacao.datahora_documento,
      datahora_retirada: licitacao.datahora_retirada,
      datahora_visita: licitacao.datahora_visita,
      datahora_prazo: licitacao.datahora_prazo,
      edital: licitacao.edital,
      documento_url: documentoUrl,
      processo: licitacao.processo,
      observacao: licitacao.observacao,
      item: licitacao.item,
      preco_edital: licitacao.preco_edital,
      valor_estimado: licitacao.valor_estimado,
      boletim_id: boletimId,
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
    // Se o cache está vazio ou expirado, buscar dados dos últimos boletins
    if (this.cachedBiddings.size === 0 || Date.now() - this.lastCacheUpdate > this.CACHE_DURATION) {
      await this.refreshBiddingsCache();
    }

    let biddings = Array.from(this.cachedBiddings.values());
    
    if (filters?.conlicitacao_id) {
      biddings = biddings.filter(b => 
        b.conlicitacao_id.toString().includes(filters.conlicitacao_id!)
      );
    }
    
    if (filters?.numero_controle) {
      biddings = biddings.filter(b => 
        b.conlicitacao_id?.toString().includes(filters.numero_controle!) ||
        b.orgao_codigo?.toLowerCase().includes(filters.numero_controle!.toLowerCase()) ||
        b.processo?.toLowerCase().includes(filters.numero_controle!.toLowerCase())
      );
    }
    
    if (filters?.orgao && filters.orgao.length > 0) {
      biddings = biddings.filter(b => 
        filters.orgao!.some(orgao => 
          b.orgao_nome.toLowerCase().includes(orgao.toLowerCase())
        )
      );
    }

    if (filters?.uf && filters.uf.length > 0) {
      biddings = biddings.filter(b => 
        filters.uf!.includes(b.orgao_uf)
      );
    }
    
    return biddings;
  }

  private async refreshBiddingsCache(): Promise<void> {
    try {
      // Buscar filtros disponíveis
      const filtros = await this.getFiltros();
      
      if (filtros.length > 0) {
        // Buscar os últimos boletins do primeiro filtro
        const { boletins } = await this.getBoletins(filtros[0].id, 1, 10);
        
        // Buscar licitações de alguns dos boletins mais recentes
        for (const boletim of boletins.slice(0, 3)) {
          await this.getBoletim(boletim.id);
        }
      }
    } catch (error: any) {
      if (error.message === 'IP_NOT_AUTHORIZED') {
        console.log('❌ IP não autorizado na ConLicitação API. Execute localmente com IP autorizado.');
        return;
      }
      console.error('Erro ao atualizar cache de licitações:', error);
    }
  }

  async getBidding(id: number): Promise<Bidding | undefined> {
    return this.cachedBiddings.get(id);
  }

  // Métodos de favoritos (mantemos localmente)
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
      const bidding = this.cachedBiddings.get(fav.biddingId);
      if (bidding) {
        favoriteBiddings.push(bidding);
      }
    }
    
    return favoriteBiddings;
  }

  async addFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    const id = this.currentFavoriteId++;
    const favorite: Favorite = { ...insertFavorite, id, createdAt: new Date() };
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
}

export const conLicitacaoStorage = new ConLicitacaoStorage();