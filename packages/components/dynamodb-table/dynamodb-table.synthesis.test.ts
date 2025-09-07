import { describe, test, expect, beforeEach } from '@jest/globals';
import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { DynamoDbTableComponent } from './src/dynamodb-table.component';
import { ComponentContext, ComponentSpec } from '../../platform/contracts/src/component-interfaces';

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
        partitionKey: { name: 'id', type: 'string' },
        sortKey: { name: 'timestamp', type: 'number' },
        billingMode: 'pay-per-request'
      }
    };
  });

  describe('CloudFormation Resource Generation', () => {
    test('should generate DynamoDB table with correct properties', () => {
      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);
      
      // Verify DynamoDB table is created with flexible naming
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: expect.stringMatching(/.*TestDataTable.*/),
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [
          { AttributeName: 'id', AttributeType: 'S' },
          { AttributeName: 'timestamp', AttributeType: 'N' }
        ],
        KeySchema: [
          { AttributeName: 'id', KeyType: 'HASH' },
          { AttributeName: 'timestamp', KeyType: 'RANGE' }
        ]
      });

      // Verify encryption is enabled by default
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        SSESpecification: {
          SSEEnabled: true
        }
      });
    });

    test('should apply mandatory Platform Tagging Standard v1.0', () => {
      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      
      // Find DynamoDB table resource
      const dynamoTables = Object.entries(cfnTemplate.Resources)
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::DynamoDB::Table');
      
      expect(dynamoTables).toHaveLength(1);
      const [_, tableResource] = dynamoTables[0] as [string, any];
      
      // Verify mandatory platform tags are present
      expect(tableResource.Properties.Tags).toBeDefined();
      const tags = tableResource.Properties.Tags;
      const tagMap = tags.reduce((acc: any, tag: any) => {
        acc[tag.Key] = tag.Value;
        return acc;
      }, {});
      
      expect(tagMap['platform:service-name']).toBe('test-service');
      expect(tagMap['platform:owner']).toBeDefined();
      expect(tagMap['platform:component-name']).toBe('test-table');
      expect(tagMap['platform:component-type']).toBe('dynamodb-table');
      expect(tagMap['platform:environment']).toBe('test');
      expect(tagMap['platform:managed-by']).toBe('platform-engine');
      expect(tagMap['platform:commit-hash']).toBeDefined(); // placeholder ok
    });

    test('should configure GSI and LSI correctly', () => {
      mockSpec.config.globalSecondaryIndexes = [
        {
          indexName: 'TimestampIndex',
          partitionKey: { name: 'timestamp', type: 'number' },
          projectionType: 'all'
        }
      ];

      mockSpec.config.localSecondaryIndexes = [
        {
          indexName: 'LocalTimestampIndex',
          sortKey: { name: 'timestamp', type: 'number' },
          projectionType: 'keys-only'
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
      mockSpec.config.stream = {
        viewType: 'new-and-old-images'
      };

      mockSpec.config.timeToLive = {
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

      // Verify customer-managed KMS encryption (not AWS-managed)
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        SSESpecification: {
          SSEEnabled: true,
          KMSMasterKeyId: expect.any(Object) // CMK reference, not AWS-managed
        }
      });

      // Verify point-in-time recovery is enabled
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        PointInTimeRecoveryEnabled: true
      });

      // Verify contributor insights are enabled (governance requirement)
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        ContributorInsightsSpecification: {
          Enabled: true
        }
      });

      // Verify Policy-as-Code compliance signals
      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      const dynamoTable = Object.entries(cfnTemplate.Resources)
        .find(([_, resource]: [string, any]) => resource.Type === 'AWS::DynamoDB::Table');
      
      expect(dynamoTable).toBeDefined();
      const [_, tableResource] = dynamoTable as [string, any];
      
      // Policy compliance: encryption + monitoring + backup
      expect(tableResource.Properties.SSESpecification.SSEEnabled).toBe(true);
      expect(tableResource.Properties.PointInTimeRecoveryEnabled).toBe(true);
      expect(tableResource.Properties.ContributorInsightsSpecification.Enabled).toBe(true);
    });

    test('should apply FedRAMP High security controls', () => {
      mockContext.complianceFramework = 'fedramp-high';
      
      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify customer-managed KMS key is used (not AWS-managed)
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        SSESpecification: {
          SSEEnabled: true,
          KMSMasterKeyId: expect.any(Object) // CMK reference present
        }
      });

      // Verify enhanced monitoring and backup
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        ContributorInsightsSpecification: {
          Enabled: true
        },
        PointInTimeRecoveryEnabled: true
      });

      // Verify KMS key rotation is enabled (if component exposes it)
      const kmsKeys = template.findResources('AWS::KMS::Key');
      if (Object.keys(kmsKeys).length > 0) {
        template.hasResourceProperties('AWS::KMS::Key', {
          EnableKeyRotation: true
        });
      }

      // Policy compliance validation for FedRAMP High
      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      const dynamoTable = Object.entries(cfnTemplate.Resources)
        .find(([_, resource]: [string, any]) => resource.Type === 'AWS::DynamoDB::Table');
      
      expect(dynamoTable).toBeDefined();
      const [_, tableResource] = dynamoTable as [string, any];
      
      // FedRAMP High mandates: CMK encryption + full monitoring + backup
      expect(tableResource.Properties.SSESpecification.KMSMasterKeyId).toBeDefined();
      expect(tableResource.Properties.PointInTimeRecoveryEnabled).toBe(true);
      expect(tableResource.Properties.ContributorInsightsSpecification.Enabled).toBe(true);
    });

    test('should apply compliance defaults when config omitted', () => {
      // Test ConfigBuilder merges platform + compliance defaults
      mockContext.complianceFramework = 'fedramp-moderate';
      
      // Minimal config - omit optional fields to test defaults
      const minimalSpec = {
        name: 'minimal-table',
        type: 'dynamodb-table',
        config: {
          partitionKey: { name: 'id', type: 'string' }
          // Omit encryption, PITR, insights - should default to enabled
        }
      };
      
      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, minimalSpec as any);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify defaults are applied for FedRAMP Moderate
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        SSESpecification: {
          SSEEnabled: true // Should default to enabled
        },
        PointInTimeRecoveryEnabled: true, // Should default to enabled
        ContributorInsightsSpecification: {
          Enabled: true // Should default to enabled
        }
      });
    });
  });

  describe('Auto Scaling Configuration', () => {
    test('should configure auto scaling for provisioned billing mode', () => {
      mockSpec.config.billingMode = 'provisioned';
      mockSpec.config.provisioned = {
        readCapacity: 5,
        writeCapacity: 5
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

      // CRITICAL: Verify scaling policies are created (not just targets)
      template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalingPolicy', {
        PolicyType: 'TargetTrackingScaling',
        ScalingTargetId: expect.any(Object),
        TargetTrackingScalingPolicyConfiguration: {
          TargetValue: 70.0,
          ScaleInCooldown: expect.any(Number),
          ScaleOutCooldown: expect.any(Number)
        }
      });

      // Verify both read and write scaling policies exist
      const scalingPolicies = template.findResources('AWS::ApplicationAutoScaling::ScalingPolicy');
      expect(Object.keys(scalingPolicies).length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Capabilities and Outputs', () => {
    test('should register database:dynamodb capability', () => {
      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const capabilities = component.getCapabilities();
      
      expect(capabilities['database:dynamodb']).toBeDefined();
      expect(capabilities['database:dynamodb'].tableName).toMatch(/.*TestDataTable.*/);
      expect(capabilities['database:dynamodb'].tableArn).toContain('TestDataTable');
      expect(capabilities['database:dynamodb'].region).toBe('us-east-1');
    });

    test('should provide correct CloudFormation outputs', () => {
      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify output shapes (flexible naming)
      const outputs = template.findOutputs('*');
      const outputNames = Object.keys(outputs);
      
      // Find ARN output by pattern
      const arnOutput = outputNames.find(name => name.match(/.*TableArn$/));
      expect(arnOutput).toBeDefined();
      expect(outputs[arnOutput!]).toEqual({
        Value: { 'Fn::GetAtt': [expect.any(String), 'Arn'] },
        Export: { Name: expect.stringMatching(/.*-arn$/) }
      });

      // Find name output by pattern  
      const nameOutput = outputNames.find(name => name.match(/.*TableName$/));
      expect(nameOutput).toBeDefined();
      expect(outputs[nameOutput!]).toEqual({
        Value: { Ref: expect.any(String) },
        Export: { Name: expect.stringMatching(/.*-name$/) }
      });
    });

    test('should provide stream ARN when streams are enabled', () => {
      mockSpec.config.stream = {
        viewType: 'new-and-old-images'
      };

      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      component.synth();

      const capabilities = component.getCapabilities();
      expect(capabilities['database:dynamodb'].streamArn).toBeDefined();

      const template = Template.fromStack(stack);
      const outputs = template.findOutputs('*');
      const outputNames = Object.keys(outputs);
      
      // Find stream ARN output by pattern
      const streamOutput = outputNames.find(name => name.match(/.*StreamArn$/));
      expect(streamOutput).toBeDefined();
      expect(outputs[streamOutput!]).toEqual({
        Value: { 'Fn::GetAtt': [expect.any(String), 'StreamArn'] },
        Export: { Name: expect.stringMatching(/.*-stream-arn$/) }
      });
    });
  });

  describe('Error Conditions', () => {
    test('should fail synthesis with invalid attribute types', () => {
      mockSpec.config.partitionKey = { name: 'id', type: 'invalid' as any };

      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow(/attributeType.*invalid|unsupported attribute type/i);
    });

    test('should fail synthesis with mismatched key schema and attributes', () => {
      mockSpec.config.partitionKey = { name: 'nonexistent', type: 'string' };

      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow(/key schema.*attribute.*not.*defined|nonexistent.*attribute/i);
    });

    test('should fail synthesis with missing required configuration', () => {
      // Test both tableName and partitionKey requirements
      delete mockSpec.config.partitionKey;

      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow(/partitionKey.*required|tableName.*required/i);
    });

    test('should fail synthesis with invalid billing mode configuration', () => {
      mockSpec.config.billingMode = 'provisioned';
      // Missing provisioned throughput for PROVISIONED mode
      delete mockSpec.config.provisioned;

      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow(/provisioned.*throughput.*required|billing.*mode.*provisioned/i);
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
      
      // Verify required properties with flexible naming
      expect(tableResource.Properties.TableName).toMatch(/.*TestDataTable.*/);
      expect(tableResource.Properties.AttributeDefinitions).toBeDefined();
      expect(tableResource.Properties.KeySchema).toBeDefined();
    });

    test('should handle complex table configurations', () => {
      mockSpec.config = {
        tableName: 'ComplexTable',
        partitionKey: { name: 'pk', type: 'string' },
        sortKey: { name: 'sk', type: 'string' },
        globalSecondaryIndexes: [
          {
            indexName: 'GSI1',
            partitionKey: { name: 'gsi1pk', type: 'string' },
            sortKey: { name: 'gsi1sk', type: 'string' },
            projectionType: 'all'
          }
        ],
        localSecondaryIndexes: [
          {
            indexName: 'LSI1',
            sortKey: { name: 'lsi1sk', type: 'number' },
            projectionType: 'keys-only'
          }
        ],
        stream: {
          viewType: 'new-and-old-images'
        },
        timeToLive: {
          attributeName: 'ttl'
        },
        billingMode: 'pay-per-request'
      };

      component = new DynamoDbTableComponent(stack, 'TestDynamodbTable', mockContext, mockSpec);
      
      expect(() => component.synth()).not.toThrow();

      const template = Template.fromStack(stack);
      
      // Verify complex configuration is properly synthesized
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: expect.stringMatching(/.*ComplexTable.*/),
        BillingMode: 'PAY_PER_REQUEST',
        StreamSpecification: { StreamViewType: 'NEW_AND_OLD_IMAGES' },
        TimeToLiveSpecification: { AttributeName: 'ttl', Enabled: true }
      });
    });
  });
});