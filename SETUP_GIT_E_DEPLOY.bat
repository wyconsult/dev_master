@echo off
echo ===============================================
echo SETUP GIT + DEPLOY AUTOMATICO - LICITATRAKER
echo ===============================================
echo.
echo Este script vai:
echo 1. Configurar o repositório Git corretamente
echo 2. Fazer sync para GitHub
echo 3. Deploy automatico no servidor
echo.
pause

cd C:\Users\Geovani\LicitacaoTracker

echo.
echo ===========================================
echo CONFIGURANDO REPOSITORIO GIT
echo ===========================================

echo.
echo 1) Verificando status do Git...
git status

echo.
echo 2) Configurando remote origin...
git remote remove origin 2>nul
git remote add origin https://github.com/wyconsult/dev_master.git

echo.
echo 3) Verificando remotes configurados...
git remote -v

echo.
echo 4) Fazendo fetch inicial...
git fetch origin

echo.
echo 5) Configurando branch main...
git branch -M main
git branch --set-upstream-to=origin/main main

echo.
echo ===========================================
echo SINCRONIZANDO COM GITHUB
echo ===========================================

echo.
echo 6) Limpando arquivos temporários...
rmdir /s /q .local 2>nul
git clean -fd

echo.
echo 7) Baixando mudanças do GitHub...
git pull origin main --rebase --allow-unrelated-histories

echo.
echo 8) Adicionando todas as mudanças locais...
git add -A

echo.
echo 9) Verificando se há mudanças para commit...
git status

echo.
echo 10) Commitando mudanças (se houver)...
git commit -m "Deploy: Sistema tabulação hierárquica completo + PDF otimizado + preparado para API real" || echo "Nada para commitar"

echo.
echo 11) Enviando para GitHub...
git push origin main

if %errorlevel% neq 0 (
    echo.
    echo ⚠️ Erro no push. Tentando forçar...
    git push origin main --force-with-lease
    if %errorlevel% neq 0 (
        echo ERRO: Falha no push para GitHub
        echo.
        echo Possíveis soluções:
        echo 1. Verificar se tem acesso ao repositório
        echo 2. Configurar credenciais Git
        echo 3. Verificar conexão internet
        pause
        exit /b 1
    )
)

echo.
echo ✅ GitHub sincronizado com sucesso!

echo.
echo ===========================================
echo DEPLOY AUTOMATICO NO SERVIDOR
echo ===========================================

echo.
echo Conectando ao servidor 31.97.26.138...

rem Criar script para execução no servidor
echo #!/bin/bash > temp_deploy.sh
echo cd ~/dev_master >> temp_deploy.sh
echo echo "Baixando código atualizado..." >> temp_deploy.sh
echo git pull origin main >> temp_deploy.sh
echo echo "Instalando dependências..." >> temp_deploy.sh
echo npm ci >> temp_deploy.sh
echo echo "Gerando build de produção..." >> temp_deploy.sh
echo npm run build >> temp_deploy.sh
echo echo "Reiniciando aplicação..." >> temp_deploy.sh
echo pm2 restart all >> temp_deploy.sh
echo echo "✅ Deploy concluído com sucesso!" >> temp_deploy.sh

echo.
echo Executando deploy automatico...

rem Tentar plink primeiro (PuTTY)
where plink >nul 2>nul
if %errorlevel% equ 0 (
    echo Usando plink para conexão SSH...
    plink -ssh root@31.97.26.138 -pw "Vermelho006@" -batch -m temp_deploy.sh
) else (
    echo PuTTY não encontrado. Tentando ssh nativo...
    ssh -o StrictHostKeyChecking=no root@31.97.26.138 "bash -s" < temp_deploy.sh
)

rem Limpar arquivo temporário
del temp_deploy.sh

if %errorlevel% neq 0 (
    echo.
    echo ⚠️ Deploy automatico falhou. Comandos para execução manual:
    echo.
    echo 1. Conecte ao servidor:
    echo    ssh root@31.97.26.138
    echo    (digite senha: Vermelho006@)
    echo.
    echo 2. Execute os comandos:
    echo    cd ~/dev_master
    echo    git pull origin main
    echo    (digite senha: Vermelho006@ se solicitado)
    echo    npm ci
    echo    npm run build
    echo    pm2 restart all
    echo.
    pause
    exit /b 1
)

echo.
echo ===========================================
echo 🎉 DEPLOY COMPLETO REALIZADO!
echo ===========================================
echo.
echo ✅ Repositório Git configurado
echo ✅ Código sincronizado no GitHub
echo ✅ Deploy realizado no servidor
echo ✅ Aplicação reiniciada
echo.
echo 🌐 Sistema disponível: http://31.97.26.138:5000
echo.
echo 📋 Funcionalidades implantadas:
echo   - Tabulação hierárquica completa
echo   - PDF otimizado (campos removidos)
echo   - API preparada para dados reais
echo   - Interface responsiva
echo.
echo 📊 Para monitorar:
echo   ssh root@31.97.26.138
echo   pm2 logs licitatraker
echo.
pause