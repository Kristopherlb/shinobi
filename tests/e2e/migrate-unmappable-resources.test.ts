/**
 * Unmappable Resources Migration Test
 * TC-MIGRATE-E2E-02: Tests handling of resources that cannot be automatically mapped
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

describe('TC-MIGRATE-E2E-02: Unmappable Resources Test', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'migrate-unmappable-test-'));
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('should create patches.ts file with unmappable resource definitions', async () => {
    // Arrange: Create CDK project with unmappable resources
    const cdkProject = createUnmappableResourceProject('unmappable-project');

    // Act: Run migration
    execSync(`svc migrate --cdk-project ${cdkProject} --stack-name UnmappableStack --service-name unmappable-service --output ./unmappable-migrated --compliance commercial --non-interactive`, {
      stdio: 'pipe'
    });

    // Assert: Verify patches.ts file was created
    const patchesPath = path.join(testDir, 'unmappable-migrated', 'patches.ts');
    expect(fs.existsSync(patchesPath)).toBe(true);

    const patchesContent = fs.readFileSync(patchesPath, 'utf8');

    // Verify patches.ts contains unmappable resource information
    expect(patchesContent).toContain('Contains unmappable resources that require manual migration');
    expect(patchesContent).toContain('TODO: Manually add the following unmappable resources:');

    // Verify Custom::Resource is included with CloudFormation definition
    expect(patchesContent).toContain('AWS::CloudFormation::CustomResource');
    expect(patchesContent).toContain('No mapping available');
    expect(patchesContent).toContain('Add manually using patches.ts with L1 constructs');

    // Verify ElastiCache resource is included
    expect(patchesContent).toContain('AWS::ElastiCache::CacheCluster');
    expect(patchesContent).toContain('"CacheNodeType": "cache.t3.micro"');
    expect(patchesContent).toContain('"Engine": "redis"');

    // Verify suggested actions are provided
    expect(patchesContent).toContain('Suggested Action:');
    expect(patchesContent).toContain('ElastiCache not yet supported by platform');
  }, 60000);

  test('should list unmappable resources in MIGRATION_REPORT.md under "Action Required" section', async () => {
    // Arrange: Create project with mix of mappable and unmappable resources
    const cdkProject = createMixedResourceProject('mixed-project');

    // Act: Run migration
    execSync(`svc migrate --cdk-project ${cdkProject} --stack-name MixedStack --service-name mixed-service --output ./mixed-migrated --compliance commercial --non-interactive`, {
      stdio: 'pipe'
    });

    // Assert: Verify migration report
    const reportPath = path.join(testDir, 'mixed-migrated', 'MIGRATION_REPORT.md');
    const reportContent = fs.readFileSync(reportPath, 'utf8');

    // Verify "Action Required" section exists and contains unmappable resources
    expect(reportContent).toContain('### ⚠️ Action Required: Manually Migrate Unmappable Resources');
    expect(reportContent).not.toContain('🎉 **All resources were successfully migrated!**');

    // Verify unmappable resources are listed with details
    expect(reportContent).toMatch(/\d+ resources could not be automatically migrated/);

    // Check for specific unmappable resource entries
    expect(reportContent).toContain('#### 1.'); // First unmappable resource
    expect(reportContent).toContain('AWS::ElastiCache::CacheCluster');
    expect(reportContent).toContain('**Reason:**');
    expect(reportContent).toContain('**Suggested Action:**');
    expect(reportContent).toContain('**Original CloudFormation Definition:**');
    expect(reportContent).toContain('```json');

    // Verify migration instructions are provided
    expect(reportContent).toContain('**How to migrate this resource:**');
    expect(reportContent).toContain('1. Review the original CloudFormation definition above');
    expect(reportContent).toContain('2. Add equivalent code to `patches.ts`');
    expect(reportContent).toContain('3. Run `svc plan` to verify');
    expect(reportContent).toContain('4. Run `cdk diff` to ensure no unintended changes');
  });

  test('should provide complete CloudFormation JSON for each unmappable resource', async () => {
    // Arrange: Create project with complex unmappable resource
    const cdkProject = createComplexUnmappableProject('complex-unmappable');

    // Act: Run migration
    execSync(`svc migrate --cdk-project ${cdkProject} --stack-name ComplexStack --service-name complex-service --output ./complex-migrated --compliance commercial --non-interactive`, {
      stdio: 'pipe'
    });

    // Assert: Verify complete CloudFormation definitions are provided
    const reportPath = path.join(testDir, 'complex-migrated', 'MIGRATION_REPORT.md');
    const reportContent = fs.readFileSync(reportPath, 'utf8');

    // Check for complete Route53 hosted zone definition
    expect(reportContent).toContain('AWS::Route53::HostedZone');
    expect(reportContent).toContain('"Type": "AWS::Route53::HostedZone"');
    expect(reportContent).toContain('"Properties": {');
    expect(reportContent).toContain('"Name": "example.com"');

    // Check for CloudWatch alarm definition with all properties
    expect(reportContent).toContain('AWS::CloudWatch::Alarm');
    expect(reportContent).toContain('"MetricName"');
    expect(reportContent).toContain('"Namespace"');
    expect(reportContent).toContain('"Threshold"');

    // Verify JSON is properly formatted and complete
    const jsonBlocks = reportContent.match(/```json\n([\s\S]*?)\n```/g);
    expect(jsonBlocks).toBeTruthy();
    expect(jsonBlocks!.length).toBeGreaterThan(0);

    // Verify each JSON block is valid JSON
    jsonBlocks!.forEach(block => {
      const jsonContent = block.replace(/```json\n/, '').replace(/\n```/, '');
      expect(() => JSON.parse(jsonContent)).not.toThrow();
    });
  });

  test('should maintain accurate success rate statistics with unmappable resources', async () => {
    // Arrange: Create project with known ratio of mappable to unmappable
    const cdkProject = createKnownRatioProject('known-ratio'); // 3 mappable, 2 unmappable

    // Act: Run migration
    execSync(`svc migrate --cdk-project ${cdkProject} --stack-name RatioStack --service-name ratio-service --output ./ratio-migrated --compliance commercial --non-interactive`, {
      stdio: 'pipe'
    });

    // Assert: Verify statistics in migration report
    const reportPath = path.join(testDir, 'ratio-migrated', 'MIGRATION_REPORT.md');
    const reportContent = fs.readFileSync(reportPath, 'utf8');

    // Verify executive summary shows correct percentages
    expect(reportContent).toContain('**Mapping Success Rate:** 60%'); // 3/5 = 60%
    expect(reportContent).toContain('**Manual Action Required:** 2 resources');

    // Verify template comparison statistics
    expect(reportContent).toMatch(/\| Original Resources \| 5 \|/);
    expect(reportContent).toMatch(/\| Migrated Resources \| 3 \|/); // Only mappable ones
  });

  test('should handle multiple types of unmappable resources correctly', async () => {
    // Arrange: Create project with various unmappable resource types
    const cdkProject = createMultipleUnmappableProject('multiple-unmappable');

    // Act: Run migration
    execSync(`svc migrate --cdk-project ${cdkProject} --stack-name MultipleStack --service-name multiple-service --output ./multiple-migrated --compliance commercial --non-interactive`, {
      stdio: 'pipe'
    });

    // Assert: Verify different unmappable types are handled correctly
    const patchesPath = path.join(testDir, 'multiple-migrated', 'patches.ts');
    const patchesContent = fs.readFileSync(patchesPath, 'utf8');

    // Check that different resource types have appropriate suggested actions
    expect(patchesContent).toContain('AWS::CloudFormation::CustomResource');
    expect(patchesContent).toContain('Replace custom resource with equivalent platform component');

    expect(patchesContent).toContain('AWS::ElastiCache::CacheCluster');
    expect(patchesContent).toContain('ElastiCache not yet supported by platform');

    expect(patchesContent).toContain('AWS::Route53::RecordSet');
    expect(patchesContent).toContain('DNS management not yet supported by platform');

    expect(patchesContent).toContain('AWS::CloudWatch::Alarm');
    expect(patchesContent).toContain('Custom alarms not yet supported by platform');

    // Verify count is accurate
    expect(patchesContent).toContain('patchesApplied: 4'); // 4 unmappable resources
  });

  // Helper functions to create test CDK projects

  function createUnmappableResourceProject(name: string): string {
    const projectPath = path.join(testDir, name);
    fs.mkdirSync(projectPath);

    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
      name,
      dependencies: { 'aws-cdk-lib': '^2.0.0', 'constructs': '^10.0.0' }
    }));

    fs.writeFileSync(path.join(projectPath, 'cdk.json'), JSON.stringify({
      app: 'npx ts-node app.ts'
    }));

    fs.writeFileSync(path.join(projectPath, 'app.ts'), `
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';

export class UnmappableStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    // Mappable resource
    new lambda.Function(this, 'Function', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};')
    });

    // Unmappable: ElastiCache
    new elasticache.CfnCacheCluster(this, 'RedisCache', {
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1
    });

    // Unmappable: Custom Resource
    new cdk.CustomResource(this, 'CustomResource', {
      serviceToken: 'arn:aws:lambda:us-east-1:123456789012:function:custom-handler',
      properties: {
        CustomProperty: 'CustomValue'
      }
    });
  }
}

const app = new cdk.App();
new UnmappableStack(app, 'UnmappableStack');
`);

    return projectPath;
  }

  function createMixedResourceProject(name: string): string {
    const projectPath = path.join(testDir, name);
    fs.mkdirSync(projectPath);

    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
      name,
      dependencies: { 'aws-cdk-lib': '^2.0.0', 'constructs': '^10.0.0' }
    }));

    fs.writeFileSync(path.join(projectPath, 'cdk.json'), JSON.stringify({
      app: 'npx ts-node app.ts'
    }));

    fs.writeFileSync(path.join(projectPath, 'app.ts'), `
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as route53 from 'aws-cdk-lib/aws-route53';

export class MixedStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    // Mappable resources
    new lambda.Function(this, 'ApiFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'api.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};')
    });

    new sqs.Queue(this, 'TaskQueue', {
      visibilityTimeout: cdk.Duration.seconds(300)
    });

    // Unmappable resources
    new elasticache.CfnCacheCluster(this, 'Cache', {
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1
    });

    new route53.HostedZone(this, 'Zone', {
      zoneName: 'example.com'
    });
  }
}

const app = new cdk.App();
new MixedStack(app, 'MixedStack');
`);

    return projectPath;
  }

  function createComplexUnmappableProject(name: string): string {
    const projectPath = path.join(testDir, name);
    fs.mkdirSync(projectPath);

    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
      name,
      dependencies: { 'aws-cdk-lib': '^2.0.0', 'constructs': '^10.0.0' }
    }));

    fs.writeFileSync(path.join(projectPath, 'cdk.json'), JSON.stringify({
      app: 'npx ts-node app.ts'
    }));

    fs.writeFileSync(path.join(projectPath, 'app.ts'), `
import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

export class ComplexStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    // Complex unmappable: Route53 Hosted Zone with detailed configuration
    new route53.HostedZone(this, 'HostedZone', {
      zoneName: 'example.com',
      comment: 'Production DNS zone for example.com'
    });

    // Complex unmappable: CloudWatch Alarm with custom metrics
    new cloudwatch.Alarm(this, 'CustomAlarm', {
      alarmName: 'HighErrorRate',
      alarmDescription: 'Alert when error rate exceeds threshold',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
        dimensionsMap: {
          FunctionName: 'MyFunction'
        }
      }),
      threshold: 10,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });
  }
}

const app = new cdk.App();
new ComplexStack(app, 'ComplexStack');
`);

    return projectPath;
  }

  function createKnownRatioProject(name: string): string {
    const projectPath = path.join(testDir, name);
    fs.mkdirSync(projectPath);

    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
      name,
      dependencies: { 'aws-cdk-lib': '^2.0.0', 'constructs': '^10.0.0' }
    }));

    fs.writeFileSync(path.join(projectPath, 'cdk.json'), JSON.stringify({
      app: 'npx ts-node app.ts'
    }));

    // Create exactly 3 mappable and 2 unmappable resources
    fs.writeFileSync(path.join(projectPath, 'app.ts'), `
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

export class RatioStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    // 3 mappable resources
    new lambda.Function(this, 'Function', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};')
    });

    new sqs.Queue(this, 'Queue');

    new s3.Bucket(this, 'Bucket');

    // 2 unmappable resources
    new elasticache.CfnCacheCluster(this, 'Cache', {
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1
    });

    new cloudwatch.Alarm(this, 'Alarm', {
      metric: new cloudwatch.Metric({
        namespace: 'Custom',
        metricName: 'Test'
      }),
      threshold: 1
    });
  }
}

const app = new cdk.App();
new RatioStack(app, 'RatioStack');
`);

    return projectPath;
  }

  function createMultipleUnmappableProject(name: string): string {
    const projectPath = path.join(testDir, name);
    fs.mkdirSync(projectPath);

    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
      name,
      dependencies: { 'aws-cdk-lib': '^2.0.0', 'constructs': '^10.0.0' }
    }));

    fs.writeFileSync(path.join(projectPath, 'cdk.json'), JSON.stringify({
      app: 'npx ts-node app.ts'
    }));

    fs.writeFileSync(path.join(projectPath, 'app.ts'), `
import * as cdk from 'aws-cdk-lib';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

export class MultipleStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    // Different types of unmappable resources
    new cdk.CustomResource(this, 'CustomResource', {
      serviceToken: 'arn:aws:lambda:us-east-1:123456789012:function:handler'
    });

    new elasticache.CfnCacheCluster(this, 'ElastiCache', {
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1
    });

    new route53.ARecord(this, 'DNSRecord', {
      zone: route53.HostedZone.fromLookup(this, 'Zone', { domainName: 'example.com' }),
      target: route53.RecordTarget.fromIpAddresses('1.2.3.4')
    });

    new cloudwatch.Alarm(this, 'Alarm', {
      metric: new cloudwatch.Metric({
        namespace: 'Custom',
        metricName: 'Test'
      }),
      threshold: 1
    });
  }
}

const app = new cdk.App();
new MultipleStack(app, 'MultipleStack');
`);

    return projectPath;
  }
});