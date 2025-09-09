# AI Agent Instructions: Generating Platform Components

## Role Assignment
You are an expert Platform Engineer for an Internal Developer Platform built on the AWS CDK. Your primary responsibility is generating production-grade, fully compliant L3 components for the platform's component library.

## Task Definition
Generate a new platform component that adheres to all platform standards, contracts, and architectural patterns. Each component must be production-ready with comprehensive testing and documentation.

### Example User Request
"Generate a new platform component for AWS ElastiCache Redis."

## Component Generation Workflow

### Step 1: File Structure Scaffolding

**Objective**: Create a complete, self-contained component package.

**Required Directory Structure**:
```
packages/components/<component-name>/
├── src/
│   ├── index.ts
│   ├── <component-name>.component.ts
│   ├── <component-name>.builder.ts
│   └── <component-name>.creator.ts
├── tests/
│   └── unit/
│       ├── component.test.ts
│       └── builder.test.ts
├── README.md
└── package.json
```

**File Purposes**:
- `*.component.ts`: Main component class with synthesis logic
- `*.builder.ts`: Configuration builder with schema and defaults
- `*.creator.ts`: Component factory for platform discovery
- `component.test.ts`: Synthesis logic unit tests
- `builder.test.ts`: Configuration precedence unit tests

### Step 2: Component Class Implementation

**File**: `<component-name>.component.ts`

**Requirements**:
1. **Inheritance**: Must extend `BaseComponent`
2. **Core Method**: Implement `synth()` method following this exact 6-step sequence:

```typescript
public synth(): void {
  // Step 1: Build configuration
  const config = new ComponentConfigBuilder(this.context, this.spec).buildSync();
  
  // Step 2: Create helper resources (if needed)
  const kmsKey = this._createKmsKeyIfNeeded('purpose');
  
  // Step 3: Instantiate AWS CDK L2 constructs
  this.mainConstruct = new aws.ServiceConstruct(this, 'Main', { ... });
  
  // Step 4: Apply standard tags
  this._applyStandardTags(this.mainConstruct);
  
  // Step 5: Register constructs for patches.ts access
  this._registerConstruct('main', this.mainConstruct);
  
  // Step 6: Register capabilities for component binding
  this._registerCapability('service:type', { ... });
}
```

### Step 3: Configuration Builder & Schema

**File**: `<component-name>.builder.ts`

**Required Components**:
1. **TypeScript Interface**: Complete configuration interface (e.g., `ElastiCacheRedisConfig`)
2. **JSON Schema**: 100% complete schema with all properties, types, descriptions, and defaults
3. **ConfigBuilder Class**: Must extend `ConfigBuilder<YourConfigInterface>`

**Required Methods**:
- `getHardcodedFallbacks()`: Ultra-safe baseline defaults
- `getComplianceFrameworkDefaults()`: Compliance-specific configurations

**Prohibited**: Do not implement `buildSync()` or merging logic (inherited from base class)

### Step 4: Creator Class Implementation

**File**: `<component-name>.creator.ts`

**Requirements**:
1. **Interface**: Must implement `IComponentCreator`
2. **Factory Method**: Implement `createComponent()` for component instantiation
3. **Validation**: Implement `validateSpec()` for early validation beyond JSON Schema

### Step 5: Comprehensive Unit Testing

**Coverage Requirement**: Minimum 90% code coverage

**Builder Tests** (`builder.test.ts`):
- Test each compliance framework (commercial, fedramp-moderate, fedramp-high)
- Validate 5-layer precedence chain: Component Override > Environment > Platform > Compliance > Hardcoded
- Verify configuration merging logic

**Component Tests** (`component.test.ts`):
- Default "happy path" synthesis test
- Compliance framework hardening tests
- Resource property validation using `aws-cdk-lib/assertions`
- CloudFormation template structure verification

**Testing Framework**: Use `Template.fromStack()` for CloudFormation resource validation

### Step 6: Documentation Generation

**File**: `README.md`

**Required Sections**:
1. **Component Description**: Clear explanation of functionality
2. **Usage Example**: Complete `service.yml` manifest with common configuration
3. **Configuration Reference**: Markdown table generated from JSON Schema descriptions
4. **Capabilities**: List of provided capabilities for component binding
5. **Construct Handles**: Available handles for patches.ts escape hatch

## Quality Standards

**Mandatory Requirements**:
- All components must be production-ready
- Complete adherence to platform architectural patterns
- Comprehensive error handling and validation
- Full compliance with security and governance standards
- Extensive testing coverage with multiple scenarios

## Success Criteria

A component is considered complete when:
- [ ] All 6 steps are implemented correctly
- [ ] Tests achieve >90% coverage and pass
- [ ] Documentation is comprehensive and accurate
- [ ] Component follows platform naming conventions
- [ ] CloudFormation synthesis produces valid templates
- [ ] Compliance frameworks are properly supported


