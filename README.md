# Shinobi Platform

A minimal, production-quality MVP of the Shinobi platform with a CLI named `svc` and a composable core library.

## Prerequisites

### Required System Dependencies

Before running the platform audit CLI, you must install `ripgrep`:

```bash
# macOS
brew install ripgrep

# Ubuntu/Debian
sudo apt-get install ripgrep

# Windows (winget)
winget install BurntSushi.ripgrep

# Windows (chocolatey)
choco install ripgrep

# Arch Linux
sudo pacman -S ripgrep
```

### Node.js Dependencies

```bash
npm install
```

## Platform Governance Audit

The platform includes a comprehensive governance audit system that enforces architectural patterns, compliance requirements, and quality standards.

### Running Audits

```bash
# Standard audit (warnings and errors)
npm run audit:platform

# Strict mode (treat warnings as errors)
npm run audit:platform:strict

# JSON output for CI integration
npm run audit:platform:json
```

### Audit Rules

The audit system enforces:

- **Architectural Patterns**: Component structure, inheritance, builder patterns
- **Compliance & Security**: FedRAMP requirements, encryption, TLS, no hardcoded secrets
- **Binder Strategy Compliance**: Async contracts, structured logging, immutable results
- **Type Safety**: No `any` types, proper CDK types, capability enums
- **Testing Standards**: Coverage requirements, naming conventions
- **Documentation**: README requirements, API documentation
- **Performance & Security**: Caching, metrics, network isolation

### CI Integration

The audit runs automatically on:
- Pull requests to `main` and `develop` branches
- Pushes to `main` and `develop` branches
- Manual workflow dispatch

The GitHub Action automatically installs `ripgrep` in the CI environment.

## Development

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with coverage
npm run test:coverage
```

### MCP Server

```bash
# Setup MCP server
npm run setup:mcp

# Build MCP server
npm run mcp:build

# Start MCP server
npm run mcp:start
```

## Architecture

The platform is built with:

- **TypeScript 5** and **Node 20 LTS**
- **pnpm workspaces** + **Turborepo** for fast builds
- **commander** for CLI with rich --help and JSON output
- **zod** for schema validation and JSON Schema generation
- **jest + ts-jest** for comprehensive testing
- **eslint + @typescript-eslint + prettier** for code quality

## License

MIT