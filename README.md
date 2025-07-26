# LicitaTraker - Sistema de Gestão de Licitações

## Visão Geral

LicitaTraker é uma aplicação completa para gestão de licitações públicas integrada com a API ConLicitação. O sistema oferece funcionalidades de consulta, filtragem e favoritos para licitações e boletins oficiais.

## Características Principais

- **Dashboard Intuitivo**: Painel central com contadores precisos e navegação rápida
- **Integração API**: Dados reais da API ConLicitação com fallback para desenvolvimento
- **Sistema de Favoritos**: Marque e gerencie suas licitações preferidas
- **Filtros Avançados**: Busca por órgão, UF, número de controle e outros critérios
- **Boletins Organizados**: Visualização de boletins com separação entre Licitações e Acompanhamentos
- **Autenticação**: Sistema de login seguro para usuários

## Tecnologias

### Frontend
- React 18 + TypeScript
- TanStack Query para cache e sincronização
- Tailwind CSS + shadcn/ui para interface
- Wouter para roteamento
- React Hook Form + Zod para formulários

### Backend
- Node.js + Express
- Drizzle ORM + PostgreSQL
- API ConLicitação integrada
- Sistema híbrido com fallbacks

## Configuração para Produção

### 1. Variáveis de Ambiente
```bash
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=production
```

### 2. Configuração da API ConLicitação
- **Token**: `27a24a9a-44ce-4de8-a8ac-82cc58ca9f6e`
- **Base URL**: `https://consultaonline.conlicitacao.com.br/api`
- **IP Autorizado**: Configure seu IP de produção na ConLicitação

### 3. Build e Deploy
```bash
npm install
npm run build
npm run start
```

## Estrutura de Dados

### Licitações
- Informações completas do órgão
- Objeto, situação e valores
- Datas importantes (abertura, prazo)
- Links para documentos
- Status e badges visuais

### Boletins
- Edições numeradas por filtro
- Contadores de licitações e acompanhamentos
- Sistema de visualização
- Navegação por calendário

### Favoritos
- Vinculação por usuário
- Filtros por data
- Sincronização em tempo real

## IPs Autorizados

- **Desenvolvimento**: 35.227.80.200 (Replit)
- **Produção**: 31.97.26.138

Para autorização de novos IPs, contate o suporte da ConLicitação.

## Executar Localmente

```bash
git clone <repositorio>
cd licitatraker
npm install
npm run dev
```

A aplicação estará disponível em `http://localhost:5000`

## Suporte

Sistema preparado para produção com dados reais da API ConLicitação.
Para questões técnicas, consulte a documentação da API em `/DOCUMENTACAO_API.md`.