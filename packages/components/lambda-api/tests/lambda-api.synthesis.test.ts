import { describe, test, expect, beforeEach } from '@jest/globals';
import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { LambdaApiComponent } from '../src/lambda-api.component';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/src/component-interfaces';

describe('LambdaApiComponent - CloudFormation Synthesis', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let component: LambdaApiComponent;
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
      name: 'test-api',
      type: 'lambda-api',
      config: {
        functionName: 'TestAPIFunction',
        code: {
          handler: 'src/api.handler',
          runtime: 'nodejs18.x',
          zipFile: './dist/api.zip'
        },
        memorySize: 512,
        timeout: 30
      }
    };
  });

  describe('CloudFormation Resource Generation', () => {
    test('should generate Lambda function with correct properties', () => {
      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);
      
      // Verify Lambda function is created
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'TestAPIFunction',
        Handler: 'src/api.handler',
        Runtime: 'nodejs18.x',
        MemorySize: 512,
        Timeout: 30
      });

      // Verify execution role is created
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: { Service: 'lambda.amazonaws.com' },
              Action: 'sts:AssumeRole'
            }
          ]
        }
      });

      // Verify CloudWatch Log Group is created
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/aws/lambda/TestAPIFunction'
      });
    });

    test('should configure VPC settings when provided', () => {
      mockSpec.config.vpcConfig = {
        vpcId: 'vpc-12345678',
        subnetIds: ['subnet-12345678', 'subnet-87654321'],
        securityGroupIds: ['sg-12345678']
      };

      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify VPC configuration
      template.hasResourceProperties('AWS::Lambda::Function', {
        VpcConfig: {
          SubnetIds: ['subnet-12345678', 'subnet-87654321'],
          SecurityGroupIds: ['sg-12345678']
        }
      });

      // Verify VPC execution role permissions
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: expect.arrayContaining([
                'ec2:CreateNetworkInterface',
                'ec2:DescribeNetworkInterfaces',
                'ec2:DeleteNetworkInterface'
              ])
            })
          ])
        }
      });
    });

    test('should create environment variables and layers', () => {
      mockSpec.config.environment = {
        variables: {
          NODE_ENV: 'production',
          LOG_LEVEL: 'info',
          API_VERSION: 'v1'
        }
      };
      
      mockSpec.config.layers = [
        'arn:aws:lambda:us-east-1:123456789012:layer:SharedUtilities:1'
      ];

      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify environment variables
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            NODE_ENV: 'production',
            LOG_LEVEL: 'info',
            API_VERSION: 'v1'
          }
        }
      });

      // Verify layers
      template.hasResourceProperties('AWS::Lambda::Function', {
        Layers: ['arn:aws:lambda:us-east-1:123456789012:layer:SharedUtilities:1']
      });
    });
  });

  describe('Compliance Framework Testing', () => {
    test('should apply FedRAMP Moderate hardening', () => {
      mockContext.complianceFramework = 'fedramp-moderate';
      
      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify X-Ray tracing is enabled
      template.hasResourceProperties('AWS::Lambda::Function', {
        TracingConfig: {
          Mode: 'Active'
        }
      });

      // Verify enhanced monitoring
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 365  // 1 year retention for FedRAMP Moderate
      });

      // Verify reserved concurrency is set for performance predictability
      template.hasResourceProperties('AWS::Lambda::Function', {
        ReservedConcurrencyExecutions: expect.any(Number)
      });
    });

    test('should apply FedRAMP High security controls', () => {
      mockContext.complianceFramework = 'fedramp-high';
      
      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify mandatory VPC deployment
      template.hasResourceProperties('AWS::Lambda::Function', {
        VpcConfig: expect.objectContaining({
          SubnetIds: expect.any(Array),
          SecurityGroupIds: expect.any(Array)
        })
      });

      // Verify enhanced logging retention
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 3653  // 10 year retention for FedRAMP High
      });

      // Verify KMS encryption for environment variables
      template.hasResourceProperties('AWS::Lambda::Function', {
        KmsKeyArn: expect.stringContaining('arn:aws:kms:')
      });
    });

    test('should configure commercial defaults', () => {
      mockContext.complianceFramework = 'commercial';
      
      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify basic configuration without enhanced security
      template.hasResourceProperties('AWS::Lambda::Function', {
        MemorySize: 512,  // Cost-optimized memory
        Timeout: 30       // Standard timeout
      });

      // Verify shorter log retention for cost optimization
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 14  // 2 weeks retention for commercial
      });
    });
  });

  describe('Capabilities and Outputs', () => {
    test('should register compute:lambda-api capability', () => {
      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const capabilities = component.getCapabilities();
      
      expect(capabilities['compute:lambda-api']).toBeDefined();
      expect(capabilities['compute:lambda-api'].functionName).toBe('TestAPIFunction');
      expect(capabilities['compute:lambda-api'].functionArn).toContain('TestAPIFunction');
      expect(capabilities['compute:lambda-api'].roleArn).toContain('role/');
    });

    test('should provide correct CloudFormation outputs', () => {
      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify function ARN output
      template.hasOutput('TestLambdaApiFunctionArn', {
        Value: { 'Fn::GetAtt': [expect.any(String), 'Arn'] },
        Export: { Name: expect.stringContaining('TestAPIFunction-arn') }
      });

      // Verify function name output  
      template.hasOutput('TestLambdaApiFunctionName', {
        Value: { Ref: expect.any(String) },
        Export: { Name: expect.stringContaining('TestAPIFunction-name') }
      });
    });
  });

  describe('Integration Features', () => {
    test('should configure dead letter queue when specified', () => {
      mockSpec.config.deadLetterQueue = {
        targetArn: 'arn:aws:sqs:us-east-1:123456789012:dlq'
      };

      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        DeadLetterConfig: {
          TargetArn: 'arn:aws:sqs:us-east-1:123456789012:dlq'
        }
      });
    });

    test('should configure provisioned concurrency for high traffic', () => {
      mockSpec.config.provisionedConcurrency = 10;

      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::ProvisionedConcurrencyConfig', {
        FunctionName: { Ref: expect.any(String) },
        ProvisionedConcurrencyExecutions: 10,
        Qualifier: '$LATEST'
      });
    });
  });

  describe('Error Conditions', () => {
    test('should fail synthesis with invalid runtime', () => {
      mockSpec.config.code.runtime = 'invalid-runtime';

      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow();
    });

    test('should fail synthesis with missing handler', () => {
      delete mockSpec.config.code.handler;

      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow('handler is required');
    });

    test('should fail synthesis with excessive timeout', () => {
      mockSpec.config.timeout = 1000;  // Exceeds AWS limit

      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow();
    });
  });

  describe('CloudFormation Template Validation', () => {
    test('should generate syntactically valid CloudFormation', () => {
      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      
      // Basic CloudFormation structure validation
      expect(cfnTemplate).toHaveProperty('AWSTemplateFormatVersion', '2010-09-09');
      expect(cfnTemplate).toHaveProperty('Resources');
      
      // Ensure all required Lambda resources are present
      const lambdaFunctions = Object.entries(cfnTemplate.Resources)
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::Lambda::Function');
      
      expect(lambdaFunctions).toHaveLength(1);
      
      const iamRoles = Object.entries(cfnTemplate.Resources)
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::IAM::Role');
      
      expect(iamRoles.length).toBeGreaterThanOrEqual(1);
    });

    test('should include all necessary IAM permissions', () => {
      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify basic execution role permissions
      template.hasResourceProperties('AWS::IAM::Role', {
        ManagedPolicyArns: expect.arrayContaining([
          'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
        ])
      });
    });
  });
});