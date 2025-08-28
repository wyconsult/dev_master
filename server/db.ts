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

console.log('🗺️ [MySQL] Configurando conexão:', {
  host: mysqlConfig.host,
  user: mysqlConfig.user,
  database: mysqlConfig.database,
  env: process.env.NODE_ENV
});

// Pool de conexões MySQL
const pool = mysql.createPool(mysqlConfig);

// Testar conexão apenas em produção
if (process.env.NODE_ENV === 'production') {
  pool.getConnection()
    .then(connection => {
      console.log('✅ [MySQL] Conexão estabelecida com sucesso!');
      connection.release();
    })
    .catch(error => {
      console.error('❌ [MySQL] ERRO na conexão:', {
        message: error.message,
        code: error.code,
        config: mysqlConfig
      });
    });
}

export const db = drizzle(pool, { schema, mode: 'default' });