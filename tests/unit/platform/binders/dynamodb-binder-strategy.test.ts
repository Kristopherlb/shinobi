/**
 * DynamoDB Binder Strategy Tests
 * Comprehensive tests following Platform Testing Standard
 */

/**
 * Test Metadata:
 * {
 *   "id": "TP-dynamodb-binder-001",
 *   "level": "unit",
 *   "capability": "DynamoDB binding strategy validation and error handling",
 *   "oracle": "exact",
 *   "invariants": ["null safety", "type safety", "access pattern validation"],
 *   "fixtures": ["deterministic clock", "seeded RNG", "mock components"],
 *   "inputs": { "shape": "DynamoDB component properties and binding configurations", "notes": "includes null/undefined and type conversion edge cases" },
 *   "risks": ["null reference errors", "type conversion failures", "access pattern validation bypass"],
 *   "dependencies": ["DynamoDbBinderStrategy", "BindingContext", "ComponentBinding"],
 *   "evidence": ["null safety validation", "type safety validation", "error message quality"],
 *   "compliance_refs": ["std://platform-testing-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DynamoDbBinderStrategy } from '../../../../packages/core/src/platform/binders/strategies/database/dynamodb-binder-strategy';
import { BindingContext } from '../../../../packages/core/src/platform/binders/binding-context';
import { ComponentBinding } from '../../../../packages/core/src/platform/binders/component-binding';
import { ComplianceFramework } from '../../../../packages/core/src/platform/compliance/compliance-framework';

// Deterministic setup
let originalDateNow: () => number;
let mockDateNow: jest.SpiedFunction<typeof Date.now>;

beforeEach(() => {
  // Freeze clock for determinism
  originalDateNow = Date.now;
  const fixedTime = 1640995200000; // 2022-01-01T00:00:00Z
  mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(fixedTime);

  // Seed RNG for deterministic behavior
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  // Restore original functions
  mockDateNow.mockRestore();
  jest.restoreAllMocks();
});

describe('DynamoDbBinderStrategy', () => {
  let strategy: DynamoDbBinderStrategy;
  let mockSourceComponent: any;
  let mockTargetComponent: any;
  let bindingContext: BindingContext;

  beforeEach(() => {
    strategy = new DynamoDbBinderStrategy();

    // Mock source component with required methods
    mockSourceComponent = {
      addToRolePolicy: jest.fn(),
      addEnvironment: jest.fn(),
      functionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function'
    };

    // Mock target component with valid DynamoDB properties
    mockTargetComponent = {
      tableArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/test-table',
      tableName: 'test-table',
      tableStatus: 'ACTIVE',
      keySchema: [
        { AttributeName: 'id', KeyType: 'HASH' }
      ],
      attributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' }
      ],
      billingMode: 'PAY_PER_REQUEST',
      sseSpecification: {
        sseEnabled: true,
        sseType: 'KMS',
        kmsMasterKeyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'
      },
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true
      },
      globalTableVersion: '2019.11.21'
    };

    bindingContext = {
      region: 'us-east-1',
      accountId: '123456789012',
      complianceFramework: ComplianceFramework.COMMERCIAL,
      environment: 'test'
    };
  });

  describe('SupportedCapabilities__ValidStrategy__ReturnsCorrectCapabilities', () => {
    test('should return correct supported capabilities', () => {
      // Arrange & Act
      const capabilities = strategy.supportedCapabilities;

      // Assert
      expect(capabilities).toEqual(['dynamodb:table', 'dynamodb:index', 'dynamodb:stream']);
    });
  });

  describe('BindToTable__ValidInputs__ConfiguresCorrectly', () => {
    test('should configure table binding with read access', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'dynamodb-table',
        capability: 'dynamodb:table',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, mockTargetComponent, binding, bindingContext);

      // Assert
      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'dynamodb:GetItem',
          'dynamodb:BatchGetItem',
          'dynamodb:Query',
          'dynamodb:Scan',
          'dynamodb:DescribeTable',
          'dynamodb:ListTables'
        ],
        Resource: [
          mockTargetComponent.tableArn,
          `${mockTargetComponent.tableArn}/index/*`
        ]
      });
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('DYNAMODB_TABLE_NAME', mockTargetComponent.tableName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('DYNAMODB_TABLE_ARN', mockTargetComponent.tableArn);
    });

    test('should configure table binding with write access', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'dynamodb-table',
        capability: 'dynamodb:table',
        access: ['write']
      };

      // Act
      await strategy.bind(mockSourceComponent, mockTargetComponent, binding, bindingContext);

      // Assert
      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'dynamodb:PutItem',
          'dynamodb:BatchWriteItem',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteItem',
          'dynamodb:CreateTable',
          'dynamodb:UpdateTable',
          'dynamodb:DeleteTable'
        ],
        Resource: [
          mockTargetComponent.tableArn,
          `${mockTargetComponent.tableArn}/index/*`
        ]
      });
    });

    test('should configure table binding with backup access', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'dynamodb-table',
        capability: 'dynamodb:table',
        access: ['backup']
      };

      // Act
      await strategy.bind(mockSourceComponent, mockTargetComponent, binding, bindingContext);

      // Assert
      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'dynamodb:CreateBackup',
          'dynamodb:DeleteBackup',
          'dynamodb:DescribeBackup',
          'dynamodb:ListBackups',
          'dynamodb:RestoreTableFromBackup',
          'dynamodb:RestoreTableToPointInTime'
        ],
        Resource: [
          mockTargetComponent.tableArn,
          `arn:aws:dynamodb:${bindingContext.region}:${bindingContext.accountId}:table/${mockTargetComponent.tableName}/backup/*`
        ]
      });
    });
  });

  describe('BindToTable__NullTargetComponent__ThrowsDescriptiveError', () => {
    test('should throw error when target component is null', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'dynamodb-table',
        capability: 'dynamodb:table',
        access: ['read']
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, null, binding, bindingContext))
        .rejects.toThrow('Target component is required for DynamoDB table binding');
    });

    test('should throw error when target component is undefined', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'dynamodb-table',
        capability: 'dynamodb:table',
        access: ['read']
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, undefined, binding, bindingContext))
        .rejects.toThrow('Target component is required for DynamoDB table binding');
    });
  });

  describe('BindToTable__MissingRequiredProperties__ThrowsDescriptiveError', () => {
    test('should throw error when tableArn is missing', async () => {
      // Arrange
      const invalidTargetComponent = { ...mockTargetComponent };
      delete invalidTargetComponent.tableArn;

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'dynamodb-table',
        capability: 'dynamodb:table',
        access: ['read']
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, invalidTargetComponent, binding, bindingContext))
        .rejects.toThrow('Target component missing required tableArn property for DynamoDB table binding');
    });

    test('should throw error when tableName is missing', async () => {
      // Arrange
      const invalidTargetComponent = { ...mockTargetComponent };
      delete invalidTargetComponent.tableName;

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'dynamodb-table',
        capability: 'dynamodb:table',
        access: ['backup']
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, invalidTargetComponent, binding, bindingContext))
        .rejects.toThrow('Target component missing required tableName property for DynamoDB table binding');
    });
  });

  describe('BindToTable__InvalidAccessPatterns__ThrowsDescriptiveError', () => {
    test('should throw error when access array contains invalid values', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'dynamodb-table',
        capability: 'dynamodb:table',
        access: ['invalid-access', 'read']
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, binding, bindingContext))
        .rejects.toThrow('Invalid access types for DynamoDB table binding: invalid-access. Valid types: read, write, admin, encrypt, decrypt, backup, process');
    });

    test('should throw error when access array is empty', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'dynamodb-table',
        capability: 'dynamodb:table',
        access: []
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, binding, bindingContext))
        .rejects.toThrow('Access array cannot be empty for DynamoDB table binding');
    });
  });

  describe('BindToTable__MissingContextProperties__ThrowsDescriptiveError', () => {
    test('should throw error when region is missing from context', async () => {
      // Arrange
      const invalidContext = { ...bindingContext };
      delete (invalidContext as any).region;

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'dynamodb-table',
        capability: 'dynamodb:table',
        access: ['backup']
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, binding, invalidContext))
        .rejects.toThrow('Missing required context properties for ARN construction: region, accountId');
    });

    test('should throw error when accountId is missing from context', async () => {
      // Arrange
      const invalidContext = { ...bindingContext };
      delete (invalidContext as any).accountId;

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'dynamodb-table',
        capability: 'dynamodb:table',
        access: ['backup']
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, binding, invalidContext))
        .rejects.toThrow('Missing required context properties for ARN construction: region, accountId');
    });
  });

  describe('BindToTable__UnsupportedCapability__ThrowsDescriptiveError', () => {
    test('should throw error for unsupported capability', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'dynamodb-table',
        capability: 'dynamodb:unsupported',
        access: ['read']
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, binding, bindingContext))
        .rejects.toThrow('Unsupported DynamoDB capability: dynamodb:unsupported. Supported capabilities: dynamodb:table, dynamodb:index, dynamodb:stream');
    });
  });

  describe('BindToTable__TypeSafetyValidation__HandlesEdgeCases', () => {
    test('should handle undefined billing mode gracefully', async () => {
      // Arrange
      const targetWithoutBillingMode = { ...mockTargetComponent };
      delete targetWithoutBillingMode.billingMode;

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'dynamodb-table',
        capability: 'dynamodb:table',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, targetWithoutBillingMode, binding, bindingContext);

      // Assert
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('DYNAMODB_BILLING_MODE', 'PAY_PER_REQUEST');
    });

    test('should handle null keySchema gracefully', async () => {
      // Arrange
      const targetWithNullKeySchema = { ...mockTargetComponent, keySchema: null };

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'dynamodb-table',
        capability: 'dynamodb:table',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, targetWithNullKeySchema, binding, bindingContext);

      // Assert - should not call addEnvironment for keySchema
      const keySchemaCalls = mockSourceComponent.addEnvironment.mock.calls.filter(
        call => call[0] === 'DYNAMODB_KEY_SCHEMA'
      );
      expect(keySchemaCalls).toHaveLength(0);
    });

    test('should handle undefined attributeDefinitions gracefully', async () => {
      // Arrange
      const targetWithoutAttributeDefinitions = { ...mockTargetComponent };
      delete targetWithoutAttributeDefinitions.attributeDefinitions;

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'dynamodb-table',
        capability: 'dynamodb:table',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, targetWithoutAttributeDefinitions, binding, bindingContext);

      // Assert - should not call addEnvironment for attributeDefinitions
      const attributeDefinitionsCalls = mockSourceComponent.addEnvironment.mock.calls.filter(
        call => call[0] === 'DYNAMODB_ATTRIBUTE_DEFINITIONS'
      );
      expect(attributeDefinitionsCalls).toHaveLength(0);
    });
  });

  describe('BindToTable__FedRampCompliance__ConfiguresSecureAccess', () => {
    test('should configure secure table access for FedRAMP Moderate', async () => {
      // Arrange
      const fedrampContext = {
        ...bindingContext,
        complianceFramework: ComplianceFramework.FEDRAMP_MODERATE
      };

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'dynamodb-table',
        capability: 'dynamodb:table',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, mockTargetComponent, binding, fedrampContext);

      // Assert
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('DYNAMODB_SSE_ENABLED', 'true');
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('DYNAMODB_SSE_TYPE', 'KMS');
      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'kms:Decrypt',
          'kms:GenerateDataKey'
        ],
        Resource: mockTargetComponent.sseSpecification.kmsMasterKeyId
      });
    });

    test('should configure backup retention for FedRAMP High', async () => {
      // Arrange
      const fedrampContext = {
        ...bindingContext,
        complianceFramework: ComplianceFramework.FEDRAMP_HIGH
      };

      const targetWithBackupPolicy = {
        ...mockTargetComponent,
        backupPolicy: { retentionDays: 30 }
      };

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'dynamodb-table',
        capability: 'dynamodb:table',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, targetWithBackupPolicy, binding, fedrampContext);

      // Assert
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('DYNAMODB_BACKUP_RETENTION_DAYS', '30');
    });

    test('should configure VPC endpoints for FedRAMP High', async () => {
      // Arrange
      const fedrampContext = {
        ...bindingContext,
        complianceFramework: ComplianceFramework.FEDRAMP_HIGH
      };

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'dynamodb-table',
        capability: 'dynamodb:table',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, mockTargetComponent, binding, fedrampContext);

      // Assert
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('DYNAMODB_VPC_ENDPOINT_ENABLED', 'true');
    });
  });

  describe('BindToIndex__ValidInputs__ConfiguresCorrectly', () => {
    test('should configure index binding with read access', async () => {
      // Arrange
      const indexTargetComponent = {
        indexArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/test-table/index/test-index',
        indexName: 'test-index',
        indexStatus: 'ACTIVE',
        indexType: 'GSI',
        keySchema: [
          { AttributeName: 'gsi_key', KeyType: 'HASH' }
        ],
        projection: {
          ProjectionType: 'ALL'
        }
      };

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'dynamodb-index',
        capability: 'dynamodb:index',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, indexTargetComponent, binding, bindingContext);

      // Assert
      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'dynamodb:Query',
          'dynamodb:Scan',
          'dynamodb:DescribeTable'
        ],
        Resource: indexTargetComponent.indexArn
      });
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('DYNAMODB_INDEX_NAME', indexTargetComponent.indexName);
    });
  });

  describe('BindToStream__ValidInputs__ConfiguresCorrectly', () => {
    test('should configure stream binding with process access', async () => {
      // Arrange
      const streamTargetComponent = {
        streamArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/test-table/stream/2022-01-01T00:00:00.000',
        streamLabel: '2022-01-01T00:00:00.000',
        streamViewType: 'NEW_AND_OLD_IMAGES',
        lambdaTriggerArn: 'arn:aws:lambda:us-east-1:123456789012:function:stream-processor'
      };

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'dynamodb-stream',
        capability: 'dynamodb:stream',
        access: ['process']
      };

      // Act
      await strategy.bind(mockSourceComponent, streamTargetComponent, binding, bindingContext);

      // Assert
      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'lambda:InvokeFunction'
        ],
        Resource: mockSourceComponent.functionArn
      });
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('DYNAMODB_STREAM_ARN', streamTargetComponent.streamArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('DYNAMODB_LAMBDA_TRIGGER_ENABLED', 'true');
    });
  });
});
