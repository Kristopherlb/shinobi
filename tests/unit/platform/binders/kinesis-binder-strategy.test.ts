/**
 * Kinesis Binder Strategy Tests
 * Comprehensive tests following Platform Testing Standard
 */

/**
 * Test Metadata:
 * {
 *   "id": "TP-kinesis-binder-001",
 *   "level": "unit",
 *   "capability": "Kinesis binding strategy validation and error handling",
 *   "oracle": "exact",
 *   "invariants": ["null safety", "access pattern validation", "ARN construction safety"],
 *   "fixtures": ["deterministic clock", "seeded RNG", "mock components"],
 *   "inputs": { "shape": "Kinesis component properties and binding configurations", "notes": "includes null/undefined edge cases" },
 *   "risks": ["null reference errors", "ARN construction failures", "access pattern validation bypass"],
 *   "dependencies": ["KinesisBinderStrategy", "BindingContext", "ComponentBinding"],
 *   "evidence": ["null safety validation", "error message quality", "access pattern coverage"],
 *   "compliance_refs": ["std://platform-testing-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { KinesisBinderStrategy } from '../../../../packages/core/src/platform/binders/strategies/analytics/kinesis-binder-strategy';
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

describe('KinesisBinderStrategy', () => {
  let strategy: KinesisBinderStrategy;
  let mockSourceComponent: any;
  let mockTargetComponent: any;
  let mockBinding: ComponentBinding;
  let mockContext: BindingContext;

  beforeEach(() => {
    strategy = new KinesisBinderStrategy();
    
    mockSourceComponent = {
      addToRolePolicy: jest.fn(),
      addEnvironment: jest.fn()
    };

    mockTargetComponent = {
      streamName: 'test-stream',
      streamArn: 'arn:aws:kinesis:us-east-1:123456789012:stream/test-stream',
      shardCount: 2,
      retentionPeriodHours: 24,
      status: 'ACTIVE',
      encryptionType: 'KMS',
      keyId: 'arn:aws:kms:us-east-1:123456789012:key/test-key',
      firehoseDeliveryStreamName: 'test-delivery-stream',
      firehoseDeliveryStreamArn: 'arn:aws:firehose:us-east-1:123456789012:deliverystream/test-delivery-stream'
    };

    mockBinding = {
      capability: 'kinesis:stream',
      access: ['read', 'write']
    };

    mockContext = {
      region: 'us-east-1',
      accountId: '123456789012',
      complianceFramework: ComplianceFramework.COMMERCIAL
    };
  });

  describe('Constructor__ValidSetup__InitializesCorrectly', () => {
    test('should initialize with correct supported capabilities', () => {
      expect(strategy.supportedCapabilities).toEqual([
        'kinesis:stream',
        'kinesis:firehose',
        'kinesis:analytics'
      ]);
    });
  });

  describe('Bind__NullTargetComponent__ThrowsError', () => {
    test('should throw error when target component is null', async () => {
      await expect(strategy.bind(mockSourceComponent, null, mockBinding, mockContext))
        .rejects.toThrow('Target component is required for Kinesis binding');
    });
  });

  describe('Bind__NullBinding__ThrowsError', () => {
    test('should throw error when binding is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, null, mockContext))
        .rejects.toThrow('Binding is required for Kinesis binding');
    });
  });

  describe('Bind__NullContext__ThrowsError', () => {
    test('should throw error when context is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, null))
        .rejects.toThrow('Context is required for Kinesis binding');
    });
  });

  describe('Bind__MissingCapability__ThrowsError', () => {
    test('should throw error when capability is missing', async () => {
      const invalidBinding = { ...mockBinding, capability: undefined };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Binding capability is required');
    });
  });

  describe('Bind__MissingAccess__ThrowsError', () => {
    test('should throw error when access is missing', async () => {
      const invalidBinding = { ...mockBinding, access: undefined };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Binding access is required');
    });
  });

  describe('Bind__InvalidCapability__ThrowsError', () => {
    test('should throw error for unsupported capability', async () => {
      const invalidBinding = { ...mockBinding, capability: 'invalid:capability' };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Unsupported Kinesis capability: invalid:capability');
    });
  });

  describe('Bind__KinesisStreamCapability__ConfiguresStreamAccess', () => {
    test('should configure read access for stream', async () => {
      const readOnlyBinding = { ...mockBinding, access: ['read'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, readOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'kinesis:DescribeStream',
          'kinesis:ListShards',
          'kinesis:GetShardIterator',
          'kinesis:GetRecords'
        ],
        Resource: mockTargetComponent.streamArn
      });
    });

    test('should configure write access for stream', async () => {
      const writeOnlyBinding = { ...mockBinding, access: ['write'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, writeOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'kinesis:CreateStream',
          'kinesis:UpdateShardCount',
          'kinesis:PutRecord',
          'kinesis:PutRecords',
          'kinesis:DeleteStream'
        ],
        Resource: mockTargetComponent.streamArn
      });
    });

    test('should inject stream environment variables', async () => {
      await strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KINESIS_STREAM_NAME', mockTargetComponent.streamName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KINESIS_STREAM_ARN', mockTargetComponent.streamArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KINESIS_SHARD_COUNT', mockTargetComponent.shardCount.toString());
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KINESIS_RETENTION_PERIOD', mockTargetComponent.retentionPeriodHours.toString());
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KINESIS_STATUS', mockTargetComponent.status);
    });

    test('should configure KMS encryption when enabled', async () => {
      await strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KINESIS_ENCRYPTION_TYPE', mockTargetComponent.encryptionType);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KINESIS_KEY_ID', mockTargetComponent.keyId);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'kms:Decrypt',
          'kms:GenerateDataKey'
        ],
        Resource: mockTargetComponent.keyId
      });
    });
  });

  describe('Bind__KinesisFirehoseCapability__ConfiguresFirehoseAccess', () => {
    test('should configure read access for firehose', async () => {
      const firehoseBinding = { ...mockBinding, capability: 'kinesis:firehose', access: ['read'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, firehoseBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'firehose:DescribeDeliveryStream',
          'firehose:ListDeliveryStreams'
        ],
        Resource: mockTargetComponent.firehoseDeliveryStreamArn
      });
    });

    test('should configure write access for firehose', async () => {
      const firehoseBinding = { ...mockBinding, capability: 'kinesis:firehose', access: ['write'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, firehoseBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'firehose:CreateDeliveryStream',
          'firehose:PutRecord',
          'firehose:PutRecordBatch',
          'firehose:UpdateDestination',
          'firehose:DeleteDeliveryStream'
        ],
        Resource: mockTargetComponent.firehoseDeliveryStreamArn
      });
    });

    test('should inject firehose environment variables', async () => {
      const firehoseBinding = { ...mockBinding, capability: 'kinesis:firehose' };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, firehoseBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('FIREHOSE_DELIVERY_STREAM_NAME', mockTargetComponent.firehoseDeliveryStreamName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('FIREHOSE_DELIVERY_STREAM_ARN', mockTargetComponent.firehoseDeliveryStreamArn);
    });
  });

  describe('Bind__KinesisAnalyticsCapability__ConfiguresAnalyticsAccess', () => {
    test('should configure read access for analytics', async () => {
      const analyticsBinding = { ...mockBinding, capability: 'kinesis:analytics', access: ['read'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, analyticsBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'kinesisanalytics:DescribeApplication',
          'kinesisanalytics:ListApplications'
        ],
        Resource: `arn:aws:kinesisanalytics:${mockContext.region}:${mockContext.accountId}:application/*`
      });
    });

    test('should configure write access for analytics', async () => {
      const analyticsBinding = { ...mockBinding, capability: 'kinesis:analytics', access: ['write'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, analyticsBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'kinesisanalytics:CreateApplication',
          'kinesisanalytics:UpdateApplication',
          'kinesisanalytics:DeleteApplication',
          'kinesisanalytics:StartApplication',
          'kinesisanalytics:StopApplication'
        ],
        Resource: `arn:aws:kinesisanalytics:${mockContext.region}:${mockContext.accountId}:application/*`
      });
    });
  });

  describe('Bind__EmptyAccessArray__ThrowsError', () => {
    test('should throw error when access array is empty', async () => {
      const emptyAccessBinding = { ...mockBinding, access: [] };
      
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, emptyAccessBinding, mockContext))
        .rejects.toThrow('Access array cannot be empty for Kinesis binding');
    });
  });

  describe('Bind__InvalidAccessType__ThrowsError', () => {
    test('should throw error for invalid access type', async () => {
      const invalidAccessBinding = { ...mockBinding, access: ['invalid'] };
      
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidAccessBinding, mockContext))
        .rejects.toThrow('Invalid access types for Kinesis binding: invalid. Valid types: read, write, admin, consume, produce');
    });
  });
});
