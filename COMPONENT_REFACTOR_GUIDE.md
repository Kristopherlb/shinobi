# Component Refactor Script Guide

This script automatically refactors all components in `src/components/` to conform with the **Platform Component API Contract v1.1**.

## 🚀 Quick Start

```bash
# Dry run to see what would be changed
./refactor-all-components.js --dry-run --verbose

# Refactor all components (creates backups)
./refactor-all-components.js

# Refactor a specific component
./refactor-all-components.js --component=vpc

# Skip already refactored components
./refactor-all-components.js --skip-existing
```

## 📋 What the Script Does

For each component directory, the script:

1. **📊 Analyzes** existing component structure
2. **🏗️ Generates** new API Contract-compliant files:
   - `{component}.builder.ts` - ConfigBuilder with 5-layer precedence
   - `{component}.creator.ts` - Creator with validation & factory methods
   - `{component}.component.ts` - Refactored component extending BaseComponent
   - `{component}.builder.test.ts` - ConfigBuilder tests
   - `{component}.component.synthesis.test.ts` - Component synthesis tests
   - `README.md` - Comprehensive documentation
   - `index.ts` - Clean exports
3. **💾 Creates backups** of existing files in `./component-refactor-backups/`
4. **🔧 Preserves** original functionality while modernizing structure

## 🎯 Component Categories

The script automatically categorizes components:

- **API**: `api-gateway-http`, `api-gateway-rest`
- **Compute**: `ec2-instance`, `lambda-api`, `ecs-fargate-service`, etc.
- **Storage**: `s3-bucket`, `dynamodb-table`, `efs-filesystem`
- **Database**: `rds-postgres`, `opensearch-domain`
- **Cache**: `elasticache-redis`
- **Networking**: `vpc`, `application-load-balancer`, `cloudfront-distribution`
- **Security**: `iam-role`, `secrets-manager`, `certificate-manager`, etc.
- **Messaging**: `sqs-queue`, `sns-topic`, `kinesis-stream`
- **And more...**

## 📝 Command Line Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Show what would be changed without modifying files |
| `--verbose` or `-v` | Show detailed logging |
| `--skip-existing` | Skip components that are already refactored |
| `--component=name` | Refactor only the specified component |

## 🔍 Already Refactored Components

These components are skipped by default (use `--skip-existing` to skip them):

- `api-gateway-http`
- `api-gateway-rest` 
- `application-load-balancer`
- `rds-postgres`
- `localstack-environment`

## 📊 Generated File Structure

After refactoring, each component will have:

```
src/components/{component}/
├── {component}.component.ts       # Main component (extends BaseComponent)
├── {component}.builder.ts         # ConfigBuilder with 5-layer precedence  
├── {component}.creator.ts         # Creator with validation & factory
├── {component}.builder.test.ts    # ConfigBuilder tests
├── {component}.component.synthesis.test.ts  # Component synthesis tests
├── index.ts                       # Clean exports
└── README.md                      # Comprehensive documentation
```

## 🏗️ What Gets Generated

### 1. ConfigBuilder (`{component}.builder.ts`)

```typescript
export class VpcConfigBuilder extends ConfigBuilder<VpcConfig> {
  protected getHardcodedFallbacks(): Partial<VpcConfig> {
    // Ultra-safe baseline configuration
  }
  
  protected getComplianceFrameworkDefaults(): Partial<VpcConfig> {
    // Commercial, FedRAMP Moderate/High defaults
  }
}
```

### 2. Creator (`{component}.creator.ts`)

```typescript
export class VpcCreator implements IComponentCreator {
  public createComponent(scope, spec, context): VpcComponent {
    return new VpcComponent(scope, spec, context);
  }
  
  public validateSpec(spec, context): { valid: boolean; errors: string[] } {
    // Advanced validation beyond JSON Schema
  }
}
```

### 3. Component (`{component}.component.ts`)

```typescript
export class VpcComponent extends BaseComponent {
  public synth(): void {
    // 1. Build configuration using ConfigBuilder
    // 2. Call BaseComponent helper methods
    // 3. Instantiate CDK constructs  
    // 4. Apply standard tags
    // 5. Register constructs
    // 6. Register capabilities
  }
}
```

### 4. Tests

- **Builder Tests**: Test 5-layer precedence chain and compliance defaults
- **Synthesis Tests**: Test CDK resource creation and CloudFormation properties

### 5. Documentation

- **README.md**: Usage examples, configuration reference, compliance info

## ⚠️ Important Notes

### Manual Work Required After Script

The script generates **scaffolding and templates**. You'll need to:

1. **📝 Update ConfigBuilder interfaces** with actual component configuration
2. **🔧 Implement actual CDK constructs** in the component's `createMainConstruct()` method
3. **✅ Add specific test assertions** for CloudFormation resources
4. **📚 Refine documentation** with component-specific examples
5. **🔗 Update component registry** to include new creators

### What the Script Preserves

- ✅ **Original files** are backed up
- ✅ **Component functionality** structure is analyzed and preserved in templates
- ✅ **Import statements** and dependencies are analyzed
- ✅ **Class names** and interfaces are detected and reused

### What Needs Manual Work

- 🔧 **Actual CDK construct implementation** - The script creates placeholders
- 📝 **Detailed configuration schemas** - Basic templates are provided
- ✅ **Specific test assertions** - Framework is provided, specifics need implementation
- 🎯 **Component-specific capabilities** - Templates show the pattern

## 🚨 Safety Features

- **💾 Automatic backups** of all existing files
- **🔍 Dry run mode** to preview changes
- **⏭️ Skip existing** option to avoid re-processing
- **🎯 Component filtering** to process one at a time
- **📊 Detailed logging** to track progress

## 🔄 Recovery

If something goes wrong:

```bash
# Restore from backups
cp -r component-refactor-backups/vpc/* src/components/vpc/

# Or restore specific files
cp component-refactor-backups/vpc/vpc.component.ts src/components/vpc/
```

## 📈 Usage Examples

### Refactor All Components (Recommended Approach)

```bash
# First, do a dry run to see what will change
./refactor-all-components.js --dry-run --verbose

# If satisfied, run the actual refactor
./refactor-all-components.js --skip-existing
```

### Refactor One Component at a Time

```bash
# Start with a simple component
./refactor-all-components.js --component=s3-bucket --verbose

# Then move to more complex ones
./refactor-all-components.js --component=vpc --verbose
./refactor-all-components.js --component=lambda-api --verbose
```

### Test Specific Categories

```bash
# Refactor all storage components
for component in s3-bucket dynamodb-table efs-filesystem; do
  ./refactor-all-components.js --component=$component
done
```

## 🎯 Next Steps After Running

1. **🔍 Review generated files** in each component directory
2. **🧪 Run tests** to see what needs implementation:
   ```bash
   npm test -- --testPathPattern=builder.test.ts
   npm test -- --testPathPattern=synthesis.test.ts
   ```
3. **📝 Implement actual CDK constructs** in component files
4. **✅ Add specific test assertions** for your CloudFormation resources
5. **📚 Update documentation** with real examples
6. **🔗 Update component factory registry** to include new creators

## 🏆 Benefits of Refactoring

After refactoring, your components will have:

- ✅ **Consistent architecture** following Platform API Contract
- ✅ **5-layer configuration precedence** with compliance awareness
- ✅ **Comprehensive testing** framework
- ✅ **Detailed documentation** with examples
- ✅ **Platform integration** with logging, tagging, observability
- ✅ **Security-first** configuration with compliance defaults
- ✅ **Maintainable codebase** with clear separation of concerns

## 🆘 Troubleshooting

### Script Issues

```bash
# Permission denied
chmod +x refactor-all-components.js

# Node.js not found
which node  # Make sure Node.js is installed

# Component not found
ls src/components/  # Verify component directory exists
```

### Generated Code Issues

1. **Import errors**: Check if BaseComponent and contracts are available
2. **TypeScript errors**: Run `npm run build` to see specific errors
3. **Test failures**: Generated tests are templates - implement specific assertions
4. **Missing capabilities**: Implement actual capability registration in components

This script provides a solid foundation for modernizing your entire component library to follow the Platform Component API Contract! 🚀
