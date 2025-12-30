import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema";

// Configuração do MySQL baseada no ambiente
const mysqlConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'geovani',
  password: process.env.DB_PASSWORD || 'Vermelho006@',
  database: process.env.DB_NAME || 'jlg_consultoria',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};



// Pool de conexões MySQL
const pool = mysql.createPool(mysqlConfig);

// Testar conexão
pool.getConnection()
  .then(connection => {

    connection.release();
  })
  .catch(error => {
    console.error('❌ [MySQL] ERRO na conexão:', {
      message: error.message,
      code: error.code,
      config: mysqlConfig
    });
  });

export const db = drizzle(pool, { schema, mode: 'default' });
