# JLG Consultoria - Bidding Management System

## Overview
JLG Consultoria is a full-stack bidding management application designed to streamline the process of managing bidding opportunities (licitações). It enables users to browse, filter, and favorite biddings, manage bulletins, and authenticate securely. The system integrates with the real ConLicitação API for up-to-date data, featuring a hybrid performance system that combines fast loading with accurate counting. Its core purpose is to provide a comprehensive and efficient platform for tracking and managing public tenders.

## Recent Changes (v2.11 - August 2025)
- **BRANDING**: Complete rebrand from "LicitaTraker" to "JLG Consultoria" across all interfaces
- **CRITICAL SEARCH FIX**: Fixed "Nº Controle" search dependency on bulletin visualization
- **COMPLETE DATA LOADING**: All bulletins are now pre-loaded automatically for independent searching
- **PRODUCTION SEARCH**: Search by control number now works regardless of bulletin access history
- **PAGINATION IMPROVEMENT**: Added intelligent pagination for comprehensive data coverage (max 500 bulletins per filter)
- **UI IMPROVEMENTS**: Logo JLG Consultoria positioning corrected (mb-2) - closer to text
- **EDITABLE FIELDS**: UF, Código UASG, and Valor Estimado fields in "Notas" section fully editable
- **PDF FORMATTING**: Fixed monetary value formatting - "R$ 65.000" now correctly displays as "R$ 65.000,00" in reports
- **PRODUCTION READY**: Editable fields work seamlessly with real ConLicitação API data
- **ACCURATE COUNTING**: Real numbers of licitações and acompanhamentos displayed correctly
- **HYBRID PERFORMANCE**: Combines fast API basic data with detailed count retrieval via intelligent caching
- **PARALLEL PROCESSING**: Counts fetched simultaneously for optimal performance
- **SMART CACHING**: First load precise, subsequent loads instant via 5-minute cache
- **ERROR RECOVERY**: Robust timeout and retry mechanisms for API stability

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technologies
- **Frontend**: React 18, TypeScript, Wouter, TanStack Query, shadcn/ui (Radix UI, Tailwind CSS), Vite.
- **Backend**: Node.js, Express.js, TypeScript, tsx (development), esbuild (production).
- **Database**: PostgreSQL (Neon serverless), Drizzle ORM, Drizzle Kit for migrations.

### Key Architectural Decisions
- **Hybrid Data System**: Automatically switches between real ConLicitação API data and development fallbacks, ensuring continuous functionality.
- **Modular Design**: Separated frontend, backend, and shared schema for maintainability and scalability.
- **Component-Based UI**: Utilizes shadcn/ui for consistent, accessible, and responsive design.
- **Type Safety**: End-to-end type safety enforced with TypeScript and Drizzle ORM.
- **Authentication**: Basic email/password authentication with frontend route protection.
- **Deployment Strategy**: Optimized for Replit deployment, with distinct configurations for local development and production.

### Feature Specifications
- **Bidding Management**: Comprehensive biddings data, including organization, location, dates, and financial details.
- **Filtering & Search**: Advanced client-side and server-side filtering capabilities.
- **Favorites**: User-specific favorite management with real-time toggling and optimistic updates.
- **Bulletin Management**: Integration with ConLicitação for bulletin retrieval and display.
- **Responsive UI**: Mobile-first design approach.
- **Form Handling**: React Hook Form with Zod validation for robust form management.
- **Hierarchical Tabulation**: Automatic categorization of biddings (Type of Object → Category → Specialization).

## External Dependencies

- **ConLicitação API**: Primary data source for real-time bidding data. Requires `X-AUTH-TOKEN` header and IP whitelisting for production access.
  - **API Base URL**: `https://consultaonline.conlicitacao.com.br/api`
  - **Auth Token**: `27a24a9a-44ce-4de8-a8ac-82cc58ca9f6e`
  - **Authorized IPs**: 35.227.80.200 (development - Replit), 31.97.26.138 (production).
- **PostgreSQL (Neon serverless)**: Cloud-hosted relational database for application data.
- **React**: Frontend UI library.
- **Node.js**: Backend runtime environment.
- **Express.js**: Backend web framework.
- **TanStack Query**: Data fetching and caching library.
- **shadcn/ui (Radix UI, Tailwind CSS)**: UI component library and styling framework.
- **Drizzle ORM**: Type-safe ORM for database interactions.
- **Vite**: Frontend build tool.
- **esbuild**: Backend bundler.
- **date-fns**: Date manipulation utility.
- **React Hook Form & Zod**: Form management and validation.