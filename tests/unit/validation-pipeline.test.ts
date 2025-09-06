import * as fs from 'fs/promises';
import * as path from 'path';
import { ValidationPipeline } from '../../src/validation/pipeline';

describe('ValidationPipeline', () => {
  let pipeline: ValidationPipeline;
  let testDir: string;

  beforeEach(() => {
    pipeline = new ValidationPipeline();
    testDir = path.join(__dirname, '../fixtures');
  });

  describe('Stage 1: Parsing (AC-P1.1, AC-P1.2)', () => {
    it('should successfully parse valid YAML manifest', async () => {
      const manifestPath = path.join(testDir, 'valid-manifest.yml');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
components: []
      `);

      const result = await pipeline.validate(manifestPath);
      expect(result.manifest.service).toBe('test-service');
      expect(result.manifest.owner).toBe('test-team');
    });

    it('should fail with invalid YAML syntax', async () => {
      const manifestPath = path.join(testDir, 'invalid-yaml.yml');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
invalid: yaml: content: here
      `);

      await expect(pipeline.validate(manifestPath)).rejects.toThrow('Invalid YAML syntax');
    });
  });

  describe('Stage 2: Schema Validation (AC-P2.1, AC-P2.2, AC-P2.3)', () => {
    it('should validate manifest against master schema', async () => {
      const manifestPath = path.join(testDir, 'schema-valid.yml');
      await fs.mkdir(testDir, { recursive: true });
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
      expect(result.warnings).toEqual([]);
    });

    it('should fail validation for missing required fields (AC-E1)', async () => {
      const manifestPath = path.join(testDir, 'missing-owner.yml');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(manifestPath, `
service: test-service
runtime: nodejs20
components: []
      `);

      await expect(pipeline.validate(manifestPath)).rejects.toThrow('must have required property \'owner\'');
    });

    it('should fail validation for missing service field (AC-E1)', async () => {
      const manifestPath = path.join(testDir, 'missing-service.yml');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(manifestPath, `
owner: test-team
runtime: nodejs20
components: []
      `);

      await expect(pipeline.validate(manifestPath)).rejects.toThrow('must have required property \'service\'');
    });
  });

  describe('Stage 3: Context Hydration (AC-P3.1, AC-P3.2, AC-P3.3)', () => {
    it('should correctly resolve environment values', async () => {
      const manifestPath = path.join(testDir, 'env-interpolation.yml');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
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

    it('should set default compliance framework to commercial', async () => {
      const manifestPath = path.join(testDir, 'no-compliance.yml');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
components: []
      `);

      const result = await pipeline.plan(manifestPath, 'dev');
      expect(result.resolvedManifest.complianceFramework).toBe('commercial');
    });
  });

  describe('Stage 4: Reference Validation (AC-P4.1, AC-P4.2, AC-P4.3)', () => {
    it('should validate component references in binds', async () => {
      const manifestPath = path.join(testDir, 'valid-binds.yml');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
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
  - name: database
    type: rds-postgres
    config:
      dbName: testdb
      `);

      const result = await pipeline.plan(manifestPath, 'dev');
      expect(result.resolvedManifest.components).toHaveLength(2);
    });

    it('should fail for non-existent component references (AC-P4.2)', async () => {
      const manifestPath = path.join(testDir, 'invalid-binds.yml');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
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
        'Reference to non-existent component \'nonexistent-db\' in components[0].binds[0]'
      );
    });

    it('should validate governance suppressions (AC-P4.3)', async () => {
      const manifestPath = path.join(testDir, 'governance-valid.yml');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
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
      expect(result.resolvedManifest.governance.cdkNag.suppress).toHaveLength(1);
    });

    it('should fail for invalid governance suppressions (AC-P4.3)', async () => {
      const manifestPath = path.join(testDir, 'governance-invalid.yml');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(manifestPath, `
service: test-service
owner: test-team
governance:
  cdkNag:
    suppress:
      - id: AwsSolutions-IAM5
        # Missing required fields: justification, owner, expiresOn
components: []
      `);

      await expect(pipeline.plan(manifestPath, 'dev')).rejects.toThrow(
        'Missing required field \'justification\' in governance.cdkNag.suppress[0]'
      );
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