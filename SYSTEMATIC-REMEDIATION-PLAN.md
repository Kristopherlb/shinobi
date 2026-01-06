# Systematic Remediation Plan - Component Audit Findings

**Plan Date:** 2025-01-22  
**Total Issues:** 170+ across 45 components  
**Estimated Total Effort:** 230-429 hours (6-7 weeks)  
**Status:** 📋 **READY FOR EXECUTION**

---

## Table of Contents

1. [Remediation Strategy](#remediation-strategy)
2. [Phase 1: P0 Critical Issues (Week 1)](#phase-1-p0-critical-issues-week-1)
3. [Phase 2: P1 High Priority (Weeks 2-3)](#phase-2-p1-high-priority-weeks-2-3)
4. [Phase 3: P2 Medium Priority (Weeks 4-6)](#phase-3-p2-medium-priority-weeks-4-6)
5. [Phase 4: P3 Low Priority (Backlog)](#phase-4-p3-low-priority-backlog)
6. [Validation & Testing Strategy](#validation--testing-strategy)
7. [Risk Management](#risk-management)
8. [Success Metrics](#success-metrics)

---

## Remediation Strategy

### Principles

1. **Fix Critical Security Issues First** - Address all P0 security vulnerabilities immediately
2. **Group Related Issues** - Batch similar fixes to maximize efficiency
3. **Validate After Each Phase** - Run tests and audits after each phase completion
4. **Minimize Disruption** - Use feature flags and backward-compatible changes where possible
5. **Document Everything** - Update audit reports and changelogs as fixes are applied

### Execution Approach

- **Parallel Workstreams:** Security fixes, structural fixes, and documentation can proceed in parallel
- **Component Batching:** Fix all issues for a component before moving to the next
- **Incremental Validation:** Test after each major change category
- **Continuous Integration:** All fixes must pass CI/CD pipeline

---

## Phase 1: P0 Critical Issues (Week 1)

**Goal:** Fix all critical security and structural issues before next release  
**Timeline:** 5 days (39-47 hours)  
**Success Criteria:** All P0 issues resolved, components compile and pass basic tests

---

### Day 1: BaseComponent Inheritance & SQS Queue (8 hours)

#### Task 1.1: Fix BaseComponent Inheritance (3 hours)

**Affected Components:** 6
- dynamodb-table
- secrets-manager
- application-load-balancer
- route53-hosted-zone
- opensearch-domain
- kinesis-stream

**Steps:**

1. **For each component, update the component file:**
   ```bash
   # Example: dynamodb-table
   cd packages/components/dynamodb-table/src
   ```

2. **Update imports:**
   ```typescript
   // Change from:
   import { Component, ComponentSpec, ComponentContext } from '@shinobi/core';
   
   // To:
   import { BaseComponent, ComponentSpec, ComponentContext } from '@shinobi/core';
   ```

3. **Update class declaration:**
   ```typescript
   // Change from:
   export class DynamoDbTableComponent extends Component {
   
   // To:
   export class DynamoDbTableComponent extends BaseComponent {
   ```

4. **Verify constructor signature matches BaseComponent:**
   ```typescript
   constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
     super(scope, id, context, spec);
   }
   ```

5. **Run compilation check:**
   ```bash
   pnpm --filter @shinobi/components-dynamodb-table build
   ```

6. **Run component tests:**
   ```bash
   pnpm --filter @shinobi/components-dynamodb-table test
   ```

**Validation:**
- ✅ All 6 components compile without errors
- ✅ All 6 components can access BaseComponent methods (registerConstruct, registerCapability, applyStandardTags)
- ✅ All existing tests pass

**Estimated Effort:** 30 minutes per component = 3 hours

---

#### Task 1.2: Implement SQS Queue Component (5 hours)

**File:** `packages/components/sqs-queue/sqs-queue.component.ts`

**Steps:**

1. **Fix constructor parameter order:**
   ```typescript
   // Change from:
   constructor(scope: Construct, spec: ComponentSpec, context: ComponentContext) {
     super(scope, spec, context);
   
   // To:
   constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
     super(scope, id, context, spec);
   ```

2. **Add proper imports:**
   ```typescript
   import * as sqs from 'aws-cdk-lib/aws-sqs';
   import * as kms from 'aws-cdk-lib/aws-kms';
   import { BaseComponent } from '@shinobi/core';
   ```

3. **Implement actual SQS queue creation:**
   ```typescript
   private createMainConstruct(): void {
     this.logComponentEvent('sqs_queue_creation_start', 'Creating SQS queue');
     
     const queueProps: sqs.QueueProps = {
       queueName: this.config.queueName,
       visibilityTimeout: cdk.Duration.seconds(this.config.visibilityTimeoutSeconds || 30),
       retentionPeriod: cdk.Duration.days(this.config.messageRetentionDays || 4),
       encryption: this.config.encryption?.enabled 
         ? sqs.QueueEncryption.KMS 
         : sqs.QueueEncryption.UNENCRYPTED,
       encryptionMasterKey: this.kmsKey,
       deadLetterQueue: this.createDeadLetterQueue(),
     };
     
     this.mainConstruct = new sqs.Queue(this, 'Queue', queueProps);
     this.applyStandardTags(this.mainConstruct);
     this.registerConstruct('main', this.mainConstruct);
     
     this.logComponentEvent('sqs_queue_creation_complete', 'SQS queue created successfully');
   }
   ```

4. **Implement dead letter queue (if configured):**
   ```typescript
   private createDeadLetterQueue(): sqs.DeadLetterQueue | undefined {
     if (!this.config.deadLetterQueue?.enabled) {
       return undefined;
     }
     
     const dlq = new sqs.Queue(this, 'DeadLetterQueue', {
       queueName: `${this.config.queueName}-dlq`,
       retentionPeriod: cdk.Duration.days(this.config.deadLetterQueue.retentionDays || 14),
     });
     
     this.applyStandardTags(dlq);
     this.registerConstruct('deadLetterQueue', dlq);
     
     return {
       maxReceiveCount: this.config.deadLetterQueue.maxReceiveCount || 3,
       queue: dlq,
     };
   }
   ```

5. **Implement capability registration:**
   ```typescript
   public getCapabilities(): ComponentCapabilities {
     this.validateSynthesized();
     return {
       'messaging:sqs': {
         queueUrl: this.mainConstruct.queueUrl,
         queueArn: this.mainConstruct.queueArn,
         queueName: this.config.queueName,
       },
     };
   }
   ```

6. **Remove all TODO comments and placeholder code**

7. **Create basic tests:**
   ```bash
   # Create tests/security/cdk-nag.test.ts
   # Create tests/sqs-queue.component.test.ts
   ```

**Validation:**
- ✅ Component compiles without errors
- ✅ SQS queue is actually created (verify in CDK synth output)
- ✅ Capabilities return proper data structure
- ✅ All tests pass

**Estimated Effort:** 5 hours

---

### Day 2: Security Issues - Secrets & Passwords (5 hours)

#### Task 2.1: Fix unsafePlainText Usage (3 hours)

**Affected Files:**
- `packages/components/secrets-manager/secrets-manager.component.ts:233-235`
- `packages/components/opensearch-domain/opensearch-domain.component.ts:308`

**Steps for Secrets Manager:**

1. **Review current usage:**
   ```typescript
   // Current (WRONG):
   secretProps.secretStringValue = secretsmanager.SecretValue.unsafePlainText(
     this.config.secretValue.secretStringValue
   );
   ```

2. **Replace with Secrets Manager reference:**
   ```typescript
   // If secret already exists in Secrets Manager:
   if (this.config.secretValue.secretArn) {
     secretProps.secretStringValue = secretsmanager.SecretValue.fromSecretArn(
       this,
       'SecretValue',
       this.config.secretValue.secretArn
     );
   }
   // If creating new secret, use generateSecretString:
   else if (this.config.secretValue.generateSecret) {
     secretProps.generateSecretString = {
       secretStringTemplate: this.config.secretValue.template,
       generateStringKey: this.config.secretValue.keyName,
       excludeCharacters: this.config.secretValue.excludeCharacters,
       includeSpace: false,
       passwordLength: this.config.secretValue.length || 32,
     };
   }
   // Only use unsafePlainText if explicitly required and documented:
   else if (this.config.secretValue.allowUnsafePlainText) {
     // SECURITY WARNING: This exposes secrets in CloudFormation templates
     // Only use for non-sensitive configuration values
     secretProps.secretStringValue = secretsmanager.SecretValue.unsafePlainText(
       this.config.secretValue.secretStringValue
     );
   }
   ```

3. **Add security warning comment:**
   ```typescript
   /**
    * SECURITY WARNING: Using unsafePlainText() exposes values in CloudFormation templates.
    * Only use for non-sensitive configuration. For secrets, use Secrets Manager references.
    */
   ```

**Steps for OpenSearch Domain:**

1. **Replace unsafePlainText with Secrets Manager:**
   ```typescript
   // Current (WRONG):
   ? cdk.SecretValue.unsafePlainText(this.config.advancedSecurity.masterUserPassword)
   
   // Replace with:
   masterUserPassword: this.config.advancedSecurity.masterUserPasswordSecretArn
     ? secretsmanager.Secret.fromSecretArn(
         this,
         'MasterUserPassword',
         this.config.advancedSecurity.masterUserPasswordSecretArn
       ).secretValue
     : undefined,
   ```

2. **Update config schema to require secretArn instead of plain password**

**Validation:**
- ✅ No unsafePlainText usage for sensitive values
- ✅ All secrets use Secrets Manager references
- ✅ Security warnings added where unsafePlainText is still used
- ✅ Components compile and deploy successfully

**Estimated Effort:** 3 hours

---

#### Task 2.2: Fix unsafeUnwrap Usage (2 hours)

**File:** `packages/components/elasticache-redis/src/elasticache-redis.component.ts:238, 258`

**Steps:**

1. **Review current usage:**
   ```typescript
   // Current (WRONG):
   this.authTokenValue = cdk.SecretValue.secretsManager(authToken.secretArn).unsafeUnwrap();
   ```

2. **Replace with direct secret reference:**
   ```typescript
   // Replace with:
   this.authTokenSecret = secretsmanager.Secret.fromSecretArn(
     this,
     'AuthToken',
     authToken.secretArn
   );
   
   // Use secret reference directly in ElastiCache configuration:
   authToken: this.authTokenSecret.secretValue,
   ```

3. **Update ElastiCache configuration to use SecretValue instead of string**

4. **Document why unwrap is avoided:**
   ```typescript
   /**
    * We avoid unsafeUnwrap() to prevent secrets from being exposed during CDK synthesis.
    * Instead, we pass SecretValue directly to ElastiCache, which resolves it at deployment time.
    */
   ```

**Validation:**
- ✅ No unsafeUnwrap() calls in component code
- ✅ Secrets passed as SecretValue references
- ✅ Component compiles and deploys successfully

**Estimated Effort:** 2 hours

---

### Day 3: Security Defaults & Network Access (6 hours)

#### Task 3.1: Fix CloudFront Security Defaults (2 hours)

**File:** `packages/components/cloudfront-distribution/`

**Steps:**

1. **Update viewer protocol policy default:**
   ```typescript
   // In cloudfront-distribution.builder.ts, getHardcodedFallbacks():
   protected getHardcodedFallbacks(): Partial<CloudFrontDistributionConfig> {
     return {
       viewerProtocolPolicy: 'redirect-to-https',  // Changed from 'allow-all'
       logging: {
         enabled: true,  // Changed from false
         bucket: undefined,  // Will be created if not provided
       },
       monitoring: {
         enabled: true,  // Changed from false
       },
     };
   }
   ```

2. **Update compliance framework defaults:**
   ```typescript
   protected getComplianceFrameworkDefaults(): Partial<CloudFrontDistributionConfig> {
     const framework = this.builderContext.context.complianceFramework;
     
     if (framework === 'fedramp-moderate' || framework === 'fedramp-high') {
       return {
         viewerProtocolPolicy: 'redirect-to-https',
         logging: { enabled: true },
         monitoring: { enabled: true },
         wafEnabled: true,
       };
     }
     
     return {
       viewerProtocolPolicy: 'redirect-to-https',
       logging: { enabled: true },
       monitoring: { enabled: true },
     };
   }
   ```

3. **Update component to create logging bucket if not provided:**
   ```typescript
   if (this.config.logging?.enabled && !this.config.logging.bucket) {
     // Create default logging bucket
     this.loggingBucket = new s3.Bucket(this, 'LoggingBucket', {
       bucketName: `${this.context.serviceName}-cloudfront-logs-${this.context.region}`,
       blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
     });
   }
   ```

**Validation:**
- ✅ Viewer protocol policy defaults to redirect-to-https
- ✅ Logging enabled by default
- ✅ Monitoring enabled by default
- ✅ All tests pass

**Estimated Effort:** 2 hours

---

#### Task 3.2: Fix Auto Scaling Group Network Rules (2 hours)

**File:** `packages/components/auto-scaling-group/`

**Steps:**

1. **Remove hardcoded security group rules:**
   ```typescript
   // Remove hardcoded rules like:
   // securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS');
   ```

2. **Make security group rules configurable:**
   ```typescript
   // In config interface:
   interface AutoScalingGroupConfig {
     security: {
       securityGroupRules?: Array<{
         description: string;
         fromPort: number;
         toPort: number;
         protocol: string;
         cidrBlocks?: string[];
         sourceSecurityGroupIds?: string[];
       }>;
     };
   }
   ```

3. **Update hardcoded fallbacks to be restrictive:**
   ```typescript
   protected getHardcodedFallbacks(): Partial<AutoScalingGroupConfig> {
     return {
       security: {
         allowAllOutbound: false,  // Changed from true
         securityGroupRules: [],  // Empty by default - must be explicitly configured
       },
     };
   }
   ```

4. **Apply security group rules from config:**
   ```typescript
   if (this.config.security?.securityGroupRules) {
     this.config.security.securityGroupRules.forEach((rule, index) => {
       const peer = rule.sourceSecurityGroupIds
         ? ec2.Peer.securityGroupId(rule.sourceSecurityGroupIds[0])
         : rule.cidrBlocks
         ? ec2.Peer.ipv4(rule.cidrBlocks[0])
         : ec2.Peer.ipv4('10.0.0.0/8');  // Default to VPC CIDR
       
       this.securityGroup.addIngressRule(
         peer,
         ec2.Port.tcp(rule.fromPort),
         rule.description
       );
     });
   }
   ```

**Validation:**
- ✅ No hardcoded 0.0.0.0/0 rules
- ✅ Security group rules configurable via config layers
- ✅ Default is restrictive (no inbound rules)
- ✅ All tests pass

**Estimated Effort:** 2 hours

---

#### Task 3.3: Fix ElastiCache Redis Network Access (2 hours)

**File:** `packages/components/elasticache-redis/`

**Steps:**

1. **Remove hardcoded security group configuration:**
   ```typescript
   // Remove hardcoded:
   // security: { securityGroupIds: [] }
   ```

2. **Make security groups configurable:**
   ```typescript
   // In builder, getHardcodedFallbacks():
   protected getHardcodedFallbacks(): Partial<ElastiCacheRedisConfig> {
     return {
       security: {
         // No default security groups - must be provided via config
         securityGroupIds: undefined,
       },
     };
   }
   ```

3. **Update component to use config-provided security groups:**
   ```typescript
   const securityGroups = this.config.security?.securityGroupIds
     ? this.config.security.securityGroupIds.map(id =>
         ec2.SecurityGroup.fromSecurityGroupId(this, `SG-${id}`, id)
       )
     : [];
   ```

4. **Fix secrets removal policy:**
   ```typescript
   // Set explicit removal policy for secrets
   if (this.authTokenSecret) {
     this.authTokenSecret.applyRemovalPolicy(
       this.context.complianceFramework === 'fedramp-high'
         ? cdk.RemovalPolicy.RETAIN
         : cdk.RemovalPolicy.DESTROY
     );
   }
   ```

**Validation:**
- ✅ No hardcoded security group arrays
- ✅ Security groups configurable via config layers
- ✅ Secrets have appropriate removal policy
- ✅ All tests pass

**Estimated Effort:** 2 hours

---

### Day 4: Configuration Violations (8 hours)

#### Task 4.1: Remove process.env Usage (6 hours)

**Affected Files:**
- `packages/components/openfeature-provider/openfeature-provider.component.ts:208`
- `packages/components/deployment-bundle-pipeline/src/deployment-bundle-pipeline.builder.ts:130-142`
- `packages/components/container-application/src/container-application.builder.ts:116`
- Test files (acceptable, but document)

**Steps:**

1. **For each component file (not test files):**

   **openfeature-provider:**
   ```typescript
   // Current (WRONG):
   const apiKey = process.env.OPENFEATURE_API_KEY;
   
   // Replace with:
   // Add to config interface:
   interface OpenFeatureProviderConfig {
     apiKey?: string;  // Or use secretArn for sensitive values
   }
   
   // In builder, get from config:
   const apiKey = this.config.apiKey 
     ? secretsmanager.Secret.fromSecretNameV2(this, 'ApiKey', this.config.apiKey).secretValue
     : undefined;
   ```

   **deployment-bundle-pipeline:**
   ```typescript
   // Remove all process.env usage
   // Add to config interface:
   interface DeploymentBundlePipelineConfig {
     environment?: {
       [key: string]: string;
     };
   }
   
   // Use config.environment instead of process.env
   ```

   **container-application:**
   ```typescript
   // Remove process.env usage
   // Use config.application.environment instead
   ```

2. **Update config schemas to include environment variables**

3. **Update documentation to show how to set via config layers**

**Validation:**
- ✅ No process.env usage in component code (only in test files)
- ✅ All environment variables configurable via config layers
- ✅ Components compile and work correctly
- ✅ Test files can still use process.env for test setup

**Estimated Effort:** 6 hours

---

#### Task 4.2: Fix Hardcoded NODE_ENV (2 hours)

**File:** `packages/components/container-application/src/container-application.builder.ts:116`

**Steps:**

1. **Remove hardcoded NODE_ENV:**
   ```typescript
   // Current (WRONG):
   const DEFAULT_CONFIG: ContainerApplicationConfig = {
     application: {
       environment: {
         NODE_ENV: 'production'  // Remove this
       },
     },
   };
   
   // Replace with:
   protected getHardcodedFallbacks(): Partial<ContainerApplicationConfig> {
     return {
       application: {
         environment: {},  // Empty - let config layers set it
       },
     };
   }
   ```

2. **Add NODE_ENV to environment defaults (if needed):**
   ```yaml
   # config/commercial.yml
   defaults:
     container-application:
       application:
         environment:
           NODE_ENV: "development"
   
   # config/fedramp-moderate.yml
   defaults:
     container-application:
       application:
         environment:
           NODE_ENV: "production"
   ```

**Validation:**
- ✅ No hardcoded NODE_ENV in component code
- ✅ NODE_ENV set via configuration layers
- ✅ Component works in all environments

**Estimated Effort:** 2 hours

---

### Day 5: Logging & Compliance Methods (8 hours)

#### Task 5.1: Fix Console.log Violations (2 hours)

**Affected Files:**
- `packages/components/lambda-api/src/lambda-api.component.ts:314`
- `packages/components/sagemaker-notebook-instance/sagemaker-notebook-instance.component.ts:141`
- `packages/components/_lib/observability.ts:29`

**Steps:**

1. **Lambda API - Replace console.log in inline code:**
   ```typescript
   // Current (WRONG):
   return lambda.Code.fromInline(`
     exports.handler = async (event) => {
       console.log('Inbound request', JSON.stringify(event));
     };
   `);
   
   // Replace with:
   return lambda.Code.fromInline(`
     const logger = require('@shinobi/core/logger');
     exports.handler = async (event) => {
       logger.info('Inbound request', {
         traceId: event.requestContext?.requestId,
         httpMethod: event.httpMethod,
         path: event.path,
         body: event.body
       });
     };
   `);
   ```

2. **SageMaker Notebook - Replace console.warn:**
   ```typescript
   // Current (WRONG):
   if (!this.config!.vpcId) {
     console.warn('VPC ID not provided, skipping security group creation');
     return;
   }
   
   // Replace with:
   if (!this.config!.vpcId) {
     this.logComponentEvent('security_group_skipped', 'VPC ID not provided, skipping security group creation', {
       component: this.spec.name,
       reason: 'vpc_id_missing'
     });
     return;
   }
   ```

3. **Observability lib - Replace console.log:**
   ```typescript
   // Use platform logger instead
   import { getLogger } from '@shinobi/core/logger';
   const logger = getLogger('observability');
   logger.info('message', { data });
   ```

**Validation:**
- ✅ No console.log/error/warn in component code
- ✅ All logging uses structured logging
- ✅ Test files can still use console.log

**Estimated Effort:** 2 hours

---

#### Task 5.2: Add getComplianceFrameworkDefaults() (6 hours)

**Affected Files:**
- `packages/components/rds-postgres/src/rds-postgres.builder.ts`
- `packages/components/secrets-manager/secrets-manager.builder.ts`
- `packages/components/dynamodb-table/src/dynamodb-table.builder.ts`
- `packages/components/api-gateway-http/src/api-gateway-http.builder.ts`

**Steps for each component:**

1. **Add method to builder class:**
   ```typescript
   protected getComplianceFrameworkDefaults(): Partial<MyComponentConfig> {
     const framework = this.builderContext.context.complianceFramework;
     
     const baseCompliance: Partial<MyComponentConfig> = {
       // Common compliance defaults
     };
     
     if (framework === 'fedramp-moderate') {
       return {
         ...baseCompliance,
         encryption: { enabled: true, customerManagedKey: true },
         logRetentionDays: 1095,
         // FedRAMP Moderate specific
       };
     }
     
     if (framework === 'fedramp-high') {
       return {
         ...baseCompliance,
         encryption: { enabled: true, customerManagedKey: true, keyRotation: true },
         logRetentionDays: 2555,
         // FedRAMP High specific
       };
     }
     
     return baseCompliance;
   }
   ```

2. **Move framework-specific logic from getHardcodedFallbacks() to this method**

3. **Test with each compliance framework**

**Validation:**
- ✅ All 4 components have getComplianceFrameworkDefaults()
- ✅ Framework-specific defaults applied correctly
- ✅ Tests pass for all compliance frameworks

**Estimated Effort:** 1.5 hours per component = 6 hours

---

### Phase 1 Validation

**After completing all Day 1-5 tasks:**

1. **Run full test suite:**
   ```bash
   pnpm test
   ```

2. **Run CDK synthesis:**
   ```bash
   pnpm build
   cd apps/hello-world-api
   pnpm svc synth
   ```

3. **Run security audit:**
   ```bash
   pnpm svc audit
   ```

4. **Verify no P0 issues remain:**
   - Check CONSOLIDATED-AUDIT-FINDINGS.md
   - All P0 items should be marked as resolved

**Success Criteria:**
- ✅ All 28 P0 issues resolved
- ✅ All components compile
- ✅ All tests pass
- ✅ No security vulnerabilities
- ✅ Ready for Phase 2

---

## Phase 2: P1 High Priority (Weeks 2-3)

**Goal:** Fix all high-priority issues this sprint  
**Timeline:** 2-3 weeks (123-260 hours)  
**Success Criteria:** All P1 issues resolved, components fully compliant

---

### Week 2: Schema Files & Security Tests (64-126 hours)

#### Task 2.1: Create Config.schema.json Files (32-64 hours)

**Affected Components:** 16
- kinesis-stream
- lambda-worker
- openfeature-provider
- opensearch-domain
- route53-hosted-zone
- route53-record
- sagemaker-notebook-instance
- secrets-manager
- security-group-import
- sns-topic
- sqs-queue
- ssm-parameter
- static-website
- step-functions-statemachine
- vpc
- waf-web-acl

**Steps for each component:**

1. **Read existing TypeScript config interface:**
   ```bash
   # Example: kinesis-stream
   cat packages/components/kinesis-stream/src/kinesis-stream.builder.ts
   ```

2. **Create Config.schema.json:**
   ```json
   {
     "$schema": "http://json-schema.org/draft-07/schema#",
     "$id": "https://platform.shinobi.internal/schemas/kinesis-stream/v1.0.0",
     "title": "Kinesis Stream Component Configuration",
     "description": "Configuration schema for AWS Kinesis Stream component",
     "type": "object",
     "additionalProperties": false,
     "required": ["streamName"],
     "properties": {
       "streamName": {
         "type": "string",
         "description": "Name of the Kinesis stream",
         "minLength": 1,
         "maxLength": 128
       },
       "shardCount": {
         "type": "integer",
         "description": "Number of shards for the stream",
         "minimum": 1,
         "maximum": 1000,
         "default": 1
       }
     }
   }
   ```

3. **Export schema from builder:**
   ```typescript
   import schema from '../Config.schema.json';
   export const KINESIS_STREAM_CONFIG_SCHEMA = schema;
   ```

4. **Update creator to reference schema:**
   ```typescript
   public readonly configSchema = KINESIS_STREAM_CONFIG_SCHEMA;
   ```

5. **Validate schema matches TypeScript interface:**
   ```bash
   # Use ajv or similar to validate
   pnpm validate-schema packages/components/kinesis-stream/Config.schema.json
   ```

**Validation:**
- ✅ All 16 components have Config.schema.json
- ✅ Schemas match TypeScript interfaces
- ✅ Schemas are JSON Schema Draft-07 compliant
- ✅ Creators reference schemas correctly

**Estimated Effort:** 2-4 hours per component = 32-64 hours

---

#### Task 2.2: Create CDK-Nag Security Tests (31-62 hours)

**Affected Components:** 31 (see consolidated report for full list)

**Steps for each component:**

1. **Create test file:**
   ```bash
   mkdir -p packages/components/{component-name}/tests/security
   touch packages/components/{component-name}/tests/security/cdk-nag.test.ts
   ```

2. **Write test template:**
   ```typescript
   import { describe, it, expect, beforeEach } from 'vitest';
   import { App, Stack } from 'aws-cdk-lib';
   import { Aspects, Annotations, Match } from 'aws-cdk-lib';
   import { AwsSolutionsChecks } from 'cdk-nag';
   import { YourComponent } from '../src/your-component.component';
   import { createTestContext, createTestSpec } from '../../test-fixtures';
   
   describe('YourComponent - CDK Nag Security Validation', () => {
     let app: App;
     let stack: Stack;
   
     beforeEach(() => {
       app = new App();
       stack = new Stack(app, 'TestStack', {
         env: { account: '123456789012', region: 'us-east-1' }
       });
       Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));
     });
   
     it('passes AwsSolutions security checks for commercial framework', () => {
       const context = createTestContext({ complianceFramework: 'commercial' });
       const spec = createTestSpec({ /* minimal config */ });
       const component = new YourComponent(stack, 'TestComponent', context, spec);
       component.synth();
       app.synth();
   
       const errors = Annotations.fromStack(stack).findError(
         '*',
         Match.stringLikeRegexp('AwsSolutions-.*')
       );
   
       expect(errors).toHaveLength(0);
     });
   
     it('passes AwsSolutions security checks for FedRAMP Moderate', () => {
       const context = createTestContext({ complianceFramework: 'fedramp-moderate' });
       const spec = createTestSpec({ /* config */ });
       const component = new YourComponent(stack, 'TestComponent', context, spec);
       component.synth();
       app.synth();
   
       const errors = Annotations.fromStack(stack).findError(
         '*',
         Match.stringLikeRegexp('AwsSolutions-.*')
       );
   
       expect(errors).toHaveLength(0);
     });
   });
   ```

3. **Add justified suppressions if needed:**
   ```typescript
   import { NagSuppressions } from 'cdk-nag';
   
   NagSuppressions.addStackSuppressions(stack, [
     {
       id: 'AwsSolutions-IAM5',
       reason: 'Wildcard required for CloudWatch Logs delivery'
     }
   ]);
   ```

4. **Run tests:**
   ```bash
   pnpm --filter @shinobi/components-{component-name} test tests/security/cdk-nag.test.ts
   ```

**Validation:**
- ✅ All 31 components have CDK-Nag tests
- ✅ Tests pass for all compliance frameworks
- ✅ Suppressions are justified and documented

**Estimated Effort:** 1-2 hours per component = 31-62 hours

---

### Week 3: Features, OSCAL, Logging, Observability (59-134 hours)

#### Task 2.3: Implement or Remove Incomplete Features (6-10 hours)

**Affected Components:**
- S3 Bucket (ClamAV)
- API Gateway HTTP (API key enforcement)

**Steps for S3 Bucket ClamAV:**

1. **Option 1: Remove from schema (recommended):**
   ```typescript
   // Remove clamavScan from config interface
   // Remove from Config.schema.json
   // Update documentation
   ```

2. **Option 2: Implement ClamAV integration:**
   ```typescript
   // Integrate with dedicated virus scanning component
   // Add binding support
   // Update documentation
   ```

3. **Option 3: Add clear documentation:**
   ```markdown
   ## ClamAV Scanning
   
   ClamAV scanning requires the dedicated `clamav-scanner` component.
   This option is a placeholder for future integration.
   ```

**Steps for API Gateway API Key Enforcement:**

1. **Implement usage plan provisioning:**
   ```typescript
   if (this.config.apiKey?.enforce) {
     const apiKey = new apigateway.ApiKey(this, 'ApiKey', {
       apiKeyName: `${this.context.serviceName}-${this.spec.name}-api-key`,
     });
     
     const usagePlan = new apigateway.UsagePlan(this, 'UsagePlan', {
       name: `${this.context.serviceName}-${this.spec.name}-usage-plan`,
       apiStages: [{
         api: this.api,
         stage: this.api.deploymentStage,
       }],
       throttle: {
         rateLimit: this.config.apiKey.rateLimit || 100,
         burstLimit: this.config.apiKey.burstLimit || 200,
       },
     });
     
     usagePlan.addApiKey(apiKey);
   }
   ```

2. **Or remove configuration option until implemented**

**Validation:**
- ✅ ClamAV either implemented or clearly documented as requiring separate component
- ✅ API key enforcement either implemented or removed from config

**Estimated Effort:** 6-10 hours

---

#### Task 2.4: Update OSCAL Files (16-32 hours)

**Affected Components:** 4
- deployment-bundle-pipeline
- ecs-cluster
- lambda-api
- dagger-engine-pool

**Steps for each component:**

1. **Read current OSCAL file:**
   ```bash
   cat packages/components/{component}/audit/{component}.oscal.json
   ```

2. **Update control statuses:**
   ```json
   {
     "controlId": "AC-2",
     "status": "implemented",  // Changed from "planned"
     "implementationStatement": "Component implements access control through IAM roles and policies. All resources are tagged with compliance-framework tag for access control tracking.",
     "evidence": [
       "packages/components/{component}/src/{component}.component.ts:123-145",
       "packages/components/{component}/tests/security/cdk-nag.test.ts"
     ]
   }
   ```

3. **Update overall status:**
   ```json
   {
     "overallStatus": "implemented",  // Changed from "planned"
     "lastUpdated": "2025-01-22",
     "complianceScore": 85
   }
   ```

4. **Add evidence references for each control**

**Validation:**
- ✅ All 4 components have updated OSCAL files
- ✅ Controls marked as "implemented" with evidence
- ✅ Overall status reflects actual implementation

**Estimated Effort:** 4-8 hours per component = 16-32 hours

---

#### Task 2.5: Add Structured Logging to synth() Methods (6-12 hours)

**Affected Components:** Multiple (see consolidated report)

**Steps for each component:**

1. **Wrap synth() in try-catch:**
   ```typescript
   public synth(): void {
     this.logComponentEvent('synthesis_start', 'Starting component synthesis', {
       component: {
         name: this.spec.name,
         type: this.getType()
       }
     });
     
     try {
       // Existing synthesis logic
       
       this.logComponentEvent('synthesis_complete', 'Component synthesis completed successfully');
     } catch (error) {
       this.logError(error as Error, 'Component synthesis');
       throw error;
     }
   }
   ```

2. **Add lifecycle logging at key points**

**Validation:**
- ✅ All components have try-catch in synth()
- ✅ All components log synthesis_start and synthesis_complete
- ✅ Errors are properly logged

**Estimated Effort:** 15-30 minutes per component = 6-12 hours

---

#### Task 2.6: Add OpenTelemetry/X-Ray Integration (30-60 hours)

**Affected Components:** 10+ (cloudfront-distribution, auto-scaling-group, application-load-balancer, etc.)

**Steps for each component:**

1. **Add OTEL environment variables:**
   ```typescript
   private configureObservability(): void {
     const otelEnv = this.configureObservability(this.mainResource, {
       serviceName: `${this.context.serviceName}-${this.spec.name}`,
       customAttributes: {
         'component.type': this.getType(),
         'aws.region': this.context.region,
       }
     });
     
     // Inject into compute resources
     Object.entries(otelEnv).forEach(([key, value]) => {
       this.container?.addEnvironment(key, value);
       // or this.lambdaFunction?.addEnvironment(key, value);
     });
   }
   ```

2. **Add X-Ray tracing:**
   ```typescript
   // For Lambda:
   this.lambdaFunction.addEnvironment('_X_AMZN_TRACE_ID', 'true');
   
   // For ECS:
   this.taskDefinition.addXRayTracing();
   ```

3. **Add ADOT sidecar (for ECS):**
   ```typescript
   const adotSidecar = this.taskDefinition.addContainer('adot-collector', {
     image: ecs.ContainerImage.fromRegistry('public.ecr.aws/aws-observability/aws-otel-collector:latest'),
     memoryReservationMiB: 256,
     environment: {
       OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4317',
     },
   });
   ```

**Validation:**
- ✅ All components have OTEL environment variables
- ✅ X-Ray tracing enabled where applicable
- ✅ ADOT sidecar added for ECS components

**Estimated Effort:** 3-6 hours per component = 30-60 hours

---

#### Task 2.7: Create CloudWatch Dashboards (10-20 hours)

**Affected Components:** 8+ (auto-scaling-group, application-load-balancer, etc.)

**Steps for each component:**

1. **Create dashboard from observability config:**
   ```typescript
   private createDashboard(): void {
     const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
       dashboardName: `${this.context.serviceName}-${this.spec.name}-dashboard`,
     });
     
     // Add widgets from observability config
     dashboard.addWidgets(
       new cloudwatch.GraphWidget({
         title: 'CPU Utilization',
         left: [this.mainResource.metricCpuUtilization()],
       }),
       // ... more widgets
     );
   }
   ```

2. **Or generate from observability/alarms-config.json**

**Validation:**
- ✅ All components have CloudWatch dashboards
- ✅ Dashboards include key metrics
- ✅ Dashboards are framework-appropriate

**Estimated Effort:** 1-2 hours per component = 10-20 hours

---

#### Task 2.8: Create Missing package.json Files (2-4 hours)

**Affected Components:** 5+
- cloudfront-distribution
- auto-scaling-group
- eventbridge-rule-pattern
- eventbridge-rule-cron

**Steps for each component:**

1. **Create package.json:**
   ```json
   {
     "name": "@shinobi/components-cloudfront-distribution",
     "version": "1.0.0",
     "description": "CloudFront Distribution component for Shinobi platform",
     "main": "index.ts",
     "keywords": ["shinobi", "cloudfront", "cdn", "aws"],
     "author": "Shinobi Platform Team",
     "license": "MIT",
     "dependencies": {
       "aws-cdk-lib": "^2.100.0",
       "constructs": "^10.0.0",
       "@shinobi/core": "workspace:*"
     },
     "devDependencies": {
       "vitest": "^1.0.0",
       "cdk-nag": "^2.27.0"
     }
   }
   ```

2. **Update catalog-info.yaml with version**

**Validation:**
- ✅ All components have package.json
- ✅ Semantic versioning applied
- ✅ Metadata complete

**Estimated Effort:** 30 minutes per component = 2-4 hours

---

#### Task 2.9: Fix Glue Job Schema Type Precision (1-2 hours)

**File:** `packages/components/glue-job/Config.schema.json`

**Steps:**

1. **Update numeric fields to integer:**
   ```json
   {
     "numberOfWorkers": {
       "type": "integer",  // Changed from "number"
       "description": "Number of workers",
       "minimum": 1,
       "maximum": 100
     },
     "maxRetries": {
       "type": "integer",  // Changed from "number"
       "description": "Maximum retry attempts",
       "minimum": 0,
       "maximum": 10
     }
   }
   ```

2. **Add conditional validation:**
   ```json
   {
     "if": {
       "properties": {
         "security": {
           "properties": {
             "encryption": {
               "properties": {
                 "enabled": { "const": true }
               }
             }
           }
         }
       }
     },
     "then": {
       "required": ["security.encryption.kmsKeyId"]
     }
   }
   ```

**Validation:**
- ✅ All count-based fields are integers
- ✅ Conditional validation added
- ✅ Schema validates correctly

**Estimated Effort:** 1-2 hours

---

### Phase 2 Validation

**After completing all Week 2-3 tasks:**

1. **Run full test suite:**
   ```bash
   pnpm test
   ```

2. **Run CDK synthesis for all components:**
   ```bash
   pnpm build
   ```

3. **Run security audit:**
   ```bash
   pnpm svc audit
   ```

4. **Verify no P1 issues remain**

**Success Criteria:**
- ✅ All 62 P1 issues resolved
- ✅ All components have Config.schema.json
- ✅ All components have CDK-Nag tests
- ✅ Observability integrated
- ✅ Ready for Phase 3

---

## Phase 3: P2 Medium Priority (Weeks 4-6)

**Goal:** Fix medium-priority issues next sprint  
**Timeline:** 2-3 weeks (58-107 hours)  
**Success Criteria:** All P2 issues resolved, code quality improved

---

### Week 4-5: Type Safety & Code Quality (50-95 hours)

#### Task 3.1: Replace `any` Types (40-80 hours)

**Affected Files:** 100+ instances across components

**Steps:**

1. **Identify all `any` types:**
   ```bash
   grep -r ": any" packages/components/ --include="*.ts" | wc -l
   ```

2. **For each instance, replace with proper type:**

   **Logger:**
   ```typescript
   // Current:
   private logger: any;
   
   // Replace with:
   import { ILogger } from '@shinobi/core/logger';
   private logger: ILogger;
   ```

   **Capability builders:**
   ```typescript
   // Current:
   buildVpcCapability(): any
   
   // Replace with:
   interface VpcCapability {
     vpcId: string;
     cidr: string;
     subnets: Array<{ subnetId: string; availabilityZone: string }>;
   }
   buildVpcCapability(): VpcCapability
   ```

   **Builder methods:**
   ```typescript
   // Current:
   build(component: any): any
   
   // Replace with:
   build<T extends ComponentConfig>(component: ComponentSpec<T>): T
   ```

3. **Create shared type definitions:**
   ```typescript
   // packages/core/src/platform/types/capabilities.ts
   export interface ComponentCapability {
     [key: string]: unknown;
   }
   
   export interface VpcCapability extends ComponentCapability {
     vpcId: string;
     cidr: string;
   }
   ```

**Validation:**
- ✅ No `any` types in component code
- ✅ All types properly defined
- ✅ TypeScript strict mode enabled
- ✅ All components compile

**Estimated Effort:** 2-4 hours per component = 40-80 hours

---

#### Task 3.2: Fix TODOs and Placeholders (10-15 hours)

**Affected Files:**
- VPC creator (production validation TODO)
- SQS Queue builder (hardcoded fallbacks TODO)
- Route53 Record (platform service placeholder)
- Route53 Record (CloudWatch alarm placeholder)

**Steps:**

1. **VPC Production Validation:**
   ```typescript
   // Implement production-specific validations
   if (context.complianceFramework === 'fedramp-moderate' || 
       context.complianceFramework === 'fedramp-high') {
     if (!config?.monitoring?.enabled) {
       errors.push('Monitoring must be enabled for FedRAMP compliance frameworks');
     }
     if (!config?.logging?.enabled) {
       errors.push('Logging must be enabled for FedRAMP compliance frameworks');
     }
   }
   ```

2. **SQS Queue Hardcoded Fallbacks:**
   ```typescript
   protected getHardcodedFallbacks(): Partial<SqsQueueConfig> {
     return {
       visibilityTimeoutSeconds: 30,
       messageRetentionDays: 4,
       receiveMessageWaitTimeSeconds: 0,
       encryption: {
         enabled: false,  // Safe default - enable via config layers
       },
     };
   }
   ```

3. **Route53 Platform Services:**
   - Remove placeholder method OR implement actual integration

4. **Route53 CloudWatch Alarms:**
   - Implement alarms OR remove placeholder

**Validation:**
- ✅ All TODOs either implemented or removed
- ✅ All placeholders either implemented or removed
- ✅ Code is complete

**Estimated Effort:** 10-15 hours

---

### Week 6: Documentation & Tooling (8-12 hours)

#### Task 3.3: Fix Audit Script Bug (2-4 hours)

**File:** `packages/components/.audit-script.ts:507`

**Steps:**

1. **Replace broken regex with AST parser:**
   ```typescript
   import { Project, SyntaxKind } from 'ts-morph';
   
   function hasTryCatchInSynth(filePath: string): boolean {
     const project = new Project();
     const sourceFile = project.addSourceFileAtPath(filePath);
     
     const synthMethod = sourceFile
       .getClasses()[0]
       ?.getMethod('synth');
     
     if (!synthMethod) return false;
     
     const body = synthMethod.getBody();
     if (!body) return false;
     
     // Check for try statement
     const tryStatements = body.getDescendantsOfKind(SyntaxKind.TryStatement);
     return tryStatements.length > 0;
   }
   ```

2. **Update audit script to use AST parser**

3. **Test with components that have/don't have try-catch**

**Validation:**
- ✅ Audit script correctly detects try-catch
- ✅ No false positives/negatives
- ✅ Works with nested braces

**Estimated Effort:** 2-4 hours

---

#### Task 3.4: Standardize Directory Naming (15 minutes)

**Affected Components:** 2
- application-load-balancer (`audit/` → `Audit/`)
- dynamodb-table (`audit/` → `Audit/`)

**Steps:**

1. **Rename directories:**
   ```bash
   mv packages/components/application-load-balancer/audit packages/components/application-load-balancer/Audit
   mv packages/components/dynamodb-table/audit packages/components/dynamodb-table/Audit
   ```

2. **Update all references:**
   ```bash
   # Find references
   grep -r "audit/" packages/components/application-load-balancer/
   grep -r "audit/" packages/components/dynamodb-table/
   
   # Update references
   ```

**Validation:**
- ✅ All directories use `Audit/` capitalization
- ✅ All references updated
- ✅ No broken links

**Estimated Effort:** 15 minutes

---

#### Task 3.5: Fix Misleading Documentation (4-8 hours)

**Affected Files:**
- eventbridge-rule-cron/observability/README.md
- elasticache-redis/observability/metrics.md
- s3-bucket/S3_BUCKET_AWS_LABS_AUDIT.md
- SQS Queue README (10 TODOs)

**Steps:**

1. **Remove or implement placeholder sections:**
   ```markdown
   <!-- Remove "To Be Created" sections OR implement them -->
   ```

2. **Create GitHub issues for unimplemented features:**
   ```markdown
   ## Planned Features
   
   The following features are planned but not yet implemented:
   - [ ] Custom dashboard (Issue #123)
   - [ ] Additional metrics (Issue #124)
   ```

3. **Update SQS Queue README:**
   - Complete all 10 TODO sections
   - Add usage examples
   - Add configuration details

**Validation:**
- ✅ No misleading "to be created" sections
- ✅ All TODOs in documentation resolved
- ✅ Unimplemented features tracked in issues

**Estimated Effort:** 4-8 hours

---

#### Task 3.6: Fix Misleading Status in Audit Reports (1 hour)

**Affected Files:** Multiple audit report files

**Steps:**

1. **Update all status fields:**
   ```markdown
   **Status:** ✅ **COMPLETE**  # Changed from "in progress"
   ```

2. **Fix contradictory counts:**
   ```markdown
   **Total Issues:** 170+  # Consistent across all files
   ```

3. **Remove "will be added" placeholders**

4. **Standardize status reporting**

**Validation:**
- ✅ All audit reports show "COMPLETE" status
- ✅ Status counts are consistent
- ✅ No placeholders remain

**Estimated Effort:** 1 hour

---

### Phase 3 Validation

**After completing all Week 4-6 tasks:**

1. **Run TypeScript strict mode:**
   ```bash
   pnpm typecheck --strict
   ```

2. **Run full test suite:**
   ```bash
   pnpm test
   ```

3. **Run code quality checks:**
   ```bash
   pnpm lint
   ```

**Success Criteria:**
- ✅ All 35 P2 issues resolved
- ✅ No `any` types remaining
- ✅ All TODOs resolved
- ✅ Documentation accurate
- ✅ Ready for Phase 4

---

## Phase 4: P3 Low Priority (Backlog)

**Goal:** Address low-priority issues as time permits  
**Timeline:** Ongoing (10-15 hours)  
**Success Criteria:** Code quality improvements, better developer experience

---

### Task 4.1: Type Definitions for Capability Builders (4-8 hours)

**Steps:**

1. **Create shared capability interfaces:**
   ```typescript
   // packages/core/src/platform/types/capabilities.ts
   export interface VpcCapability {
     vpcId: string;
     cidr: string;
     subnets: Array<{ subnetId: string; availabilityZone: string }>;
   }
   
   export interface DatabaseCapability {
     endpoint: string;
     port: number;
     databaseName: string;
   }
   
   // ... more interfaces
   ```

2. **Update all capability builder methods to use interfaces**

**Estimated Effort:** 4-8 hours

---

### Task 4.2: Test File Improvements (2-4 hours)

**Steps:**

1. **Consider structured logging in test files (optional)**
2. **Document that console.log is acceptable for test output**
3. **Improve test output formatting**

**Estimated Effort:** 2-4 hours

---

### Task 4.3: Documentation Enhancements (4-8 hours)

**Steps:**

1. **Document SageMaker limitation:**
   ```typescript
   /**
    * LIMITATION: [Describe specific limitation]
    * This is tracked in Issue #XXX and will be addressed in vX.Y.Z
    */
   ```

2. **Create tickets for future enhancements**
3. **Update component READMEs with examples**

**Estimated Effort:** 4-8 hours

---

## Validation & Testing Strategy

### After Each Phase

1. **Compilation Check:**
   ```bash
   pnpm build
   ```

2. **Test Suite:**
   ```bash
   pnpm test
   ```

3. **Type Checking:**
   ```bash
   pnpm typecheck
   ```

4. **Security Audit:**
   ```bash
   pnpm svc audit
   ```

5. **CDK Synthesis:**
   ```bash
   cd apps/hello-world-api
   pnpm svc synth
   ```

### Continuous Validation

- **Pre-commit hooks:** Run linting and type checking
- **CI/CD pipeline:** Run full test suite on every PR
- **Weekly audits:** Run security audits weekly
- **Monthly reviews:** Review audit findings monthly

---

## Risk Management

### Risks & Mitigations

1. **Risk: Breaking changes during remediation**
   - **Mitigation:** Use feature flags, maintain backward compatibility, extensive testing

2. **Risk: Time overruns**
   - **Mitigation:** Prioritize P0 issues first, batch similar fixes, parallel workstreams

3. **Risk: Introducing new bugs**
   - **Mitigation:** Comprehensive testing, code reviews, incremental changes

4. **Risk: Missing dependencies**
   - **Mitigation:** Document dependencies, validate after each phase

---

## Success Metrics

### Phase 1 (P0)
- ✅ 0 P0 issues remaining
- ✅ All components compile
- ✅ All security vulnerabilities fixed
- ✅ 100% test pass rate

### Phase 2 (P1)
- ✅ 0 P1 issues remaining
- ✅ All components have Config.schema.json
- ✅ All components have CDK-Nag tests
- ✅ Observability integrated

### Phase 3 (P2)
- ✅ 0 P2 issues remaining
- ✅ 0 `any` types in component code
- ✅ All TODOs resolved
- ✅ Documentation accurate

### Phase 4 (P3)
- ✅ Code quality improvements
- ✅ Better developer experience
- ✅ Enhanced documentation

### Overall
- ✅ 170+ issues resolved
- ✅ 100% component compliance
- ✅ Production-ready platform
- ✅ Maintainable codebase

---

## Execution Checklist

### Phase 1 Checklist
- [ ] Day 1: BaseComponent inheritance fixed (6 components)
- [ ] Day 1: SQS Queue component implemented
- [ ] Day 2: unsafePlainText fixed (2 components)
- [ ] Day 2: unsafeUnwrap fixed (1 component)
- [ ] Day 3: CloudFront security defaults fixed
- [ ] Day 3: Auto Scaling Group network rules fixed
- [ ] Day 3: ElastiCache Redis network access fixed
- [ ] Day 4: process.env usage removed (6 files)
- [ ] Day 4: Hardcoded NODE_ENV fixed
- [ ] Day 5: console.log violations fixed (3 files)
- [ ] Day 5: getComplianceFrameworkDefaults() added (4 components)
- [ ] Phase 1 validation complete

### Phase 2 Checklist
- [ ] Week 2: Config.schema.json created (16 components)
- [ ] Week 2-3: CDK-Nag tests created (31 components)
- [ ] Week 3: Incomplete features resolved (2 components)
- [ ] Week 3: OSCAL files updated (4 components)
- [ ] Week 3: Structured logging added (multiple components)
- [ ] Week 3: OpenTelemetry/X-Ray integrated (10+ components)
- [ ] Week 3: CloudWatch dashboards created (8+ components)
- [ ] Week 3: package.json created (5+ components)
- [ ] Week 3: Glue Job schema fixed
- [ ] Phase 2 validation complete

### Phase 3 Checklist
- [ ] Week 4-5: `any` types replaced (100+ instances)
- [ ] Week 5: TODOs and placeholders resolved (4 components)
- [ ] Week 6: Audit script bug fixed
- [ ] Week 6: Directory naming standardized (2 components)
- [ ] Week 6: Misleading documentation fixed (4 files)
- [ ] Week 6: Audit report status fixed
- [ ] Phase 3 validation complete

### Phase 4 Checklist
- [ ] Capability builder types defined
- [ ] Test file improvements
- [ ] Documentation enhancements
- [ ] Phase 4 validation complete

---

**Plan Status:** ✅ **READY FOR EXECUTION**  
**Last Updated:** 2025-01-22  
**Next Review:** After Phase 1 completion

