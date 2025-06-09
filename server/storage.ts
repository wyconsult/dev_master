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
  getBiddings(filters?: { conLicitationNumber?: string; organization?: string; shift?: string }): Promise<Bidding[]>;
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

    // Create mock biddings based on new API structure
    const mockBiddings: Bidding[] = [
      {
        id: 1,
        object: "Aquisição de material de escritório para departamentos administrativos",
        dates: "Abertura: 15/03/2024 14:00h | Encerramento: 20/03/2024 17:00h",
        situation: "Em andamento",
        edital: "PE001/2024",
        conLicitationNumber: "001/2024",
        organization: "Prefeitura Municipal de São Paulo",
        sessionStatus: "Sessão pública agendada",
        city: "São Paulo - SP",
        link: "https://compras.sp.gov.br/licitacao/001-2024",
        shift: "Tarde"
      },
      {
        id: 2,
        object: "Construção de ponte rodoviária na rodovia SP-125",
        dates: "Abertura: 22/03/2024 09:00h | Encerramento: 10/04/2024 16:00h",
        situation: "Agendada",
        edital: "CP005/2024",
        conLicitationNumber: "005/2024",
        organization: "Governo do Estado de São Paulo",
        sessionStatus: "Aguardando abertura",
        city: "Campinas - SP",
        link: "https://compras.sp.gov.br/licitacao/005-2024",
        shift: "Manhã"
      },
      {
        id: 3,
        object: "Fornecimento de equipamentos de informática e periféricos",
        dates: "Abertura: 28/03/2024 10:00h | Encerramento: 05/04/2024 15:00h",
        situation: "Publicada",
        edital: "PP012/2024",
        conLicitationNumber: "012/2024",
        organization: "Ministério da Educação",
        sessionStatus: "Edital publicado",
        city: "Brasília - DF",
        link: "https://compras.gov.br/licitacao/012-2024",
        shift: "Manhã"
      },
      {
        id: 4,
        object: "Prestação de serviços de limpeza urbana e coleta seletiva",
        dates: "Abertura: 05/04/2024 15:00h | Encerramento: 15/04/2024 12:00h",
        situation: "Em análise",
        edital: "TP003/2024",
        conLicitationNumber: "003/2024",
        organization: "Prefeitura Municipal de Santos",
        sessionStatus: "Documentação em análise",
        city: "Santos - SP",
        link: "https://compras.santos.sp.gov.br/licitacao/003-2024",
        shift: "Noite"
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

  async getBiddings(filters?: { number?: string; organization?: string }): Promise<Bidding[]> {
    let biddings = Array.from(this.biddings.values());
    
    if (filters?.number) {
      biddings = biddings.filter(b => 
        b.number.toLowerCase().includes(filters.number!.toLowerCase())
      );
    }
    
    if (filters?.organization) {
      biddings = biddings.filter(b => 
        b.organization.toLowerCase().includes(filters.organization!.toLowerCase())
      );
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
