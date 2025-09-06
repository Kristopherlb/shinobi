/**
 * Migration Report Validation Tests  
 * TC-MIGRATE-RPT-01: Validates migration report accuracy and completeness
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

describe('TC-MIGRATE-RPT-01: Migration Report Validation', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'migrate-report-test-'));
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('should generate accurate report for 100% successful migration', async () => {
    // Arrange: Create Golden Path CDK project
    const cdkProject = createSuccessfulMigrationProject('successful-migration');

    // Act: Run migration
    execSync(`svc migrate --cdk-project ${cdkProject} --stack-name SuccessfulStack --service-name successful-service --output ./migrated --compliance commercial --non-interactive`, {
      stdio: 'pipe'
    });

    // Assert: Parse and validate migration report
    const reportPath = path.join(testDir, 'migrated', 'MIGRATION_REPORT.md');
    expect(fs.existsSync(reportPath)).toBe(true);

    const reportContent = fs.readFileSync(reportPath, 'utf8');

    // Verify executive summary shows 100% success
    expect(reportContent).toContain('**Migration Status:** COMPLETED');
    expect(reportContent).toContain('**Final Diff Result:** **✅ ZERO CHANGES** - Safe to deploy');
    expect(reportContent).toMatch(/\*\*Mapping Success Rate:\*\* 100%/);
    expect(reportContent).toContain('**Manual Action Required:** 0 resources');

    // Verify successful components section
    expect(reportContent).toContain('### ✅ Successfully Migrated Components');
    expect(reportContent).not.toContain('No components were successfully migrated');

    // Verify no unmappable resources
    expect(reportContent).toContain('🎉 **All resources were successfully migrated!** No manual action required.');

    // Verify technical details show zero changes
    expect(reportContent).toContain('Logical ID preservation is working correctly');
    expect(reportContent).toContain('✅ Service manifest is valid and can be deployed');
    expect(reportContent).toContain('No differences detected');

    // Verify next steps for successful migration
    expect(reportContent).toContain('Update Service Metadata');
    expect(reportContent).toContain('Test Locally');
    expect(reportContent).toContain('🎉 Celebrate');
  }, 60000);

  test('should generate accurate report for partial migration with unmappable resources', async () => {
    // Arrange: Create CDK project with unmappable resources
    const cdkProject = createPartialMigrationProject('partial-migration');

    // Act: Run migration  
    execSync(`svc migrate --cdk-project ${cdkProject} --stack-name PartialStack --service-name partial-service --output ./partial-migrated --compliance commercial --non-interactive`, {
      stdio: 'pipe'
    });

    // Assert: Parse and validate report
    const reportPath = path.join(testDir, 'partial-migrated', 'MIGRATION_REPORT.md');
    const reportContent = fs.readFileSync(reportPath, 'utf8');

    // Verify executive summary shows partial success
    expect(reportContent).toContain('**Migration Status:** COMPLETED WITH WARNINGS');
    expect(reportContent).toMatch(/\*\*Mapping Success Rate:\*\* [6-8][0-9]%/); // Should be 60-89%
    expect(reportContent).toMatch(/\*\*Manual Action Required:\*\* [1-9] resources/);

    // Verify unmappable resources section
    expect(reportContent).toContain('### ⚠️ Action Required: Manually Migrate Unmappable Resources');
    expect(reportContent).not.toContain('🎉 **All resources were successfully migrated!**');

    // Check for specific unmappable resource details
    expect(reportContent).toContain('AWS::ElastiCache::CacheCluster');
    expect(reportContent).toContain('**Original CloudFormation Definition:**');
    expect(reportContent).toContain('```json');
    expect(reportContent).toContain('**How to migrate this resource:**');
    expect(reportContent).toContain('patches.ts');

    // Verify next steps include manual work
    expect(reportContent).toContain('**Review Unmappable Resources**');
    expect(reportContent).toContain('**Test Patches**');
  });

  test('should accurately report resource mapping statistics', async () => {
    // Arrange: Create project with known resource composition
    const cdkProject = createKnownResourceProject('known-resources');

    // Act: Run migration
    execSync(`svc migrate --cdk-project ${cdkProject} --stack-name KnownStack --service-name known-service --output ./known-migrated --compliance commercial --non-interactive`, {
      stdio: 'pipe'
    });

    // Assert: Verify resource counts in report
    const reportPath = path.join(testDir, 'known-migrated', 'MIGRATION_REPORT.md');
    const reportContent = fs.readFileSync(reportPath, 'utf8');

    // Verify resource inventory section
    expect(reportContent).toContain('### Original Stack Inventory');
    expect(reportContent).toContain('**Total Resources:** 8'); // Known total from createKnownResourceProject

    // Verify resource type breakdown
    expect(reportContent).toContain('AWS::Lambda::Function: 2');
    expect(reportContent).toContain('AWS::RDS::DBInstance: 1');
    expect(reportContent).toContain('AWS::SQS::Queue: 1');
    expect(reportContent).toContain('AWS::ElastiCache::CacheCluster: 1'); // Unmappable

    // Verify mapping results section
    expect(reportContent).toContain('### Resource Mapping Results');
    expect(reportContent).toContain('**Component Types Created:**');
    expect(reportContent).toContain('lambda-api: 1');
    expect(reportContent).toContain('lambda-worker: 1');
    expect(reportContent).toContain('rds-postgres: 1');
    expect(reportContent).toContain('sqs-queue: 1');

    // Verify template comparison
    expect(reportContent).toContain('| Original Resources | 8 |');
    expect(reportContent).toMatch(/\| Migrated Resources \| [7-8] \|/);
  });

  test('should provide detailed next steps based on migration outcome', async () => {
    // Arrange: Create project requiring different types of manual intervention
    const cdkProject = createComplexMigrationProject('complex-migration');

    // Act: Run migration
    execSync(`svc migrate --cdk-project ${cdkProject} --stack-name ComplexStack --service-name complex-service --output ./complex-migrated --compliance fedramp-moderate --non-interactive`, {
      stdio: 'pipe'
    });

    // Assert: Verify next steps are comprehensive and actionable
    const reportPath = path.join(testDir, 'complex-migrated', 'MIGRATION_REPORT.md');
    const reportContent = fs.readFileSync(reportPath, 'utf8');

    // Should contain numbered action items
    expect(reportContent).toContain('## Next Steps');
    expect(reportContent).toMatch(/1\. \*\*Review Unmappable Resources\*\*/);
    expect(reportContent).toMatch(/2\. \*\*Test Patches\*\*/);
    expect(reportContent).toMatch(/[3-5]\. \*\*Update Service Metadata\*\*/);

    // Should contain specific commands to run
    expect(reportContent).toContain('svc plan');
    expect(reportContent).toContain('svc local up');
    expect(reportContent).toContain('svc deploy');

    // Should contain FedRAMP-specific guidance for chosen compliance framework
    expect(reportContent).toContain('fedramp-moderate');
  });

  // Helper functions to create test CDK projects
  function createSuccessfulMigrationProject(name: string): string {
    const projectPath = path.join(testDir, name);
    fs.mkdirSync(projectPath);

    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
      name,
      dependencies: { 'aws-cdk-lib': '^2.0.0', 'constructs': '^10.0.0' }
    }));

    fs.writeFileSync(path.join(projectPath, 'cdk.json'), JSON.stringify({
      app: 'npx ts-node app.ts'
    }));

    // Create project with only mappable resources
    fs.writeFileSync(path.join(projectPath, 'app.ts'), `
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class SuccessfulStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });
    
    new lambda.Function(this, 'Function', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};')
    });

    new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15_4 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: vpc,
      credentials: rds.Credentials.fromGeneratedSecret('admin'),
      databaseName: 'testdb'
    });
  }
}

const app = new cdk.App();
new SuccessfulStack(app, 'SuccessfulStack');
`);

    return projectPath;
  }

  function createPartialMigrationProject(name: string): string {
    const projectPath = path.join(testDir, name);
    fs.mkdirSync(projectPath);

    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
      name,
      dependencies: { 'aws-cdk-lib': '^2.0.0', 'constructs': '^10.0.0' }
    }));

    fs.writeFileSync(path.join(projectPath, 'cdk.json'), JSON.stringify({
      app: 'npx ts-node app.ts'
    }));

    // Include unmappable resources
    fs.writeFileSync(path.join(projectPath, 'app.ts'), `
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class PartialStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    // Mappable resource
    new lambda.Function(this, 'MappableFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};')
    });

    const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });

    // Unmappable resource - ElastiCache not supported by platform yet
    new elasticache.CfnCacheCluster(this, 'Cache', {
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1
    });

    // Custom resource - unmappable
    new cdk.CustomResource(this, 'CustomResource', {
      serviceToken: 'arn:aws:lambda:us-east-1:123456789012:function:custom-resource-handler'
    });
  }
}

const app = new cdk.App();
new PartialStack(app, 'PartialStack');
`);

    return projectPath;
  }

  function createKnownResourceProject(name: string): string {
    const projectPath = path.join(testDir, name);
    fs.mkdirSync(projectPath);

    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
      name,
      dependencies: { 'aws-cdk-lib': '^2.0.0', 'constructs': '^10.0.0' }
    }));

    fs.writeFileSync(path.join(projectPath, 'cdk.json'), JSON.stringify({
      app: 'npx ts-node app.ts'
    }));

    // Create exactly 8 resources for precise counting
    fs.writeFileSync(path.join(projectPath, 'app.ts'), `
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class KnownStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 }); // 1 resource

    // 2 Lambda functions
    new lambda.Function(this, 'ApiFunction', { // 2 resources  
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'api.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};')
    });

    new lambda.Function(this, 'WorkerFunction', { // 3 resources
      runtime: lambda.Runtime.NODEJS_18_X, 
      handler: 'worker.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};')
    });

    // 1 RDS instance
    new rds.DatabaseInstance(this, 'Database', { // 4 resources
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15_4 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: vpc,
      credentials: rds.Credentials.fromGeneratedSecret('admin'),
      databaseName: 'testdb'
    });

    // 1 SQS queue
    new sqs.Queue(this, 'TaskQueue'); // 5 resources

    // 1 ElastiCache cluster (unmappable)
    new elasticache.CfnCacheCluster(this, 'RedisCache', { // 6 resources
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1
    });

    // Additional resources to reach exactly 8
    new lambda.Permission(this, 'InvokePermission', { // 7 resources
      functionName: 'ApiFunction',
      principal: new cdk.ServicePrincipal('apigateway.amazonaws.com'),
      action: 'lambda:InvokeFunction'
    });

    new cdk.CfnOutput(this, 'OutputResource', { // 8 resources (counts as resource in some CDK versions)
      value: 'test-output'
    });
  }
}

const app = new cdk.App();
new KnownStack(app, 'KnownStack');
`);

    return projectPath;
  }

  function createComplexMigrationProject(name: string): string {
    const projectPath = path.join(testDir, name);
    fs.mkdirSync(projectPath);

    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
      name,
      dependencies: { 'aws-cdk-lib': '^2.0.0', 'constructs': '^10.0.0' }
    }));

    fs.writeFileSync(path.join(projectPath, 'cdk.json'), JSON.stringify({
      app: 'npx ts-node app.ts'
    }));

    // Complex scenario with multiple unmappable resources
    fs.writeFileSync(path.join(projectPath, 'app.ts'), `
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as events from 'aws-cdk-lib/aws-events';

export class ComplexStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    // Mappable resource
    new lambda.Function(this, 'Function', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};')
    });

    // Multiple unmappable resources requiring different patch strategies
    new route53.HostedZone(this, 'HostedZone', {
      zoneName: 'example.com'
    });

    new cloudwatch.Alarm(this, 'CustomAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'Custom',
        metricName: 'TestMetric'
      }),
      threshold: 100
    });

    new events.Rule(this, 'EventRule', {
      eventPattern: {
        source: ['custom.app']
      }
    });
  }
}

const app = new cdk.App();
new ComplexStack(app, 'ComplexStack');
`);

    return projectPath;
  }
});