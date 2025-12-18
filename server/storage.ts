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
  getUsers(): Promise<User[]>;
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
  // In-memory fallbacks
  private memUsers: Map<number, User> = new Map();
  private memFavorites: Map<number, Favorite> = new Map();
  private currentUserId: number = 1;
  private currentFavoriteId: number = 1;

  async getUsers(): Promise<User[]> {
    try {
      const dbUsers = await db.select().from(users);
      // Update memory cache
      dbUsers.forEach(u => this.memUsers.set(u.id, u));
      return dbUsers;
    } catch (error) {
      console.warn('⚠️ [DatabaseStorage] DB Error in getUsers, returning memory fallback', error);
      return Array.from(this.memUsers.values());
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (user) this.memUsers.set(user.id, user);
      return user || undefined;
    } catch (error) {
      return this.memUsers.get(id);
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (user) this.memUsers.set(user.id, user);
      return user || undefined;
    } catch (error) {
      return Array.from(this.memUsers.values()).find(u => u.email === email);
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, username));
      if (user) this.memUsers.set(user.id, user);
      return user || undefined;
    } catch (error) {
      return Array.from(this.memUsers.values()).find(u => u.email === username);
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      console.log('🗺️ [DatabaseStorage] Tentando inserir usuário:', {
        nomeEmpresa: insertUser.nomeEmpresa,
        cnpj: insertUser.cnpj,
        nome: insertUser.nome,
        email: insertUser.email
      });
      
      const [result] = await db.insert(users).values({
        ...insertUser,
        createdAt: new Date()
      });
      
      console.log('✅ [DatabaseStorage] Insert realizado, id:', result.insertId);
      
      const id = result.insertId;
      const user = await this.getUser(id);
      
      if (!user) {
        throw new Error('Usuário inserido mas não encontrado');
      }
      
      return user;
    } catch (error) {
      console.error('❌ [DatabaseStorage] ERRO ao criar usuário (usando fallback memória):', {
        error: error,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        insertUser: insertUser
      });
      
      // Fallback to memory
      const id = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
      const user: User = { ...insertUser, id, createdAt: new Date() };
      this.memUsers.set(id, user);
      return user;
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
    // Buscar todos os favoritos do usuário sem filtro de data inicial (pois o filtro deve ser na data da licitação)
    let favoritesList: Favorite[] = [];
    try {
      const conditions = [eq(favorites.userId, userId)];
      favoritesList = await db.select().from(favorites).where(and(...conditions));
      
      // Cache for fallback
      favoritesList.forEach(f => this.memFavorites.set(f.id, f));
    } catch (error) {
      console.warn('⚠️ [DatabaseStorage] DB Error in getFavorites, using memory fallback');
      favoritesList = Array.from(this.memFavorites.values()).filter(f => f.userId === userId);
    }
    
    // Buscar dados das licitações do ConLicitacaoStorage
    const biddingsWithFavoriteData: Bidding[] = [];
    const { conLicitacaoStorage } = await import("./conlicitacao-storage");
    
    const biddingIds = favoritesList.map(f => f.biddingId);
    const biddingsList = await conLicitacaoStorage.getBiddingsByIds(biddingIds);
    const biddingsMap = new Map(biddingsList.map(b => [b.id, b]));

    // Definir datas de filtro
    let filterStart: Date | null = null;
    let filterEnd: Date | null = null;

    if (date) {
      filterStart = new Date(date + "T00:00:00");
      filterEnd = new Date(date + "T23:59:59");
    } else if (dateFrom || dateTo) {
      if (dateFrom) filterStart = new Date(dateFrom + "T00:00:00");
      if (dateTo) filterEnd = new Date(dateTo + "T23:59:59");
    }

    for (const fav of favoritesList) {
      const bidding = biddingsMap.get(fav.biddingId);
      if (bidding) {
        // Parse da data de realização (abertura)
        // Formatos possíveis: ISO ou DD/MM/YYYY HH:mm
        let biddingDate: Date | null = null;
        if (bidding.datahora_abertura) {
          // Tentar ISO
          const isoDate = new Date(bidding.datahora_abertura);
          if (!isNaN(isoDate.getTime())) {
            biddingDate = isoDate;
          } else {
            // Tentar DD/MM/YYYY
            const parts = bidding.datahora_abertura.split(' ');
            const dateParts = parts[0].split('/');
            if (dateParts.length === 3) {
              const day = parseInt(dateParts[0]);
              const month = parseInt(dateParts[1]) - 1;
              const year = parseInt(dateParts[2]);
              biddingDate = new Date(year, month, day);
            }
          }
        }

        // Aplicar filtro de data se necessário
        if (filterStart && biddingDate && biddingDate < filterStart) {
          console.log(`[Filter] Skipping bidding ${bidding.id} - Date ${biddingDate.toISOString()} before start ${filterStart.toISOString()}`);
          continue;
        }
        if (filterEnd && biddingDate && biddingDate > filterEnd) {
          console.log(`[Filter] Skipping bidding ${bidding.id} - Date ${biddingDate.toISOString()} after end ${filterEnd.toISOString()}`);
          continue;
        }
        // Se tem filtro mas a licitação não tem data, decidimos se mostra ou não. 
        // Geralmente se filtra por data, espera-se que tenha data. Se não tiver, ignora.
        if ((filterStart || filterEnd) && !biddingDate) {
          console.log(`[Filter] Skipping bidding ${bidding.id} - No valid date found. Raw: ${bidding.datahora_abertura}`);
          continue;
        }

        // Garantir que a licitação seja pinada na memória
        try {
          await conLicitacaoStorage.pinBidding(bidding);
        } catch {}

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
          orgaoLicitante: (fav as any).orgaoLicitante,
          status: (fav as any).status,
          createdAt: fav.createdAt
        } as any;
        
        biddingsWithFavoriteData.push(biddingWithCategorization);
      }
    }
    
    return biddingsWithFavoriteData;
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

      console.log('💾 [DatabaseStorage] Inserindo favorito no MySQL:', {
        userId: favorite.userId,
        biddingId: favorite.biddingId,
        category: favorite.category
      });
      
      const [result] = await db.insert(favorites).values({
        userId: favorite.userId,
        biddingId: favorite.biddingId,
        category: favorite.category || null,
        customCategory: favorite.customCategory || null,
        notes: favorite.notes || null,
        uf: favorite.uf || null,
        codigoUasg: favorite.codigoUasg || null,
        valorEstimado: favorite.valorEstimado || null,
        fornecedor: favorite.fornecedor || null,
        site: favorite.site || null,
        orgaoLicitante: favorite.orgaoLicitante || null,
        status: favorite.status || null,
        createdAt: new Date()
      });
      
      console.log('✅ [DatabaseStorage] Favorito inserido, id:', result.insertId);
      
      const insertId = result.insertId;
      
      // Buscar o favorito inserido para retornar com dados completos
      const [insertedFavorite] = await db.select().from(favorites).where(eq(favorites.id, insertId));
      
      if (!insertedFavorite) {
        throw new Error('Favorito inserido mas não encontrado');
      }
      
      return insertedFavorite;
    } catch (error) {
      console.error('❌ [DatabaseStorage] ERRO ao inserir favorito (usando fallback memória):', {
        error: error,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        favorite: favorite
      });
      
      // Fallback to memory
      const id = Math.floor(Math.random() * 1000000);
      const newFavorite: Favorite = { 
        userId: favorite.userId,
        biddingId: favorite.biddingId,
        id, 
        createdAt: new Date(),
        category: favorite.category || null,
        customCategory: favorite.customCategory || null,
        notes: favorite.notes || null,
        uf: favorite.uf || null,
        codigoUasg: favorite.codigoUasg || null,
        valorEstimado: favorite.valorEstimado || null,
        fornecedor: favorite.fornecedor || null,
        site: favorite.site || null,
        orgaoLicitante: favorite.orgaoLicitante || null,
        status: favorite.status || null,
      };
      this.memFavorites.set(id, newFavorite);
      return newFavorite;
    }
  }

  async removeFavorite(userId: number, biddingId: number): Promise<void> {
    try {
      await db
        .delete(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.biddingId, biddingId)));
    } catch (error) {
      console.warn('⚠️ [DatabaseStorage] DB Error in removeFavorite, removing from memory');
    }
    
    // Always remove from memory cache
    for (const [key, fav] of this.memFavorites.entries()) {
      if (fav.userId === userId && fav.biddingId === biddingId) {
        this.memFavorites.delete(key);
        break;
      }
    }
  }

  async isFavorite(userId: number, biddingId: number): Promise<boolean> {
    try {
      const [favorite] = await db
        .select()
        .from(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.biddingId, biddingId)));
      
      if (favorite) this.memFavorites.set(favorite.id, favorite);
      return !!favorite;
    } catch (error) {
      return Array.from(this.memFavorites.values())
        .some(fav => fav.userId === userId && fav.biddingId === biddingId);
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

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
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
    
    // Otimização: buscar todas as licitações de uma vez
    const userFavoriteBiddingIds = userFavorites.map(f => f.biddingId);
    const biddingsList = await conLicitacaoStorage.getBiddingsByIds(userFavoriteBiddingIds);
    const biddingsMap = new Map(biddingsList.map(b => [b.id, b]));

    // Mapear para biddings com dados de categorização
    const favoriteBiddings: Bidding[] = [];
    for (const fav of userFavorites) {
      let bidding = biddingsMap.get(fav.biddingId);
      
      if (!bidding) {
        // Tentar carregar especificamente pelo ID (via numero_controle) se não encontrado
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

console.log('🔧 [STORAGE] Configurando storage:', {
  NODE_ENV: process.env.NODE_ENV,
  REPLIT: process.env.REPLIT,
  isReplit,
  isProductionServer,
  forceMySQL,
  storageType: forceMySQL ? 'MySQL (DatabaseStorage)' : 'Memory (MemStorage)'
});

export const storage = forceMySQL ? new DatabaseStorage() : new MemStorage();
