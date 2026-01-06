# Build Instructions for hello-world-api

## Required Components

Your `service.yml` uses these components:
- ✅ `lambda-api` - Lambda function with API Gateway (automatically creates CloudWatch log groups)
- ✅ `iam-role` - IAM execution role  
- ✅ `rds-postgres` - RDS PostgreSQL database

**Note**: CloudWatch log groups are automatically created by the `lambda-api` component, so no separate `cloudwatch-log-group` component is needed.

## Build Commands

### Option 1: Build Everything (Recommended)

From the monorepo root:

```bash
cd /Users/kristopherbowles/project42/shinobi
pnpm build
```

This builds all packages including:
- `@shinobi/core` (required by all components)
- `@shinobi/binders` (required by CLI)
- `@shinobi/cli` (the CLI tool)
- All component packages (including the 4 you need)

**NX automatically handles dependency order** - it will build dependencies before dependents.

### Option 2: Build Only Required Components

If you want to build just what's needed:

```bash
cd /Users/kristopherbowles/project42/shinobi

# Build core first (required by everything)
pnpm nx build @shinobi/core

# Build binders (required by CLI)
pnpm nx build @shinobi/binders

# Build the CLI
pnpm nx build @shinobi/cli

# Build the specific components you need
pnpm nx build @shinobi/components-lambda-api
pnpm nx build @shinobi/components-iam-role
pnpm nx build @shinobi/components-rds-postgres
```

**Note**: NX will automatically build dependencies, so you can just run the component builds and it will pull in `@shinobi/core` automatically.

### Option 3: Build Using NX Affected (If You've Made Changes)

If you've only modified specific packages:

```bash
cd /Users/kristopherbowles/project42/shinobi
pnpm affected:build
```

This only builds packages that have changed and their dependents.

## Verify Build Success

After building, verify the CLI is available:

```bash
# From monorepo root
node dist/apps/shinobi/main.js --version
# or
node dist/apps/shinobi/main.js validate --file apps/hello-world-api/service.yml
```

## Quick Build Check

To see what will be built:

```bash
pnpm nx graph
```

This opens a dependency graph showing all packages and their relationships.

## Troubleshooting

### Build Fails with Type Errors
- Run `pnpm typecheck` to see all type errors
- Fix type errors in the failing packages
- Rebuild

### Module Resolution Errors
- Ensure all dependencies are installed: `pnpm install`
- Clear node_modules and reinstall if needed: `rm -rf node_modules && pnpm install`

### Component Not Found
- Verify the component package exists in `packages/components/`
- Check that it has a `project.json` file
- Ensure it's registered in the component catalog

