@echo off
echo ==== INICIANDO DEPLOY ====

ssh root@31.97.26.138 "cd ~/dev_master && git pull origin main && npm ci && npm run build && pm2 restart all"

echo ==== DEPLOY FINALIZADO ====
pause