import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

async function addWilsonUser() {
  console.log('🔧 Adicionando usuário Wilson...');
  
  try {
    // Conectar ao MySQL
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'geovani',
      password: process.env.DB_PASSWORD || 'Vermelho006@',
      database: process.env.DB_NAME || 'jlg_consultoria'
    });
    
    console.log('✅ Conectado ao MySQL');
    
    // Verificar se já existe usuário wilson
    const [rows] = await connection.execute(
      'SELECT COUNT(*) as count FROM users WHERE email = ?',
      ['wilson@jlg.com']
    );
    
    if (rows[0].count > 0) {
      console.log('👤 Usuário wilson@jlg.com já existe');
      await connection.end();
      return;
    }
    
    // Criar usuário Wilson
    const hashedPassword = await bcrypt.hash('Vermelho006@', 10);
    
    await connection.execute(`
      INSERT INTO users (nome_empresa, cnpj, nome, email, password, created_at) 
      VALUES (?, ?, ?, ?, ?, NOW())
    `, [
      'JLG Consultoria',
      '12345678000199',
      'Wilson',
      'wilson@jlg.com',
      hashedPassword
    ]);
    
    console.log('🎉 Usuário Wilson criado com sucesso!');
    console.log('📧 Email: wilson@jlg.com');
    console.log('🔑 Senha: Vermelho006@');
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário Wilson:', error.message);
    process.exit(1);
  }
}

// Executar quando o script for chamado
addWilsonUser();

export { addWilsonUser };