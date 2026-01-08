# Debug Code Cleanup Audit - 2026-01-07

**Date:** 2026-01-07  
**Issue:** API Gateway Account Early Validation Error  
**Status:** Debugging complete, cleanup required

## Summary

During debugging of the API Gateway Account Early Validation error, extensive debugging instrumentation was added across multiple files. This document tracks all changes that need to be cleaned up.

## Files Modified with Debug Code

### 1. CLI Files

#### `apps/svc/src/cli/up-command.ts`
**Changes:**
- **117 debug log statements** using `fetch()` calls to debug endpoint
- Added `SKIP_TEMPLATE_MODIFICATIONS` flag (line 203)
- Added `USE_MANIFEST_DIR_AS_WORKDIR` flag (line 165)
- Added ApiGateway Account removal logic (lines 209-354) - **KEEP THIS** (it's the actual fix)
- Added extensive error logging and CloudFormation event querying (lines 380-600+)
- Added SSM parameter checks (lines 170, 330)
- Added change set detail queries (lines 342-600+)

**Action Required:**
- Remove all `#region agent log` / `#endregion` blocks with `fetch()` calls
- Remove `SKIP_TEMPLATE_MODIFICATIONS` flag and related logic (lines 197-207)
- Remove `USE_MANIFEST_DIR_AS_WORKDIR` flag and related logic (lines 165-168)
- **KEEP** ApiGateway Account removal logic (lines 209-354) - this is the actual fix
- Remove debug-only error handling and CloudFormation event queries (keep basic error handling)
- Remove SSM parameter check debug logs (keep the checks if they're needed)

#### `apps/svc/src/cli/utils/service-synthesizer.ts`
**Changes:**
- Added debug log at synthesis completion (line 198)

**Action Required:**
- Remove debug log statement

### 2. Core Platform Files

#### `packages/core/src/platform/contracts/config-builder.ts`
**Changes:**
- Added debug log in `_getPlatformConfigPath()` (line 206)

**Action Required:**
- Remove debug log statement

### 3. Component Files

#### `packages/components/elasticache-redis/src/elasticache-redis.component.ts`
**Changes:**
- Unknown - need to check for debug code

#### `packages/components/elasticache-redis/src/elasticache-redis.builder.ts`
**Changes:**
- Unknown - need to check for debug code

#### `packages/components/rds-postgres/src/rds-postgres.component.ts`
**Changes:**
- Unknown - need to check for debug code

#### `packages/components/rds-postgres/src/rds-postgres.builder.ts`
**Changes:**
- Unknown - need to check for debug code

#### `packages/components/sqs-queue/sqs-queue.component.ts`
**Changes:**
- Unknown - need to check for debug code

#### `packages/components/sqs-queue/sqs-queue.builder.ts`
**Changes:**
- Unknown - need to check for debug code

#### `packages/components/ec2-instance/ec2-instance.builder.ts`
**Changes:**
- Unknown - need to check for debug code

#### `packages/components/lambda-api/src/lambda-api.component.ts`
**Changes:**
- Added comment about ApiGateway Account singleton (lines 380-385) - **KEEP THIS** (it's documentation)

**Action Required:**
- Keep the comment - it's useful documentation

## Code to Keep (Actual Fixes)

### 1. ApiGateway Account Removal Logic
**File:** `apps/svc/src/cli/up-command.ts:209-354`
**Status:** KEEP - This is the actual fix for the Early Validation error
**Action:** Remove debug logs but keep the logic

### 2. ApiGateway Account Documentation
**File:** `packages/components/lambda-api/src/lambda-api.component.ts:380-385`
**Status:** KEEP - Useful documentation
**Action:** None

## Code to Remove (Debug Only)

### 1. All Debug Log Statements
**Pattern:** `fetch('http://127.0.0.1:7242/ingest/...')`
**Action:** Remove all `#region agent log` / `#endregion` blocks containing fetch calls

### 2. Debug Flags
- `SKIP_TEMPLATE_MODIFICATIONS` - Remove flag and related conditional logic
- `USE_MANIFEST_DIR_AS_WORKDIR` - Remove flag and related conditional logic

### 3. Debug-Only Error Handling
- CloudFormation event queries (lines 380-600+ in up-command.ts)
- Change set detail queries beyond basic error handling
- SSM parameter check debug logs

## Dependencies Added

### `apps/svc/package.json`
**Added:**
- `@aws-sdk/client-api-gateway` - **KEEP** (needed for ApiGateway Account check)
- `@aws-sdk/client-ec2` - Check if still needed
- `@aws-sdk/client-cloudformation` - Check if still needed
- `@aws-sdk/client-ssm` - Check if still needed

**Action Required:**
- Keep `@aws-sdk/client-api-gateway` (used in fix)
- Review other SDK clients - remove if only used for debugging

## Test Files Created

### `apps/test-ec2/service.yml`
**Status:** Test file - can be removed or kept for future testing

### `apps/minimal-test/service.yml`
**Status:** Test file - can be removed or kept for future testing

## Cleanup Checklist

- [ ] Remove all debug log statements from `up-command.ts`
- [ ] Remove `SKIP_TEMPLATE_MODIFICATIONS` flag
- [ ] Remove `USE_MANIFEST_DIR_AS_WORKDIR` flag
- [ ] Remove debug logs from `service-synthesizer.ts`
- [ ] Remove debug logs from `config-builder.ts`
- [ ] Check and remove debug code from component files:
  - [ ] elasticache-redis.component.ts
  - [ ] elasticache-redis.builder.ts
  - [ ] rds-postgres.component.ts
  - [ ] rds-postgres.builder.ts
  - [ ] sqs-queue.component.ts
  - [ ] sqs-queue.builder.ts
  - [ ] ec2-instance.builder.ts
- [ ] Review and clean up SDK dependencies in `apps/svc/package.json`
- [ ] Remove or document test apps (`test-ec2`, `minimal-test`)
- [ ] Verify ApiGateway Account removal logic still works after cleanup
- [ ] Run tests to ensure no regressions

## Notes

- The ApiGateway Account removal fix should be kept but moved to a more appropriate location (possibly a utility service)
- Consider creating a proper service for handling singleton resource conflicts
- The fix works but is a workaround - a permanent fix should be implemented in component code

