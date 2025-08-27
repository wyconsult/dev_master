import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema";

// Configuração para o MySQL do seu servidor
const connection = mysql.createConnection({
  host: '31.97.26.138',
  user: 'geovani',
  password: 'Vermelho006@',
  database: 'jlg_consultoria' // Criar este banco no phpMyAdmin
});

export const db = drizzle(connection, { schema, mode: 'default' });
