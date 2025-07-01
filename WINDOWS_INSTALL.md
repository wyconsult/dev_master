# 🪟 Instalação no Windows - LicitaTraker

## Problema resolvido
O erro `'NODE_ENV' não é reconhecido como um comando interno` foi corrigido.

## 📋 Passo a passo para Windows

### 1. Download
Baixe todos os arquivos do projeto para uma pasta local.

### 2. Instalação das dependências
```cmd
npm install
```

### 3. Executar a aplicação

**Opção 1 - Comando npm (recomendado):**
```cmd
npm run dev
```

**Opção 2 - Arquivo batch:**
```cmd
start-windows.cmd
```

### 4. Acesso
Abra o navegador em: `http://localhost:5000`

## ✅ Correções aplicadas

- ✅ Instalado `cross-env` para compatibilidade Windows/Linux/Mac
- ✅ Criados arquivos `.bat` e `.cmd` para Windows
- ✅ Atualizado package-local.json com comandos corretos

## 🔧 Se ainda der erro

**Erro de permissão de execução:**
```cmd
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Porta já em uso:**
- Feche outros programas que usam porta 5000
- Ou mude a porta no arquivo `server/index.ts`

**Módulos não encontrados:**
```cmd
npm install --force
```

## 📱 Funcionalidades com IP autorizado

Com seu IP `189.89.90.102`, você terá:
- Dashboard com dados reais da ConLicitação
- Boletins diários funcionais
- Sistema de licitações completo
- Favoritos com persistência
- Login de usuários

## 🚀 Comandos disponíveis

```cmd
npm run dev          # Executar em desenvolvimento
npm run build        # Construir para produção  
npm start           # Executar em produção
start-windows.cmd   # Iniciar no Windows (alternativa)
```

A aplicação está pronta para funcionar no Windows com acesso completo aos dados reais!