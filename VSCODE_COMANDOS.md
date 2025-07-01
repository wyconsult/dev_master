# 🚀 Executar LicitaTraker no VS Code

## ⚡ Métodos rápidos no VS Code

### 1. Via Terminal integrado (MAIS FÁCIL)
Abra o terminal integrado (`Ctrl + '`) e execute:
```bash
npx tsx server/index.ts
```

### 2. Via Command Palette 
- Pressione `Ctrl + Shift + P`
- Digite: `Tasks: Run Task`
- Selecione: `Iniciar LicitaTraker`

### 3. Via Debug/Run
- Pressione `F5` ou `Ctrl + F5`
- Selecione: `Executar LicitaTraker`

### 4. Via botão Run/Debug
- Vá na aba "Run and Debug" (Ctrl + Shift + D)
- Clique em "Executar LicitaTraker"
- Clique no botão play ▶️

## 📁 Arquivos criados para VS Code

- `.vscode/tasks.json` - Configuração de tarefas
- `.vscode/launch.json` - Configuração de execução/debug

## 🎯 Execução em 2 passos

1. **Abra o projeto no VS Code**
2. **Use uma das opções acima**

## ✅ O que vai acontecer

1. O terminal vai mostrar: "serving on port 5000"
2. Acesse: `http://localhost:5000`
3. Sistema funcionará com dados reais da ConLicitação

## 🔧 Atalhos úteis

- `Ctrl + '` - Abrir/fechar terminal
- `Ctrl + Shift + P` - Command Palette
- `F5` - Executar com debug
- `Ctrl + F5` - Executar sem debug
- `Ctrl + C` - Parar servidor (no terminal)

## 📱 Funcionalidades disponíveis

Com seu IP autorizado (189.89.90.102):
- Dashboard com estatísticas reais
- Boletins diários funcionais
- Licitações com filtros
- Sistema de favoritos
- Autenticação de usuários

**RECOMENDAÇÃO:** Use o terminal integrado com `npx tsx server/index.ts`