@echo off
echo ===============================================
echo DEPLOY COMPLETO AUTOMATICO - LICITATRAKER
echo ===============================================
echo.
echo Este script fará todo o processo automaticamente:
echo 1. Sync local -> GitHub
echo 2. Deploy automatico no servidor (com senhas)
echo 3. Restart da aplicação
echo.
echo Servidor: 31.97.26.138 (senha automatica)
echo.
pause

cd C:\Users\Geovani\LicitacaoTracker

echo.
echo ===========================================
echo FASE 1: SYNC LOCAL -> GITHUB
echo ===========================================

echo.
echo 1) Limpando arquivos temporários...
rmdir /s /q .local 2>nul
git clean -fd

echo.
echo 2) Baixando mudanças do Replit...
git pull origin main --rebase

echo.
echo 3) Adicionando todas as mudanças...
git add -A

echo.
echo 4) Commitando sistema completo...
git commit -m "Deploy Produção: Sistema completo com tabulação hierárquica + PDF otimizado"

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
echo Preparando comandos para o servidor...

rem Criar script com comandos para execução
echo #!/bin/bash > deploy_commands.sh
echo export DEBIAN_FRONTEND=noninteractive >> deploy_commands.sh
echo cd ~/dev_master >> deploy_commands.sh
echo echo "Atualizando código..." >> deploy_commands.sh
echo git config --global --add safe.directory ~/dev_master >> deploy_commands.sh
echo echo "Vermelho006@" ^| git pull origin main >> deploy_commands.sh
echo echo "Instalando dependências..." >> deploy_commands.sh
echo npm ci >> deploy_commands.sh
echo echo "Gerando build..." >> deploy_commands.sh
echo npm run build >> deploy_commands.sh
echo echo "Reiniciando aplicação..." >> deploy_commands.sh
echo pm2 restart all >> deploy_commands.sh
echo echo "✅ Deploy concluído!" >> deploy_commands.sh

echo.
echo Conectando e executando no servidor...

rem Usar sshpass se disponível, senão usar plink
where sshpass >nul 2>nul
if %errorlevel% equ 0 (
    echo Usando sshpass...
    sshpass -p "Vermelho006@" ssh -o StrictHostKeyChecking=no root@31.97.26.138 "bash -s" < deploy_commands.sh
) else (
    echo Usando plink...
    plink -ssh root@31.97.26.138 -pw "Vermelho006@" -batch -m deploy_commands.sh
)

rem Limpar arquivo temporário
del deploy_commands.sh

if %errorlevel% neq 0 (
    echo.
    echo ⚠️ Deploy automatico falhou. Comandos manuais:
    echo.
    echo ssh root@31.97.26.138
    echo (senha: Vermelho006@)
    echo cd ~/dev_master
    echo git pull origin main
    echo (senha: Vermelho006@)
    echo npm ci
    echo npm run build
    echo pm2 restart all
    pause
    exit /b 1
)

echo.
echo ===========================================
echo 🎉 DEPLOY COMPLETO REALIZADO!
echo ===========================================
echo.
echo ✅ Sincronização GitHub: SUCESSO
echo ✅ Deploy servidor: SUCESSO  
echo ✅ Aplicação reiniciada: SUCESSO
echo.
echo 🌐 Sistema disponível: http://31.97.26.138:5000
echo.
echo 📋 Funcionalidades implantadas:
echo   - Tabulação hierárquica completa
echo   - PDF com campos otimizados
echo   - API dados reais ConLicitação
echo   - Interface responsiva
echo.
echo 📊 Para monitorar:
echo   ssh root@31.97.26.138
echo   pm2 status
echo   pm2 logs licitatraker
echo.
echo Deploy finalizado com sucesso!
pause