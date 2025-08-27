import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema";

// Pool de conexões para o MySQL do seu servidor
const pool = mysql.createPool({
  host: '31.97.26.138',
  user: 'geovani',
  password: 'Vermelho006@',
  database: 'jlg_consultoria',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export const db = drizzle(pool, { schema, mode: 'default' });
