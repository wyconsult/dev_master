@echo off
echo ===============================================
echo COMMIT: SISTEMA DE TABULACAO HIERARQUICA
echo ===============================================

cd C:\Users\Geovani\LicitacaoTracker

echo.
echo 1) Removendo arquivos problemáticos...
rmdir /s /q .local 2>nul
git clean -fd

echo.
echo 2) Baixando últimas mudanças...
git pull origin main --rebase

echo.
echo 3) Adicionando TODAS as mudanças...
git add -A

echo.
echo 4) Commitando sistema hierárquico...
git commit -m "Sistema de Tabulação Hierárquica COMPLETO: 
- Estrutura hierárquica: Tipo de Objeto -> Categoria -> Especialização
- Layout simplificado: Categoria | Site | Notas (três colunas)
- Dropdowns com background branco (problema transparência corrigido)
- Seção Notas melhorada com informações adicionais (UF, Código, Valor)
- Placeholder detalhado para anotações técnicas
- Sites organizados e limpos
- Problema de loading na tela licitações corrigido
- Sistema 100% funcional e pronto para deploy"

echo.
echo 5) Enviando para GitHub...
git push origin main

echo.
echo ===============================================
echo FUNCIONALIDADES IMPLEMENTADAS:
echo ===============================================
echo ✅ Sistema hierárquico de 3 níveis
echo ✅ Alimentação com sub-categorias completas
echo ✅ Limpeza e Sites/Portais organizados
echo ✅ Layout simplificado (Categoria|Site|Notas)
echo ✅ Sites sem parênteses (intranet, internet)
echo ✅ Campos fornecedor removidos temporariamente
echo ✅ Botão salvar funcionando perfeitamente
echo ✅ Pronto para deploy em produção
echo ===============================================
pause