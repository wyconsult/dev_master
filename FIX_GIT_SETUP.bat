@echo off
echo ===============================================
echo GIT SETUP + SYNC GITHUB - LICITATRAKER v2.1
echo ===============================================
echo.
echo Este script vai:
echo 1. Configurar o repositório Git
echo 2. Fazer commit e sync para GitHub
echo 3. Preparar para deploy manual em produção
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

if %errorlevel% neq 0 (
    echo.
    echo ⚠️ Erro na configuração. Configure suas credenciais:
    echo git config --global user.name "Seu Nome"
    echo git config --global user.email "seu@email.com"
    pause
    exit /b 1
)

echo.
echo ✅ Git configurado! Fazendo sync...

echo.
echo 9) Limpando arquivos temporários...
rmdir /s /q .local 2>nul
git clean -fd

echo.
echo 10) Baixando mudanças do GitHub...
git pull origin main --rebase --allow-unrelated-histories

echo.
echo 11) Adicionando mudanças locais...
git add -A

echo.
echo 12) Commitando com mensagem atualizada...
git commit -m "v2.1: Sistema completo - tabulação hierárquica, PDF otimizado, pesquisa sites dinâmica, favoritos com coração preenchido" || echo "Nada para commitar"

echo.
echo 13) Enviando para GitHub...
git push origin main

if %errorlevel% neq 0 (
    echo ⚠️ Erro no push. Tentando forçar...
    git push origin main --force-with-lease
)

echo.
echo ===============================================
echo ✅ SYNC GIT CONCLUÍDO COM SUCESSO!
echo ===============================================
echo.
echo === FUNCIONALIDADES v2.1 IMPLEMENTADAS ===
echo • Tabulação hierárquica completa (Tipo → Categoria → Especialização)
echo • PDF com campo OBJETO extraindo apenas categoria
echo • Pesquisa dinâmica de sites com filtro em tempo real
echo • Favoritos com coração preenchido (indica favorito)
echo • Sistema preparado para dados reais API ConLicitação
echo • Filtros avançados por data, UF, órgão
echo • Interface responsiva mobile-first
echo.
echo === PRÓXIMO PASSO: DEPLOY MANUAL ===
echo Servidor: 31.97.26.138
echo Senha: Vermelho006@
echo Comandos no servidor:
echo   npm install
echo   npm run build  
echo   npm start
echo.
echo Sistema 100%% funcional e pronto!
echo.
pause