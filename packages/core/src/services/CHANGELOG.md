# Service Layer Changes

## v1.1.0 - Enhanced Logging, Security, and Performance

### New Features

#### 🔍 Enhanced Logging
- **Info-level logging** added to all core services for better observability
- **Structured logging** with consistent format across all services
- **Performance metrics** with timing and memory usage tracking
- **Configurable verbosity** via environment variables

#### 🔒 Security Improvements
- **Path traversal protection** in all file operations
- **Environment validation** with helpful error messages
- **System directory access prevention**

#### ⚡ Performance Monitoring
- **Real-time performance metrics** for all major operations
- **Automatic threshold checking** with configurable warnings/errors
- **Memory usage tracking** for resource monitoring

### Breaking Changes

#### Environment Validation
- **Stricter environment validation**: Missing environments now throw errors instead of silently failing
- **Better error messages**: Shows available environments when validation fails
- **Migration**: Update manifests to explicitly define all required environments

#### File Discovery
- **Dual extension support**: Now supports both `.yml` and `.yaml` extensions
- **Warning on missing manifest**: Clear warning when no manifest file is found

### Configuration

#### Environment Variables
- `TEMPLATE_CONFIG_PATH`: Override default template configuration path
- `SHINOBI_STRICT_SCHEMA_VALIDATION=true`: Enable AJV strict mode for schema validation
- `SHINOBI_VERBOSE_VALIDATION=true`: Show detailed validation errors

#### Logging Levels
- **INFO**: Operation completion, validation results, warnings
- **DEBUG**: Detailed error information, performance metrics
- **WARN**: Missing manifests, compliance framework defaults

### Migration Guide

#### For Manifest Files
```yaml
# Before (may fail)
service: my-service
# ... components

# After (explicit environments)
service: my-service
environments:
  dev:
    # ... dev config
  prod:
    # ... prod config
```

#### For CLI Usage
```bash
# Enable strict schema validation
SHINOBI_STRICT_SCHEMA_VALIDATION=true svc validate

# Enable verbose validation output
SHINOBI_VERBOSE_VALIDATION=true svc validate

# Override template config path
TEMPLATE_CONFIG_PATH=/custom/path/templates.yaml svc init
```

### Performance Expectations

Typical operation times (with performance metrics):
- **Config loading**: 50-100ms
- **Context hydration**: 100-200ms  
- **Schema validation**: 100-500ms (depending on manifest size)
- **File discovery**: 50-150ms
- **Manifest parsing**: 20-50ms
- **Observability application**: 50-200ms per component

### Troubleshooting

#### Common Issues

1. **Environment not found error**
   - **Cause**: Environment not defined in manifest
   - **Solution**: Add environment to `environments` section or use correct environment name

2. **Path traversal security error**
   - **Cause**: Attempting to access files outside project directory
   - **Solution**: Use relative paths within project directory

3. **Strict schema validation errors**
   - **Cause**: AJV strict mode enabled with incompatible schemas
   - **Solution**: Disable with `SHINOBI_STRICT_SCHEMA_VALIDATION=false` or update schemas

#### Debug Information

Enable debug logging for detailed information:
```bash
DEBUG=platform:* svc validate
```

### Future Considerations

- **Centralized logging**: Integration with platform observability systems
- **Schema evolution**: Gradual migration to strict schema validation
- **Performance dashboards**: Integration with monitoring systems
- **Error reporting**: Structured error reporting for better debugging
