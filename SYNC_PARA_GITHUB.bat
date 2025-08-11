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
git commit -m "Deploy: Sistema tabulação hierárquica completo + PDF otimizado + API dados reais"

echo.
echo 5) Enviando para GitHub...
git push origin main

echo.
echo ===============================================
echo SYNC GITHUB CONCLUÍDO! Deploy manual:
echo ===============================================
echo 1. ssh root@31.97.26.138 (senha: Vermelho006@)
echo 2. cd ~/dev_master
echo 3. git pull origin main (senha: Vermelho006@)
echo 4. npm ci
echo 5. npm run build  
echo 6. pm2 restart all
echo ===============================================
pause