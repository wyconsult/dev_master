import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  nomeEmpresa: text("nome_empresa").notNull(),
  cnpj: text("cnpj").notNull().unique(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const biddings = pgTable("biddings", {
  id: serial("id").primaryKey(),
  conlicitacao_id: integer("conlicitacao_id").notNull(), // ID da ConLicitação
  orgao_nome: text("orgao_nome").notNull(),
  orgao_codigo: text("orgao_codigo"),
  orgao_cidade: text("orgao_cidade").notNull(),
  orgao_uf: text("orgao_uf").notNull(),
  orgao_endereco: text("orgao_endereco"),
  orgao_telefone: text("orgao_telefone"),
  orgao_site: text("orgao_site"),
  objeto: text("objeto").notNull(),
  situacao: text("situacao").notNull(),
  datahora_abertura: text("datahora_abertura"),
  datahora_documento: text("datahora_documento"),
  datahora_retirada: text("datahora_retirada"),
  datahora_visita: text("datahora_visita"),
  datahora_prazo: text("datahora_prazo"),
  edital: text("edital"),
  link_edital: text("link_edital"),
  documento_url: text("documento_url"),
  processo: text("processo"),
  observacao: text("observacao"),
  item: text("item"),
  preco_edital: real("preco_edital"),
  valor_estimado: real("valor_estimado"),
  boletim_id: integer("boletim_id"), // ID do boletim que contém esta licitação
});

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  biddingId: integer("bidding_id").notNull(),
  category: text("category"), // Categoria: alimentacao, limpeza, sites, outros
  customCategory: text("custom_category"), // Categoria personalizada definida pelo usuário
  notes: text("notes"), // Notas/observações do usuário sobre o favorito
  uf: text("uf"), // UF da licitação
  codigoUasg: text("codigo_uasg"), // Código UASG/Gestora
  valorEstimado: text("valor_estimado"), // Valor estimado/contratado
  fornecedor: text("fornecedor"), // Fornecedor/UASG do fornecedor
  site: text("site"), // Site de origem da licitação
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabela de filtros da ConLicitação
export const filtros = pgTable("filtros", {
  id: integer("id").primaryKey(), // ID do filtro da ConLicitação
  descricao: text("descricao").notNull(),
  cliente_id: integer("cliente_id"),
  cliente_razao_social: text("cliente_razao_social"),
  manha: boolean("manha").default(true),
  tarde: boolean("tarde").default(true),
  noite: boolean("noite").default(true),
});

export const boletins = pgTable("boletins", {
  id: integer("id").primaryKey(), // ID do boletim da ConLicitação
  numero_edicao: integer("numero_edicao").notNull(),
  datahora_fechamento: text("datahora_fechamento").notNull(),
  filtro_id: integer("filtro_id").notNull(),
  quantidade_licitacoes: integer("quantidade_licitacoes").notNull(),
  quantidade_acompanhamentos: integer("quantidade_acompanhamentos").notNull(),
  visualizado: boolean("visualizado").default(false).notNull(),
});

// Tabela de acompanhamentos
export const acompanhamentos = pgTable("acompanhamentos", {
  id: serial("id").primaryKey(),
  conlicitacao_id: integer("conlicitacao_id").notNull(),
  licitacao_id: integer("licitacao_id"), // Referência à licitação original
  orgao_nome: text("orgao_nome").notNull(),
  orgao_cidade: text("orgao_cidade"),
  orgao_uf: text("orgao_uf"),
  objeto: text("objeto").notNull(),
  sintese: text("sintese"),
  data_fonte: text("data_fonte"),
  edital: text("edital"),
  processo: text("processo"),
  boletim_id: integer("boletim_id"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  nomeEmpresa: true,
  cnpj: true,
  nome: true,
  email: true,
  password: true,
});

export const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(6, "Confirmação de senha deve ter no mínimo 6 caracteres"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
  newPassword: z.string().min(6, "Nova senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirmação de senha deve ter no mínimo 6 caracteres"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

export const insertBiddingSchema = createInsertSchema(biddings).omit({
  id: true,
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export const insertFiltroSchema = createInsertSchema(filtros);
export const insertBoletimSchema = createInsertSchema(boletins);
export const insertAcompanhamentoSchema = createInsertSchema(acompanhamentos).omit({
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
export type InsertFiltro = z.infer<typeof insertFiltroSchema>;
export type Filtro = typeof filtros.$inferSelect;
export type InsertBoletim = z.infer<typeof insertBoletimSchema>;
export type Boletim = typeof boletins.$inferSelect;
export type InsertAcompanhamento = z.infer<typeof insertAcompanhamentoSchema>;
export type Acompanhamento = typeof acompanhamentos.$inferSelect;
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;
