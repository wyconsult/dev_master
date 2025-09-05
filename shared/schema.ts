import { mysqlTable, varchar, int, boolean, timestamp, decimal } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  nomeEmpresa: varchar("nome_empresa", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 18 }).notNull().unique(),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const biddings = mysqlTable("biddings", {
  id: int("id").primaryKey().autoincrement(),
  conlicitacao_id: int("conlicitacao_id").notNull(), // ID da ConLicitação
  orgao_nome: varchar("orgao_nome", { length: 500 }).notNull(),
  orgao_codigo: varchar("orgao_codigo", { length: 100 }),
  orgao_cidade: varchar("orgao_cidade", { length: 255 }).notNull(),
  orgao_uf: varchar("orgao_uf", { length: 2 }).notNull(),
  orgao_endereco: varchar("orgao_endereco", { length: 500 }),
  orgao_telefone: varchar("orgao_telefone", { length: 50 }),
  orgao_site: varchar("orgao_site", { length: 255 }),
  objeto: varchar("objeto", { length: 1000 }).notNull(),
  situacao: varchar("situacao", { length: 100 }).notNull(),
  datahora_abertura: varchar("datahora_abertura", { length: 50 }),
  datahora_documento: varchar("datahora_documento", { length: 50 }),
  datahora_retirada: varchar("datahora_retirada", { length: 50 }),
  datahora_visita: varchar("datahora_visita", { length: 50 }),
  datahora_prazo: varchar("datahora_prazo", { length: 50 }),
  edital: varchar("edital", { length: 255 }),
  link_edital: varchar("link_edital", { length: 500 }),
  documento_url: varchar("documento_url", { length: 500 }),
  processo: varchar("processo", { length: 255 }),
  observacao: varchar("observacao", { length: 1000 }),
  item: varchar("item", { length: 500 }),
  preco_edital: decimal("preco_edital", { precision: 15, scale: 2 }),
  valor_estimado: decimal("valor_estimado", { precision: 15, scale: 2 }),
  boletim_id: int("boletim_id"), // ID do boletim que contém esta licitação
});

export const favorites = mysqlTable("favorites", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  biddingId: int("bidding_id").notNull(),
  category: varchar("category", { length: 100 }), // Categoria: alimentacao, limpeza, sites, outros
  customCategory: varchar("custom_category", { length: 255 }), // Categoria personalizada definida pelo usuário
  notes: varchar("notes", { length: 1000 }), // Notas/observações do usuário sobre o favorito
  uf: varchar("uf", { length: 2 }), // UF da licitação
  codigoUasg: varchar("codigo_uasg", { length: 50 }), // Código UASG/Gestora
  valorEstimado: varchar("valor_estimado", { length: 100 }), // Valor estimado/contratado
  fornecedor: varchar("fornecedor", { length: 255 }), // Fornecedor/UASG do fornecedor
  site: varchar("site", { length: 255 }), // Site de origem da licitação
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabela de filtros da ConLicitação
export const filtros = mysqlTable("filtros", {
  id: int("id").primaryKey(), // ID do filtro da ConLicitação
  descricao: varchar("descricao", { length: 255 }).notNull(),
  cliente_id: int("cliente_id"),
  cliente_razao_social: varchar("cliente_razao_social", { length: 255 }),
  manha: boolean("manha").default(true),
  tarde: boolean("tarde").default(true),
  noite: boolean("noite").default(true),
});

export const boletins = mysqlTable("boletins", {
  id: int("id").primaryKey(), // ID do boletim da ConLicitação
  numero_edicao: int("numero_edicao").notNull(),
  datahora_fechamento: varchar("datahora_fechamento", { length: 50 }).notNull(),
  filtro_id: int("filtro_id").notNull(),
  quantidade_licitacoes: int("quantidade_licitacoes").notNull(),
  quantidade_acompanhamentos: int("quantidade_acompanhamentos").notNull(),
  visualizado: boolean("visualizado").default(false).notNull(),
});

// Tabela de acompanhamentos
export const acompanhamentos = mysqlTable("acompanhamentos", {
  id: int("id").primaryKey().autoincrement(),
  conlicitacao_id: int("conlicitacao_id").notNull(),
  licitacao_id: int("licitacao_id"), // Referência à licitação original
  orgao_nome: varchar("orgao_nome", { length: 500 }).notNull(),
  orgao_cidade: varchar("orgao_cidade", { length: 255 }),
  orgao_uf: varchar("orgao_uf", { length: 2 }),
  objeto: varchar("objeto", { length: 1000 }).notNull(),
  sintese: varchar("sintese", { length: 1000 }),
  data_fonte: varchar("data_fonte", { length: 50 }),
  edital: varchar("edital", { length: 255 }),
  processo: varchar("processo", { length: 255 }),
  boletim_id: int("boletim_id"),
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
