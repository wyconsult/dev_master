import { 
  users, 
  biddings, 
  favorites,
  boletins,
  type User, 
  type InsertUser,
  type Bidding,
  type InsertBidding,
  type Favorite,
  type InsertFavorite,
  type Boletim,
  type InsertBoletim
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Biddings
  getBiddings(filters?: { 
    conlicitacao_id?: string; 
    orgao?: string[]; 
    uf?: string[];
    numero_controle?: string;
  }): Promise<Bidding[]>;
  getBidding(id: number): Promise<Bidding | undefined>;
  
  // Favorites
  getFavorites(userId: number, date?: string): Promise<Bidding[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: number, biddingId: number): Promise<void>;
  isFavorite(userId: number, biddingId: number): Promise<boolean>;
  
  // Boletins
  getBoletins(): Promise<Boletim[]>;
  getBoletinsByDate(date: string): Promise<Boletim[]>;
  getBoletim(id: number): Promise<Boletim | undefined>;
  markBoletimAsViewed(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private biddings: Map<number, Bidding>;
  private favorites: Map<number, Favorite>;
  private boletins: Map<number, Boletim>;
  private currentUserId: number;
  private currentBiddingId: number;
  private currentFavoriteId: number;
  private currentBoletimId: number;

  constructor() {
    this.users = new Map();
    this.biddings = new Map();
    this.favorites = new Map();
    this.boletins = new Map();
    this.currentUserId = 1;
    this.currentBiddingId = 1;
    this.currentFavoriteId = 1;
    this.currentBoletimId = 1;
    
    // Initialize with mock data
    this.initializeMockData();
  }

  private initializeMockData() {
    // Create a test user
    const testUser: User = {
      id: 1,
      email: "admin@test.com",
      password: "admin123"
    };
    this.users.set(1, testUser);
    this.currentUserId = 2;

    // Create mock biddings based on actual ConLicitação JSON data provided
    const mockBiddings: Bidding[] = [
      {
        id: 1,
        orgao: "Empresa Maranhense de Serviços Hospitalares - EMSERH",
        codigo: "926561",
        cidade: "São Luís",
        uf: "MA",
        endereco: "Av. Borborema, Qd-16, n° 25, Bairro do Calhau",
        telefone: "",
        site: "www.licitacoes-e.com.br",
        objeto: "Contratação de empresa especializada na prestação de serviços contínuos de Nutrição e Alimentação Hospitalar, para atender as necessidades do HOSPITAL MACRORREGIONAL DE COROATÁ E UPA COROATÁ.",
        situacao: "NOVA",
        datahora_abertura: "2025-06-27 09:00:00",
        datahora_documento: "",
        datahora_retirada: "",
        datahora_visita: "",
        datahora_prazo: "",
        edital: "SM/91/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/licitacoes/17809194/arquivos/edital.zip",
        processo: "",
        observacao: "DATA DA ABERTURA: 27/06/2025, às 09h00min, horário de Brasília. Local de Realização: Sistema Licitações-e www.licitacoes-e.com.br.",
        item: "",
        preco_edital: "",
        valor_estimado: "",
        conlicitacao_id: 17809194
      },
      {
        id: 2,
        orgao: "Secretaria Estadual de Saúde",
        codigo: "",
        cidade: "Cuiabá",
        uf: "MT",
        endereco: "http://aquisicoes.sad.mt.gov.br",
        telefone: "",
        site: "www.saude.mt.gov.br",
        objeto: "REPETIÇÃO DO PREGÃO ELETRÔNICO N.º 0022/2025 - FRACASSADO - CONTRATAÇÃO DE SERVIÇO ESPECIALIZADO DE NUTRIÇÃO E ALIMENTAÇÃO PARA PLANTONISTAS DO SAMU SERVIÇO DE ATENDIMENTO MÓVEL DE URGÊNCIA",
        situacao: "NOVA",
        datahora_abertura: "2025-05-30 14:00:00",
        datahora_documento: "",
        datahora_retirada: "",
        datahora_visita: "",
        datahora_prazo: "2025-05-30 15:00:00",
        edital: "PE/38/2025",
        link_edital: "https://aquisicoes.seplag.mt.gov.br/sgc/faces/pub/sgc/edlicitacoes/PropostaFornecedorEDLConsultaPageList.jsp",
        processo: "",
        observacao: "O Edital estará disponível no Portal de Aquisições onde será realizada a sessão pública e todas as operações relativas ao certame.",
        item: "",
        preco_edital: "",
        valor_estimado: "",
        conlicitacao_id: 17808212
      },
      {
        id: 3,
        orgao: "Prefeitura Municipal de Mairiporã",
        codigo: "",
        cidade: "Mairiporã",
        uf: "SP",
        endereco: "NÃO INFORMADO",
        telefone: "",
        site: "",
        objeto: "REGISTRO DE PREÇOS PARA A EVENTUAL AQUISIÇÃO DE MARMITEX, CAFÉ DA MANHÃ, CAFÉ DA TARDE E KIT LANCHES, PARA ATENDER AS NECESSIDADES DE TODAS AS SECRETARIAS MUNICIPAIS",
        situacao: "NOVA",
        datahora_abertura: "2025-01-30 08:00:00",
        datahora_documento: "",
        datahora_retirada: "",
        datahora_visita: "",
        datahora_prazo: "",
        edital: "PE/17/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/licitacoes/17763843/arquivos/EDITAL.pdf",
        processo: "22893/2024",
        observacao: "Id: 63826 Unidade licitante: Prefeitura Municipal de Mairiporã - Unidade Única Plataforma: licitardigital",
        item: "",
        preco_edital: "",
        valor_estimado: "",
        conlicitacao_id: 17763843
      },
      {
        id: 4,
        orgao: "AGEPEN-Agência Estadual de Administracao do Sistema Penitenciário",
        codigo: "",
        cidade: "Campo Grande",
        uf: "MS",
        endereco: "Rua João Pedro de Souza, 966, Santa Dorothéia",
        telefone: "",
        site: "",
        objeto: "Contratação de empresa especializada na prestação de serviços de preparo, fornecimento, transporte e distribuição de alimentação pronta café da manhã, almoço e jantar em Cassilândia/MS.",
        situacao: "URGENTE",
        datahora_abertura: "2025-01-29 18:30:00",
        datahora_documento: "",
        datahora_retirada: "",
        datahora_visita: "",
        datahora_prazo: "",
        edital: "DL/3/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/licitacoes/17810217/arquivos/edital.zip",
        processo: "31/083.846/2025",
        observacao: "Unidade compradora: 157 - AGENCIA ESTADUAL DE ADMINISTRACAO DO SISTEMA PENITENCIARIO",
        item: "9942 - Fornecimento de alimentação refeição, lanche e/ou similar",
        preco_edital: "",
        valor_estimado: "1099926.50",
        conlicitacao_id: 17810217
      },
      {
        id: 5,
        orgao: "MINISTÉRIO DA EDUCAÇÃO - Universidade Federal de Viçosa",
        codigo: "154051",
        cidade: "Viçosa",
        uf: "MG",
        endereco: "Av. P.H. Rolfs, s/n - Campus Universitário",
        telefone: "",
        site: "",
        objeto: "Contratação de empresa especializada para prestação de serviços contínuos de fornecimento de refeições coletivas para o Restaurante Universitário do Campus Rio Paranaíba da Universidade Federal de Viçosa",
        situacao: "NOVA",
        datahora_abertura: "2025-06-16 10:00:00",
        datahora_documento: "",
        datahora_retirada: "",
        datahora_visita: "",
        datahora_prazo: "2025-06-16 10:00:00",
        edital: "PE/90046/2025",
        link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/licitacoes/17811202/arquivos/edital.zip",
        processo: "23114907393202569",
        observacao: "Unidade compradora: 154051 - UNIVERSIDADE FEDERAL DE VICOSA Local: Viçosa/MG",
        item: "1 - Fornecimento de Refeições / Lanches / Salgados / Doces",
        preco_edital: "",
        valor_estimado: "1377277.00",
        conlicitacao_id: 17811202
      },
      {
        id: 6,
        orgao: "NUCLEBRÁS-Nuclebrás Equipamentos Pesados S/A",
        codigo: "",
        cidade: "Itaguaí",
        uf: "RJ",
        endereco: "Avenida General Euclydes de Oliveira Figueiredo, 200",
        telefone: "",
        site: "",
        objeto: "Contratação de serviço de continuado, sem dedicação exclusiva de mão de obra, de preparo e fornecimento de refeições em balcões térmicos no sistema de autosserviço, além de lanches",
        situacao: "PRORROGADA",
        datahora_abertura: "2025-06-16 20:00:00",
        datahora_documento: "",
        datahora_retirada: "",
        datahora_visita: "",
        datahora_prazo: "",
        edital: "PE/25/2025",
        link_edital: "https://compras.gov.br/edital/pe25-2025",
        processo: "87481",
        observacao: "Órgão: NUCLEBRAS EQUIPAMENTOS PESADOS S.A. - NUCLEP Id: 1068829 Edital: 025/2025",
        item: "Contratação de serviço de continuado, sem dedicação exclusiva de mão de obra",
        preco_edital: "",
        valor_estimado: "",
        conlicitacao_id: 17750638
      }
    ];

    mockBiddings.forEach(bidding => {
      this.biddings.set(bidding.id, bidding);
    });
    this.currentBiddingId = 7;

    // Create mock boletins - 3 por dia (manhã, tarde, noite) conforme documentação da API
    const mockBoletins: Boletim[] = [
      // 16/06/2025
      {
        id: 1,
        numero_edicao: 1,
        data: "2025-06-16",
        datahora_fechamento: "2025-06-16 11:59:59",
        filtro_id: 1,
        quantidade_licitacoes: 5,
        quantidade_acompanhamentos: 2,
        status: "Publicado",
        visualizado: false
      },
      {
        id: 2,
        numero_edicao: 2,
        data: "2025-06-16",
        datahora_fechamento: "2025-06-16 17:59:59",
        filtro_id: 1,
        quantidade_licitacoes: 3,
        quantidade_acompanhamentos: 1,
        status: "Publicado",
        visualizado: true
      },
      {
        id: 3,
        numero_edicao: 3,
        data: "2025-06-16",
        datahora_fechamento: "2025-06-16 23:59:59",
        filtro_id: 1,
        quantidade_licitacoes: 2,
        quantidade_acompanhamentos: 0,
        status: "Publicado",
        visualizado: false
      },
      // 17/06/2025
      {
        id: 4,
        numero_edicao: 4,
        data: "2025-06-17",
        datahora_fechamento: "2025-06-17 11:59:59",
        filtro_id: 1,
        quantidade_licitacoes: 4,
        quantidade_acompanhamentos: 1,
        status: "Publicado",
        visualizado: false
      },
      {
        id: 5,
        numero_edicao: 5,
        data: "2025-06-17",
        datahora_fechamento: "2025-06-17 17:59:59",
        filtro_id: 1,
        quantidade_licitacoes: 6,
        quantidade_acompanhamentos: 2,
        status: "Publicado",
        visualizado: true
      },
      {
        id: 6,
        numero_edicao: 6,
        data: "2025-06-17",
        datahora_fechamento: "2025-06-17 23:59:59",
        filtro_id: 1,
        quantidade_licitacoes: 1,
        quantidade_acompanhamentos: 0,
        status: "Em Processamento",
        visualizado: false
      },
      // 18/06/2025
      {
        id: 7,
        numero_edicao: 7,
        data: "2025-06-18",
        datahora_fechamento: "2025-06-18 11:59:59",
        filtro_id: 1,
        quantidade_licitacoes: 8,
        quantidade_acompanhamentos: 4,
        status: "Publicado",
        visualizado: false
      },
      {
        id: 8,
        numero_edicao: 8,
        data: "2025-06-18",
        datahora_fechamento: "2025-06-18 17:59:59",
        filtro_id: 1,
        quantidade_licitacoes: 5,
        quantidade_acompanhamentos: 3,
        status: "Publicado",
        visualizado: false
      },
      {
        id: 9,
        numero_edicao: 9,
        data: "2025-06-18",
        datahora_fechamento: "2025-06-18 23:59:59",
        filtro_id: 1,
        quantidade_licitacoes: 3,
        quantidade_acompanhamentos: 1,
        status: "Publicado",
        visualizado: false
      },
      // 19/06/2025
      {
        id: 10,
        numero_edicao: 10,
        data: "2025-06-19",
        datahora_fechamento: "2025-06-19 11:59:59",
        filtro_id: 1,
        quantidade_licitacoes: 2,
        quantidade_acompanhamentos: 0,
        status: "Em Processamento",
        visualizado: false
      },
      {
        id: 11,
        numero_edicao: 11,
        data: "2025-06-19",
        datahora_fechamento: "2025-06-19 17:59:59",
        filtro_id: 1,
        quantidade_licitacoes: 0,
        quantidade_acompanhamentos: 0,
        status: "Em Processamento",
        visualizado: false
      },
      {
        id: 12,
        numero_edicao: 12,
        data: "2025-06-19",
        datahora_fechamento: "2025-06-19 23:59:59",
        filtro_id: 1,
        quantidade_licitacoes: 1,
        quantidade_acompanhamentos: 0,
        status: "Em Processamento",
        visualizado: false
      },
      // 20/06/2025
      {
        id: 13,
        numero_edicao: 13,
        data: "2025-06-20",
        datahora_fechamento: "2025-06-20 11:59:59",
        filtro_id: 1,
        quantidade_licitacoes: 7,
        quantidade_acompanhamentos: 3,
        status: "Publicado",
        visualizado: false
      },
      {
        id: 14,
        numero_edicao: 14,
        data: "2025-06-20",
        datahora_fechamento: "2025-06-20 17:59:59",
        filtro_id: 1,
        quantidade_licitacoes: 4,
        quantidade_acompanhamentos: 2,
        status: "Publicado",
        visualizado: false
      },
      {
        id: 15,
        numero_edicao: 15,
        data: "2025-06-20",
        datahora_fechamento: "2025-06-20 23:59:59",
        filtro_id: 1,
        quantidade_licitacoes: 2,
        quantidade_acompanhamentos: 1,
        status: "Publicado",
        visualizado: false
      },
      // 21/06/2025 - hoje
      {
        id: 16,
        numero_edicao: 16,
        data: "2025-06-21",
        datahora_fechamento: "2025-06-21 11:59:59",
        filtro_id: 1,
        quantidade_licitacoes: 3,
        quantidade_acompanhamentos: 1,
        status: "Publicado",
        visualizado: false
      },
      {
        id: 17,
        numero_edicao: 17,
        data: "2025-06-21",
        datahora_fechamento: "2025-06-21 17:59:59",
        filtro_id: 1,
        quantidade_licitacoes: 0,
        quantidade_acompanhamentos: 0,
        status: "Em Processamento",
        visualizado: false
      },
      {
        id: 18,
        numero_edicao: 18,
        data: "2025-06-21",
        datahora_fechamento: "2025-06-21 23:59:59",
        filtro_id: 1,
        quantidade_licitacoes: 0,
        quantidade_acompanhamentos: 0,
        status: "Em Processamento",
        visualizado: false
      }
    ];

    mockBoletins.forEach(boletim => {
      this.boletins.set(boletim.id, boletim);
    });
    this.currentBoletimId = 19;
  }

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

  async getBiddings(filters?: { 
    conlicitacao_id?: string; 
    orgao?: string[]; 
    uf?: string[];
    numero_controle?: string;
  }): Promise<Bidding[]> {
    let biddings = Array.from(this.biddings.values());
    
    if (filters?.conlicitacao_id) {
      biddings = biddings.filter(b => 
        b.conlicitacao_id.toString().includes(filters.conlicitacao_id!)
      );
    }
    
    if (filters?.numero_controle) {
      biddings = biddings.filter(b => 
        b.codigo?.toLowerCase().includes(filters.numero_controle!.toLowerCase()) ||
        b.processo?.toLowerCase().includes(filters.numero_controle!.toLowerCase())
      );
    }
    
    if (filters?.orgao && filters.orgao.length > 0) {
      biddings = biddings.filter(b => 
        filters.orgao!.some(orgao => 
          b.orgao.toLowerCase().includes(orgao.toLowerCase())
        )
      );
    }

    if (filters?.uf && filters.uf.length > 0) {
      biddings = biddings.filter(b => 
        filters.uf!.includes(b.uf)
      );
    }
    
    return biddings;
  }

  async getBidding(id: number): Promise<Bidding | undefined> {
    return this.biddings.get(id);
  }

  async getFavorites(userId: number, date?: string): Promise<Bidding[]> {
    let userFavorites = Array.from(this.favorites.values())
      .filter(fav => fav.userId === userId);

    if (date) {
      userFavorites = userFavorites.filter(fav => {
        const favDate = fav.createdAt?.toISOString().split('T')[0];
        return favDate === date;
      });
    }
    
    const favoriteBiddings: Bidding[] = [];
    for (const fav of userFavorites) {
      const bidding = this.biddings.get(fav.biddingId);
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
    const favoriteToRemove = Array.from(this.favorites.entries())
      .find(([_, fav]) => fav.userId === userId && fav.biddingId === biddingId);
    
    if (favoriteToRemove) {
      this.favorites.delete(favoriteToRemove[0]);
    }
  }

  async isFavorite(userId: number, biddingId: number): Promise<boolean> {
    return Array.from(this.favorites.values())
      .some(fav => fav.userId === userId && fav.biddingId === biddingId);
  }

  async getBoletins(): Promise<Boletim[]> {
    return Array.from(this.boletins.values());
  }

  async getBoletinsByDate(date: string): Promise<Boletim[]> {
    return Array.from(this.boletins.values())
      .filter(boletim => boletim.data === date);
  }

  async getBoletim(id: number): Promise<Boletim | undefined> {
    return this.boletins.get(id);
  }

  async markBoletimAsViewed(id: number): Promise<void> {
    const boletim = this.boletins.get(id);
    if (boletim) {
      boletim.visualizado = true;
      this.boletins.set(id, boletim);
    }
  }
}

export const storage = new MemStorage();
