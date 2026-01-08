# Bug Report: Components Create Resources Despite Existing Bindings

**Status:** 🔴 OPEN  
**Severity:** HIGH  
**Affected Components:** Multiple components across platform  
**Created:** 2026-01-15  
**Reporter:** Platform Team

## Executive Summary

Components are creating AWS resources unconditionally during synthesis, even when they are explicitly bound to existing resources via the `binds` directive in `service.yml`. This leads to duplicate resource creation, unnecessary costs, deployment conflicts, and violates the platform's binding architecture principle that components should consume existing resources when bound.

## Root Cause

### The Core Problem

**Architectural Gap**: Components have access to `this.spec.binds` during synthesis (via `ComponentSpec`), but they are not checking for existing bindings before creating resources. The binding system operates **after** synthesis, so components create resources first, then bindings are resolved later.

**Current Flow**:
1. **Synthesis Phase**: Components create resources unconditionally
2. **Binding Phase**: Bindings are resolved and IAM policies/environment variables are applied
3. **Result**: Both the component's own resource AND the bound resource exist

**Expected Flow**:
1. **Synthesis Phase**: Components check `this.spec.binds` for relevant capabilities
2. **Conditional Creation**: Only create resources if not bound to existing ones
3. **Binding Phase**: Use existing bound resources instead of creating new ones

### Why This Matters

1. **Cost Impact**: Duplicate resources increase AWS costs unnecessarily
2. **Deployment Conflicts**: Multiple resources competing for the same logical function
3. **Architecture Violation**: Violates the platform principle that bindings should prevent duplicate resource creation
4. **User Confusion**: Users expect bindings to mean "use existing resource", not "create new resource AND bind to existing one"

## Affected Resource Types

### 1. API Gateway Resources

**Capabilities**: `api:rest`, `api:http`

**Affected Components**:
- `lambda-api` - **CRITICAL**: Always creates `RestApi` even when bound to existing API Gateway
- `lambda-worker` - May create API Gateway integrations when bound
- Any component that creates API Gateway integrations

**Example Problem**:
```yaml
components:
  - name: my-api
    type: api-gateway-rest
  - name: my-lambda
    type: lambda-api
    binds:
      - to: my-api
        capability: api:rest
        access: write
```

**Current Behavior**: `lambda-api` creates its own `RestApi` AND binds to `my-api` → **Two API Gateways**

**Expected Behavior**: `lambda-api` should skip `RestApi` creation and only bind to `my-api`

**Code Location**: `packages/components/lambda-api/src/lambda-api.component.ts:103`

```typescript
// ❌ CURRENT: Always creates RestApi
this.restApi = this.createRestApi(this.lambdaFunction);

// ✅ EXPECTED: Check bindings first
if (!this.hasBinding('api:rest') && !this.hasBinding('api:http')) {
  this.restApi = this.createRestApi(this.lambdaFunction);
} else {
  this.logComponentEvent('api_gateway_bound', 'Skipping RestApi creation - bound to existing API Gateway');
}
```

---

### 2. VPC/Networking Resources

**Capabilities**: `networking:vpc`, `networking:subnet`, `networking:security-group`

**Affected Components**:
- `rds-postgres` - Creates/looks up VPC even when bound to VPC component
- `elasticache-redis` - Creates/looks up VPC even when bound to VPC component
- `lambda-api` (with VPC) - Creates/looks up VPC even when bound
- `lambda-worker` (with VPC) - Creates/looks up VPC even when bound
- `ecs-fargate-service` - May create VPC resources when bound
- `ecs-ec2-service` - May create VPC resources when bound
- `ec2-instance` - Creates/looks up VPC even when bound
- `application-load-balancer` - Creates/looks up VPC even when bound
- `container-application` - **CRITICAL**: Creates new VPC even when bound
- `efs-filesystem` - Creates/looks up VPC even when bound
- `opensearch-domain` - Creates/looks up VPC even when bound
- `sagemaker-notebook-instance` - Creates/looks up VPC even when bound
- `auto-scaling-group` - Creates/looks up VPC even when bound

**Example Problem**:
```yaml
components:
  - name: my-vpc
    type: vpc
  - name: my-rds
    type: rds-postgres
    binds:
      - to: my-vpc
        capability: networking:vpc
        access: read
```

**Current Behavior**: `rds-postgres` creates/looks up VPC AND binds to `my-vpc` → **Potential VPC conflicts**

**Expected Behavior**: `rds-postgres` should use `context.vpc` from binding or skip VPC resolution entirely

**Code Locations**:
- `packages/components/rds-postgres/src/rds-postgres.component.ts` - VPC resolution
- `packages/components/elasticache-redis/src/elasticache-redis.component.ts` - VPC resolution
- `packages/components/container-application/src/container-application.component.ts:103-139` - Creates VPC unconditionally
- `packages/components/lambda-api/src/lambda-api.component.ts:201` - VPC lookup

**Pattern to Check**:
```typescript
// ❌ CURRENT: Always resolves VPC
if (this.config?.vpc.enabled) {
  vpc = this.lookupVpc(); // or resolveVpc() or createVpc()
}

// ✅ EXPECTED: Check bindings first
if (this.config?.vpc.enabled) {
  if (this.hasBinding('networking:vpc')) {
    // Use context.vpc from binding (injected by binder)
    vpc = this.context.vpc;
  } else {
    vpc = this.lookupVpc();
  }
}
```

---

### 3. Storage Resources

**Capabilities**: `storage:s3`, `storage:efs`, `storage:ebs`

**Affected Components**:
- Components that create S3 buckets when bound to existing buckets
- Components that create EFS filesystems when bound to existing filesystems
- Components that create EBS volumes when bound to existing volumes

**Example Problem**:
```yaml
components:
  - name: my-bucket
    type: s3-bucket
  - name: my-lambda
    type: lambda-api
    binds:
      - to: my-bucket
        capability: storage:s3
        access: readwrite
```

**Current Behavior**: If `lambda-api` creates S3 buckets (unlikely but possible), it would create duplicate buckets

**Expected Behavior**: Components should never create storage resources they're bound to

**Pattern to Check**:
```typescript
// Look for S3 bucket creation in components that bind to S3
if (this.hasBinding('storage:s3')) {
  // Don't create bucket, use bound bucket
} else {
  // Create bucket if needed
}
```

---

### 4. Database Resources

**Capabilities**: `db:postgres`, `db:mysql`, `db:redis`, `db:dynamodb`

**Affected Components**:
- Components that create database connections/clients when bound to existing databases
- Components that create database proxies when bound to existing databases

**Example Problem**:
```yaml
components:
  - name: my-db
    type: rds-postgres
  - name: my-lambda
    type: lambda-api
    binds:
      - to: my-db
        capability: db:postgres
        access: readwrite
```

**Current Behavior**: Lambda creates database connection resources (if any) AND binds to `my-db`

**Expected Behavior**: Lambda should only bind to `my-db`, not create duplicate database resources

**Pattern to Check**:
```typescript
// Look for database resource creation in components that bind to databases
if (this.hasBinding('db:postgres') || this.hasBinding('db:mysql') || this.hasBinding('db:redis')) {
  // Don't create database resources, use bound database
}
```

---

### 5. Messaging Resources

**Capabilities**: `messaging:sns`, `messaging:sqs`, `messaging:eventbridge`

**Affected Components**:
- Components that create SNS topics when bound to existing topics
- Components that create SQS queues when bound to existing queues
- Components that create EventBridge rules when bound to existing event buses

**Example Problem**:
```yaml
components:
  - name: my-topic
    type: sns-topic
  - name: my-lambda
    type: lambda-api
    binds:
      - to: my-topic
        capability: messaging:sns
        access: write
```

**Current Behavior**: Lambda may create SNS resources AND bind to `my-topic`

**Expected Behavior**: Lambda should only bind to `my-topic`, not create duplicate messaging resources

**Pattern to Check**:
```typescript
// Look for messaging resource creation in components that bind to messaging
if (this.hasBinding('messaging:sns') || this.hasBinding('messaging:sqs') || this.hasBinding('messaging:eventbridge')) {
  // Don't create messaging resources, use bound resources
}
```

---

### 6. Security Resources

**Capabilities**: `security:secrets`, `security:kms`, `security:iam`

**Affected Components**:
- Components that create KMS keys when bound to existing keys
- Components that create Secrets Manager secrets when bound to existing secrets
- Components that create IAM roles when bound to existing roles

**Example Problem**:
```yaml
components:
  - name: my-key
    type: kms-key
  - name: my-lambda
    type: lambda-api
    binds:
      - to: my-key
        capability: security:kms
        access: read
```

**Current Behavior**: Lambda may create KMS keys AND bind to `my-key`

**Expected Behavior**: Lambda should only bind to `my-key`, not create duplicate security resources

**Pattern to Check**:
```typescript
// Look for security resource creation in components that bind to security resources
if (this.hasBinding('security:kms') || this.hasBinding('security:secrets')) {
  // Don't create security resources, use bound resources
}
```

---

### 7. Compute Resources

**Capabilities**: `compute:lambda`, `compute:ecs`, `compute:ec2`, `compute:fargate`

**Affected Components**:
- Components that create Lambda functions when bound to existing functions
- Components that create ECS services when bound to existing services
- Components that create EC2 instances when bound to existing instances

**Example Problem**:
```yaml
components:
  - name: my-function
    type: lambda-function
  - name: my-api
    type: api-gateway-rest
    binds:
      - to: my-function
        capability: compute:lambda
        access: invoke
```

**Current Behavior**: API Gateway may create Lambda integrations AND bind to `my-function`

**Expected Behavior**: API Gateway should only bind to `my-function`, not create duplicate compute resources

**Pattern to Check**:
```typescript
// Look for compute resource creation in components that bind to compute
if (this.hasBinding('compute:lambda') || this.hasBinding('compute:ecs') || this.hasBinding('compute:ec2')) {
  // Don't create compute resources, use bound resources
}
```

---

### 8. Observability Resources

**Capabilities**: `observability:cloudwatch`, `observability:xray`, `observability:prometheus`

**Affected Components**:
- Components that create CloudWatch log groups when bound to existing log groups
- Components that create X-Ray tracing when bound to existing tracing
- Components that create Prometheus metrics when bound to existing metrics

**Example Problem**:
```yaml
components:
  - name: my-logs
    type: cloudwatch-log-group
  - name: my-lambda
    type: lambda-api
    binds:
      - to: my-logs
        capability: observability:cloudwatch
        access: write
```

**Current Behavior**: Lambda creates log groups AND binds to `my-logs`

**Expected Behavior**: Lambda should only bind to `my-logs`, not create duplicate observability resources

**Pattern to Check**:
```typescript
// Look for observability resource creation in components that bind to observability
if (this.hasBinding('observability:cloudwatch') || this.hasBinding('observability:xray')) {
  // Don't create observability resources, use bound resources
}
```

---

## How to Identify Affected Components

### Step 1: Search for Resource Creation Patterns

**Search for API Gateway creation**:
```bash
grep -r "new apigw.RestApi\|new apigatewayv2.HttpApi\|createRestApi\|createHttpApi" packages/components/
```

**Search for VPC creation/lookup**:
```bash
grep -r "new ec2.Vpc\|Vpc.fromLookup\|Vpc.fromVpcAttributes\|createVpc\|lookupVpc\|resolveVpc" packages/components/
```

**Search for S3 bucket creation**:
```bash
grep -r "new s3.Bucket\|createBucket" packages/components/
```

**Search for database creation**:
```bash
grep -r "new rds.Database\|new rds.Cluster\|createDatabase\|createCluster" packages/components/
```

**Search for messaging creation**:
```bash
grep -r "new sns.Topic\|new sqs.Queue\|createTopic\|createQueue" packages/components/
```

**Search for security resource creation**:
```bash
grep -r "new kms.Key\|new secretsmanager.Secret\|createKey\|createSecret" packages/components/
```

### Step 2: Check Component Capabilities

**For each component, check**:
1. What resources does it create in `synth()`?
2. What capabilities does it register in `registerCapability()`?
3. What capabilities can it bind to (check binder strategies)?

**Example Analysis**:
```typescript
// lambda-api.component.ts
// Creates: RestApi, Lambda Function, Log Groups
// Registers: 'api:rest', 'lambda:function'
// Can bind to: 'api:rest', 'api:http' (via ApiGatewayBinderStrategy)
// RISK: Creates RestApi even when bound to api:rest
```

### Step 3: Check Binding Strategies

**Review binder strategies** to understand what capabilities components can bind to:
- `packages/binders/src/strategies/api/api-gateway-binder-strategy.ts` - API Gateway bindings
- `packages/binders/src/strategies/networking/vpc-binder-strategy.ts` - VPC bindings
- `packages/binders/src/strategies/storage/s3-binder-strategy.ts` - S3 bindings
- `packages/binders/src/strategies/database/rds-binder-strategy.ts` - RDS bindings
- `packages/binders/src/strategies/messaging/sns-binder-strategy.ts` - SNS bindings
- `packages/binders/src/strategies/messaging/sqs-binder-strategy.ts` - SQS bindings

**For each binding strategy, identify**:
- What capabilities it supports
- What components can bind to those capabilities
- Whether those components create the same resources

### Step 4: Component Audit Checklist

For each component, check:

- [ ] Does it create resources in `synth()`?
- [ ] Does it register capabilities that match the resources it creates?
- [ ] Can it bind to capabilities that match the resources it creates?
- [ ] Does it check `this.spec.binds` before creating resources?
- [ ] Does it check `this.context.*` for injected resources from bindings?

**Example Checklist for `lambda-api`**:
- [x] Creates `RestApi` in `synth()` (line 103)
- [x] Registers `api:rest` capability (line 139)
- [x] Can bind to `api:rest` via `ApiGatewayBinderStrategy`
- [ ] **MISSING**: Checks `this.spec.binds` before creating `RestApi`
- [ ] **MISSING**: Uses `context.apiGateway` if bound (if such context exists)

---

## Solution Architecture

### Phase 1: BaseComponent Helper Methods

**Add to `BaseComponent`** (`packages/core/src/platform/contracts/component.ts`):

```typescript
/**
 * Check if component has a binding for a specific capability
 * 
 * @param capability - The capability to check for (e.g., 'api:rest', 'networking:vpc')
 * @returns True if component is bound to the capability
 */
protected hasBinding(capability: string): boolean {
  return this.spec.binds?.some(
    (bind: any) => bind.capability === capability
  ) ?? false;
}

/**
 * Get the target component name for a binding capability
 * 
 * @param capability - The capability to get binding target for
 * @returns The target component name, or undefined if not bound
 */
protected getBindingTarget(capability: string): string | undefined {
  return this.spec.binds?.find(
    (bind: any) => bind.capability === capability
  )?.to;
}

/**
 * Check if component has any binding for a set of capabilities
 * 
 * @param capabilities - Array of capabilities to check
 * @returns True if component is bound to any of the capabilities
 */
protected hasAnyBinding(capabilities: string[]): boolean {
  return capabilities.some(cap => this.hasBinding(cap));
}

/**
 * Get all binding targets for a set of capabilities
 * 
 * @param capabilities - Array of capabilities to get targets for
 * @returns Map of capability to target component name
 */
protected getBindingTargets(capabilities: string[]): Map<string, string> {
  const targets = new Map<string, string>();
  capabilities.forEach(cap => {
    const target = this.getBindingTarget(cap);
    if (target) {
      targets.set(cap, target);
    }
  });
  return targets;
}
```

### Phase 2: Update Components to Check Bindings

**Pattern for API Gateway Components**:

```typescript
// In lambda-api.component.ts
public synth(): void {
  // ... config building ...
  
  this.lambdaFunction = this.createLambdaFunction();
  
  // Only create RestApi if not bound to existing API Gateway
  if (!this.hasAnyBinding(['api:rest', 'api:http'])) {
    this.restApi = this.createRestApi(this.lambdaFunction);
    this.registerCapability('api:rest', this.buildApiCapability());
  } else {
    const target = this.getBindingTarget('api:rest') || this.getBindingTarget('api:http');
    this.logComponentEvent('api_gateway_bound', 'Skipping RestApi creation - bound to existing API Gateway', {
      targetComponent: target
    });
  }
  
  // ... rest of synthesis ...
}
```

**Pattern for VPC Components**:

```typescript
// In rds-postgres.component.ts or elasticache-redis.component.ts
private resolveVpc(): void {
  // Priority 1: Check if bound to VPC component
  if (this.hasBinding('networking:vpc')) {
    const target = this.getBindingTarget('networking:vpc');
    this.logComponentEvent('vpc_bound', 'Using VPC from binding', {
      targetComponent: target
    });
    // VPC will be injected via context.vpc by binder
    // If context.vpc is not set, throw error
    if (!this.context.vpc) {
      throw new Error(`Component is bound to VPC component '${target}' but context.vpc is not set. Ensure VPC component is synthesized before this component.`);
    }
    this.vpc = this.context.vpc;
    return;
  }
  
  // Priority 2: Use VPC resolver for explicit VPC ID
  if (this.config!.vpc.vpcId) {
    this.vpc = resolveVpcForSubnetGroups(this, 'Vpc', {
      vpcId: this.config!.vpc.vpcId,
      subnetIds: this.config!.vpc.subnetIds,
      availabilityZones: this.config!.vpc.availabilityZones,
      context: this.context,
      componentName: this.spec.name
    });
    return;
  }
  
  // Priority 3: Use default VPC if enabled
  if (this.config!.vpc.useDefaultVpc) {
    this.vpc = resolveVpcForSubnetGroups(this, 'Vpc', {
      useDefaultVpc: true,
      context: this.context,
      componentName: this.spec.name
    });
    return;
  }
  
  throw new Error('VPC is required but not provided via binding, config, or default VPC');
}
```

**Pattern for Storage Components**:

```typescript
// In components that create S3 buckets
private createS3BucketIfNeeded(): s3.IBucket | undefined {
  if (this.hasBinding('storage:s3')) {
    const target = this.getBindingTarget('storage:s3');
    this.logComponentEvent('s3_bound', 'Skipping S3 bucket creation - bound to existing bucket', {
      targetComponent: target
    });
    return undefined; // Use bound bucket via context or environment variables
  }
  
  // Create bucket if not bound
  return new s3.Bucket(this, 'Bucket', {
    // ... bucket config
  });
}
```

### Phase 3: Component-Specific Fixes

**Priority 1: Critical Components** (Create duplicate resources):

1. **`lambda-api`** - Creates `RestApi` unconditionally
   - **File**: `packages/components/lambda-api/src/lambda-api.component.ts`
   - **Line**: 103
   - **Fix**: Check for `api:rest`/`api:http` bindings before creating `RestApi`

2. **`container-application`** - Creates VPC unconditionally
   - **File**: `packages/components/container-application/src/container-application.component.ts`
   - **Line**: 103-139
   - **Fix**: Check for `networking:vpc` binding before creating VPC

**Priority 2: High-Risk Components** (May create duplicate resources):

3. **`rds-postgres`** - Creates/looks up VPC unconditionally
   - **File**: `packages/components/rds-postgres/src/rds-postgres.component.ts`
   - **Fix**: Check for `networking:vpc` binding before VPC resolution

4. **`elasticache-redis`** - Creates/looks up VPC unconditionally
   - **File**: `packages/components/elasticache-redis/src/elasticache-redis.component.ts`
   - **Fix**: Check for `networking:vpc` binding before VPC resolution

5. **`lambda-api` (VPC)** - Looks up VPC unconditionally
   - **File**: `packages/components/lambda-api/src/lambda-api.component.ts`
   - **Line**: 201
   - **Fix**: Check for `networking:vpc` binding before VPC lookup

6. **`application-load-balancer`** - Resolves VPC unconditionally
   - **File**: `packages/components/application-load-balancer/src/application-load-balancer.component.ts`
   - **Fix**: Check for `networking:vpc` binding before VPC resolution

7. **`ecs-fargate-service`** - May create VPC resources
   - **File**: `packages/components/ecs-fargate-service/src/ecs-fargate-service.component.ts`
   - **Fix**: Check for `networking:vpc` binding before VPC resolution

8. **`ec2-instance`** - Looks up VPC unconditionally
   - **File**: `packages/components/ec2-instance/ec2-instance.component.ts`
   - **Fix**: Check for `networking:vpc` binding before VPC lookup

**Priority 3: Medium-Risk Components** (May create duplicate resources):

9. **`efs-filesystem`** - Resolves VPC unconditionally
10. **`opensearch-domain`** - Resolves VPC unconditionally
11. **`sagemaker-notebook-instance`** - Looks up VPC unconditionally
12. **`auto-scaling-group`** - Looks up VPC unconditionally
13. **`lambda-worker`** - May create API Gateway or VPC resources

### Phase 4: Testing Strategy

**Test Cases for Each Component**:

1. **Test Case: Component Without Binding**
   - Component should create resources normally
   - Verify resources are created in CloudFormation template

2. **Test Case: Component With Binding**
   - Component should skip resource creation
   - Verify resources are NOT created in CloudFormation template
   - Verify binding is applied (IAM policies, environment variables)

3. **Test Case: Component With Binding But Missing Target**
   - Component should fail with clear error message
   - Error should indicate which target component is missing

4. **Test Case: Component With Multiple Bindings**
   - Component should skip creation for all bound resources
   - Verify all bindings are applied correctly

**Example Test for `lambda-api`**:

```typescript
describe('LambdaApiComponent - Binding Awareness', () => {
  it('Synthesis__WithApiGatewayBinding__SkipsRestApiCreation', () => {
    const spec: ComponentSpec = {
      name: 'test-lambda',
      type: 'lambda-api',
      config: { /* ... */ },
      binds: [
        {
          to: 'my-api',
          capability: 'api:rest',
          access: 'write'
        }
      ]
    };
    
    const component = new LambdaApiComponent(stack, 'TestLambda', context, spec);
    component.synth();
    
    const template = Template.fromStack(stack);
    
    // Should NOT create RestApi
    template.resourceCountIs('AWS::ApiGateway::RestApi', 0);
    
    // Should create Lambda function
    template.resourceCountIs('AWS::Lambda::Function', 1);
  });
  
  it('Synthesis__WithoutApiGatewayBinding__CreatesRestApi', () => {
    const spec: ComponentSpec = {
      name: 'test-lambda',
      type: 'lambda-api',
      config: { /* ... */ },
      binds: [] // No bindings
    };
    
    const component = new LambdaApiComponent(stack, 'TestLambda', context, spec);
    component.synth();
    
    const template = Template.fromStack(stack);
    
    // Should create RestApi
    template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    
    // Should create Lambda function
    template.resourceCountIs('AWS::Lambda::Function', 1);
  });
});
```

---

## Implementation Plan

### Step 1: Add BaseComponent Helpers (1-2 hours)
- [ ] Add `hasBinding()`, `getBindingTarget()`, `hasAnyBinding()`, `getBindingTargets()` to `BaseComponent`
- [ ] Add unit tests for helper methods
- [ ] Update component standards documentation

### Step 2: Fix Critical Components (4-6 hours)
- [ ] Fix `lambda-api` - API Gateway binding check
- [ ] Fix `container-application` - VPC binding check
- [ ] Add tests for both components

### Step 3: Fix High-Risk Components (8-12 hours)
- [ ] Fix `rds-postgres` - VPC binding check
- [ ] Fix `elasticache-redis` - VPC binding check
- [ ] Fix `lambda-api` (VPC) - VPC binding check
- [ ] Fix `application-load-balancer` - VPC binding check
- [ ] Fix `ecs-fargate-service` - VPC binding check
- [ ] Fix `ec2-instance` - VPC binding check
- [ ] Add tests for all components

### Step 4: Audit Remaining Components (4-6 hours)
- [ ] Search for all resource creation patterns
- [ ] Identify components that create resources matching their bindable capabilities
- [ ] Create audit report

### Step 5: Fix Medium-Risk Components (8-12 hours)
- [ ] Fix remaining VPC-using components
- [ ] Fix storage-using components
- [ ] Fix messaging-using components
- [ ] Fix security-using components
- [ ] Add tests for all components

### Step 6: Documentation & Standards (2-4 hours)
- [ ] Update component standards to require binding checks
- [ ] Add examples to component template
- [ ] Update platform architecture documentation

**Total Estimated Time**: 27-42 hours

---

## Verification Steps

### Manual Verification

1. **Create test service with bindings**:
   ```yaml
   # service.yml
   components:
     - name: my-vpc
       type: vpc
     - name: my-api
       type: api-gateway-rest
     - name: my-lambda
       type: lambda-api
       binds:
         - to: my-api
           capability: api:rest
           access: write
         - to: my-vpc
           capability: networking:vpc
           access: read
   ```

2. **Synthesize and verify**:
   ```bash
   pnpm shinobi synth -f service.yml
   ```

3. **Check CloudFormation template**:
   - Should have 1 VPC (from `my-vpc`)
   - Should have 1 API Gateway (from `my-api`)
   - Should have 1 Lambda function (from `my-lambda`)
   - Should NOT have duplicate VPC or API Gateway

### Automated Verification

1. **Run component tests**:
   ```bash
   pnpm test packages/components/lambda-api
   pnpm test packages/components/rds-postgres
   # ... etc
   ```

2. **Run integration tests**:
   ```bash
   pnpm test:integration
   ```

3. **Check for duplicate resources in test outputs**:
   - Parse CloudFormation templates from tests
   - Verify no duplicate resources for bound capabilities

---

## Related Issues

- `api-gateway-account-early-validation-error.md` - Related singleton resource issue
- `vpc-subnet-early-validation-root-cause.md` - Related VPC resolution issue
- Component isolation rules (`@audit/platform-governance.yaml:PGC-401`) - Components should not import other components, but should respect bindings

---

## References

- Platform Component API Spec: `docs/platform-standards/platform-component-api-spec.md`
- Platform Binding & Trigger Spec: `packages/core/src/platform/contracts/platform-binding-trigger-spec.ts`
- Component Standards Baseline: `.cursor/rules/component-standards-baseline.mdc`
- Resolver Engine: `packages/core/src/resolver/resolver-engine.ts`

---

## Notes

- This is a **platform-wide architectural issue** affecting multiple components
- The fix requires changes to many components, but the pattern is consistent
- Consider adding a linting rule to detect components that create resources matching their bindable capabilities
- Consider adding a pre-synthesis validation step that warns about potential duplicate resource creation


