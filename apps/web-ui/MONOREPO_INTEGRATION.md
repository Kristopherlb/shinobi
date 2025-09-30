# NX Monorepo Integration Guide

## Package Structure
```
packages/ui/                    # This package
├── client/                     # React frontend
├── server/                     # Express API server
├── shared/                     # Shared contracts
├── project.json               # NX project configuration
├── package.json               # Package dependencies
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
└── nx.json                    # NX workspace configuration
```

## Integration Steps

### 1. Copy Package to Monorepo
```bash
# Copy this entire directory to your monorepo
cp -r /path/to/ShinobiADP packages/ui/
```

### 2. Update Root Workspace Configuration
Add to your root `nx.json`:
```json
{
  "projects": {
    "ui": "packages/ui"
  }
}
```

### 3. Update Root package.json
Add to your root `package.json`:
```json
{
  "workspaces": [
    "packages/*"
  ]
}
```

### 4. Install Dependencies
```bash
# From monorepo root
pnpm install
```

### 5. Update Import Paths
Run the import update script:
```bash
cd packages/ui
node update-imports.js
```

### 6. Configure MCP Server Integration
Update server routes to connect to your MCP server:
```typescript
// server/routes.ts
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:4000';
```

## NX Commands

### Development
```bash
# Start UI development server
nx serve ui

# Build UI
nx build ui

# Run tests
nx test ui

# Lint UI
nx lint ui
```

### Production
```bash
# Build all projects
nx run-many --target=build --all

# Build specific project
nx build ui
```

## Environment Variables

Create `.env` in the UI package:
```bash
# Database
DATABASE_URL=postgresql://...

# Server
PORT=5000
NODE_ENV=development

# MCP Server Integration
MCP_SERVER_URL=http://localhost:4000
```

## Dependencies

This package includes all necessary dependencies:
- React 18 + TypeScript
- Vite for bundling
- Express for API server
- Tailwind CSS + shadcn/ui + Radix UI
- TanStack Query for state management
- Drizzle ORM + PostgreSQL

## Integration Points

### MCP Server
- Located at: `packages/mcp/server/`
- Package name: `@shinobi/mcp-server`
- Used for AI agent integration and capabilities

### Shared Types
- This package provides its own shared contracts
- Can be extended to integrate with monorepo shared types

### Database
- Uses standard PostgreSQL with Drizzle ORM
- No shared database client needed
- Infrastructure declared via manifest

## Notes
- Package is marked as `private: true`
- All Replit-specific plugins removed
- Import paths updated for NX workspace
- Ready for NX build system integration
