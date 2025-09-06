/**
 * Theme 5: Migration & Long-Term Maintenance Test Cases
 * Tests migration tools and platform evolution capabilities
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

describe('Theme 5: Migration & Long-Term Maintenance', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'migration-test-'));
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('TC-MIGRATE-01: Traditional CDK project migration', () => {
    test('should migrate traditional CDK project with identical CloudFormation output', () => {
      // Arrange: Create a traditional CDK project structure
      const traditionalCdkCode = `
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class TraditionalStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'MyVpc', {
      maxAzs: 2
    });

    const lambdaFn = new lambda.Function(this, 'ApiFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('./lambda'),
      vpc: vpc
    });

    const api = new apigateway.RestApi(this, 'MyApi', {
      restApiName: 'Traditional API'
    });

    const integration = new apigateway.LambdaIntegration(lambdaFn);
    api.root.addMethod('GET', integration);

    const database = new rds.DatabaseInstance(this, 'MyDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: vpc,
      credentials: rds.Credentials.fromGeneratedSecret('dbuser'),
      databaseName: 'myapp'
    });

    database.connections.allowDefaultPortFrom(lambdaFn);
  }
}
`;

      // Create traditional CDK project files
      fs.mkdirSync(path.join(testDir, 'traditional-cdk'), { recursive: true });
      fs.mkdirSync(path.join(testDir, 'traditional-cdk', 'lib'), { recursive: true });
      fs.mkdirSync(path.join(testDir, 'traditional-cdk', 'lambda'), { recursive: true });
      
      fs.writeFileSync(
        path.join(testDir, 'traditional-cdk', 'lib', 'stack.ts'), 
        traditionalCdkCode
      );
      
      fs.writeFileSync(
        path.join(testDir, 'traditional-cdk', 'lambda', 'index.js'),
        'exports.handler = async () => ({ statusCode: 200, body: "Hello" });'
      );

      const appCode = `
import * as cdk from 'aws-cdk-lib';
import { TraditionalStack } from './lib/stack';

const app = new cdk.App();
new TraditionalStack(app, 'TraditionalStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
  }
});
`;

      fs.writeFileSync(
        path.join(testDir, 'traditional-cdk', 'app.ts'),
        appCode
      );

      fs.writeFileSync(
        path.join(testDir, 'traditional-cdk', 'package.json'),
        JSON.stringify({
          name: 'traditional-cdk',
          version: '1.0.0',
          scripts: {
            synth: 'cdk synth'
          },
          dependencies: {
            'aws-cdk-lib': '^2.0.0',
            'constructs': '^10.0.0'
          }
        }, null, 2)
      );

      // Generate "golden" template from traditional CDK
      process.chdir(path.join(testDir, 'traditional-cdk'));
      const goldenTemplate = execSync('npx cdk synth', { encoding: 'utf8' });
      fs.writeFileSync(path.join(testDir, 'golden-template.yaml'), goldenTemplate);

      // Act: Run migration tool
      process.chdir(testDir);
      execSync(`svc migrate ./traditional-cdk --output ./migrated-project`, {
        encoding: 'utf8'
      });

      // Assert: Verify migrated project structure
      expect(fs.existsSync(path.join(testDir, 'migrated-project', 'service.yml'))).toBe(true);

      const migratedServiceYml = fs.readFileSync(
        path.join(testDir, 'migrated-project', 'service.yml'),
        'utf8'
      );

      // Verify key components were identified and migrated
      expect(migratedServiceYml).toContain('type: lambda-api');
      expect(migratedServiceYml).toContain('type: rds-postgres');
      expect(migratedServiceYml).toContain('binds:');
      expect(migratedServiceYml).toContain('capability: database:rds');

      // Generate template from migrated project and compare
      process.chdir(path.join(testDir, 'migrated-project'));
      const migratedTemplate = execSync('svc plan --output-format yaml', { encoding: 'utf8' });

      // Run diff comparison (simplified - in real implementation would use proper YAML diff)
      const diff = execSync(`diff -u ${path.join(testDir, 'golden-template.yaml')} -`, {
        input: migratedTemplate,
        encoding: 'utf8'
      }).trim();

      // Assert: Diff should be empty (or contain only acceptable differences like metadata)
      if (diff) {
        const meaningfulLines = diff.split('\n').filter(line => 
          !line.includes('Metadata') && 
          !line.includes('CDKMetadata') &&
          !line.includes('timestamp')
        );
        expect(meaningfulLines.length).toBeLessThanOrEqual(2); // Only diff header lines
      }
    });
  });

  describe('TC-REFACTOR-01: Safe resource refactoring with logical ID preservation', () => {
    test('should preserve logical IDs when moving resources between components', async () => {
      // Arrange: Create initial manifest with resource
      const initialManifest = {
        service: 'refactor-test',
        owner: 'dev-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'monolith',
            type: 'lambda-api',
            config: {
              runtime: 'nodejs18.x',
              handler: 'index.handler',
              codePath: './src'
            }
          },
          {
            name: 'database',
            type: 'rds-postgres',
            config: {
              dbName: 'app_db'
            }
          }
        ]
      };

      fs.writeFileSync(
        path.join(testDir, 'service-v1.yml'),
        JSON.stringify(initialManifest, null, 2)
      );

      // Generate initial template and capture logical IDs
      const initialResult = execSync('svc plan --manifest service-v1.yml --output-format json', {
        encoding: 'utf8'
      });
      
      const initialTemplate = JSON.parse(initialResult);
      const originalLogicalIds = Object.keys(initialTemplate.Resources);

      // Arrange: Create refactored manifest (split monolith into api + worker)
      const refactoredManifest = {
        service: 'refactor-test',
        owner: 'dev-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            config: {
              runtime: 'nodejs18.x',
              handler: 'api.handler',
              codePath: './src'
            }
          },
          {
            name: 'worker',
            type: 'lambda-worker', 
            config: {
              runtime: 'nodejs18.x',
              handler: 'worker.handler',
              codePath: './src'
            }
          },
          {
            name: 'database',
            type: 'rds-postgres',
            config: {
              dbName: 'app_db'
            }
          }
        ]
      };

      // Create logical ID mapping
      const logicalIdMap = {
        // Map original monolith Lambda to new api Lambda
        'monolithFunction': 'apiFunction',
        // Database keeps same logical ID
        'databaseInstance': 'databaseInstance'
      };

      fs.writeFileSync(
        path.join(testDir, 'service-v2.yml'),
        JSON.stringify(refactoredManifest, null, 2)
      );

      fs.writeFileSync(
        path.join(testDir, 'logical-id-map.json'),
        JSON.stringify(logicalIdMap, null, 2)
      );

      // Act: Generate refactored template with logical ID mapping
      const refactoredResult = execSync(
        'svc plan --manifest service-v2.yml --logical-id-map logical-id-map.json --output-format json',
        { encoding: 'utf8' }
      );

      const refactoredTemplate = JSON.parse(refactoredResult);

      // Assert: Verify critical resources maintain their logical IDs
      expect(refactoredTemplate.Resources.databaseInstance).toBeDefined();
      expect(refactoredTemplate.Resources.databaseInstance.Type).toBe('AWS::RDS::DBInstance');

      // Verify mapped resources use correct logical IDs
      expect(refactoredTemplate.Resources.apiFunction).toBeDefined();
      expect(refactoredTemplate.Resources.monolithFunction).toBeUndefined();

      // Verify database properties remain unchanged (no replacement)
      const originalDbResource = initialTemplate.Resources.databaseInstance;
      const refactoredDbResource = refactoredTemplate.Resources.databaseInstance;

      expect(refactoredDbResource.Properties.DatabaseName).toBe(
        originalDbResource.Properties.DatabaseName
      );
      expect(refactoredDbResource.Properties.DBInstanceClass).toBe(
        originalDbResource.Properties.DBInstanceClass
      );
    });
  });

  describe('TC-DEPRECATE-01: Component property deprecation warnings', () => {
    test('should warn about deprecated properties but allow usage', async () => {
      // Arrange: Manifest using deprecated property
      const deprecatedManifest = {
        service: 'deprecation-test',
        owner: 'dev-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            config: {
              runtime: 'nodejs18.x',
              handler: 'index.handler',
              codePath: './src',
              deadLetterQueueEnabled: true // Deprecated: use deadLetterQueue object instead
            }
          },
          {
            name: 'database',
            type: 'rds-postgres',
            config: {
              dbName: 'test_db',
              instanceSize: 'micro' // Deprecated: use instanceClass instead
            }
          }
        ]
      };

      fs.writeFileSync(
        path.join(testDir, 'deprecated-service.yml'),
        JSON.stringify(deprecatedManifest, null, 2)
      );

      // Act: Run plan command
      const result = execSync('svc plan --manifest deprecated-service.yml', {
        encoding: 'utf8'
      });

      // Assert: Command completes successfully
      expect(result).toContain('Plan completed successfully');

      // Assert: Contains deprecation warnings
      expect(result).toContain('DEPRECATION WARNING');
      expect(result).toContain('deadLetterQueueEnabled is deprecated');
      expect(result).toContain('use deadLetterQueue object instead');
      expect(result).toContain('Will be removed in version 2.0.0');

      expect(result).toContain('instanceSize is deprecated');
      expect(result).toContain('use instanceClass instead');

      // Assert: Warnings include migration guidance
      expect(result).toContain('Migration guide:');
      expect(result).toContain('https://platform.company.com/docs/migration');
    });

    test('should provide automatic migration suggestions for deprecated patterns', async () => {
      const legacyPatternManifest = {
        service: 'legacy-pattern-test',
        owner: 'dev-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            config: {
              runtime: 'nodejs18.x',
              handler: 'index.handler',
              codePath: './src'
            },
            // Legacy binding pattern
            database: {
              type: 'postgres',
              name: 'mydb'
            }
          }
        ]
      };

      fs.writeFileSync(
        path.join(testDir, 'legacy-service.yml'), 
        JSON.stringify(legacyPatternManifest, null, 2)
      );

      const result = execSync('svc plan --manifest legacy-service.yml', {
        encoding: 'utf8'
      });

      // Assert: Automatic migration suggestion provided
      expect(result).toContain('MIGRATION SUGGESTION');
      expect(result).toContain('Legacy binding pattern detected');
      expect(result).toContain('Recommended modern equivalent:');
      expect(result).toContain('binds:');
      expect(result).toContain('- to: mydb');
      expect(result).toContain('capability: database:rds');

      // Should show before/after comparison
      expect(result).toContain('# Before (deprecated)');
      expect(result).toContain('# After (recommended)');
    });

    test('should track deprecation usage for platform metrics', async () => {
      const trackingManifest = {
        service: 'tracking-test',
        owner: 'metrics-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            config: {
              runtime: 'nodejs16.x', // Deprecated runtime
              handler: 'index.handler',
              codePath: './src'
            }
          }
        ]
      };

      fs.writeFileSync(
        path.join(testDir, 'tracking-service.yml'),
        JSON.stringify(trackingManifest, null, 2)
      );

      // Enable telemetry mode
      process.env.PLATFORM_TELEMETRY = 'true';

      try {
        const result = execSync('svc plan --manifest tracking-service.yml', {
          encoding: 'utf8'
        });

        // Assert: Telemetry data is captured
        expect(result).toContain('Telemetry: deprecation usage recorded');

        // Check for telemetry file (in real implementation)
        const telemetryFile = path.join(process.env.HOME || '/tmp', '.platform-telemetry.json');
        if (fs.existsSync(telemetryFile)) {
          const telemetryData = JSON.parse(fs.readFileSync(telemetryFile, 'utf8'));
          
          expect(telemetryData.deprecationUsage).toContainEqual({
            service: 'tracking-test',
            deprecatedFeature: 'runtime.nodejs16.x',
            replacementFeature: 'runtime.nodejs18.x',
            timestamp: expect.any(String),
            component: 'api'
          });
        }

      } finally {
        delete process.env.PLATFORM_TELEMETRY;
      }
    });
  });
});