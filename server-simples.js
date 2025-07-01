// Servidor simplificado para Windows
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

// Middleware básico
app.use(express.json());
app.use(express.static('dist/public'));

// Rota básica de teste
app.get('/api/test', (req, res) => {
  res.json({ message: 'Servidor funcionando!', ip: req.ip });
});

// Servir arquivos estáticos
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ message: 'LicitaTraker servidor ativo', porta: PORT });
  }
});

app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  LicitaTraker - Servidor iniciado!');
  console.log('========================================');
  console.log('');
  console.log(`Acesse: http://localhost:${PORT}`);
  console.log('Pressione Ctrl+C para parar');
  console.log('');
});

// Tratamento de erros
process.on('uncaughtException', (err) => {
  console.error('Erro:', err.message);
});

process.on('unhandledRejection', (err) => {
  console.error('Erro de promise:', err);
});