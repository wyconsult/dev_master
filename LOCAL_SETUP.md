# LicitaTraker - Configuração Local

## Pré-requisitos

- Node.js 18 ou superior
- npm ou yarn

## Instalação

1. **Clone ou baixe o projeto** para sua máquina local

2. **Instale as dependências**:
```bash
npm install
```

3. **Configure as variáveis de ambiente** (opcional):
Crie um arquivo `.env` na raiz do projeto se precisar de configurações específicas:
```env
NODE_ENV=development
PORT=5000
```

## Executando a aplicação

### Modo desenvolvimento
```bash
npm run dev
```

A aplicação estará disponível em: `http://localhost:5000`

### Modo produção
```bash
# Build da aplicação
npm run build

# Executar em produção
npm start
```

## Funcionalidades disponíveis

Com seu IP autorizado (189.89.90.102), você terá acesso completo a:

- ✅ **Dashboard** com estatísticas reais da ConLicitação
- ✅ **Boletins** com os 3 boletins diários (manhã, tarde, noite)
- ✅ **Licitações** com dados reais e filtros avançados
- ✅ **Favoritos** com funcionalidade completa
- ✅ **Autenticação** de usuários

## Estrutura do projeto

```
LicitaTraker/
├── client/           # Frontend React
├── server/           # Backend Express
├── shared/           # Tipos compartilhados
├── package.json      # Dependências
└── vite.config.ts    # Configuração do build
```

## API ConLicitação

A aplicação usa o token: `27a24a9a-44ce-4de8-a8ac-82cc58ca9f6e`
Endpoints principais:
- Filtros: `/api/filtros`
- Boletins: `/api/filtro/{id}/boletins`
- Detalhes: `/api/boletim/{id}`

## Troubleshooting

Se encontrar problemas:

1. **Erro de permissão**: Verifique se está executando do IP 189.89.90.102
2. **Porta ocupada**: Mude a porta no arquivo `vite.config.ts`
3. **Dependências**: Execute `npm install` novamente

## Suporte

O sistema está configurado para funcionar apenas com dados reais da API ConLicitação.