import { describe, test, expect, beforeEach } from '@jest/globals';
import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { RdsPostgresComponent } from '../../../packages/components/rds-postgres/src/rds-postgres.component';
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
      
      // Verify RDS instance is created
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        DBInstanceIdentifier: 'test-postgres-db',
        DBName: 'testapp',
        Engine: 'postgres',
        EngineVersion: '15.4',
        DBInstanceClass: 'db.t3.micro',
        AllocatedStorage: '20',
        MasterUsername: 'dbadmin'
      });

      // Verify DB subnet group is created
      template.hasResourceProperties('AWS::RDS::DBSubnetGroup', {
        DBSubnetGroupDescription: 'Subnet group for test-postgres-db'
      });

      // Verify security group is created
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'Security group for test-postgres-db',
        SecurityGroupIngress: [
          {
            IpProtocol: 'tcp',
            FromPort: 5432,
            ToPort: 5432,
            SourceSecurityGroupId: expect.any(Object)
          }
        ]
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

    test('should create secrets manager secret for password', () => {
      mockSpec.config.manageMasterUserPassword = true;

      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify secret is created
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Description: expect.stringContaining('Master user password for test-postgres-db'),
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

    test('should configure backup and maintenance windows', () => {
      mockSpec.config.backupRetentionPeriod = 30;
      mockSpec.config.backupWindow = '03:00-04:00';
      mockSpec.config.maintenanceWindow = 'sun:04:00-sun:05:00';

      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::RDS::DBInstance', {
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

      // Verify enhanced instance class for compliance
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        DBInstanceClass: expect.stringMatching(/db\.(r5|r6g|m5|m6g)\./)
      });

      // Verify Performance Insights is enabled
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        EnablePerformanceInsights: true,
        PerformanceInsightsRetentionPeriod: 7
      });

      // Verify enhanced backup retention
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        BackupRetentionPeriod: 30
      });

      // Verify CloudWatch logs exports
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        EnableCloudwatchLogsExports: ['postgresql']
      });
    });

    test('should apply FedRAMP High security controls', () => {
      mockContext.complianceFramework = 'fedramp-high';
      
      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify customer-managed KMS key for encryption
      template.hasResourceProperties('AWS::KMS::Key', {
        Description: expect.stringContaining('RDS encryption key'),
        KeyPolicy: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Principal: { AWS: expect.stringContaining('root') }
            })
          ])
        }
      });

      // Verify enhanced monitoring is enabled
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        MonitoringInterval: 15,
        MonitoringRoleArn: expect.stringContaining('role/')
      });

      // Verify deletion protection is enabled
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        DeletionProtection: true
      });

      // Verify extended backup retention
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        BackupRetentionPeriod: 35
      });
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

      // Verify read replica is created
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        DBInstanceIdentifier: 'test-postgres-read-1',
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
    test('should register database:postgres capability', () => {
      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const capabilities = component.getCapabilities();
      
      expect(capabilities['database:postgres']).toBeDefined();
      expect(capabilities['database:postgres'].host).toBeDefined();
      expect(capabilities['database:postgres'].port).toBe(5432);
      expect(capabilities['database:postgres'].databaseName).toBe('testapp');
      expect(capabilities['database:postgres'].secretArn).toContain('arn:aws:secretsmanager:');
    });

    test('should provide correct CloudFormation outputs', () => {
      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify database endpoint output
      template.hasOutput('TestRdsPostgresEndpoint', {
        Value: { 'Fn::GetAtt': [expect.any(String), 'Endpoint.Address'] },
        Export: { Name: expect.stringContaining('test-postgres-db-endpoint') }
      });

      // Verify database port output
      template.hasOutput('TestRdsPostgresPort', {
        Value: { 'Fn::GetAtt': [expect.any(String), 'Endpoint.Port'] },
        Export: { Name: expect.stringContaining('test-postgres-db-port') }
      });
    });
  });

  describe('Error Conditions', () => {
    test('should fail synthesis with invalid engine version', () => {
      mockSpec.config.engineVersion = '99.9';

      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow();
    });

    test('should fail synthesis with insufficient storage', () => {
      mockSpec.config.allocatedStorage = 5;  // Below minimum for PostgreSQL

      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow();
    });

    test('should fail synthesis with missing required configuration', () => {
      delete mockSpec.config.masterUsername;

      component = new RdsPostgresComponent(stack, 'TestRdsPostgres', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow('masterUsername is required');
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
    });
  });
});