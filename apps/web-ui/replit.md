# Shinobi Internal Developer Platform (IDP)

## Overview

Shinobi is an Internal Developer Platform (IDP) built on AWS CDK that provides a declarative, compliance-aware control plane for cloud infrastructure. Developers declare intent in a service.yml manifest, and the platform resolves, validates, and deploys the infrastructure with guardrails for security, compliance, and observability.

The platform UI provides comprehensive management capabilities for the Shinobi IDP, featuring monitoring, infrastructure operations, AI-powered tools, and team collaboration - all following a citation-rich design approach inspired by Perplexity and Codex with a dark-mode-first interface optimized for technical workflows.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The client-side is built as a single-page React application using TypeScript and modern tooling:

- **React 18** with TypeScript for the component layer
- **Vite** as the build tool and development server
- **Tailwind CSS** for styling with a custom design system
- **shadcn/ui** component library with Radix UI primitives
- **TanStack Query** for server state management
- **Wouter** for client-side routing

The design system implements a dark-first color palette with violet/teal accents, focusing on developer experience with high contrast, minimal chrome, and citation-rich interfaces. Typography uses Inter for UI text and JetBrains Mono for code.

### Backend Architecture

The server follows a Node.js/Express pattern with TypeScript:

- **Express.js** as the web framework
- **TypeScript** for type safety across the stack
- **Modular route organization** with a clean separation between API endpoints and static serving
- **Middleware-based request handling** with comprehensive logging
- **Development/production environment separation** for Vite integration

### Component Architecture

The UI implements a component-driven architecture with:

- **Atomic design principles** - base UI components, composite components, and page layouts
- **AppShell pattern** - consistent layout with breadcrumbs, metadata rails, and timeline rails
- **Context-aware components** - badges, timestamps, code blocks with syntax highlighting
- **Citation-rich interfaces** - components designed to show references and links prominently

### Data Layer

The application uses a dual storage approach:

- **PostgreSQL database** via Neon serverless with Drizzle ORM
- **In-memory storage fallback** for development and testing
- **Type-safe schema definitions** shared between client and server
- **Migration support** through Drizzle Kit

The database schema currently includes user management with plans for expansion to support platform features like tasks, feed items, and catalog entries.

### Development Workflow

The project supports modern development practices:

- **Hot module replacement** in development via Vite
- **Type checking** across the full stack with shared types
- **Build optimization** with separate client/server bundling
- **Environment-specific configurations** for development and production

## External Dependencies

### Database Services
- **Neon PostgreSQL** - Serverless PostgreSQL database with connection pooling
- **Drizzle ORM** - Type-safe database toolkit with schema migrations

### UI/UX Libraries
- **Radix UI** - Unstyled, accessible UI primitives for complex components
- **Lucide React** - Icon library for consistent iconography
- **date-fns** - Date manipulation and formatting utilities

### Development Tools
- **Vite** - Frontend build tool with HMR and optimized bundling
- **ESBuild** - Fast JavaScript bundler for server-side code
- **TypeScript** - Static type checking and enhanced developer experience

### Styling and Design
- **Tailwind CSS** - Utility-first CSS framework with custom design tokens
- **PostCSS** - CSS processing pipeline with autoprefixer
- **Custom CSS variables** - Design system implementation with semantic color tokens

### State Management
- **TanStack Query** - Server state management with caching and synchronization
- **React Hook Form** - Form state management with validation

## Shinobi Platform Architecture

### Core Components
- **CLI and Validation Engine**: The `svc` command supports scaffolding (init), validation (validate), planning (plan), deploying (up), local emulation (local up), auditing (audit), and migration (migrate)
- **Component Model**: Infrastructure primitives (lambda-api, sqs-queue, rds-postgres) packaged independently with schemas, builders, and tests
- **Bindings and Triggers**: Outbound bindings define compute-to-resource access, inbound triggers define resource-to-component event flows
- **Governance & Compliance**: FedRAMP-ready policies with policy-as-code enforcement and compliance packs (commercial, FedRAMP Moderate, FedRAMP High)
- **MCP Server**: Provides model context API exposing schemas, capabilities, bindings, service states, and logs for AI agent integration

### Platform Features
- **Declarative Infrastructure**: service.yml manifests with CDK-based component resolution
- **Security Defaults**: Encryption, private networking, IAM least-privilege automatically enforced
- **Auditability**: Complete logging of plans, outputs, suppressions, patches, cost estimates
- **Observability**: OpenTelemetry auto-instrumentation with ADOT, structured JSON logs with PII redaction
- **Migration Support**: Reverse-engineer existing CDK stacks into manifests while preserving CloudFormation Logical IDs

The platform UI is designed to be extensible, with clear patterns for adding new features, API endpoints, and UI components while maintaining type safety and consistent design principles aligned with the Shinobi IDP architecture.