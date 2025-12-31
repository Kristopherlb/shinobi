# Manifest Schema Validation System

## 🥷 Overview

The Shinobi platform implements a comprehensive JSON Schema-based validation system for service manifests. This system dynamically composes a master schema from the base manifest schema and each component's individual `Config.schema.json` schema, providing detailed validation with clear error reporting.

## 🏗️ Architecture

### Components

1. **ManifestSchemaComposer** - Dynamically composes master schema from base + component schemas
2. **EnhancedSchemaValidator** - Performs comprehensive validation with detailed error reporting
3. **SchemaValidator** - Enhanced wrapper that uses the composed schema validation
4. **SchemaErrorFormatter** - Provides human-readable error messages with JSON paths

### Validation Flow

```
service.yml → ManifestParser → EnhancedSchemaValidator → ValidationResult
                    ↓
            ManifestSchemaComposer
                    ↓
        Base Schema + Component Schemas → Master Schema
```

## 🔧 Implementation Details

### Dynamic Schema Composition

The system automatically discovers and loads component schemas from:
- `packages/components/*/Config.schema.json`
- `packages/components/*/src/schema/Config.schema.json`

### Component-Specific Validation

Each component's `config` section is validated against its specific `Config.schema.json` schema:

```yaml
components:
  - name: my-ec2
    type: ec2-instance
    config:
      instanceType: t3.micro  # Validated against ec2-instance Config.schema.json
      ami:
        amiId: ami-12345678  # Required field validation
```

### Error Reporting

The system provides detailed error reports with:
- **JSON Path** - Exact location of the error (e.g., `components[0].config.instanceType`)
- **Error Message** - Human-readable description
- **Rule Violated** - The JSON Schema rule that failed
- **Component Type** - Which component type the error relates to
- **Allowed Values** - For enum validation errors

## 📋 Usage

### CLI Command

```bash
# Validate a service manifest
svc validate --file service.yml

# Validate with verbose output
svc validate --file service.yml --verbose
```

### Programmatic Usage

```typescript
import { ManifestSchemaComposer } from './services/manifest-schema-composer';
import { EnhancedSchemaValidator } from './services/enhanced-schema-validator';

// Compose master schema
const composer = new ManifestSchemaComposer({ logger });
const validator = new EnhancedSchemaValidator({ logger, schemaComposer: composer });

// Validate manifest
const result = await validator.validateManifest(manifest);
if (!result.valid) {
  console.log(validator.generateValidationReport(result));
}
```

## 🧪 Testing

### Test Script

```bash
# Run comprehensive validation tests
node test-schema-validation.js
```

### Test Cases

1. **Valid Manifest** - Should pass validation
2. **Invalid Manifest** - Should fail with detailed errors
3. **Missing File** - Should handle gracefully
4. **Component Schema Loading** - Should discover and load schemas

## 📊 Validation Results

### Success Example

```
✅ Manifest validation passed successfully!

Component Validation Summary:
  ✅ my-ec2 (ec2-instance)
  ✅ my-database (rds-postgres)
  ✅ my-cache (elasticache-redis)
```

### Error Example

```
❌ Manifest validation failed!

Errors (3):
  • components[1].config.instanceType: must be equal to one of the allowed values
    Allowed values: t3.micro, t3.small, t3.medium, m5.large
    Component type: ec2-instance

  • components[2].type: Unknown component type: unknown-component-type. Available types: ec2-instance, rds-postgres, elasticache-redis
    Component type: unknown-component-type

  • components[3].config.ami: must have required property 'amiId'
    Component type: ec2-instance

Warnings (1):
  • components[0].config.storage.rootVolumeSize: should be >= 20
    Component type: ec2-instance

Component Validation Summary:
  ✅ valid-component (ec2-instance)
  ❌ invalid-component (ec2-instance)
  ❌ unknown-component (unknown-component-type)
  ❌ incomplete-component (ec2-instance)
```

## 🔍 Schema Discovery

The system automatically discovers component schemas by scanning:

```
packages/components/
├── ec2-instance/
│   └── Config.schema.json
├── rds-postgres/
│   └── Config.schema.json
├── elasticache-redis/
│   └── Config.schema.json
└── dagger-engine-pool/
    ├── Config.schema.json
    └── src/schema/
        └── Config.schema.json
```

## 🛠️ Component Schema Format

Each component's `Config.schema.json` should follow this structure:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ComponentName Config",
  "type": "object",
  "required": ["field1", "field2"],
  "properties": {
    "field1": {
      "type": "string",
      "description": "Field description"
    },
    "field2": {
      "type": "object",
      "properties": {
        "nestedField": {
          "type": "boolean",
          "default": true
        }
      }
    }
  }
}
```

## 🚀 Features

### Comprehensive Validation
- ✅ Base manifest schema validation
- ✅ Component-specific configuration validation
- ✅ Required field validation
- ✅ Type validation (string, number, boolean, object, array)
- ✅ Enum value validation
- ✅ Pattern matching (regex)
- ✅ Format validation (email, date, etc.)
- ✅ Minimum/maximum value validation
- ✅ Array length validation

### Error Reporting
- ✅ Detailed JSON path locations
- ✅ Component type identification
- ✅ Human-readable error messages
- ✅ Allowed values for enum errors
- ✅ Severity levels (error vs warning)
- ✅ Validation report generation

### Fallback Handling
- ✅ Graceful fallback to basic validation if enhanced fails
- ✅ Component schema discovery failures don't break validation
- ✅ Missing component schemas are handled gracefully

### Performance
- ✅ Schema caching and reuse
- ✅ Lazy loading of component schemas
- ✅ Efficient validation with AJV
- ✅ Parallel component validation

## 🔧 Configuration

### Environment Variables

```bash
# Enable verbose validation logging
SHINOBI_VALIDATION_VERBOSE=true

# Custom schema discovery paths
SHINOBI_SCHEMA_PATHS=packages/components/*/Config.schema.json

# Enable strict validation mode
SHINOBI_STRICT_VALIDATION=true
```

### CLI Options

```bash
# Validate with specific options
svc validate --file service.yml --verbose --strict
```

## 📈 Statistics

The validation system provides statistics about schema composition:

```typescript
const stats = validator.getSchemaStats();
console.log(stats);
// Output:
// {
//   baseSchemaLoaded: true,
//   componentSchemasLoaded: 25,
//   componentTypes: ['ec2-instance', 'rds-postgres', 'elasticache-redis', ...]
// }
```

## 🐛 Troubleshooting

### Common Issues

1. **Component schema not found**
   - Ensure `Config.schema.json` exists in component directory
   - Check file permissions and path structure

2. **Validation errors not showing component type**
   - Verify component type is properly set in manifest
   - Check schema discovery is working correctly

3. **Fallback to basic validation**
   - Check logs for enhanced validation errors
   - Verify all dependencies are properly installed

### Debug Mode

```bash
# Enable debug logging
DEBUG=shinobi:validation svc validate --file service.yml
```

## 🔮 Future Enhancements

- [ ] Schema versioning and migration
- [ ] Custom validation rules
- [ ] Validation caching
- [ ] IDE integration for real-time validation
- [ ] Validation performance metrics
- [ ] Custom error message templates
- [ ] Validation rule documentation generation

---

**The enhanced schema validation system ensures that every component configuration in service.yml conforms to the expected structure before synthesis, providing developers with clear, actionable error messages and comprehensive validation coverage.**
