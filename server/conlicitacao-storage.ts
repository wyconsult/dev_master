import { conLicitacaoAPI } from './conlicitacao-api';
import {
  Bidding,
  Boletim,
  Filtro,
  Acompanhamento,
  User,
  InsertUser,
  Favorite,
  InsertFavorite
} from '../shared/schema';

export interface IConLicitacaoStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getFiltros(): Promise<Filtro[]>;

  getBoletins(
    filtroId: number,
    page?: number,
    perPage?: number
  ): Promise<{ boletins: Boletim[]; total: number }>;
  getBoletim(
    id: number
  ): Promise<{ boletim: Boletim; licitacoes: Bidding[]; acompanhamentos: Acompanhamento[] } | undefined>;
  markBoletimAsViewed(id: number): Promise<void>;

  getBiddings(filters?: {
    conlicitacao_id?: string;
    orgao?: string[];
    uf?: string[];
    numero_controle?: string;
  }): Promise<Bidding[]>;
  getBidding(id: number): Promise<Bidding | undefined>;

  getFavorites(userId: number, date?: string, dateFrom?: string, dateTo?: string): Promise<Bidding[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: number, biddingId: number): Promise<void>;
  isFavorite(userId: number, biddingId: number): Promise<boolean>;
}

export class ConLicitacaoStorage implements IConLicitacaoStorage {
  private users = new Map<number, User>();
  private favorites = new Map<number, Favorite>();
  private viewedBoletins = new Set<number>();
  private cachedBiddings = new Map<number, Bidding>();
  private currentUserId = 1;
  private currentFavoriteId = 1;
  private lastCacheUpdate = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    const testUser: User = { id: 1, email: "admin@test.com", password: "admin123" };
    this.users.set(1, testUser);
    this.currentUserId = 2;
  }

  // --- Usuários ---
  async getUser(id: number) { return this.users.get(id); }
  async getUserByEmail(email: string) {
    return Array.from(this.users.values()).find(u => u.email === email);
  }
  async createUser(insertUser: InsertUser) {
    const id = this.currentUserId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // --- Filtros ---
  async getFiltros(): Promise<Filtro[]> {
    try {
      const resp = await conLicitacaoAPI.getFiltros();
      return resp.filtros.map((f: any) => ({
        id: f.id,
        descricao: f.descricao,
        cliente_id: resp.cliente.id,
        cliente_razao_social: resp.cliente.razao_social,
        manha: f.periodos?.manha ?? true,
        tarde: f.periodos?.tarde ?? true,
        noite: f.periodos?.noite ?? true,
      }));
    } catch (e: any) {
      console.error("Erro ao buscar filtros:", e);
      return [{
        id: 1,
        descricao: "Filtro teste - aguardando IP",
        cliente_id: 1,
        cliente_razao_social: "Cliente Teste",
        manha: true,
        tarde: true,
        noite: true,
      }];
    }
  }

  // --- Boletins ---
  async getBoletins(filtroId: number, page = 1, perPage = 100) {
    try {
      const resp = await conLicitacaoAPI.getBoletins(filtroId, page, perPage);
      const boletins: Boletim[] = resp.boletins.map((b: any) => ({
        id: b.id,
        cliente_id: resp.filtro.cliente.id,
        cliente_razao_social: resp.filtro.cliente.razao_social,
        filtro_descricao: resp.filtro.descricao,
        numero_edicao: b.numero_edicao,
        datahora_fechamento: b.datahora_fechamento,
        filtro_id: b.filtro_id,
        quantidade_licitacoes: b.quantidade_licitacoes ?? 0,
        quantidade_acompanhamentos: b.quantidade_acompanhamentos ?? 0,
        visualizado: this.viewedBoletins.has(b.id),
      }));
      return { boletins, total: resp.filtro.total_boletins };
    } catch (e) {
      console.error("Erro ao buscar boletins:", e);
      const teste: Boletim = {
        id: 1,
        cliente_id: 1,
        cliente_razao_social: "Cliente Teste",
        filtro_descricao: "Teste",
        numero_edicao: 0,
        datahora_fechamento: new Date().toISOString(),
        filtro_id: filtroId,
        quantidade_licitacoes: 0,
        quantidade_acompanhamentos: 0,
        visualizado: false,
      };
      return { boletins: [teste], total: 1 };
    }
  }

  async getBoletim(id: number) {
    try {
      const resp = await conLicitacaoAPI.getBoletimData(id);
      const boletim: Boletim = {
        id: resp.boletim.id,
        cliente_id: resp.boletim.cliente.id,
        cliente_razao_social: resp.boletim.cliente.razao_social,
        filtro_descricao: resp.boletim.cliente.filtro.descricao,
        numero_edicao: resp.boletim.numero_edicao,
        datahora_fechamento: resp.boletim.datahora_fechamento,
        filtro_id: resp.boletim.cliente.filtro.id,
        quantidade_licitacoes: resp.boletim.quantidade_licitacoes,
        quantidade_acompanhamentos: resp.boletim.quantidade_acompanhamentos,
        visualizado: this.viewedBoletins.has(id),
      };

      const licitacoes = (resp.licitacoes || []).map((l: any) =>
        this.transformLicitacao(l, id)
      );
      const acompanhamentos: Acompanhamento[] = (resp.acompanhamentos || []).map((a: any) => ({
        id: a.id,
        conlicitacao_id: a.id,
        licitacao_id: a.licitacao_id,
        orgao_nome: a.orgao.nome,
        orgao_cidade: a.orgao.cidade,
        orgao_uf: a.orgao.uf,
        objeto: a.objeto,
        sintese: a.sintese,
        data_fonte: a.data_fonte,
        edital: a.edital,
        processo: a.processo,
        boletim_id: id,
      }));

      licitacoes.forEach(l => this.cachedBiddings.set(l.id, l));
      this.lastCacheUpdate = Date.now();

      return { boletim, licitacoes, acompanhamentos };
    } catch (e) {
      console.error("Erro ao buscar boletim:", e);
      return undefined;
    }
  }

  async markBoletimAsViewed(id: number) {
    this.viewedBoletins.add(id);
  }

  // --- Biddings ---
  async getBiddings(filters?: {
    conlicitacao_id?: string;
    orgao?: string[];
    uf?: string[];
    numero_controle?: string;
  }) {
    if (
      this.cachedBiddings.size === 0 ||
      Date.now() - this.lastCacheUpdate > this.CACHE_DURATION
    ) {
      await this.refreshBiddingsCache();
    }

    let all = Array.from(this.cachedBiddings.values());

    if (filters?.conlicitacao_id) {
      all = all.filter(b =>
        b.conlicitacao_id.toString().includes(filters.conlicitacao_id!)
      );
    }

    if (filters?.numero_controle) {
      const term = filters.numero_controle.toLowerCase();
      all = all.filter(b =>
        b.conlicitacao_id.toString().includes(filters.numero_controle!) ||
        (b.orgao_codigo ?? '').toLowerCase().includes(term) ||
        (b.processo ?? '').toLowerCase().includes(term)
      );
    }

    if (filters?.orgao?.length) {
      all = all.filter(b =>
        filters.orgao!.some(o =>
          b.orgao_nome.toLowerCase().includes(o.toLowerCase())
        )
      );
    }

    if (filters?.uf?.length) {
      all = all.filter(b => filters.uf!.includes(b.orgao_uf));
    }

    return all;
  }

  async getBidding(id: number) {
    return this.cachedBiddings.get(id);
  }

  // --- Favoritos ---
  async getFavorites(userId: number, date?: string, dateFrom?: string, dateTo?: string) {
    let favs = Array.from(this.favorites.values()).filter(f => f.userId === userId);

    if (date) {
      favs = favs.filter(f => f.createdAt.toISOString().startsWith(date));
    }
    if (dateFrom || dateTo) {
      favs = favs.filter(f => {
        const d = f.createdAt.toISOString().split('T')[0];
        return (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
      });
    }

    return favs
      .map(f => this.cachedBiddings.get(f.biddingId))
      .filter(Boolean) as Bidding[];
  }

  async addFavorite(ins: InsertFavorite) {
    const id = this.currentFavoriteId++;
    const fav: Favorite = { ...ins, id, createdAt: new Date() };
    this.favorites.set(id, fav);
    return fav;
  }

  async removeFavorite(userId: number, biddingId: number) {
    for (const [key, f] of this.favorites) {
      if (f.userId === userId && f.biddingId === biddingId) {
        this.favorites.delete(key);
        break;
      }
    }
  }

  async isFavorite(userId: number, biddingId: number) {
    return Array.from(this.favorites.values()).some(
      f => f.userId === userId && f.biddingId === biddingId
    );
  }

  private async refreshBiddingsCache() {
    try {
      const filtros = await this.getFiltros();
      if (filtros.length) {
        const { boletins } = await this.getBoletins(filtros[0].id, 1, 10);
        for (const b of boletins.slice(0, 3)) {
          await this.getBoletim(b.id);
        }
      }
    } catch {
      // noop
    }
  }

  private transformLicitacao(licitacao: any, boletimId: number): Bidding {
    const telefones = licitacao.orgao.telefone
      ?.map((t: any) =>
        `${t.ddd ? `(${t.ddd}) ` : ''}${t.numero}${t.ramal ? ` ramal ${t.ramal}` : ''}`
      )
      .join(', ') || '';
    const doc = licitacao.documento?.[0];
    const base = 'https://consultaonline.conlicitacao.com.br';
    const documento_url =
      typeof doc === 'string'
        ? doc.startsWith('http') ? doc : base + doc
        : doc?.url.startsWith('http')
        ? doc.url
        : base + doc.url;

    return {
      id: licitacao.id,
      conlicitacao_id: licitacao.id,
      orgao_nome: licitacao.orgao.nome || '',
      orgao_codigo: licitacao.orgao.codigo || '',
      orgao_cidade: licitacao.orgao.cidade || '',
      orgao_uf: licitacao.orgao.uf || '',
      orgao_endereco: licitacao.orgao.endereco || '',
      orgao_telefone: telefones,
      orgao_site: licitacao.orgao.site || '',
      objeto: licitacao.objeto || '',
      situacao: (licitacao.situacao || 'NOVA').toUpperCase(),
      datahora_abertura: licitacao.datahora_abertura || '',
      datahora_documento: licitacao.datahora_documento || null,
      datahora_retirada: licitacao.datahora_retirada || null,
      datahora_visita: licitacao.datahora_visita || null,
      datahora_prazo: licitacao.datahora_prazo || '',
      edital: licitacao.edital || '',
      link_edital: documento_url,
      documento_url,
      processo: licitacao.processo || '',
      observacao: licitacao.observacao || '',
      item: licitacao.item || '',
      preco_edital: licitacao.preco_edital || 0,
      valor_estimado: licitacao.valor_estimado || 0,
      boletim_id: boletimId,
    };
  }
}

export const conLicitacaoStorage = new ConLicitacaoStorage();
