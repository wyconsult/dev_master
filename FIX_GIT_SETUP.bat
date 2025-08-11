@echo off
echo ===============================================
echo CORRIGIR CONFIGURACAO GIT - LICITATRAKER
echo ===============================================
echo.
echo Este script vai corrigir a configuração Git
echo e preparar para deploys futuros.
echo.
pause

cd C:\Users\Geovani\LicitacaoTracker

echo.
echo 1) Status atual do Git...
git status

echo.
echo 2) Removendo origin atual (se existir)...
git remote remove origin 2>nul

echo.
echo 3) Adicionando origin correto...
git remote add origin https://github.com/wyconsult/dev_master.git

echo.
echo 4) Verificando configuração...
git remote -v

echo.
echo 5) Configurando branch main...
git branch -M main

echo.
echo 6) Fazendo fetch do repositório...
git fetch origin

echo.
echo 7) Configurando upstream...
git branch --set-upstream-to=origin/main main

echo.
echo 8) Testando conexão...
git ls-remote origin

if %errorlevel% equ 0 (
    echo.
    echo ✅ Git configurado corretamente!
    echo.
    echo Agora você pode usar:
    echo - DEPLOY_AUTOMATICO.bat
    echo - SETUP_GIT_E_DEPLOY.bat
    echo.
) else (
    echo.
    echo ⚠️ Erro na configuração. Possíveis causas:
    echo 1. Problema de credenciais Git
    echo 2. Repositório não existe ou sem acesso
    echo 3. Problema de conectividade
    echo.
    echo Configure suas credenciais Git:
    echo git config --global user.name "Seu Nome"
    echo git config --global user.email "seu@email.com"
    echo.
)

pause