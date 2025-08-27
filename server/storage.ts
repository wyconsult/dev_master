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
    try {
      console.log('🗺️ [DatabaseStorage] Tentando inserir usuário:', {
        nomeEmpresa: insertUser.nomeEmpresa,
        cnpj: insertUser.cnpj,
        nome: insertUser.nome,
        email: insertUser.email
      });
      
      // Usar query direta do MySQL para garantir que o insertId retorne
      const { db: dbInstance } = await import('./db');
      const connection = await dbInstance.execute(`
        INSERT INTO users (nome_empresa, cnpj, nome, email, password, created_at) 
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [
        insertUser.nomeEmpresa,
        insertUser.cnpj,
        insertUser.nome,
        insertUser.email,
        insertUser.password
      ]);
      
      console.log('✅ [DatabaseStorage] Insert realizado, resultado:', connection);
      
      // Para MySQL2, o insertId está em connection[0].insertId
      const insertId = connection[0].insertId as number;
      console.log('🆔 [DatabaseStorage] ID gerado:', insertId);
      
      if (!insertId || isNaN(Number(insertId))) {
        throw new Error('Falha ao obter ID do usuário inserido');
      }
      
      // Buscar o usuário inserido para retornar com dados completos
      const user = await this.getUser(Number(insertId));
      console.log('✅ [DatabaseStorage] Usuário criado:', user?.id);
      
      if (!user) {
        throw new Error('Usuário inserido mas não encontrado');
      }
      
      return user;
    } catch (error) {
      console.error('❌ [DatabaseStorage] ERRO ao criar usuário:', {
        error: error,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        insertUser: insertUser
      });
      throw error;
    }
  }

  async updateUserPassword(email: string, hashedPassword: string): Promise<User | undefined> {
    // MySQL não suporta .returning(), precisaria de implementação diferente
    await db.update(users).set({ password: hashedPassword }).where(eq(users.email, email));
    return await this.getUserByEmail(email);
  }

  async getBiddings(filters?: { 
    conlicitacao_id?: string; 
    orgao?: string[]; 
    uf?: string[];
    numero_controle?: string;
  }): Promise<Bidding[]> {
    // Para manter compatibilidade, retorna dados do ConLicitacaoStorage
    return [];
  }

  async getBidding(id: number): Promise<Bidding | undefined> {
    const [bidding] = await db.select().from(biddings).where(eq(biddings.id, id));
    return bidding || undefined;
  }

  async getFavorites(userId: number, date?: string, dateFrom?: string, dateTo?: string): Promise<Bidding[]> {
    let conditions = [eq(favorites.userId, userId)];

    // Aplicar filtros de data na data de criação do favorito
    if (date) {
      const startDate = new Date(date + "T00:00:00");
      const endDate = new Date(date + "T23:59:59");
      conditions.push(gte(favorites.createdAt, startDate));
      conditions.push(lte(favorites.createdAt, endDate));
    } else if (dateFrom || dateTo) {
      if (dateFrom) {
        const startDate = new Date(dateFrom + "T00:00:00");
        conditions.push(gte(favorites.createdAt, startDate));
      }
      
      if (dateTo) {
        const endDate = new Date(dateTo + "T23:59:59");
        conditions.push(lte(favorites.createdAt, endDate));
      }
    }

    const favoritesList = await db.select().from(favorites).where(and(...conditions));
    
    // Buscar dados das licitações do ConLicitacaoStorage
    const biddingsWithFavoriteData: Bidding[] = [];
    const { conLicitacaoStorage } = await import("./conlicitacao-storage");
    
    for (const fav of favoritesList) {
      const bidding = await conLicitacaoStorage.getBidding(fav.biddingId);
      if (bidding) {
        // Incluir dados de categorização no bidding
        const biddingWithCategorization = {
          ...bidding,
          category: fav.category,
          customCategory: fav.customCategory,
          notes: fav.notes,
          uf: fav.uf,
          codigoUasg: fav.codigoUasg,
          valorEstimado: fav.valorEstimado,
          fornecedor: fav.fornecedor,
          site: fav.site,
          createdAt: fav.createdAt
        } as any;
        
        biddingsWithFavoriteData.push(biddingWithCategorization);
      }
    }
    
    return biddingsWithFavoriteData;
  }

  async addFavorite(favorite: InsertFavorite): Promise<Favorite> {
    const result = await db.insert(favorites).values(favorite);
    const insertId = Number(result.insertId);
    
    // Buscar o favorito inserido para retornar com dados completos
    const [insertedFavorite] = await db.select().from(favorites).where(eq(favorites.id, insertId));
    return insertedFavorite;
  }

  async removeFavorite(userId: number, biddingId: number): Promise<void> {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.biddingId, biddingId)));
  }

  async isFavorite(userId: number, biddingId: number): Promise<boolean> {
    const [favorite] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.biddingId, biddingId)));
    return !!favorite;
  }

  async getBoletins(): Promise<Boletim[]> {
    return await db.select().from(boletins);
  }

  async getBoletinsByDate(date: string): Promise<Boletim[]> {
    // Implementar filtro por data se necessário
    return await db.select().from(boletins);
  }

  async getBoletim(id: number): Promise<Boletim | undefined> {
    const [boletim] = await db.select().from(boletins).where(eq(boletins.id, id));
    return boletim || undefined;
  }

  async markBoletimAsViewed(id: number): Promise<void> {
    await db
      .update(boletins)
      .set({ visualizado: true })
      .where(eq(boletins.id, id));
  }
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

  private async initializeMockData() {
    // Criar usuário inicial para login
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const adminUser: User = {
      id: 1,
      nomeEmpresa: "JLG Consultoria",
      cnpj: "12345678000100",
      nome: "Administrador",
      email: "admin@jlg.com",
      password: hashedPassword,
      createdAt: new Date()
    };
    this.users.set(1, adminUser);
    this.currentUserId = 2;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id, createdAt: new Date() };
    this.users.set(id, user);
    return user;
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

  async getBiddings(filters?: { 
    conlicitacao_id?: string; 
    orgao?: string[]; 
    uf?: string[];
    numero_controle?: string;
  }): Promise<Bidding[]> {
    // No local biddings - should use ConLicitação API only
    return [];
  }

  async getBidding(id: number): Promise<Bidding | undefined> {
    return undefined;
  }

  async getFavorites(userId: number, date?: string, dateFrom?: string, dateTo?: string): Promise<Bidding[]> {
    return [];
  }

  async addFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    const id = this.currentFavoriteId++;
    const favorite: Favorite = { 
      ...insertFavorite, 
      id, 
      createdAt: new Date(),
      category: insertFavorite.category || null,
      customCategory: insertFavorite.customCategory || null,
      notes: insertFavorite.notes || null,
      uf: insertFavorite.uf || null,
      codigoUasg: insertFavorite.codigoUasg || null,
      valorEstimado: insertFavorite.valorEstimado || null,
      fornecedor: insertFavorite.fornecedor || null,
      site: insertFavorite.site || null
    };
    this.favorites.set(id, favorite);
    return favorite;
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
}

// Usar MySQL em produção, MemStorage em desenvolvimento
const isProduction = process.env.NODE_ENV === 'production';
console.log('🔧 [STORAGE] Configurando storage:', {
  NODE_ENV: process.env.NODE_ENV,
  isProduction,
  storageType: isProduction ? 'MySQL (DatabaseStorage)' : 'Memory (MemStorage)'
});

export const storage = isProduction ? new DatabaseStorage() : new MemStorage();
