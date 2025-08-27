#!/bin/bash
echo "Deploy da aplicação JLG Consultoria"

# Parar aplicação atual
pm2 stop jlg-app 2>/dev/null || true

# Atualizar código
git pull origin main 2>/dev/null || true

# Instalar dependências
npm ci

# Build
npm run build

# Criar .env se não existir
if [ ! -f .env ]; then
cat > .env << EOL
DB_HOST=localhost
DB_USER=geovani
DB_PASSWORD=Vermelho006@
DB_NAME=jlg_consultoria
NODE_ENV=production
PORT=3000
EOL
fi

# Inicializar banco
node scripts/init-db.js

# Iniciar aplicação
pm2 start npm --name "jlg-app" -- start
pm2 save

echo "Deploy concluído! http://localhost:3000"
echo "Login: admin@jlg.com | Senha: admin123"