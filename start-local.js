// Script simples para iniciar o servidor no Windows
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Iniciando LicitaTraker...');
console.log('Acesse: http://localhost:5000');
console.log('');

// Definir variável de ambiente
process.env.NODE_ENV = 'development';

// Executar o servidor
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