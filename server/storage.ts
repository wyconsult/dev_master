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
  getUsers(): Promise<User[]>;
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
  updateFavoriteCategorization(userId: number, biddingId: number, data: {
    category?: string;
    customCategory?: string;
    notes?: string;
    uf?: string;
    codigoUasg?: string;
    valorEstimado?: string;
    fornecedor?: string;
    site?: string;
    orgaoLicitante?: string;
    status?: string;
  }): Promise<void>;
  
  // Boletins
  getBoletins(): Promise<Boletim[]>;
  getBoletinsByDate(date: string): Promise<Boletim[]>;
  getBoletim(id: number): Promise<Boletim | undefined>;
  markBoletimAsViewed(id: number): Promise<void>;
}

import { conLicitacaoStorage } from "./conlicitacao-storage";

export class DatabaseStorage implements IStorage {
  constructor() {
    this.seedDefaultUser();
  }

  private async seedDefaultUser() {
    try {
      const existingUser = await this.getUser(1);
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash("admin123", 10);
        await db.insert(users).values({
          id: 1,
          nomeEmpresa: "JLG Consultoria",
          cnpj: "12345678000100",
          nome: "Administrador",
          email: "admin@jlg.com",
          password: hashedPassword,
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error('❌ [Seed] Erro ao criar usuário padrão:', error);
    }
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

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
      // Importar o pool do MySQL2 diretamente
      const mysql = await import('mysql2/promise');
      const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'geovani',
        password: process.env.DB_PASSWORD || 'Vermelho006@',
        database: process.env.DB_NAME || 'jlg_consultoria',
      });
      
      const connection = await pool.execute(`
        INSERT INTO users (nome_empresa, cnpj, nome, email, password, created_at) 
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [
        insertUser.nomeEmpresa,
        insertUser.cnpj,
        insertUser.nome,
        insertUser.email,
        insertUser.password
      ]);
      
      // Para MySQL2, o insertId está em connection[0].insertId
      const insertId = (connection[0] as any).insertId as number;
      
      await pool.end(); // Fechar pool temporário
      
      if (!insertId || isNaN(Number(insertId))) {
        throw new Error('Falha ao obter ID do usuário inserido');
      }
      
      // Buscar o usuário inserido para retornar com dados completos
      const user = await this.getUser(Number(insertId));
      
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
    return await conLicitacaoStorage.getBiddings(filters);
  }

  async getBidding(id: number): Promise<Bidding | undefined> {
    return await conLicitacaoStorage.getBidding(id);
  }

  async getFavorites(userId: number, date?: string, dateFrom?: string, dateTo?: string): Promise<Bidding[]> {
    return await conLicitacaoStorage.getFavorites(userId, date, dateFrom, dateTo);
  }

  async addFavorite(favorite: InsertFavorite): Promise<Favorite> {
    // Garantir que a licitação existe no banco antes de favoritar
    const bidding = await conLicitacaoStorage.getBidding(favorite.biddingId);
    if (bidding) {
      await conLicitacaoStorage.pinBidding(bidding);
    }
    return await conLicitacaoStorage.addFavorite(favorite);
  }

  async removeFavorite(userId: number, biddingId: number): Promise<void> {
    await conLicitacaoStorage.removeFavorite(userId, biddingId);
  }

  async isFavorite(userId: number, biddingId: number): Promise<boolean> {
    return await conLicitacaoStorage.isFavorite(userId, biddingId);
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
    orgaoLicitante?: string;
    status?: string;
  }): Promise<void> {
    await conLicitacaoStorage.updateFavoriteCategorization(userId, biddingId, data);
  }

  async getBoletins(): Promise<Boletim[]> {
    return await db.select().from(boletins);
  }

  async getBoletinsByDate(date: string): Promise<Boletim[]> {
    // Implementar filtro por data se necessário
    return await db.select().from(boletins);
  }

  async getBoletim(id: number): Promise<Boletim | undefined> {
    const result = await conLicitacaoStorage.getBoletim(id);
    return result?.boletim;
  }

  async markBoletimAsViewed(id: number): Promise<void> {
    await conLicitacaoStorage.markBoletimAsViewed(id);
  }
}

export const storage = new DatabaseStorage();
