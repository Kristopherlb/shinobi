# Logical ID Mapping & Drift Avoidance System

A comprehensive system for preserving CloudFormation logical IDs during migrations and refactoring to ensure zero-downtime deployments and avoid unintended resource replacements.

## Overview

The Logical ID Mapping & Drift Avoidance System provides:

- **Logical ID Preservation**: Maintains original CloudFormation logical IDs during platform migrations
- **Drift Avoidance**: Prevents unintended resource replacements through deterministic naming and validation
- **Planning Phase Integration**: Seamlessly integrates with `svc plan` command
- **Zero-Downtime Migration**: Ensures safe deployments for migrated services
- **Comprehensive Testing**: Validates zero-drift compliance and migration safety

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Logical ID System                          │
├─────────────────────────────────────────────────────────────┤
│  LogicalIdManager     │  PlanningIntegration  │  DriftEngine │
│  - Map Management     │  - Planning Phase     │  - Analysis  │
│  - Validation         │  - Template Compare   │  - Prevention│
│  - Persistence        │  - Report Generation  │  - Strategies│
├─────────────────────────────────────────────────────────────┤
│  CDK Aspect           │  CLI Integration      │  Validation  │
│  - ID Override        │  - Command Support    │  - Testing   │
│  - Deterministic      │  - File Management    │  - Compliance│
│  - Dependencies       │  - Report Output      │  - Zero-Drift│
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. LogicalIdManager

Core class for managing logical ID mappings:

```typescript
import { LogicalIdManager } from '@platform/logical-id';

const manager = new LogicalIdManager(logger);

// Load existing mapping
const logicalIdMap = await manager.loadLogicalIdMap('./logical-id-map.json');

// Apply preservation to CDK stack
const aspect = manager.applyLogicalIdPreservation(stack, logicalIdMap);

// Save mapping for future use
await manager.saveLogicalIdMap(logicalIdMap, './logical-id-map.json');
```

### 2. LogicalIdPreservationAspect

CDK Aspect that overrides logical IDs during synthesis:

```typescript
import { LogicalIdPreservationAspect } from '@platform/logical-id';

const aspect = new LogicalIdPreservationAspect(
  logicalIdMapping,
  driftAvoidanceConfig,
  logger
);

// Apply to CDK App or Stack
cdk.Aspects.of(app).add(aspect);
```

### 3. PlanningLogicalIdIntegration

Integrates logical ID preservation with the planning phase:

```typescript
import { PlanningLogicalIdIntegration } from '@platform/logical-id';

const integration = new PlanningLogicalIdIntegration(logger);

const planningContext: PlanningContext = {
  stackName: 'MyStack',
  environment: 'prod',
  logicalIdMapPath: './logical-id-map.json',
  enableDriftAvoidance: true,
  validateBeforePlan: true
};

const result = await integration.applyLogicalIdPreservationToPlan(
  stack,
  planningContext
);
```

### 4. DriftAvoidanceEngine

Analyzes and prevents CloudFormation drift:

```typescript
import { DriftAvoidanceEngine } from '@platform/logical-id';

const engine = new DriftAvoidanceEngine(logger);

// Analyze potential drift
const analysis = engine.analyzeDrift(stack, logicalIdMap);

// Apply drift avoidance strategies
const result = engine.applyDriftAvoidance(stack, logicalIdMap);
```

## Usage

### 1. Migration Workflow

```bash
# 1. Generate logical ID mapping during migration
svc migrate --preserve-logical-ids

# 2. Review generated logical-id-map.json
cat logical-id-map.json

# 3. Apply preservation during planning
svc plan --logical-id-map ./logical-id-map.json

# 4. Validate zero drift
svc plan --validate-zero-drift
```

### 2. Programmatic Usage

```typescript
import {
  LogicalIdManager,
  PlanningLogicalIdIntegration,
  DriftAvoidanceEngine
} from '@platform/logical-id';

// Initialize components
const logger = new Logger();
const manager = new LogicalIdManager(logger);
const integration = new PlanningLogicalIdIntegration(logger);
const engine = new DriftAvoidanceEngine(logger);

// Load logical ID map
const logicalIdMap = await manager.loadLogicalIdMap('./logical-id-map.json');

// Apply preservation to stack
const aspect = manager.applyLogicalIdPreservation(stack, logicalIdMap);

// Analyze drift
const driftAnalysis = engine.analyzeDrift(stack, logicalIdMap);

// Generate planning report
const planningResult = await integration.applyLogicalIdPreservationToPlan(
  stack,
  planningContext
);
```

### 3. CLI Integration

```typescript
import { LogicalIdCliIntegration } from '@platform/logical-id/cli-integration';

const cliIntegration = new LogicalIdCliIntegration(logger);

const options: LogicalIdCliOptions = {
  stackName: 'MyStack',
  environment: 'prod',
  logicalIdMapPath: './logical-id-map.json',
  enableDriftAvoidance: true,
  validateBeforePlan: true,
  outputFormat: 'pretty'
};

const result = await cliIntegration.executeLogicalIdPreservation(
  stack,
  options
);

console.log(result.report);
```

## Logical ID Map Format

```json
{
  "version": "1.0.0",
  "stackName": "MyStack",
  "environment": "prod",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "mappings": {
    "ApiFunction": {
      "originalId": "OriginalApiFunction123ABC",
      "newId": "ApiFunction",
      "resourceType": "AWS::Lambda::Function",
      "componentName": "api",
      "componentType": "lambda-api",
      "preservationStrategy": "exact-match",
      "metadata": {
        "stackName": "MyStack",
        "environment": "prod",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    }
  },
  "driftAvoidanceConfig": {
    "enableDeterministicNaming": true,
    "preserveResourceOrder": true,
    "validateBeforeApply": true
  }
}
```

## Drift Avoidance Strategies

### 1. Stateful Resource Preservation

Automatically preserves logical IDs for stateful resources:

- `AWS::RDS::DBInstance`
- `AWS::S3::Bucket`
- `AWS::DynamoDB::Table`
- `AWS::EFS::FileSystem`
- `AWS::ElastiCache::CacheCluster`
- `AWS::SecretsManager::Secret`

### 2. Deterministic Naming

Generates deterministic logical IDs for new resources:

```typescript
// Pattern: {serviceName}{componentName}{resourceType}{hash}
const deterministicId = 'MyServiceApiFunctionA1B2C3D4';
```

### 3. Dependency Preservation

Maintains resource dependencies during logical ID changes:

```typescript
// Before: ApiFunction references Database
// After: OriginalApiFunction references OriginalDatabase
```

## Zero-Drift Validation

The system ensures zero-downtime migrations through comprehensive validation:

### 1. Template Comparison

```typescript
// Compare templates before and after logical ID preservation
const comparison = await integration.compareTemplatesWithAndWithoutPreservation(
  stack,
  planningContext
);

// Should show zero differences
expect(comparison.differences.length).toBe(0);
```

### 2. CDK Diff Simulation

```typescript
// Simulate cdk diff output
const differences = simulateCdkDiff(originalTemplate, preservedTemplate);
expect(differences.length).toBe(0); // Zero drift achieved
```

### 3. Stateful Resource Validation

```typescript
// Ensure stateful resources are preserved
const statefulResources = ['AWS::RDS::DBInstance', 'AWS::S3::Bucket'];
statefulResources.forEach(resourceType => {
  expect(hasLogicalIdMapping(resourceType)).toBe(true);
});
```

## Testing

Comprehensive test suite validates zero-drift compliance:

```bash
# Run logical ID preservation tests
npm test -- tests/unit/platform/logical-id/

# Run zero-drift validation tests
npm test -- tests/unit/platform/logical-id/zero-drift-validation.test.ts
```

### Test Coverage

- ✅ Logical ID preservation for all resource types
- ✅ Complex resource hierarchies with dependencies
- ✅ Stateful resource protection
- ✅ Drift avoidance strategies
- ✅ Planning phase integration
- ✅ CLI integration
- ✅ Edge cases and error handling
- ✅ Zero-drift validation
- ✅ Migration compliance

## Best Practices

### 1. Migration Preparation

```bash
# 1. Always generate logical ID map during migration
svc migrate --preserve-logical-ids

# 2. Review and validate the mapping
svc plan --validate-logical-ids

# 3. Test in non-production environment first
svc plan --environment staging
```

### 2. Logical ID Map Management

```typescript
// Always validate before applying
const validation = manager.validateLogicalIdMap(logicalIdMap);
if (!validation.valid) {
  throw new Error(`Invalid logical ID map: ${validation.reason}`);
}

// Check for conflicts
const conflicts = manager.detectConflicts(logicalIdMap);
if (conflicts.length > 0) {
  console.warn('Logical ID conflicts detected:', conflicts);
}
```

### 3. Drift Avoidance

```typescript
// Enable deterministic naming for new resources
const config: DriftAvoidanceConfig = {
  enableDeterministicNaming: true,
  preserveResourceOrder: true,
  validateBeforeApply: true,
  allowedResourceTypes: [],
  blockedResourceTypes: ['AWS::CloudFormation::Stack']
};
```

## Troubleshooting

### Common Issues

1. **Logical ID Conflicts**
   ```
   Error: Conflict detected: Multiple resources would map to logical ID 'Resource1'
   ```
   **Solution**: Review and resolve naming conflicts in the logical ID map

2. **Missing Stateful Resource Mapping**
   ```
   Warning: Stateful resource Database (AWS::RDS::DBInstance) lacks preservation mapping
   ```
   **Solution**: Add logical ID mapping for stateful resources

3. **Template Validation Failure**
   ```
   Error: Template validation failed: Resource type mismatch
   ```
   **Solution**: Verify resource types match between original and new templates

### Debug Mode

```typescript
// Enable debug logging
const logger = new Logger({ level: 'debug' });

// Validate logical ID map
const validation = manager.validateLogicalIdMap(logicalIdMap);
console.log('Validation result:', validation);

// Analyze drift
const analysis = engine.analyzeDrift(stack, logicalIdMap);
console.log('Drift analysis:', analysis);
```

## Performance Considerations

- **Memory Usage**: Logical ID maps are loaded into memory during synthesis
- **Synthesis Time**: Aspect traversal adds minimal overhead (~1-2ms per resource)
- **File I/O**: Logical ID maps are cached after first load
- **Validation**: Validation is performed only when `validateBeforeApply` is enabled

## Security Considerations

- **Logical ID Map**: Store in version control with appropriate access controls
- **Validation**: Always validate logical ID maps before applying
- **Audit Trail**: Track all logical ID changes with metadata timestamps
- **Access Control**: Restrict logical ID map modification to authorized personnel

## Future Enhancements

- [ ] Support for nested stack logical ID preservation
- [ ] Integration with CloudFormation drift detection
- [ ] Automated logical ID conflict resolution
- [ ] Performance optimization for large stacks
- [ ] Support for multi-region deployments
- [ ] Integration with CI/CD pipelines

## Contributing

When contributing to the logical ID preservation system:

1. **Test Coverage**: Ensure all changes have comprehensive test coverage
2. **Zero-Drift**: Validate that changes maintain zero-drift compliance
3. **Documentation**: Update documentation for new features
4. **Performance**: Monitor performance impact of changes
5. **Backward Compatibility**: Maintain compatibility with existing logical ID maps

## License

This system is part of the Shinobi platform and follows the same licensing terms.
