# JLG Consultoria - Sistema de Gestão de Licitações

## 🏢 Visão Geral

JLG Consultoria é uma plataforma completa de gestão de licitações que integra com a API ConLicitação para fornecer dados atualizados em tempo real. O sistema oferece funcionalidades avançadas de filtragem, gestão de favoritos, tabulação hierárquica e geração de relatórios em PDF.

## ✨ Funcionalidades Principais

- **🎯 Sistema de Busca Inteligente**: Busca por número de controle sem necessidade de paginação
- **❤️ Gestão de Favoritos**: Sistema completo com filtragem por usuário e categorização hierárquica
- **📊 Tabulação Automática**: Categorização em três níveis (Tipo de Objeto → Categoria → Especialização)
- **📋 Relatórios PDF**: Geração de relatórios customizados com dados tabulados
- **👥 Multi-usuário**: Sistema de autenticação com favoritos separados por usuário
- **📱 Interface Responsiva**: Design otimizado para desktop e mobile
- **🔄 Sincronização em Tempo Real**: Updates automáticos e otimistas na interface

## 🛠️ Tecnologias

### Frontend
- **React 18** + TypeScript
- **TanStack Query** para cache inteligente e sincronização
- **Tailwind CSS** + **shadcn/ui** para interface moderna
- **Wouter** para roteamento eficiente
- **React Hook Form** + **Zod** para formulários validados

### Backend
- **Node.js** + **Express.js** + TypeScript
- **Drizzle ORM** para type-safe database operations
- **MySQL** (produção) / **MemStorage** (desenvolvimento)
- **API ConLicitação** integrada com fallbacks inteligentes

### Arquitetura
- **Hybrid Data Loading**: Carregamento básico rápido + busca sob demanda
- **Smart Caching**: Cache de 5 minutos para performance otimizada
- **Environment Detection**: Detecção automática de ambiente (dev/prod)
- **Parallel Processing**: Requisições simultâneas para múltiplos endpoints

## 🚀 Funcionalidades Técnicas

### Sistema de Favoritos
```typescript
// Gestão de favoritos com campos editáveis
interface Favorite {
  id: number;
  userId: number;
  biddingId: number;
  category?: string;          // Categoria tabulada
  customCategory?: string;    // Categoria personalizada
  notes?: string;            // Observações
  uf?: string;              // Estado (editável)
  site?: string;            // URL personalizada
  codigoUasg?: string;      // Código UASG
  valorEstimado?: string;   // Valor estimado formatado
  createdAt: Date;
}
```

### Tabulação Hierárquica
```
Alimentação/
├── Auxiliar de Cozinha → [Geral, Hospitalar, Escolar]
├── Coffee Break/Almoço/Jantar → [Simples, Completo, Executivo]
└── Fornecimento de Alimentação → [Regular, Especial, Emergência]

Concessão/
├── Concessões de Restaurante → [Básica, Completa, Especializada]
└── Exploração de Restaurante → [Total, Parcial, Temporária]

Mão de Obra/
├── Mão de Obra Cozinheira → [Geral, Especializada, Chefe]
└── Mão de Obra Merendeira → [Básica, Especializada, Supervisora]
```

### API ConLicitação Integration
```typescript
// Configuração automática por ambiente
const API_CONFIG = {
  baseURL: 'https://consultaonline.conlicitacao.com.br/api',
  token: '27a24a9a-44ce-4de8-a8ac-82cc58ca9f6e',
  authorizedIPs: {
    development: '35.227.80.200',
    production: '31.97.26.138'
  }
}
```

## 🔧 Configuração e Deploy

### Ambiente de Desenvolvimento
```bash
git clone <repositorio>
cd jlg-consultoria
npm install
npm run dev
```
**Acesso**: http://localhost:5000  
**Login**: admin@jlg.com / admin123

### Ambiente de Produção
```bash
# Deploy completo
ssh root@31.97.26.138
cd ~/dev_master
git pull origin main
npm ci
npm run build
pm2 restart all
```

**URL**: http://31.97.26.138:5000  
**Usuários**: 
- wilson@jlg.com / Vermelho006@
- moacir@jlg.com / Vermelho006@

### Configuração do Banco
```sql
-- MySQL Produção
Host: 31.97.26.138
Database: jlg_consultoria  
User: wilson / Vermelho006@
PHPMyAdmin: http://31.97.26.138/phpmyadmin/

-- Tabelas principais
users: Sistema de usuários
favorites: Favoritos com categorização
boletins: Cache de boletins da API
```

## 📊 Sistema de Relatórios PDF

### Campos do Relatório
| Campo | Fonte | Editável |
|-------|-------|----------|
| Controle | API ConLicitação | ❌ |
| Data | Prioridade automática¹ | ❌ |
| Nº Pregão | API ConLicitação | ❌ |
| Órgão | API ConLicitação | ❌ |
| Objeto | Categoria tabulada | ✅ |
| UF | Favorito editável | ✅ |
| Site | Favorito editável | ✅ |
| Código UASG | Favorito editável | ✅ |
| Valor Estimado | Favorito editável | ✅ |

¹ *Prioridade: Abertura → Prazo → Documento → Retirada → Visita*

### Filtros Disponíveis
- **Por Data de Inclusão**: Quando foi favoritado
- **Por Data de Realização**: Data da licitação
- **Por Usuário**: Wilson, Moacir, etc.
- **Período Customizado**: Range de datas

## 🔍 Busca e Filtros

### Busca Independente
- **Número de Controle**: Busca direta sem necessidade de carregar todos os dados
- **Timeout Prevention**: Não há mais timeouts de "Loading biddings..."
- **Complete Coverage**: Garante encontrar resultados se existirem na API

### Filtros Avançados
- **Por Órgão**: Multi-seleção com busca
- **Por Estado (UF)**: Todos os estados brasileiros
- **Por Período**: Calendário com duas opções de data
- **Por Usuário**: Favoritos específicos de cada usuário

## 🏗️ Arquitetura do Sistema

### Detecção Automática de Ambiente
```typescript
// Detecção inteligente
const isReplit = process.env.REPLIT === '1' || process.env.NODE_ENV === 'development';
const isProductionServer = !isReplit && process.env.NODE_ENV !== 'development';

// Storage automático
export const storage = isProductionServer 
  ? new DatabaseStorage()  // MySQL em produção
  : new MemStorage();      // Memória no desenvolvimento
```

### Performance Otimizada
- **Hybrid Loading**: Dados essenciais primeiro, detalhes sob demanda
- **Smart Caching**: Cache inteligente de 5 minutos
- **Parallel API Calls**: Requisições simultâneas
- **Optimistic Updates**: Interface responsiva
- **Lazy Loading**: Componentes carregados conforme necessário

## 📈 Métricas de Performance

- **Tempo de Login**: < 2 segundos
- **Carregamento Dashboard**: < 3 segundos  
- **Busca por Controle**: < 5 segundos
- **Geração PDF**: < 10 segundos
- **Sincronização Favoritos**: < 1 segundo

## 🛡️ Segurança e Autenticação

### Sistema de Usuários
- Senhas criptografadas com bcrypt
- Sessões seguras com express-session
- Favoritos isolados por usuário
- Validação de entrada com Zod

### API Security
- Token de autenticação no header
- IP whitelist na ConLicitação
- Rate limiting implementado
- Error handling robusto

## 📁 Estrutura do Projeto

```
jlg-consultoria/
├── client/               # Frontend React
│   ├── src/
│   │   ├── components/   # Componentes UI
│   │   ├── pages/       # Páginas da aplicação
│   │   ├── hooks/       # Hooks customizados
│   │   └── lib/         # Utilities
├── server/              # Backend Node.js
│   ├── routes.ts       # API endpoints
│   ├── storage.ts      # Data layer
│   ├── db.ts          # Database config
│   └── index.ts       # Server setup
├── shared/             # Tipos compartilhados
│   └── schema.ts      # Drizzle schemas
└── README_DEPLOY.md   # Documentação técnica completa
```

## 🆘 Suporte e Documentação

- **Documentação Técnica**: `README_DEPLOY.md`
- **Monitoramento**: PM2 logs em tempo real
- **Database Admin**: PHPMyAdmin disponível
- **API Status**: Logs automáticos de IP authorization

## 🎯 Status do Projeto

**✅ Sistema em Produção**  
**Versão**: 2.15 - JLG Consultoria Production Ready  
**Última Atualização**: 15/09/2025  

**Funcionalidades 100% Operacionais:**
- ✅ Dashboard inteligente
- ✅ Sistema de favoritos multi-usuário
- ✅ Tabulação hierárquica
- ✅ Relatórios PDF customizados
- ✅ Busca independente por controle
- ✅ Interface responsiva
- ✅ Deploy automatizado

---

> **Desenvolvido para JLG Consultoria**  
> Sistema profissional de gestão de licitações com integração ConLicitação API