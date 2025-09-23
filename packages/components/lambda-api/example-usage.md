# Lambda API Component - Code Deployment Examples

## Overview

The Lambda API component now supports proper code deployment instead of hardcoded mock responses. This document shows how to use the new code loading functionality.

## Configuration Options

### Basic Usage with Default Code Path

```yaml
# service.yml
components:
  - name: my-api
    type: lambda-api
    config:
      handler: "index.handler"
      codePath: "./src"  # Default value
      useInlineFallback: true  # Default value
```

### Custom Code Path

```yaml
# service.yml
components:
  - name: my-api
    type: lambda-api
    config:
      handler: "src/api.handler"
      codePath: "./lambda-functions"
      codeAssetHash: "v1.2.3"  # For cache busting
      useInlineFallback: true
```

### Production Configuration (No Fallback)

```yaml
# service.yml
components:
  - name: my-api
    type: lambda-api
    config:
      handler: "dist/index.handler"
      codePath: "./dist"
      codeAssetHash: "prod-2024-01-15"
      useInlineFallback: false  # Fail if code not found
      memorySize: 1024
      timeout: 60
```

## Code Structure

### Directory Structure
```
my-service/
├── src/
│   └── index.js          # Lambda function code
├── dist/
│   └── index.js          # Compiled Lambda function code
└── service.yml           # Component configuration
```

### Example Lambda Function Code

```javascript
// src/index.js
exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  try {
    // Your actual business logic here
    const response = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Hello from real Lambda function!',
        timestamp: new Date().toISOString(),
        path: event.path,
        method: event.httpMethod
      })
    };
    
    return response;
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

## Fallback Behavior

When `useInlineFallback: true` (default), the component will:

1. **First**: Try to load code from the specified `codePath`
2. **If path doesn't exist**: Log a warning and use the enhanced inline fallback code
3. **If path exists but is invalid**: Log a warning and use the enhanced inline fallback code

The enhanced inline fallback provides:
- Basic HTTP method routing (GET, POST, PUT, OPTIONS)
- CORS support
- Health check endpoint (`/health`)
- Error handling
- Environment variable integration

## Migration from Hardcoded Code

### Before (Hardcoded)
```typescript
code: lambda.Code.fromInline(`
  exports.handler = async (event) => {
    return { statusCode: 200, body: JSON.stringify({ message: 'Hello from Lambda!' }) };
  };
`),
```

### After (Dynamic Code Loading)
```typescript
code: this.loadLambdaCode(),
```

The component now automatically:
- Loads real function code from the filesystem
- Provides intelligent fallback when code is not available
- Supports both directory and file paths
- Includes cache busting with asset hashes
- Maintains backward compatibility

## Benefits

1. **Real Functionality**: No more hardcoded mock responses
2. **Flexible Deployment**: Support for various code organization patterns
3. **Graceful Fallback**: Enhanced inline code when external code is unavailable
4. **Cache Busting**: Asset hash support for proper deployments
5. **Production Ready**: Can disable fallback for strict production environments
6. **Developer Friendly**: Clear warnings when fallback is used
