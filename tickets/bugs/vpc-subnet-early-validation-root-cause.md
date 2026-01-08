# Root Cause Analysis: VPC/Subnet Early Validation Errors

**Status:** 🔴 OPEN  
**Severity:** CRITICAL  
**Affected Components:** All components requiring VPC/subnet resolution (RDS, ElastiCache, ECS, Lambda with VPC, etc.)  
**Created:** 2026-01-07  
**Reporter:** Platform Team

## Executive Summary

CloudFormation's `AWS::EarlyValidation::ResourceExistenceCheck` errors occur when components use `Vpc.fromLookup()` or insufficient VPC context with subnet groups. This is a **platform-wide architectural issue** affecting all components that need VPC/subnet resolution.

## Root Cause

### The Core Problem

**CloudFormation Early Validation** runs **BEFORE** any custom resources execute. When components use:

1. **`Vpc.fromLookup()`** → Creates a CloudFormation custom resource that queries AWS during deployment
2. **`Vpc.fromVpcAttributes()`** with incomplete attributes → CloudFormation can't validate subnet IDs belong to the VPC

Early validation fails because:
- Custom resources from `fromLookup()` haven't executed yet
- CloudFormation can't verify subnet IDs exist or belong to the VPC without full context

### Why This Affects Multiple Components

Any component that creates:
- **Subnet Groups** (RDS, ElastiCache)
- **Security Groups** (all compute components)
- **Network Interfaces** (Lambda with VPC, ECS, EC2)

...needs VPC context. If that context comes from `fromLookup()` or incomplete `fromVpcAttributes()`, early validation fails.

## Technical Deep Dive

### CloudFormation Early Validation Process

1. **Early Validation Phase** (runs first):
   - Validates resource properties
   - Checks resource existence (for referenced resources)
   - **NO custom resources execute yet**

2. **Custom Resource Execution** (runs after early validation):
   - `fromLookup()` custom resources query AWS
   - Returns VPC/subnet information

3. **Resource Creation** (runs last):
   - Creates actual AWS resources

### The Validation Gap

When a subnet group references subnet IDs:
- CloudFormation needs to validate: "Do these subnet IDs exist and belong to a VPC?"
- With `fromLookup()`: VPC info isn't available yet (custom resource hasn't run)
- With incomplete `fromVpcAttributes()`: CloudFormation can't map subnet IDs to VPC

### Why RDS "Works" But ElastiCache Doesn't

**Hypothesis:** RDS might be working because:
1. RDS sets an **explicit subnet group name** (string), allowing CloudFormation to reference it without VPC context
2. ElastiCache **auto-generates** the subnet group name (token), requiring VPC context to resolve
3. OR: RDS subnet group validation is less strict than ElastiCache

**Need to verify:** Check if RDS actually works or if it also fails with early validation.

## Platform-Wide Impact

### Affected Components

| Component | VPC Usage | Subnet Group | Current Status |
|-----------|-----------|--------------|----------------|
| `rds-postgres` | ✅ Uses VPC | ✅ Creates DB subnet group | ⚠️ May have issues |
| `elasticache-redis` | ✅ Uses VPC | ✅ Creates cache subnet group | ❌ Failing |
| `ecs-fargate-service` | ✅ Uses VPC | ❌ No subnet group | ⚠️ May have issues |
| `lambda-api` (with VPC) | ✅ Uses VPC | ❌ No subnet group | ⚠️ May have issues |
| `ec2-instance` | ✅ Uses VPC | ❌ No subnet group | ⚠️ May have issues |

### Common Patterns That Fail

1. **Subnet Groups with `fromLookup()` VPC**:
   ```typescript
   const vpc = ec2.Vpc.fromLookup(this, 'Vpc', { vpcId: 'vpc-xxx' });
   const subnetGroup = new elasticache.CfnSubnetGroup(this, 'SubnetGroup', {
     subnetIds: ['subnet-xxx', 'subnet-yyy'] // Early validation fails - can't verify these belong to VPC
   });
   ```

2. **Security Groups with `fromLookup()` VPC**:
   ```typescript
   const vpc = ec2.Vpc.fromLookup(this, 'Vpc', { vpcId: 'vpc-xxx' });
   const sg = new ec2.SecurityGroup(this, 'SG', { vpc }); // May fail if VPC context needed
   ```

## Solution Architecture

### Platform Standard: VPC Resolution Strategy

**REQUIRED:** All components MUST follow this pattern:

1. **When explicit subnet IDs are provided** (REQUIRED for subnet groups):
   - ✅ **ALWAYS** use `Vpc.fromVpcAttributes()` with VPC ID and availability zones
   - ✅ Pass subnet IDs as **strings** directly to subnet groups
   - ❌ **NEVER** use `fromLookup()` (creates custom resource that runs after early validation)

2. **When subnet IDs are NOT provided**:
   - ⚠️ Use `Vpc.fromLookup()` ONLY if absolutely necessary
   - ⚠️ Document that this may cause early validation issues
   - ⚠️ Consider requiring explicit subnet IDs for production use

3. **Subnet Group Creation**:
   - ✅ Always use L1 constructs (`CfnSubnetGroup`, `CfnDBSubnetGroup`)
   - ✅ Pass subnet IDs as **strings** (not subnet references)
   - ✅ Set explicit subnet group names when possible (helps with validation)

### Why RDS "Works" But ElastiCache Doesn't

**Current State:**
- RDS uses `fromLookup()` when subnet IDs are provided (line 302 in rds-postgres.component.ts)
- ElastiCache was using `fromLookup()` when subnet IDs are provided (now fixed)

**Hypothesis:** RDS might appear to work because:
1. RDS subnet group validation is less strict than ElastiCache
2. OR: RDS deployments haven't been tested with the same VPC/subnet configuration
3. OR: RDS also fails but the error manifests differently

**REQUIRED ACTION:** Update RDS to use the same pattern as ElastiCache for consistency and to prevent future issues.

### Implementation Pattern

```typescript
// ✅ CORRECT: Use fromVpcAttributes() with explicit subnet IDs
if (config.vpc.vpcId && config.vpc.subnetIds?.length > 0) {
  this.vpc = ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
    vpcId: config.vpc.vpcId,
    availabilityZones: getAvailabilityZones(config.vpc.subnetIds)
  });
  
  // Create subnet group with string subnet IDs
  this.subnetGroup = new elasticache.CfnSubnetGroup(this, 'SubnetGroup', {
    subnetIds: config.vpc.subnetIds, // Strings, not subnet references
    cacheSubnetGroupName: `${this.spec.name}-subnet-group` // Explicit name
  });
}

// ❌ WRONG: Using fromLookup() with subnet groups
if (config.vpc.vpcId && config.vpc.subnetIds?.length > 0) {
  this.vpc = ec2.Vpc.fromLookup(this, 'Vpc', { vpcId: config.vpc.vpcId });
  // This creates a custom resource that runs AFTER early validation
  // CloudFormation can't validate subnet IDs during early validation
}
```

## Required Platform Changes

### 1. Create Platform VPC Helper Utility

**File:** `packages/core/src/platform/utils/vpc-resolver.ts`

```typescript
export interface VpcResolutionOptions {
  vpcId: string;
  subnetIds?: string[];
  availabilityZones?: string[];
}

export function resolveVpcForSubnetGroups(
  scope: Construct,
  id: string,
  options: VpcResolutionOptions
): ec2.IVpc {
  // Always use fromVpcAttributes() when subnet IDs are provided
  // This avoids fromLookup() custom resource that runs after early validation
  if (options.subnetIds && options.subnetIds.length > 0) {
    const azs = options.availabilityZones ?? inferAvailabilityZones(options.subnetIds);
    return ec2.Vpc.fromVpcAttributes(scope, id, {
      vpcId: options.vpcId,
      availabilityZones: azs
    });
  }
  
  // Fallback to fromLookup() only when subnet IDs not provided
  // Document that this may cause early validation issues
  return ec2.Vpc.fromLookup(scope, id, { vpcId: options.vpcId });
}
```

### 2. Update All Affected Components

Components that need updating:
- ✅ `elasticache-redis` - **FIXED** (use `fromVpcAttributes()`)
- ⚠️ `rds-postgres` - **VERIFY** (currently uses `fromLookup()` conditionally)
- ⚠️ `ecs-fargate-service` - **REVIEW** (uses VPC for security groups)
- ⚠️ `lambda-api` - **REVIEW** (uses VPC when configured)
- ⚠️ `ec2-instance` - **REVIEW** (uses VPC)
- ⚠️ `application-load-balancer` - **REVIEW** (uses VPC/subnets)

### 3. Component Standards Update

Add to `@platform-standards/component-standards-baseline.md`:

**VPC Resolution Standard:**
- **REQUIRED**: When explicit subnet IDs are provided, use `Vpc.fromVpcAttributes()`
- **PROHIBITED**: Using `Vpc.fromLookup()` with subnet groups (causes early validation failures)
- **REQUIRED**: Pass subnet IDs as strings to subnet group L1 constructs
- **REQUIRED**: Set explicit subnet group names when possible

## Verification Steps

1. **Test ElastiCache with fix**:
   ```bash
   pnpm shinobi up -f apps/sample-api/service.yml --stack sample-api-dev-v3 --yes
   ```

2. **Verify RDS still works**:
   - Check if RDS deployments succeed or also fail with early validation
   - If RDS works, identify the difference

3. **Audit all components**:
   - Search for `fromLookup()` usage
   - Identify components that create subnet groups or security groups
   - Update all to use `fromVpcAttributes()` pattern

## References

- AWS CDK: [VPC Import Methods](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.Vpc.html)
- CloudFormation: [Early Validation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-validate-template.html)
- Platform Component Standards: `@platform-standards/component-standards-baseline.md`

