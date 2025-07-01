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
    } catch (error) {
      console.error('Erro ao buscar filtros da API real, usando dados de desenvolvimento:', error);
      
      // Usar dados de desenvolvimento baseados na estrutura real da API
      return this.getDevelopmentFiltros();
    }
  }

  private getDevelopmentFiltros(): Filtro[] {
    return [
      {
        id: 115425,
        descricao: "Filtro inicial de Licitação e Acompanhamentos",
        cliente_id: 2982,
        cliente_razao_social: "Consórcio Nacional de Licitação HQZ Ltda.",
        manha: true,
        tarde: true,
        noite: true,
      }
    ];
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
    } catch (error) {
      console.error('Erro ao buscar boletins da API real:', error);
      
      // Usar dados de desenvolvimento baseados na estrutura real da API
      return this.getDevelopmentBoletins(filtroId, page, perPage);
    }
  }

  private getDevelopmentBoletins(filtroId: number, page: number, perPage: number): { boletins: Boletim[], total: number } {
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);
    const anteontem = new Date(hoje);
    anteontem.setDate(hoje.getDate() - 2);

    const mockBoletins: Boletim[] = [
      // Boletim de hoje manhã
      {
        id: 44657477,
        numero_edicao: 21,
        datahora_fechamento: `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')} 09:30:00 -03:00`,
        filtro_id: filtroId,
        quantidade_licitacoes: 3,
        quantidade_acompanhamentos: 2,
        visualizado: this.viewedBoletins.has(44657477),
      },
      // Boletim de hoje tarde
      {
        id: 44657478,
        numero_edicao: 22,
        datahora_fechamento: `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')} 14:30:00 -03:00`,
        filtro_id: filtroId,
        quantidade_licitacoes: 5,
        quantidade_acompanhamentos: 3,
        visualizado: this.viewedBoletins.has(44657478),
      },
      // Boletim de ontem
      {
        id: 44632454,
        numero_edicao: 20,
        datahora_fechamento: `${ontem.getFullYear()}-${String(ontem.getMonth() + 1).padStart(2, '0')}-${String(ontem.getDate()).padStart(2, '0')} 09:43:43 -03:00`,
        filtro_id: filtroId,
        quantidade_licitacoes: 2,
        quantidade_acompanhamentos: 1,
        visualizado: this.viewedBoletins.has(44632454),
      },
      // Boletim de anteontem
      {
        id: 44612748,
        numero_edicao: 19,
        datahora_fechamento: `${anteontem.getFullYear()}-${String(anteontem.getMonth() + 1).padStart(2, '0')}-${String(anteontem.getDate()).padStart(2, '0')} 19:14:45 -03:00`,
        filtro_id: filtroId,
        quantidade_licitacoes: 4,
        quantidade_acompanhamentos: 3,
        visualizado: this.viewedBoletins.has(44612748),
      }
    ];

    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginatedBoletins = mockBoletins.slice(start, end);

    return {
      boletins: paginatedBoletins,
      total: mockBoletins.length
    };
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
    } catch (error) {
      console.error('Erro ao buscar boletim da API real:', error);
      
      // Usar dados de desenvolvimento baseados na estrutura real da API
      return this.getDevelopmentBoletimData(id);
    }
  }

  private getDevelopmentBoletimData(id: number): { boletim: Boletim, licitacoes: Bidding[], acompanhamentos: Acompanhamento[] } {
    const hoje = new Date();
    const dataHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    
    const boletim: Boletim = {
      id: id,
      numero_edicao: 21,
      datahora_fechamento: `${dataHoje} 09:30:00 -03:00`,
      filtro_id: 115425,
      quantidade_licitacoes: 3,
      quantidade_acompanhamentos: 2,
      visualizado: this.viewedBoletins.has(id),
    };

    // Licitações baseadas na estrutura real da API ConLicitação
    const licitacoes: Bidding[] = [
      {
        id: 13157470,
        conlicitacao_id: 13157470,
        orgao_nome: "Empresa Maranhense de Serviços Hospitalares - EMSERH",
        orgao_codigo: "926561",
        orgao_cidade: "São Luís",
        orgao_uf: "MA",
        orgao_endereco: "Av. Borborema, Qd-16, n° 25, Bairro do Calhau",
        orgao_telefone: "",
        orgao_site: "www.licitacoes-e.com.br",
        objeto: "Contratação de empresa especializada na prestação de serviços contínuos de Nutrição e Alimentação Hospitalar, para atender as necessidades do HOSPITAL MACRORREGIONAL DE COROATÁ E UPA COROATÁ.",
        situacao: "NOVA",
        datahora_abertura: `${dataHoje} 09:00:00`,
        datahora_documento: "",
        datahora_retirada: "",
        datahora_visita: "",
        datahora_prazo: "",
        edital: "SM/91/2025",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/licitacoes/13157470/arquivos/edital.zip",
        processo: "",
        observacao: "DATA DA ABERTURA: 27/01/2025, às 09h00min, horário de Brasília. Local de Realização: Sistema Licitações-e www.licitacoes-e.com.br.",
        item: "",
        preco_edital: 0.0,
        valor_estimado: 0.0,
        boletim_id: id,
      },
      {
        id: 13157519,
        conlicitacao_id: 13157519,
        orgao_nome: "Secretaria Estadual de Saúde",
        orgao_codigo: "925373",
        orgao_cidade: "Cuiabá",
        orgao_uf: "MT",
        orgao_endereco: "http://aquisicoes.sad.mt.gov.br",
        orgao_telefone: "",
        orgao_site: "www.saude.mt.gov.br",
        objeto: "REPETIÇÃO DO PREGÃO ELETRÔNICO N.º 0022/2025 - FRACASSADO - CONTRATAÇÃO DE SERVIÇO ESPECIALIZADO DE NUTRIÇÃO E ALIMENTAÇÃO PARA PLANTONISTAS DO SAMU SERVIÇO DE ATENDIMENTO MÓVEL DE URGÊNCIA",
        situacao: "NOVA",
        datahora_abertura: `${dataHoje} 14:00:00`,
        datahora_documento: "",
        datahora_retirada: "",
        datahora_visita: "",
        datahora_prazo: "2025-01-30 15:00:00",
        edital: "PE/38/2025",
        documento_url: "https://aquisicoes.seplag.mt.gov.br/sgc/faces/pub/sgc/edlicitacoes/PropostaFornecedorEDLConsultaPageList.jsp",
        processo: "",
        observacao: "O Edital estará disponível no Portal de Aquisições onde será realizada a sessão pública e todas as operações relativas ao certame.",
        item: "",
        preco_edital: 0.0,
        valor_estimado: 0.0,
        boletim_id: id,
      },
      {
        id: 13157521,
        conlicitacao_id: 13157521,
        orgao_nome: "Prefeitura Municipal de Mairiporã",
        orgao_codigo: "987683",
        orgao_cidade: "Mairiporã",
        orgao_uf: "SP",
        orgao_endereco: "NÃO INFORMADO",
        orgao_telefone: "",
        orgao_site: "",
        objeto: "REGISTRO DE PREÇOS PARA A EVENTUAL AQUISIÇÃO DE MARMITEX, CAFÉ DA MANHÃ, CAFÉ DA TARDE E KIT LANCHES, PARA ATENDER AS NECESSIDADES DE TODAS AS SECRETARIAS MUNICIPAIS",
        situacao: "NOVA",
        datahora_abertura: `${dataHoje} 08:00:00`,
        datahora_documento: "",
        datahora_retirada: "",
        datahora_visita: "",
        datahora_prazo: "",
        edital: "PE/17/2025",
        documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/licitacoes/13157521/arquivos/EDITAL.pdf",
        processo: "22893/2024",
        observacao: "Id: 63826 Unidade licitante: Prefeitura Municipal de Mairiporã - Unidade Única Plataforma: licitardigital",
        item: "",
        preco_edital: 0.0,
        valor_estimado: 0.0,
        boletim_id: id,
      }
    ];

    const acompanhamentos: Acompanhamento[] = [
      {
        id: 1,
        conlicitacao_id: 13157470,
        licitacao_id: 13157470,
        orgao_nome: "Empresa Maranhense de Serviços Hospitalares - EMSERH",
        orgao_cidade: "São Luís",
        orgao_uf: "MA",
        objeto: "Resultado da licitação para serviços de nutrição hospitalar",
        sintese: "Empresa XYZ Nutrição declarada vencedora do certame",
        data_fonte: "2025-01-02",
        edital: "SM/91/2025",
        processo: "",
        boletim_id: id,
      }
    ];

    // Atualizar cache das licitações
    licitacoes.forEach(licitacao => {
      this.cachedBiddings.set(licitacao.id, licitacao);
    });
    this.lastCacheUpdate = Date.now();

    return { boletim, licitacoes, acompanhamentos };
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
    } catch (error) {
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