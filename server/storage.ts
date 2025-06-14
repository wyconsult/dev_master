import { 
  users, 
  biddings, 
  favorites,
  type User, 
  type InsertUser,
  type Bidding,
  type InsertBidding,
  type Favorite,
  type InsertFavorite
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Biddings
  getBiddings(filters?: { conlicitacao_id?: string; orgao?: string; turno?: string }): Promise<Bidding[]>;
  getBidding(id: number): Promise<Bidding | undefined>;
  
  // Favorites
  getFavorites(userId: number): Promise<Bidding[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: number, biddingId: number): Promise<void>;
  isFavorite(userId: number, biddingId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private biddings: Map<number, Bidding>;
  private favorites: Map<number, Favorite>;
  private currentUserId: number;
  private currentBiddingId: number;
  private currentFavoriteId: number;

  constructor() {
    this.users = new Map();
    this.biddings = new Map();
    this.favorites = new Map();
    this.currentUserId = 1;
    this.currentBiddingId = 1;
    this.currentFavoriteId = 1;
    
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
    this.currentBiddingId = 5;
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

  async getBiddings(filters?: { conlicitacao_id?: string; orgao?: string; turno?: string }): Promise<Bidding[]> {
    let biddings = Array.from(this.biddings.values());
    
    if (filters?.conlicitacao_id) {
      biddings = biddings.filter(b => 
        b.conlicitacao_id.toString().includes(filters.conlicitacao_id!)
      );
    }
    
    if (filters?.orgao) {
      biddings = biddings.filter(b => 
        b.orgao.toLowerCase().includes(filters.orgao!.toLowerCase())
      );
    }

    if (filters?.turno && filters.turno !== "all") {
      // Filter by time of day based on datahora_abertura
      const turnoMap: { [key: string]: string[] } = {
        'manhã': ['06', '07', '08', '09', '10', '11'],
        'tarde': ['12', '13', '14', '15', '16', '17'],
        'noite': ['18', '19', '20', '21', '22', '23']
      };
      
      const horasValidas = turnoMap[filters.turno.toLowerCase()] || [];
      
      biddings = biddings.filter(b => {
        const hora = b.datahora_abertura.split(' ')[1]?.split(':')[0];
        return horasValidas.includes(hora);
      });
    }
    
    return biddings;
  }

  async getBidding(id: number): Promise<Bidding | undefined> {
    return this.biddings.get(id);
  }

  async getFavorites(userId: number): Promise<Bidding[]> {
    const userFavorites = Array.from(this.favorites.values())
      .filter(fav => fav.userId === userId);
    
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
    const favorite: Favorite = { ...insertFavorite, id };
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
}

export const storage = new MemStorage();
