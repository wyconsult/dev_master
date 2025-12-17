import { defineConfig } from "drizzle-kit";

// Configuração do banco de dados (mesmos padrões do server/db.ts)
const host = process.env.DB_HOST || 'localhost';
const user = process.env.DB_USER || 'geovani';
const password = process.env.DB_PASSWORD || 'Vermelho006@';
const database = process.env.DB_NAME || 'jlg_consultoria';

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    host,
    user,
    password,
    database,
  },
});
