import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ValidationPipeline } from '../../src/validation/pipeline';

describe('ValidationPipeline', () => {
  let pipeline: ValidationPipeline;
  let testDir: string;

  beforeEach(async () => {
    pipeline = new ValidationPipeline();
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'svc-test-'));
  });

  describe('Stage 1: YAML Parsing (AC-P1.1, AC-P1.2)', () => {
    it('should successfully parse valid YAML manifest', async () => {
      const manifestPath = path.join(testDir, 'valid-manifest.yml');
      await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
components: []
      `);

      const result = await pipeline.validate(manifestPath);
      expect(result.manifest.service).toBe('test-service');
      expect(result.manifest.owner).toBe('test-team');
      expect(result.manifest.runtime).toBe('nodejs20');
    });

    it('should fail with invalid YAML syntax (sad path)', async () => {
      const manifestPath = path.join(testDir, 'invalid-yaml.yml');
      await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
invalid: yaml: content: here
      `);

      await expect(pipeline.validate(manifestPath)).rejects.toThrow('Invalid YAML syntax');
    });

    it('should handle empty YAML file (sad path)', async () => {
      const manifestPath = path.join(testDir, 'empty.yml');
      await fs.writeFile(manifestPath, '');

      await expect(pipeline.validate(manifestPath)).rejects.toThrow();
    });

    it('should handle malformed YAML with tabs and spaces', async () => {
      const manifestPath = path.join(testDir, 'malformed.yml');
      await fs.writeFile(manifestPath, `
service: test-service
\towner: test-team  # Mixed tabs/spaces
  runtime: nodejs20
`);

      await expect(pipeline.validate(manifestPath)).rejects.toThrow();
    });
  });

  describe('Stage 2: Schema Validation (AC-P2.1, AC-P2.2, AC-P2.3)', () => {
    it('should validate complete manifest against master schema (happy path)', async () => {
      const manifestPath = path.join(testDir, 'schema-valid.yml');
      await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
complianceFramework: commercial
components:
  - name: api
    type: lambda-api
    config:
      routes:
        - method: GET
          path: /test
          handler: src/handler.test
      `);

      const result = await pipeline.validate(manifestPath);
      expect(result.manifest.service).toBe('test-service');
      expect(result.manifest.complianceFramework).toBe('commercial');
      expect(result.warnings).toEqual([]);
    });

    it('should validate all three compliance frameworks', async () => {
      const frameworks = ['commercial', 'fedramp-moderate', 'fedramp-high'];
      
      for (const framework of frameworks) {
        const manifestPath = path.join(testDir, `${framework}.yml`);
        await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
complianceFramework: ${framework}
components: []
        `);

        const result = await pipeline.validate(manifestPath);
        expect(result.manifest.complianceFramework).toBe(framework);
      }
    });

    it('should fail validation for missing required fields (AC-E1 sad path)', async () => {
      const testCases = [
        { file: 'missing-service.yml', content: 'owner: test-team\nruntime: nodejs20\ncomponents: []', expectedError: 'service' },
        { file: 'missing-owner.yml', content: 'service: test-service\nruntime: nodejs20\ncomponents: []', expectedError: 'owner' },
        { file: 'missing-runtime.yml', content: 'service: test-service\nowner: test-team\ncomponents: []', expectedError: 'runtime' }
      ];

      for (const testCase of testCases) {
        const manifestPath = path.join(testDir, testCase.file);
        await fs.writeFile(manifestPath, testCase.content);

        await expect(pipeline.validate(manifestPath)).rejects.toThrow(
          expect.stringContaining(testCase.expectedError)
        );
      }
    });

    it('should validate component schemas properly', async () => {
      const manifestPath = path.join(testDir, 'component-validation.yml');
      await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
components:
  - name: api
    type: lambda-api
    config:
      routes:
        - method: GET
          path: /test
          handler: src/handler.test
        - method: POST
          path: /items
          handler: src/handler.create
  - name: queue
    type: sqs-queue
    config:
      fifo: false
      visibilityTimeout: 300
      `);

      const result = await pipeline.validate(manifestPath);
      expect(result.manifest.components).toHaveLength(2);
      expect(result.manifest.components[0].type).toBe('lambda-api');
      expect(result.manifest.components[1].type).toBe('sqs-queue');
    });

    it('should fail for invalid component types (sad path)', async () => {
      const manifestPath = path.join(testDir, 'invalid-component.yml');
      await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
components:
  - name: invalid
    type: nonexistent-type
    config: {}
      `);

      await expect(pipeline.validate(manifestPath)).rejects.toThrow();
    });
  });

  describe('Stage 3: Context Hydration (AC-P3.1, AC-P3.2, AC-P3.3)', () => {
    it('should correctly resolve environment interpolation (happy path)', async () => {
      const manifestPath = path.join(testDir, 'env-interpolation.yml');
      await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
environments:
  dev:
    defaults:
      logLevel: debug
      memorySize: 512
  prod:
    defaults:
      logLevel: info
      memorySize: 1024
components:
  - name: api
    type: lambda-api
    config:
      routes:
        - method: GET
          path: /test
          handler: src/handler.test
      logLevel: \${env:logLevel}
      memory: \${env:memorySize}
      isProd: \${envIs:prod}
      `);

      const devResult = await pipeline.plan(manifestPath, 'dev');
      expect(devResult.resolvedManifest.components[0].config.logLevel).toBe('debug');
      expect(devResult.resolvedManifest.components[0].config.memory).toBe('512');
      expect(devResult.resolvedManifest.components[0].config.isProd).toBe(false);

      const prodResult = await pipeline.plan(manifestPath, 'prod');
      expect(prodResult.resolvedManifest.components[0].config.logLevel).toBe('info');
      expect(prodResult.resolvedManifest.components[0].config.memory).toBe('1024');
      expect(prodResult.resolvedManifest.components[0].config.isProd).toBe(true);
    });

    it('should handle per-environment component config maps', async () => {
      const manifestPath = path.join(testDir, 'env-maps.yml');
      await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
components:
  - name: api
    type: lambda-api
    config:
      routes:
        - method: GET
          path: /test
          handler: src/handler.test
      memory:
        dev: 256
        prod: 1024
      timeout:
        dev: 30
        prod: 60
      `);

      const devResult = await pipeline.plan(manifestPath, 'dev');
      expect(devResult.resolvedManifest.components[0].config.memory).toBe(256);
      expect(devResult.resolvedManifest.components[0].config.timeout).toBe(30);

      const prodResult = await pipeline.plan(manifestPath, 'prod');
      expect(prodResult.resolvedManifest.components[0].config.memory).toBe(1024);
      expect(prodResult.resolvedManifest.components[0].config.timeout).toBe(60);
    });

    it('should fail for undefined environment variables (sad path)', async () => {
      const manifestPath = path.join(testDir, 'undefined-env.yml');
      await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
components:
  - name: api
    type: lambda-api
    config:
      routes: []
      undefinedValue: \${env:nonExistentKey}
      `);

      await expect(pipeline.plan(manifestPath, 'dev')).rejects.toThrow(
        expect.stringContaining('nonExistentKey')
      );
    });

    it('should set default compliance framework to commercial', async () => {
      const manifestPath = path.join(testDir, 'no-compliance.yml');
      await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
components: []
      `);

      const result = await pipeline.plan(manifestPath, 'dev');
      expect(result.resolvedManifest.complianceFramework).toBe('commercial');
    });

    it('should apply framework-specific defaults for FedRAMP', async () => {
      const manifestPath = path.join(testDir, 'fedramp-defaults.yml');
      await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
complianceFramework: fedramp-high
components: []
      `);

      const result = await pipeline.plan(manifestPath, 'dev');
      expect(result.resolvedManifest.complianceFramework).toBe('fedramp-high');
      // Should apply FedRAMP-specific defaults
    });
  });

  describe('Stage 4: Reference Validation (AC-P4.1, AC-P4.2, AC-P4.3)', () => {
    it('should validate component references in binds (happy path)', async () => {
      const manifestPath = path.join(testDir, 'valid-binds.yml');
      await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
components:
  - name: api
    type: lambda-api
    config:
      routes:
        - method: GET
          path: /test
          handler: src/handler.test
    binds:
      - to: database
        capability: db:postgres
        access: read
        env:
          host: DB_HOST
          secretArn: DB_SECRET_ARN
  - name: database
    type: rds-postgres
    config:
      dbName: testdb
      `);

      const result = await pipeline.plan(manifestPath, 'dev');
      expect(result.resolvedManifest.components).toHaveLength(2);
      const apiComponent = result.resolvedManifest.components.find(c => c.name === 'api');
      expect(apiComponent?.binds).toHaveLength(1);
      expect(apiComponent?.binds?.[0].to).toBe('database');
    });

    it('should validate multiple component bindings', async () => {
      const manifestPath = path.join(testDir, 'multi-binds.yml');
      await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
components:
  - name: api
    type: lambda-api
    config:
      routes:
        - method: GET
          path: /test
          handler: src/handler.test
    binds:
      - to: database
        capability: db:postgres
        access: read
      - to: cache
        capability: cache:redis
        access: readwrite
  - name: database
    type: rds-postgres
    config:
      dbName: testdb
  - name: cache
    type: elasticache-redis
    config:
      nodeType: cache.t3.micro
      `);

      const result = await pipeline.plan(manifestPath, 'dev');
      const apiComponent = result.resolvedManifest.components.find(c => c.name === 'api');
      expect(apiComponent?.binds).toHaveLength(2);
    });

    it('should fail for non-existent component references (AC-P4.2 sad path)', async () => {
      const manifestPath = path.join(testDir, 'invalid-binds.yml');
      await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
components:
  - name: api
    type: lambda-api
    config:
      routes:
        - method: GET
          path: /test
          handler: src/handler.test
    binds:
      - to: nonexistent-db
        capability: db:postgres
        access: read
      `);

      await expect(pipeline.plan(manifestPath, 'dev')).rejects.toThrow(
        expect.stringContaining('nonexistent-db')
      );
    });

    it('should validate circular dependency detection (sad path)', async () => {
      const manifestPath = path.join(testDir, 'circular-deps.yml');
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
      - to: worker
        capability: invoke:lambda
        access: execute
  - name: worker
    type: lambda-worker
    config:
      handler: src/worker.process
    binds:
      - to: api
        capability: invoke:lambda
        access: execute
      `);

      // Should detect circular dependency
      await expect(pipeline.plan(manifestPath, 'dev')).rejects.toThrow(
        expect.stringContaining('circular')
      );
    });

    it('should validate governance suppressions (AC-P4.3 happy path)', async () => {
      const manifestPath = path.join(testDir, 'governance-valid.yml');
      await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
governance:
  cdkNag:
    suppress:
      - id: AwsSolutions-IAM5
        justification: "Required for service functionality"
        owner: "test-team"
        expiresOn: "2025-01-01"
        appliesTo:
          - component: api
components:
  - name: api
    type: lambda-api
    config:
      routes:
        - method: GET
          path: /test
          handler: src/handler.test
      `);

      const result = await pipeline.plan(manifestPath, 'dev');
      expect(result.resolvedManifest.governance?.cdkNag?.suppress).toHaveLength(1);
      expect(result.resolvedManifest.governance?.cdkNag?.suppress?.[0].id).toBe('AwsSolutions-IAM5');
    });

    it('should fail for invalid governance suppressions (AC-P4.3 sad path)', async () => {
      const testCases = [
        {
          name: 'missing-justification',
          content: `
service: test-service
owner: test-team
runtime: nodejs20
governance:
  cdkNag:
    suppress:
      - id: AwsSolutions-IAM5
        owner: test-team
        expiresOn: "2025-01-01"
components: []
          `,
          expectedError: 'justification'
        },
        {
          name: 'missing-owner',
          content: `
service: test-service
owner: test-team
runtime: nodejs20
governance:
  cdkNag:
    suppress:
      - id: AwsSolutions-IAM5
        justification: "Test justification"
        expiresOn: "2025-01-01"
components: []
          `,
          expectedError: 'owner'
        },
        {
          name: 'invalid-component-reference',
          content: `
service: test-service
owner: test-team
runtime: nodejs20
governance:
  cdkNag:
    suppress:
      - id: AwsSolutions-IAM5
        justification: "Test justification"
        owner: test-team
        expiresOn: "2025-01-01"
        appliesTo:
          - component: nonexistent
components: []
          `,
          expectedError: 'nonexistent'
        }
      ];

      for (const testCase of testCases) {
        const manifestPath = path.join(testDir, `${testCase.name}.yml`);
        await fs.writeFile(manifestPath, testCase.content);

        await expect(pipeline.plan(manifestPath, 'dev')).rejects.toThrow(
          expect.stringContaining(testCase.expectedError)
        );
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should validate manifest in under 500ms', async () => {
      const manifestPath = path.join(testDir, 'perf-test.yml');
      await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
components:
  - name: api
    type: lambda-api
    config:
      routes:
        - method: GET
          path: /test
          handler: src/handler.test
      `);

      const startTime = Date.now();
      await pipeline.validate(manifestPath);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500);
    });

    it('should handle large manifests efficiently', async () => {
      // Generate manifest with many components
      const components = Array.from({ length: 50 }, (_, i) => `
  - name: component-${i}
    type: lambda-api
    config:
      routes:
        - method: GET
          path: /test-${i}
          handler: src/handler-${i}.test`).join('');

      const manifestPath = path.join(testDir, 'large-manifest.yml');
      await fs.writeFile(manifestPath, `
service: large-service
owner: test-team
runtime: nodejs20
components:${components}
      `);

      const startTime = Date.now();
      await pipeline.validate(manifestPath);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Allow 1s for large manifests
    });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
});