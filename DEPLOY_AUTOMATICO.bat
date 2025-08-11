@echo off
echo ===============================================
echo DEPLOY AUTOMATICO LICITATRAKER - PRODUCAO
echo ===============================================
echo.
echo Este script fará o deploy completo do sistema:
echo 1. Sync local -> GitHub
echo 2. Deploy GitHub -> Servidor de Produção
echo 3. Restart da aplicação
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
echo FASE 2: DEPLOY NO SERVIDOR DE PRODUÇÃO
echo ===========================================

echo.
echo Conectando ao servidor 31.97.26.138...
echo NOTA: Digite a senha quando solicitado: Vermelho006@
echo.

rem Conectar via SSH e executar comandos no servidor
ssh root@31.97.26.138 "cd ~/dev_master && echo 'Atualizando código...' && git pull origin main && echo 'Instalando dependências...' && npm ci && echo 'Gerando build de produção...' && npm run build && echo 'Reiniciando aplicação...' && pm2 restart all && echo '✅ Deploy concluído com sucesso!'"

if %errorlevel% neq 0 (
    echo.
    echo ⚠️ Erro no deploy SSH. Executar manualmente:
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
echo DEPLOY CONCLUÍDO COM SUCESSO!
echo ===========================================
echo.
echo ✅ Código sincronizado no GitHub
echo ✅ Deploy realizado no servidor de produção
echo ✅ Aplicação reiniciada com PM2
echo.
echo Sistema funcional em: http://31.97.26.138:5000
echo.
echo Funcionalidades disponíveis:
echo - Dashboard com dados reais da API ConLicitação
echo - Filtros avançados de licitações
echo - Sistema de favoritos com tabulação hierárquica
echo - Geração de PDF otimizada
echo - Interface responsiva completa
echo.
echo Para monitorar logs:
echo ssh root@31.97.26.138
echo pm2 logs licitatraker
echo.
pause