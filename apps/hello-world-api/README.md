# Hello World API - Test Service

Test service for validating the deployment bundle pipeline locally with the Shinobi CLI.

## Quick Reference

```bash
# 1. Build the platform (from monorepo root)
cd /Users/kristopherbowles/project42/shinobi
pnpm build

# 2. Validate the manifest (use built version)
node dist/apps/shinobi/main.js validate --file apps/hello-world-api/service.yml

# 3. Plan (dry run)
node dist/apps/shinobi/main.js plan --file apps/hello-world-api/service.yml --env dev

# 4. Synthesize
node dist/apps/shinobi/main.js synth --file apps/hello-world-api/service.yml --env dev --account YOUR_ACCOUNT_ID

# 5. Deploy (optional)
node dist/apps/shinobi/main.js up --file apps/hello-world-api/service.yml --env dev --yes
```

**Note**: If `pnpm shinobi` (development mode) fails with module resolution errors, use the built version directly: `node dist/apps/shinobi/main.js`

## Overview

This is a minimal test service that includes:
- **Lambda API** - Simple HTTP API handler
- **IAM Role** - Lambda execution role
- **CloudWatch Log Group** - Centralized logging
- **RDS Postgres** - Database instance (for binding testing)
- **Deployment Bundle Pipeline** - Creates immutable deployment bundles

## Quick Start

### Prerequisites

1. **AWS Account ID**: Update `accountId` in `service.yml` with your AWS account ID
2. **AWS Credentials**: Configure AWS CLI with `aws configure` or set environment variables
3. **Shinobi CLI**: Run from the monorepo root using `pnpm shinobi` (not a global command)

### Important: Running Commands

The `shinobi` CLI is **not installed globally**. You must:

1. **Build the platform**:
   ```bash
   cd /path/to/shinobi
   
   # Build all packages (NX handles dependency order automatically)
   pnpm build
   
   # Or build specific packages (NX will build dependencies automatically)
   pnpm nx build @shinobi/cli
   ```
   
   **Note**: NX automatically handles dependency order and will build `@shinobi/binders` and `@shinobi/core` before building the CLI and components.

2. **Run commands from monorepo root**:
   
   **Option A: Use built version (recommended if ts-node has issues)**
   ```bash
   cd /path/to/shinobi
   node dist/apps/shinobi/main.js <command> --file apps/hello-world-api/service.yml [options]
   ```
   
   **Option B: Use development mode (requires all packages built)**
   ```bash
   cd /path/to/shinobi
   pnpm shinobi <command> --file apps/hello-world-api/service.yml [options]
   ```

**Troubleshooting**: 
- If you see module resolution errors with `pnpm shinobi`, use the built version (`node dist/apps/shinobi/main.js`) instead.
- If `pnpm build` fails, check the error messages. NX will show which packages failed and why.
- The platform uses TypeScript project references - ensure all packages build successfully for the CLI to work.

### Step 1: Validate the Manifest

```bash
# From monorepo root (using built version)
cd /path/to/shinobi
node dist/apps/shinobi/main.js validate --file apps/hello-world-api/service.yml

# Or using development mode (after pnpm build)
pnpm shinobi validate --file apps/hello-world-api/service.yml
```

This checks that:
- All components are valid
- Bindings are correctly configured
- Required fields are present

### Step 2: Plan (Dry Run)

```bash
# From monorepo root
node dist/apps/shinobi/main.js plan --file apps/hello-world-api/service.yml --env dev
```

This will:
- Resolve all component configurations
- Show what resources will be created
- Display any warnings or errors
- **Not** create any infrastructure

### Step 3: Synthesize (Generate CDK Templates)

```bash
# From monorepo root
node dist/apps/shinobi/main.js synth --file apps/hello-world-api/service.yml --env dev --account YOUR_ACCOUNT_ID
```

This will:
- Generate CloudFormation templates in `cdk.out/`
- Trigger the deployment-bundle-pipeline component
- The bundle pipeline will attempt to create a deployment bundle

**Note**: The full deployment bundle pipeline requires:
- Dagger Engine Pool (or local Dagger)
- ORAS CLI for OCI registry operations
- Cosign for signing
- Artifactory/OCI registry access

For local testing, the component will synthesize but may not complete the full pipeline without additional setup.

### Step 4: Deploy (Optional)

```bash
# From monorepo root
node dist/apps/shinobi/main.js up --file apps/hello-world-api/service.yml --env dev --yes
```

This will:
- Deploy the stack to AWS
- Create all resources (Lambda, API Gateway, RDS, etc.)
- Wait for deployment to complete

### Step 5: Verify Deployment

```bash
chmod +x verify.sh
./verify.sh
```

Or:

```bash
npm run verify
```

This script checks:
- Stack deployment status
- Lambda function configuration
- API Gateway endpoint (if created)
- RDS instance configuration
- CloudWatch log groups

## Testing the API

After deployment, get the API URL from stack outputs:

```bash
API_URL=$(aws cloudformation describe-stacks \
  --stack-name hello-world-api-dev \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

curl "$API_URL"
```

Expected response:
```json
{
  "message": "Hello from hello-world-api!",
  "service": "hello-world-api",
  "version": "1.0.0",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "requestId": "...",
  "method": "GET",
  "path": "/",
  "environment": "dev"
}
```

## Deployment Bundle Pipeline

> **Note**: The `deployment-bundle-pipeline` component is currently commented out in `service.yml` as it's a post-MVP feature. Once available in core, uncomment it to enable bundle creation.

The `bundle-pipeline` component creates an immutable deployment bundle containing:

- **CDK Output** - CloudFormation templates
- **SBOMs** - Software Bill of Materials
- **Security Reports** - Vulnerability scans
- **Compliance Reports** - Framework compliance validation
- **Test Results** - Unit and integration test results
- **Provenance** - SLSA attestations

### Adding the Bundle Pipeline Later

Once the `deployment-bundle-pipeline` component is available in core:

1. Uncomment the `bundle-pipeline` component in `service.yml`
2. Configure your Artifactory/OCI registry endpoints
3. Ensure Dagger Engine Pool infrastructure is set up
4. The component will create deployment bundles during synthesis

### Local Testing Considerations

For local testing without a full OCI registry setup:

1. **Component Synthesis Only**: The component will synthesize and register capabilities, but the full Dagger pipeline may not execute without:
   - Dagger Engine Pool infrastructure
   - ORAS CLI installed
   - Cosign configured
   - OCI registry access

2. **Mock Registry**: You can use a local Docker registry:
   ```bash
   docker run -d -p 5000:5000 --name registry registry:2
   ```

3. **Verify Synthesis**: Check that the component synthesizes correctly:
   ```bash
   pnpm shinobi synth --json | jq '.components[] | select(.type == "deployment-bundle-pipeline")'
   ```

## File Structure

```
apps/hello-world-api/
├── service.yml          # Service manifest with all components
├── src/
│   └── index.js        # Lambda handler code
├── package.json         # Service package metadata
├── verify.sh           # Deployment verification script
└── README.md           # This file
```

## Troubleshooting

### "No service.yml found"
- Make sure you're in the `apps/hello-world-api` directory
- Or use `--file` flag: `pnpm shinobi plan --file apps/hello-world-api/service.yml`

### "Could not determine AWS account ID"
- Set `accountId` in `service.yml`
- Or use `--account` flag: `pnpm shinobi synth --account 123456789012`
- Or set `CDK_DEFAULT_ACCOUNT` environment variable

### "Component type not found"
- Make sure all component packages are built: `pnpm build` from monorepo root
- Check that components are registered in the component catalog

### Bundle Pipeline Not Executing
- The deployment-bundle-pipeline component requires Dagger infrastructure
- For local testing, focus on verifying component synthesis first
- Full pipeline execution requires additional infrastructure setup

## Next Steps

1. ✅ Validate and synthesize locally
2. ✅ Deploy to a dev environment
3. ✅ Verify resources with `verify.sh`
4. ⏭️ Set up Dagger Engine Pool for full bundle pipeline
5. ⏭️ Configure Artifactory/OCI registry
6. ⏭️ Test bundle creation and signing

## Cleanup

To remove all deployed resources:

```bash
pnpm shinobi destroy --env dev --yes
```

Or manually:

```bash
aws cloudformation delete-stack --stack-name hello-world-api-dev --region us-east-1
```

