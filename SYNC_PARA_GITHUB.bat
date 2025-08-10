@echo off
echo ===============================================
echo SYNC COMPLETO: REPLIT -> GITHUB -> PRODUCAO
echo ===============================================

cd C:\Users\Geovani\LicitacaoTracker

echo.
echo 1) Removendo arquivos problemáticos...
rmdir /s /q .local 2>nul
git clean -fd

echo.
echo 2) Baixando últimas mudanças do Replit...
git pull origin main --rebase

echo.
echo 3) Adicionando TODAS as mudanças...
git add -A

echo.
echo 4) Commitando funcionalidades completas...
git commit -m "Deploy COMPLETO: Filtros avançados + Tabulação + PDF + Todas funcionalidades implementadas no Replit"

echo.
echo 5) Enviando para GitHub...
git push origin main

echo.
echo ===============================================
echo SUCESSO! Agora execute no servidor:
echo ===============================================
echo ssh root@31.97.26.138
echo cd ~/dev_master
echo git pull origin main
echo npm ci
echo npm run build  
echo pm2 restart all
echo ===============================================
pause