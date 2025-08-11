@echo off
echo ===============================================
echo DEPLOY AUTOMATICO LICITATRAKER - PRODUCAO
echo ===============================================
echo.
echo Este script fará o sync para o GitHub:
echo 1. Sync local -> GitHub
echo 2. Instruções para deploy manual no servidor
echo.
echo IP de Produção Autorizado: 31.97.26.138
echo Sistema preparado para dados reais da API ConLicitação
echo.
pause

cd C:\Users\Geovani\LicitacaoTracker

echo.
echo ===========================================
echo FASE 1: SINCRONIZAÇÃO LOCAL -> GITHUB
echo ===========================================

echo.
echo 1) Limpando arquivos temporários...
rmdir /s /q .local 2>nul
git clean -fd

echo.
echo 2) Baixando últimas mudanças do Replit...
git pull origin main --rebase

echo.
echo 3) Adicionando todas as mudanças...
git add -A

echo.
echo 4) Commitando sistema completo...
git commit -m "Deploy Produção: Sistema tabulação hierárquica 100%% funcional + PDF otimizado + API dados reais"

echo.
echo 5) Enviando para GitHub...
git push origin main

if %errorlevel% neq 0 (
    echo ERRO: Falha no push para GitHub
    pause
    exit /b 1
)

echo.
echo ✅ GitHub atualizado com sucesso!

echo.
echo ===========================================
echo FASE 2: COMANDOS PARA O SERVIDOR
echo ===========================================

echo.
echo ✅ GitHub atualizado! Agora execute manualmente no servidor:
echo.
echo 1) Conecte ao servidor:
echo    ssh root@31.97.26.138
echo    (senha: Vermelho006@)
echo.
echo 2) Execute os comandos de deploy:
echo    cd ~/dev_master
echo    git pull origin main
echo    npm ci
echo    npm run build
echo    pm2 restart all
echo.
echo 3) Verificar se funcionou:
echo    pm2 status
echo    pm2 logs licitatraker

echo.
echo ===========================================
echo SYNC GITHUB CONCLUÍDO!
echo ===========================================
echo.
echo ✅ Código sincronizado no GitHub com sucesso
echo.
echo Próximos passos no servidor:
echo 1. Conecte: ssh root@31.97.26.138
echo 2. Atualize: cd ~/dev_master && git pull origin main
echo 3. Build: npm ci && npm run build
echo 4. Restart: pm2 restart all
echo.
echo Sistema estará disponível em: http://31.97.26.138:5000
echo.
echo Funcionalidades prontas:
echo - Tabulação hierárquica 100%% funcional
echo - PDF otimizado sem campos desnecessários
echo - API preparada para dados reais da ConLicitação
echo - Interface responsiva completa
echo.
pause