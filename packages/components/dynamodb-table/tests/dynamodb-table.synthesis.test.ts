import { describe, test, expect, beforeEach } from '@jest/globals';
import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { DynamodbTableComponent } from '../src/dynamodb-table.component';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/src/component-interfaces';

describe('DynamodbTableComponent - CloudFormation Synthesis', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let component: DynamodbTableComponent;
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
      name: 'test-table',
      type: 'dynamodb-table',
      config: {
        tableName: 'test-service-data-table',
        partitionKey: {
          name: 'pk',
          type: 'S'
        },
        sortKey: {
          name: 'sk', 
          type: 'S'
        }
      }
    };
  });

  describe('Basic CloudFormation Synthesis', () => {
    test('should create DynamoDB table with basic configuration', () => {
      component = new DynamodbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'test-service-data-table',
        KeySchema: [
          {
            AttributeName: 'pk',
            KeyType: 'HASH'
          },
          {
            AttributeName: 'sk',
            KeyType: 'RANGE'
          }
        ],
        AttributeDefinitions: [
          {
            AttributeName: 'pk',
            AttributeType: 'S'
          },
          {
            AttributeName: 'sk', 
            AttributeType: 'S'
          }
        ]
      });
    });

    test('should create DynamoDB table with partition key only', () => {
      mockSpec.config = {
        tableName: 'test-service-simple-table',
        partitionKey: {
          name: 'id',
          type: 'S'
        }
      };

      component = new DynamodbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'test-service-simple-table',
        KeySchema: [
          {
            AttributeName: 'id',
            KeyType: 'HASH'
          }
        ],
        AttributeDefinitions: [
          {
            AttributeName: 'id',
            AttributeType: 'S'
          }
        ]
      });
    });

    test('should create DynamoDB table with GSI', () => {
      mockSpec.config = {
        tableName: 'test-service-gsi-table',
        partitionKey: {
          name: 'pk',
          type: 'S'
        },
        globalSecondaryIndexes: [
          {
            indexName: 'gsi1',
            partitionKey: {
              name: 'gsi1pk',
              type: 'S'
            },
            sortKey: {
              name: 'gsi1sk',
              type: 'S'
            },
            projectionType: 'ALL'
          }
        ]
      };

      component = new DynamodbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'test-service-gsi-table',
        GlobalSecondaryIndexes: [
          {
            IndexName: 'gsi1',
            KeySchema: [
              {
                AttributeName: 'gsi1pk',
                KeyType: 'HASH'
              },
              {
                AttributeName: 'gsi1sk',
                KeyType: 'RANGE'
              }
            ],
            Projection: {
              ProjectionType: 'ALL'
            }
          }
        ]
      });
    });
  });

  describe('Compliance Framework Application', () => {
    test('should apply commercial framework defaults', () => {
      mockContext.complianceFramework = 'commercial';
      
      component = new DynamodbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Commercial: basic DynamoDB table without special hardening
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'test-service-data-table',
        BillingMode: 'PAY_PER_REQUEST' // Cost optimized
      });

      // Should not have server-side encryption explicitly configured (AWS managed)
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        SSESpecification: expect.not.objectContaining({
          SSEEnabled: true,
          KMSMasterKeyId: expect.any(String)
        })
      });
    });

    test('should apply FedRAMP Moderate hardening', () => {
      mockContext.complianceFramework = 'fedramp-moderate';
      
      component = new DynamodbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // FedRAMP Moderate: enhanced security and monitoring
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'test-service-data-table',
        SSESpecification: {
          SSEEnabled: true,
          KMSMasterKeyId: 'AWS_MANAGED_KEY' // AWS managed encryption
        },
        PointInTimeRecoveryEnabled: true // Data protection
      });

      // Should have CloudWatch alarms for monitoring
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: expect.stringContaining('ConsumedReadCapacityUnits')
      });

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: expect.stringContaining('ConsumedWriteCapacityUnits')  
      });
    });

    test('should apply FedRAMP High hardening', () => {
      mockContext.complianceFramework = 'fedramp-high';
      
      component = new DynamodbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // FedRAMP High: maximum security hardening
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'test-service-data-table',
        SSESpecification: {
          SSEEnabled: true,
          KMSMasterKeyId: expect.any(String) // Customer managed KMS key
        },
        PointInTimeRecoveryEnabled: true,
        DeletionProtectionEnabled: true // Prevent accidental deletion
      });

      // Verify customer managed KMS key creation
      template.hasResourceProperties('AWS::KMS::Key', {
        Description: expect.stringContaining('DynamoDB'),
        KeyPolicy: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Principal: { Service: 'dynamodb.amazonaws.com' }
            })
          ])
        }
      });

      // Enhanced monitoring and alerting for FedRAMP High
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'ConsumedReadCapacityUnits',
        ComparisonOperator: 'GreaterThanThreshold',
        EvaluationPeriods: 2,
        Period: 300
      });

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'ConsumedWriteCapacityUnits',
        ComparisonOperator: 'GreaterThanThreshold', 
        EvaluationPeriods: 2,
        Period: 300
      });

      // Verify CloudTrail logging for data events
      template.hasResourceProperties('AWS::CloudTrail::Trail', {
        EventSelectors: expect.arrayContaining([
          expect.objectContaining({
            DataResources: expect.arrayContaining([
              expect.objectContaining({
                Type: 'AWS::DynamoDB::Table',
                Values: expect.arrayContaining([expect.any(String)])
              })
            ])
          })
        ])
      });
    });
  });

  describe('Billing and Performance Configuration', () => {
    test('should configure provisioned billing mode when specified', () => {
      mockSpec.config.billingMode = 'PROVISIONED';
      mockSpec.config.provisionedThroughput = {
        readCapacityUnits: 5,
        writeCapacityUnits: 5
      };

      component = new DynamodbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::DynamoDB::Table', {
        BillingMode: 'PROVISIONED',
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      });
    });

    test('should configure auto-scaling for provisioned tables', () => {
      mockSpec.config.billingMode = 'PROVISIONED';
      mockSpec.config.provisionedThroughput = {
        readCapacityUnits: 5,
        writeCapacityUnits: 5
      };
      mockSpec.config.autoScaling = {
        enabled: true,
        targetTrackingScalingPolicies: [
          {
            targetValue: 70,
            scaleInCooldown: 60,
            scaleOutCooldown: 60
          }
        ]
      };

      component = new DynamodbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify auto-scaling target
      template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
        ServiceNamespace: 'dynamodb',
        ResourceId: expect.stringContaining('table/test-service-data-table'),
        ScalableDimension: 'dynamodb:table:ReadCapacityUnits'
      });

      template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
        ServiceNamespace: 'dynamodb', 
        ResourceId: expect.stringContaining('table/test-service-data-table'),
        ScalableDimension: 'dynamodb:table:WriteCapacityUnits'
      });

      // Verify scaling policy
      template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalingPolicy', {
        PolicyType: 'TargetTrackingScaling',
        TargetTrackingScalingPolicyConfiguration: {
          TargetValue: 70,
          PredefinedMetricSpecification: {
            PredefinedMetricType: 'DynamoDBReadCapacityUtilization'
          }
        }
      });
    });
  });

  describe('Triggers and Integration', () => {
    test('should configure DynamoDB streams when enabled', () => {
      mockSpec.config.streamSpecification = {
        streamViewType: 'NEW_AND_OLD_IMAGES'
      };

      component = new DynamodbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::DynamoDB::Table', {
        StreamSpecification: {
          StreamViewType: 'NEW_AND_OLD_IMAGES'
        }
      });
    });

    test('should expose stream triggers for binding', () => {
      mockSpec.config.streamSpecification = {
        streamViewType: 'NEW_AND_OLD_IMAGES'
      };

      component = new DynamodbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const triggers = component.getTriggers();
      
      expect(triggers).toHaveLength(1);
      expect(triggers[0]).toMatchObject({
        name: 'stream',
        type: 'dynamodb-stream',
        source: expect.stringContaining('test-service-data-table')
      });
    });
  });

  describe('Error Handling and Validation', () => {
    test('should fail synthesis with invalid table name', () => {
      mockSpec.config = {
        tableName: 'Invalid Table Name!',  // Invalid characters
        partitionKey: {
          name: 'pk',
          type: 'S'
        }
      };

      component = new DynamodbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow();
    });

    test('should fail synthesis with missing partition key', () => {
      mockSpec.config = {
        tableName: 'test-table'
        // Missing partitionKey
      };

      component = new DynamodbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow('partitionKey is required');
    });

    test('should fail synthesis with invalid key type', () => {
      mockSpec.config = {
        tableName: 'test-table',
        partitionKey: {
          name: 'pk',
          type: 'INVALID'  // Invalid DynamoDB type
        }
      };

      component = new DynamodbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow();
    });

    test('should fail synthesis with provisioned mode but no throughput', () => {
      mockSpec.config = {
        tableName: 'test-table',
        partitionKey: {
          name: 'pk',
          type: 'S'
        },
        billingMode: 'PROVISIONED'
        // Missing provisionedThroughput
      };

      component = new DynamodbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow('provisionedThroughput is required');
    });
  });

  describe('CloudFormation Template Validation', () => {
    test('should generate syntactically valid CloudFormation', () => {
      component = new DynamodbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      
      // Basic CloudFormation structure validation
      expect(cfnTemplate).toHaveProperty('AWSTemplateFormatVersion', '2010-09-09');
      expect(cfnTemplate).toHaveProperty('Resources');
      expect(Object.keys(cfnTemplate.Resources).length).toBeGreaterThan(0);

      // Ensure all resources have required properties
      Object.entries(cfnTemplate.Resources).forEach(([logicalId, resource]: [string, any]) => {
        expect(resource).toHaveProperty('Type');
        expect(resource).toHaveProperty('Properties');
        expect(typeof resource.Type).toBe('string');
        expect(typeof resource.Properties).toBe('object');
        expect(resource.Type).toMatch(/^AWS::[A-Za-z0-9]+::[A-Za-z0-9]+$/);
      });
    });

    test('should have consistent resource naming', () => {
      component = new DynamodbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);
      const cfnTemplate = app.synth().getStackByName('TestStack').template;

      // Verify consistent naming convention
      const resourceNames = Object.keys(cfnTemplate.Resources);
      resourceNames.forEach(name => {
        expect(name).toMatch(/^TestDynamodbTable[A-Z][a-zA-Z0-9]*$/);
      });
    });

    test('should produce deployable CloudFormation template', () => {
      component = new DynamodbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      
      // Validate that DynamoDB table has all required properties for deployment
      const dynamodbTables = Object.entries(cfnTemplate.Resources)
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::DynamoDB::Table');
      
      expect(dynamodbTables).toHaveLength(1);
      
      const [_, tableResource] = dynamodbTables[0] as [string, any];
      expect(tableResource.Properties).toHaveProperty('KeySchema');
      expect(tableResource.Properties).toHaveProperty('AttributeDefinitions');
      expect(Array.isArray(tableResource.Properties.KeySchema)).toBe(true);
      expect(Array.isArray(tableResource.Properties.AttributeDefinitions)).toBe(true);
    });
  });

  describe('Integration with Other Components', () => {
    test('should expose appropriate bindings for Lambda functions', () => {
      component = new DynamodbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const bindings = component.getBindings();
      
      expect(bindings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            capability: 'storage:dynamodb',
            actions: expect.arrayContaining(['read', 'write', 'query', 'scan'])
          })
        ])
      );
    });

    test('should provide table ARN and name for cross-references', () => {
      component = new DynamodbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const outputs = component.getOutputs();
      
      expect(outputs).toHaveProperty('tableArn');
      expect(outputs).toHaveProperty('tableName'); 
      expect(outputs.tableName).toBe('test-service-data-table');
    });
  });
});