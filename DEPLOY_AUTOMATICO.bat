@echo off
echo ===============================================
echo DEPLOY AUTOMATICO LICITATRAKER - PRODUCAO
echo ===============================================
echo.
echo Este script fará o deploy completo automatico:
echo 1. Sync local -> GitHub
echo 2. Deploy automatico no servidor (senhas incluídas)
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
echo FASE 2: DEPLOY AUTOMATICO NO SERVIDOR
echo ===========================================

echo.
echo Conectando automaticamente ao servidor...

rem Criar script temporário para execução no servidor
echo cd ~/dev_master > temp_deploy.sh
echo git pull origin main >> temp_deploy.sh
echo npm ci >> temp_deploy.sh
echo npm run build >> temp_deploy.sh
echo pm2 restart all >> temp_deploy.sh
echo echo "✅ Deploy concluído com sucesso!" >> temp_deploy.sh

echo.
echo Executando deploy no servidor...
rem Usar plink (PuTTY) para conexão automatizada
plink -ssh root@31.97.26.138 -pw Vermelho006@ -batch -m temp_deploy.sh

rem Limpar arquivo temporário
del temp_deploy.sh

if %errorlevel% neq 0 (
    echo.
    echo ⚠️ Erro no deploy automatico. Execute manualmente:
    echo ssh root@31.97.26.138
    echo cd ~/dev_master
    echo git pull origin main
    echo npm ci
    echo npm run build
    echo pm2 restart all
    pause
    exit /b 1
)

echo.
echo ===========================================
echo DEPLOY COMPLETO FINALIZADO!
echo ===========================================
echo.
echo ✅ Código sincronizado no GitHub com sucesso
echo ✅ Deploy realizado automaticamente no servidor
echo ✅ Aplicação reiniciada com PM2
echo.
echo Sistema disponível em: http://31.97.26.138:5000
echo.
echo Funcionalidades implantadas:
echo - Tabulação hierárquica 100%% funcional
echo - PDF otimizado sem campos desnecessários
echo - API preparada para dados reais da ConLicitação
echo - Interface responsiva completa
echo.
echo Para monitorar: ssh root@31.97.26.138 e depois pm2 logs
echo.
pause