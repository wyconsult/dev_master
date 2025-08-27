const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

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

// Executar se chamado diretamente
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };