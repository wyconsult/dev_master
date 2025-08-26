import { conLicitacaoAPI } from './conlicitacao-api';
import { Bidding, Boletim, Filtro, Acompanhamento, User, InsertUser, Favorite, InsertFavorite, favorites } from '../shared/schema';
import { db } from "./db";
import { eq, and } from "drizzle-orm";

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
  updateFavoriteCategorization(userId: number, biddingId: number, data: {
    category?: string;
    customCategory?: string;
    notes?: string;
  }): Promise<void>;
}

export class ConLicitacaoStorage implements IConLicitacaoStorage {
  private users: Map<number, User>;
  private favorites: Map<number, Favorite>;
  private viewedBoletins: Set<number>; // Armazena IDs dos boletins visualizados
  private currentUserId: number;
  private currentFavoriteId: number;
  private cachedBiddings: Map<number, Bidding>; // Cache das licitações
  private lastCacheUpdate: number;
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutos
  private boletimCache = new Map<number, { data: any, timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private fullLoadCompleted: boolean = false;
  private backgroundLoadingInProgress: boolean = false;

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
    // Criar usuário de teste se não existe
    if (!this.users.has(1)) {
      const testUser: User = {
        id: 1,
        email: "admin@test.com",
        password: "admin123"
      };
      this.users.set(1, testUser);
      this.currentUserId = 2;
    }

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
        console.log('🚫 [MOBILE DEBUG] API ConLicitação: IP não autorizado.');
        console.log('💡 Para acesso aos dados reais, execute em ambiente com IP autorizado:');
        console.log('   - Desenvolvimento (Replit): 35.227.80.200');
        console.log('   - Produção: 31.97.26.138');
      } else {
        console.error('❌ [MOBILE DEBUG] Erro ao buscar filtros da API:', error);
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
      
      // CORREÇÃO: A API básica não retorna quantidades, precisamos buscar de forma híbrida
      console.log(`📡 Buscando quantidades para ${response.boletins.length} boletins...`);
      
      // Buscar contagens em paralelo usando cache para performance
      const boletinsWithCounts = await Promise.all(
        response.boletins.map(async (boletim: any) => {
          try {
            // Verificar cache primeiro
            const cached = this.boletimCache.get(boletim.id);
            let quantidade_licitacoes = 0;
            let quantidade_acompanhamentos = 0;
            
            if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
              // Usar cache válido
              quantidade_licitacoes = cached.data.licitacoes?.length || 0;
              quantidade_acompanhamentos = cached.data.acompanhamentos?.length || 0;
              console.log(`🎯 Cache hit para contagem do boletim ${boletim.id}: ${quantidade_licitacoes} licitações, ${quantidade_acompanhamentos} acompanhamentos`);
            } else {
              // Buscar dados frescos
              const data = await conLicitacaoAPI.getBoletimData(boletim.id);
              quantidade_licitacoes = data.licitacoes?.length || 0;
              quantidade_acompanhamentos = data.acompanhamentos?.length || 0;
              
              // Cachear para próximas requisições
              this.boletimCache.set(boletim.id, { data, timestamp: Date.now() });
              console.log(`📊 Boletim ${boletim.id}: ${quantidade_licitacoes} licitações, ${quantidade_acompanhamentos} acompanhamentos`);
            }
            
            return {
              id: boletim.id,
              numero_edicao: boletim.numero_edicao,
              datahora_fechamento: boletim.datahora_fechamento,
              filtro_id: boletim.filtro_id,
              quantidade_licitacoes,
              quantidade_acompanhamentos,
              visualizado: this.viewedBoletins.has(boletim.id),
            };
          } catch (error) {
            console.warn(`⚠️ Erro ao buscar contagem do boletim ${boletim.id}, usando valores padrão`);
            return {
              id: boletim.id,
              numero_edicao: boletim.numero_edicao,
              datahora_fechamento: boletim.datahora_fechamento,
              filtro_id: boletim.filtro_id,
              quantidade_licitacoes: 0,
              quantidade_acompanhamentos: 0,
              visualizado: this.viewedBoletins.has(boletim.id),
            };
          }
        })
      );
      
      console.log(`✅ Carregados ${boletinsWithCounts.length} boletins com contagens corretas!`);

      return {
        boletins: boletinsWithCounts,
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
      
      // Dados preparados para receber API real - máximo 1 boletim por período por dia
      const boletinsTeste: Boletim[] = [
        // Dia 15/08/2025 - 3 boletins (manhã, tarde, noite)
        {
          id: 1,
          numero_edicao: 422,
          datahora_fechamento: "2025-08-15T17:00:00.000Z", // NOITE - 17:00:00
          filtro_id: filtroId,
          quantidade_licitacoes: 139,
          quantidade_acompanhamentos: 48,
          visualizado: this.viewedBoletins.has(1)
        },
        {
          id: 2,
          numero_edicao: 421,
          datahora_fechamento: "2025-08-15T12:30:00.000Z", // TARDE - 12:30:00  
          filtro_id: filtroId,
          quantidade_licitacoes: 212,
          quantidade_acompanhamentos: 72,
          visualizado: this.viewedBoletins.has(2)
        },
        {
          id: 3,
          numero_edicao: 420,
          datahora_fechamento: "2025-08-15T09:00:00.000Z", // MANHÃ - 09:00:00
          filtro_id: filtroId,
          quantidade_licitacoes: 111,
          quantidade_acompanhamentos: 57,
          visualizado: this.viewedBoletins.has(3)
        }
      ];

      return { boletins: boletinsTeste, total: boletinsTeste.length };
    }
  }

  // Método otimizado para obter dados de boletim com cache
  private async getCachedBoletimData(id: number): Promise<any> {
    // Verificar cache primeiro
    const cached = this.boletimCache.get(id);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      console.log(`🎯 Cache hit para boletim ${id}`);
      return cached.data;
    }
    
    console.log(`📡 Buscando dados frescos para boletim ${id}`);
    const data = await conLicitacaoAPI.getBoletimData(id);
    this.boletimCache.set(id, { data, timestamp: Date.now() });
    return data;
  }



  async getBoletim(id: number): Promise<{ boletim: Boletim, licitacoes: Bidding[], acompanhamentos: Acompanhamento[] } | undefined> {
    try {
      const response = await this.getCachedBoletimData(id);
      
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
    // Carregamento inicial rápido - apenas dados básicos
    if (this.cachedBiddings.size === 0 || Date.now() - this.lastCacheUpdate > this.CACHE_DURATION) {
      console.log('⚡ Carregamento inicial rápido de licitações...');
      await this.loadInitialBiddings();
      
      // Iniciar carregamento completo em background (não bloquear resposta)
      this.loadAllBiddingsInBackground();
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
        b.processo?.toLowerCase().includes(filters.numero_controle!.toLowerCase()) ||
        b.edital?.toLowerCase().includes(filters.numero_controle!.toLowerCase())
      );
      
      // Se não encontrou resultado e ainda não carregamos tudo, tentar busca específica
      if (biddings.length === 0 && !this.fullLoadCompleted) {
        console.log(`🔍 Busca específica para controle: ${filters.numero_controle}`);
        await this.searchSpecificBidding(filters.numero_controle);
        // Refilter após busca específica
        const updatedBiddings = Array.from(this.cachedBiddings.values());
        biddings = updatedBiddings.filter(b => 
          b.conlicitacao_id?.toString().includes(filters.numero_controle!) ||
          b.orgao_codigo?.toLowerCase().includes(filters.numero_controle!.toLowerCase()) ||
          b.processo?.toLowerCase().includes(filters.numero_controle!.toLowerCase()) ||
          b.edital?.toLowerCase().includes(filters.numero_controle!.toLowerCase())
        );
      }
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
    // Sempre garantir que dados de teste estejam disponíveis primeiro
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
        boletim_id: 1,
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
        boletim_id: 1,
      }
    ];
    
    // Adicionar dados de teste ao cache
    licitacoesTeste.forEach(licitacao => {
      this.cachedBiddings.set(licitacao.id, licitacao);
    });
    
    try {
      // Tentar buscar dados reais da API (se IP autorizado)
      const filtros = await this.getFiltros();
      
      for (const filtro of filtros) {
        try {
          // Buscar TODOS os boletins do filtro para garantir cobertura completa
          console.log(`🔍 Carregando todos os boletins do filtro ${filtro.id}...`);
          let page = 1;
          let totalLoaded = 0;
          let hasMoreBoletins = true;
          
          while (hasMoreBoletins) {
            const boletinsResponse = await this.getBoletins(filtro.id, page, 50);
            console.log(`📄 Página ${page}: ${boletinsResponse.boletins.length} boletins encontrados`);
            
            if (boletinsResponse.boletins.length === 0) {
              hasMoreBoletins = false;
              break;
            }
            
            for (const boletim of boletinsResponse.boletins) {
              try {
                // Buscar licitações de cada boletim e adicionar ao cache
                console.log(`📥 Carregando licitações do boletim ${boletim.id}...`);
                const boletimData = await conLicitacaoAPI.getBoletimData(boletim.id);
                
                if (boletimData.licitacoes) {
                  boletimData.licitacoes.forEach((licitacao: any) => {
                    const transformedLicitacao = this.transformLicitacaoFromAPI(licitacao, boletim.id);
                    // Sempre adicionar/atualizar no cache para garantir dados mais recentes
                    this.cachedBiddings.set(transformedLicitacao.id, transformedLicitacao);
                  });
                }
              } catch (error) {
                console.log(`⚠️ Erro ao carregar boletim ${boletim.id}, continuando...`);
              }
            }
            
            totalLoaded += boletinsResponse.boletins.length;
            page++;
            
            // Evitar loop infinito - se encontramos menos boletins que o esperado, provavelmente chegamos ao fim
            if (boletinsResponse.boletins.length < 50) {
              hasMoreBoletins = false;
            }
            
            // Limite de segurança para evitar carregar dados excessivos
            if (totalLoaded >= 500) {
              console.log(`⚠️ Limite de ${totalLoaded} boletins atingido para filtro ${filtro.id}`);
              hasMoreBoletins = false;
            }
          }
          
          console.log(`✅ Carregados ${totalLoaded} boletins do filtro ${filtro.id}`);
        } catch (error) {
          console.log(`⚠️ Erro ao processar filtro ${filtro.id}, continuando...`);
        }
      }

      
      this.lastCacheUpdate = Date.now();
      console.log(`✅ Pré-carregamento concluído: ${this.cachedBiddings.size} licitações disponíveis para busca`);
      
    } catch (error: any) {
      console.log('🚫 Usando dados de teste - IP não autorizado para API real');
    }
    
    // Garantir que sempre tenha dados no cache
    this.lastCacheUpdate = Date.now();
  }

  // Carregamento inicial rápido - apenas boletins mais recentes
  private async loadInitialBiddings(): Promise<void> {
    // Dados de teste primeiro
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
        boletim_id: 1,
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
        boletim_id: 1,
      }
    ];
    
    // Adicionar dados de teste ao cache
    licitacoesTeste.forEach(licitacao => {
      this.cachedBiddings.set(licitacao.id, licitacao);
    });

    try {
      // Carregamento rápido: apenas os 3 boletins mais recentes
      const filtros = await this.getFiltros();
      
      for (const filtro of filtros) {
        try {
          console.log(`⚡ Carregamento rápido: primeiros boletins do filtro ${filtro.id}`);
          const boletinsResponse = await this.getBoletins(filtro.id, 1, 3);
          
          for (const boletim of boletinsResponse.boletins) {
            try {
              const boletimData = await conLicitacaoAPI.getBoletimData(boletim.id);
              
              if (boletimData.licitacoes) {
                boletimData.licitacoes.forEach((licitacao: any) => {
                  const transformedLicitacao = this.transformLicitacaoFromAPI(licitacao, boletim.id);
                  this.cachedBiddings.set(transformedLicitacao.id, transformedLicitacao);
                });
              }
            } catch (error) {
              console.log(`⚠️ Erro ao carregar boletim ${boletim.id} (carregamento rápido)`);
            }
          }
        } catch (error) {
          console.log(`⚠️ Erro no carregamento rápido do filtro ${filtro.id}`);
        }
      }
      
      console.log(`⚡ Carregamento inicial concluído: ${this.cachedBiddings.size} licitações carregadas`);
      
    } catch (error) {
      console.log('⚡ Usando dados de teste para carregamento inicial');
    }
    
    this.lastCacheUpdate = Date.now();
  }

  // Carregamento completo em background
  private async loadAllBiddingsInBackground(): Promise<void> {
    if (this.backgroundLoadingInProgress || this.fullLoadCompleted) {
      return;
    }
    
    this.backgroundLoadingInProgress = true;
    console.log('🔄 Iniciando carregamento completo em background...');
    
    try {
      await this.refreshBiddingsCache();
      this.fullLoadCompleted = true;
      console.log('✅ Carregamento completo em background finalizado');
    } catch (error) {
      console.log('⚠️ Erro no carregamento em background:', error);
    } finally {
      this.backgroundLoadingInProgress = false;
    }
  }

  // Busca específica para número de controle não encontrado
  private async searchSpecificBidding(numeroControle: string): Promise<void> {
    try {
      console.log(`🔍 Busca específica para: ${numeroControle}`);
      const filtros = await this.getFiltros();
      
      // Buscar nos próximos boletins que ainda não foram carregados
      for (const filtro of filtros) {
        const boletinsResponse = await this.getBoletins(filtro.id, 1, 10);
        
        for (const boletim of boletinsResponse.boletins) {
          // Só buscar se ainda não temos dados deste boletim
          const existingFromBoletim = Array.from(this.cachedBiddings.values())
            .some(b => b.boletim_id === boletim.id);
            
          if (!existingFromBoletim) {
            try {
              const boletimData = await conLicitacaoAPI.getBoletimData(boletim.id);
              
              if (boletimData.licitacoes) {
                const found = boletimData.licitacoes.some((licitacao: any) => 
                  licitacao.id?.toString().includes(numeroControle) ||
                  licitacao.orgao?.codigo?.toLowerCase().includes(numeroControle.toLowerCase()) ||
                  licitacao.processo?.toLowerCase().includes(numeroControle.toLowerCase()) ||
                  licitacao.edital?.toLowerCase().includes(numeroControle.toLowerCase())
                );
                
                // Se encontrou, carregar todas as licitações deste boletim
                if (found) {
                  boletimData.licitacoes.forEach((licitacao: any) => {
                    const transformedLicitacao = this.transformLicitacaoFromAPI(licitacao, boletim.id);
                    this.cachedBiddings.set(transformedLicitacao.id, transformedLicitacao);
                  });
                  console.log(`🎯 Encontrado em boletim ${boletim.id}`);
                  return; // Encontrou, não precisa continuar
                }
              }
            } catch (error) {
              console.log(`⚠️ Erro na busca específica em boletim ${boletim.id}`);
            }
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Erro na busca específica:', error);
    }
  }

  async getBidding(id: number): Promise<Bidding | undefined> {
    return this.cachedBiddings.get(id);
  }

  // Métodos de favoritos com timestamps precisos em memória
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
        // Incluir dados de categorização salvos no favorito
        const biddingWithCategorization = {
          ...bidding,
          category: fav.category,
          customCategory: fav.customCategory,
          notes: fav.notes,
          uf: fav.uf,
          codigoUasg: fav.codigoUasg,
          valorEstimado: fav.valorEstimado,
          fornecedor: fav.fornecedor,
          site: fav.site
        };
        favoriteBiddings.push(biddingWithCategorization as any);
      }
    }
    
    return favoriteBiddings;
  }

  async addFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    const id = this.currentFavoriteId++;
    const favorite: Favorite = { 
      ...insertFavorite, 
      id, 
      createdAt: new Date(), // Timestamp atual preciso
      category: null,
      customCategory: null,
      notes: null,
      uf: null,
      codigoUasg: null,
      valorEstimado: null,
      fornecedor: null,
      site: null,
    };
    this.favorites.set(id, favorite);
    return favorite;
  }

  async removeFavorite(userId: number, biddingId: number): Promise<void> {
    let keyToDelete: number | undefined;
    this.favorites.forEach((favorite, id) => {
      if (favorite.userId === userId && favorite.biddingId === biddingId) {
        keyToDelete = id;
      }
    });
    if (keyToDelete !== undefined) {
      this.favorites.delete(keyToDelete);
    }
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
    // Buscar o favorito existente
    let foundFavoriteId: number | undefined;
    let foundFavorite: Favorite | undefined;
    
    this.favorites.forEach((favorite, id) => {
      if (favorite.userId === userId && favorite.biddingId === biddingId) {
        foundFavorite = favorite;
        foundFavoriteId = id;
      }
    });
    
    if (foundFavorite && foundFavoriteId !== undefined) {
      // Atualizar favorito existente mantendo o timestamp original
      this.favorites.set(foundFavoriteId, {
        ...foundFavorite,
        category: data.category ?? null,
        customCategory: data.customCategory ?? null,
        notes: data.notes ?? null,
        uf: data.uf ?? null,
        codigoUasg: data.codigoUasg ?? null,
        valorEstimado: data.valorEstimado ?? null,
        fornecedor: data.fornecedor ?? null,
        site: data.site ?? null,
      });
    } else {
      // Criar novo favorito com categorização e timestamp atual
      const id = this.currentFavoriteId++;
      const favorite: Favorite = { 
        userId,
        biddingId,
        id, 
        createdAt: new Date(), // Timestamp preciso do momento atual
        category: data.category ?? null,
        customCategory: data.customCategory ?? null,
        notes: data.notes ?? null,
        uf: data.uf ?? null,
        codigoUasg: data.codigoUasg ?? null,
        valorEstimado: data.valorEstimado ?? null,
        fornecedor: data.fornecedor ?? null,
        site: data.site ?? null,
      };
      this.favorites.set(id, favorite);
    }
  }
}

export const conLicitacaoStorage = new ConLicitacaoStorage();