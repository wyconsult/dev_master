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
  getBiddings(filters?: { number?: string; organization?: string }): Promise<Bidding[]>;
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

    // Create mock biddings
    const mockBiddings: Bidding[] = [
      {
        id: 1,
        number: "001/2024",
        title: "Pregão Eletrônico nº 001/2024",
        organization: "Prefeitura Municipal de São Paulo",
        object: "Aquisição de material de escritório",
        modality: "Pregão Eletrônico",
        estimatedValue: "R$ 150.000,00",
        openingDate: "15/03/2024 - 14:00h",
        status: "Em andamento"
      },
      {
        id: 2,
        number: "005/2024",
        title: "Concorrência Pública nº 005/2024",
        organization: "Governo do Estado de São Paulo",
        object: "Construção de ponte rodoviária",
        modality: "Concorrência Pública",
        estimatedValue: "R$ 2.500.000,00",
        openingDate: "22/03/2024 - 09:00h",
        status: "Agendada"
      },
      {
        id: 3,
        number: "012/2024",
        title: "Pregão Presencial nº 012/2024",
        organization: "Ministério da Educação",
        object: "Fornecimento de equipamentos de informática",
        modality: "Pregão Presencial",
        estimatedValue: "R$ 800.000,00",
        openingDate: "28/03/2024 - 10:00h",
        status: "Publicada"
      },
      {
        id: 4,
        number: "003/2024",
        title: "Tomada de Preços nº 003/2024",
        organization: "Autarquia Municipal",
        object: "Serviços de limpeza urbana",
        modality: "Tomada de Preços",
        estimatedValue: "R$ 450.000,00",
        openingDate: "05/04/2024 - 15:00h",
        status: "Em andamento"
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
