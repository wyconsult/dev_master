# JLG Licita - Bidding Management System

## Overview

JLG Licita is a full-stack bidding management application built with React, Node.js/Express, and PostgreSQL. The application provides a platform for managing biddings (licitações), allowing users to browse, filter, and favorite bidding opportunities. It includes features for bulletin management, user authentication, and comprehensive bidding search capabilities.

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
- **Boletins Routes**: Bulletin retrieval and management

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

## Changelog

```
Changelog:
- June 25, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```