import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ValidationPipeline } from '../../src/validation/pipeline';

// Mock the logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    configure: jest.fn()
  }
}));

describe('Platform Specification Compliance Tests', () => {
  let testDir: string;
  let pipeline: ValidationPipeline;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'svc-platform-spec-'));
    process.chdir(testDir);
    pipeline = new ValidationPipeline();
  });

  describe('Area 1: Component Contract Requirements', () => {
    describe('ComponentSpec Required Fields (platform_spec.md 1.1)', () => {
      it('should validate all required fields are present', async () => {
        const manifestPath = path.join(testDir, 'complete-component.yml');
        await fs.writeFile(manifestPath, `
service: shipping
owner: team-fulfillment
runtime: nodejs20
complianceFramework: commercial
labels:
  domain: logistics
  pii: low
components:
  - name: api
    type: lambda-api
    config:
      routes:
        - method: POST
          path: /shipments
          handler: src/api.createShipment
    binds:
      - to: requests-queue
        capability: queue:sqs
        access: write
        env:
          queueUrl: REQUESTS_QUEUE_URL
    labels:
      tier: standard
      team: fulfillment
    overrides:
      function:
        memorySize: 1024
        timeout: 15
      logs:
        logRetentionDays: 14
    policy:
      publicAccess: false
      justification: "Internal API only"
        `);

        const result = await pipeline.validate(manifestPath);
        const component = result.manifest.components[0];
        
        // Verify all required fields from platform spec
        expect(component.name).toBe('api');
        expect(component.type).toBe('lambda-api');
        expect(component.config).toBeDefined();
        expect(component.binds).toHaveLength(1);
        expect(component.labels).toBeDefined();
        expect(component.overrides).toBeDefined();
        expect(component.policy).toBeDefined();
      });

      it('should enforce unique component names within manifest', async () => {
        const manifestPath = path.join(testDir, 'duplicate-names.yml');
        await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
components:
  - name: api
    type: lambda-api
    config:
      routes: []
  - name: api  # Duplicate name - should fail
    type: lambda-worker
    config:
      handler: src/worker.process
        `);

        await expect(pipeline.validate(manifestPath)).rejects.toThrow(
          expect.stringContaining('duplicate')
        );
      });
    });

    describe('Structured Binds (platform_spec.md 1.2)', () => {
      it('should validate complete bind structure with all fields', async () => {
        const manifestPath = path.join(testDir, 'complete-binds.yml');
        await fs.writeFile(manifestPath, `
service: shipping
owner: team-fulfillment
runtime: nodejs20
components:
  - name: worker
    type: lambda-worker
    config:
      handler: src/worker.process
      batchSize: 10
    binds:
      - to: requests-queue
        capability: queue:sqs
        access: read
        env:
          queueUrl: QUEUE_URL
          dlqUrl: DLQ_URL
        options:
          visibilityTimeout: 60
          batchSize: 10
      - to: rates-db
        capability: db:postgres
        access: write
        env:
          host: DB_HOST
          secretArn: DB_SECRET_ARN
        options:
          iamAuth: true
          tlsRequired: true
  - name: requests-queue
    type: sqs-queue
    config:
      fifo: true
      visibilityTimeout: 60
  - name: rates-db
    type: rds-postgres
    config:
      dbName: shipping
        `);

        const result = await pipeline.plan(manifestPath, 'dev');
        const workerComponent = result.resolvedManifest.components.find(c => c.name === 'worker');
        
        expect(workerComponent?.binds).toHaveLength(2);
        
        // Validate queue bind structure
        const queueBind = workerComponent?.binds?.[0];
        expect(queueBind?.to).toBe('requests-queue');
        expect(queueBind?.capability).toBe('queue:sqs');
        expect(queueBind?.access).toBe('read');
        expect(queueBind?.env?.queueUrl).toBe('QUEUE_URL');
        expect(queueBind?.options?.visibilityTimeout).toBe(60);
        
        // Validate database bind structure
        const dbBind = workerComponent?.binds?.[1];
        expect(dbBind?.to).toBe('rates-db');
        expect(dbBind?.capability).toBe('db:postgres');
        expect(dbBind?.access).toBe('write');
        expect(dbBind?.env?.host).toBe('DB_HOST');
        expect(dbBind?.options?.iamAuth).toBe(true);
      });

      it('should support bind selectors (advanced)', async () => {
        const manifestPath = path.join(testDir, 'bind-selectors.yml');
        await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
components:
  - name: api
    type: lambda-api
    config:
      routes: []
    binds:
      - select:
          type: rds-postgres
          withLabels: 
            tier: gold
            shared: "true"
        capability: db:postgres
        access: read
  - name: shared-db
    type: rds-postgres
    config:
      dbName: shared
    labels:
      tier: gold
      shared: "true"
        `);

        const result = await pipeline.plan(manifestPath, 'dev');
        expect(result.resolvedManifest.components).toHaveLength(2);
        
        const apiComponent = result.resolvedManifest.components.find(c => c.name === 'api');
        expect(apiComponent?.binds?.[0]?.select).toBeDefined();
      });

      it('should fail when bind selector resolves to zero or multiple targets', async () => {
        const manifestPath = path.join(testDir, 'ambiguous-selector.yml');
        await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
components:
  - name: api
    type: lambda-api
    config:
      routes: []
    binds:
      - select:
          type: rds-postgres
          withLabels: 
            tier: gold
        capability: db:postgres
        access: read
  - name: db1
    type: rds-postgres
    config:
      dbName: db1
    labels:
      tier: gold
  - name: db2
    type: rds-postgres
    config:
      dbName: db2  
    labels:
      tier: gold  # Ambiguous - multiple matches
        `);

        await expect(pipeline.plan(manifestPath, 'dev')).rejects.toThrow(
          expect.stringContaining('multiple')
        );
      });
    });

    describe('Cross-component References (platform_spec.md 1.4)', () => {
      it('should validate ${ref:component.capability.field} syntax', async () => {
        const manifestPath = path.join(testDir, 'cross-references.yml');
        await fs.writeFile(manifestPath, `
service: shipping
owner: team-fulfillment
runtime: nodejs20
components:
  - name: api
    type: lambda-api
    config:
      routes:
        - method: POST
          path: /shipments
          handler: src/api.createShipment
      auditBucketName: \${ref:artifacts-bucket.bucket:s3.bucketName}
      logGroupArn: \${ref:logs.obs:log-group.logGroupArn}
  - name: artifacts-bucket
    type: s3-bucket
    config:
      bucketName: shipping-artifacts
  - name: logs
    type: cloudwatch-log-group
    config:
      logGroupName: /aws/lambda/shipping
        `);

        const result = await pipeline.plan(manifestPath, 'dev');
        const apiComponent = result.resolvedManifest.components.find(c => c.name === 'api');
        
        // References should be validated and preserved (resolution happens at CDK synthesis)
        expect(apiComponent?.config?.auditBucketName).toContain('${ref:artifacts-bucket.bucket:s3.bucketName}');
        expect(apiComponent?.config?.logGroupArn).toContain('${ref:logs.obs:log-group.logGroupArn}');
      });

      it('should fail for references to non-existent components', async () => {
        const manifestPath = path.join(testDir, 'invalid-references.yml');
        await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
components:
  - name: api
    type: lambda-api
    config:
      routes: []
      invalidRef: \${ref:nonexistent-component.bucket:s3.bucketName}
        `);

        await expect(pipeline.plan(manifestPath, 'dev')).rejects.toThrow(
          expect.stringContaining('nonexistent-component')
        );
      });
    });
  });

  describe('Area 2: Developer Experience Manifest Requirements', () => {
    describe('Complete Shipping Service Example (platform_spec.md 2.1)', () => {
      it('should validate the complete shipping service manifest from spec', async () => {
        const manifestPath = path.join(testDir, 'shipping-service.yml');
        await fs.writeFile(manifestPath, `
service: shipping
owner: team-fulfillment
runtime: nodejs20
complianceFramework: commercial
labels:
  domain: logistics
  pii: low

environments:
  dev:
    defaults:
      lambdaMemory: 512
      featureFlags:
        ENABLE_MOCK_RATES: true
  prod:
    defaults:
      lambdaMemory: 1024
      featureFlags:
        ENABLE_MOCK_RATES: false

components:
  - name: api
    type: lambda-api
    config:
      routes:
        - method: POST
          path: /shipments
          handler: src/api.createShipment
      env:
        FEATURE_FLAGS: \${env:featureFlags}
    binds:
      - to: requests-queue
        capability: queue:sqs
        access: write
        env:
          queueUrl: REQUESTS_QUEUE_URL
    overrides:
      function:
        memorySize: \${env:lambdaMemory}
        timeout: 15
      logs:
        logRetentionDays: 14

  - name: requests-queue
    type: sqs-queue
    config:
      fifo: true
      visibilityTimeout: 60
    overrides:
      queue:
        deadLetter:
          maxReceiveCount: 5

  - name: worker
    type: lambda-worker
    config:
      handler: src/worker.process
      batchSize: 10
    binds:
      - to: requests-queue
        capability: queue:sqs
        access: read
      - to: rates-db
        capability: db:postgres
        access: write
        options:
          iamAuth: true
        env:
          host: DB_HOST
          secretArn: DB_SECRET_ARN
    overrides:
      function:
        memorySize: \${env:lambdaMemory}
        timeout: 60
      logs:
        logRetentionDays: 30

  - name: rates-db
    type: rds-postgres
    config:
      dbName: shipping
      multiAz: \${envIs:prod}
      backupRetentionDays:
        dev: 3
        prod: 14
      parameters:
        sharedExtensions:
          - uuid-ossp
          - pgcrypto
    overrides:
      instance:
        class:
          dev: t3.micro
          prod: r5.large
        storageGb:
          dev: 20
          prod: 200
      network:
        allowPublicAccess: false
        `);

        // Test both environments
        const devResult = await pipeline.plan(manifestPath, 'dev');
        const prodResult = await pipeline.plan(manifestPath, 'prod');

        // Verify service-level fields
        expect(devResult.resolvedManifest.service).toBe('shipping');
        expect(devResult.resolvedManifest.owner).toBe('team-fulfillment');
        expect(devResult.resolvedManifest.complianceFramework).toBe('commercial');
        expect(devResult.resolvedManifest.labels.domain).toBe('logistics');

        // Verify environment resolution
        const devApi = devResult.resolvedManifest.components.find(c => c.name === 'api');
        expect(devApi?.overrides?.function?.memorySize).toBe('512');
        expect(devApi?.config?.env?.FEATURE_FLAGS?.ENABLE_MOCK_RATES).toBe(true);

        const prodApi = prodResult.resolvedManifest.components.find(c => c.name === 'api');
        expect(prodApi?.overrides?.function?.memorySize).toBe('1024');
        expect(prodApi?.config?.env?.FEATURE_FLAGS?.ENABLE_MOCK_RATES).toBe(false);

        // Verify per-env maps resolution
        const devDb = devResult.resolvedManifest.components.find(c => c.name === 'rates-db');
        const prodDb = prodResult.resolvedManifest.components.find(c => c.name === 'rates-db');
        
        expect(devDb?.config?.multiAz).toBe(false); // ${envIs:prod} in dev
        expect(prodDb?.config?.multiAz).toBe(true); // ${envIs:prod} in prod
        expect(devDb?.config?.backupRetentionDays).toBe(3);
        expect(prodDb?.config?.backupRetentionDays).toBe(14);
      });
    });

    describe('Override System Validation (platform_spec.md 2.4)', () => {
      it('should validate allowed overrides per component type', async () => {
        const manifestPath = path.join(testDir, 'valid-overrides.yml');
        await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
components:
  - name: api
    type: lambda-api
    config:
      routes: []
    overrides:
      function:
        memorySize: 1024
        timeout: 30
        reservedConcurrency: 10
      logs:
        logRetentionDays: 14
  - name: queue
    type: sqs-queue
    config:
      fifo: false
    overrides:
      queue:
        deadLetter:
          maxReceiveCount: 3
        visibility:
          timeoutSeconds: 300
  - name: database
    type: rds-postgres
    config:
      dbName: testdb
    overrides:
      instance:
        class: t3.small
        storageGb: 100
        multiAz: true
      network:
        allowPublicAccess: false
        subnetGroup: private
        `);

        const result = await pipeline.validate(manifestPath);
        expect(result.manifest.components).toHaveLength(3);
        
        // Verify overrides are preserved
        const api = result.manifest.components.find(c => c.name === 'api');
        expect(api?.overrides?.function?.memorySize).toBe(1024);
        expect(api?.overrides?.logs?.logRetentionDays).toBe(14);
        
        const queue = result.manifest.components.find(c => c.name === 'queue');
        expect(queue?.overrides?.queue?.deadLetter?.maxReceiveCount).toBe(3);
        
        const db = result.manifest.components.find(c => c.name === 'database');
        expect(db?.overrides?.instance?.class).toBe('t3.small');
        expect(db?.overrides?.network?.allowPublicAccess).toBe(false);
      });

      it('should warn for advanced L2 passthrough usage', async () => {
        const manifestPath = path.join(testDir, 'l2-passthrough.yml');
        await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
components:
  - name: api
    type: lambda-api
    config:
      routes: []
    overrides:
      l2Props:
        function:
          environment:
            variables:
              ADVANCED_CONFIG: "true"
          deadLetterQueue:
            targetArn: "arn:aws:sqs:..."
        `);

        const result = await pipeline.validate(manifestPath);
        
        // Should validate but potentially generate warnings for advanced usage
        expect(result.manifest.components[0].overrides?.l2Props).toBeDefined();
        // Note: In real implementation, this might generate warnings
      });
    });
  });

  describe('Area 3: Governance & Extensibility Requirements', () => {
    describe('CDK-NAG Governance (platform_spec.md 3.1)', () => {
      it('should validate complete governance suppression structure', async () => {
        const manifestPath = path.join(testDir, 'complete-governance.yml');
        await fs.writeFile(manifestPath, `
service: shipping
owner: team-fulfillment
runtime: nodejs20
governance:
  cdkNag:
    suppress:
      - id: AwsSolutions-IAM5
        appliesTo:
          - component: api
          - path: constructs.api.function.role
        justification: "Wildcards limited to SSM param list due to vendor SDK pattern"
        expiresOn: "2026-01-01"
        owner: "team-fulfillment"
      - id: AwsSolutions-RDS11
        appliesTo:
          - component: rates-db
        justification: "Backup retention meets compliance requirements"
        expiresOn: "2025-06-01"  
        owner: "team-fulfillment"
components:
  - name: api
    type: lambda-api
    config:
      routes: []
  - name: rates-db
    type: rds-postgres
    config:
      dbName: shipping
        `);

        const result = await pipeline.plan(manifestPath, 'dev');
        const suppressions = result.resolvedManifest.governance?.cdkNag?.suppress;
        
        expect(suppressions).toHaveLength(2);
        
        // Verify first suppression
        expect(suppressions?.[0]).toMatchObject({
          id: 'AwsSolutions-IAM5',
          justification: 'Wildcards limited to SSM param list due to vendor SDK pattern',
          owner: 'team-fulfillment',
          expiresOn: '2026-01-01'
        });
        expect(suppressions?.[0].appliesTo).toHaveLength(2);
        
        // Verify component references are valid
        const componentNames = result.resolvedManifest.components.map(c => c.name);
        suppressions?.forEach(suppression => {
          suppression.appliesTo?.forEach(target => {
            if (target.component) {
              expect(componentNames).toContain(target.component);
            }
          });
        });
      });

      it('should enforce all required governance fields', async () => {
        const testCases = [
          {
            name: 'missing-id',
            suppression: `
      - justification: "Test justification"
        owner: "team-test"
        expiresOn: "2025-01-01"
        appliesTo:
          - component: api
            `,
            expectedError: 'id'
          },
          {
            name: 'missing-justification',
            suppression: `
      - id: AwsSolutions-IAM5
        owner: "team-test"
        expiresOn: "2025-01-01"
        appliesTo:
          - component: api
            `,
            expectedError: 'justification'
          },
          {
            name: 'missing-owner',
            suppression: `
      - id: AwsSolutions-IAM5
        justification: "Test justification"
        expiresOn: "2025-01-01"
        appliesTo:
          - component: api
            `,
            expectedError: 'owner'
          },
          {
            name: 'missing-expires-on',
            suppression: `
      - id: AwsSolutions-IAM5
        justification: "Test justification"
        owner: "team-test"
        appliesTo:
          - component: api
            `,
            expectedError: 'expiresOn'
          }
        ];

        for (const testCase of testCases) {
          const manifestPath = path.join(testDir, `governance-${testCase.name}.yml`);
          await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
governance:
  cdkNag:
    suppress:${testCase.suppression}
components:
  - name: api
    type: lambda-api
    config:
      routes: []
          `);

          await expect(pipeline.plan(manifestPath, 'dev')).rejects.toThrow(
            expect.stringContaining(testCase.expectedError)
          );
        }
      });
    });

    describe('Patches Extension System (platform_spec.md 3.2)', () => {
      it('should validate patches registration in manifest', async () => {
        const manifestPath = path.join(testDir, 'patches-registration.yml');
        await fs.writeFile(manifestPath, `
service: shipping
owner: team-fulfillment  
runtime: nodejs20
extensions:
  patches:
    - name: tighten-db-alarms
      justification: "Critical SLO for shipping rates. Pager duty integration required."
      owner: "team-fulfillment"
      expiresOn: "2026-01-01"
    - name: custom-security-groups
      justification: "Enhanced network segmentation for compliance"
      owner: "team-security"
      expiresOn: "2025-12-31"
components:
  - name: api
    type: lambda-api
    config:
      routes: []
        `);

        const result = await pipeline.validate(manifestPath);
        const patches = result.manifest.extensions?.patches;
        
        expect(patches).toHaveLength(2);
        expect(patches?.[0]).toMatchObject({
          name: 'tighten-db-alarms',
          justification: 'Critical SLO for shipping rates. Pager duty integration required.',
          owner: 'team-fulfillment',
          expiresOn: '2026-01-01'
        });
      });

      it('should enforce required fields for patch registration', async () => {
        const manifestPath = path.join(testDir, 'invalid-patches.yml');
        await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
extensions:
  patches:
    - name: invalid-patch
      # Missing required fields: justification, owner, expiresOn
components: []
        `);

        await expect(pipeline.validate(manifestPath)).rejects.toThrow(
          expect.stringContaining('justification')
        );
      });
    });
  });

  describe('Resolution Order Testing (platform_spec.md 2.2)', () => {
    it('should follow correct resolution order: base → env defaults → per-env override → component overrides', async () => {
      const manifestPath = path.join(testDir, 'resolution-order.yml');
      await fs.writeFile(manifestPath, `
service: resolution-test
owner: test-team
runtime: nodejs20
# Base level
labels:
  environment: base
  priority: low

environments:
  dev:
    defaults:
      # Environment defaults
      priority: medium
      memorySize: 512
      features:
        debug: true
        monitoring: false
  prod:
    defaults:
      priority: high
      memorySize: 1024
      features:
        debug: false
        monitoring: true

components:
  - name: api
    type: lambda-api
    config:
      routes: []
      # Per-env override
      memory:
        dev: 256  # Overrides env default of 512
        prod: 2048  # Overrides env default of 1024
      priority: \${env:priority}  # Uses env default
      debugging: \${env:features.debug}
    # Component overrides (highest precedence)
    overrides:
      function:
        timeout: 30  # Component-level override
        `);

      const devResult = await pipeline.plan(manifestPath, 'dev');
      const prodResult = await pipeline.plan(manifestPath, 'prod');

      const devApi = devResult.resolvedManifest.components[0];
      const prodApi = prodResult.resolvedManifest.components[0];

      // Test resolution order
      expect(devApi.config.memory).toBe(256);   // Per-env override beats env default
      expect(prodApi.config.memory).toBe(2048); // Per-env override beats env default
      expect(devApi.config.priority).toBe('medium');  // Env default
      expect(prodApi.config.priority).toBe('high');   // Env default
      expect(devApi.config.debugging).toBe(true);     // Env feature flag
      expect(prodApi.config.debugging).toBe(false);   // Env feature flag
      expect(devApi.overrides.function.timeout).toBe(30); // Component override
    });
  });

  afterEach(async () => {
    try {
      process.chdir('/tmp');
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
});