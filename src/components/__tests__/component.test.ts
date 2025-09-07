/**
 * Comprehensive Component Tests
 * 
 * Tests for all component implementations following Component API Contract v1.0
 * with three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import { Template, Match } from 'aws-cdk-lib/assertions';
import { Stack, App } from 'aws-cdk-lib';
import { ComponentContext, ComponentSpec } from '../../contracts';
import { LambdaApiComponent } from '../lambda-api/lambda-api.component';
import { LambdaWorkerComponent } from '../lambda-worker/lambda-worker.component';
import { S3BucketComponent } from '../s3-bucket/s3-bucket.component';
import { RdsPostgresComponent } from '../rds-postgres/rds-postgres.component';
import { VpcComponent } from '../vpc/vpc.component';
import { SqsQueueComponent } from '../sqs-queue/sqs-queue.component';
import { SnsTopicComponent } from '../sns-topic/sns-topic.component';
import { Ec2InstanceComponent } from '../ec2-instance/ec2-instance.component';
import { AutoScalingGroupComponent } from '../auto-scaling-group/auto-scaling-group.component';

/**
 * Test utilities for creating mock contexts and specs
 */
class TestUtils {
  static createMockContext(complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial'): ComponentContext {
    return {
      serviceName: 'test-service',
      environment: 'test',
      region: 'us-east-1',
      accountId: '123456789012',
      complianceFramework
    };
  }

  static createMockSpec(componentName: string, config: any = {}): ComponentSpec {
    return {
      name: componentName,
      type: componentName,
      config
    };
  }

  static createTestStack(): Stack {
    const app = new App();
    return new Stack(app, 'TestStack');
  }
}

describe('Lambda API Component', () => {
  let stack: Stack;
  let context: ComponentContext;

  beforeEach(() => {
    stack = TestUtils.createTestStack();
    context = TestUtils.createMockContext();
  });

  test('should create Lambda function and API Gateway for commercial deployment', () => {
    const spec = TestUtils.createMockSpec('test-api', {
      handler: 'index.handler',
      runtime: 'nodejs20.x',
      memory: 512
    });

    const component = new LambdaApiComponent(stack, 'TestLambdaApi', context, spec);
    component.synth();

    const template = Template.fromStack(stack);
    
    // Verify Lambda function creation
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
      Runtime: 'nodejs20.x',
      MemorySize: 512
    });

    // Verify API Gateway creation
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: Match.stringLikeRegexp('test-service-test-api')
    });

    // Verify capabilities are registered
    const capabilities = component.getCapabilities();
    expect(capabilities['lambda:function']).toBeDefined();
    expect(capabilities['api:rest']).toBeDefined();
  });

  test('should apply FedRAMP Moderate hardening', () => {
    context.complianceFramework = 'fedramp-moderate';
    const spec = TestUtils.createMockSpec('fedramp-api', {
      handler: 'index.handler'
    });

    const component = new LambdaApiComponent(stack, 'FedRampLambdaApi', context, spec);
    component.synth();

    const template = Template.fromStack(stack);
    
    // Verify KMS key creation for encryption
    template.hasResourceProperties('AWS::KMS::Key', {
      Description: Match.stringLikeRegexp('Encryption key')
    });

    // Verify Lambda function has X-Ray tracing enabled
    template.hasResourceProperties('AWS::Lambda::Function', {
      TracingConfig: {
        Mode: 'Active'
      }
    });
  });

  test('should apply FedRAMP High hardening with enhanced security', () => {
    context.complianceFramework = 'fedramp-high';
    const spec = TestUtils.createMockSpec('high-security-api', {
      handler: 'index.handler'
    });

    const component = new LambdaApiComponent(stack, 'HighSecurityLambdaApi', context, spec);
    component.synth();

    const template = Template.fromStack(stack);
    
    // Verify KMS key rotation is enabled
    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true
    });

    // Verify extended log retention
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 365
    });
  });
});

describe('S3 Bucket Component', () => {
  let stack: Stack;
  let context: ComponentContext;

  beforeEach(() => {
    stack = TestUtils.createTestStack();
    context = TestUtils.createMockContext();
  });

  test('should create S3 bucket for commercial deployment', () => {
    const spec = TestUtils.createMockSpec('test-bucket', {
      versioning: true,
      eventBridgeEnabled: true
    });

    const component = new S3BucketComponent(stack, 'TestS3Bucket', context, spec);
    component.synth();

    const template = Template.fromStack(stack);
    
    // Verify S3 bucket creation
    template.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: {
        Status: 'Enabled'
      },
      NotificationConfiguration: {
        EventBridgeConfiguration: {
          EventBridgeEnabled: true
        }
      }
    });

    // Verify capabilities are registered
    const capabilities = component.getCapabilities();
    expect(capabilities['bucket:s3']).toBeDefined();
    expect(capabilities['bucket:s3'].bucketName).toBeDefined();
    expect(capabilities['bucket:s3'].bucketArn).toBeDefined();
  });

  test('should apply FedRAMP compliance with audit bucket', () => {
    context.complianceFramework = 'fedramp-moderate';
    const spec = TestUtils.createMockSpec('compliance-bucket', {});

    const component = new S3BucketComponent(stack, 'ComplianceBucket', context, spec);
    component.synth();

    const template = Template.fromStack(stack);
    
    // Verify audit bucket creation
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: Match.stringLikeRegexp('audit')
    });

    // Verify KMS encryption
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: Match.anyValue()
      }
    });
  });

  test('should apply Object Lock for FedRAMP High', () => {
    context.complianceFramework = 'fedramp-high';
    const spec = TestUtils.createMockSpec('immutable-bucket', {});

    const component = new S3BucketComponent(stack, 'ImmutableBucket', context, spec);
    component.synth();

    const template = Template.fromStack(stack);
    
    // Verify Object Lock configuration
    template.hasResourceProperties('AWS::S3::Bucket', {
      ObjectLockEnabled: true,
      ObjectLockConfiguration: Match.objectLike({
        ObjectLockEnabled: 'Enabled'
      })
    });
  });
});

describe('RDS PostgreSQL Component', () => {
  let stack: Stack;
  let context: ComponentContext;

  beforeEach(() => {
    stack = TestUtils.createTestStack();
    context = TestUtils.createMockContext();
  });

  test('should create PostgreSQL database with basic configuration', () => {
    const spec = TestUtils.createMockSpec('test-db', {
      dbName: 'testdb',
      username: 'postgres',
      instanceClass: 'db.t3.micro'
    });

    const component = new RdsPostgresComponent(stack, 'TestPostgres', context, spec);
    component.synth();

    const template = Template.fromStack(stack);
    
    // Verify RDS instance creation
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      Engine: 'postgres',
      DBInstanceClass: 'db.t3.micro',
      DBName: 'testdb'
    });

    // Verify security group creation
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: Match.stringLikeRegexp('PostgreSQL')
    });

    // Verify capabilities
    const capabilities = component.getCapabilities();
    expect(capabilities['db:postgres']).toBeDefined();
    expect(capabilities['db:postgres'].host).toBeDefined();
    expect(capabilities['db:postgres'].port).toBeDefined();
  });

  test('should apply FedRAMP compliance with STIG parameters', () => {
    context.complianceFramework = 'fedramp-high';
    const spec = TestUtils.createMockSpec('compliant-db', {
      dbName: 'compliancedb'
    });

    const component = new RdsPostgresComponent(stack, 'CompliantPostgres', context, spec);
    component.synth();

    const template = Template.fromStack(stack);
    
    // Verify parameter group with STIG compliance
    template.hasResourceProperties('AWS::RDS::DBParameterGroup', {
      Description: Match.stringLikeRegexp('STIG-compliant')
    });

    // Verify enhanced monitoring
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      MonitoringInterval: 60
    });
  });
});

describe('VPC Component', () => {
  let stack: Stack;
  let context: ComponentContext;

  beforeEach(() => {
    stack = TestUtils.createTestStack();
    context = TestUtils.createMockContext();
  });

  test('should create VPC with proper subnet configuration', () => {
    const spec = TestUtils.createMockSpec('test-vpc', {
      cidr: '10.0.0.0/16',
      maxAzs: 2,
      flowLogsEnabled: true
    });

    const component = new VpcComponent(stack, 'TestVpc', context, spec);
    component.synth();

    const template = Template.fromStack(stack);
    
    // Verify VPC creation
    template.hasResourceProperties('AWS::EC2::VPC', {
      CidrBlock: '10.0.0.0/16'
    });

    // Verify Flow Logs
    template.hasResourceProperties('AWS::EC2::FlowLog', {
      ResourceType: 'VPC'
    });

    // Verify capabilities
    const capabilities = component.getCapabilities();
    expect(capabilities['net:vpc']).toBeDefined();
    expect(capabilities['net:vpc'].vpcId).toBeDefined();
  });

  test('should create VPC Endpoints for compliance frameworks', () => {
    context.complianceFramework = 'fedramp-high';
    const spec = TestUtils.createMockSpec('secure-vpc', {});

    const component = new VpcComponent(stack, 'SecureVpc', context, spec);
    component.synth();

    const template = Template.fromStack(stack);
    
    // Verify VPC endpoints creation
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: Match.stringLikeRegexp('s3')
    });
  });
});

describe('SQS Queue Component', () => {
  let stack: Stack;
  let context: ComponentContext;

  beforeEach(() => {
    stack = TestUtils.createTestStack();
    context = TestUtils.createMockContext();
  });

  test('should create SQS queue with dead letter queue', () => {
    const spec = TestUtils.createMockSpec('test-queue', {
      queueName: 'test-queue',
      deadLetterQueue: {
        enabled: true,
        maxReceiveCount: 3
      }
    });

    const component = new SqsQueueComponent(stack, 'TestQueue', context, spec);
    component.synth();

    const template = Template.fromStack(stack);
    
    // Verify main queue creation
    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'test-queue'
    });

    // Verify dead letter queue
    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'test-queue-dlq'
    });

    // Verify capabilities
    const capabilities = component.getCapabilities();
    expect(capabilities['queue:sqs']).toBeDefined();
  });

  test('should apply compliance hardening with encryption', () => {
    context.complianceFramework = 'fedramp-moderate';
    const spec = TestUtils.createMockSpec('secure-queue', {});

    const component = new SqsQueueComponent(stack, 'SecureQueue', context, spec);
    component.synth();

    const template = Template.fromStack(stack);
    
    // Verify KMS encryption
    template.hasResourceProperties('AWS::SQS::Queue', {
      KmsMasterKeyId: Match.anyValue()
    });
  });
});

describe('SNS Topic Component', () => {
  let stack: Stack;
  let context: ComponentContext;

  beforeEach(() => {
    stack = TestUtils.createTestStack();
    context = TestUtils.createMockContext();
  });

  test('should create SNS topic with basic configuration', () => {
    const spec = TestUtils.createMockSpec('test-topic', {
      topicName: 'test-topic',
      displayName: 'Test Topic'
    });

    const component = new SnsTopicComponent(stack, 'TestTopic', context, spec);
    component.synth();

    const template = Template.fromStack(stack);
    
    // Verify topic creation
    template.hasResourceProperties('AWS::SNS::Topic', {
      TopicName: 'test-topic',
      DisplayName: 'Test Topic'
    });

    // Verify capabilities
    const capabilities = component.getCapabilities();
    expect(capabilities['topic:sns']).toBeDefined();
  });
});

describe('EC2 Instance Component', () => {
  let stack: Stack;
  let context: ComponentContext;

  beforeEach(() => {
    stack = TestUtils.createTestStack();
    context = TestUtils.createMockContext();
  });

  test('should create EC2 instance with security hardening', () => {
    const spec = TestUtils.createMockSpec('test-instance', {
      instanceType: 't3.micro',
      keyPair: { keyName: 'test-key' }
    });

    const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
    component.synth();

    const template = Template.fromStack(stack);
    
    // Verify EC2 instance creation
    template.hasResourceProperties('AWS::EC2::Instance', {
      InstanceType: 't3.micro',
      KeyName: 'test-key'
    });

    // Verify IAM role creation
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Principal: {
              Service: 'ec2.amazonaws.com'
            }
          })
        ])
      })
    });

    // Verify capabilities
    const capabilities = component.getCapabilities();
    expect(capabilities['compute:ec2']).toBeDefined();
  });

  test('should apply STIG hardening for FedRAMP High', () => {
    context.complianceFramework = 'fedramp-high';
    const spec = TestUtils.createMockSpec('stig-instance', {});

    const component = new Ec2InstanceComponent(stack, 'STIGInstance', context, spec);
    component.synth();

    const template = Template.fromStack(stack);
    
    // Verify EBS encryption with customer-managed key
    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true
    });
  });
});

describe('Auto Scaling Group Component', () => {
  let stack: Stack;
  let context: ComponentContext;

  beforeEach(() => {
    stack = TestUtils.createTestStack();
    context = TestUtils.createMockContext();
  });

  test('should create Auto Scaling Group with launch template', () => {
    const spec = TestUtils.createMockSpec('test-asg', {
      launchTemplate: {
        instanceType: 't3.micro'
      },
      autoScaling: {
        minCapacity: 1,
        maxCapacity: 3,
        desiredCapacity: 2
      }
    });

    const component = new AutoScalingGroupComponent(stack, 'TestASG', context, spec);
    component.synth();

    const template = Template.fromStack(stack);
    
    // Verify Launch Template creation
    template.hasResourceProperties('AWS::EC2::LaunchTemplate', {
      LaunchTemplateName: Match.stringLikeRegexp('test-service-test-asg')
    });

    // Verify Auto Scaling Group creation
    template.hasResourceProperties('AWS::AutoScaling::AutoScalingGroup', {
      MinSize: '1',
      MaxSize: '3',
      DesiredCapacity: '2'
    });

    // Verify capabilities
    const capabilities = component.getCapabilities();
    expect(capabilities['compute:asg']).toBeDefined();
  });
});

/**
 * Integration tests for component interactions
 */
describe('Component Integration Tests', () => {
  let stack: Stack;
  let context: ComponentContext;

  beforeEach(() => {
    stack = TestUtils.createTestStack();
    context = TestUtils.createMockContext('fedramp-moderate');
  });

  test('should create integrated infrastructure with consistent compliance', () => {
    // Create VPC
    const vpcSpec = TestUtils.createMockSpec('app-vpc', {});
    const vpcComponent = new VpcComponent(stack, 'AppVpc', context, vpcSpec);
    vpcComponent.synth();

    // Create RDS in the VPC
    const dbSpec = TestUtils.createMockSpec('app-db', { dbName: 'appdb' });
    const dbComponent = new RdsPostgresComponent(stack, 'AppDatabase', context, dbSpec);
    dbComponent.synth();

    // Create Lambda API
    const apiSpec = TestUtils.createMockSpec('app-api', { handler: 'api.handler' });
    const apiComponent = new LambdaApiComponent(stack, 'AppApi', context, apiSpec);
    apiComponent.synth();

    const template = Template.fromStack(stack);
    
    // Verify all components are created with consistent compliance settings
    // All should have KMS keys with rotation for FedRAMP Moderate
    const kmsKeyCount = template.findResources('AWS::KMS::Key');
    expect(Object.keys(kmsKeyCount).length).toBeGreaterThan(0);

    // Verify capabilities from all components
    const vpcCapabilities = vpcComponent.getCapabilities();
    const dbCapabilities = dbComponent.getCapabilities();
    const apiCapabilities = apiComponent.getCapabilities();

    expect(vpcCapabilities['net:vpc']).toBeDefined();
    expect(dbCapabilities['db:postgres']).toBeDefined();
    expect(apiCapabilities['lambda:function']).toBeDefined();
  });

  test('should validate capability data shapes match contract specifications', () => {
    const s3Spec = TestUtils.createMockSpec('test-bucket', {});
    const s3Component = new S3BucketComponent(stack, 'TestBucket', context, s3Spec);
    s3Component.synth();

    const capabilities = s3Component.getCapabilities();
    const s3Capability = capabilities['bucket:s3'];

    // Verify S3 capability matches contract
    expect(s3Capability).toHaveProperty('bucketName');
    expect(s3Capability).toHaveProperty('bucketArn');
    expect(typeof s3Capability.bucketName).toBe('string');
    expect(typeof s3Capability.bucketArn).toBe('string');
    expect(s3Capability.bucketArn).toMatch(/^arn:aws:s3:::/);
  });
});

/**
 * Compliance framework behavior tests
 */
describe('Compliance Framework Behavior', () => {
  let stack: Stack;

  beforeEach(() => {
    stack = TestUtils.createTestStack();
  });

  test.each([
    ['commercial'],
    ['fedramp-moderate'],
    ['fedramp-high']
  ] as const)('should apply consistent %s compliance across all components', (framework) => {
    const context = TestUtils.createMockContext(framework);

    // Test a representative set of components
    const components = [
      new LambdaApiComponent(stack, `Lambda${framework}`, context, TestUtils.createMockSpec('lambda', { handler: 'test.handler' })),
      new S3BucketComponent(stack, `S3${framework}`, context, TestUtils.createMockSpec('bucket', {})),
      new RdsPostgresComponent(stack, `RDS${framework}`, context, TestUtils.createMockSpec('db', { dbName: 'testdb' }))
    ];

    // Synthesize all components
    components.forEach(component => component.synth());

    const template = Template.fromStack(stack);

    if (framework !== 'commercial') {
      // Verify compliance frameworks create KMS keys
      const kmsKeys = template.findResources('AWS::KMS::Key');
      expect(Object.keys(kmsKeys).length).toBeGreaterThan(0);

      if (framework === 'fedramp-high') {
        // Verify key rotation is enabled for FedRAMP High
        template.hasResourceProperties('AWS::KMS::Key', {
          EnableKeyRotation: true
        });
      }
    }

    // Verify all components register their capabilities correctly
    components.forEach(component => {
      const capabilities = component.getCapabilities();
      expect(Object.keys(capabilities).length).toBeGreaterThan(0);
    });
  });
});