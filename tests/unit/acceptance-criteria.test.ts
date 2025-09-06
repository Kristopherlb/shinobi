import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ValidationPipeline } from '../../src/validation/pipeline';
import { ValidateCommand } from '../../src/cli/validate';
import { PlanCommand } from '../../src/cli/plan';

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

describe('Engineering Spec Acceptance Criteria', () => {
  let testDir: string;
  let pipeline: ValidationPipeline;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'svc-ac-test-'));
    process.chdir(testDir);
    pipeline = new ValidationPipeline();
  });

  describe('AC-P1: Stage 1 - Parsing', () => {
    describe('AC-P1.1: YAML Parsing with Rejection of Invalid Syntax', () => {
      it('should correctly parse valid YAML manifest', async () => {
        const manifestPath = path.join(testDir, 'valid.yml');
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
          path: /health
          handler: src/api.health
        `);

        const result = await pipeline.validate(manifestPath);
        expect(result.manifest).toBeDefined();
        expect(result.manifest.service).toBe('test-service');
        expect(result.manifest.owner).toBe('test-team');
        expect(result.manifest.runtime).toBe('nodejs20');
      });

      it('should reject files with invalid YAML syntax', async () => {
        const manifestPath = path.join(testDir, 'invalid-yaml.yml');
        await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
invalid: yaml: content: here: bad
        `);

        await expect(pipeline.validate(manifestPath)).rejects.toThrow('Invalid YAML syntax');
      });

      it('should reject YAML with mixed tabs and spaces indentation', async () => {
        const manifestPath = path.join(testDir, 'mixed-indent.yml');
        await fs.writeFile(manifestPath, `
service: test-service
\\towner: test-team  # Tab here
  runtime: nodejs20  # Spaces here
        `);

        await expect(pipeline.validate(manifestPath)).rejects.toThrow();
      });
    });

    describe('AC-P1.2: Raw Parsed Object Passing', () => {
      it('should pass raw parsed object to next stage unmodified', async () => {
        const manifestPath = path.join(testDir, 'raw-object.yml');
        await fs.writeFile(manifestPath, `
service: test-service
owner: test-team  
runtime: nodejs20
customField: customValue  # Should be preserved
environments:
  dev:
    defaults:
      debug: true
components:
  - name: api
    type: lambda-api
    config:
      routes: []
      customConfig: customValue  # Should be preserved
        `);

        const result = await pipeline.validate(manifestPath);
        expect(result.manifest.customField).toBe('customValue');
        expect(result.manifest.environments.dev.defaults.debug).toBe(true);
        expect(result.manifest.components[0].config.customConfig).toBe('customValue');
      });
    });
  });

  describe('AC-P2: Stage 2 - Schema Validation', () => {
    describe('AC-P2.1: Master JSON Schema Validation', () => {
      it('should validate manifest against master JSON schema', async () => {
        const manifestPath = path.join(testDir, 'schema-valid.yml');
        await fs.writeFile(manifestPath, `
service: valid-service-name
owner: platform-team
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
        expect(result.manifest).toBeDefined();
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
    });

    describe('AC-P2.3: Validation Failure with Detailed Path and Rule', () => {
      it('should fail with detailed path for missing service field', async () => {
        const manifestPath = path.join(testDir, 'missing-service.yml');
        await fs.writeFile(manifestPath, `
owner: test-team
runtime: nodejs20
components: []
        `);

        await expect(pipeline.validate(manifestPath)).rejects.toThrow(
          expect.stringContaining('service')
        );
      });

      it('should fail with detailed path for missing owner field', async () => {
        const manifestPath = path.join(testDir, 'missing-owner.yml');
        await fs.writeFile(manifestPath, `
service: test-service
runtime: nodejs20
components: []
        `);

        await expect(pipeline.validate(manifestPath)).rejects.toThrow(
          expect.stringContaining('owner')
        );
      });

      it('should fail with detailed path for invalid component configuration', async () => {
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
  });

  describe('AC-P3: Stage 3 - Context Hydration', () => {
    describe('AC-P3.1: Environment and Compliance Framework Identification', () => {
      it('should identify target environment from CLI flag', async () => {
        const manifestPath = path.join(testDir, 'env-test.yml');
        await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
environments:
  dev:
    defaults:
      stage: development
  prod:
    defaults:
      stage: production
components: []
        `);

        const devResult = await pipeline.plan(manifestPath, 'dev');
        expect(devResult.resolvedManifest).toBeDefined();
        
        const prodResult = await pipeline.plan(manifestPath, 'prod');
        expect(prodResult.resolvedManifest).toBeDefined();
      });

      it('should identify compliance framework from manifest', async () => {
        const frameworks = ['commercial', 'fedramp-moderate', 'fedramp-high'];
        
        for (const framework of frameworks) {
          const manifestPath = path.join(testDir, `framework-${framework}.yml`);
          await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
complianceFramework: ${framework}
components: []
          `);

          const result = await pipeline.plan(manifestPath, 'dev');
          expect(result.resolvedManifest.complianceFramework).toBe(framework);
        }
      });
    });

    describe('AC-P3.2: Environment-Aware Value Resolution', () => {
      it('should resolve ${env:key} interpolation syntax', async () => {
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
      dbHost: dev-db.internal
  prod:
    defaults:
      logLevel: info
      memorySize: 1024
      dbHost: prod-db.internal
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
      databaseHost: \${env:dbHost}
        `);

        const devResult = await pipeline.plan(manifestPath, 'dev');
        expect(devResult.resolvedManifest.components[0].config.logLevel).toBe('debug');
        expect(devResult.resolvedManifest.components[0].config.memory).toBe('512');
        expect(devResult.resolvedManifest.components[0].config.databaseHost).toBe('dev-db.internal');

        const prodResult = await pipeline.plan(manifestPath, 'prod');
        expect(prodResult.resolvedManifest.components[0].config.logLevel).toBe('info');
        expect(prodResult.resolvedManifest.components[0].config.memory).toBe('1024');
        expect(prodResult.resolvedManifest.components[0].config.databaseHost).toBe('prod-db.internal');
      });

      it('should resolve ${envIs:environment} boolean syntax', async () => {
        const manifestPath = path.join(testDir, 'env-boolean.yml');
        await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
components:
  - name: api
    type: lambda-api
    config:
      routes: []
      isDev: \${envIs:dev}
      isProd: \${envIs:prod}
      isStaging: \${envIs:staging}
        `);

        const devResult = await pipeline.plan(manifestPath, 'dev');
        expect(devResult.resolvedManifest.components[0].config.isDev).toBe(true);
        expect(devResult.resolvedManifest.components[0].config.isProd).toBe(false);
        expect(devResult.resolvedManifest.components[0].config.isStaging).toBe(false);

        const prodResult = await pipeline.plan(manifestPath, 'prod');
        expect(prodResult.resolvedManifest.components[0].config.isDev).toBe(false);
        expect(prodResult.resolvedManifest.components[0].config.isProd).toBe(true);
        expect(prodResult.resolvedManifest.components[0].config.isStaging).toBe(false);
      });

      it('should resolve per-environment maps correctly', async () => {
        const manifestPath = path.join(testDir, 'per-env-maps.yml');
        await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
components:
  - name: api
    type: lambda-api
    config:
      routes: []
      memory:
        dev: 256
        staging: 512
        prod: 1024
      timeout:
        dev: 30
        staging: 45
        prod: 60
      features:
        dev:
          - debug
          - profiling
        prod:
          - monitoring
          - alerts
        `);

        const devResult = await pipeline.plan(manifestPath, 'dev');
        expect(devResult.resolvedManifest.components[0].config.memory).toBe(256);
        expect(devResult.resolvedManifest.components[0].config.timeout).toBe(30);
        expect(devResult.resolvedManifest.components[0].config.features).toEqual(['debug', 'profiling']);

        const prodResult = await pipeline.plan(manifestPath, 'prod');
        expect(prodResult.resolvedManifest.components[0].config.memory).toBe(1024);
        expect(prodResult.resolvedManifest.components[0].config.timeout).toBe(60);
        expect(prodResult.resolvedManifest.components[0].config.features).toEqual(['monitoring', 'alerts']);
      });
    });

    describe('AC-P3.3: Fully Hydrated Configuration Object', () => {
      it('should output fully resolved configuration with all environment-specific values', async () => {
        const manifestPath = path.join(testDir, 'full-hydration.yml');
        await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
environments:
  dev:
    defaults:
      logLevel: debug
      replicas: 1
  prod:
    defaults:
      logLevel: info
      replicas: 3
components:
  - name: api
    type: lambda-api
    config:
      routes:
        - method: GET
          path: /test
          handler: src/handler.test
      logLevel: \${env:logLevel}
      scaling:
        dev: 1
        prod: 5
      isProduction: \${envIs:prod}
      features:
        dev:
          - development-tools
        prod:
          - production-monitoring
        `);

        const result = await pipeline.plan(manifestPath, 'prod');
        const component = result.resolvedManifest.components[0];
        
        // Verify all interpolations resolved
        expect(component.config.logLevel).toBe('info');
        expect(component.config.scaling).toBe(5);
        expect(component.config.isProduction).toBe(true);
        expect(component.config.features).toEqual(['production-monitoring']);
        
        // Verify no unresolved interpolations remain
        const jsonString = JSON.stringify(result.resolvedManifest);
        expect(jsonString).not.toMatch(/\$\{env:/);
        expect(jsonString).not.toMatch(/\$\{envIs:/);
      });
    });
  });

  describe('AC-P4: Stage 4 - Semantic & Reference Validation', () => {
    describe('AC-P4.2: Component Reference Validation', () => {
      it('should validate that bind targets exist', async () => {
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
      });

      it('should fail with specific error for non-existent component references', async () => {
        const manifestPath = path.join(testDir, 'invalid-bind-ref.yml');
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
      - to: nonexistent-database
        capability: db:postgres
        access: read
        `);

        await expect(pipeline.plan(manifestPath, 'dev')).rejects.toThrow(
          expect.stringContaining('nonexistent-database')
        );
      });
    });

    describe('AC-P4.3: Governance Suppression Validation', () => {
      it('should validate governance suppressions have required fields', async () => {
        const manifestPath = path.join(testDir, 'valid-governance.yml');
        await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
runtime: nodejs20
governance:
  cdkNag:
    suppress:
      - id: AwsSolutions-IAM5
        justification: "Required for service cross-account access"
        owner: "platform-team"
        expiresOn: "2025-12-31"
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
        expect(result.resolvedManifest.governance?.cdkNag?.suppress?.[0]).toMatchObject({
          id: 'AwsSolutions-IAM5',
          justification: 'Required for service cross-account access',
          owner: 'platform-team',
          expiresOn: '2025-12-31'
        });
      });

      it('should fail for governance suppressions missing required fields', async () => {
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
        owner: "platform-team"
        expiresOn: "2025-12-31"
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
        expiresOn: "2025-12-31"
components: []
            `,
            expectedError: 'owner'
          },
          {
            name: 'missing-expires-on',
            content: `
service: test-service
owner: test-team
runtime: nodejs20
governance:
  cdkNag:
    suppress:
      - id: AwsSolutions-IAM5
        justification: "Test justification"
        owner: "platform-team"
components: []
            `,
            expectedError: 'expiresOn'
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
  });

  describe('Performance Requirements (Engineering Spec)', () => {
    it('should complete validation in under 500ms for typical manifests', async () => {
      const manifestPath = path.join(testDir, 'performance-test.yml');
      await fs.writeFile(manifestPath, `
service: performance-test
owner: test-team
runtime: nodejs20
environments:
  dev:
    defaults:
      logLevel: debug
  prod:
    defaults:
      logLevel: info
components:
  - name: api
    type: lambda-api
    config:
      routes:
        - method: GET
          path: /health
          handler: src/api.health
        - method: POST
          path: /items
          handler: src/api.createItem
      logLevel: \${env:logLevel}
    binds:
      - to: database
        capability: db:postgres
        access: readwrite
  - name: database
    type: rds-postgres
    config:
      dbName: perftest
      `);

      const startTime = Date.now();
      await pipeline.validate(manifestPath);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(500);
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