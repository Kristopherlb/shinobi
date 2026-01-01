/**
 * Unit Tests: Kinesis Binder Strategy (Unified)
 * Tests for Amazon Kinesis bindings with compliance enforcement
 */

import { KinesisBinderStrategy } from '../kinesis-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';

describe('KinesisBinderStrategy', () => {
  describe('KinesisBind__ValidStreamAccess__ReturnsStreamEnvVars', () => {
    const metadata = {
      id: 'TP-binders-kinesis-001',
      level: 'unit' as const,
      capability: 'Returns Kinesis stream environment variables for valid stream access',
      oracle: 'exact' as const,
      invariants: [
        'Returns EnhancedBindingResult with compliance block',
        'Environment variables include KINESIS_STREAM_NAME, KINESIS_STREAM_ARN, KINESIS_STREAM_SHARD_COUNT',
        'IAM policies include Kinesis stream read actions',
        'Security group rules array is empty'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with kinesis:stream capability and read access',
        notes: 'Basic Kinesis stream read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('KinesisBind__ValidStreamAccess__ReturnsStreamEnvVars', async () => {
    const strategy = new KinesisBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('kinesis-stream', {
        'kinesis:stream': {
          type: 'kinesis:stream',
          streamName: 'data-stream',
          streamArn: 'arn:aws:kinesis:us-east-1:123456789012:stream/data-stream',
          streamStatus: 'ACTIVE',
      shardCount: 2,
      retentionPeriodHours: 24,
          streamModeDetails: {
            streamMode: 'ON_DEMAND'
          },
          encryptionType: 'KMS',
          keyId: 'arn:aws:kms:us-east-1:123456789012:key/abc123def456'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'kinesis:stream',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Stream environment variables are set
      expect(result.environmentVariables['KINESIS_STREAM_NAME']).toBe('data-stream');
      expect(result.environmentVariables['KINESIS_STREAM_ARN']).toBe('arn:aws:kinesis:us-east-1:123456789012:stream/data-stream');
      expect(result.environmentVariables['KINESIS_STREAM_STATUS']).toBe('ACTIVE');
      expect(result.environmentVariables['KINESIS_STREAM_SHARD_COUNT']).toBe('2');
      expect(result.environmentVariables['KINESIS_STREAM_RETENTION_PERIOD']).toBe('24');
      expect(result.environmentVariables['KINESIS_STREAM_MODE']).toBe('ON_DEMAND');
      expect(result.environmentVariables['KINESIS_STREAM_ENCRYPTION_TYPE']).toBe('KMS');
      expect(result.environmentVariables['KINESIS_STREAM_KEY_ID']).toBe('arn:aws:kms:us-east-1:123456789012:key/abc123def456');
      
      // Assert IAM policies include Kinesis stream read actions
      const streamPolicy = result.iamPolicies.find(p => p.description.includes('stream') && p.description.includes('read'));
      expect(streamPolicy).toBeDefined();
      expect(streamPolicy!.statement.actions).toContain('kinesis:DescribeStream');
      expect(streamPolicy!.statement.actions).toContain('kinesis:GetRecords');
      expect(streamPolicy!.statement.actions).toContain('kinesis:GetShardIterator');
      expect(streamPolicy!.statement.resources).toContain('arn:aws:kinesis:us-east-1:123456789012:stream/data-stream');
      
      // Assert KMS permissions for encryption
      const kmsPolicy = result.iamPolicies.find(p => p.description.includes('KMS'));
      expect(kmsPolicy).toBeDefined();
      expect(kmsPolicy!.statement.actions).toContain('kms:Decrypt');
      expect(kmsPolicy!.statement.actions).toContain('kms:GenerateDataKey');
      expect(kmsPolicy!.statement.resources).toContain('arn:aws:kms:us-east-1:123456789012:key/abc123def456');
      
      expect(result.securityGroupRules).toEqual([]);
    });
  });

  describe('KinesisBind__StreamWriteAccess__GrantsStreamWriteActions', () => {
    const metadata = {
      id: 'TP-binders-kinesis-002',
      level: 'unit' as const,
      capability: 'Grants Kinesis stream write actions including PutRecord and PutRecords for write access',
      oracle: 'exact' as const,
      invariants: [
        'IAM policies include Kinesis stream write actions (CreateStream, DeleteStream, PutRecord, PutRecords)',
        'Read actions are included in write access',
        'Resources include specific stream ARN'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with kinesis:stream capability and write access',
        notes: 'Kinesis stream write access with record publishing permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('KinesisBind__StreamWriteAccess__GrantsStreamWriteActions', async () => {
      const strategy = new KinesisBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('kinesis-stream', {
        'kinesis:stream': {
          type: 'kinesis:stream',
          streamName: 'data-stream',
          streamArn: 'arn:aws:kinesis:us-east-1:123456789012:stream/data-stream',
          streamStatus: 'ACTIVE',
          shardCount: 2,
          retentionPeriodHours: 24
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'kinesis:stream',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Write actions are granted
      const writePolicy = result.iamPolicies.find(p => p.description.includes('stream') && p.description.includes('write'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('kinesis:CreateStream');
      expect(writePolicy!.statement.actions).toContain('kinesis:DeleteStream');
      expect(writePolicy!.statement.actions).toContain('kinesis:PutRecord');
      expect(writePolicy!.statement.actions).toContain('kinesis:PutRecords');
      expect(writePolicy!.statement.actions).toContain('kinesis:DescribeStream');
    });
  });

  describe('KinesisBind__StreamProcessingAccess__GrantsLambdaInvocation', () => {
    const metadata = {
      id: 'TP-binders-kinesis-003',
      level: 'unit' as const,
      capability: 'Grants Lambda invocation permissions when stream processing is enabled',
      oracle: 'exact' as const,
      invariants: [
        'IAM policies include Lambda InvokeFunction action when enableStreamProcessing is true',
        'Lambda ARN is sourced from source component capability data',
        'Stream read actions are included'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with kinesis:stream capability, enableStreamProcessing=true',
        notes: 'Kinesis stream with Lambda processing enabled'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('KinesisBind__StreamProcessingAccess__GrantsLambdaInvocation', async () => {
      const strategy = new KinesisBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'stream-processor');
      // Mock source with function ARN in capability data
      const sourceWithFunctionArn = {
        ...source,
        getCapabilityData: () => ({
          functionArn: 'arn:aws:lambda:us-east-1:123456789012:function:stream-processor'
        })
      };
      const target = createMockTargetComponent('kinesis-stream', {
        'kinesis:stream': {
          type: 'kinesis:stream',
          streamName: 'data-stream',
          streamArn: 'arn:aws:kinesis:us-east-1:123456789012:stream/data-stream',
          streamStatus: 'ACTIVE',
          shardCount: 2,
          retentionPeriodHours: 24
        }
      });

      const context = createBindingContext({
        source: sourceWithFunctionArn as any,
        target,
        capability: 'kinesis:stream',
        access: 'read',
        options: {
          enableStreamProcessing: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Lambda invocation permission is granted
      const lambdaPolicy = result.iamPolicies.find(p => p.description.includes('Lambda') && p.description.includes('processing'));
      expect(lambdaPolicy).toBeDefined();
      expect(lambdaPolicy!.statement.actions).toContain('lambda:InvokeFunction');
      expect(lambdaPolicy!.statement.resources).toContain('arn:aws:lambda:us-east-1:123456789012:function:stream-processor');
    });
  });

  describe('KinesisBind__SecureStreamAccess__ConfiguresMonitoringVpcEndpoint', () => {
    const metadata = {
      id: 'TP-binders-kinesis-004',
      level: 'unit' as const,
      capability: 'Configures secure stream access with monitoring and VPC endpoint when requireSecureAccess is enabled',
      oracle: 'exact' as const,
      invariants: [
        'Environment variables include monitoring and VPC endpoint configuration',
        'IAM policies include CloudWatch permissions for monitoring',
        'Retention days are set when provided in options'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with kinesis:stream capability, requireSecureAccess=true, retentionDays=7, enableVpcEndpoint=true',
        notes: 'Kinesis stream with secure access features enabled'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('KinesisBind__SecureStreamAccess__ConfiguresMonitoringVpcEndpoint', async () => {
      const strategy = new KinesisBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('kinesis-stream', {
        'kinesis:stream': {
          type: 'kinesis:stream',
          streamName: 'data-stream',
          streamArn: 'arn:aws:kinesis:us-east-1:123456789012:stream/data-stream',
          streamStatus: 'ACTIVE',
          shardCount: 2,
          retentionPeriodHours: 24
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'kinesis:stream',
        access: 'read',
        options: {
          requireSecureAccess: true,
          retentionDays: 7,
          enableVpcEndpoint: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Secure access environment variables are set
      expect(result.environmentVariables['KINESIS_STREAM_MONITORING_ENABLED']).toBe('true');
      expect(result.environmentVariables['KINESIS_STREAM_RETENTION_DAYS']).toBe('7');
      expect(result.environmentVariables['KINESIS_VPC_ENDPOINT_ENABLED']).toBe('true');
      
      // Assert CloudWatch permissions
      const cloudwatchPolicy = result.iamPolicies.find(p => p.description.includes('monitoring'));
      expect(cloudwatchPolicy).toBeDefined();
      expect(cloudwatchPolicy!.statement.actions).toContain('cloudwatch:PutMetricData');
      expect(cloudwatchPolicy!.statement.actions).toContain('cloudwatch:GetMetricStatistics');
    });
  });

  describe('KinesisBind__ValidAnalyticsAccess__ReturnsAnalyticsEnvVars', () => {
    const metadata = {
      id: 'TP-binders-kinesis-005',
      level: 'unit' as const,
      capability: 'Returns Kinesis Analytics environment variables for valid analytics access',
      oracle: 'exact' as const,
      invariants: [
        'Environment variables include KINESIS_ANALYTICS_APPLICATION_NAME, KINESIS_ANALYTICS_APPLICATION_ARN',
        'IAM policies include Kinesis Analytics read actions',
        'CloudWatch Logs permissions are granted',
        'Security group rules array is empty'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with kinesis:analytics capability and read access',
        notes: 'Basic Kinesis Analytics read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('KinesisBind__ValidAnalyticsAccess__ReturnsAnalyticsEnvVars', async () => {
      const strategy = new KinesisBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('kinesis-analytics', {
        'kinesis:analytics': {
          type: 'kinesis:analytics',
          applicationName: 'stream-processor',
          applicationArn: 'arn:aws:kinesisanalytics:us-east-1:123456789012:application/stream-processor',
          applicationStatus: 'RUNNING',
          runtimeEnvironment: 'SQL-1_0',
          applicationConfiguration: {
            sqlApplicationConfiguration: {}
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'kinesis:analytics',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Analytics environment variables are set
      expect(result.environmentVariables['KINESIS_ANALYTICS_APPLICATION_NAME']).toBe('stream-processor');
      expect(result.environmentVariables['KINESIS_ANALYTICS_APPLICATION_ARN']).toBe('arn:aws:kinesisanalytics:us-east-1:123456789012:application/stream-processor');
      expect(result.environmentVariables['KINESIS_ANALYTICS_APPLICATION_STATUS']).toBe('RUNNING');
      expect(result.environmentVariables['KINESIS_ANALYTICS_RUNTIME_ENVIRONMENT']).toBe('SQL-1_0');
      expect(result.environmentVariables['KINESIS_ANALYTICS_SQL_APPLICATION']).toBe('true');
      
      // Assert IAM policies include Kinesis Analytics read actions
      const analyticsPolicy = result.iamPolicies.find(p => p.description.includes('Analytics') && p.description.includes('read'));
      expect(analyticsPolicy).toBeDefined();
      expect(analyticsPolicy!.statement.actions).toContain('kinesisanalytics:DescribeApplication');
      expect(analyticsPolicy!.statement.actions).toContain('kinesisanalytics:ListApplications');
      expect(analyticsPolicy!.statement.resources).toContain('arn:aws:kinesisanalytics:us-east-1:123456789012:application/stream-processor');
      
      // Assert CloudWatch Logs permissions
      const logsPolicy = result.iamPolicies.find(p => p.description.includes('CloudWatch Logs'));
      expect(logsPolicy).toBeDefined();
      expect(logsPolicy!.statement.actions).toContain('logs:CreateLogGroup');
      expect(logsPolicy!.statement.actions).toContain('logs:PutLogEvents');
      
      expect(result.securityGroupRules).toEqual([]);
    });
  });

  describe('KinesisBind__AnalyticsWriteAccess__GrantsAnalyticsWriteActions', () => {
    const metadata = {
      id: 'TP-binders-kinesis-006',
      level: 'unit' as const,
      capability: 'Grants Kinesis Analytics write actions including CreateApplication and StartApplication for write access',
      oracle: 'exact' as const,
      invariants: [
        'IAM policies include Kinesis Analytics write actions (CreateApplication, DeleteApplication, StartApplication, StopApplication)',
        'Read actions are included in write access',
        'Resources include specific application ARN'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with kinesis:analytics capability and write access',
        notes: 'Kinesis Analytics write access with application management permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('KinesisBind__AnalyticsWriteAccess__GrantsAnalyticsWriteActions', async () => {
      const strategy = new KinesisBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('kinesis-analytics', {
        'kinesis:analytics': {
          type: 'kinesis:analytics',
          applicationName: 'stream-processor',
          applicationArn: 'arn:aws:kinesisanalytics:us-east-1:123456789012:application/stream-processor',
          applicationStatus: 'STOPPED'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'kinesis:analytics',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Write actions are granted
      const writePolicy = result.iamPolicies.find(p => p.description.includes('Analytics') && p.description.includes('write'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('kinesisanalytics:CreateApplication');
      expect(writePolicy!.statement.actions).toContain('kinesisanalytics:DeleteApplication');
      expect(writePolicy!.statement.actions).toContain('kinesisanalytics:StartApplication');
      expect(writePolicy!.statement.actions).toContain('kinesisanalytics:StopApplication');
      expect(writePolicy!.statement.actions).toContain('kinesisanalytics:DescribeApplication');
    });
  });

  describe('KinesisBind__ValidFirehoseAccess__ReturnsFirehoseEnvVars', () => {
    const metadata = {
      id: 'TP-binders-kinesis-007',
      level: 'unit' as const,
      capability: 'Returns Kinesis Firehose environment variables for valid Firehose access',
      oracle: 'exact' as const,
      invariants: [
        'Environment variables include KINESIS_FIREHOSE_DELIVERY_STREAM_NAME, KINESIS_FIREHOSE_DELIVERY_STREAM_ARN',
        'IAM policies include Kinesis Firehose read actions',
        'S3 permissions are granted for data delivery when S3 destination is configured',
        'Security group rules array is empty'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with kinesis:firehose capability and read access',
        notes: 'Basic Kinesis Firehose read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('KinesisBind__ValidFirehoseAccess__ReturnsFirehoseEnvVars', async () => {
      const strategy = new KinesisBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('kinesis-firehose', {
        'kinesis:firehose': {
          type: 'kinesis:firehose',
          deliveryStreamName: 'data-delivery-stream',
          deliveryStreamArn: 'arn:aws:firehose:us-east-1:123456789012:deliverystream/data-delivery-stream',
          deliveryStreamStatus: 'ACTIVE',
          deliveryStreamDestinationType: 'S3',
          s3DestinationConfiguration: {
            bucketArn: 'arn:aws:s3:::data-bucket'
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'kinesis:firehose',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Firehose environment variables are set
      expect(result.environmentVariables['KINESIS_FIREHOSE_DELIVERY_STREAM_NAME']).toBe('data-delivery-stream');
      expect(result.environmentVariables['KINESIS_FIREHOSE_DELIVERY_STREAM_ARN']).toBe('arn:aws:firehose:us-east-1:123456789012:deliverystream/data-delivery-stream');
      expect(result.environmentVariables['KINESIS_FIREHOSE_DELIVERY_STREAM_STATUS']).toBe('ACTIVE');
      expect(result.environmentVariables['KINESIS_FIREHOSE_DESTINATION_TYPE']).toBe('S3');
      
      // Assert IAM policies include Kinesis Firehose read actions
      const firehosePolicy = result.iamPolicies.find(p => p.description.includes('Firehose') && p.description.includes('read'));
      expect(firehosePolicy).toBeDefined();
      expect(firehosePolicy!.statement.actions).toContain('firehose:DescribeDeliveryStream');
      expect(firehosePolicy!.statement.actions).toContain('firehose:ListDeliveryStreams');
      expect(firehosePolicy!.statement.resources).toContain('arn:aws:firehose:us-east-1:123456789012:deliverystream/data-delivery-stream');
      
      // Assert S3 permissions for data delivery
      const s3Policy = result.iamPolicies.find(p => p.description.includes('data delivery'));
      expect(s3Policy).toBeDefined();
      expect(s3Policy!.statement.actions).toContain('s3:GetObject');
      expect(s3Policy!.statement.actions).toContain('s3:PutObject');
      expect(s3Policy!.statement.resources).toContain('arn:aws:s3:::data-bucket');
      expect(s3Policy!.statement.resources).toContain('arn:aws:s3:::data-bucket/*');
      
      expect(result.securityGroupRules).toEqual([]);
    });
  });

  describe('KinesisBind__FirehoseWriteAccess__GrantsFirehoseWriteActions', () => {
    const metadata = {
      id: 'TP-binders-kinesis-008',
      level: 'unit' as const,
      capability: 'Grants Kinesis Firehose write actions including PutRecord and PutRecordBatch for write access',
      oracle: 'exact' as const,
      invariants: [
        'IAM policies include Kinesis Firehose write actions (CreateDeliveryStream, DeleteDeliveryStream, PutRecord, PutRecordBatch)',
        'Read actions are included in write access',
        'Resources include specific delivery stream ARN'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with kinesis:firehose capability and write access',
        notes: 'Kinesis Firehose write access with record delivery permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('KinesisBind__FirehoseWriteAccess__GrantsFirehoseWriteActions', async () => {
      const strategy = new KinesisBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('kinesis-firehose', {
        'kinesis:firehose': {
          type: 'kinesis:firehose',
          deliveryStreamName: 'data-delivery-stream',
          deliveryStreamArn: 'arn:aws:firehose:us-east-1:123456789012:deliverystream/data-delivery-stream',
          deliveryStreamStatus: 'ACTIVE'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'kinesis:firehose',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Write actions are granted
      const writePolicy = result.iamPolicies.find(p => p.description.includes('Firehose') && p.description.includes('write'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('firehose:CreateDeliveryStream');
      expect(writePolicy!.statement.actions).toContain('firehose:DeleteDeliveryStream');
      expect(writePolicy!.statement.actions).toContain('firehose:PutRecord');
      expect(writePolicy!.statement.actions).toContain('firehose:PutRecordBatch');
      expect(writePolicy!.statement.actions).toContain('firehose:DescribeDeliveryStream');
    });
  });

  describe('KinesisBind__FirehoseLambdaTransformation__GrantsLambdaInvocation', () => {
    const metadata = {
      id: 'TP-binders-kinesis-009',
      level: 'unit' as const,
      capability: 'Grants Lambda invocation permissions when Firehose has Lambda transformation processors',
      oracle: 'exact' as const,
      invariants: [
        'IAM policies include Lambda InvokeFunction action when Lambda processor is configured',
        'Lambda ARN is extracted from processor parameters',
        'Firehose read actions are included'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with kinesis:firehose capability and Lambda transformation processor',
        notes: 'Kinesis Firehose with Lambda data transformation'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('KinesisBind__FirehoseLambdaTransformation__GrantsLambdaInvocation', async () => {
      const strategy = new KinesisBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('kinesis-firehose', {
        'kinesis:firehose': {
          type: 'kinesis:firehose',
          deliveryStreamName: 'data-delivery-stream',
          deliveryStreamArn: 'arn:aws:firehose:us-east-1:123456789012:deliverystream/data-delivery-stream',
          deliveryStreamStatus: 'ACTIVE',
          processingConfiguration: {
            processors: [
              {
                type: 'Lambda',
                parameters: [
                  {
                    parameterName: 'LambdaArn',
                    parameterValue: 'arn:aws:lambda:us-east-1:123456789012:function:transform-data'
                  }
                ]
              }
            ]
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'kinesis:firehose',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Lambda invocation permission is granted
      const lambdaPolicy = result.iamPolicies.find(p => p.description.includes('Lambda') && p.description.includes('transformation'));
      expect(lambdaPolicy).toBeDefined();
      expect(lambdaPolicy!.statement.actions).toContain('lambda:InvokeFunction');
      expect(lambdaPolicy!.statement.resources).toContain('arn:aws:lambda:us-east-1:123456789012:function:transform-data');
    });
  });

  describe('KinesisBind__SecureFirehoseAccess__ConfiguresEncryptionBackupCompression', () => {
    const metadata = {
      id: 'TP-binders-kinesis-010',
      level: 'unit' as const,
      capability: 'Configures secure Firehose access with encryption, backup, and compression when requireSecureAccess is enabled',
      oracle: 'exact' as const,
      invariants: [
        'Environment variables include encryption, backup, and compression configuration',
        'IAM policies include KMS permissions for S3 encryption',
        'S3 permissions are granted for backup bucket when configured'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with kinesis:firehose capability, requireSecureAccess=true, S3 destination with encryption/backup/compression',
        notes: 'Kinesis Firehose with secure access features enabled'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('KinesisBind__SecureFirehoseAccess__ConfiguresEncryptionBackupCompression', async () => {
      const strategy = new KinesisBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('kinesis-firehose', {
        'kinesis:firehose': {
          type: 'kinesis:firehose',
          deliveryStreamName: 'data-delivery-stream',
          deliveryStreamArn: 'arn:aws:firehose:us-east-1:123456789012:deliverystream/data-delivery-stream',
          deliveryStreamStatus: 'ACTIVE',
          s3DestinationConfiguration: {
            bucketArn: 'arn:aws:s3:::data-bucket',
            encryptionConfiguration: {
              kmsEncryptionConfig: {
                awsKMSKeyARN: 'arn:aws:kms:us-east-1:123456789012:key/abc123def456'
              }
            },
            backupConfiguration: {
              s3BackupConfiguration: {
                bucketARN: 'arn:aws:s3:::backup-bucket'
              }
            },
            compressionFormat: 'GZIP'
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'kinesis:firehose',
        access: 'read',
        options: {
          requireSecureAccess: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Secure access environment variables are set
      expect(result.environmentVariables['KINESIS_FIREHOSE_S3_ENCRYPTION_ENABLED']).toBe('true');
      expect(result.environmentVariables['KINESIS_FIREHOSE_S3_KMS_KEY_ARN']).toBe('arn:aws:kms:us-east-1:123456789012:key/abc123def456');
      expect(result.environmentVariables['KINESIS_FIREHOSE_BACKUP_ENABLED']).toBe('true');
      expect(result.environmentVariables['KINESIS_FIREHOSE_BACKUP_S3_BUCKET']).toBe('arn:aws:s3:::backup-bucket');
      expect(result.environmentVariables['KINESIS_FIREHOSE_COMPRESSION_FORMAT']).toBe('GZIP');
      
      // Assert KMS permissions for S3 encryption
      const kmsPolicy = result.iamPolicies.find(p => p.description.includes('S3 encryption'));
      expect(kmsPolicy).toBeDefined();
      expect(kmsPolicy!.statement.actions).toContain('kms:Decrypt');
      expect(kmsPolicy!.statement.actions).toContain('kms:GenerateDataKey');
      expect(kmsPolicy!.statement.resources).toContain('arn:aws:kms:us-east-1:123456789012:key/abc123def456');
    });
  });
});
