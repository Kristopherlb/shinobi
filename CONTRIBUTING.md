# Contributing to Shinobi Platform

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ (LTS recommended)
- pnpm 8+ (for package management)
- Git (for version control)

### Bootstrap
```bash
git clone <repository-url>
cd shinobi
./scripts/bootstrap.sh
```

## 📦 Package Management with pnpm

### Key Commands
```bash
# Install dependencies
pnpm install

# Add dependency to specific package
pnpm --filter @shinobi/core add lodash

# Run script in specific package
pnpm --filter @shinobi/core test

# Run scripts across all packages
pnpm -r build
pnpm -r test
```

## 🏗️ Build System with Nx

### Key Commands
```bash
# Build all packages
pnpm build

# Build affected packages only
pnpm affected:build

# Run tests
pnpm test

# Show dependency graph
pnpm graph
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run only unit tests
pnpm test:unit
```

## 🔧 Development Workflow

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and test: `pnpm build && pnpm test`
3. Test affected packages: `pnpm affected:build`
4. Commit changes: `git commit -m "feat: add my feature"`

## 📚 Resources

- [pnpm Documentation](https://pnpm.io/)
- [Nx Documentation](https://nx.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

Thank you for contributing! 🥷🏻
