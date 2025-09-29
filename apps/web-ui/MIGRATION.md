# Shinobi UI Migration Guide

## Overview
This package contains the Shinobi Internal Developer Platform UI - a React-based interface for managing AWS CDK infrastructure through declarative service.yml manifests.

## Package Structure
```
shinobi-ui/
├── client/          # React frontend (Vite)
├── server/          # Express backend (API layer)
├── shared/          # Shared TypeScript contracts
├── package.json     # Dependencies and scripts
└── README.md        # This file
```

## Key Dependencies
- **React 18** + TypeScript
- **Vite** for frontend bundling
- **Express** for API server
- **Tailwind CSS** + **shadcn/ui** + **Radix UI** for styling
- **TanStack Query** for state management
- **Drizzle ORM** + **PostgreSQL** for database

## Integration Points

### 1. MCP Server Integration
- Expects MCP server at `/api/mcp/*` endpoints
- Uses `mcp-api-schema.yaml` for API contracts
- Implements AI agent integration through MCP

### 2. Database Integration
- Currently uses Neon PostgreSQL with Drizzle ORM
- Schema defined in `shared/schema.ts`
- May need to integrate with monorepo's shared database

### 3. CLI Integration
- Designed to integrate with `svc` commands:
  - `svc init` - Service scaffolding
  - `svc validate` - Manifest validation
  - `svc plan` - Infrastructure planning
  - `svc up` - Deployment
  - `svc local up` - Local development
  - `svc audit` - Compliance auditing

## Migration Checklist

### Before Migration:
- [ ] Update package name to match monorepo conventions
- [ ] Remove duplicate dependencies (if shared in monorepo)
- [ ] Update import paths for shared packages
- [ ] Configure build system integration
- [ ] Set up environment variables

### After Migration:
- [ ] Connect to existing MCP server
- [ ] Integrate with compliance framework
- [ ] Update database connections
- [ ] Test CLI command integration
- [ ] Verify shared type contracts

## Environment Variables
```bash
DATABASE_URL=postgresql://...
PORT=5000
NODE_ENV=development
```

## Development Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run check    # TypeScript type checking
npm run db:push  # Push database schema
```

## Notes
- UI follows dark-mode-first design with citation-rich interfaces
- Implements AppShell pattern with timeline/metadata rails
- Uses atomic design principles with shadcn/ui components
- Designed for developer workflows with keyboard navigation
