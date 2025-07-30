import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
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
  // Campos adicionais conforme especificação do módulo de favoritos
  tipoObjeto: text("tipo_objeto"), // Categoria do tipo de objeto
  objeto: text("objeto"), // Descrição do objeto
  site: text("site"), // Site/fonte da licitação
  siteType: text("site_type"), // Tipo do site (Internet/Intranet/Email)
  licitacaoData: text("licitacao_data"), // JSON com dados completos da licitação
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
  email: true,
  password: true,
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

// Tabelas de referência para favoritos (conforme especificação)
export const tiposObjeto = pgTable("tipos_objeto", {
  id: serial("id").primaryKey(),
  tipo_objeto: text("tipo_objeto").notNull(),
  objeto: text("objeto").notNull(),
});

export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  tipo: text("tipo").notNull(), // Internet/Intranet/Email
  site: text("site").notNull(),
});

export const insertTipoObjetoSchema = createInsertSchema(tiposObjeto).omit({ id: true });
export const insertSiteSchema = createInsertSchema(sites).omit({ id: true });

export type TipoObjeto = typeof tiposObjeto.$inferSelect;
export type NewTipoObjeto = z.infer<typeof insertTipoObjetoSchema>;
export type Site = typeof sites.$inferSelect;
export type NewSite = z.infer<typeof insertSiteSchema>;
