# 📦 Instalação Local - LicitaTraker

## Como baixar e executar na sua máquina

### 1. Download do projeto
Baixe todos os arquivos do projeto para uma pasta local na sua máquina.

### 2. Instalação
Abra o terminal/prompt de comando na pasta do projeto e execute:

```bash
# Instalar dependências
npm install

# Executar a aplicação
npm run dev
```

### 3. Acesso
A aplicação estará disponível em: **http://localhost:5000**

## ✅ O que funcionará com seu IP autorizado

Com seu IP `189.89.90.102` autorizado na API, você terá acesso completo a:

- **Dashboard**: Estatísticas reais de licitações
- **Boletins**: 3 boletins diários (manhã, tarde, noite) 
- **Licitações**: Dados reais da ConLicitação com filtros
- **Favoritos**: Sistema completo de favoritos
- **Autenticação**: Login de usuários

## 🔧 Configuração da API

A aplicação já está configurada com:
- Token: `27a24a9a-44ce-4de8-a8ac-82cc58ca9f6e`
- Endpoints da ConLicitação configurados
- Integração pronta para funcionar

## 📁 Estrutura de arquivos

```
LicitaTraker/
├── client/           # Interface React
├── server/           # Backend Express  
├── shared/           # Tipos compartilhados
├── package.json      # Configuração principal
└── README.md         # Este arquivo
```

## 🚀 Comandos disponíveis

```bash
npm run dev      # Executar em desenvolvimento
npm run build    # Construir para produção
npm start        # Executar em produção
```

## 🐛 Solução de problemas

**Erro de porta ocupada?**
- Mude a porta no arquivo `server/index.ts` (linha do PORT)

**API não funciona?**
- Verifique se está executando do IP 189.89.90.102
- O token já está configurado automaticamente

**Problemas de instalação?**
- Execute `npm install` novamente
- Verifique se tem Node.js 18+ instalado

## 📞 Funcionalidades principais

1. **Login**: Use qualquer email/senha para testar
2. **Dashboard**: Visualize estatísticas reais
3. **Boletins**: Navegue pelo calendário
4. **Licitações**: Use os filtros avançados
5. **Favoritos**: Adicione licitações aos favoritos

A aplicação está pronta para uso com dados reais da ConLicitação!