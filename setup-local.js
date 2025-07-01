#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Configurando LicitaTraker para execução local...\n');

// Verificar se o Node.js está na versão correta
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 18) {
  console.error('❌ Node.js 18 ou superior é necessário. Versão atual:', nodeVersion);
  process.exit(1);
}

console.log('✅ Node.js', nodeVersion, 'detectado');

// Verificar se as dependências estão instaladas
if (!fs.existsSync('./node_modules')) {
  console.log('📦 Instalando dependências...');
  const { execSync } = require('child_process');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependências instaladas com sucesso');
  } catch (error) {
    console.error('❌ Erro ao instalar dependências:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Dependências já instaladas');
}

// Criar arquivo .env se não existir
if (!fs.existsSync('./.env')) {
  const envContent = `# Configuração local do LicitaTraker
NODE_ENV=development
PORT=5000

# Token da API ConLicitação (já configurado)
CONLICITACAO_TOKEN=27a24a9a-44ce-4de8-a8ac-82cc58ca9f6e
`;
  fs.writeFileSync('./.env', envContent);
  console.log('✅ Arquivo .env criado');
} else {
  console.log('✅ Arquivo .env já existe');
}

console.log('\n🎉 Configuração concluída!');
console.log('\nPara iniciar a aplicação:');
console.log('  npm run dev');
console.log('\nA aplicação estará disponível em: http://localhost:5000');
console.log('\n📱 Funcionalidades disponíveis com seu IP autorizado:');
console.log('  • Dashboard com estatísticas reais');
console.log('  • Boletins diários (manhã, tarde, noite)');
console.log('  • Licitações com dados da ConLicitação');
console.log('  • Sistema de favoritos');
console.log('  • Autenticação de usuários');