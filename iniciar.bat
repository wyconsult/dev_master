@echo off
cls
echo.
echo ==========================================
echo   LicitaTraker - Sistema de Licitacoes
echo ==========================================
echo.
echo Iniciando servidor...
echo Acesse: http://localhost:5000
echo.
echo Pressione Ctrl+C para parar o servidor
echo.
set NODE_ENV=development
npx tsx server/index.ts
pause