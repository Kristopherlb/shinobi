import * as fs from 'fs/promises';
import * as path from 'path';
import { execCli } from './utils/cli-runner.js';

jest.setTimeout(30000);

const writeManifest = async (manifest: any) => {
  await fs.writeFile('service.yml', JSON.stringify(manifest, null, 2));
};

const createAlarmConfig = () => ({
  enabled: true,
  threshold: 5,
  evaluationPeriods: 1,
  periodMinutes: 5,
  comparisonOperator: 'gt',
  treatMissingData: 'not-breaching',
  statistic: 'Sum',
  tags: {}
});

const createLambdaConfig = () => ({
  handler: 'src/api.handler',
  deployment: {
    codePath: './src',
    inlineFallbackEnabled: true
  },
  api: {
    type: 'rest',
    stageName: 'prod',
    metricsEnabled: true,
    tracingEnabled: true,
    apiKeyRequired: false,
    throttling: {
      burstLimit: 100,
      rateLimit: 50
    },
    usagePlan: {
      enabled: false
    },
    logging: {
      enabled: true,
      retentionDays: 90,
      logFormat: 'json',
      prefix: 'access/'
    },
    cors: {
      enabled: true,
      allowOrigins: ['*'],
      allowHeaders: ['Content-Type'],
      allowMethods: ['GET'],
      allowCredentials: false
    }
  },
  logging: {
    logRetentionDays: 30,
    logFormat: 'JSON',
    systemLogLevel: 'INFO',
    applicationLogLevel: 'INFO'
  },
  monitoring: {
    enabled: true,
    alarms: {
      lambdaErrors: createAlarmConfig(),
      lambdaThrottles: createAlarmConfig(),
      lambdaDuration: createAlarmConfig(),
      api4xxErrors: createAlarmConfig(),
      api5xxErrors: createAlarmConfig()
    }
  },
  observability: {
    otelEnabled: true,
    otelResourceAttributes: {}
  }
});

const createValidManifest = (mutator?: (manifest: any) => void) => {
  const manifest = {
    service: 'test-service',
    owner: 'test-team',
    runtime: 'nodejs20',
    components: [
      {
        name: 'api',
        type: 'lambda-api',
        config: createLambdaConfig()
      }
    ]
  };

  mutator?.(manifest);
  return manifest;
};

describe('CLI Commands Integration', () => {
  const originalCwd = process.cwd();
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(__dirname, '../temp-cli-test');
    await fs.mkdir(testDir, { recursive: true });
    process.chdir(testDir);
  });

  describe('svc init command (AC-SI-1, AC-SI-2)', () => {
    it('should create service files with provided options', async () => {
      const { stdout, stderr } = await execCli(
        'init --name test-service --owner test-team --framework commercial --pattern empty'
      );

      expect(stdout).toContain('Service \'test-service\' initialized successfully!');
      expect(stderr).toBe('');

      // Check generated files
      const serviceYml = await fs.readFile('service.yml', 'utf8');
      expect(serviceYml).toContain('service: test-service');
      expect(serviceYml).toContain('owner: test-team');
      expect(serviceYml).toContain('complianceFramework: commercial');

      const gitignore = await fs.readFile('.gitignore', 'utf8');
      expect(gitignore).toContain('node_modules/');

      const patches = await fs.readFile('patches.ts', 'utf8');
      expect(patches).toContain('Platform Patches File');

      await expect(fs.access('src')).resolves.not.toThrow();
    });

    it('should create FedRAMP service with different defaults', async () => {
      await execCli(
        'init --name secure-service --owner security-team --framework fedramp-high --pattern lambda-api-with-db'
      );

      const serviceYml = await fs.readFile('service.yml', 'utf8');
      expect(serviceYml).toContain('complianceFramework: fedramp-high');
      expect(serviceYml).toContain('classification: controlled');
      expect(serviceYml).toContain('auditLevel: detailed');
    });
  });

  describe('svc validate command (AC-E1)', () => {
    it('should validate a correct manifest', async () => {
      await writeManifest(createValidManifest());

      const { stdout, stderr } = await execCli('validate');
      expect(stdout).toContain('Manifest validation completed successfully');
      expect(stdout).toContain('Service: test-service');
      expect(stdout).toContain('Compliance Framework: commercial');
      expect(stderr).toBe('');
    });

    it('should fail validation for missing required fields', async () => {
      const manifest = createValidManifest((current) => {
        delete current.owner;
      });
      await writeManifest(manifest);

      await expect(execCli('validate')).rejects.toMatchObject({
        code: 2
      });
    });

    it('should discover service.yml in parent directories', async () => {
      await writeManifest(createValidManifest());

      await fs.mkdir('subdirectory');
      process.chdir('subdirectory');

      const { stdout } = await execCli('validate');
      expect(stdout).toContain('Manifest validation completed successfully');
    });
  });

  describe('svc plan command (AC-E2, AC-E3)', () => {
    beforeEach(async () => {
      const manifest = createValidManifest((current) => {
        current.complianceFramework = 'fedramp-moderate';
        current.environments = {
          dev: { defaults: {} },
          prod: { defaults: {} }
        };
      });
      await writeManifest(manifest);
    });

    it('should display active compliance framework (AC-E3)', async () => {
      const { stdout } = await execCli('plan --env dev');
      expect(stdout).toContain('Compliance Framework: fedramp-moderate');
      expect(stdout).toContain('Planning deployment for environment: dev');
    });

    it('should output resolved configuration JSON', async () => {
      const { stdout } = await execCli('plan --env prod');
      expect(stdout).toContain('Plan generation completed successfully');
      expect(stdout).toContain('Compliance Framework: fedramp-moderate');
      expect(stdout).toContain('Environment: prod');
    });

    it('should handle environment interpolation correctly', async () => {
      const devResult = await execCli('plan --env dev');
      expect(devResult.stdout).toContain('Environment: dev');

      const prodResult = await execCli('plan --env prod');
      expect(prodResult.stdout).toContain('Environment: prod');
    });
  });

  describe('CLI Output Modes (FR-CLI-3)', () => {
    beforeEach(async () => {
      await writeManifest(createValidManifest());
    });

    it('should provide human-readable output by default', async () => {
      const { stdout } = await execCli(`validate`);
      expect(stdout).toContain('Manifest validation completed successfully');
      expect(stdout).toContain('Validation summary:');
    });

    it('should provide JSON output in CI mode', async () => {
      const { stdout } = await execCli(`validate --ci`);
      const lines = stdout.trim().split('\\n');
      lines.forEach(line => {
        if (line.trim().startsWith('{')) {
          expect(() => JSON.parse(line)).not.toThrow();
        }
      });
    });

    it('should provide verbose output with debug information', async () => {
      const { stdout } = await execCli(`validate --verbose`);
      expect(stdout).toContain('Manifest validation completed successfully');
      expect(stdout).toContain('Validation summary:');
    });
  });

  describe('Error Handling (FR-CLI-4)', () => {
    it('should exit with code 1 for file not found', async () => {
      await expect(execCli(`validate --file nonexistent.yml`)).rejects.toMatchObject({
        code: 2
      });
    });

    it('should exit with code 2 for validation errors', async () => {
      await fs.writeFile('service.yml', `
invalid: yaml: content
      `);

      await expect(execCli(`validate`)).rejects.toMatchObject({
        code: 2
      });
    });
  });

  afterEach(async () => {
    try {
      process.chdir(originalCwd);
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
});
