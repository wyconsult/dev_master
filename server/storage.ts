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
import { db } from "./db";
import { eq, and, gte, lte } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(email: string, hashedPassword: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Biddings
  getBiddings(filters?: { 
    conlicitacao_id?: string; 
    orgao?: string[]; 
    uf?: string[];
    numero_controle?: string;
  }): Promise<Bidding[]>;
  getBidding(id: number): Promise<Bidding | undefined>;
  
  // Favorites
  getFavorites(userId: number, date?: string, dateFrom?: string, dateTo?: string): Promise<Bidding[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: number, biddingId: number): Promise<void>;
  isFavorite(userId: number, biddingId: number): Promise<boolean>;
  updateFavoriteCategorization(userId: number, biddingId: number, data: {
    category?: string;
    customCategory?: string;
    notes?: string;
    uf?: string;
    codigoUasg?: string;
    valorEstimado?: string;
    fornecedor?: string;
    site?: string;
  }): Promise<void>;
  
  // Boletins
  getBoletins(): Promise<Boletim[]>;
  getBoletinsByDate(date: string): Promise<Boletim[]>;
  getBoletim(id: number): Promise<Boletim | undefined>;
  markBoletimAsViewed(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserPassword(email: string, hashedPassword: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.email, email))
      .returning();
    return updatedUser || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getBiddings(filters?: { 
    conlicitacao_id?: string; 
    orgao?: string[]; 
    uf?: string[];
    numero_controle?: string;
  }): Promise<Bidding[]> {
    // Basic implementation - can be enhanced with filters
    return await db.select().from(biddings);
  }

  async getBidding(id: number): Promise<Bidding | undefined> {
    const [bidding] = await db.select().from(biddings).where(eq(biddings.id, id));
    return bidding || undefined;
  }

  async getFavorites(userId: number, date?: string, dateFrom?: string, dateTo?: string): Promise<Bidding[]> {
    const query = db
      .select({
        id: biddings.id,
        conlicitacao_id: biddings.conlicitacao_id,
        edital: biddings.edital,
        objeto: biddings.objeto,
        orgao_nome: biddings.orgao_nome,
        orgao_codigo: biddings.orgao_codigo,
        orgao_uf: biddings.orgao_uf,
        modalidade: biddings.modalidade,
        datahora_abertura: biddings.datahora_abertura,
        datahora_prazo: biddings.datahora_prazo,
        datahora_documento: biddings.datahora_documento,
        datahora_retirada: biddings.datahora_retirada,
        datahora_visita: biddings.datahora_visita,
        valor_estimado: biddings.valor_estimado,
        situacao: biddings.situacao,
        createdAt: biddings.createdAt,
        // Include favorite data
        favoriteId: favorites.id,
        category: favorites.category,
        customCategory: favorites.customCategory,
        notes: favorites.notes,
        uf: favorites.uf,
        codigoUasg: favorites.codigoUasg,
        valorEstimado: favorites.valorEstimado,
        fornecedor: favorites.fornecedor,
        site: favorites.site,
        createdAtFavorite: favorites.createdAt
      })
      .from(favorites)
      .innerJoin(biddings, eq(favorites.biddingId, biddings.id))
      .where(eq(favorites.userId, userId));

    let conditions = [eq(favorites.userId, userId)];
    
    if (dateFrom && dateTo) {
      const startDate = new Date(dateFrom + 'T00:00:00Z');
      const endDate = new Date(dateTo + 'T23:59:59Z');
      conditions.push(
        and(
          gte(favorites.createdAt, startDate),
          lte(favorites.createdAt, endDate)
        )!
      );
    }

    const result = await query.where(and(...conditions));
    return result as any[]; // Cast to match expected type
  }

  async addFavorite(favorite: InsertFavorite): Promise<Favorite> {
    const [newFavorite] = await db
      .insert(favorites)
      .values(favorite)
      .returning();
    return newFavorite;
  }

  async removeFavorite(userId: number, biddingId: number): Promise<void> {
    await db
      .delete(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.biddingId, biddingId)
        )
      );
  }

  async isFavorite(userId: number, biddingId: number): Promise<boolean> {
    const [favorite] = await db
      .select()
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.biddingId, biddingId)
        )
      )
      .limit(1);
    
    return !!favorite;
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
  }): Promise<void> {
    await db
      .update(favorites)
      .set(data)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.biddingId, biddingId)
        )
      );
  }

  async getBoletins(): Promise<Boletim[]> {
    return await db.select().from(boletins);
  }

  async getBoletinsByDate(date: string): Promise<Boletim[]> {
    return await db.select().from(boletins);
  }

  async getBoletim(id: number): Promise<Boletim | undefined> {
    const [boletim] = await db.select().from(boletins).where(eq(boletins.id, id));
    return boletim || undefined;
  }

  async markBoletimAsViewed(id: number): Promise<void> {
    // Implementation for marking boletim as viewed
  }
}

export class MemStorage implements IStorage {
  private users = new Map<number, User>();
  private biddings = new Map<number, Bidding>();
  private favorites = new Map<number, Favorite>();
  private nextUserId = 1;
  private nextBiddingId = 1;
  private nextFavoriteId = 1;

  constructor() {
    // Pre-populate with admin user
    this.users.set(1, {
      id: 1,
      nomeEmpresa: "JLG Consultoria",
      cnpj: "12345678901234",
      nome: "Administrador",
      email: "admin@jlg.com",
      password: "$2b$10$abcdefghijklmnopqrstuvwxyz12345", // admin123 hashed
      createdAt: new Date()
    });
    this.nextUserId = 2;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      ...user,
      id: this.nextUserId++,
      createdAt: new Date()
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async updateUserPassword(email: string, hashedPassword: string): Promise<User | undefined> {
    const user = await this.getUserByEmail(email);
    if (user) {
      user.password = hashedPassword;
      this.users.set(user.id, user);
      return user;
    }
    return undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getBiddings(): Promise<Bidding[]> {
    return Array.from(this.biddings.values());
  }

  async getBidding(id: number): Promise<Bidding | undefined> {
    return this.biddings.get(id);
  }

  async getFavorites(userId: number): Promise<Bidding[]> {
    const userFavorites = Array.from(this.favorites.values())
      .filter(fav => fav.userId === userId);
    
    const favoriteBiddings: Bidding[] = [];
    for (const favorite of userFavorites) {
      const bidding = this.biddings.get(favorite.biddingId);
      if (bidding) {
        // Extend bidding with favorite data
        favoriteBiddings.push({
          ...bidding,
          favoriteId: favorite.id,
          category: favorite.category,
          customCategory: favorite.customCategory,
          notes: favorite.notes,
          uf: favorite.uf,
          codigoUasg: favorite.codigoUasg,
          valorEstimado: favorite.valorEstimado,
          fornecedor: favorite.fornecedor,
          site: favorite.site,
          createdAtFavorite: favorite.createdAt
        } as any);
      }
    }
    
    return favoriteBiddings;
  }

  async addFavorite(favorite: InsertFavorite): Promise<Favorite> {
    const id = this.nextFavoriteId++;
    const newFavorite: Favorite = {
      ...favorite,
      id,
      createdAt: new Date()
    };
    this.favorites.set(id, newFavorite);
    return newFavorite;
  }

  async removeFavorite(userId: number, biddingId: number): Promise<void> {
    const favoriteToRemove = Array.from(this.favorites.values())
      .find(fav => fav.userId === userId && fav.biddingId === biddingId);
    
    if (favoriteToRemove) {
      this.favorites.delete(favoriteToRemove.id);
    }
  }

  async isFavorite(userId: number, biddingId: number): Promise<boolean> {
    return Array.from(this.favorites.values())
      .some(fav => fav.userId === userId && fav.biddingId === biddingId);
  }

  async getBoletins(): Promise<Boletim[]> {
    // No local boletins - should use ConLicitação API only
    return [];
  }

  async getBoletinsByDate(date: string): Promise<Boletim[]> {
    return [];
  }

  async getBoletim(id: number): Promise<Boletim | undefined> {
    return undefined;
  }

  async markBoletimAsViewed(id: number): Promise<void> {
    // Implementation not needed for API-only system
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
  }): Promise<void> {
    const favoriteToUpdate = Array.from(this.favorites.entries())
      .find(([_, fav]) => fav.userId === userId && fav.biddingId === biddingId);
    
    if (favoriteToUpdate) {
      const [favoriteId, existingFavorite] = favoriteToUpdate;
      this.favorites.set(favoriteId, { ...existingFavorite, ...data });
    }
  }
}

// Usar DatabaseStorage se temos DATABASE_URL (Replit/Produção), senão MemStorage  
const hasDatabase = !!process.env.DATABASE_URL;
console.log('🔧 [STORAGE] Configurando storage:', {
  NODE_ENV: process.env.NODE_ENV,
  hasDatabase,
  storageType: hasDatabase ? 'PostgreSQL (DatabaseStorage)' : 'Memory (MemStorage)'
});

export const storage = hasDatabase ? new DatabaseStorage() : new MemStorage();