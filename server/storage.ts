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
    // Delegar para ConLicitacaoStorage para obter dados (mock/API)
    try {
      const { conLicitacaoStorage } = await import("./conlicitacao-storage");
      // Usar caminho não paginado simples para compatibilidade
      const biddings = await conLicitacaoStorage.getBiddings(filters);
      return biddings;
    } catch (error) {
      console.warn('⚠️ [DatabaseStorage] Falha ao obter licitações via ConLicitacaoStorage, retornando vazio:', error);
      return [];
    }
  }

  async getBidding(id: number): Promise<Bidding | undefined> {
    const [bidding] = await db.select().from(biddings).where(eq(biddings.id, id));
    return bidding || undefined;
  }

  async getFavorites(userId: number, date?: string, dateFrom?: string, dateTo?: string): Promise<Bidding[]> {
    // Buscar todos os favoritos do usuário (sem filtrar data de criação no SQL)
    const favoritesList = await db.select().from(favorites).where(eq(favorites.userId, userId));
    
    if (favoritesList.length === 0) {
      return [];
    }

    // Buscar dados das licitações em lote (Batch Fetching) para evitar N+1
    const { conLicitacaoStorage } = await import("./conlicitacao-storage");
    const biddingIds = favoritesList.map(f => f.biddingId);
    
    // Buscar licitações no banco
    const biddingsList = await conLicitacaoStorage.getBiddingsByIds(biddingIds);
    const biddingsMap = new Map(biddingsList.map(b => [b.id, b]));

    const favoriteBiddings: Bidding[] = [];

    // Helper para parsear data "dd/mm/yyyy hh:mm" ou ISO
    const parseDate = (dateStr?: string | null): Date | null => {
      if (!dateStr) return null;
      // Tentar ISO primeiro
      let d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d;
      
      // Tentar formato BR: dd/mm/yyyy HH:mm
      const parts = dateStr.split(' ');
      const dateParts = parts[0].split('/');
      if (dateParts.length === 3) {
        const timeParts = parts[1] ? parts[1].split(':') : ['00', '00', '00'];
        // Mês em JS é 0-indexado
        return new Date(
          parseInt(dateParts[2]), 
          parseInt(dateParts[1]) - 1, 
          parseInt(dateParts[0]),
          parseInt(timeParts[0] || '0'),
          parseInt(timeParts[1] || '0')
        );
      }
      return null;
    };

    // Filtros de data para aplicação em memória
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (date) {
      // Data específica: intervalo do dia inteiro
      startDate = new Date(date + "T00:00:00");
      endDate = new Date(date + "T23:59:59");
    } else {
      if (dateFrom) startDate = new Date(dateFrom + "T00:00:00");
      if (dateTo) endDate = new Date(dateTo + "T23:59:59");
    }

    for (const fav of favoritesList) {
      let bidding = biddingsMap.get(fav.biddingId);
      
      // Se não encontrou no lote (ex: não está no banco local), tentar buscar individualmente (fallback)
      if (!bidding) {
        try {
          // Tentar carregar/sincronizar se necessário
          await conLicitacaoStorage.getBiddingsPaginated({ numero_controle: String(fav.biddingId) }, 1, 50);
          bidding = await conLicitacaoStorage.getBidding(fav.biddingId);
        } catch {}
      }
      
      if (bidding) {
        // Aplicar Filtro de Data (Data de Realização / Abertura)
        if (startDate || endDate) {
          const biddingDate = parseDate(bidding.datahora_abertura);
          if (!biddingDate) {
            // Se não tem data, e estamos filtrando por data, exclui? 
            // Geralmente sim.
            continue; 
          }
          
          if (startDate && biddingDate < startDate) continue;
          if (endDate && biddingDate > endDate) continue;
        }

        const biddingWithFavorite = {
          ...bidding,
          category: fav.category,
          customCategory: fav.customCategory,
          notes: fav.notes,
          
          // Preferir dados atualizados da licitação (bidding) sobre o snapshot do favorito (fav)
          // Mas manter o snapshot se o dado da licitação estiver vazio
          uf: bidding.orgao_uf || fav.uf,
          codigoUasg: bidding.orgao_codigo || fav.codigoUasg,
          valorEstimado: bidding.valor_estimado ? bidding.valor_estimado.toString() : fav.valorEstimado,
          site: bidding.orgao_site || fav.site,
          
          // Campos que só existem no favorito ou que queremos permitir override manual explícito?
          // Assumindo que o usuário quer ver o dado mais recente da fonte:
          fornecedor: fav.fornecedor, // Bidding não tem fornecedor
          orgaoLicitante: bidding.orgao_nome || (fav as any).orgaoLicitante,
          status: bidding.situacao || (fav as any).status,
          
          createdAt: fav.createdAt
        } as any;
        
        favoriteBiddings.push(biddingWithFavorite);
      }
    }

    return favoriteBiddings;
  }

  async addFavorite(favorite: InsertFavorite): Promise<Favorite> {
    try {
      // Tentar pinar a licitação na memória do ConLicitacaoStorage
      try {
        const { conLicitacaoStorage } = await import("./conlicitacao-storage");
        const bidding = await conLicitacaoStorage.getBidding(favorite.biddingId);
        if (bidding) {
          await conLicitacaoStorage.pinBidding(bidding);
        }
      } catch (e) {
        console.warn('⚠️ [DatabaseStorage] Erro ao pinar licitação:', e);
      }


      
      // Usar MySQL2 diretamente para garantir insertId
      const mysql = await import('mysql2/promise');
      const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'geovani',
        password: process.env.DB_PASSWORD || 'Vermelho006@',
        database: process.env.DB_NAME || 'jlg_consultoria',
      });
      
      const connection = await pool.execute(`
        INSERT INTO favorites (user_id, bidding_id, category, custom_category, notes, uf, codigo_uasg, valor_estimado, fornecedor, site, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        favorite.userId,
        favorite.biddingId,
        favorite.category || null,
        favorite.customCategory || null,
        favorite.notes || null,
        favorite.uf || null,
        favorite.codigoUasg || null,
        favorite.valorEstimado || null,
        favorite.fornecedor || null,
        favorite.site || null
      ]);
      
      const insertId = (connection[0] as any).insertId as number;
      
      await pool.end();
      
      if (!insertId || isNaN(Number(insertId))) {
        throw new Error('Falha ao obter ID do favorito inserido');
      }
      
      // Buscar o favorito inserido para retornar com dados completos
      const [insertedFavorite] = await db.select().from(favorites).where(eq(favorites.id, insertId));
      
      if (!insertedFavorite) {
        throw new Error('Favorito inserido mas não encontrado');
      }
      
      return insertedFavorite;
    } catch (error) {
      console.error('❌ [DatabaseStorage] ERRO ao inserir favorito:', {
        error: error,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        favorite: favorite
      });
      throw error;
    }
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
    const mysql = await import('mysql2/promise');
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'geovani',
      password: process.env.DB_PASSWORD || 'Vermelho006@',
      database: process.env.DB_NAME || 'jlg_consultoria',
    });

    const [columnsRows] = await pool.query('SHOW COLUMNS FROM favorites');
    const columnSet = new Set((columnsRows as any[]).map(r => r.Field));

    const candidates: Array<{ col: string; val: any }> = [
      { col: 'category', val: data.category ?? null },
      { col: 'custom_category', val: data.customCategory ?? null },
      { col: 'notes', val: data.notes ?? null },
      { col: 'uf', val: data.uf ?? null },
      { col: 'codigo_uasg', val: data.codigoUasg ?? null },
      { col: 'valor_estimado', val: data.valorEstimado ?? null },
      { col: 'fornecedor', val: data.fornecedor ?? null },
      { col: 'site', val: data.site ?? null },
      { col: 'orgao_licitante', val: data.orgaoLicitante ?? null },
      { col: 'status', val: data.status ?? null },
    ];

    const setParts: string[] = [];
    const params: any[] = [];
    for (const c of candidates) {
      if (columnSet.has(c.col)) {
        setParts.push(`${c.col} = ?`);
        params.push(c.val);
      }
    }

    if (setParts.length === 0) {
      await pool.end();
      return;
    }

    const sql = `UPDATE favorites SET ${setParts.join(', ')} WHERE user_id = ? AND bidding_id = ?`;
    const [result] = await pool.execute(sql, [...params, userId, biddingId]);

    await pool.end();

    const affected = (result as any).affectedRows as number | undefined;
    if (!affected || affected === 0) {
      throw new Error('FAVORITE_NOT_FOUND');
    }
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
    // Delegar para ConLicitacaoStorage para manter dados de mock consistentes
    try {
      const { conLicitacaoStorage } = await import("./conlicitacao-storage");
      return await conLicitacaoStorage.getBiddings(filters);
    } catch (error) {
      console.warn('⚠️ [MemStorage] Falha ao obter licitações via ConLicitacaoStorage:', error);
      return [];
    }
  }

  async getBidding(id: number): Promise<Bidding | undefined> {
    try {
      const { conLicitacaoStorage } = await import("./conlicitacao-storage");
      return await conLicitacaoStorage.getBidding(id);
    } catch {
      return undefined;
    }
  }

  async getFavorites(userId: number, date?: string, dateFrom?: string, dateTo?: string): Promise<Bidding[]> {
    // Filtrar favoritos do usuário
    let userFavorites = Array.from(this.favorites.values())
      .filter(fav => fav.userId === userId);

    // Filtros por data na data de criação do favorito
    if (date) {
      const target = new Date(date);
      const start = new Date(target);
      const end = new Date(target);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      userFavorites = userFavorites.filter(fav => {
        const created = fav.createdAt instanceof Date ? fav.createdAt : new Date(fav.createdAt!);
        return created >= start && created <= end;
      });
    } else if (dateFrom || dateTo) {
      const start = dateFrom ? new Date(dateFrom) : undefined;
      const end = dateTo ? new Date(dateTo) : undefined;
      if (start) start.setHours(0,0,0,0);
      if (end) end.setHours(23,59,59,999);
      userFavorites = userFavorites.filter(fav => {
        const created = fav.createdAt instanceof Date ? fav.createdAt : new Date(fav.createdAt!);
        const afterStart = start ? created >= start : true;
        const beforeEnd = end ? created <= end : true;
        return afterStart && beforeEnd;
      });
    }

    // Preparar cache de licitações antes de mapear
    const { conLicitacaoStorage } = await import("./conlicitacao-storage");
    if (!(conLicitacaoStorage as any).cachedBiddings || (conLicitacaoStorage as any).cachedBiddings.size === 0) {
      // Carregamento inicial rápido para popular o cache
      try {
        await conLicitacaoStorage.getBiddingsPaginated(undefined, 1, 50);
      } catch {}
    }

    // Mapear para biddings com dados de categorização
    const favoriteBiddings: Bidding[] = [];
    for (const fav of userFavorites) {
      let bidding = await conLicitacaoStorage.getBidding(fav.biddingId);
      const raw = (conLicitacaoStorage as any).cachedBiddings?.get(fav.biddingId);
      const cacheTimestamp = raw?.cacheTimestamp as number | undefined;
      const isStale = cacheTimestamp ? (Date.now() - cacheTimestamp > 10 * 60 * 1000) : false;
      if (bidding && isStale) {
        try {
          await (conLicitacaoStorage as any).refreshBoletimForBidding(fav.biddingId);
          bidding = await conLicitacaoStorage.getBidding(fav.biddingId);
        } catch {}
      }
      if (!bidding) {
        // Tentar carregar especificamente pelo ID (via numero_controle)
        try {
          await conLicitacaoStorage.getBiddingsPaginated({ numero_controle: String(fav.biddingId) }, 1, 50);
          bidding = await conLicitacaoStorage.getBidding(fav.biddingId);
        } catch {}
      }
      if (bidding) {
        // Garantir que a licitação seja pinada na memória para não sumir
        try {
          await conLicitacaoStorage.pinBidding(bidding);
        } catch {}

        const biddingWithFavorite = {
          ...bidding,
          category: fav.category,
          customCategory: fav.customCategory,
          notes: fav.notes,
          uf: fav.uf,
          codigoUasg: fav.codigoUasg,
          valorEstimado: fav.valorEstimado,
          fornecedor: fav.fornecedor,
          site: fav.site,
          orgaoLicitante: (fav as any).orgaoLicitante,
          status: (fav as any).status,
          createdAt: fav.createdAt
        } as any;
        favoriteBiddings.push(biddingWithFavorite);
      }
    }

    return favoriteBiddings;
  }

  async addFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    // Tentar pinar a licitação na memória
    try {
      const { conLicitacaoStorage } = await import("./conlicitacao-storage");
      const bidding = await conLicitacaoStorage.getBidding(insertFavorite.biddingId);
      if (bidding) {
        await conLicitacaoStorage.pinBidding(bidding);
      }
    } catch {}

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
      site: insertFavorite.site || null,
      orgaoLicitante: (insertFavorite as any).orgaoLicitante ?? null,
      status: (insertFavorite as any).status ?? null
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
    const favoriteToUpdate = Array.from(this.favorites.values())
      .find(fav => fav.userId === userId && fav.biddingId === biddingId);

    if (!favoriteToUpdate) {
      throw new Error('FAVORITE_NOT_FOUND');
    }

    const updated: Favorite = {
      ...favoriteToUpdate,
      category: data.category ?? null,
      customCategory: data.customCategory ?? null,
      notes: data.notes ?? null,
      uf: data.uf ?? null,
      codigoUasg: data.codigoUasg ?? null,
      valorEstimado: data.valorEstimado ?? null,
      fornecedor: data.fornecedor ?? null,
      site: data.site ?? null,
      orgaoLicitante: (data as any).orgaoLicitante ?? (favoriteToUpdate as any).orgaoLicitante ?? null,
      status: (data as any).status ?? (favoriteToUpdate as any).status ?? null,
    };

    this.favorites.set(updated.id, updated);
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

// Detectar ambiente corretamente: Replit vs Servidor de Produção
const isReplit = process.env.REPLIT === '1' || process.env.NODE_ENV === 'development';
const isProductionServer = !isReplit && process.env.NODE_ENV !== 'development';
const forceMySQL = isProductionServer; // Usar MySQL apenas no servidor de produção



export const storage = forceMySQL ? new DatabaseStorage() : new MemStorage();
