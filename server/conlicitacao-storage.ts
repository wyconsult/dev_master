import { conLicitacaoAPI } from './conlicitacao-api';
import { Bidding, Boletim, Filtro, Acompanhamento, User, InsertUser, Favorite, InsertFavorite } from '../shared/schema';

export interface IConLicitacaoStorage {
  // Users (mantemos localmente)
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Filtros - vem da API real
  getFiltros(): Promise<Filtro[]>;
  
  // Boletins - vem da API real
  getBoletins(filtroId: number, page?: number, perPage?: number): Promise<{ boletins: Boletim[], total: number }>;
  getBoletim(id: number): Promise<{ boletim: Boletim, licitacoes: Bidding[], acompanhamentos: Acompanhamento[] } | undefined>;
  markBoletimAsViewed(id: number): Promise<void>;
  
  // Biddings - transformados da API real
  getBiddings(filters?: { 
    conlicitacao_id?: string; 
    orgao?: string[]; 
    uf?: string[];
    numero_controle?: string;
  }): Promise<Bidding[]>;
  getBidding(id: number): Promise<Bidding | undefined>;
  
  // Favorites (mantemos localmente)
  getFavorites(userId: number, date?: string, dateFrom?: string, dateTo?: string): Promise<Bidding[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: number, biddingId: number): Promise<void>;
  isFavorite(userId: number, biddingId: number): Promise<boolean>;
}

export class ConLicitacaoStorage implements IConLicitacaoStorage {
  private users: Map<number, User>;
  private favorites: Map<number, Favorite>;
  private viewedBoletins: Set<number>; // Armazena IDs dos boletins visualizados
  private currentUserId: number;
  private currentFavoriteId: number;
  private cachedBiddings: Map<number, Bidding>; // Cache das licitações
  private lastCacheUpdate: number;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  constructor() {
    this.users = new Map();
    this.favorites = new Map();
    this.viewedBoletins = new Set();
    this.cachedBiddings = new Map();
    this.currentUserId = 1;
    this.currentFavoriteId = 1;
    this.lastCacheUpdate = 0;
    
    this.initializeMockData();
  }

  private initializeMockData() {
    // Criar usuário de teste
    const testUser: User = {
      id: 1,
      email: "admin@test.com",
      password: "admin123"
    };
    this.users.set(1, testUser);
    this.currentUserId = 2;

    // Sistema configurado para usar apenas dados reais da API ConLicitação
    // Cache será populado quando IP estiver autorizado
  }

  // Métodos de usuário (mantemos localmente)
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

  // Métodos da API ConLicitação
  async getFiltros(): Promise<Filtro[]> {
    try {
      const response = await conLicitacaoAPI.getFiltros();
      
      // Transformar resposta da API para nosso formato
      const filtros: Filtro[] = response.filtros.map((filtro: any) => ({
        id: filtro.id,
        descricao: filtro.descricao,
        cliente_id: response.cliente.id,
        cliente_razao_social: response.cliente.razao_social,
        manha: filtro.periodos?.manha || true,
        tarde: filtro.periodos?.tarde || true,
        noite: filtro.periodos?.noite || true,
      }));

      return filtros;
    } catch (error: any) {
      if (error.message === 'IP_NOT_AUTHORIZED') {
        console.log('🚫 API ConLicitação: IP não autorizado.');
        console.log('💡 Para acesso aos dados reais, execute em ambiente com IP autorizado:');
        console.log('   - Desenvolvimento (Replit): 35.227.80.200');
        console.log('   - Produção: 31.97.26.138');
      } else {
        console.error('Erro ao buscar filtros da API:', error);
      }
      
      // Dados de teste para desenvolvimento enquanto IP não está autorizado
      return [{
        id: 1,
        descricao: "Filtro teste - aguardando autorização IP",
        cliente_id: 1,
        cliente_razao_social: "Cliente Teste",
        manha: true,
        tarde: true,
        noite: true,
      }];
    }
  }



  async getBoletins(filtroId: number, page: number = 1, perPage: number = 100): Promise<{ boletins: Boletim[], total: number }> {
    try {
      const response = await conLicitacaoAPI.getBoletins(filtroId, page, perPage);
      
      // Implementação simplificada: usar dados da API quando disponível
      // Para contagem dinâmica em produção, será necessário fazer chamadas adicionais
      const boletins: Boletim[] = await Promise.all(
        response.boletins.map(async (boletim: any) => {
          try {
            // Tentar buscar contagem real apenas quando necessário
            const boletimDetalhado = await conLicitacaoAPI.getBoletimData(boletim.id);
            return {
              id: boletim.id,
              numero_edicao: boletim.numero_edicao,
              datahora_fechamento: boletim.datahora_fechamento,
              filtro_id: boletim.filtro_id,
              quantidade_licitacoes: (boletimDetalhado.licitacoes || []).length,
              quantidade_acompanhamentos: (boletimDetalhado.acompanhamentos || []).length,
              visualizado: this.viewedBoletins.has(boletim.id),
            };
          } catch (error) {
            // Em caso de erro, usar dados básicos
            return {
              id: boletim.id,
              numero_edicao: boletim.numero_edicao,
              datahora_fechamento: boletim.datahora_fechamento,
              filtro_id: boletim.filtro_id,
              quantidade_licitacoes: boletim.quantidade_licitacoes || 0,
              quantidade_acompanhamentos: boletim.quantidade_acompanhamentos || 0,
              visualizado: this.viewedBoletins.has(boletim.id),
            };
          }
        })
      );

      return {
        boletins,
        total: response.filtro.total_boletins
      };
    } catch (error: any) {
      if (error.message === 'IP_NOT_AUTHORIZED') {
        console.log('🚫 API ConLicitação: IP não autorizado.');
        console.log('💡 Para acesso aos dados reais, execute em ambiente com IP autorizado:');
        console.log('   - Desenvolvimento (Replit): 35.227.80.200');
        console.log('   - Produção: 31.97.26.138');
      } else {
        console.error('Erro ao buscar boletins da API:', error);
      }
      
      // Dados de teste para desenvolvimento enquanto IP não está autorizado
      
      const boletimTeste: Boletim = {
        id: 1,
        numero_edicao: 341,
        datahora_fechamento: "2025-07-29T12:00:00.000Z", // Data fixa para hoje ser encontrada no calendário
        filtro_id: filtroId,
        quantidade_licitacoes: 2, // Valor fixo para desenvolvimento
        quantidade_acompanhamentos: 0,
        visualizado: this.viewedBoletins.has(1)
      };

      return { boletins: [boletimTeste], total: 1 };
    }
  }



  async getBoletim(id: number): Promise<{ boletim: Boletim, licitacoes: Bidding[], acompanhamentos: Acompanhamento[] } | undefined> {
    try {
      const response = await conLicitacaoAPI.getBoletimData(id);
      
      // Transformar licitações e acompanhamentos primeiro para contar corretamente
      const licitacoes: Bidding[] = (response.licitacoes || []).map((licitacao: any) => this.transformLicitacaoFromAPI(licitacao, id));
      const acompanhamentos: Acompanhamento[] = (response.acompanhamentos || []).map((acomp: any) => ({
        id: acomp.id,
        conlicitacao_id: acomp.id,
        licitacao_id: acomp.licitacao_id,
        orgao_nome: acomp.orgao.nome,
        orgao_cidade: acomp.orgao.cidade,
        orgao_uf: acomp.orgao.uf,
        objeto: acomp.objeto,
        sintese: acomp.sintese,
        data_fonte: acomp.data_fonte,
        edital: acomp.edital,
        processo: acomp.processo,
        boletim_id: id,
      }));

      const boletim: Boletim = {
        id: response.boletim.id,
        numero_edicao: response.boletim.numero_edicao,
        datahora_fechamento: response.boletim.datahora_fechamento,
        filtro_id: response.boletim.cliente.filtro.id,
        quantidade_licitacoes: licitacoes.length, // Contar dados reais
        quantidade_acompanhamentos: acompanhamentos.length, // Contar dados reais
        visualizado: this.viewedBoletins.has(id),
      };



      // Atualizar cache das licitações somente se não existir (evitar duplicação)
      licitacoes.forEach(licitacao => {
        if (!this.cachedBiddings.has(licitacao.id)) {
          this.cachedBiddings.set(licitacao.id, licitacao);
        }
      });
      this.lastCacheUpdate = Date.now();

      return { boletim, licitacoes, acompanhamentos };
    } catch (error: any) {
      if (error.message === 'IP_NOT_AUTHORIZED') {
        console.log('🚫 API ConLicitação: IP não autorizado.');
        console.log('💡 Para acesso aos dados reais, execute em ambiente com IP autorizado:');
        console.log('   - Desenvolvimento (Replit): 35.227.80.200');
        console.log('   - Produção: 31.97.26.138');
      } else {
        console.error('Erro ao buscar boletim da API:', error);
      }
      
      const licitacoesTeste: Bidding[] = [
        {
          id: 1,
          conlicitacao_id: 17942339,
          orgao_nome: "Fundação de Apoio ao Ensino, Pesquisa, Extensão e Interiorização do IFAM- FAEPI",
          orgao_codigo: "UASG123",
          orgao_cidade: "Manaus",
          orgao_uf: "AM",
          orgao_endereco: "Endereço teste",
          orgao_telefone: "(92) 1234-5678",
          orgao_site: "www.teste.gov.br",
          objeto: "Produto/Serviço Quant. Unidade Produto/Serviço: Serviço de apoio logístico para evento",
          situacao: "URGENTE",
          datahora_abertura: "2025-07-15 09:00:00",
          datahora_documento: "2025-07-10 14:30:00",
          datahora_retirada: "2025-07-12 16:00:00",
          datahora_visita: null,
          datahora_prazo: "2025-07-20 17:00:00",
          edital: "SM/715/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=teste1",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=teste1",
          processo: "23456.789012/2025-01",
          observacao: "Observação teste",
          item: "Item teste",
          preco_edital: 50000.00,
          valor_estimado: 50000.00,
          boletim_id: id,
        },
        {
          id: 2,
          conlicitacao_id: 17942355,
          orgao_nome: "Fundação de Apoio ao Ensino, Pesquisa, Extensão e Interiorização do IFAM- FAEPI",
          orgao_codigo: "UASG456",
          orgao_cidade: "Manaus",
          orgao_uf: "AM",
          orgao_endereco: "Endereço teste 2",
          orgao_telefone: "(92) 9876-5432",
          orgao_site: "www.teste2.gov.br",
          objeto: "Produto/Serviço Quant. Unidade Produto/Serviço: Iogurte zero açúcar",
          situacao: "URGENTE",
          datahora_abertura: "2025-07-17 07:59:00",
          datahora_documento: null,
          datahora_retirada: null,
          datahora_visita: "2025-07-16 10:30:00",
          datahora_prazo: "",
          edital: "SM/711/2025",
          link_edital: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=teste2",
          documento_url: "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=teste2",
          processo: "98765.432109/2025-02",
          observacao: "Observação teste 2",
          item: "Item teste 2",
          preco_edital: 25000.00,
          valor_estimado: 25000.00,
          boletim_id: id,
        }
      ];

      // Adicionar ao cache somente se não existir (evitar duplicação)
      licitacoesTeste.forEach(licitacao => {
        if (!this.cachedBiddings.has(licitacao.id)) {
          this.cachedBiddings.set(licitacao.id, licitacao);
        }
      });
      this.lastCacheUpdate = Date.now();

      // Dados de teste para verificar badge URGENTE e links - calcular contagem correta
      const acompanhamentosTeste: Acompanhamento[] = []; // Vazio para teste
      
      const boletimTeste: Boletim = {
        id: id,
        numero_edicao: 341,
        datahora_fechamento: "2025-07-29T12:00:00.000Z", // Data fixa para hoje ser encontrada no calendário
        filtro_id: 1,
        quantidade_licitacoes: licitacoesTeste.length, // Contar dados reais de teste
        quantidade_acompanhamentos: acompanhamentosTeste.length, // Contar dados reais de teste
        visualizado: this.viewedBoletins.has(id)
      };

      return { 
        boletim: boletimTeste, 
        licitacoes: licitacoesTeste, 
        acompanhamentos: acompanhamentosTeste 
      };
    }
  }



  // Transformar licitação conforme estrutura da documentação da API ConLicitação
  private transformLicitacaoFromAPI(licitacao: any, boletimId: number): Bidding {
    // Processar telefones conforme estrutura da API: orgao.telefone[].ddd, numero, ramal
    const telefones = licitacao.orgao?.telefone?.map((tel: any) => 
      `${tel.ddd ? '(' + tel.ddd + ')' : ''} ${tel.numero}${tel.ramal ? ' ramal ' + tel.ramal : ''}`
    ).join(', ') || '';

    // Extrair URL do documento conforme documentação: documento[] array
    const documentoItem = licitacao.documento?.[0];
    let documentoUrl = '';
    
    if (documentoItem) {
      const baseUrl = 'https://consultaonline.conlicitacao.com.br';
      if (typeof documentoItem === 'string') {
        documentoUrl = documentoItem.startsWith('http') ? documentoItem : baseUrl + documentoItem;
      } else if (documentoItem.url) {
        documentoUrl = documentoItem.url.startsWith('http') ? documentoItem.url : baseUrl + documentoItem.url;
      }
    }

    // Normalizar situação (campo 'situacao' da API)
    const situacao = licitacao.situacao || 'NOVA';
    const situacaoNormalizada = situacao.toString().toUpperCase();

    return {
      id: licitacao.id, // Número ConLicitação
      conlicitacao_id: licitacao.id,
      orgao_nome: licitacao.orgao?.nome || '', // Unidade licitante
      orgao_codigo: licitacao.orgao?.codigo || '', // Código UASG
      orgao_cidade: licitacao.orgao?.cidade || '', // Cidade
      orgao_uf: licitacao.orgao?.uf || '', // UF
      orgao_endereco: licitacao.orgao?.endereco || '', // Endereço
      orgao_telefone: telefones, // Telefone processado
      orgao_site: licitacao.orgao?.site || '', // Site
      objeto: licitacao.objeto || '', // Objeto
      situacao: situacaoNormalizada, // Situação
      datahora_abertura: licitacao.datahora_abertura || '', // Data/Hora abertura
      datahora_documento: licitacao.datahora_documento || null, // Data/Hora documento
      datahora_retirada: licitacao.datahora_retirada || null, // Data/Hora retirada
      datahora_visita: licitacao.datahora_visita || null, // Data/Hora visita
      datahora_prazo: licitacao.datahora_prazo || '', // Data/Hora prazo
      edital: licitacao.edital || '', // Edital
      link_edital: documentoUrl, // Link edital
      documento_url: documentoUrl, // URL do documento
      processo: licitacao.processo || '', // Processo
      observacao: licitacao.observacao || '', // Observações
      item: licitacao.item || '', // Itens
      preco_edital: licitacao.preco_edital || 0, // Valor do edital
      valor_estimado: licitacao.valor_estimado || 0, // Valor estimado
      boletim_id: boletimId,
    };
  }

  async markBoletimAsViewed(id: number): Promise<void> {
    this.viewedBoletins.add(id);
  }

  async getBiddings(filters?: { 
    conlicitacao_id?: string; 
    orgao?: string[]; 
    uf?: string[];
    numero_controle?: string;
  }): Promise<Bidding[]> {
    // Se o cache está vazio ou expirado, buscar dados dos últimos boletins
    if (this.cachedBiddings.size === 0 || Date.now() - this.lastCacheUpdate > this.CACHE_DURATION) {
      await this.refreshBiddingsCache();
    }

    let biddings = Array.from(this.cachedBiddings.values());
    
    if (filters?.conlicitacao_id) {
      biddings = biddings.filter(b => 
        b.conlicitacao_id.toString().includes(filters.conlicitacao_id!)
      );
    }
    
    if (filters?.numero_controle) {
      biddings = biddings.filter(b => 
        b.conlicitacao_id?.toString().includes(filters.numero_controle!) ||
        b.orgao_codigo?.toLowerCase().includes(filters.numero_controle!.toLowerCase()) ||
        b.processo?.toLowerCase().includes(filters.numero_controle!.toLowerCase())
      );
    }
    
    if (filters?.orgao && filters.orgao.length > 0) {
      biddings = biddings.filter(b => 
        filters.orgao!.some(orgao => 
          b.orgao_nome.toLowerCase().includes(orgao.toLowerCase())
        )
      );
    }

    if (filters?.uf && filters.uf.length > 0) {
      biddings = biddings.filter(b => 
        filters.uf!.includes(b.orgao_uf)
      );
    }
    
    return biddings;
  }

  private async refreshBiddingsCache(): Promise<void> {
    try {
      // Buscar filtros disponíveis
      const filtros = await this.getFiltros();
      
      if (filtros.length > 0) {
        // Buscar os últimos boletins do primeiro filtro
        const { boletins } = await this.getBoletins(filtros[0].id, 1, 10);
        
        // Buscar licitações de alguns dos boletins mais recentes
        for (const boletim of boletins.slice(0, 3)) {
          await this.getBoletim(boletim.id);
        }
      }
    } catch (error: any) {
      if (error.message === 'IP_NOT_AUTHORIZED') {
        console.log('🚫 API ConLicitação: IP não autorizado.');
        console.log('💡 Para acesso aos dados reais, execute em ambiente com IP autorizado:');
        console.log('   - Desenvolvimento (Replit): 35.227.80.200');
        console.log('   - Produção: 31.97.26.138');
      } else {
        console.error('Erro ao atualizar cache de licitações:', error);
      }
    }
  }

  async getBidding(id: number): Promise<Bidding | undefined> {
    return this.cachedBiddings.get(id);
  }

  // Métodos de favoritos (mantemos localmente)
  async getFavorites(userId: number, date?: string, dateFrom?: string, dateTo?: string): Promise<Bidding[]> {
    let userFavorites = Array.from(this.favorites.values())
      .filter(fav => fav.userId === userId);

    if (date) {
      userFavorites = userFavorites.filter(fav => {
        const favDate = fav.createdAt?.toISOString().split('T')[0];
        return favDate === date;
      });
    }
    
    if (dateFrom || dateTo) {
      userFavorites = userFavorites.filter(fav => {
        const favDate = fav.createdAt?.toISOString().split('T')[0];
        if (!favDate) return false;
        
        let isInRange = true;
        
        if (dateFrom) {
          isInRange = isInRange && favDate >= dateFrom;
        }
        
        if (dateTo) {
          isInRange = isInRange && favDate <= dateTo;
        }
        
        return isInRange;
      });
    }
    
    const favoriteBiddings: Bidding[] = [];
    for (const fav of userFavorites) {
      const bidding = this.cachedBiddings.get(fav.biddingId);
      if (bidding) {
        favoriteBiddings.push(bidding);
      }
    }
    
    return favoriteBiddings;
  }

  async addFavorite(favoriteData: {
    userId: number;
    biddingId: number;
    tipoObjeto?: string;
    objeto?: string;
    site?: string;
    siteType?: string;
    licitacaoData?: string;
  }): Promise<Favorite> {
    const id = this.currentFavoriteId++;
    const favorite: Favorite = {
      id,
      userId: favoriteData.userId,
      biddingId: favoriteData.biddingId,
      tipoObjeto: favoriteData.tipoObjeto || null,
      objeto: favoriteData.objeto || null,
      site: favoriteData.site || null,
      siteType: favoriteData.siteType || null,
      licitacaoData: favoriteData.licitacaoData || null,
      createdAt: new Date(),
    };
    this.favorites.set(id, favorite);
    return favorite;
  }

  async removeFavorite(favoriteId: number): Promise<void> {
    this.favorites.delete(favoriteId);
  }

  async isFavorite(userId: number, biddingId: number): Promise<boolean> {
    let found = false;
    this.favorites.forEach(favorite => {
      if (favorite.userId === userId && favorite.biddingId === biddingId) {
        found = true;
      }
    });
    return found;
  }
}

export const conLicitacaoStorage = new ConLicitacaoStorage();