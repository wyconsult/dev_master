import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      
      // In a real app, we'd use proper session management or JWT
      res.json({ user: { id: user.id, email: user.email } });
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  // Biddings routes
  app.get("/api/biddings", async (req, res) => {
    try {
      const { conLicitationNumber, organization, shift } = req.query;
      const filters = {
        conLicitationNumber: conLicitationNumber as string,
        organization: organization as string,
        shift: shift as string,
      };
      
      const biddings = await storage.getBiddings(filters);
      res.json(biddings);
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/biddings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const bidding = await storage.getBidding(id);
      
      if (!bidding) {
        return res.status(404).json({ message: "Licitação não encontrada" });
      }
      
      res.json(bidding);
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Favorites routes
  app.get("/api/favorites/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const favorites = await storage.getFavorites(userId);
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

  const httpServer = createServer(app);
  return httpServer;
}
