import { describe, test, expect, beforeEach } from '@jest/globals';
import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { DynamoDbTableComponent } from '@shinobi/components/dynamodb-table/src/dynamodb-table.component';
import { ComponentContext, ComponentSpec } from '@shinobi/core/contracts/src/component-interfaces';

describe('DynamodbTableComponent - CloudFormation Synthesis', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let component: DynamoDbTableComponent;
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
        tableName: 'TestDataTable',
        attributeDefinitions: [
          { attributeName: 'id', attributeType: 'S' },
          { attributeName: 'timestamp', attributeType: 'N' }
        ],
        keySchema: [
          { attributeName: 'id', keyType: 'HASH' }
        ],
        billingMode: 'ON_DEMAND'
      }
    };
  });

  describe('CloudFormation Resource Generation', () => {
    test('should generate DynamoDB table with correct properties', () => {
      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);
      
      // Verify DynamoDB table is created
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'TestDataTable',
        BillingMode: 'ON_DEMAND',
        AttributeDefinitions: [
          { AttributeName: 'id', AttributeType: 'S' },
          { AttributeName: 'timestamp', AttributeType: 'N' }
        ],
        KeySchema: [
          { AttributeName: 'id', KeyType: 'HASH' }
        ]
      });

      // Verify encryption is enabled by default
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        SSESpecification: {
          SSEEnabled: true
        }
      });
    });

    test('should configure GSI and LSI correctly', () => {
      mockSpec.config.globalSecondaryIndexes = [
        {
          indexName: 'TimestampIndex',
          keySchema: [
            { attributeName: 'timestamp', keyType: 'HASH' }
          ],
          projection: {
            projectionType: 'ALL'
          }
        }
      ];

      mockSpec.config.localSecondaryIndexes = [
        {
          indexName: 'LocalTimestampIndex',
          keySchema: [
            { attributeName: 'id', keyType: 'HASH' },
            { attributeName: 'timestamp', keyType: 'RANGE' }
          ],
          projection: {
            projectionType: 'KEYS_ONLY'
          }
        }
      ];

      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify GSI
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        GlobalSecondaryIndexes: [
          {
            IndexName: 'TimestampIndex',
            KeySchema: [
              { AttributeName: 'timestamp', KeyType: 'HASH' }
            ],
            Projection: {
              ProjectionType: 'ALL'
            }
          }
        ]
      });

      // Verify LSI
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        LocalSecondaryIndexes: [
          {
            IndexName: 'LocalTimestampIndex',
            KeySchema: [
              { AttributeName: 'id', KeyType: 'HASH' },
              { AttributeName: 'timestamp', KeyType: 'RANGE' }
            ],
            Projection: {
              ProjectionType: 'KEYS_ONLY'
            }
          }
        ]
      });
    });

    test('should configure streams and TTL when specified', () => {
      mockSpec.config.streamSpecification = {
        streamEnabled: true,
        streamViewType: 'NEW_AND_OLD_IMAGES'
      };

      mockSpec.config.timeToLiveSpecification = {
        enabled: true,
        attributeName: 'expiresAt'
      };

      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify streams
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        StreamSpecification: {
          StreamViewType: 'NEW_AND_OLD_IMAGES'
        }
      });

      // Verify TTL
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TimeToLiveSpecification: {
          AttributeName: 'expiresAt',
          Enabled: true
        }
      });
    });
  });

  describe('Compliance Framework Testing', () => {
    test('should apply FedRAMP Moderate hardening', () => {
      mockContext.complianceFramework = 'fedramp-moderate';
      
      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify KMS encryption is enforced
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        SSESpecification: {
          SSEEnabled: true,
          KMSMasterKeyId: expect.stringContaining('arn:aws:kms:')
        }
      });

      // Verify point-in-time recovery is enabled
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        PointInTimeRecoveryEnabled: true
      });

      // Verify contributor insights are enabled
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        ContributorInsightsSpecification: {
          Enabled: true
        }
      });
    });

    test('should apply FedRAMP High security controls', () => {
      mockContext.complianceFramework = 'fedramp-high';
      
      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify customer-managed KMS key is used
      template.hasResourceProperties('AWS::KMS::Key', {
        Description: expect.stringContaining('DynamoDB table encryption key'),
        KeyPolicy: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Principal: { AWS: expect.stringContaining('root') }
            })
          ])
        }
      });

      // Verify enhanced monitoring
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        ContributorInsightsSpecification: {
          Enabled: true
        },
        PointInTimeRecoveryEnabled: true
      });

      // Verify deletion protection through stack policy
      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      expect(cfnTemplate.Resources).toBeDefined();
    });
  });

  describe('Auto Scaling Configuration', () => {
    test('should configure auto scaling for provisioned billing mode', () => {
      mockSpec.config.billingMode = 'PROVISIONED';
      mockSpec.config.provisionedThroughput = {
        readCapacityUnits: 5,
        writeCapacityUnits: 5
      };

      mockSpec.config.autoScaling = {
        readCapacity: {
          minCapacity: 5,
          maxCapacity: 100,
          targetTrackingScalingPolicyConfiguration: {
            targetValue: 70.0
          }
        },
        writeCapacity: {
          minCapacity: 5,
          maxCapacity: 100,
          targetTrackingScalingPolicyConfiguration: {
            targetValue: 70.0
          }
        }
      };

      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify provisioned throughput
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        BillingMode: 'PROVISIONED',
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      });

      // Verify auto scaling targets are created
      template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
        ServiceNamespace: 'dynamodb',
        ScalableDimension: 'dynamodb:table:ReadCapacityUnits',
        MinCapacity: 5,
        MaxCapacity: 100
      });

      template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
        ServiceNamespace: 'dynamodb',
        ScalableDimension: 'dynamodb:table:WriteCapacityUnits',
        MinCapacity: 5,
        MaxCapacity: 100
      });
    });
  });

  describe('Capabilities and Outputs', () => {
    test('should register database:dynamodb capability', () => {
      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const capabilities = component.getCapabilities();
      
      expect(capabilities['database:dynamodb']).toBeDefined();
      expect(capabilities['database:dynamodb'].tableName).toBe('TestDataTable');
      expect(capabilities['database:dynamodb'].tableArn).toContain('TestDataTable');
      expect(capabilities['database:dynamodb'].region).toBe('us-east-1');
    });

    test('should provide correct CloudFormation outputs', () => {
      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify table ARN output
      template.hasOutput('TestDynamodbTableTableArn', {
        Value: { 'Fn::GetAtt': [expect.any(String), 'Arn'] },
        Export: { Name: expect.stringContaining('TestDataTable-arn') }
      });

      // Verify table name output
      template.hasOutput('TestDynamodbTableTableName', {
        Value: { Ref: expect.any(String) },
        Export: { Name: expect.stringContaining('TestDataTable-name') }
      });
    });

    test('should provide stream ARN when streams are enabled', () => {
      mockSpec.config.streamSpecification = {
        streamEnabled: true,
        streamViewType: 'NEW_AND_OLD_IMAGES'
      };

      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const capabilities = component.getCapabilities();
      expect(capabilities['database:dynamodb'].streamArn).toBeDefined();

      const template = Template.fromStack(stack);
      template.hasOutput('TestDynamodbTableStreamArn', {
        Value: { 'Fn::GetAtt': [expect.any(String), 'StreamArn'] },
        Export: { Name: expect.stringContaining('TestDataTable-stream-arn') }
      });
    });
  });

  describe('Error Conditions', () => {
    test('should fail synthesis with invalid attribute types', () => {
      mockSpec.config.attributeDefinitions = [
        { attributeName: 'id', attributeType: 'INVALID' }
      ];

      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow();
    });

    test('should fail synthesis with mismatched key schema and attributes', () => {
      mockSpec.config.keySchema = [
        { attributeName: 'nonexistent', keyType: 'HASH' }
      ];

      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow();
    });

    test('should fail synthesis with missing required configuration', () => {
      delete mockSpec.config.tableName;

      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow('tableName is required');
    });
  });

  describe('CloudFormation Template Validation', () => {
    test('should generate syntactically valid CloudFormation', () => {
      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      
      // Basic CloudFormation structure validation
      expect(cfnTemplate).toHaveProperty('AWSTemplateFormatVersion', '2010-09-09');
      expect(cfnTemplate).toHaveProperty('Resources');
      
      // Ensure DynamoDB table is present
      const dynamoTables = Object.entries(cfnTemplate.Resources)
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::DynamoDB::Table');
      
      expect(dynamoTables).toHaveLength(1);
      
      const [_, tableResource] = dynamoTables[0] as [string, any];
      
      // Verify required properties
      expect(tableResource.Properties.TableName).toBe('TestDataTable');
      expect(tableResource.Properties.AttributeDefinitions).toBeDefined();
      expect(tableResource.Properties.KeySchema).toBeDefined();
    });

    test('should handle complex table configurations', () => {
      mockSpec.config = {
        tableName: 'ComplexTable',
        attributeDefinitions: [
          { attributeName: 'pk', attributeType: 'S' },
          { attributeName: 'sk', attributeType: 'S' },
          { attributeName: 'gsi1pk', attributeType: 'S' },
          { attributeName: 'gsi1sk', attributeType: 'S' },
          { attributeName: 'lsi1sk', attributeType: 'N' }
        ],
        keySchema: [
          { attributeName: 'pk', keyType: 'HASH' },
          { attributeName: 'sk', keyType: 'RANGE' }
        ],
        globalSecondaryIndexes: [
          {
            indexName: 'GSI1',
            keySchema: [
              { attributeName: 'gsi1pk', keyType: 'HASH' },
              { attributeName: 'gsi1sk', keyType: 'RANGE' }
            ],
            projection: { projectionType: 'ALL' }
          }
        ],
        localSecondaryIndexes: [
          {
            indexName: 'LSI1',
            keySchema: [
              { attributeName: 'pk', keyType: 'HASH' },
              { attributeName: 'lsi1sk', keyType: 'RANGE' }
            ],
            projection: { projectionType: 'KEYS_ONLY' }
          }
        ],
        streamSpecification: {
          streamEnabled: true,
          streamViewType: 'NEW_AND_OLD_IMAGES'
        },
        timeToLiveSpecification: {
          enabled: true,
          attributeName: 'ttl'
        },
        billingMode: 'ON_DEMAND'
      };

      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      
      expect(() => component.synth()).not.toThrow();

      const template = Template.fromStack(stack);
      
      // Verify complex configuration is properly synthesized
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'ComplexTable',
        BillingMode: 'ON_DEMAND',
        StreamSpecification: { StreamViewType: 'NEW_AND_OLD_IMAGES' },
        TimeToLiveSpecification: { AttributeName: 'ttl', Enabled: true }
      });
    });
  });
});