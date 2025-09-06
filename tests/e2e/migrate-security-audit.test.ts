/**
 * Migration Security Audit Test
 * TC-MIGRATE-AUDIT-01: Tests security officer's ability to audit migration process
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import * as yaml from 'yaml';

describe('TC-MIGRATE-AUDIT-01: Security Audit Test', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'migrate-audit-test-'));
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('should generate logical-id-map.json with accurate original to new ID mappings', async () => {
    // Arrange: Create CDK project with security-sensitive resources
    const cdkProject = createSecuritySensitiveProject('security-project');

    // Act: Run migration
    execSync(`svc migrate --cdk-project ${cdkProject} --stack-name SecurityStack --service-name security-service --output ./security-migrated --compliance fedramp-moderate --non-interactive`, {
      stdio: 'pipe'
    });

    // Assert: Verify logical-id-map.json exists and has correct structure
    const logicalIdMapPath = path.join(testDir, 'security-migrated', 'logical-id-map.json');
    expect(fs.existsSync(logicalIdMapPath)).toBe(true);

    const logicalIdMap = JSON.parse(fs.readFileSync(logicalIdMapPath, 'utf8'));

    // Verify mapping structure and metadata for security review
    expect(logicalIdMap.metadata).toBeDefined();
    expect(logicalIdMap.metadata.generatedAt).toBeDefined();
    expect(logicalIdMap.metadata.sourceStack).toBe('SecurityStack');
    expect(logicalIdMap.metadata.platformVersion).toBeDefined();

    // Verify mappings array contains security-critical resource details
    expect(logicalIdMap.mappings).toBeInstanceOf(Array);
    expect(logicalIdMap.mappings.length).toBeGreaterThan(0);

    // Find security-sensitive resources for audit
    const databaseMapping = logicalIdMap.mappings.find((m: any) => 
      m.resourceType === 'AWS::RDS::DBInstance'
    );
    expect(databaseMapping).toBeDefined();
    expect(databaseMapping.originalId).toMatch(/^[A-Z][A-Za-z0-9]+$/); // Valid CF logical ID
    expect(databaseMapping.newId).toMatch(/^[A-Za-z][A-Za-z0-9]*$/); // Valid platform ID
    expect(databaseMapping.componentName).toBeDefined();
    expect(databaseMapping.componentType).toBe('rds-postgres');
    expect(databaseMapping.securityContext).toBeDefined();
    expect(databaseMapping.securityContext.containsSensitiveData).toBe(true);
    expect(databaseMapping.securityContext.requiresAudit).toBe(true);

    const lambdaMapping = logicalIdMap.mappings.find((m: any) => 
      m.resourceType === 'AWS::Lambda::Function'
    );
    expect(lambdaMapping).toBeDefined();
    expect(lambdaMapping.securityContext.hasIAMPermissions).toBe(true);

    // Verify S3 bucket mapping includes encryption status
    const s3Mapping = logicalIdMap.mappings.find((m: any) => 
      m.resourceType === 'AWS::S3::Bucket'
    );
    expect(s3Mapping).toBeDefined();
    expect(s3Mapping.securityContext.encryptionEnabled).toBe(true);
    expect(s3Mapping.securityContext.publicAccess).toBe(false);
  }, 60000);

  test('should provide comprehensive security audit information in MIGRATION_REPORT.md', async () => {
    // Arrange: Create project with various security-relevant resources
    const cdkProject = createAuditableProject('auditable-project');

    // Act: Run migration with FedRAMP compliance
    execSync(`svc migrate --cdk-project ${cdkProject} --stack-name AuditableStack --service-name auditable-service --output ./auditable-migrated --compliance fedramp-high --non-interactive`, {
      stdio: 'pipe'
    });

    // Assert: Verify security audit section in migration report
    const reportPath = path.join(testDir, 'auditable-migrated', 'MIGRATION_REPORT.md');
    const reportContent = fs.readFileSync(reportPath, 'utf8');

    // Verify security audit section exists
    expect(reportContent).toContain('## Security Audit Information');
    expect(reportContent).toContain('### Compliance Framework: fedramp-high');

    // Verify resource security assessment
    expect(reportContent).toContain('### Security-Sensitive Resources');
    expect(reportContent).toContain('| Resource Type | Original ID | New ID | Security Impact |');

    // Check for specific security-sensitive resources
    expect(reportContent).toMatch(/AWS::RDS::DBInstance.*HIGH.*Database contains sensitive data/);
    expect(reportContent).toMatch(/AWS::Lambda::Function.*MEDIUM.*Function has IAM permissions/);
    expect(reportContent).toMatch(/AWS::S3::Bucket.*MEDIUM.*Bucket stores application data/);

    // Verify state preservation guarantee
    expect(reportContent).toContain('### State Preservation Guarantee');
    expect(reportContent).toContain('✅ **All stateful resources maintain their CloudFormation Logical IDs**');
    expect(reportContent).toContain('✅ **Database instances will NOT be replaced**');
    expect(reportContent).toContain('✅ **S3 buckets will NOT be replaced**');
    expect(reportContent).toContain('✅ **EBS volumes will NOT be replaced**');

    // Verify compliance-specific checks
    expect(reportContent).toContain('### FedRAMP Compliance Checks');
    expect(reportContent).toContain('- [x] Encryption at rest enabled for all data stores');
    expect(reportContent).toContain('- [x] IAM permissions follow least-privilege principle');
    expect(reportContent).toContain('- [x] No hardcoded credentials detected');

    // Verify change tracking for security review
    expect(reportContent).toContain('### Security-Relevant Changes');
    expect(reportContent).toContain('**IAM Role Changes:**');
    expect(reportContent).toContain('**Network Security Changes:**');
    expect(reportContent).toContain('**Encryption Configuration Changes:**');
  });

  test('should enable security officer to verify no unauthorized changes in pull request', async () => {
    // Arrange: Create project and simulate original state
    const cdkProject = createPRReviewProject('pr-review-project');

    // Generate original template for comparison
    process.chdir(cdkProject);
    execSync('npm install aws-cdk-lib constructs @types/node typescript ts-node', { 
      stdio: 'pipe' 
    });
    const originalTemplate = execSync('npx cdk synth ReviewStack --json', { 
      encoding: 'utf8' 
    });
    process.chdir(testDir);

    // Act: Run migration
    execSync(`svc migrate --cdk-project ${cdkProject} --stack-name ReviewStack --service-name review-service --output ./review-migrated --compliance fedramp-moderate --non-interactive`, {
      stdio: 'pipe'
    });

    // Assert: Verify artifacts suitable for PR security review
    const migratedDir = path.join(testDir, 'review-migrated');

    // 1. Service manifest should be reviewable
    const serviceYmlPath = path.join(migratedDir, 'service.yml');
    const serviceManifest = yaml.parse(fs.readFileSync(serviceYmlPath, 'utf8'));
    
    expect(serviceManifest.metadata).toBeDefined();
    expect(serviceManifest.metadata.migration).toBeDefined();
    expect(serviceManifest.metadata.migration.sourceStack).toBe('ReviewStack');
    expect(serviceManifest.metadata.migration.migratedAt).toBeDefined();
    expect(serviceManifest.metadata.compliance).toBe('fedramp-moderate');

    // 2. Logical ID map should show all security-critical mappings
    const logicalIdMapPath = path.join(migratedDir, 'logical-id-map.json');
    const logicalIdMap = JSON.parse(fs.readFileSync(logicalIdMapPath, 'utf8'));

    // Verify database state preservation (critical for security review)
    const criticalMappings = logicalIdMap.mappings.filter((m: any) => 
      ['AWS::RDS::DBInstance', 'AWS::S3::Bucket', 'AWS::KMS::Key'].includes(m.resourceType)
    );
    expect(criticalMappings.length).toBeGreaterThan(0);

    criticalMappings.forEach((mapping: any) => {
      expect(mapping.securityContext).toBeDefined();
      expect(mapping.preservationStrategy).toBeDefined();
      expect(mapping.auditTrail).toBeDefined();
      expect(mapping.auditTrail.reviewRequired).toBe(true);
    });

    // 3. Migration report should highlight security officer review points
    const reportPath = path.join(migratedDir, 'MIGRATION_REPORT.md');
    const reportContent = fs.readFileSync(reportPath, 'utf8');

    expect(reportContent).toContain('## Pull Request Review Checklist');
    expect(reportContent).toContain('### For Security Officers');
    expect(reportContent).toContain('- [ ] Verify logical-id-map.json preserves all stateful resource IDs');
    expect(reportContent).toContain('- [ ] Confirm no unintended IAM permission changes');
    expect(reportContent).toContain('- [ ] Validate encryption settings are maintained');
    expect(reportContent).toContain('- [ ] Review any unmappable resources in patches.ts');

    // 4. Template diff should show only non-functional changes
    process.chdir(migratedDir);
    const migratedTemplate = execSync('svc plan --output-format json --dry-run', {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    // Parse and compare critical security properties
    const originalObj = JSON.parse(originalTemplate);
    const migratedObj = JSON.parse(migratedTemplate);

    // Verify same security-critical resources exist
    const originalSecurityResources = Object.entries(originalObj.Resources || {})
      .filter(([_, resource]: [string, any]) => 
        ['AWS::RDS::DBInstance', 'AWS::S3::Bucket', 'AWS::KMS::Key'].includes(resource.Type)
      );

    originalSecurityResources.forEach(([originalId, resource]: [string, any]) => {
      // Resource should exist in migrated template with same ID (due to preservation)
      expect(migratedObj.Resources[originalId]).toBeDefined();
      expect(migratedObj.Resources[originalId].Type).toBe(resource.Type);
    });

    process.chdir(testDir);
  });

  test('should track and report all changes affecting security posture', async () => {
    // Arrange: Create project with comprehensive security landscape
    const cdkProject = createSecurityLandscapeProject('security-landscape');

    // Act: Run migration
    execSync(`svc migrate --cdk-project ${cdkProject} --stack-name LandscapeStack --service-name landscape-service --output ./landscape-migrated --compliance fedramp-high --non-interactive`, {
      stdio: 'pipe'
    });

    // Assert: Verify comprehensive security change tracking
    const reportPath = path.join(testDir, 'landscape-migrated', 'MIGRATION_REPORT.md');
    const reportContent = fs.readFileSync(reportPath, 'utf8');

    // Verify security change categories are tracked
    expect(reportContent).toContain('### Security Posture Analysis');
    
    // Data protection changes
    expect(reportContent).toContain('**Data Protection:**');
    expect(reportContent).toContain('- Database encryption: MAINTAINED');
    expect(reportContent).toContain('- S3 bucket encryption: MAINTAINED');
    expect(reportContent).toContain('- Data in transit: MAINTAINED');

    // Access control changes
    expect(reportContent).toContain('**Access Control:**');
    expect(reportContent).toContain('- IAM roles: REVIEWED (see details below)');
    expect(reportContent).toContain('- Resource policies: MAINTAINED');
    expect(reportContent).toContain('- Network ACLs: MAINTAINED');

    // Monitoring and logging changes
    expect(reportContent).toContain('**Monitoring & Logging:**');
    expect(reportContent).toContain('- CloudWatch logs: MAINTAINED');
    expect(reportContent).toContain('- CloudTrail: MAINTAINED');
    expect(reportContent).toContain('- VPC Flow Logs: MAINTAINED');

    // Network security changes
    expect(reportContent).toContain('**Network Security:**');
    expect(reportContent).toContain('- Security groups: MAINTAINED');
    expect(reportContent).toContain('- VPC configuration: MAINTAINED');
    expect(reportContent).toContain('- Public endpoints: MAINTAINED');
  });

  // Helper functions to create security-focused test projects

  function createSecuritySensitiveProject(name: string): string {
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
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

export class SecurityStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    const vpc = new ec2.Vpc(this, 'SecureVpc', { maxAzs: 2 });

    // KMS key for encryption
    const key = new kms.Key(this, 'EncryptionKey', {
      description: 'Application encryption key',
      enableKeyRotation: true
    });

    // RDS with encryption (security-sensitive)
    const database = new rds.DatabaseInstance(this, 'SecureDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15_4 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: vpc,
      storageEncrypted: true,
      storageEncryptionKey: key,
      credentials: rds.Credentials.fromGeneratedSecret('admin'),
      databaseName: 'securedb'
    });

    // S3 bucket with encryption (security-sensitive)
    const bucket = new s3.Bucket(this, 'SecureBucket', {
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: key,
      versioned: true,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    // Lambda with IAM permissions (security-sensitive)
    const lambdaRole = new iam.Role(this, 'LambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ]
    });

    const apiFunction = new lambda.Function(this, 'SecureFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};'),
      role: lambdaRole,
      environment: {
        DB_HOST: database.instanceEndpoint.hostname,
        BUCKET_NAME: bucket.bucketName
      }
    });

    // Grant necessary permissions
    database.connections.allowDefaultPortFrom(apiFunction);
    bucket.grantReadWrite(apiFunction);
  }
}

const app = new cdk.App();
new SecurityStack(app, 'SecurityStack');
`);

    return projectPath;
  }

  function createAuditableProject(name: string): string {
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
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';

export class AuditableStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    const vpc = new ec2.Vpc(this, 'AuditVpc', { 
      maxAzs: 2,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      flowLogs: {
        'flowlog': {
          destination: ec2.FlowLogDestination.toCloudWatchLogs()
        }
      }
    });

    // Encryption key
    const key = new kms.Key(this, 'AuditKey', {
      description: 'Audit trail encryption key',
      enableKeyRotation: true
    });

    // Secure database
    const database = new rds.DatabaseInstance(this, 'AuditDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15_4 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: vpc,
      storageEncrypted: true,
      storageEncryptionKey: key,
      backupRetention: cdk.Duration.days(30),
      deletionProtection: true,
      credentials: rds.Credentials.fromGeneratedSecret('admin'),
      databaseName: 'auditdb',
      monitoringInterval: cdk.Duration.seconds(60)
    });

    // Secure S3 bucket
    const auditBucket = new s3.Bucket(this, 'AuditBucket', {
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: key,
      versioned: true,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      serverAccessLogsPrefix: 'access-logs/',
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED
    });

    // Lambda with extensive IAM
    const auditFunction = new lambda.Function(this, 'AuditFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'audit.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};'),
      environment: {
        DB_HOST: database.instanceEndpoint.hostname,
        AUDIT_BUCKET: auditBucket.bucketName
      }
    });

    // CloudTrail for audit logging
    new cloudtrail.Trail(this, 'AuditTrail', {
      bucket: auditBucket,
      includeGlobalServiceEvents: true,
      isMultiRegionTrail: true,
      enableFileValidation: true,
      encryptionKey: key
    });

    // CloudWatch log group with retention
    new logs.LogGroup(this, 'AuditLogs', {
      logGroupName: '/aws/lambda/audit-function',
      retention: logs.RetentionDays.SIX_MONTHS,
      encryptionKey: key
    });

    database.connections.allowDefaultPortFrom(auditFunction);
    auditBucket.grantReadWrite(auditFunction);
  }
}

const app = new cdk.App();
new AuditableStack(app, 'AuditableStack');
`);

    return projectPath;
  }

  function createPRReviewProject(name: string): string {
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
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

export class ReviewStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    const vpc = new ec2.Vpc(this, 'ReviewVpc', { maxAzs: 2 });
    const key = new kms.Key(this, 'ReviewKey');

    // Production database - critical for state preservation
    const prodDatabase = new rds.DatabaseInstance(this, 'ProdDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15_4 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      vpc: vpc,
      storageEncrypted: true,
      storageEncryptionKey: key,
      multiAz: true,
      backupRetention: cdk.Duration.days(30),
      deletionProtection: true,
      credentials: rds.Credentials.fromGeneratedSecret('prodadmin'),
      databaseName: 'production'
    });

    // Production S3 bucket with customer data
    const dataBucket = new s3.Bucket(this, 'CustomerDataBucket', {
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: key,
      versioned: true,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    // Lambda with specific IAM permissions
    const dataProcessorRole = new iam.Role(this, 'DataProcessorRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        DatabaseAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['rds:DescribeDBInstances'],
              resources: [prodDatabase.instanceArn]
            })
          ]
        })
      }
    });

    new lambda.Function(this, 'DataProcessor', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'processor.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};'),
      role: dataProcessorRole,
      environment: {
        DB_ENDPOINT: prodDatabase.instanceEndpoint.hostname,
        BUCKET_NAME: dataBucket.bucketName
      }
    });

    prodDatabase.connections.allowDefaultPortFrom(dataProcessorRole);
    dataBucket.grantRead(dataProcessorRole);
  }
}

const app = new cdk.App();
new ReviewStack(app, 'ReviewStack');
`);

    return projectPath;
  }

  function createSecurityLandscapeProject(name: string): string {
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
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';

export class LandscapeStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    // Network security foundation
    const vpc = new ec2.Vpc(this, 'SecureVpc', {
      maxAzs: 3,
      natGateways: 2,
      flowLogs: {
        'SecurityFlowLogs': {
          destination: ec2.FlowLogDestination.toCloudWatchLogs(),
          trafficType: ec2.FlowLogTrafficType.ALL
        }
      }
    });

    const privateSubnets = vpc.privateSubnets;
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSG', {
      vpc: vpc,
      description: 'Security group for database access',
      allowAllOutbound: false
    });

    // Encryption infrastructure
    const masterKey = new kms.Key(this, 'MasterKey', {
      description: 'Master encryption key for application',
      enableKeyRotation: true,
      rotationPeriod: cdk.Duration.days(90)
    });

    // Data tier with comprehensive security
    const database = new rds.DatabaseInstance(this, 'SecureDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15_4 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
      vpc: vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSecurityGroup],
      storageEncrypted: true,
      storageEncryptionKey: masterKey,
      performanceInsightsEnabled: true,
      performanceInsightsEncryptionKey: masterKey,
      monitoring: {
        interval: cdk.Duration.seconds(60),
        enablePerformanceInsights: true
      },
      backupRetention: cdk.Duration.days(35),
      deletionProtection: true,
      multiAz: true,
      credentials: rds.Credentials.fromGeneratedSecret('securadmin'),
      databaseName: 'secureapp'
    });

    // Storage tier with security controls
    const dataBucket = new s3.Bucket(this, 'SecureDataBucket', {
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: masterKey,
      versioned: true,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      serverAccessLogsPrefix: 'access-logs/',
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      lifecycleRules: [{
        id: 'security-lifecycle',
        enabled: true,
        transitions: [{
          storageClass: s3.StorageClass.INTELLIGENT_TIERING,
          transitionAfter: cdk.Duration.days(30)
        }]
      }]
    });

    // Application tier with security
    const appFunction = new lambda.Function(this, 'SecureAppFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'app.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};'),
      vpc: vpc,
      securityGroups: [dbSecurityGroup],
      environment: {
        DB_HOST: database.instanceEndpoint.hostname,
        BUCKET_NAME: dataBucket.bucketName,
        KMS_KEY_ID: masterKey.keyId
      },
      logRetention: logs.RetentionDays.SIX_MONTHS,
      tracing: lambda.Tracing.ACTIVE
    });

    // Monitoring and logging
    const auditLogGroup = new logs.LogGroup(this, 'SecurityAuditLogs', {
      retention: logs.RetentionDays.ONE_YEAR,
      encryptionKey: masterKey
    });

    new cloudtrail.Trail(this, 'SecurityTrail', {
      bucket: dataBucket,
      s3KeyPrefix: 'audit-trail/',
      includeGlobalServiceEvents: true,
      isMultiRegionTrail: true,
      enableFileValidation: true,
      encryptionKey: masterKey,
      cloudWatchLogGroup: auditLogGroup
    });

    // Network security
    dbSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(appFunction.connections.securityGroups[0].securityGroupId),
      ec2.Port.tcp(5432),
      'Allow Lambda to access database'
    );

    // Permissions
    database.connections.allowFrom(appFunction, ec2.Port.tcp(5432));
    dataBucket.grantReadWrite(appFunction);
    masterKey.grantEncryptDecrypt(appFunction);
  }
}

const app = new cdk.App();
new LandscapeStack(app, 'LandscapeStack');
`);

    return projectPath;
  }
});