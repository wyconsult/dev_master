import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { conLicitacaoStorage } from "./conlicitacao-storage";
import { loginSchema, registerSchema, forgotPasswordSchema } from "@shared/schema";
import bcrypt from "bcrypt";

export async function registerRoutes(app: Express): Promise<Server> {
  // Teste de saúde do sistema
  app.get("/api/health", async (req, res) => {
    try {
      const isProduction = process.env.NODE_ENV === 'production';
      const healthInfo: any = {
        status: 'ok',
        environment: process.env.NODE_ENV || 'development',
        storageType: isProduction ? 'MySQL' : 'Memory',
        timestamp: new Date().toISOString()
      };
      
      // Testar conexão com banco se em produção
      if (isProduction) {
        try {
          await storage.getUserByEmail('test@test.com'); // Teste simples
          healthInfo.database = 'connected';
        } catch (error) {
          healthInfo.database = 'error';
          healthInfo.databaseError = error instanceof Error ? error.message : 'Unknown error';
        }
      }
      
      res.json(healthInfo);
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Users routes
  app.get("/api/users", async (req, res) => {
    try {
      console.log('👥 [ROUTES] Buscando lista de usuários via MySQL Storage');
      // Para simplificar, vamos buscar usuários que já têm favoritos
      const favorites = await storage.getFavorites(1); // Buscar alguns favoritos
      const allFavorites = await storage.getFavorites(2); // E de outros usuários
      const moreResults = await storage.getFavorites(5);

      // Buscar dados dos usuários pelos IDs encontrados nos favoritos + IDs conhecidos
      const userIds = new Set([1, 2, 5]); // IDs conhecidos: admin, Wilson, Moacir

      const users = [];
      for (const userId of Array.from(userIds)) {
        try {
          const user = await storage.getUser(userId);
          if (user) {
            users.push({
              id: user.id,
              nome: user.nome,
              email: user.email,
              nomeEmpresa: user.nomeEmpresa
            });
          }
        } catch (error) {
          console.log(`Usuário ${userId} não encontrado`);
        }
      }
      
      console.log('✅ [ROUTES] Usuários encontrados:', users.length);
      res.json(users);
    } catch (error) {
      console.error('❌ Erro ao buscar usuários:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      
      res.json({ user: { id: user.id, email: user.email, nomeEmpresa: user.nomeEmpresa, nome: user.nome } });
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  // Registro de usuários
  app.post("/api/auth/register", async (req, res) => {
    try {
      console.log('📝 Tentativa de registro:', { 
        body: req.body,
        env: process.env.NODE_ENV,
        isProduction: process.env.NODE_ENV === 'production'
      });
      
      const { nomeEmpresa, cnpj, nome, email, password, confirmPassword } = registerSchema.parse(req.body);
      
      console.log('✅ Dados validados com sucesso');
      
      // Verificar se usuário já existe
      console.log('🔍 Verificando se usuário existe:', email);
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        console.log('❌ E-mail já existe:', email);
        return res.status(400).json({ message: "E-mail já cadastrado" });
      }
      
      console.log('👤 E-mail disponível, criando usuário...');
      
      // Hash da senha
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      console.log('🔐 Senha hasheada, inserindo no banco...');
      
      // Criar usuário
      const user = await storage.createUser({
        nomeEmpresa,
        cnpj,
        nome,
        email,
        password: hashedPassword
      });
      
      console.log('✅ Usuário criado com sucesso:', user.id);
      
      res.status(201).json({ 
        message: "Usuário criado com sucesso",
        user: { id: user.id, email: user.email, nomeEmpresa: user.nomeEmpresa, nome: user.nome } 
      });
    } catch (error) {
      console.error('❌ ERRO COMPLETO no registro:', {
        error: error,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        body: req.body,
        env: process.env.NODE_ENV
      });
      
      if (error instanceof Error && (error.message.includes('duplicate key') || error.message.includes('Duplicate entry'))) {
        return res.status(400).json({ message: "E-mail ou CNPJ já cadastrado" });
      }
      
      res.status(400).json({ message: "Dados inválidos ou já cadastrados" });
    }
  });

  // Recuperação de senha
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email, newPassword, confirmPassword } = forgotPasswordSchema.parse(req.body);
      
      // Verificar se usuário existe
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "E-mail não encontrado" });
      }
      
      // Hash da nova senha
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Atualizar senha
      await storage.updateUserPassword(email, hashedPassword);
      
      res.json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error('Erro na recuperação de senha:', error);
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  // Debug endpoint para validar fonte dos dados
  app.get("/api/debug/data-sources", async (req, res) => {
    try {
      const debugInfo = await conLicitacaoStorage.getDataSourcesDebugInfo();
      res.json(debugInfo);
    } catch (error) {
      console.error('Erro ao buscar informações de debug:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Biddings routes
  app.get("/api/biddings", async (req, res) => {
    try {
      const { numero_controle, orgao, uf, conlicitacao_id, page, per_page } = req.query as any;
      const filters: any = {};
      
      if (conlicitacao_id) filters.conlicitacao_id = conlicitacao_id as string;
      if (numero_controle) filters.numero_controle = numero_controle as string;
      if (orgao) {
        filters.orgao = Array.isArray(orgao) ? orgao : [orgao];
      }
      if (uf) {
        filters.uf = Array.isArray(uf) ? uf : [uf];
      }
      
      const pageNum = parseInt(page as string) || 1;
      const perPageNum = parseInt(per_page as string) || 50;
      
      const { biddings, total } = await conLicitacaoStorage.getBiddingsPaginated(filters, pageNum, perPageNum);
      res.json({ biddings, total, page: pageNum, per_page: perPageNum });
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota para contar total de licitações (para dashboard)
  app.get("/api/biddings/count", async (req, res) => {
    try {
      const count = await conLicitacaoStorage.getBiddingsCount();
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/biddings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const bidding = await conLicitacaoStorage.getBidding(id);
      
      if (!bidding) {
        return res.status(404).json({ message: "Licitação não encontrada" });
      }
      
      res.json(bidding);
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Favorites routes
  // Endpoint geral para dashboard (sem userId específico)
  app.get("/api/favorites", async (req, res) => {
    try {
      // Para o dashboard, usar usuário padrão (1) se não especificado
      const userId = 1; // Usuário padrão para desenvolvimento
      const { page, per_page } = req.query as any;
      const favorites = await storage.getFavorites(userId);

      const pageNum = parseInt(page as string) || 1;
      const perPageNum = parseInt(per_page as string) || 50;
      const total = favorites.length;
      const startIndex = (pageNum - 1) * perPageNum;
      const paginated = favorites.slice(startIndex, startIndex + perPageNum);
      
      // Adicionar headers para evitar cache
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json({ favorites: paginated, total, page: pageNum, per_page: perPageNum });
    } catch (error) {
      console.error('Erro ao buscar favoritos:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/favorites/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { date, dateFrom, dateTo, page, per_page } = req.query as any;
      const favorites = await storage.getFavorites(userId, date as string, dateFrom as string, dateTo as string);

      const pageNum = parseInt(page as string) || 1;
      const perPageNum = parseInt(per_page as string) || 50;
      const total = favorites.length;
      const startIndex = (pageNum - 1) * perPageNum;
      const paginated = favorites.slice(startIndex, startIndex + perPageNum);
      
      // Adicionar headers para evitar cache
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json({ favorites: paginated, total, page: pageNum, per_page: perPageNum });
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/favorites", async (req, res) => {
    try {
      const { userId, biddingId } = req.body;
      
      if (!userId || !biddingId) {
        return res.status(400).json({ message: "userId e biddingId são obrigatórios" });
      }
      
      const favorite = await storage.addFavorite({ userId, biddingId });
      res.status(201).json(favorite);
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.delete("/api/favorites/:userId/:biddingId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const biddingId = parseInt(req.params.biddingId);
      
      await storage.removeFavorite(userId, biddingId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/favorites/:userId/:biddingId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const biddingId = parseInt(req.params.biddingId);
      
      const isFavorite = await storage.isFavorite(userId, biddingId);
      res.json({ isFavorite });
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Categorização de favoritos
  app.patch("/api/favorites/:userId/:biddingId/categorize", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const biddingId = parseInt(req.params.biddingId);
      const { category, customCategory, notes, uf, codigoUasg, valorEstimado, fornecedor, site } = req.body;

      // Garantir que o favorito existe antes de atualizar para evitar duplicação
      const exists = await storage.isFavorite(userId, biddingId);
      if (!exists) {
        return res.status(404).json({ message: "Favorito não encontrado para categorização" });
      }

      await storage.updateFavoriteCategorization(userId, biddingId, {
        category,
        customCategory,
        notes,
        uf,
        codigoUasg,
        valorEstimado,
        fornecedor,
        site,
      });

      // Evitar cache em responses para refletir imediatamente
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao atualizar categorização:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Filtros da ConLicitação
  app.get("/api/filtros", async (req, res) => {
    try {
      const filtros = await conLicitacaoStorage.getFiltros();
      res.json(filtros);
    } catch (error) {
      console.error('Erro ao buscar filtros:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Boletins da ConLicitação
  app.get("/api/filtro/:filtroId/boletins", async (req, res) => {
    try {
      const filtroId = parseInt(req.params.filtroId);
      const page = parseInt(req.query.page as string) || 1;
      const perPage = parseInt(req.query.per_page as string) || 100;
      
      const { boletins, total } = await conLicitacaoStorage.getBoletins(filtroId, page, perPage);
      res.json({ boletins, total });
    } catch (error) {
      console.error('Erro ao buscar boletins:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Detalhes de um boletim específico com licitações e acompanhamentos
  app.get("/api/boletim/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await conLicitacaoStorage.getBoletim(id);
      
      if (!result) {
        return res.status(404).json({ message: "Boletim não encontrado" });
      }
      
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar boletim:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota compatível para a interface atual de boletins
  app.get("/api/boletins", async (req, res) => {
    try {
      const { page, per_page } = req.query as any;
      const pageNum = parseInt(page as string) || 1;
      const perPageNum = parseInt(per_page as string) || 50;
      // Buscar o primeiro filtro disponível e seus boletins
      const filtros = await conLicitacaoStorage.getFiltros();
      if (filtros.length === 0) {
        return res.json({ boletins: [], total: 0, page: pageNum, per_page: perPageNum });
      }
      
      const { boletins, total } = await conLicitacaoStorage.getBoletins(filtros[0].id, pageNum, perPageNum);
      res.json({ boletins, total, page: pageNum, per_page: perPageNum });
    } catch (error) {
      console.error('Erro ao buscar boletins:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });



  app.post("/api/boletins/:id/mark-viewed", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await conLicitacaoStorage.markBoletimAsViewed(id);
      res.status(200).json({ message: "Boletim marcado como visualizado" });
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
