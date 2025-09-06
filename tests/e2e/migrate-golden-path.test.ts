/**
 * Migration Tool Golden Path E2E Test
 * TC-MIGRATE-E2E-01: Complete end-to-end migration with only mappable resources
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import * as yaml from 'yaml';

describe('TC-MIGRATE-E2E-01: Golden Path Migration Test', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'migrate-e2e-test-'));
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('should achieve zero CloudFormation diff for fully mappable CDK project', async () => {
    // Arrange: Create a "Golden Path" CDK project with only mappable resources
    const cdkProject = createGoldenPathCdkProject('golden-cdk-project');

    // Step 1: Generate "golden" template from original CDK
    process.chdir(cdkProject);
    
    // Install dependencies to make synthesis work
    execSync('npm install aws-cdk-lib constructs @types/node typescript ts-node', { 
      stdio: 'pipe' 
    });
    
    const goldenTemplate = execSync('npx cdk synth GoldenPathStack --json', { 
      encoding: 'utf8' 
    });
    
    const goldenTemplatePath = path.join(testDir, 'golden-template.json');
    fs.writeFileSync(goldenTemplatePath, goldenTemplate);

    process.chdir(testDir);

    // Step 2: Run svc migrate on the CDK project
    const migrationResult = execSync(`svc migrate --cdk-project ${cdkProject} --stack-name GoldenPathStack --service-name golden-service --output ./migrated-service --compliance commercial --non-interactive`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    // Verify migration completed successfully
    expect(migrationResult).toContain('Migration Complete!');
    expect(migrationResult).toContain('Final Diff Result: NO CHANGES');

    // Step 3: Verify generated files exist
    const migratedDir = path.join(testDir, 'migrated-service');
    expect(fs.existsSync(path.join(migratedDir, 'service.yml'))).toBe(true);
    expect(fs.existsSync(path.join(migratedDir, 'logical-id-map.json'))).toBe(true);
    expect(fs.existsSync(path.join(migratedDir, 'patches.ts'))).toBe(true);
    expect(fs.existsSync(path.join(migratedDir, 'MIGRATION_REPORT.md'))).toBe(true);

    // Step 4: Run svc plan on migrated service
    process.chdir(migratedDir);
    const planResult = execSync('svc plan --output-format json --output-file migrated-template.json', {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    expect(planResult).toContain('Plan completed successfully');

    // Step 5: Compare templates for zero diff
    const migratedTemplatePath = path.join(migratedDir, 'migrated-template.json');
    expect(fs.existsSync(migratedTemplatePath)).toBe(true);

    // Parse both templates for comparison
    const originalTemplate = JSON.parse(fs.readFileSync(goldenTemplatePath, 'utf8'));
    const migratedTemplate = JSON.parse(fs.readFileSync(migratedTemplatePath, 'utf8'));

    // Verify resource counts match
    const originalResources = Object.keys(originalTemplate.Resources || {});
    const migratedResources = Object.keys(migratedTemplate.Resources || {});
    
    expect(migratedResources.length).toBe(originalResources.length);

    // Verify all original resource logical IDs are preserved
    originalResources.forEach(originalId => {
      expect(migratedTemplate.Resources[originalId]).toBeDefined();
      expect(migratedTemplate.Resources[originalId].Type).toBe(originalTemplate.Resources[originalId].Type);
    });

    // Step 6: Run final cdk diff - should be empty
    const diffResult = execSync(`diff -u ${goldenTemplatePath} ${migratedTemplatePath}`, {
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();

    // Allow only non-functional differences (metadata, timestamps, etc.)
    const functionalDifferences = diffResult.split('\n').filter(line => {
      const nonFunctionalPatterns = [
        /^\s*"Metadata":/,
        /CDKMetadata/,
        /timestamp/,
        /^\s*@@/,  // diff headers
        /^\s*---/,  // diff headers
        /^\s*\+\+\+/  // diff headers
      ];
      
      return line.trim() && 
             (line.startsWith('+') || line.startsWith('-')) &&
             !nonFunctionalPatterns.some(pattern => pattern.test(line));
    });

    expect(functionalDifferences).toHaveLength(0);

    process.chdir(testDir);
  }, 120000); // 2 minute timeout for full E2E test

  test('should correctly map all resource types in golden path', async () => {
    // Arrange: Create CDK project with multiple mappable resource types
    const cdkProject = createMultiResourceCdkProject('multi-resource-project');

    // Act: Run migration
    process.chdir(cdkProject);
    execSync('npm install aws-cdk-lib constructs @types/node typescript ts-node', { 
      stdio: 'pipe' 
    });
    process.chdir(testDir);

    execSync(`svc migrate --cdk-project ${cdkProject} --stack-name MultiResourceStack --service-name multi-service --output ./multi-migrated --compliance commercial --non-interactive`, {
      stdio: 'pipe'
    });

    // Assert: Verify service.yml contains all expected components
    const serviceYmlPath = path.join(testDir, 'multi-migrated', 'service.yml');
    const serviceManifest = yaml.parse(fs.readFileSync(serviceYmlPath, 'utf8'));

    expect(serviceManifest.service).toBe('multi-service');
    expect(serviceManifest.components).toHaveLength(4); // Lambda, RDS, SQS, S3

    // Verify component types
    const componentTypes = serviceManifest.components.map((c: any) => c.type);
    expect(componentTypes).toContain('lambda-api');
    expect(componentTypes).toContain('rds-postgres');
    expect(componentTypes).toContain('sqs-queue');
    expect(componentTypes).toContain('s3-bucket');

    // Verify logical ID mapping preserves all resources
    const logicalIdMapPath = path.join(testDir, 'multi-migrated', 'logical-id-map.json');
    const logicalIdMap = JSON.parse(fs.readFileSync(logicalIdMapPath, 'utf8'));
    
    expect(Object.keys(logicalIdMap).length).toBeGreaterThanOrEqual(4);
  });

  // Helper function to create Golden Path CDK project
  function createGoldenPathCdkProject(name: string): string {
    const projectPath = path.join(testDir, name);
    fs.mkdirSync(projectPath);

    // Create package.json
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
      name,
      version: '1.0.0',
      scripts: {
        build: 'tsc',
        synth: 'cdk synth'
      },
      dependencies: {
        'aws-cdk-lib': '^2.0.0',
        'constructs': '^10.0.0'
      },
      devDependencies: {
        '@types/node': '^18.0.0',
        'typescript': '^4.0.0',
        'ts-node': '^10.0.0'
      }
    }, null, 2));

    // Create cdk.json
    fs.writeFileSync(path.join(projectPath, 'cdk.json'), JSON.stringify({
      app: 'npx ts-node app.ts',
      context: {
        '@aws-cdk/core:enableStackNameDuplicates': true,
        '@aws-cdk/core:stackRelativeExports': true
      }
    }, null, 2));

    // Create tsconfig.json
    fs.writeFileSync(path.join(projectPath, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        lib: ['es2020'],
        declaration: true,
        strict: true,
        noImplicitAny: true,
        strictNullChecks: true,
        noImplicitThis: true,
        alwaysStrict: true,
        noUnusedLocals: false,
        noUnusedParameters: false,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: false,
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true
      }
    }, null, 2));

    // Create app.ts with Golden Path resources (all mappable)
    fs.writeFileSync(path.join(projectPath, 'app.ts'), `
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as sqs from 'aws-cdk-lib/aws-sqs';

export class GoldenPathStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC for RDS (will be grouped with database)
    const vpc = new ec2.Vpc(this, 'AppVpc', {
      maxAzs: 2,
      natGateways: 1
    });

    // Lambda API function
    const apiFunction = new lambda.Function(this, 'ApiFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(\`
        exports.handler = async (event) => {
          return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Hello from migrated API!' })
          };
        };
      \`)
    });

    // RDS PostgreSQL database  
    const database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: vpc,
      credentials: rds.Credentials.fromGeneratedSecret('dbuser'),
      databaseName: 'appdb',
      multiAz: false,
      allocatedStorage: 20,
      storageEncrypted: true,
      deleteAutomatedBackups: true,
      backupRetention: cdk.Duration.days(7),
      deletionProtection: false
    });

    // SQS Queue
    const queue = new sqs.Queue(this, 'TaskQueue', {
      visibilityTimeout: cdk.Duration.seconds(300),
      retentionPeriod: cdk.Duration.days(4)
    });

    // Grant Lambda access to database and queue
    database.connections.allowDefaultPortFrom(apiFunction);
    queue.grantSendMessages(apiFunction);
    queue.grantConsumeMessages(apiFunction);

    // Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: apiFunction.functionArn,
      description: 'API Function ARN'
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.instanceEndpoint.hostname,
      description: 'Database endpoint'
    });

    new cdk.CfnOutput(this, 'QueueUrl', {
      value: queue.queueUrl,
      description: 'SQS Queue URL'
    });
  }
}

const app = new cdk.App();
new GoldenPathStack(app, 'GoldenPathStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
  }
});
`);

    // Create source directory with sample code
    fs.mkdirSync(path.join(projectPath, 'src'), { recursive: true });
    fs.writeFileSync(path.join(projectPath, 'src/index.js'), `
exports.handler = async (event) => {
  console.log('Request:', JSON.stringify(event));
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello from migrated Lambda!' })
  };
};
`);

    return projectPath;
  }

  function createMultiResourceCdkProject(name: string): string {
    const projectPath = path.join(testDir, name);
    fs.mkdirSync(projectPath);

    // Similar setup to golden path but with more diverse resources
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
      name,
      version: '1.0.0',
      dependencies: {
        'aws-cdk-lib': '^2.0.0',
        'constructs': '^10.0.0'
      }
    }));

    fs.writeFileSync(path.join(projectPath, 'cdk.json'), JSON.stringify({
      app: 'npx ts-node app.ts'
    }));

    fs.writeFileSync(path.join(projectPath, 'app.ts'), `
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class MultiResourceStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });

    // Lambda with API Gateway (should map to lambda-api)
    const apiLambda = new lambda.Function(this, 'ApiLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => ({ statusCode: 200 });')
    });

    const api = new apigateway.RestApi(this, 'Api', {
      restApiName: 'Multi Resource API'
    });
    
    api.root.addMethod('GET', new apigateway.LambdaIntegration(apiLambda));

    // RDS Database (should map to rds-postgres)
    const db = new rds.DatabaseInstance(this, 'Db', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15_4 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: vpc,
      credentials: rds.Credentials.fromGeneratedSecret('admin'),
      databaseName: 'testdb'
    });

    // SQS Queue (should map to sqs-queue)  
    const taskQueue = new sqs.Queue(this, 'TaskQueue', {
      visibilityTimeout: cdk.Duration.seconds(300)
    });

    // S3 Bucket (should map to s3-bucket)
    const bucket = new s3.Bucket(this, 'DataBucket', {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED
    });
  }
}

const app = new cdk.App();
new MultiResourceStack(app, 'MultiResourceStack');
`);

    return projectPath;
  }
});