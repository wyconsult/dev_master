import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { conLicitacaoStorage } from "./conlicitacao-storage";
import { loginSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const user = await conLicitacaoStorage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      res.json({ user: { id: user.id, email: user.email } });
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  // Biddings routes
  app.get("/api/biddings", async (req, res) => {
    try {
      const { conlicitacao_id, orgao, uf, numero_controle } = req.query;
      const filters: any = {};

      if (conlicitacao_id) filters.conlicitacao_id = conlicitacao_id as string;
      if (numero_controle) filters.numero_controle = numero_controle as string;
      if (orgao) filters.orgao = Array.isArray(orgao) ? orgao : [orgao];
      if (uf) filters.uf = Array.isArray(uf) ? uf : [uf];

      const biddings = await conLicitacaoStorage.getBiddings(filters);
      res.json(biddings);
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

  // Favorites
  app.get("/api/favorites/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { date, dateFrom, dateTo } = req.query;
      const favorites = await conLicitacaoStorage.getFavorites(userId, date as string, dateFrom as string, dateTo as string);
      res.json(favorites);
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
      const favorite = await conLicitacaoStorage.addFavorite({ userId, biddingId });
      res.status(201).json(favorite);
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.delete("/api/favorites/:userId/:biddingId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const biddingId = parseInt(req.params.biddingId);
      await conLicitacaoStorage.removeFavorite(userId, biddingId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/favorites/:userId/:biddingId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const biddingId = parseInt(req.params.biddingId);
      const isFavorite = await conLicitacaoStorage.isFavorite(userId, biddingId);
      res.json({ isFavorite });
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Filtros
  app.get("/api/filtros", async (req, res) => {
    try {
      const filtros = await conLicitacaoStorage.getFiltros();
      res.json(filtros);
    } catch (error) {
      console.error('Erro ao buscar filtros:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Boletins por filtro
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

  // 🔁 Rota UNIFICADA de detalhes de boletim (mantida)
  app.get("/api/boletim/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await conLicitacaoStorage.getBoletim(id);
      if (!result) {
        return res.status(404).json({ message: "Boletim não encontrado" });
      }
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar dados do boletim:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Compatível com frontend (corrigido)
  app.get("/api/boletins", async (req, res) => {
    try {
      const filtros = await conLicitacaoStorage.getFiltros();

      if (filtros.length === 0) {
        return res.json([]);
      }

      const { boletins } = await conLicitacaoStorage.getBoletins(filtros[0].id, 1, 50);
      res.json(boletins);
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
