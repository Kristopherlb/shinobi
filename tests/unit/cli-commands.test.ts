import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { InitCommand } from '../../src/cli/init';
import { ValidateCommand } from '../../src/cli/validate';
import { PlanCommand } from '../../src/cli/plan';
import { ValidationPipeline } from '../../src/validation/pipeline';

// Mock the logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('CLI Commands Unit Tests', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'svc-cli-test-'));
    process.chdir(testDir);
  });

  describe('InitCommand', () => {
    let initCommand: InitCommand;

    beforeEach(() => {
      initCommand = new InitCommand();
    });

    describe('Happy Path Scenarios', () => {
      it('should create service files with all options provided', async () => {
        const options = {
          name: 'test-service',
          owner: 'platform-team',
          framework: 'commercial' as const,
          pattern: 'empty' as const
        };

        await initCommand.execute(options);

        // Verify service.yml was created
        const serviceYml = await fs.readFile('service.yml', 'utf8');
        expect(serviceYml).toContain('service: test-service');
        expect(serviceYml).toContain('owner: platform-team');
        expect(serviceYml).toContain('complianceFramework: commercial');

        // Verify other files were created
        await expect(fs.access('.gitignore')).resolves.not.toThrow();
        await expect(fs.access('src')).resolves.not.toThrow();
        await expect(fs.access('patches.ts')).resolves.not.toThrow();
      });

      it('should create FedRAMP service with high security framework', async () => {
        const options = {
          name: 'secure-service',
          owner: 'security-team',
          framework: 'fedramp-high' as const,
          pattern: 'lambda-api-with-db' as const
        };

        await initCommand.execute(options);

        const serviceYml = await fs.readFile('service.yml', 'utf8');
        expect(serviceYml).toContain('complianceFramework: fedramp-high');
        expect(serviceYml).toContain('classification: controlled');
        expect(serviceYml).toContain('auditLevel: detailed');
        expect(serviceYml).toContain('backupRetentionDays: 35'); // FedRAMP extended retention
      });

      it('should create worker pattern with queue correctly', async () => {
        const options = {
          name: 'worker-service',
          owner: 'data-team',
          framework: 'commercial' as const,
          pattern: 'worker-with-queue' as const
        };

        await initCommand.execute(options);

        const serviceYml = await fs.readFile('service.yml', 'utf8');
        expect(serviceYml).toContain('type: sqs-queue');
        expect(serviceYml).toContain('type: lambda-worker');
        expect(serviceYml).toContain('capability: queue:sqs');

        const workerTs = await fs.readFile('src/worker.ts', 'utf8');
        expect(workerTs).toContain('export const process');
        expect(workerTs).toContain('event.Records');
      });
    });

    describe('Sad Path Scenarios', () => {
      it('should fail if service.yml already exists', async () => {
        // Create existing service.yml
        await fs.writeFile('service.yml', 'existing content');

        const options = {
          name: 'test-service',
          owner: 'platform-team',
          framework: 'commercial' as const,
          pattern: 'empty' as const
        };

        await expect(initCommand.execute(options)).rejects.toThrow('Service already initialized');
      });

      it('should handle file system errors gracefully', async () => {
        // Make directory read-only to cause write errors
        await fs.chmod(testDir, 0o444);

        const options = {
          name: 'test-service',
          owner: 'platform-team',
          framework: 'commercial' as const,
          pattern: 'empty' as const
        };

        await expect(initCommand.execute(options)).rejects.toThrow();

        // Restore permissions for cleanup
        await fs.chmod(testDir, 0o755);
      });
    });
  });

  describe('ValidateCommand', () => {
    let validateCommand: ValidateCommand;

    beforeEach(() => {
      validateCommand = new ValidateCommand();
    });

    describe('Happy Path Scenarios', () => {
      it('should validate a correct manifest successfully', async () => {
        await fs.writeFile('service.yml', `
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

        const result = await validateCommand.execute({ file: 'service.yml' });
        expect(result.manifest.service).toBe('test-service');
        expect(result.manifest.owner).toBe('test-team');
      });

      it('should validate manifest with all compliance frameworks', async () => {
        const frameworks = ['commercial', 'fedramp-moderate', 'fedramp-high'];

        for (const framework of frameworks) {
          await fs.writeFile('service.yml', `
service: test-service
owner: test-team
runtime: nodejs20
complianceFramework: ${framework}
components: []
          `);

          const result = await validateCommand.execute({ file: 'service.yml' });
          expect(result.manifest.complianceFramework).toBe(framework);
        }
      });

      it('should discover service.yml in current directory', async () => {
        await fs.writeFile('service.yml', `
service: test-service
owner: test-team
runtime: nodejs20
components: []
        `);

        // Don't specify file option - should auto-discover
        const result = await validateCommand.execute({});
        expect(result.manifest.service).toBe('test-service');
      });
    });

    describe('Sad Path Scenarios', () => {
      it('should fail for missing required fields', async () => {
        const testCases = [
          { content: 'owner: test-team\nruntime: nodejs20\ncomponents: []', missingField: 'service' },
          { content: 'service: test-service\nruntime: nodejs20\ncomponents: []', missingField: 'owner' },
          { content: 'service: test-service\nowner: test-team\ncomponents: []', missingField: 'runtime' }
        ];

        for (const testCase of testCases) {
          await fs.writeFile('service.yml', testCase.content);

          await expect(validateCommand.execute({ file: 'service.yml' })).rejects.toThrow(
            expect.stringContaining(testCase.missingField)
          );
        }
      });

      it('should fail for invalid YAML syntax', async () => {
        await fs.writeFile('service.yml', `
service: test-service
owner: test-team
invalid: yaml: content: here
        `);

        await expect(validateCommand.execute({ file: 'service.yml' })).rejects.toThrow('Invalid YAML syntax');
      });

      it('should fail if no manifest found', async () => {
        await expect(validateCommand.execute({})).rejects.toThrow(
          expect.stringContaining('No service.yml found')
        );
      });

      it('should fail for non-existent file', async () => {
        await expect(validateCommand.execute({ file: 'nonexistent.yml' })).rejects.toThrow();
      });
    });
  });

  describe('PlanCommand', () => {
    let planCommand: PlanCommand;

    beforeEach(() => {
      planCommand = new PlanCommand();
    });

    describe('Happy Path Scenarios', () => {
      it('should plan deployment with environment resolution', async () => {
        await fs.writeFile('service.yml', `
service: test-service
owner: test-team
runtime: nodejs20
complianceFramework: fedramp-moderate
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
        `);

        const devResult = await planCommand.execute({ env: 'dev' });
        expect(devResult.resolvedManifest.complianceFramework).toBe('fedramp-moderate');
        expect(devResult.resolvedManifest.components[0].config.logLevel).toBe('debug');
        expect(devResult.resolvedManifest.components[0].config.memory).toBe('512');

        const prodResult = await planCommand.execute({ env: 'prod' });
        expect(prodResult.resolvedManifest.components[0].config.logLevel).toBe('info');
        expect(prodResult.resolvedManifest.components[0].config.memory).toBe('1024');
      });

      it('should handle per-environment config maps', async () => {
        await fs.writeFile('service.yml', `
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
        staging: 512
        prod: 1024
      timeout:
        dev: 30
        staging: 45
        prod: 60
        `);

        const devResult = await planCommand.execute({ env: 'dev' });
        expect(devResult.resolvedManifest.components[0].config.memory).toBe(256);
        expect(devResult.resolvedManifest.components[0].config.timeout).toBe(30);

        const prodResult = await planCommand.execute({ env: 'prod' });
        expect(prodResult.resolvedManifest.components[0].config.memory).toBe(1024);
        expect(prodResult.resolvedManifest.components[0].config.timeout).toBe(60);
      });

      it('should validate component bindings correctly', async () => {
        await fs.writeFile('service.yml', `
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

        const result = await planCommand.execute({ env: 'dev' });
        const apiComponent = result.resolvedManifest.components.find(c => c.name === 'api');
        expect(apiComponent?.binds).toHaveLength(1);
        expect(apiComponent?.binds?.[0].to).toBe('database');
        expect(apiComponent?.binds?.[0].capability).toBe('db:postgres');
      });
    });

    describe('Sad Path Scenarios', () => {
      it('should fail for invalid component references', async () => {
        await fs.writeFile('service.yml', `
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

        await expect(planCommand.execute({ env: 'dev' })).rejects.toThrow(
          expect.stringContaining('nonexistent-db')
        );
      });

      it('should fail for undefined environment variables', async () => {
        await fs.writeFile('service.yml', `
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

        await expect(planCommand.execute({ env: 'dev' })).rejects.toThrow(
          expect.stringContaining('nonExistentKey')
        );
      });

      it('should fail for missing environment configuration', async () => {
        await fs.writeFile('service.yml', `
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
        prod: 1024
        # staging environment missing
        `);

        await expect(planCommand.execute({ env: 'staging' })).rejects.toThrow(
          expect.stringContaining('staging')
        );
      });
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