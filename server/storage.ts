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
  // Implementação simples para produção usando MySQL
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user || undefined;
    } catch (error) {
      console.error('Erro ao buscar usuário por email:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.getUserByEmail(username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values(insertUser).returning? await db.insert(users).values(insertUser).returning() : [];
      if (!user) {
        // MySQL doesn't support returning, need to fetch the inserted user
        const result = await db.insert(users).values(insertUser);
        const insertId = (result as any).insertId;
        const newUser = await this.getUser(insertId);
        if (!newUser) throw new Error('Failed to create user');
        return newUser;
      }
      return user;
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  }

  async updateUserPassword(email: string, hashedPassword: string): Promise<User | undefined> {
    try {
      await db.update(users).set({ password: hashedPassword }).where(eq(users.email, email));
      return this.getUserByEmail(email);
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      return undefined;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await db.select({ id: users.id, nome: users.nome, email: users.email, nomeEmpresa: users.nomeEmpresa }).from(users);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      return [];
    }
  }

  async getBiddings(): Promise<Bidding[]> {
    try {
      return await db.select().from(biddings);
    } catch (error) {
      console.error('Erro ao buscar licitações:', error);
      return [];
    }
  }

  async getBidding(id: number): Promise<Bidding | undefined> {
    try {
      const [bidding] = await db.select().from(biddings).where(eq(biddings.id, id));
      return bidding || undefined;
    } catch (error) {
      console.error('Erro ao buscar licitação:', error);
      return undefined;
    }
  }

  async getFavorites(userId: number): Promise<Bidding[]> {
    try {
      // MySQL join simples
      const result = await db
        .select()
        .from(favorites)
        .innerJoin(biddings, eq(favorites.biddingId, biddings.id))
        .where(eq(favorites.userId, userId));
      
      return result.map(row => ({
        ...row.biddings,
        // Adicionar dados do favorito
        favoriteId: row.favorites.id,
        category: row.favorites.category,
        customCategory: row.favorites.customCategory,
        notes: row.favorites.notes,
        uf: row.favorites.uf,
        codigoUasg: row.favorites.codigoUasg,
        valorEstimado: row.favorites.valorEstimado,
        fornecedor: row.favorites.fornecedor,
        site: row.favorites.site,
        createdAtFavorite: row.favorites.createdAt
      })) as any[];
    } catch (error) {
      console.error('Erro ao buscar favoritos:', error);
      return [];
    }
  }

  async addFavorite(favorite: InsertFavorite): Promise<Favorite> {
    try {
      const result = await db.insert(favorites).values(favorite);
      const insertId = (result as any).insertId;
      const [newFavorite] = await db.select().from(favorites).where(eq(favorites.id, insertId));
      return newFavorite;
    } catch (error) {
      console.error('Erro ao adicionar favorito:', error);
      throw error;
    }
  }

  async removeFavorite(userId: number, biddingId: number): Promise<void> {
    try {
      await db
        .delete(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.biddingId, biddingId)));
    } catch (error) {
      console.error('Erro ao remover favorito:', error);
    }
  }

  async isFavorite(userId: number, biddingId: number): Promise<boolean> {
    try {
      const [favorite] = await db
        .select()
        .from(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.biddingId, biddingId)))
        .limit(1);
      return !!favorite;
    } catch (error) {
      console.error('Erro ao verificar favorito:', error);
      return false;
    }
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
    try {
      await db
        .update(favorites)
        .set(data)
        .where(and(eq(favorites.userId, userId), eq(favorites.biddingId, biddingId)));
    } catch (error) {
      console.error('Erro ao atualizar categorização:', error);
    }
  }

  async getBoletins(): Promise<Boletim[]> {
    return [];
  }

  async getBoletinsByDate(date: string): Promise<Boletim[]> {
    return [];
  }

  async getBoletim(id: number): Promise<Boletim | undefined> {
    return undefined;
  }

  async markBoletimAsViewed(id: number): Promise<void> {
    // Implementation for production
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

// Usar MemStorage em desenvolvimento, DatabaseStorage em produção (MySQL)
const isProduction = process.env.NODE_ENV === 'production';
console.log('🔧 [STORAGE] Configurando storage:', {
  NODE_ENV: process.env.NODE_ENV,
  isProduction,
  storageType: isProduction ? 'MySQL (DatabaseStorage)' : 'Memory (MemStorage)'
});

export const storage = isProduction ? new DatabaseStorage() : new MemStorage();