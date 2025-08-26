@echo off
echo ==== INICIANDO DEPLOY ====

echo Conectando ao servidor e executando deploy...

ssh -o StrictHostKeyChecking=no root@31.97.26.138 "cd ~/dev_master && echo 'Configurando git para HTTPS...' && git remote set-url origin https://github.com/wyconsult/dev_master.git && echo 'Atualizando codigo...' && git reset --hard HEAD && git clean -fd && git pull origin main && echo 'Instalando dependencias...' && npm ci && echo 'Fazendo build...' && npm run build && echo 'Reiniciando aplicacao...' && pm2 restart all && echo 'Deploy concluido com sucesso!'"

echo ==== DEPLOY FINALIZADO ====
echo.
echo ALTERNATIVA - Se ainda der erro, execute manualmente:
echo.
echo 1. ssh root@31.97.26.138
echo 2. cd ~/dev_master
echo 3. git remote set-url origin https://github.com/wyconsult/dev_master.git
echo 4. git pull origin main
echo 5. npm ci
echo 6. npm run build  
echo 7. pm2 restart all
echo.
pause