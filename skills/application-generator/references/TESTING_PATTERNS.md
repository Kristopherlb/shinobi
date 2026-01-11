# Testing Patterns for Application Generation

## Test Types

### 1. Local Integration Tests

**Purpose**: Test component synthesis and CloudFormation template generation locally

**Location**: `tests/integration/local.test.ts`

**Pattern**:
```typescript
import { describe, it, expect } from 'vitest';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ComponentSpec, ComponentContext } from '@shinobi/core';
import { MyComponent } from '../src/my-component.component.js';

describe('Local Integration Tests', () => {
  it('Synthesis__MinimalConfig__CreatesRequiredResources', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    const context = createTestContext();
    const spec: ComponentSpec = {
      name: 'test-component',
      type: 'my-component',
      config: { /* minimal config */ }
    };
    
    const component = new MyComponent(stack, 'Test', context, spec);
    component.synth();
    
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::Lambda::Function', 1);
  });
});
```

**Test Metadata**: Must include `.meta.json` file following Platform Testing Standard

### 2. End-to-End Live Tests

**Purpose**: Test deployed infrastructure with real AWS services

**Location**: `tests/e2e/live.test.ts`

**Pattern**:
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

describe('E2E Live Tests', () => {
  let s3Client: S3Client;
  let lambdaClient: LambdaClient;
  let bucketName: string;
  let functionName: string;
  
  beforeAll(async () => {
    // Get deployed resource names from environment or SSM
    bucketName = process.env.TEST_BUCKET_NAME!;
    functionName = process.env.TEST_FUNCTION_NAME!;
    s3Client = new S3Client({ region: 'us-west-2' });
    lambdaClient = new LambdaClient({ region: 'us-west-2' });
  });
  
  it('API__UploadFile__StoresInS3', async () => {
    // Invoke Lambda function
    const response = await lambdaClient.send(new InvokeCommand({
      FunctionName: functionName,
      Payload: JSON.stringify({ action: 'upload', key: 'test.txt', body: 'test' })
    }));
    
    // Verify file in S3
    const s3Response = await s3Client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: 'test.txt'
    }));
    
    expect(s3Response.Body).toBeDefined();
  });
});
```

**Prerequisites**:
- Infrastructure must be deployed
- AWS credentials configured
- Resource names available via environment variables or SSM Parameter Store

### 3. Pre-Deploy Validation Tests

**Purpose**: Validate manifest and configuration before deployment

**Location**: `tests/validation/pre-deploy.test.ts`

**Pattern**:
```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import Ajv from 'ajv';

describe('Pre-Deploy Validation', () => {
  it('Manifest__ValidSchema__PassesValidation', () => {
    const manifest = parse(readFileSync('service.yml', 'utf-8'));
    const schema = JSON.parse(readFileSync('manifest.schema.json', 'utf-8'));
    
    const ajv = new Ajv();
    const validate = ajv.compile(schema);
    const valid = validate(manifest);
    
    expect(valid).toBe(true);
    expect(validate.errors).toBeNull();
  });
  
  it('Components__ValidConfigs__PassValidation', () => {
    const manifest = parse(readFileSync('service.yml', 'utf-8'));
    
    for (const component of manifest.components) {
      const configSchema = JSON.parse(
        readFileSync(`packages/components/${component.type}/Config.schema.json`, 'utf-8')
      );
      
      const ajv = new Ajv();
      const validate = ajv.compile(configSchema);
      const valid = validate(component.config || {});
      
      expect(valid).toBe(true);
    }
  });
  
  it('Bindings__ValidTargets__PassValidation', () => {
    const manifest = parse(readFileSync('service.yml', 'utf-8'));
    const componentNames = new Set(manifest.components.map(c => c.name));
    
    for (const component of manifest.components) {
      if (component.binds) {
        for (const binding of component.binds) {
          expect(componentNames.has(binding.to)).toBe(true);
        }
      }
    }
  });
});
```

### 4. Post-Deploy Validation Tests

**Purpose**: Validate deployed infrastructure connectivity and correctness

**Location**: `tests/validation/post-deploy.test.ts`

**Pattern**:
```typescript
import { describe, it, expect } from 'vitest';
import { CloudWatchLogsClient, DescribeLogGroupsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { LambdaClient, GetFunctionCommand } from '@aws-sdk/client-lambda';

describe('Post-Deploy Validation', () => {
  it('Resources__Deployed__ExistInAWS', async () => {
    // Verify S3 bucket exists
    const s3Client = new S3Client({ region: 'us-west-2' });
    await expect(
      s3Client.send(new HeadBucketCommand({ Bucket: 'test-bucket' }))
    ).resolves.toBeDefined();
    
    // Verify Lambda function exists
    const lambdaClient = new LambdaClient({ region: 'us-west-2' });
    await expect(
      lambdaClient.send(new GetFunctionCommand({ FunctionName: 'test-function' }))
    ).resolves.toBeDefined();
  });
  
  it('LogGroups__Created__ExistInCloudWatch', async () => {
    const logsClient = new CloudWatchLogsClient({ region: 'us-west-2' });
    const response = await logsClient.send(new DescribeLogGroupsCommand({
      logGroupNamePrefix: '/aws/lambda/test-function'
    }));
    
    expect(response.logGroups).toHaveLength(1);
  });
  
  it('Connectivity__APIEndpoint__Responds', async () => {
    const response = await fetch('https://api.example.com/health');
    expect(response.status).toBe(200);
  });
});
```

## Test Metadata Requirements

All test files must include a `.meta.json` file following Platform Testing Standard:

```json
{
  "id": "TP-APP-{feature}-{condition}-{number}",
  "level": "integration|e2e|validation",
  "capability": "Description of what is being tested",
  "oracle": "exact|contract|heuristic",
  "invariants": ["List of invariants"],
  "fixtures": ["List of fixtures"],
  "inputs": {
    "shape": "Description of input shape",
    "notes": "Additional notes"
  },
  "risks": ["List of risks"],
  "dependencies": ["List of dependencies"],
  "evidence": ["List of evidence"],
  "compliance_refs": ["List of compliance references"],
  "ai_generated": true,
  "human_reviewed_by": "platform-team"
}
```

## Test Organization

```
tests/
├── integration/
│   ├── local.test.ts
│   └── local.test.meta.json
├── e2e/
│   ├── live.test.ts
│   └── live.test.meta.json
└── validation/
    ├── pre-deploy.test.ts
    ├── pre-deploy.test.meta.json
    ├── post-deploy.test.ts
    └── post-deploy.test.meta.json
```

