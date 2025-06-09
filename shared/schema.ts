import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
});

export const biddings = pgTable("biddings", {
  id: serial("id").primaryKey(),
  orgao: text("orgao").notNull(),
  codigo: text("codigo").notNull(),
  cidade: text("cidade").notNull(),
  uf: text("uf").notNull(),
  endereco: text("endereco").notNull(),
  telefone: text("telefone").notNull(),
  site: text("site").notNull(),
  objeto: text("objeto").notNull(),
  situacao: text("situacao").notNull(),
  datahora_abertura: text("datahora_abertura").notNull(),
  datahora_documento: text("datahora_documento"),
  datahora_retirada: text("datahora_retirada"),
  datahora_visita: text("datahora_visita"),
  datahora_prazo: text("datahora_prazo"),
  edital: text("edital").notNull(),
  link_edital: text("link_edital").notNull(),
  processo: text("processo").notNull(),
  observacao: text("observacao"),
  item: text("item"),
  preco_edital: text("preco_edital"),
  valor_estimado: text("valor_estimado"),
  conlicitacao_id: integer("conlicitacao_id").notNull(),
});

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  biddingId: integer("bidding_id").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
});

export const insertBiddingSchema = createInsertSchema(biddings).omit({
  id: true,
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
});

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertBidding = z.infer<typeof insertBiddingSchema>;
export type Bidding = typeof biddings.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;
export type LoginRequest = z.infer<typeof loginSchema>;
