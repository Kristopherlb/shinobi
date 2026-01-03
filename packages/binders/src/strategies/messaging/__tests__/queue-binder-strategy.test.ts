/**
 * Queue Binder Strategy Tests (Unified)
 * 
 * Tests for QueueBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { QueueBinderStrategy } from '../queue-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';
import type { EnhancedBindingResult } from '@shinobi/core'platform-binding-trigger-spec.js';

describe('QueueBinderStrategy', () => {
  describe('QueueBind__ValidSQSReadAccess__ReturnsEnhancedResultWithCompliance', () => {
    const metadata = {
      id: 'TP-binders-messaging-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'QueueBind__Condition__Outcome', example: 'QueueBind__ValidSQSReadAccess__ReturnsEnhancedResultWithCompliance' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables.SQS_QUEUE_URL matches input queueUrl',
        'result.iamPolicies is an array',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'SQSCapabilityData'],
      inputs: {
        shape: 'BindingContext with messaging:sqs capability, resources.arn, resources.queueUrl, resources.queueName',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('QueueBind__ValidSQSReadAccess__ReturnsEnhancedResultWithCompliance', async () => {
      const strategy = new QueueBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-function');
      const queueArn = 'arn:aws:sqs:us-east-1:123456789012:test-queue';
      const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
      const target = createMockTargetComponent('sqs-queue', {
        'messaging:sqs': {
          type: 'queue:sqs',
          resources: {
            arn: queueArn,
            queueUrl,
            queueName: 'test-queue'
          },
          encryption: {
            enabled: false
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'messaging:sqs',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Assert EnhancedBindingResult structure
      assertEnhancedBindingResult(result);

      // Primary assertion: compliance block exists and has correct structure
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
      expect(result.compliance.framework).toBe(TEST_CONSTANTS.COMPLIANCE_FRAMEWORK);
      expect(Array.isArray(result.compliance.actionsTaken)).toBe(true);

      // Invariants
      expect(result.environmentVariables.SQS_QUEUE_URL).toBe(queueUrl);
      expect(result.environmentVariables.SQS_QUEUE_ARN).toBe(queueArn);
      expect(result.environmentVariables.SQS_QUEUE_NAME).toBe('test-queue');
      expect(Array.isArray(result.iamPolicies)).toBe(true);
      expect(Array.isArray(result.securityGroupRules)).toBe(true);
    });
  });

  describe('QueueBind__SQSReadAccess__GrantsSQSReadActions', () => {
    const metadata = {
      id: 'TP-binders-messaging-002',
      level: 'unit' as const,
      capability: 'Grants SQS read IAM actions for read access level',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'QueueBind__Condition__Outcome', example: 'QueueBind__SQSReadAccess__GrantsSQSReadActions' },
      invariants: [
        'PolicyStatement resources match queueArn',
        'PolicyStatement Effect is Allow',
        'Actions array includes sqs:ReceiveMessage, sqs:GetQueueAttributes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'SQSCapabilityData'],
      inputs: {
        shape: 'BindingContext with messaging:sqs capability and read access',
        notes: 'Standard AccessLevel read value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('QueueBind__SQSReadAccess__GrantsSQSReadActions', async () => {
      const strategy = new QueueBinderStrategy();
      const source = createMockSourceComponent();
      const queueArn = 'arn:aws:sqs:us-east-1:123456789012:test-queue';
      const target = createMockTargetComponent('sqs-queue', {
        'messaging:sqs': {
          type: 'queue:sqs',
          resources: {
            arn: queueArn,
            queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
            queueName: 'test-queue'
          },
          encryption: {
            enabled: false
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'messaging:sqs',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies exist and contain SQS read actions
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      
      const policy = result.iamPolicies[0];
      const statementJson = policy.statement.toStatementJson();
      
      // Invariants
      expect(statementJson.Effect).toBe('Allow');
      expect(Array.isArray(statementJson.Action)).toBe(true);
      expect(statementJson.Action.length).toBeGreaterThan(0);
      
      // Check that resources match queueArn
      const resources = Array.isArray(statementJson.Resource) 
        ? statementJson.Resource 
        : [statementJson.Resource];
      expect(resources).toContain(queueArn);
      
      // Check that read actions are present
      const actions = statementJson.Action as string[];
      expect(actions.some(a => a.includes('ReceiveMessage'))).toBe(true);
      expect(actions.some(a => a.includes('GetQueueAttributes'))).toBe(true);
    });
  });

  describe('QueueBind__SQSWriteAccess__GrantsSQSWriteActions', () => {
    const metadata = {
      id: 'TP-binders-messaging-003',
      level: 'unit' as const,
      capability: 'Grants SQS write IAM actions for write access level',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'QueueBind__Condition__Outcome', example: 'QueueBind__SQSWriteAccess__GrantsSQSWriteActions' },
      invariants: [
        'PolicyStatement resources match queueArn',
        'Actions array includes sqs:SendMessage'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'SQSCapabilityData'],
      inputs: {
        shape: 'BindingContext with messaging:sqs capability and write access',
        notes: 'Standard AccessLevel write value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('QueueBind__SQSWriteAccess__GrantsSQSWriteActions', async () => {
      const strategy = new QueueBinderStrategy();
      const queueArn = 'arn:aws:sqs:us-east-1:123456789012:test-queue';
      const target = createMockTargetComponent('sqs-queue', {
        'messaging:sqs': {
          type: 'queue:sqs',
          resources: {
            arn: queueArn,
            queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
            queueName: 'test-queue'
          },
          encryption: {
            enabled: false
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'messaging:sqs',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies contain SQS write actions
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      
      const policy = result.iamPolicies.find(p => 
        p.description?.includes('write')
      );
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = statementJson.Action as string[];
      expect(actions.some(a => a.includes('SendMessage'))).toBe(true);
    });
  });

  describe('QueueBind__SQSReadWriteAccess__GrantsBothReadAndWriteActions', () => {
    const metadata = {
      id: 'TP-binders-messaging-004',
      level: 'unit' as const,
      capability: 'Grants both SQS read and write IAM actions for readwrite access level',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'QueueBind__Condition__Outcome', example: 'QueueBind__SQSReadWriteAccess__GrantsBothReadAndWriteActions' },
      invariants: [
        'Multiple IAM policies or single policy with both read and write actions',
        'Actions include both ReceiveMessage and SendMessage'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'SQSCapabilityData'],
      inputs: {
        shape: 'BindingContext with messaging:sqs capability and readwrite access',
        notes: 'Standard AccessLevel readwrite value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('QueueBind__SQSReadWriteAccess__GrantsBothReadAndWriteActions', async () => {
      const strategy = new QueueBinderStrategy();
      const queueArn = 'arn:aws:sqs:us-east-1:123456789012:test-queue';
      const target = createMockTargetComponent('sqs-queue', {
        'messaging:sqs': {
          type: 'queue:sqs',
          resources: {
            arn: queueArn,
            queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
            queueName: 'test-queue'
          },
          encryption: {
            enabled: false
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'messaging:sqs',
        access: 'readwrite'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Both read and write policies exist
      expect(result.iamPolicies.length).toBeGreaterThanOrEqual(2);
      
      const allActions = result.iamPolicies.flatMap(p => {
        const json = p.statement.toStatementJson();
        return Array.isArray(json.Action) ? json.Action : [json.Action];
      });
      
      expect(allActions.some(a => a.includes('ReceiveMessage'))).toBe(true);
      expect(allActions.some(a => a.includes('SendMessage'))).toBe(true);
    });
  });

  describe('QueueBind__SQSWithEncryption__GrantsKMSDecryptPermissions', () => {
    const metadata = {
      id: 'TP-binders-messaging-005',
      level: 'unit' as const,
      capability: 'Grants KMS decrypt permissions when SQS queue has encryption enabled',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'QueueBind__Condition__Outcome', example: 'QueueBind__SQSWithEncryption__GrantsKMSDecryptPermissions' },
      invariants: [
        'IAM policies include KMS decrypt actions',
        'Environment variables include SQS_KMS_KEY_ID',
        'KMS key ID matches targetData.encryption.kmsKeyId'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'SQSCapabilityData with encryption'],
      inputs: {
        shape: 'BindingContext with messaging:sqs capability and encryption.kmsKeyId',
        notes: 'Encrypted queue with KMS key'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('QueueBind__SQSWithEncryption__GrantsKMSDecryptPermissions', async () => {
      const strategy = new QueueBinderStrategy();
      const kmsKeyId = 'abc123def456';
      const target = createMockTargetComponent('sqs-queue', {
        'messaging:sqs': {
          type: 'queue:sqs',
          resources: {
            arn: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
            queueName: 'test-queue'
          },
          encryption: {
            enabled: true,
            kmsKeyId
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'messaging:sqs',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: KMS permissions and environment variable exist
      expect(result.environmentVariables.SQS_KMS_KEY_ID).toBe(kmsKeyId);
      
      const kmsPolicy = result.iamPolicies.find(p => 
        p.description?.includes('KMS') || p.description?.includes('encrypt')
      );
      expect(kmsPolicy).toBeDefined();
      
      const statementJson = kmsPolicy!.statement.toStatementJson();
      const actions = statementJson.Action as string[];
      expect(actions.some(a => a.includes('kms:Decrypt'))).toBe(true);
    });
  });

  describe('QueueBind__SQSWithDeadLetterQueue__IncludesDLQEnvironmentVariables', () => {
    const metadata = {
      id: 'TP-binders-messaging-006',
      level: 'unit' as const,
      capability: 'Includes dead letter queue environment variables when DLQ is configured',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'QueueBind__Condition__Outcome', example: 'QueueBind__SQSWithDeadLetterQueue__IncludesDLQEnvironmentVariables' },
      invariants: [
        'Environment variables include SQS_DLQ_ARN and SQS_DLQ_URL',
        'DLQ values match targetData.deadLetterQueue'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'SQSCapabilityData with DLQ'],
      inputs: {
        shape: 'BindingContext with messaging:sqs capability and deadLetterQueue configuration',
        notes: 'Queue with dead letter queue configured'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('QueueBind__SQSWithDeadLetterQueue__IncludesDLQEnvironmentVariables', async () => {
      const strategy = new QueueBinderStrategy();
      const dlqArn = 'arn:aws:sqs:us-east-1:123456789012:test-queue-dlq';
      const dlqUrl = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue-dlq';
      const target = createMockTargetComponent('sqs-queue', {
        'messaging:sqs': {
          type: 'queue:sqs',
          resources: {
            arn: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
            queueName: 'test-queue'
          },
          encryption: {
            enabled: false
          },
          deadLetterQueue: {
            arn: dlqArn,
            queueUrl: dlqUrl
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'messaging:sqs',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: DLQ environment variables exist
      expect(result.environmentVariables.SQS_DLQ_ARN).toBe(dlqArn);
      expect(result.environmentVariables.SQS_DLQ_URL).toBe(dlqUrl);
    });
  });

  describe('QueueBind__SNS PublishAccess__GrantsSNSPublishActions', () => {
    const metadata = {
      id: 'TP-binders-messaging-007',
      level: 'unit' as const,
      capability: 'Grants SNS publish IAM actions for publish access level',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'QueueBind__Condition__Outcome', example: 'QueueBind__SNSPublishAccess__GrantsSNSPublishActions' },
      invariants: [
        'PolicyStatement resources match topicArn',
        'Actions array includes sns:Publish'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'SNSCapabilityData'],
      inputs: {
        shape: 'BindingContext with messaging:sns capability and publish access',
        notes: 'Standard AccessLevel publish value for SNS'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('QueueBind__SNSPublishAccess__GrantsSNSPublishActions', async () => {
      const strategy = new QueueBinderStrategy();
      const topicArn = 'arn:aws:sns:us-east-1:123456789012:test-topic';
      const target = createMockTargetComponent('sns-topic', {
        'messaging:sns': {
          type: 'topic:sns',
          resources: {
            arn: topicArn,
            topicName: 'test-topic'
          },
          encryption: {
            enabled: false
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'messaging:sns',
        access: 'publish'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies contain SNS publish actions
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      
      const policy = result.iamPolicies[0];
      const statementJson = policy.statement.toStatementJson();
      const resources = Array.isArray(statementJson.Resource) 
        ? statementJson.Resource 
        : [statementJson.Resource];
      expect(resources).toContain(topicArn);
      
      const actions = statementJson.Action as string[];
      expect(actions.some(a => a.includes('Publish'))).toBe(true);
    });
  });

  describe('QueueBind__SNSSubscribeAccess__GrantsSNSSubscribeActions', () => {
    const metadata = {
      id: 'TP-binders-messaging-008',
      level: 'unit' as const,
      capability: 'Grants SNS subscribe IAM actions for subscribe access level',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'QueueBind__Condition__Outcome', example: 'QueueBind__SNSSubscribeAccess__GrantsSNSSubscribeActions' },
      invariants: [
        'PolicyStatement resources match topicArn',
        'Actions array includes sns:Subscribe, sns:Unsubscribe'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'SNSCapabilityData'],
      inputs: {
        shape: 'BindingContext with messaging:sns capability and subscribe access',
        notes: 'Standard AccessLevel subscribe value for SNS'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('QueueBind__SNSSubscribeAccess__GrantsSNSSubscribeActions', async () => {
      const strategy = new QueueBinderStrategy();
      const topicArn = 'arn:aws:sns:us-east-1:123456789012:test-topic';
      const target = createMockTargetComponent('sns-topic', {
        'messaging:sns': {
          type: 'topic:sns',
          resources: {
            arn: topicArn,
            topicName: 'test-topic'
          },
          encryption: {
            enabled: false
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'messaging:sns',
        access: 'subscribe'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies contain SNS subscribe actions
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      
      const policy = result.iamPolicies[0];
      const statementJson = policy.statement.toStatementJson();
      const actions = statementJson.Action as string[];
      expect(actions.some(a => a.includes('Subscribe'))).toBe(true);
      expect(actions.some(a => a.includes('Unsubscribe'))).toBe(true);
    });
  });

  describe('QueueBind__MissingRequiredFields__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-messaging-009',
      level: 'unit' as const,
      capability: 'Throws error when required target capability data is missing',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'QueueBind__Condition__Outcome', example: 'QueueBind__MissingRequiredFields__ThrowsError' },
      invariants: [
        'Error message indicates missing field',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent with incomplete data'],
      inputs: {
        shape: 'BindingContext with messaging:sqs capability but missing resources.arn',
        notes: 'Error case - missing required field'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('QueueBind__MissingRequiredFields__ThrowsError', async () => {
      const strategy = new QueueBinderStrategy();
      const target = createMockTargetComponent('sqs-queue', {
        'messaging:sqs': {
          type: 'queue:sqs',
          resources: {
            // Missing arn
            queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
            queueName: 'test-queue'
          },
          encryption: {
            enabled: false
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'messaging:sqs',
        access: 'read'
      });

      // Primary assertion: Error is thrown
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'missing required resources.arn property'
      );
    });
  });

  describe('QueueBind__InvalidAccessLevel__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-messaging-010',
      level: 'unit' as const,
      capability: 'Throws error when invalid access level is provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'QueueBind__Condition__Outcome', example: 'QueueBind__InvalidAccessLevel__ThrowsError' },
      invariants: [
        'Error message indicates invalid access level',
        'Error specifies valid access levels'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with messaging:sqs capability and invalid access level (e.g., "admin")',
        notes: 'Error case - invalid access level for SQS'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('QueueBind__InvalidAccessLevel__ThrowsError', async () => {
      const strategy = new QueueBinderStrategy();
      const target = createMockTargetComponent('sqs-queue', {
        'messaging:sqs': {
          type: 'queue:sqs',
          resources: {
            arn: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
            queueName: 'test-queue'
          },
          encryption: {
            enabled: false
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'messaging:sqs',
        access: 'admin' as any // Invalid access level
      });

      // Primary assertion: Error is thrown
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'Invalid access level for SQS'
      );
    });
  });

  describe('QueueBind__AliasCapabilityQueueSQS__HandlesAliasCapability', () => {
    const metadata = {
      id: 'TP-binders-messaging-011',
      level: 'unit' as const,
      capability: 'Handles queue:sqs alias capability correctly',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'QueueBind__Condition__Outcome', example: 'QueueBind__AliasCapabilityQueueSQS__HandlesAliasCapability' },
      invariants: [
        'Binding succeeds with queue:sqs capability',
        'Results match messaging:sqs binding'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with queue:sqs capability (alias for messaging:sqs)',
        notes: 'Alias capability handling'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('QueueBind__AliasCapabilityQueueSQS__HandlesAliasCapability', async () => {
      const strategy = new QueueBinderStrategy();
      const queueArn = 'arn:aws:sqs:us-east-1:123456789012:test-queue';
      const target = createMockTargetComponent('sqs-queue', {
        'queue:sqs': {
          type: 'queue:sqs',
          resources: {
            arn: queueArn,
            queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
            queueName: 'test-queue'
          },
          encryption: {
            enabled: false
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'queue:sqs', // Alias capability
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Binding succeeds with alias capability
      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.SQS_QUEUE_ARN).toBe(queueArn);
    });
  });

  describe('QueueBind__AliasCapabilityTopicSNS__HandlesAliasCapability', () => {
    const metadata = {
      id: 'TP-binders-messaging-012',
      level: 'unit' as const,
      capability: 'Handles topic:sns alias capability correctly',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'QueueBind__Condition__Outcome', example: 'QueueBind__AliasCapabilityTopicSNS__HandlesAliasCapability' },
      invariants: [
        'Binding succeeds with topic:sns capability',
        'Results match messaging:sns binding'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with topic:sns capability (alias for messaging:sns)',
        notes: 'Alias capability handling'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('QueueBind__AliasCapabilityTopicSNS__HandlesAliasCapability', async () => {
      const strategy = new QueueBinderStrategy();
      const topicArn = 'arn:aws:sns:us-east-1:123456789012:test-topic';
      const target = createMockTargetComponent('sns-topic', {
        'topic:sns': {
          type: 'topic:sns',
          resources: {
            arn: topicArn,
            topicName: 'test-topic'
          },
          encryption: {
            enabled: false
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'topic:sns', // Alias capability
        access: 'publish'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Binding succeeds with alias capability
      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.SNS_TOPIC_ARN).toBe(topicArn);
    });
  });

  describe('QueueBind__SQSWithDLQAndWriteAccess__GrantsDLQWritePermissions', () => {
    const metadata = {
      id: 'TP-binders-messaging-013',
      level: 'unit' as const,
      capability: 'Grants DLQ write permissions when DLQ is configured and write access is granted',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'QueueBind__Condition__Outcome', example: 'QueueBind__SQSWithDLQAndWriteAccess__GrantsDLQWritePermissions' },
      invariants: [
        'IAM policies include DLQ send message permissions',
        'DLQ ARN matches targetData.deadLetterQueue.arn',
        'DLQ permissions only added when write access is granted'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'SQSCapabilityData with DLQ'],
      inputs: {
        shape: 'BindingContext with messaging:sqs capability, write access, and deadLetterQueue configuration',
        notes: 'DLQ policy generation for write access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('QueueBind__SQSWithDLQAndWriteAccess__GrantsDLQWritePermissions', async () => {
      const strategy = new QueueBinderStrategy();
      const dlqArn = 'arn:aws:sqs:us-east-1:123456789012:test-queue-dlq';
      const dlqUrl = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue-dlq';
      const target = createMockTargetComponent('sqs-queue', {
        'messaging:sqs': {
          type: 'queue:sqs',
          resources: {
            arn: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
            queueName: 'test-queue'
          },
          encryption: {
            enabled: false
          },
          deadLetterQueue: {
            arn: dlqArn,
            queueUrl: dlqUrl
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'messaging:sqs',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: DLQ write permissions exist
      const dlqPolicy = result.iamPolicies.find(p => 
        p.description?.includes('dead letter queue') || p.description?.includes('DLQ')
      );
      expect(dlqPolicy).toBeDefined();
      
      const statementJson = dlqPolicy!.statement.toStatementJson();
      const resources = Array.isArray(statementJson.Resource) 
        ? statementJson.Resource 
        : [statementJson.Resource];
      expect(resources).toContain(dlqArn);
      
      const actions = statementJson.Action as string[];
      expect(actions.some(a => a.includes('SendMessage'))).toBe(true);
    });
  });

  describe('QueueBind__SQSFIFOQueue__GrantsFIFOSpecificPermissions', () => {
    const metadata = {
      id: 'TP-binders-messaging-014',
      level: 'unit' as const,
      capability: 'Grants FIFO queue specific permissions including batch operations',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'QueueBind__Condition__Outcome', example: 'QueueBind__SQSFIFOQueue__GrantsFIFOSpecificPermissions' },
      invariants: [
        'IAM policies include sqs:SendMessageBatch action',
        'Environment variables include SQS_QUEUE_TYPE=FIFO',
        'Content-based deduplication setting is exposed'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'SQSCapabilityData FIFO'],
      inputs: {
        shape: 'BindingContext with messaging:sqs capability and FIFO queue (detected by .fifo suffix or explicit flag)',
        notes: 'FIFO queue support with deduplication'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('QueueBind__SQSFIFOQueue__GrantsFIFOSpecificPermissions', async () => {
      const strategy = new QueueBinderStrategy();
      const target = createMockTargetComponent('sqs-queue', {
        'messaging:sqs': {
          type: 'queue:sqs',
          resources: {
            arn: 'arn:aws:sqs:us-east-1:123456789012:test-queue.fifo',
            queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue.fifo',
            queueName: 'test-queue.fifo'
          },
          encryption: {
            enabled: false
          },
          contentBasedDeduplication: true
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'messaging:sqs',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: FIFO-specific permissions and environment variables
      expect(result.environmentVariables.SQS_QUEUE_TYPE).toBe('FIFO');
      expect(result.environmentVariables.SQS_CONTENT_BASED_DEDUPLICATION).toBe('true');
      
      const policy = result.iamPolicies.find(p => 
        p.description?.includes('FIFO') || p.description?.includes('batch')
      );
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = statementJson.Action as string[];
      expect(actions.some(a => a.includes('SendMessageBatch'))).toBe(true);
    });
  });

  describe('QueueBind__SNSSubscribeAccess__IncludesSubscriptionConfirmation', () => {
    const metadata = {
      id: 'TP-binders-messaging-015',
      level: 'unit' as const,
      capability: 'Includes sns:ConfirmSubscription permission for subscribe access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'QueueBind__Condition__Outcome', example: 'QueueBind__SNSSubscribeAccess__IncludesSubscriptionConfirmation' },
      invariants: [
        'IAM policies include sns:ConfirmSubscription action',
        'Subscription confirmation is included in subscribe permissions'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'SNSCapabilityData'],
      inputs: {
        shape: 'BindingContext with messaging:sns capability and subscribe access',
        notes: 'SNS subscription confirmation permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('QueueBind__SNSSubscribeAccess__IncludesSubscriptionConfirmation', async () => {
      const strategy = new QueueBinderStrategy();
      const topicArn = 'arn:aws:sns:us-east-1:123456789012:test-topic';
      const target = createMockTargetComponent('sns-topic', {
        'messaging:sns': {
          type: 'topic:sns',
          resources: {
            arn: topicArn,
            topicName: 'test-topic'
          },
          encryption: {
            enabled: false
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'messaging:sns',
        access: 'subscribe'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Subscription confirmation permission exists
      const policy = result.iamPolicies[0];
      const statementJson = policy.statement.toStatementJson();
      const actions = statementJson.Action as string[];
      expect(actions.some(a => a.includes('ConfirmSubscription'))).toBe(true);
    });
  });
});

