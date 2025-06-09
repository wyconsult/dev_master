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

    // Create mock biddings based on ConLicitação API documentation
    const mockBiddings: Bidding[] = [
      {
        id: 1,
        orgao: "Prefeitura Municipal de Marechal Cândido Rondon",
        codigo: "987683",
        cidade: "Marechal Cândido Rondon",
        uf: "PR",
        endereco: "Rua Espírito Santo, 777",
        telefone: "",
        site: "",
        objeto: "Aquisição de pneus, câmaras de ar e acessórios relacionados para manutenção dos veículos pertencentes à Frota Municipal",
        situacao: "NOVA",
        datahora_abertura: "2020-11-26 08:30:00",
        datahora_documento: "",
        datahora_retirada: "",
        datahora_visita: "",
        datahora_prazo: "",
        edital: "PE/118/2020",
        link_edital: "/boletim_web/public/api/download?auth=token",
        processo: "",
        observacao: "Edital a partir de: 11/11/2020 das 08:00 às 11:45 Hs e das 13:15 às 17:00 Hs",
        item: "PNEU PARA VEÍCULO AUTOMOTIVO, PNEU PARA CARRINHO DE MÃO",
        preco_edital: "0.00",
        valor_estimado: "0.00",
        conlicitacao_id: 13157470
      },
      {
        id: 2,
        orgao: "Superintendência Estadual de Licitações - SUPEL",
        codigo: "925373",
        cidade: "Porto Velho",
        uf: "RO",
        endereco: "Av. Rio Madeira N° 3056 - Flodoaldo Pontes Pinto",
        telefone: "",
        site: "",
        objeto: "Registro de Preços para futuras aquisição de material permanente Conjuntos de Máquinas Vibratórias e Carro para Transporte de Tubos de Concretos",
        situacao: "NOVA",
        datahora_abertura: "2020-11-27 09:00:00",
        datahora_documento: "",
        datahora_retirada: "",
        datahora_visita: "",
        datahora_prazo: "",
        edital: "PE/475/2020",
        link_edital: "/boletim_web/public/api/download?auth=token2",
        processo: "",
        observacao: "Edital a partir de: 11/11/2020 das 08:00 às 12:00 Hs e das 14:00 às 17:59 Hs",
        item: "Conjunto de máquina vibratória para fabricação de tubos de concreto completa",
        preco_edital: "0.00",
        valor_estimado: "0.00",
        conlicitacao_id: 13157519
      },
      {
        id: 3,
        orgao: "Prefeitura Municipal de Santos",
        codigo: "354810",
        cidade: "Santos",
        uf: "SP",
        endereco: "Praça Mauá, 10",
        telefone: "(13) 3201-5000",
        site: "www.santos.sp.gov.br",
        objeto: "Fornecimento de equipamentos de informática e periféricos para atendimento das necessidades da administração municipal",
        situacao: "ABERTA",
        datahora_abertura: "2024-03-28 10:00:00",
        datahora_documento: "2024-03-25 17:00:00",
        datahora_retirada: "2024-03-20 08:00:00",
        datahora_visita: "",
        datahora_prazo: "2024-03-28 10:00:00",
        edital: "PP/012/2024",
        link_edital: "https://santos.sp.gov.br/editais/pp012-2024",
        processo: "2024/001234",
        observacao: "Edital disponível no site oficial da prefeitura",
        item: "Computadores, impressoras, monitores e acessórios diversos",
        preco_edital: "250000.00",
        valor_estimado: "230000.00",
        conlicitacao_id: 13157600
      },
      {
        id: 4,
        orgao: "Governo do Estado de São Paulo",
        codigo: "550001",
        cidade: "São Paulo",
        uf: "SP",
        endereco: "Palácio dos Bandeirantes",
        telefone: "(11) 2193-8000",
        site: "www.sp.gov.br",
        objeto: "Prestação de serviços de limpeza urbana e coleta seletiva para órgãos estaduais",
        situacao: "EM_ANALISE",
        datahora_abertura: "2024-04-05 15:00:00",
        datahora_documento: "2024-04-02 17:00:00",
        datahora_retirada: "2024-03-28 08:00:00",
        datahora_visita: "2024-04-01 14:00:00",
        datahora_prazo: "2024-04-05 15:00:00",
        edital: "TP/003/2024",
        link_edital: "https://compras.sp.gov.br/edital/tp003-2024",
        processo: "2024/SP/005678",
        observacao: "Documentação em análise pela comissão julgadora",
        item: "Serviços de limpeza, coleta de resíduos e manutenção de áreas verdes",
        preco_edital: "1500000.00",
        valor_estimado: "1400000.00",
        conlicitacao_id: 13157701
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
