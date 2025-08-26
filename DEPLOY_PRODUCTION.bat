@echo off
echo ==== INICIANDO DEPLOY ====

echo Conectando ao servidor e executando deploy...

ssh -o StrictHostKeyChecking=no root@31.97.26.138 "cd ~/dev_master && echo 'Atualizando codigo...' && git reset --hard HEAD && git clean -fd && git pull origin main && echo 'Instalando dependencias...' && npm ci && echo 'Fazendo build...' && npm run build && echo 'Reiniciando aplicacao...' && pm2 restart all && echo 'Deploy concluido com sucesso!'"

echo ==== DEPLOY FINALIZADO ====
echo.
echo Se houve erro de git, execute o comando manualmente no servidor:
echo ssh root@31.97.26.138
echo cd ~/dev_master 
echo git pull origin main
echo.
pause