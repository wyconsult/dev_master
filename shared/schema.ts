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
  object: text("object").notNull(),
  dates: text("dates").notNull(),
  situation: text("situation").notNull(),
  edital: text("edital").notNull(),
  conLicitationNumber: text("con_licitation_number").notNull(),
  organization: text("organization").notNull(),
  sessionStatus: text("session_status").notNull(),
  city: text("city").notNull(),
  link: text("link").notNull(),
  shift: text("shift").notNull(), // Manhã, Tarde, Noite
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
