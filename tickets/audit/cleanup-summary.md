# Debug Code Cleanup Summary

## Files to Clean

### 1. `apps/svc/src/cli/up-command.ts` (1058 lines)
**Debug code to remove:**
- 117 debug log statements (fetch calls)
- `SKIP_TEMPLATE_MODIFICATIONS` flag and BootstrapVersion removal code (lines 197-513) - **REMOVE ENTIRELY** (not the issue)
- `USE_MANIFEST_DIR_AS_WORKDIR` flag (lines 163-168) - **REMOVE** (default behavior is correct)
- Extensive error handling debug code (lines 620-964) - **SIMPLIFY** (keep basic error handling)
- SSM parameter checks (lines 620-630, 760-770) - **REMOVE** (debug only)
- CloudFormation event queries (lines 695-750, 772-873) - **REMOVE** (debug only)
- VPC/subnet validation (lines 895-963) - **REMOVE** (debug only, user requested refactor ticket)

**Code to KEEP:**
- ApiGateway Account removal logic (lines 209-361) - **KEEP** but remove debug logs
- Basic error handling and logging
- Core deployment logic

**Dependencies to review:**
- `@aws-sdk/client-api-gateway` - **KEEP** (used in ApiGateway Account fix)
- `@aws-sdk/client-cloudformation` - **REMOVE** if only used for debug
- `@aws-sdk/client-ec2` - **REMOVE** if only used for debug
- `@aws-sdk/client-ssm` - **REMOVE** if only used for debug

### 2. `apps/svc/src/cli/utils/service-synthesizer.ts`
- 1 debug log statement (line 198) - **REMOVE**

### 3. `packages/core/src/platform/contracts/config-builder.ts`
- 1 debug log statement (line 206) - **REMOVE**

### 4. Component Files
- `packages/components/rds-postgres/src/rds-postgres.component.ts` - 1 debug log (line 292) - **REMOVE**
- `packages/components/elasticache-redis/src/elasticache-redis.component.ts` - 1 debug log (line 72) - **REMOVE**
- Other component files - check for debug code

## Cleanup Strategy

Given the file size, I'll clean `up-command.ts` in sections:
1. Remove debug flags and BootstrapVersion code (lines 163-513)
2. Remove debug logs from ApiGateway Account fix (keep logic)
3. Remove extensive error handling debug code (simplify to basic error handling)
4. Clean other files

## Estimated Changes

- `up-command.ts`: ~400 lines to remove, ~700 lines remaining
- Other files: ~5-10 lines each

