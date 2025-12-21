import { db } from './db.js';
import { users, biddings, boletins, filtros, favorites, acompanhamentos } from '@shared/schema';
import { eq, and, or, like, inArray, desc, sql } from 'drizzle-orm';
import type { User, InsertUser, Bidding, Boletim, Filtro, Favorite, InsertFavorite, Acompanhamento } from '@shared/schema';

export interface IDatabaseStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Filtros
  getFiltros(): Promise<Filtro[]>;
  
  // Boletins
  getBoletins(filtroId: number, page?: number, perPage?: number): Promise<{ boletins: Boletim[], total: number }>;
  getBoletim(id: number): Promise<{ boletim: Boletim, licitacoes: Bidding[], acompanhamentos: Acompanhamento[] } | undefined>;
  markBoletimAsViewed(id: number): Promise<void>;
  
  // Biddings
  getBiddings(filters?: { 
    conlicitacao_id?: string; 
    orgao?: string[]; 
    uf?: string[];
    numero_controle?: string;
  }): Promise<Bidding[]>;
  getBiddingsPaginated(filters?: { 
    conlicitacao_id?: string; 
    orgao?: string[]; 
    uf?: string[];
    numero_controle?: string;
  }, page?: number, limit?: number): Promise<{ biddings: Bidding[], total: number }>;
  getBiddingsCount(): Promise<number>;
  getBidding(id: number): Promise<Bidding | undefined>;
  getBiddingByConlicitacaoId(conlicitacaoId: number): Promise<Bidding | undefined>;
  
  // Favorites
  getFavorites(userId: number, date?: string, dateFrom?: string, dateTo?: string): Promise<(Favorite & { bidding?: Bidding })[]>;
  addFavorite(favorite: InsertFavorite, biddingData?: Partial<Bidding>): Promise<Favorite>;
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
}

export class DatabaseStorage implements IDatabaseStorage {
  private viewedBoletins: Set<number> = new Set();

  constructor() {
    console.log('💾 [DatabaseStorage] Inicializado - usando banco de dados MySQL');
  }

  // ==================== USERS ====================
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser);
    const insertId = (result as any)[0].insertId;
    const newUser = await this.getUser(insertId);
    if (!newUser) throw new Error('Erro ao criar usuário');
    return newUser;
  }

  // ==================== FILTROS ====================
  async getFiltros(): Promise<Filtro[]> {
    const result = await db.select().from(filtros);
    return result;
  }

  // ==================== BOLETINS ====================
  async getBoletins(filtroId: number, page: number = 1, perPage: number = 100): Promise<{ boletins: Boletim[], total: number }> {
    const offset = (page - 1) * perPage;
    
    const result = await db.select().from(boletins)
      .where(eq(boletins.filtro_id, filtroId))
      .orderBy(desc(boletins.id))
      .limit(perPage)
      .offset(offset);
    
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(boletins)
      .where(eq(boletins.filtro_id, filtroId));
    
    const total = countResult[0]?.count || 0;
    
    // Adicionar flag de visualizado
    const boletinsWithViewed = result.map(b => ({
      ...b,
      visualizado: this.viewedBoletins.has(b.id)
    }));
    
    return { boletins: boletinsWithViewed, total };
  }

  async getBoletim(id: number): Promise<{ boletim: Boletim, licitacoes: Bidding[], acompanhamentos: Acompanhamento[] } | undefined> {
    const boletimResult = await db.select().from(boletins).where(eq(boletins.id, id)).limit(1);
    if (!boletimResult[0]) return undefined;
    
    const licitacoesResult = await db.select().from(biddings).where(eq(biddings.boletim_id, id));
    const acompanhamentosResult = await db.select().from(acompanhamentos).where(eq(acompanhamentos.boletim_id, id));
    
    return {
      boletim: {
        ...boletimResult[0],
        visualizado: this.viewedBoletins.has(id),
        quantidade_licitacoes: licitacoesResult.length,
        quantidade_acompanhamentos: acompanhamentosResult.length
      },
      licitacoes: licitacoesResult,
      acompanhamentos: acompanhamentosResult
    };
  }

  async markBoletimAsViewed(id: number): Promise<void> {
    this.viewedBoletins.add(id);
    // Também atualizar no banco se a coluna existir
    try {
      await db.update(boletins).set({ visualizado: true }).where(eq(boletins.id, id));
    } catch (e) {
      // Ignora se a coluna não existir
    }
  }

  // ==================== BIDDINGS ====================
  async getBiddings(filters?: { 
    conlicitacao_id?: string; 
    orgao?: string[]; 
    uf?: string[];
    numero_controle?: string;
  }): Promise<Bidding[]> {
    let query = db.select().from(biddings);
    
    // Aplicar filtros básicos - por enquanto retorna todos limitado
    const result = await db.select().from(biddings).orderBy(desc(biddings.id)).limit(100);
    
    let filtered = result;
    
    if (filters?.conlicitacao_id) {
      filtered = filtered.filter(b =>
        b.conlicitacao_id.toString().includes(filters.conlicitacao_id!)
      );
    }

    if (filters?.orgao && filters.orgao.length > 0) {
      filtered = filtered.filter(b =>
        filters.orgao!.some(orgao =>
          b.orgao_nome?.toLowerCase().includes(orgao.toLowerCase())
        )
      );
    }

    if (filters?.uf && filters.uf.length > 0) {
      filtered = filtered.filter(b =>
        filters.uf!.includes(b.orgao_uf || '')
      );
    }

    return filtered;
  }

  async getBiddingsPaginated(filters?: {
    conlicitacao_id?: string;
    orgao?: string[];
    uf?: string[];
    numero_controle?: string;
  }, page: number = 1, limit: number = 50): Promise<{ biddings: Bidding[], total: number }> {
    const offset = (page - 1) * limit;

    const result = await db.select().from(biddings)
      .orderBy(desc(biddings.id))
      .limit(limit)
      .offset(offset);

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(biddings);
    const total = countResult[0]?.count || 0;

    let filtered = result;

    if (filters?.conlicitacao_id) {
      filtered = filtered.filter(b =>
        b.conlicitacao_id.toString().includes(filters.conlicitacao_id!)
      );
    }

    if (filters?.orgao && filters.orgao.length > 0) {
      filtered = filtered.filter(b =>
        filters.orgao!.some(orgao =>
          b.orgao_nome?.toLowerCase().includes(orgao.toLowerCase())
        )
      );
    }

    if (filters?.uf && filters.uf.length > 0) {
      filtered = filtered.filter(b =>
        filters.uf!.includes(b.orgao_uf || '')
      );
    }

    return { biddings: filtered, total };
  }

  async getBiddingsCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(biddings);
    return result[0]?.count || 0;
  }

  async getBidding(id: number): Promise<Bidding | undefined> {
    const result = await db.select().from(biddings).where(eq(biddings.id, id)).limit(1);
    return result[0];
  }

  async getBiddingByConlicitacaoId(conlicitacaoId: number): Promise<Bidding | undefined> {
    const result = await db.select().from(biddings)
      .where(eq(biddings.conlicitacao_id, conlicitacaoId))
      .limit(1);
    return result[0];
  }

  // ==================== FAVORITES ====================
  async getFavorites(userId: number, date?: string, dateFrom?: string, dateTo?: string): Promise<(Favorite & { bidding?: Bidding })[]> {
    let result = await db.select().from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));

    // Filtrar por data se especificado
    if (date) {
      result = result.filter(fav => {
        if (!fav.createdAt) return false;
        const favDate = new Date(fav.createdAt).toISOString().split('T')[0];
        return favDate === date;
      });
    }

    if (dateFrom) {
      result = result.filter(fav => {
        if (!fav.createdAt) return false;
        const favDate = new Date(fav.createdAt).toISOString().split('T')[0];
        return favDate >= dateFrom;
      });
    }

    if (dateTo) {
      result = result.filter(fav => {
        if (!fav.createdAt) return false;
        const favDate = new Date(fav.createdAt).toISOString().split('T')[0];
        return favDate <= dateTo;
      });
    }

    // Buscar dados das licitações associadas
    const favoritesWithBiddings = await Promise.all(
      result.map(async (fav) => {
        // Primeiro tentar buscar pelo conlicitacao_id armazenado no favorito
        let bidding: Bidding | undefined;

        if ((fav as any).conlicitacao_id) {
          bidding = await this.getBiddingByConlicitacaoId((fav as any).conlicitacao_id);
        }

        // Se não encontrou, tentar pelo biddingId
        if (!bidding) {
          bidding = await this.getBiddingByConlicitacaoId(fav.biddingId);
        }

        return {
          ...fav,
          bidding
        };
      })
    );

    return favoritesWithBiddings;
  }

  async addFavorite(insertFavorite: InsertFavorite, biddingData?: Partial<Bidding>): Promise<Favorite> {
    // Verificar se já existe
    const existing = await db.select().from(favorites)
      .where(and(
        eq(favorites.userId, insertFavorite.userId),
        eq(favorites.biddingId, insertFavorite.biddingId)
      ))
      .limit(1);

    if (existing[0]) {
      return existing[0];
    }

    // Inserir novo favorito com dados da licitação
    const favoriteToInsert: any = {
      ...insertFavorite,
      createdAt: new Date(),
    };

    // Adicionar dados da licitação se fornecidos
    if (biddingData) {
      favoriteToInsert.objeto = biddingData.objeto;
      favoriteToInsert.datahora_abertura = biddingData.datahora_abertura;
      favoriteToInsert.orgao_cidade = biddingData.orgao_cidade;
      favoriteToInsert.edital = biddingData.edital;
      favoriteToInsert.link_edital = biddingData.link_edital;
      favoriteToInsert.situacao = biddingData.situacao;
      favoriteToInsert.conlicitacao_id = biddingData.conlicitacao_id;
    }

    const result = await db.insert(favorites).values(favoriteToInsert);
    const insertId = (result as any)[0].insertId;

    const newFavorite = await db.select().from(favorites).where(eq(favorites.id, insertId)).limit(1);
    if (!newFavorite[0]) throw new Error('Erro ao criar favorito');

    return newFavorite[0];
  }

  async removeFavorite(userId: number, biddingId: number): Promise<void> {
    await db.delete(favorites).where(
      and(
        eq(favorites.userId, userId),
        eq(favorites.biddingId, biddingId)
      )
    );
  }

  async isFavorite(userId: number, biddingId: number): Promise<boolean> {
    const result = await db.select().from(favorites)
      .where(and(
        eq(favorites.userId, userId),
        eq(favorites.biddingId, biddingId)
      ))
      .limit(1);

    return result.length > 0;
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
    const updateData: any = {};

    if (data.category !== undefined) updateData.category = data.category;
    if (data.customCategory !== undefined) updateData.customCategory = data.customCategory;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.uf !== undefined) updateData.uf = data.uf;
    if (data.codigoUasg !== undefined) updateData.codigoUasg = data.codigoUasg;
    if (data.valorEstimado !== undefined) updateData.valorEstimado = data.valorEstimado;
    if (data.fornecedor !== undefined) updateData.fornecedor = data.fornecedor;
    if (data.site !== undefined) updateData.site = data.site;

    await db.update(favorites)
      .set(updateData)
      .where(and(
        eq(favorites.userId, userId),
        eq(favorites.biddingId, biddingId)
      ));
  }
}

// Instância singleton
export const databaseStorage = new DatabaseStorage();

