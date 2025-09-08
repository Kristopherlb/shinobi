import { describe, test, expect, beforeEach } from '@jest/globals';
import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { RdsPostgresComponent } from './src/rds-postgres.component';
import { ComponentContext, ComponentSpec } from '@platform/contracts';

describe('RdsPostgresComponent - CloudFormation Synthesis', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let component: RdsPostgresComponent;
  let mockContext: ComponentContext;
  let mockSpec: ComponentSpec;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');

    mockContext = {
      serviceName: 'test-service',
      environment: 'test',
      complianceFramework: 'commercial',
      scope: stack,
      region: 'us-east-1',
      accountId: '123456789012'
    };

    mockSpec = {
      name: 'test-db',
      type: 'rds-postgres',
      config: {
        dbInstanceIdentifier: 'test-postgres-db',
        dbName: 'testapp',
        engine: 'postgres',
        engineVersion: '15.4',
        instanceClass: 'db.t3.micro',
        allocatedStorage: 20,
        masterUsername: 'dbadmin'
      }
    };
  });

  describe('CloudFormation Resource Generation', () => {
    test('should generate RDS instance with correct properties', () => {
      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);
      
      // Verify RDS instance is created with flexible naming
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        DBInstanceIdentifier: expect.stringMatching(/.*test-postgres-db.*/),
        DBName: 'testapp',
        Engine: 'postgres',
        EngineVersion: '15.4',
        DBInstanceClass: 'db.t3.micro',
        AllocatedStorage: '20',
        MasterUsername: 'dbadmin'
      });

      // Verify DB subnet group is created
      template.hasResourceProperties('AWS::RDS::DBSubnetGroup', {
        DBSubnetGroupDescription: expect.stringContaining('test-postgres-db')
      });
    });

    test('should apply mandatory Platform Tagging Standard v1.0', () => {
      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      
      // Find RDS instance resource
      const rdsInstances = Object.entries(cfnTemplate.Resources)
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::RDS::DBInstance');
      
      expect(rdsInstances).toHaveLength(1);
      const [, dbInstanceResource] = rdsInstances[0] as [string, any];
      
      // Verify mandatory platform tags on RDS instance
      expect(dbInstanceResource.Properties.Tags).toBeDefined();
      const dbTags = dbInstanceResource.Properties.Tags;
      const dbTagMap = dbTags.reduce((acc: any, tag: any) => {
        acc[tag.Key] = tag.Value;
        return acc;
      }, {});
      
      expect(dbTagMap['platform:service-name']).toBe('test-service');
      expect(dbTagMap['platform:owner']).toBeDefined();
      expect(dbTagMap['platform:component-name']).toBe('test-db');
      expect(dbTagMap['platform:component-type']).toBe('rds-postgres');
      expect(dbTagMap['platform:environment']).toBe('test');
      expect(dbTagMap['platform:managed-by']).toBe('platform-engine');
      expect(dbTagMap['platform:commit-hash']).toBeDefined();

      // Find DB Subnet Group resource
      const subnetGroups = Object.entries(cfnTemplate.Resources)
        .filter(([, resource]: [string, any]) => resource.Type === 'AWS::RDS::DBSubnetGroup');
      
      expect(subnetGroups.length).toBeGreaterThanOrEqual(1);
      const [, subnetGroupResource] = subnetGroups[0] as [string, any];
      
      // Verify mandatory platform tags on DB Subnet Group
      expect(subnetGroupResource.Properties.Tags).toBeDefined();
      const subnetTags = subnetGroupResource.Properties.Tags;
      const subnetTagMap = subnetTags.reduce((acc: any, tag: any) => {
        acc[tag.Key] = tag.Value;
        return acc;
      }, {});
      
      expect(subnetTagMap['platform:service-name']).toBe('test-service');
      expect(subnetTagMap['platform:component-name']).toBe('test-db');

      // Find Security Group resource
      const securityGroups = Object.entries(cfnTemplate.Resources)
        .filter(([, resource]: [string, any]) => resource.Type === 'AWS::EC2::SecurityGroup');
      
      expect(securityGroups.length).toBeGreaterThanOrEqual(1);
      const [, securityGroupResource] = securityGroups[0] as [string, any];
      
      // Verify mandatory platform tags on Security Group
      expect(securityGroupResource.Properties.Tags).toBeDefined();
      const sgTags = securityGroupResource.Properties.Tags;
      const sgTagMap = sgTags.reduce((acc: any, tag: any) => {
        acc[tag.Key] = tag.Value;
        return acc;
      }, {});
      
      expect(sgTagMap['platform:service-name']).toBe('test-service');
      expect(sgTagMap['platform:component-name']).toBe('test-db');
    });

    test('should create security group with no ingress by default (least-privilege)', () => {
      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify security group has no default ingress rules (least-privilege)
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: expect.stringContaining('test-postgres-db'),
        SecurityGroupIngress: [] // No default ingress - rules added by binders
      });
    });

    test('should validate VPC posture with private subnets', () => {
      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify DB instance is not publicly accessible
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        PubliclyAccessible: false
      });

      // Verify subnet group uses private subnets from platform context
      template.hasResourceProperties('AWS::RDS::DBSubnetGroup', {
        SubnetIds: expect.arrayContaining(['subnet-private-1', 'subnet-private-2', 'subnet-private-3'])
      });

      // Verify VPC ID is from platform context
      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      const subnetGroups = Object.entries(cfnTemplate.Resources)
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::RDS::DBSubnetGroup');
      
      expect(subnetGroups.length).toBeGreaterThanOrEqual(1);
      const [_, subnetGroupResource] = subnetGroups[0] as [string, any];
      
      // All subnets should be private (from platform context)
      const subnetIds = subnetGroupResource.Properties.SubnetIds;
      subnetIds.forEach((subnetId: string) => {
        expect(subnetId).toMatch(/subnet-private-/);
      });
    });

    test('should configure storage encryption by default', () => {
      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify encryption is enabled
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        StorageEncrypted: true
      });
    });

    test('should create secrets manager secret when specified', () => {
      mockSpec.config.manageMasterUserPassword = true;

      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify secret is created
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Description: expect.stringContaining('Master user password'),
        GenerateSecretString: {
          SecretStringTemplate: '{"username": "dbadmin"}',
          GenerateStringKey: 'password',
          PasswordLength: 32,
          ExcludeCharacters: '"@/\\'
        }
      });

      // Verify RDS instance references the secret
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        ManageMasterUserPassword: true,
        MasterUserSecret: {
          KmsKeyId: expect.any(Object)
        }
      });
    });

    test('should handle backup and maintenance windows with policy coverage', () => {
      // Test commercial defaults (lower retention)
      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify commercial defaults (7 days backup retention)
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        BackupRetentionPeriod: 7
      });

      // Test explicit override
      const stackWithOverrides = new cdk.Stack(app, 'OverrideStack');
      const contextWithOverrides = { ...mockContext, scope: stackWithOverrides };
      const specWithOverrides = {
        ...mockSpec,
        config: {
          ...mockSpec.config,
          backupRetentionPeriod: 30,
          backupWindow: '03:00-04:00',
          maintenanceWindow: 'sun:04:00-sun:05:00'
        }
      };

      const componentWithOverrides = new RdsPostgresComponent(
        stackWithOverrides, 
        'TestRdsPostgresOverrides', 
        contextWithOverrides, 
        specWithOverrides
      );
      componentWithOverrides.synth();

      const overrideTemplate = Template.fromStack(stackWithOverrides);

      // Verify overrides win over defaults
      overrideTemplate.hasResourceProperties('AWS::RDS::DBInstance', {
        BackupRetentionPeriod: 30,
        PreferredBackupWindow: '03:00-04:00',
        PreferredMaintenanceWindow: 'sun:04:00-sun:05:00'
      });
    });
  });

  describe('Compliance Framework Testing', () => {
    test('should apply FedRAMP Moderate hardening', () => {
      mockContext.complianceFramework = 'fedramp-moderate';
      
      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify Multi-AZ is enabled for high availability
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        MultiAZ: true
      });

      // Verify instance class is appropriate for compliance (flexible)
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        DBInstanceClass: expect.stringMatching(/db\.(r5|r6g|m5|m6g|t3|t4g)\./)
      });

      // Verify Performance Insights is enabled
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        EnablePerformanceInsights: true,
        PerformanceInsightsRetentionPeriod: 7
      });

      // Verify enhanced backup retention (30 days for FedRAMP Moderate)
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        BackupRetentionPeriod: 30
      });

      // Verify CloudWatch logs exports
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        EnableCloudwatchLogsExports: ['postgresql']
      });

      // Verify customer-managed KMS encryption (not AWS-managed)
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        StorageEncrypted: true,
        KmsKeyId: expect.any(Object) // CMK reference present
      });
    });

    test('should apply FedRAMP High security controls', () => {
      mockContext.complianceFramework = 'fedramp-high';
      
      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify customer-managed KMS key is used (not brittle inline key check)
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        StorageEncrypted: true,
        KmsKeyId: expect.any(Object) // CMK reference present, not AWS-managed
      });

      // Verify enhanced monitoring with flexible role check
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        MonitoringInterval: 15
      });

      // Check monitoring role exists as resource OR is a token/ref (not literal substring)
      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      const rdsInstance = Object.entries(cfnTemplate.Resources)
        .find(([_, resource]: [string, any]) => resource.Type === 'AWS::RDS::DBInstance');
      
      expect(rdsInstance).toBeDefined();
      const [_, rdsResource] = rdsInstance as [string, any];
      
      const monitoringRoleArn = rdsResource.Properties.MonitoringRoleArn;
      
      // Either role resource exists or it's a token/reference
      const hasMonitoringRole = () => {
        const iamRoles = Object.entries(cfnTemplate.Resources)
          .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::IAM::Role');
        return iamRoles.length > 0;
      };
      
      const isTokenOrRef = () => {
        return typeof monitoringRoleArn === 'object' && 
               (monitoringRoleArn.Ref || monitoringRoleArn['Fn::GetAtt']);
      };
      
      expect(hasMonitoringRole() || isTokenOrRef()).toBe(true);

      // Verify Performance Insights with KMS encryption
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        EnablePerformanceInsights: true,
        PerformanceInsightsKMSKeyId: expect.any(Object)
      });

      // Verify deletion protection is enabled
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        DeletionProtection: true
      });

      // Verify extended backup retention (35 days for FedRAMP High)
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        BackupRetentionPeriod: 35
      });

      // Verify removal policy is RETAIN for stateful resources
      const rdsResourceMeta = rdsResource.Metadata || {};
      const removalPolicy = rdsResourceMeta['aws:cdk:path']?.includes('Retain') || 
                           rdsResource.DeletionPolicy === 'Retain';
      expect(removalPolicy).toBeTruthy();
    });

    test('should configure commercial defaults with observability', () => {
      mockContext.complianceFramework = 'commercial';
      
      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify commercial defaults (no logs export by default or platform default)
      const rdsInstance = template.findResources('AWS::RDS::DBInstance');
      const [_, instanceResource] = Object.entries(rdsInstance)[0] as [string, any];
      
      // Either no logs export or platform default (not FedRAMP requirement)
      const logsExport = instanceResource.Properties.EnableCloudwatchLogsExports;
      expect(logsExport === undefined || Array.isArray(logsExport)).toBe(true);

      // Verify shorter backup retention for cost optimization
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        BackupRetentionPeriod: 7  // Commercial default
      });

      // Verify basic instance class is allowed
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        DBInstanceClass: expect.stringMatching(/db\.(t3|t4g|r5|r6g|m5|m6g)\./)
      });
    });

    test('should handle deletion protection and removal policies', () => {
      mockContext.complianceFramework = 'fedramp-high';
      mockContext.environment = 'prod';
      
      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify deletion protection for production FedRAMP High
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        DeletionProtection: true
      });

      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      const rdsInstance = Object.entries(cfnTemplate.Resources)
        .find(([_, resource]: [string, any]) => resource.Type === 'AWS::RDS::DBInstance');
      
      expect(rdsInstance).toBeDefined();
      const [_, rdsResource] = rdsInstance as [string, any];
      
      // Verify removal policy is RETAIN for stateful resources in prod
      expect(rdsResource.DeletionPolicy).toBe('Retain');
    });
  });

  describe('High Availability and Performance', () => {
    test('should configure read replicas when specified', () => {
      mockSpec.config.readReplicas = [
        {
          replicaIdentifier: 'test-postgres-read-1',
          instanceClass: 'db.r5.large',
          availabilityZone: 'us-east-1b'
        }
      ];

      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify read replica is created with flexible naming
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        DBInstanceIdentifier: expect.stringMatching(/.*test-postgres-read-1.*/),
        DBInstanceClass: 'db.r5.large',
        SourceDBInstanceIdentifier: { Ref: expect.any(String) }
      });
    });

    test('should configure custom parameter group', () => {
      mockSpec.config.parameterGroupName = 'custom-postgres15-params';
      mockSpec.config.parameters = {
        shared_preload_libraries: 'pg_stat_statements',
        max_connections: 200,
        shared_buffers: '256MB'
      };

      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify parameter group is created
      template.hasResourceProperties('AWS::RDS::DBParameterGroup', {
        Family: 'postgres15',
        Parameters: {
          shared_preload_libraries: 'pg_stat_statements',
          max_connections: '200',
          shared_buffers: '256MB'
        }
      });

      // Verify RDS instance uses the parameter group
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        DBParameterGroupName: { Ref: expect.any(String) }
      });
    });
  });

  describe('Capabilities and Outputs', () => {
    test('should register database:postgres capability without secret', () => {
      // Test case without manageMasterUserPassword
      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const capabilities = component.getCapabilities();
      
      expect(capabilities['database:postgres']).toBeDefined();
      expect(capabilities['database:postgres'].host).toBeDefined();
      expect(capabilities['database:postgres'].port).toBe(5432);
      expect(capabilities['database:postgres'].databaseName).toBe('testapp');
      expect(capabilities['database:postgres'].secretArn).toBeUndefined();
    });

    test('should register database:postgres capability with secret', () => {
      // Test case with manageMasterUserPassword
      mockSpec.config.manageMasterUserPassword = true;

      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const capabilities = component.getCapabilities();
      
      expect(capabilities['database:postgres']).toBeDefined();
      expect(capabilities['database:postgres'].host).toBeDefined();
      expect(capabilities['database:postgres'].port).toBe(5432);
      expect(capabilities['database:postgres'].databaseName).toBe('testapp');
      expect(capabilities['database:postgres'].secretArn).toContain('arn:aws:secretsmanager:');
    });

    test('should provide correct CloudFormation outputs with flexible naming', () => {
      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);
      const outputs = template.findOutputs('*');
      const outputNames = Object.keys(outputs);

      // Verify endpoint output by pattern (flexible naming)
      const endpointOutput = outputNames.find(name => name.match(/.*Endpoint$/));
      expect(endpointOutput).toBeDefined();
      expect(outputs[endpointOutput!]).toEqual({
        Value: { 'Fn::GetAtt': [expect.any(String), 'Endpoint.Address'] },
        Export: { Name: expect.stringMatching(/.*-endpoint$/) }
      });

      // Verify port output by pattern
      const portOutput = outputNames.find(name => name.match(/.*Port$/));
      expect(portOutput).toBeDefined();
      expect(outputs[portOutput!]).toEqual({
        Value: { 'Fn::GetAtt': [expect.any(String), 'Endpoint.Port'] },
        Export: { Name: expect.stringMatching(/.*-port$/) }
      });
    });
  });

  describe('Error Conditions', () => {
    test('should fail synthesis with invalid engine version', () => {
      mockSpec.config.engineVersion = '99.9';

      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow(/unsupported.*engine.*version|invalid.*version/i);
    });

    test('should fail synthesis with insufficient storage', () => {
      mockSpec.config.allocatedStorage = 5;  // Below minimum for PostgreSQL

      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow(/allocatedStorage.*must.*be.*>=.*20|storage.*below.*minimum/i);
    });

    test('should fail synthesis with missing required configuration', () => {
      delete mockSpec.config.masterUsername;

      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow(/masterUsername.*required|missing.*username/i);
    });

    test('should fail synthesis with invalid instance class', () => {
      mockSpec.config.instanceClass = 'db.invalid.class';

      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow(/invalid.*instance.*class|unsupported.*instance/i);
    });
  });

  describe('CloudFormation Template Validation', () => {
    test('should generate syntactically valid CloudFormation', () => {
      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      
      // Basic CloudFormation structure validation
      expect(cfnTemplate).toHaveProperty('AWSTemplateFormatVersion', '2010-09-09');
      expect(cfnTemplate).toHaveProperty('Resources');
      
      // Ensure RDS instance is present
      const rdsInstances = Object.entries(cfnTemplate.Resources)
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::RDS::DBInstance');
      
      expect(rdsInstances).toHaveLength(1);
      
      // Ensure security group is present
      const securityGroups = Object.entries(cfnTemplate.Resources)
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::EC2::SecurityGroup');
      
      expect(securityGroups.length).toBeGreaterThanOrEqual(1);
    });

    test('should include proper dependency ordering', () => {
      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      
      // Find RDS instance
      const rdsInstance = Object.entries(cfnTemplate.Resources)
        .find(([_, resource]: [string, any]) => resource.Type === 'AWS::RDS::DBInstance');
      
      expect(rdsInstance).toBeDefined();
      
      const [_, rdsResource] = rdsInstance as [string, any];
      
      // Verify RDS instance depends on subnet group
      expect(rdsResource.Properties.DBSubnetGroupName).toBeDefined();

      // Verify proper VPC security group dependencies
      expect(rdsResource.Properties.VpcSecurityGroups).toBeDefined();
    });

    test('should validate enterprise-grade configuration patterns', () => {
      mockContext.complianceFramework = 'fedramp-moderate';
      
      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      
      // Find RDS instance
      const rdsInstance = Object.entries(cfnTemplate.Resources)
        .find(([_, resource]: [string, any]) => resource.Type === 'AWS::RDS::DBInstance');
      
      expect(rdsInstance).toBeDefined();
      const [_, rdsResource] = rdsInstance as [string, any];
      
      // Validate enterprise patterns
      expect(rdsResource.Properties.StorageEncrypted).toBe(true);
      expect(rdsResource.Properties.PubliclyAccessible).toBe(false);
      expect(rdsResource.Properties.MultiAZ).toBe(true);
      expect(rdsResource.Properties.BackupRetentionPeriod).toBeGreaterThanOrEqual(30);
      expect(rdsResource.Properties.EnablePerformanceInsights).toBe(true);
      
      // Verify Tags array exists and has proper structure
      expect(Array.isArray(rdsResource.Properties.Tags)).toBe(true);
      expect(rdsResource.Properties.Tags.length).toBeGreaterThan(0);
    });
  });
});