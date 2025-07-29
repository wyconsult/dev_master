# LicitaTraker - Bidding Management System

## Overview

LicitaTraker is a full-stack bidding management application built with React, Node.js/Express, and PostgreSQL. The application provides a platform for managing biddings (licitações), allowing users to browse, filter, and favorite bidding opportunities. It includes features for bulletin management, user authentication, and comprehensive bidding search capabilities. The system integrates with the real ConLicitação API for production data and includes development fallbacks for seamless local development.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Development**: tsx for development server with hot reload
- **Production**: esbuild for server bundling

### Data Storage Solutions
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: Centralized schema definition in `shared/schema.ts`
- **Migrations**: Drizzle Kit for database migrations
- **ConLicitação API**: Production integration with hybrid fallback system for development

### Authentication and Authorization
- **Basic Authentication**: Simple email/password authentication
- **Session Management**: Currently using basic session handling (production would require proper JWT or session store)
- **Route Protection**: Frontend route guards for authenticated vs public routes

## Key Components

### Database Schema
- **Users**: Basic user management with email and password
- **Biddings**: Comprehensive bidding information including organization, location, dates, and financial details
- **Favorites**: User-specific bidding favorites with timestamps
- **Boletins**: Bulletin management for bidding notifications

### API Structure
- **Authentication Routes**: `/api/auth/login` for user authentication
- **Biddings Routes**: `/api/biddings` with filtering capabilities
- **Favorites Routes**: User-specific favorite management
- **ConLicitação Integration Routes**:
  - `/api/filtros` - Retrieve available filters from ConLicitação API
  - `/api/filtro/:filtroId/boletins` - Get bulletins for a specific filter
  - `/api/boletim/:id` - Get detailed bulletin data with biddings and updates
  - `/api/boletins` - Compatibility route for current UI
- **Hybrid Data System**: Automatically switches between real API data and development fallbacks

### UI Components
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Component Library**: Comprehensive shadcn/ui components for consistent UI
- **Form Handling**: React Hook Form with Zod validation
- **Data Visualization**: Custom components for bidding cards and filtering

## Data Flow

1. **Authentication Flow**: User logs in through `/api/auth/login`, receives user object, frontend stores authentication state
2. **Data Fetching**: TanStack Query manages API calls with caching and background updates
3. **Filtering**: Client-side filtering with server-side query parameter support
4. **Favorites Management**: Real-time favorite toggling with optimistic updates
5. **Navigation**: Protected routes redirect unauthenticated users to login

## External Dependencies

### Frontend Dependencies
- **UI Framework**: React ecosystem with TypeScript support
- **UI Components**: Radix UI primitives for accessible components
- **Form Management**: React Hook Form with Zod validation
- **Date Handling**: date-fns for date manipulation and formatting
- **Styling**: Tailwind CSS with class-variance-authority for component variants

### Backend Dependencies
- **Database**: Neon serverless PostgreSQL connection
- **ORM**: Drizzle ORM with PostgreSQL adapter
- **Development**: tsx for TypeScript execution in development

### Development Tools
- **Build System**: Vite for frontend, esbuild for backend
- **Type Checking**: TypeScript with strict configuration
- **Linting**: Configured for code quality and consistency

## Deployment Strategy

### Development Environment
- **Local Development**: `npm run dev` starts both frontend and backend
- **Hot Reload**: Vite HMR for frontend, tsx watch mode for backend
- **Database**: Drizzle migrations with `npm run db:push`

### Production Deployment
- **Build Process**: `npm run build` creates optimized frontend and backend bundles
- **Server**: `npm run start` runs production server
- **Static Files**: Frontend builds to `dist/public`, served by Express
- **Database**: Production PostgreSQL with connection pooling

### Replit Configuration
- **Modules**: Node.js 20, web server, PostgreSQL 16
- **Port Configuration**: Internal port 5000, external port 80
- **Auto-scaling**: Configured for autoscale deployment target

## ConLicitação API Integration

### Overview
The system integrates with the official ConLicitação API to provide real-time bidding data from Brazilian government tenders. The integration uses a hybrid approach that automatically falls back to development data when the API is unavailable.

### Authentication
- **API Base URL**: `https://consultaonline.conlicitacao.com.br/api`
- **Authentication Method**: X-AUTH-TOKEN header with token `27a24a9a-44ce-4de8-a8ac-82cc58ca9f6e`
- **IP Restrictions**: API requires IP whitelisting for production access

### Data Flow
1. **Filtros**: Retrieve available client filters from ConLicitação
2. **Boletins**: Get bulletin lists with pagination support
3. **Licitações**: Extract detailed bidding information from bulletin data
4. **Acompanhamentos**: Track bidding updates and results

### Production-Ready Configuration
The system is configured for production use with real data only:
- **Real API integration**: All data comes from ConLicitação API when IP is authorized
- **Enhanced error detection**: System detects IP authorization and compares with authorized IP  
- **Authorized IPs**: 35.227.80.200 (development - Replit), 31.97.26.138 (production)
- **Dynamic counting**: quantidade_licitacoes and quantidade_acompanhamentos calculated from real API data arrays
- **Fallback handling**: When IP unauthorized, maintains system functionality with test data
- **Production deployment**: Ready for deployment with IP authorization workflow documented
- **IP Management**: Automatic detection and comparison with authorized IPs list

### File Structure
- `server/conlicitacao-api.ts` - API client for ConLicitação integration
- `server/conlicitacao-storage.ts` - Hybrid storage with API integration and fallbacks
- Development data matches the exact structure of real API responses

## Local Development

The application is configured for local development via VS Code terminal. User executes locally with authorized IP for ConLicitação API access.

### Local Execution:
```bash
npm install
npx tsx server/index.ts
```
Application runs on `http://localhost:5000` with full API access when IP is authorized.

## Changelog

```
Changelog:
- January 28, 2025. Implementada contagem dinâmica de licitações e acompanhamentos nos boletins baseada nos dados reais da API - sistema agora calcula quantidade_licitacoes e quantidade_acompanhamentos através do tamanho real dos arrays retornados pela ConLicitação API
- January 28, 2025. Expandido mapeamento de status truncados: RET→RETIFICAÇÃO, ADIA→ADIADA, PRO→PRORROGADA, ALTER→ALTERADA, REAB→REABERTA, CANCE→CANCELADA, SUS→SUSPENSA, REVO→REVOGADA
- January 28, 2025. Corrigido tratamento de status truncados nos cards com mapeamento completo e linha de status separada
- January 9, 2025. Implementado filtro duplo de datas na página favoritos (inclusão favorito vs realização)
- January 9, 2025. Reestruturação completa dos cards com cabeçalho verde e múltiplas datas
- January 9, 2025. Implementado código do órgão nos cards (formato: código - nome)
- January 9, 2025. Correção final boletins cinza e contador favoritos tempo real
- January 9, 2025. Contador favoritos corrigido e API ConLicitação preparada conforme documentação oficial
- January 9, 2025. Contador licitações mostra total correto e boletins ficam cinza após visualização
- January 9, 2025. Corrigido contador de favoritos no dashboard e removidos todos arquivos desnecessários
- January 9, 2025. Dashboard atualizado com quantidades precisas e arquivos desnecessários removidos
- January 9, 2025. Aplicado correção robusta com estilos inline para badge URGENTE e calendário
- January 9, 2025. Corrigido links documentos para usar documento[0].url da API real e badge URGENTE completo
- January 9, 2025. Sistema preparado para dados reais da API - mapeamento URGENTE e links corrigidos
- January 8, 2025. IP Replit mudou para 35.227.80.200 - necessária nova autorização
- January 8, 2025. Configured Replit IP (104.196.156.252) as development environment
- January 8, 2025. Fixed production issues: URGENTE badge text cutting and document links
- January 8, 2025. Established Replit as primary development environment with download workflow for production
- January 8, 2025. User requested authorization for Replit IP (104.196.156.252) to enable full development workflow
- January 8, 2025. Applied final UI corrections for URGENTE badge and document links - awaiting IP authorization for testing with real data
- January 8, 2025. System ready with minWidth: 80px, whiteSpace: nowrap for badge and anchor tag for document links
- January 7, 2025. API access temporarily restricted - admin resolving authorization issue
- January 7, 2025. Enhanced API error handling - system detects IP authorization status
- January 7, 2025. Added automatic IP detection with authorized IP comparison
- January 7, 2025. Prepared system for production deployment with IP authorization workflow
- January 7, 2025. Current status: Both IPs configured - Dev: 189.89.90.102, Prod: 31.97.26.138
- January 7, 2025. System configured for real API data only - no fallback data
- January 7, 2025. Updated favorites page with red eraser icon for clearing filters
- January 7, 2025. Completed all UI improvements: dashboard simplification, boletins calendar, biddings filters, favorites date range
- January 7, 2025. System configured for local execution with authorized IP access
- January 2, 2025. Successfully deployed locally on Windows with VS Code integration
- January 2, 2025. Fixed Windows compatibility issues with IPv4 binding and CommonJS scripts
- January 2, 2025. Prepared application for local deployment with authorized IP
- January 2, 2025. ConLicitação API integration with hybrid fallback system
- June 25, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```