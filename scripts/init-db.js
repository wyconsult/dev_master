import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

async function initializeDatabase() {
  console.log('🔧 Inicializando banco de dados...');
  
  try {
    // Conectar ao MySQL
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'geovani',
      password: process.env.DB_PASSWORD || 'Vermelho006@',
      database: process.env.DB_NAME || 'jlg_consultoria'
    });
    
    console.log('✅ Conectado ao MySQL');
    
    // Criar tabela users se não existir
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome_empresa VARCHAR(255) NOT NULL,
        cnpj VARCHAR(18) NOT NULL UNIQUE,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Tabela users criada/verificada');
    
    // Criar tabela favorites se não existir
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        bidding_id INT NOT NULL,
        category VARCHAR(100),
        custom_category VARCHAR(255),
        notes VARCHAR(1000),
        uf VARCHAR(2),
        codigo_uasg VARCHAR(50),
        valor_estimado VARCHAR(100),
        fornecedor VARCHAR(255),
        site VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Tabela favorites criada/verificada');
    
    // Verificar se já existe usuário admin
    const [rows] = await connection.execute(
      'SELECT COUNT(*) as count FROM users WHERE email = ?',
      ['admin@jlg.com']
    );
    
    if (rows[0].count > 0) {
      console.log('👤 Usuário admin já existe');
      await connection.end();
      return;
    }
    
    // Criar usuário admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await connection.execute(`
      INSERT INTO users (nome_empresa, cnpj, nome, email, password, created_at) 
      VALUES (?, ?, ?, ?, ?, NOW())
    `, [
      'JLG Consultoria',
      '12345678000100',
      'Administrador',
      'admin@jlg.com',
      hashedPassword
    ]);
    
    console.log('🎉 Usuário admin criado com sucesso!');
    console.log('📧 Email: admin@jlg.com');
    console.log('🔑 Senha: admin123');
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error.message);
    process.exit(1);
  }
}

// Executar quando o script for chamado
initializeDatabase();

export { initializeDatabase };