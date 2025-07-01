const { spawn } = require('child_process');
const path = require('path');

console.log('Iniciando LicitaTraker...');
console.log('Acesse: http://localhost:5000');
console.log('');

// Definir variável de ambiente
process.env.NODE_ENV = 'development';

// Executar o comando de instalação primeiro se node_modules não existir
const fs = require('fs');
if (!fs.existsSync('./node_modules')) {
  console.log('Instalando dependências...');
  const install = spawn('npm', ['install'], {
    stdio: 'inherit',
    shell: true
  });
  
  install.on('close', (code) => {
    if (code === 0) {
      startServer();
    } else {
      console.error('Erro na instalação das dependências');
    }
  });
} else {
  startServer();
}

function startServer() {
  console.log('Iniciando servidor...');
  
  const serverPath = path.join(__dirname, 'server', 'index.ts');
  const child = spawn('npx', ['tsx', serverPath], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  });

  child.on('error', (error) => {
    console.error('Erro ao iniciar servidor:', error.message);
  });

  child.on('close', (code) => {
    console.log(`Servidor encerrado com código ${code}`);
  });
}