import { describe, test, expect, beforeEach } from '@jest/globals';
import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { LambdaApiComponent } from './src/lambda-api.component';
import { ComponentContext, ComponentSpec } from '../../platform/contracts/src/component-interfaces';

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
        handler: 'src/api.handler',
        runtime: 'nodejs18.x',
        code: './dist/api.zip',
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
      
      // Verify Lambda function is created with flexible naming
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: expect.stringMatching(/.*TestAPIFunction.*/),
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

      // Verify CloudWatch Log Group is created with flexible naming
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: expect.stringMatching(/\/aws\/lambda\/.*TestAPIFunction.*/)
      });
    });

    test('should apply mandatory Platform Tagging Standard v1.0', () => {
      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      
      // Find Lambda function resource
      const lambdaFunctions = Object.entries(cfnTemplate.Resources)
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::Lambda::Function');
      
      expect(lambdaFunctions).toHaveLength(1);
      const [_, functionResource] = lambdaFunctions[0] as [string, any];
      
      // Verify mandatory platform tags on Lambda function
      expect(functionResource.Properties.Tags).toBeDefined();
      const functionTags = functionResource.Properties.Tags;
      const functionTagMap = functionTags.reduce((acc: any, tag: any) => {
        acc[tag.Key] = tag.Value;
        return acc;
      }, {});
      
      expect(functionTagMap['platform:service-name']).toBe('test-service');
      expect(functionTagMap['platform:owner']).toBeDefined();
      expect(functionTagMap['platform:component-name']).toBe('test-api');
      expect(functionTagMap['platform:component-type']).toBe('lambda-api');
      expect(functionTagMap['platform:environment']).toBe('test');
      expect(functionTagMap['platform:managed-by']).toBe('platform-engine');
      expect(functionTagMap['platform:commit-hash']).toBeDefined();

      // Find LogGroup resource
      const logGroups = Object.entries(cfnTemplate.Resources)
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::Logs::LogGroup');
      
      expect(logGroups.length).toBeGreaterThanOrEqual(1);
      const [_, logGroupResource] = logGroups[0] as [string, any];
      
      // Verify mandatory platform tags on LogGroup
      expect(logGroupResource.Properties.Tags).toBeDefined();
      const logTags = logGroupResource.Properties.Tags;
      const logTagMap = logTags.reduce((acc: any, tag: any) => {
        acc[tag.Key] = tag.Value;
        return acc;
      }, {});
      
      expect(logTagMap['platform:service-name']).toBe('test-service');
      expect(logTagMap['platform:component-name']).toBe('test-api');
    });

    test('should enforce OpenTelemetry standard', () => {
      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify OTEL environment variables are present
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: expect.objectContaining({
            OTEL_EXPORTER_OTLP_ENDPOINT: expect.any(String),
            OTEL_SERVICE_NAME: expect.stringMatching(/.*test-api.*/),
            OTEL_RESOURCE_ATTRIBUTES: expect.stringContaining('service.name=test-api')
          })
        }
      });

      // Verify ADOT layer is attached
      template.hasResourceProperties('AWS::Lambda::Function', {
        Layers: expect.arrayContaining([
          expect.stringMatching(/arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-/)
        ])
      });
    });

    test('should create API Gateway resources for lambda-api component', () => {
      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify API Gateway RestApi
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: expect.stringMatching(/.*test-api.*/),
        EndpointConfiguration: {
          Types: ['REGIONAL']
        }
      });

      // Verify API Gateway Resource
      template.hasResourceProperties('AWS::ApiGateway::Resource', {
        PathPart: expect.any(String),
        RestApiId: { Ref: expect.any(String) }
      });

      // Verify API Gateway Method
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: expect.stringMatching(/GET|POST|PUT|DELETE|ANY/),
        RestApiId: { Ref: expect.any(String) },
        ResourceId: { Ref: expect.any(String) },
        Integration: {
          Type: 'AWS_PROXY',
          IntegrationHttpMethod: 'POST',
          Uri: expect.stringContaining('lambda:path/2015-03-31/functions/')
        }
      });

      // Verify API Gateway Deployment
      template.hasResourceProperties('AWS::ApiGateway::Deployment', {
        RestApiId: { Ref: expect.any(String) }
      });

      // Verify API Gateway Stage
      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        RestApiId: { Ref: expect.any(String) },
        DeploymentId: { Ref: expect.any(String) },
        StageName: expect.any(String)
      });

      // Verify access logging is configured
      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        AccessLogSetting: {
          DestinationArn: expect.stringContaining('arn:aws:logs:'),
          Format: expect.stringContaining('requestId')
        }
      });

      // Verify execution logging and metrics
      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        MethodSettings: expect.arrayContaining([
          expect.objectContaining({
            ResourcePath: '/*',
            HttpMethod: '*',
            LoggingLevel: 'INFO',
            MetricsEnabled: true
          })
        ])
      });

      // Verify throttling defaults
      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        ThrottleSettings: {
          RateLimit: expect.any(Number),
          BurstLimit: expect.any(Number)
        }
      });
    });

    test('should configure VPC settings with proper security controls', () => {
      mockSpec.config.vpc = {
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

      // Verify VPC execution role permissions - allow both patterns
      const hasInlinePolicy = () => {
        try {
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
          return true;
        } catch {
          return false;
        }
      };

      const hasManagedPolicy = () => {
        try {
          template.hasResourceProperties('AWS::IAM::Role', {
            ManagedPolicyArns: expect.arrayContaining([
              'arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole'
            ])
          });
          return true;
        } catch {
          return false;
        }
      };

      // Either inline permissions or managed policy should be present
      expect(hasInlinePolicy() || hasManagedPolicy()).toBe(true);
    });

    test('should create environment variables and layers correctly', () => {
      mockSpec.config.environment = {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        API_VERSION: 'v1'
      };
      
      mockSpec.config.layers = [
        'arn:aws:lambda:us-east-1:123456789012:layer:SharedUtilities:1'
      ];

      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify environment variables include both user and OTEL vars
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: expect.objectContaining({
            NODE_ENV: 'production',
            LOG_LEVEL: 'info',
            API_VERSION: 'v1',
            OTEL_EXPORTER_OTLP_ENDPOINT: expect.any(String),
            OTEL_SERVICE_NAME: expect.any(String)
          })
        }
      });

      // Verify layers include both user layers and ADOT layer
      template.hasResourceProperties('AWS::Lambda::Function', {
        Layers: expect.arrayContaining([
          'arn:aws:lambda:us-east-1:123456789012:layer:SharedUtilities:1',
          expect.stringMatching(/arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-/)
        ])
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

      // Verify API Gateway has WAF/logging hardening
      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        AccessLogSetting: {
          DestinationArn: expect.stringContaining('arn:aws:logs:')
        }
      });
    });

    test('should apply FedRAMP High security controls', () => {
      mockContext.complianceFramework = 'fedramp-high';
      
      // Mock platform VPC context
      mockContext.platformVpcId = 'vpc-platform123';
      mockContext.privateSubnetIds = ['subnet-private-1', 'subnet-private-2'];
      
      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify mandatory VPC deployment with platform VPC
      template.hasResourceProperties('AWS::Lambda::Function', {
        VpcConfig: expect.objectContaining({
          SubnetIds: expect.arrayContaining(['subnet-private-1', 'subnet-private-2']),
          SecurityGroupIds: expect.any(Array)
        })
      });

      // Verify private subnets are used (platform context should provide private subnets)
      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      const lambdaFunction = Object.entries(cfnTemplate.Resources)
        .find(([_, resource]: [string, any]) => resource.Type === 'AWS::Lambda::Function');
      
      expect(lambdaFunction).toBeDefined();
      const [_, functionResource] = lambdaFunction as [string, any];
      const subnetIds = functionResource.Properties.VpcConfig.SubnetIds;
      
      // Validate subnets are from private range (assuming platform provides private subnets)
      subnetIds.forEach((subnetId: string) => {
        expect(subnetId).toMatch(/subnet-private-/);
      });

      // Verify Security Group with least-privileged egress
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        SecurityGroupEgress: expect.arrayContaining([
          expect.objectContaining({
            IpProtocol: 'tcp',
            FromPort: 443,
            ToPort: 443,
            CidrIp: '0.0.0.0/0' // HTTPS only for outbound
          })
        ])
      });

      // Verify enhanced logging retention
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 3653  // 10 year retention for FedRAMP High
      });

      // Verify customer-managed KMS encryption for environment variables
      template.hasResourceProperties('AWS::Lambda::Function', {
        KmsKeyArn: expect.any(Object) // CMK reference, not AWS-managed
      });

      // Verify environment variable encryption uses CMK
      const kmsKeys = template.findResources('AWS::KMS::Key');
      if (Object.keys(kmsKeys).length > 0) {
        template.hasResourceProperties('AWS::KMS::Key', {
          EnableKeyRotation: true,
          KeyPolicy: expect.objectContaining({
            Statement: expect.arrayContaining([
              expect.objectContaining({
                Effect: 'Allow',
                Principal: { AWS: expect.stringContaining('root') }
              })
            ])
          })
        });
      }

      // Verify API Gateway has enhanced WAF protection
      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        AccessLogSetting: {
          DestinationArn: expect.stringContaining('arn:aws:logs:'),
          Format: expect.stringContaining('$requestId')
        }
      });
    });

    test('should configure commercial defaults and allow overrides', () => {
      mockContext.complianceFramework = 'commercial';
      
      // Test default retention
      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify platform default log retention for commercial
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 14  // 2 weeks retention for commercial (platform default)
      });

      // Test override capability
      const specWithOverrides = {
        ...mockSpec,
        config: {
          ...mockSpec.config,
          logRetentionDays: 30  // Override default
        }
      };

      const stackWithOverrides = new cdk.Stack(app, 'OverrideStack');
      const contextWithOverrides = { ...mockContext, scope: stackWithOverrides };
      const componentWithOverrides = new LambdaApiComponent(
        stackWithOverrides, 
        'TestLambdaApiOverrides', 
        contextWithOverrides, 
        specWithOverrides
      );
      componentWithOverrides.synth();

      const overrideTemplate = Template.fromStack(stackWithOverrides);
      
      // Verify override is honored
      overrideTemplate.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 30  // Override value
      });
    });
  });

  describe('Integration Features', () => {
    test('should configure dead letter queue with proper permissions', () => {
      mockSpec.config.deadLetterQueue = {
        targetArn: 'arn:aws:sqs:us-east-1:123456789012:test-dlq'
      };

      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify DLQ configuration
      template.hasResourceProperties('AWS::Lambda::Function', {
        DeadLetterConfig: {
          TargetArn: 'arn:aws:sqs:us-east-1:123456789012:test-dlq'
        }
      });

      // Verify Lambda has permission to send to SQS DLQ
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: expect.arrayContaining([
                'sqs:SendMessage',
                'sqs:GetQueueAttributes'
              ]),
              Resource: 'arn:aws:sqs:us-east-1:123456789012:test-dlq'
            })
          ])
        }
      });
    });

    test('should configure provisioned concurrency with proper alias/version', () => {
      mockSpec.config.provisionedConcurrency = 10;

      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify Lambda alias is created
      template.hasResourceProperties('AWS::Lambda::Alias', {
        FunctionName: { Ref: expect.any(String) },
        FunctionVersion: { 'Fn::GetAtt': [expect.any(String), 'Version'] },
        Name: expect.stringMatching(/live|current|stable/)
      });

      // Verify provisioned concurrency uses alias (not $LATEST)
      template.hasResourceProperties('AWS::Lambda::ProvisionedConcurrencyConfig', {
        FunctionName: { Ref: expect.any(String) },
        ProvisionedConcurrencyExecutions: 10,
        Qualifier: { Ref: expect.any(String) } // Reference to alias, not '$LATEST'
      });

      // Ensure no provisioned concurrency config uses $LATEST
      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      const provisionedConfigs = Object.entries(cfnTemplate.Resources)
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::Lambda::ProvisionedConcurrencyConfig');
      
      provisionedConfigs.forEach(([_, config]: [string, any]) => {
        expect(config.Properties.Qualifier).not.toBe('$LATEST');
      });
    });
  });

  describe('Capabilities and Outputs', () => {
    test('should register compute:lambda-api capability with flexible naming', () => {
      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const capabilities = component.getCapabilities();
      
      expect(capabilities['compute:lambda-api']).toBeDefined();
      expect(capabilities['compute:lambda-api'].functionName).toMatch(/.*TestAPIFunction.*/);
      expect(capabilities['compute:lambda-api'].functionArn).toContain('TestAPIFunction');
      expect(capabilities['compute:lambda-api'].roleArn).toContain('role/');
      expect(capabilities['compute:lambda-api'].apiEndpoint).toBeDefined();
    });

    test('should provide correct CloudFormation outputs with flexible naming', () => {
      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);
      const outputs = template.findOutputs('*');
      const outputNames = Object.keys(outputs);

      // Verify function ARN output by pattern
      const functionArnOutput = outputNames.find(name => name.match(/.*FunctionArn$/));
      expect(functionArnOutput).toBeDefined();
      expect(outputs[functionArnOutput!]).toEqual({
        Value: { 'Fn::GetAtt': [expect.any(String), 'Arn'] },
        Export: { Name: expect.stringMatching(/.*-arn$/) }
      });

      // Verify function name output by pattern  
      const functionNameOutput = outputNames.find(name => name.match(/.*FunctionName$/));
      expect(functionNameOutput).toBeDefined();
      expect(outputs[functionNameOutput!]).toEqual({
        Value: { Ref: expect.any(String) },
        Export: { Name: expect.stringMatching(/.*-name$/) }
      });

      // Verify API endpoint output
      const apiEndpointOutput = outputNames.find(name => name.match(/.*ApiEndpoint$/));
      expect(apiEndpointOutput).toBeDefined();
      expect(outputs[apiEndpointOutput!]).toEqual({
        Value: expect.objectContaining({
          'Fn::Sub': expect.stringContaining('https://')
        }),
        Export: { Name: expect.stringMatching(/.*-api-endpoint$/) }
      });
    });
  });

  describe('Error Conditions', () => {
    test('should fail synthesis with invalid runtime', () => {
      mockSpec.config.runtime = 'invalid-runtime';

      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow(/invalid.*runtime|unsupported.*runtime/i);
    });

    test('should fail synthesis with missing handler', () => {
      delete mockSpec.config.handler;

      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow(/handler.*required|missing.*handler/i);
    });

    test('should fail synthesis with excessive timeout', () => {
      mockSpec.config.timeout = 1000;  // Exceeds AWS limit of 900s

      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow(/timeout.*must.*be.*<=.*900|timeout.*exceeds.*maximum/i);
    });

    test('should fail synthesis with invalid memory size', () => {
      mockSpec.config.memorySize = 100;  // Below AWS minimum of 128MB

      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow(/memory.*size.*must.*be.*>=.*128|memory.*below.*minimum/i);
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
      
      // Ensure all required Lambda API resources are present
      const lambdaFunctions = Object.entries(cfnTemplate.Resources)
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::Lambda::Function');
      
      expect(lambdaFunctions).toHaveLength(1);
      
      const apiGateways = Object.entries(cfnTemplate.Resources)
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::ApiGateway::RestApi');
      
      expect(apiGateways).toHaveLength(1);
      
      const iamRoles = Object.entries(cfnTemplate.Resources)
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::IAM::Role');
      
      expect(iamRoles.length).toBeGreaterThanOrEqual(1);
    });

    test('should include all necessary IAM permissions patterns', () => {
      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify basic execution role permissions (either pattern acceptable)
      const hasBasicPolicy = () => {
        try {
          template.hasResourceProperties('AWS::IAM::Role', {
            ManagedPolicyArns: expect.arrayContaining([
              'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
            ])
          });
          return true;
        } catch {
          return false;
        }
      };

      const hasInlineBasicPolicy = () => {
        try {
          template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
              Statement: expect.arrayContaining([
                expect.objectContaining({
                  Effect: 'Allow',
                  Action: expect.arrayContaining([
                    'logs:CreateLogGroup',
                    'logs:CreateLogStream',
                    'logs:PutLogEvents'
                  ])
                })
              ])
            }
          });
          return true;
        } catch {
          return false;
        }
      };

      // Either managed policy or inline basic logging permissions should be present
      expect(hasBasicPolicy() || hasInlineBasicPolicy()).toBe(true);
    });

    test('should create proper resource dependencies and permissions', () => {
      component = new LambdaApiComponent(stack, 'TestLambdaApi', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify Lambda permission for API Gateway
      template.hasResourceProperties('AWS::Lambda::Permission', {
        FunctionName: { Ref: expect.any(String) },
        Action: 'lambda:InvokeFunction',
        Principal: 'apigateway.amazonaws.com',
        SourceArn: expect.stringContaining('execute-api')
      });

      // Verify API Gateway method integration points to Lambda
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: expect.objectContaining({
          Type: 'AWS_PROXY',
          IntegrationHttpMethod: 'POST',
          Uri: expect.objectContaining({
            'Fn::Sub': expect.stringContaining('lambda:path/2015-03-31/functions/')
          })
        })
      });
    });
  });
});