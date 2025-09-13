# KB-Driven Component Pattern

This document describes the pragmatic, drop-in pattern that wires **KB packs → config defaults → OTel/alarms/dashboards → tests/rego → Q&A** end-to-end.

## Overview

The pattern provides thin libraries that enable:
- **KB-driven pack selection** and compliance plan generation
- **Recipe-based observability** with framework-specific retention
- **Plan-driven test generation** with rule-specific assertions
- **Plan-driven REGO policy generation** for posture rules
- **Compliance Q&A** based on component plans

## Architecture

```
Platform KB → Component Plan → Generated Artifacts
     ↓              ↓                    ↓
  Pack Rules → Compliance Plan → Tests + REGO + Obs
     ↓              ↓                    ↓
  NIST Controls → Framework Config → CI/CD Validation
```

## Libraries

### 1. `tools/lib/kb.mjs` - KB Loading & Plan Building

**Core Functions:**
- `loadKB(root)` - Load platform KB index and packs
- `choosePacks(opts)` - Select packs based on service/framework
- `flattenRules(kbRoot, packsIndex, ids, serviceType)` - Extract applicable rules
- `buildPlan(params)` - Generate complete component plan
- `writePlan(plan, componentDir)` - Persist plan to audit directory

**Usage:**
```javascript
import { buildPlan, writePlan } from './lib/kb.mjs';

const plan = buildPlan({
  component: 's3-bucket',
  serviceType: 's3-bucket', 
  framework: 'fedramp-moderate',
  extraControls: ['AC-2(3)', 'AT-4(b)'],
  kbRoot: 'platform-kb'
});

writePlan(plan, 'packages/components/s3-bucket');
```

### 2. `packages/components/_lib/observability.ts` - Recipe-Based Observability

**Core Functions:**
- `loadRecipe(kbRoot, serviceType)` - Load service-specific observability recipe
- `applyRecipe(stack, recipe, opts)` - Apply alarms/dashboards from recipe
- `getFrameworkRetention(framework)` - Get retention settings by framework
- `createLogGroup(stack, logGroupName, framework)` - Create log group with retention
- `enableLambdaAdot(env)` - Configure Lambda ADOT environment

**Usage:**
```typescript
import { loadRecipe, applyRecipe, getFrameworkRetention } from '../_lib/observability';

const recipe = loadRecipe('platform-kb', 's3-bucket');
if (recipe) {
  applyRecipe(stack, recipe, { 
    framework: 'fedramp-moderate',
    ns: 'S3',
    componentName: 's3-bucket'
  });
}
```

### 3. `packages/components/_lib/tags.ts` - Compliance Tagging

**Core Function:**
- `applyComplianceTags(scope, params)` - Apply standardized compliance tags

**Usage:**
```typescript
import { applyComplianceTags } from '../_lib/tags';

applyComplianceTags(this.mainConstruct, {
  component: 's3-bucket',
  serviceType: 's3-bucket',
  framework: plan.framework,
  controls: plan.nist_controls,
  owner: this.context.owner,
  environment: this.context.environment
});
```

## Component Pattern

### Enhanced synth() Method

```typescript
export class S3BucketComponent extends BaseComponent {
  public synth(): void {
    // Step 1: Build configuration using 5-layer precedence
    const config = new ComponentConfigBuilder(this.context, this.spec).buildSync();

    // Step 2: Helper resources if needed (e.g., CMK)
    const kmsKey = this._createKmsKeyIfNeeded('s3-data');

    // Step 3: L2 constructs (set properties to satisfy rules & framework)
    this.mainConstruct = new s3.Bucket(this, 'Main', {
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: kmsKey,
      serverAccessLogsBucket: config.logging?.accessLogsBucket,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true
    });

    // Step 4: Apply compliance tags using KB-driven plan
    const plan = buildPlan({
      component: 's3-bucket',
      serviceType: 's3-bucket',
      framework: config.framework,
      extraControls: config.extraControls || []
    });
    
    applyComplianceTags(this.mainConstruct, {
      component: 's3-bucket',
      serviceType: 's3-bucket',
      framework: plan.framework,
      controls: plan.nist_controls,
      owner: this.context.owner,
      environment: this.context.environment
    });

    // Step 5: Register constructs for platform access
    this._registerConstruct('main', this.mainConstruct);

    // Step 6: Register capabilities for component binding
    this._registerCapability('storage:s3-bucket', {
      bucketArn: this.mainConstruct.bucketArn,
      bucketName: this.mainConstruct.bucketName
    });

    // Observability from recipe (alarms/dashboards)
    const recipe = loadRecipe('platform-kb', 's3-bucket');
    if (recipe) {
      applyRecipe(Stack.of(this), recipe, { 
        framework: plan.framework, 
        ns: 'S3',
        componentName: 's3-bucket'
      });
    }

    // Persist plan to /audit for Q&A & CI
    this._writeAuditArtifact('component.plan.json', plan);
  }
}
```

### Builder with Framework Defaults

```typescript
export class ComponentConfigBuilder {
  buildSync(): any {
    const userConfig = this.spec || {};
    const framework = userConfig.framework || 'commercial';
    
    // 5-layer precedence: Component > Environment > Platform > Compliance > Hardcoded
    return {
      ...this.getHardcodedFallbacks(),
      ...this.getComplianceFrameworkDefaults(framework),
      ...this.getPlatformDefaults(),
      ...this.getEnvironmentDefaults(),
      ...userConfig
    };
  }

  private getComplianceFrameworkDefaults(framework: string): any {
    const retention = getFrameworkRetention(framework);
    
    switch (framework) {
      case 'fedramp-high':
        return {
          encryption: true,
          logging: true,
          monitoring: true,
          backup: true,
          high_availability: true,
          logRetention: retention.logs,
          metricRetention: retention.metrics,
          auditLogging: true,
          continuousMonitoring: true
        };
      
      case 'fedramp-moderate':
        return {
          encryption: true,
          logging: true,
          monitoring: true,
          backup: true,
          logRetention: retention.logs,
          metricRetention: retention.metrics,
          auditLogging: true
        };
      
      case 'commercial':
      default:
        return {
          encryption: true,
          logging: true,
          monitoring: true,
          logRetention: retention.logs,
          metricRetention: retention.metrics
        };
    }
  }
}
```

## Tool Integration

### Test Generation

```bash
# Generate tests from component plan
node tools/gen-tests-from-plan.mjs s3-bucket
```

**Generated Tests:**
- Rule-specific assertions based on plan rules
- Framework-specific compliance checks
- Tag validation tests
- Capability tests

### REGO Generation

```bash
# Generate REGO policies from component plan
node tools/gen-rego-from-plan.mjs s3-bucket
```

**Generated REGO:**
- Rule-specific policy checks
- Framework-specific compliance rules
- Violation detection
- Compliance score calculation

### Compliance Q&A

```bash
# Ask questions about component compliance
node tools/compliance-qa.mjs s3-bucket "which packs are selected?"
node tools/compliance-qa.mjs s3-bucket "which nist controls are enforced?"
node tools/compliance-qa.mjs s3-bucket "provide a compliance summary"
```

## CI Integration

The GitHub workflow automatically:

1. **Loads compliance packs** using KB library
2. **Generates components** with Shinobi agent
3. **Generates tests and REGO** from component plans
4. **Runs static compliance audit**
5. **Validates compliance artifacts**

```yaml
- name: Generate tests and REGO from plan
  run: |
    SERVICE_TYPE=${SERVICE_TYPE:-"s3-bucket"}
    echo "🧪 Generating tests from component plan..."
    node tools/gen-tests-from-plan.mjs $SERVICE_TYPE
    echo "📋 Generating REGO policies from component plan..."
    node tools/gen-rego-from-plan.mjs $SERVICE_TYPE
    echo "✅ Test and policy generation completed"
```

## Developer Workflow

1. **Generate component** with Cursor (using KB-aware system prompt)
2. **synth()** uses builder defaults + applyComplianceTags() and writes component.plan.json
3. **Run tools:**
   ```bash
   node tools/gen-tests-from-plan.mjs s3-bucket
   node tools/gen-rego-from-plan.mjs s3-bucket
   node tools/svc-audit-static.mjs
   ```
4. **Use Q&A** for compliance questions:
   ```bash
   node tools/compliance-qa.mjs s3-bucket "which packs apply?"
   ```

## Benefits

- **Compliance by Construction** - Rules are enforced at build time
- **Framework Consistency** - All components follow same compliance patterns
- **Audit Trail** - Complete compliance plan with NIST controls and rules
- **Test Coverage** - Generated tests ensure compliance rules are enforced
- **Policy as Code** - REGO policies for posture management
- **Observability Integration** - Recipe-driven alarms and dashboards
- **Q&A Support** - Easy compliance questions and answers

## Next Steps

1. **Extend Platform KB** with additional packs and controls
2. **Add Service Recipes** for observability configurations
3. **Customize Templates** for organization-specific requirements
4. **Integrate with Existing Tools** (CFN Guard, OPA, AWS Config)
5. **Add More Service Types** to the KB catalog
