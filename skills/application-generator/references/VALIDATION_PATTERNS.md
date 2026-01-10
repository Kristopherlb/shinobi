# Pre/Post Deploy Validation Patterns

## Pre-Deploy Validation

### 1. Manifest Schema Validation

```typescript
// scripts/pre-deploy-validate.ts
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import Ajv from 'ajv';

export async function validateManifestSchema(manifestPath: string): Promise<boolean> {
  const manifest = parse(readFileSync(manifestPath, 'utf-8'));
  const schema = JSON.parse(readFileSync('manifest.schema.json', 'utf-8'));
  
  const ajv = new Ajv();
  const validate = ajv.compile(schema);
  const valid = validate(manifest);
  
  if (!valid) {
    console.error('Manifest schema validation failed:');
    console.error(validate.errors);
    return false;
  }
  
  return true;
}
```

### 2. Component Config Validation

```typescript
export async function validateComponentConfigs(manifestPath: string): Promise<boolean> {
  const manifest = parse(readFileSync(manifestPath, 'utf-8'));
  let allValid = true;
  
  for (const component of manifest.components) {
    const configSchemaPath = `packages/components/${component.type}/Config.schema.json`;
    
    if (!existsSync(configSchemaPath)) {
      console.error(`Config schema not found for component type: ${component.type}`);
      allValid = false;
      continue;
    }
    
    const configSchema = JSON.parse(readFileSync(configSchemaPath, 'utf-8'));
    const ajv = new Ajv();
    const validate = ajv.compile(configSchema);
    const valid = validate(component.config || {});
    
    if (!valid) {
      console.error(`Config validation failed for component: ${component.name}`);
      console.error(validate.errors);
      allValid = false;
    }
  }
  
  return allValid;
}
```

### 3. Binding Validation

```typescript
export async function validateBindings(manifestPath: string): Promise<boolean> {
  const manifest = parse(readFileSync(manifestPath, 'utf-8'));
  const componentNames = new Set(manifest.components.map(c => c.name));
  let allValid = true;
  
  for (const component of manifest.components) {
    if (component.binds) {
      for (const binding of component.binds) {
        // Validate target exists
        if (!componentNames.has(binding.to)) {
          console.error(`Binding target not found: ${binding.to} (referenced by ${component.name})`);
          allValid = false;
        }
        
        // Validate capability exists (check target component's capabilities)
        const targetComponent = manifest.components.find(c => c.name === binding.to);
        if (targetComponent) {
          // Query component's capability registration
          const capabilities = await getComponentCapabilities(targetComponent.type);
          if (!capabilities.includes(binding.capability)) {
            console.error(`Capability not provided by target: ${binding.capability} (target: ${binding.to})`);
            allValid = false;
          }
        }
      }
    }
  }
  
  return allValid;
}
```

### 4. Capability Contract Validation

```typescript
export async function validateCapabilityContracts(manifestPath: string): Promise<boolean> {
  const manifest = parse(readFileSync(manifestPath, 'utf-8'));
  let allValid = true;
  
  for (const component of manifest.components) {
    if (component.binds) {
      for (const binding of component.binds) {
        const targetComponent = manifest.components.find(c => c.name === binding.to);
        if (targetComponent) {
          // Check if capability contract matches
          const providerCapabilities = await getComponentCapabilities(targetComponent.type);
          const consumerRequirements = await getComponentRequirements(component.type);
          
          if (!providerCapabilities.includes(binding.capability)) {
            console.error(`Capability mismatch: ${binding.capability} not provided by ${binding.to}`);
            allValid = false;
          }
          
          if (!consumerRequirements.includes(binding.capability)) {
            console.error(`Capability not required: ${binding.capability} not in requirements for ${component.name}`);
            allValid = false;
          }
        }
      }
    }
  }
  
  return allValid;
}
```

### 5. Pre-Deploy Validation Script

```bash
#!/bin/bash
# scripts/pre-deploy-validate.sh

set -e

echo "🔍 Running pre-deploy validation..."

# Validate manifest schema
echo "  ✓ Validating manifest schema..."
npx tsx scripts/pre-deploy-validate.ts validate-manifest-schema service.yml || exit 1

# Validate component configs
echo "  ✓ Validating component configs..."
npx tsx scripts/pre-deploy-validate.ts validate-component-configs service.yml || exit 1

# Validate bindings
echo "  ✓ Validating bindings..."
npx tsx scripts/pre-deploy-validate.ts validate-bindings service.yml || exit 1

# Validate capability contracts
echo "  ✓ Validating capability contracts..."
npx tsx scripts/pre-deploy-validate.ts validate-capability-contracts service.yml || exit 1

echo "✅ Pre-deploy validation passed!"
```

## Post-Deploy Validation

### 1. Resource Existence Validation

```typescript
// scripts/post-deploy-validate.ts
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { LambdaClient, GetFunctionCommand } from '@aws-sdk/client-lambda';
import { CloudWatchLogsClient, DescribeLogGroupsCommand } from '@aws-sdk/client-cloudwatch-logs';

export async function validateResourcesExist(
  serviceName: string,
  components: any[],
  region: string
): Promise<boolean> {
  const s3Client = new S3Client({ region });
  const lambdaClient = new LambdaClient({ region });
  const logsClient = new CloudWatchLogsClient({ region });
  
  let allValid = true;
  
  for (const component of components) {
    if (component.type === 's3-bucket') {
      const bucketName = component.config.bucketName || `${serviceName}-${component.name}`;
      try {
        await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
        console.log(`  ✓ S3 bucket exists: ${bucketName}`);
      } catch (error) {
        console.error(`  ✗ S3 bucket not found: ${bucketName}`);
        allValid = false;
      }
    }
    
    if (component.type === 'lambda-api' || component.type === 'lambda-worker') {
      const functionName = component.config.functionName || `${serviceName}-${component.name}`;
      try {
        await lambdaClient.send(new GetFunctionCommand({ FunctionName: functionName }));
        console.log(`  ✓ Lambda function exists: ${functionName}`);
      } catch (error) {
        console.error(`  ✗ Lambda function not found: ${functionName}`);
        allValid = false;
      }
    }
  }
  
  return allValid;
}
```

### 2. Connectivity Validation

```typescript
export async function validateConnectivity(
  serviceName: string,
  components: any[],
  region: string
): Promise<boolean> {
  let allValid = true;
  
  for (const component of components) {
    if (component.type === 'lambda-api' && component.config.api) {
      const apiEndpoint = process.env[`${component.name.toUpperCase()}_API_ENDPOINT`];
      if (apiEndpoint) {
        try {
          const response = await fetch(`${apiEndpoint}/health`);
          if (response.ok) {
            console.log(`  ✓ API endpoint healthy: ${apiEndpoint}`);
          } else {
            console.error(`  ✗ API endpoint unhealthy: ${apiEndpoint} (${response.status})`);
            allValid = false;
          }
        } catch (error) {
          console.error(`  ✗ API endpoint unreachable: ${apiEndpoint}`);
          allValid = false;
        }
      }
    }
  }
  
  return allValid;
}
```

### 3. Log Group Validation

```typescript
export async function validateLogGroups(
  serviceName: string,
  components: any[],
  region: string
): Promise<boolean> {
  const logsClient = new CloudWatchLogsClient({ region });
  let allValid = true;
  
  for (const component of components) {
    if (component.type === 'lambda-api' || component.type === 'lambda-worker') {
      const functionName = component.config.functionName || `${serviceName}-${component.name}`;
      const logGroupName = `/aws/lambda/${functionName}`;
      
      try {
        const response = await logsClient.send(new DescribeLogGroupsCommand({
          logGroupNamePrefix: logGroupName
        }));
        
        if (response.logGroups && response.logGroups.length > 0) {
          console.log(`  ✓ Log group exists: ${logGroupName}`);
        } else {
          console.error(`  ✗ Log group not found: ${logGroupName}`);
          allValid = false;
        }
      } catch (error) {
        console.error(`  ✗ Error checking log group: ${logGroupName}`);
        allValid = false;
      }
    }
  }
  
  return allValid;
}
```

### 4. Alarm Validation

```typescript
export async function validateAlarms(
  serviceName: string,
  components: any[],
  region: string
): Promise<boolean> {
  const cloudwatchClient = new CloudWatchClient({ region });
  let allValid = true;
  
  for (const component of components) {
    if (component.config.monitoring?.alarms) {
      for (const [alarmName, alarmConfig] of Object.entries(component.config.monitoring.alarms)) {
        if (alarmConfig.enabled) {
          const fullAlarmName = `${serviceName}-${component.name}-${alarmName}`;
          
          try {
            const response = await cloudwatchClient.send(new DescribeAlarmsCommand({
              AlarmNames: [fullAlarmName]
            }));
            
            if (response.MetricAlarms && response.MetricAlarms.length > 0) {
              console.log(`  ✓ Alarm exists: ${fullAlarmName}`);
            } else {
              console.error(`  ✗ Alarm not found: ${fullAlarmName}`);
              allValid = false;
            }
          } catch (error) {
            console.error(`  ✗ Error checking alarm: ${fullAlarmName}`);
            allValid = false;
          }
        }
      }
    }
  }
  
  return allValid;
}
```

### 5. Post-Deploy Validation Script

```bash
#!/bin/bash
# scripts/post-deploy-validate.sh

set -e

SERVICE_NAME="${1:-api-s3-service}"
REGION="${2:-us-west-2}"

echo "🔍 Running post-deploy validation for ${SERVICE_NAME}..."

# Validate resources exist
echo "  ✓ Validating resources exist..."
npx tsx scripts/post-deploy-validate.ts validate-resources-exist "$SERVICE_NAME" "$REGION" || exit 1

# Validate connectivity
echo "  ✓ Validating connectivity..."
npx tsx scripts/post-deploy-validate.ts validate-connectivity "$SERVICE_NAME" "$REGION" || exit 1

# Validate log groups
echo "  ✓ Validating log groups..."
npx tsx scripts/post-deploy-validate.ts validate-log-groups "$SERVICE_NAME" "$REGION" || exit 1

# Validate alarms
echo "  ✓ Validating alarms..."
npx tsx scripts/post-deploy-validate.ts validate-alarms "$SERVICE_NAME" "$REGION" || exit 1

echo "✅ Post-deploy validation passed!"
```

## Validation Integration

### CI/CD Integration

```yaml
# .github/workflows/deploy.yml
- name: Pre-Deploy Validation
  run: ./scripts/pre-deploy-validate.sh

- name: Deploy
  run: svc deploy

- name: Post-Deploy Validation
  run: ./scripts/post-deploy-validate.sh ${{ env.SERVICE_NAME }}
  continue-on-error: true
```

### Rollback on Validation Failure

```bash
#!/bin/bash
# scripts/deploy-with-validation.sh

set -e

# Pre-deploy validation
./scripts/pre-deploy-validate.sh || exit 1

# Deploy
svc deploy || {
  echo "❌ Deployment failed"
  exit 1
}

# Post-deploy validation
if ! ./scripts/post-deploy-validate.sh; then
  echo "❌ Post-deploy validation failed, rolling back..."
  svc rollback
  exit 1
fi

echo "✅ Deployment and validation successful!"
```

