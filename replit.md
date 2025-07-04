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

### Fallback System
When the API returns errors (401 Unauthorized, IP restrictions, etc.), the system automatically:
- Logs the error with details
- Switches to development data that mirrors the real API structure
- Continues operation seamlessly without interruption
- Provides realistic test data for development and demonstration

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