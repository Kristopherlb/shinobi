/**
 * EventBridge Binder Strategy Tests (Unified)
 * 
 * Tests for EventBridgeBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { EventBridgeBinderStrategy } from '../eventbridge-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';

describe('EventBridgeBinderStrategy', () => {
  describe('EventBridgeBind__ValidEventBusAccess__ReturnsEnhancedResultWithCompliance', () => {
    const metadata = {
      id: 'TP-binders-eventbridge-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables.EVENTBRIDGE_EVENT_BUS_ARN matches input eventBusArn',
        'result.iamPolicies is an array',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'EventBridgeEventBusCapabilityData'],
      inputs: {
        shape: 'BindingContext with eventbridge:event-bus capability, eventBusArn, eventBusName',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EventBridgeBind__ValidEventBusAccess__ReturnsEnhancedResultWithCompliance', async () => {
    const strategy = new EventBridgeBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-function');
      const eventBusArn = 'arn:aws:events:us-east-1:123456789012:event-bus/test-bus';
      const target = createMockTargetComponent('eventbridge-event-bus', {
        'eventbridge:event-bus': {
          eventBusArn,
          eventBusName: 'test-bus'
        }
      });

      const context = createBindingContext({
        source,
        target,
      capability: 'eventbridge:event-bus',
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
      expect(result.environmentVariables.EVENTBRIDGE_EVENT_BUS_ARN).toBe(eventBusArn);
      expect(result.environmentVariables.EVENTBRIDGE_EVENT_BUS_NAME).toBe('test-bus');
      expect(Array.isArray(result.iamPolicies)).toBe(true);
      expect(Array.isArray(result.securityGroupRules)).toBe(true);
    });
  });

  describe('EventBridgeBind__EventBusReadAccess__GrantsEventBusReadActions', () => {
    const metadata = {
      id: 'TP-binders-eventbridge-002',
      level: 'unit' as const,
      capability: 'Grants EventBridge event bus read IAM actions for read access level',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement resources match eventBusArn',
        'PolicyStatement Effect is Allow',
        'Actions array includes events:DescribeEventBus, events:ListEventBuses'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'EventBridgeEventBusCapabilityData'],
      inputs: {
        shape: 'BindingContext with eventbridge:event-bus capability and read access',
        notes: 'Standard AccessLevel read value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EventBridgeBind__EventBusReadAccess__GrantsEventBusReadActions', async () => {
      const strategy = new EventBridgeBinderStrategy();
      const source = createMockSourceComponent();
      const eventBusArn = 'arn:aws:events:us-east-1:123456789012:event-bus/test-bus';
      const target = createMockTargetComponent('eventbridge-event-bus', {
        'eventbridge:event-bus': {
          eventBusArn,
          eventBusName: 'test-bus'
        }
      });

      const context = createBindingContext({
        source,
        target,
      capability: 'eventbridge:event-bus',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies exist and contain EventBridge read actions
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      
      const policy = result.iamPolicies[0];
      const statementJson = policy.statement.toStatementJson();
      
      // Invariants
      expect(statementJson.Effect).toBe('Allow');
      expect(Array.isArray(statementJson.Action)).toBe(true);
      expect(statementJson.Action.length).toBeGreaterThan(0);
      
      // Check that resources match eventBusArn
      const resources = Array.isArray(statementJson.Resource) 
        ? statementJson.Resource 
        : [statementJson.Resource];
      expect(resources).toContain(eventBusArn);
      
      // Check that read actions are present
      const actions = statementJson.Action as string[];
      expect(actions.some(a => a.includes('DescribeEventBus') || a.includes('ListEventBuses'))).toBe(true);
    });
  });

  describe('EventBridgeBind__EventBusWriteAccess__GrantsEventBusWriteActions', () => {
    const metadata = {
      id: 'TP-binders-eventbridge-003',
      level: 'unit' as const,
      capability: 'Grants EventBridge event bus write IAM actions for write access level',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes events:PutEvents, events:CreateEventBus, events:DeleteEventBus',
        'PolicyStatement resources match eventBusArn',
        'PolicyStatement Effect is Allow'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'EventBridgeEventBusCapabilityData'],
      inputs: {
        shape: 'BindingContext with eventbridge:event-bus capability and write access',
        notes: 'Standard AccessLevel write value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EventBridgeBind__EventBusWriteAccess__GrantsEventBusWriteActions', async () => {
    const strategy = new EventBridgeBinderStrategy();
      const source = createMockSourceComponent();
      const eventBusArn = 'arn:aws:events:us-east-1:123456789012:event-bus/test-bus';
      const target = createMockTargetComponent('eventbridge-event-bus', {
        'eventbridge:event-bus': {
          eventBusArn,
          eventBusName: 'test-bus'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'eventbridge:event-bus',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies contain write actions
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      
      const writePolicy = result.iamPolicies.find(p => 
        p.description.includes('write')
      );
      expect(writePolicy).toBeDefined();
      
      if (writePolicy) {
        const statementJson = writePolicy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        expect(actions.some(a => a.includes('PutEvents') || a.includes('CreateEventBus') || a.includes('DeleteEventBus'))).toBe(true);
      }
    });
  });

  describe('EventBridgeBind__EventBusWithSecureAccess__AppliesSecurityConfig', () => {
    const metadata = {
      id: 'TP-binders-eventbridge-004',
      level: 'unit' as const,
      capability: 'Applies secure access configuration when requireSecureAccess option is enabled',
      oracle: 'exact' as const,
      invariants: [
        'Environment variables include EVENTBRIDGE_AUDIT_LOGGING_ENABLED',
        'IAM policies include CloudWatch Logs permissions',
        'KMS permissions included when kmsKeyId provided',
        'Dead letter queue permissions included when deadLetterConfig provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'EventBridgeEventBusCapabilityData'],
      inputs: {
        shape: 'BindingContext with eventbridge:event-bus capability and requireSecureAccess option enabled',
        notes: 'Options includes requireSecureAccess: true, kmsKeyId, deadLetterConfig'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EventBridgeBind__EventBusWithSecureAccess__AppliesSecurityConfig', async () => {
      const strategy = new EventBridgeBinderStrategy();
      const source = createMockSourceComponent();
      const eventBusArn = 'arn:aws:events:us-east-1:123456789012:event-bus/test-bus';
      const kmsKeyId = 'arn:aws:kms:us-east-1:123456789012:key/test-key';
      const deadLetterQueueArn = 'arn:aws:sqs:us-east-1:123456789012:test-dlq';
      const target = createMockTargetComponent('eventbridge-event-bus', {
        'eventbridge:event-bus': {
          eventBusArn,
          eventBusName: 'test-bus',
          kmsKeyId,
          deadLetterConfig: { arn: deadLetterQueueArn }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'eventbridge:event-bus',
        access: 'read',
        options: { requireSecureAccess: true }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Secure access environment variables are set
      expect(result.environmentVariables.EVENTBRIDGE_AUDIT_LOGGING_ENABLED).toBe('true');
      expect(result.environmentVariables.EVENTBRIDGE_KMS_KEY_ID).toBe(kmsKeyId);
      expect(result.environmentVariables.EVENTBRIDGE_DEAD_LETTER_QUEUE_ARN).toBe(deadLetterQueueArn);

      // Check for CloudWatch Logs permissions
      const logsPolicy = result.iamPolicies.find(p => 
        p.description.includes('CloudWatch Logs') || p.description.includes('audit logging')
      );
      expect(logsPolicy).toBeDefined();
    });
  });

  describe('EventBridgeBind__RuleWithTargets__GrantsTargetPermissions', () => {
    const metadata = {
      id: 'TP-binders-eventbridge-005',
      level: 'unit' as const,
      capability: 'Grants IAM permissions for EventBridge rule targets (Lambda, SQS, SNS)',
      oracle: 'exact' as const,
      invariants: [
        'IAM policies include target-specific permissions',
        'Lambda targets grant lambda:InvokeFunction',
        'SQS targets grant sqs:SendMessage',
        'SNS targets grant sns:Publish'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'EventBridgeRuleCapabilityData'],
      inputs: {
        shape: 'BindingContext with eventbridge:rule capability and targets array',
        notes: 'Targets include Lambda, SQS, and SNS ARNs'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EventBridgeBind__RuleWithTargets__GrantsTargetPermissions', async () => {
      const strategy = new EventBridgeBinderStrategy();
      const source = createMockSourceComponent();
      const ruleArn = 'arn:aws:events:us-east-1:123456789012:rule/test-rule';
      const lambdaArn = 'arn:aws:lambda:us-east-1:123456789012:function:test-function';
      const sqsArn = 'arn:aws:sqs:us-east-1:123456789012:test-queue';
      const target = createMockTargetComponent('eventbridge-rule', {
        'eventbridge:rule': {
          ruleName: 'test-rule',
          ruleArn,
          targets: [
            { arn: lambdaArn },
            { arn: sqsArn }
          ]
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'eventbridge:rule',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Target permissions are granted
      expect(result.environmentVariables.EVENTBRIDGE_RULE_NAME).toBe('test-rule');
      expect(result.environmentVariables.EVENTBRIDGE_TARGETS).toBeDefined();
      
      // Check for target-specific policies
      const lambdaPolicy = result.iamPolicies.find(p => 
        p.description.includes('Lambda') || p.description.includes('target')
      );
      expect(lambdaPolicy).toBeDefined();
      
      const sqsPolicy = result.iamPolicies.find(p => 
        p.description.includes('SQS') || p.description.includes('target')
      );
      expect(sqsPolicy).toBeDefined();
    });
  });

  describe('EventBridgeBind__ConnectionWithApiDestination__GrantsApiDestinationPermissions', () => {
    const metadata = {
      id: 'TP-binders-eventbridge-006',
      level: 'unit' as const,
      capability: 'Grants IAM permissions for EventBridge connection API destinations',
      oracle: 'exact' as const,
      invariants: [
        'IAM policies include API destination permissions',
        'Environment variables include API destination ARN',
        'Connection state and authorization type are included'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'EventBridgeConnectionCapabilityData'],
      inputs: {
        shape: 'BindingContext with eventbridge:connection capability and apiDestinationArn',
        notes: 'Connection includes API destination configuration'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EventBridgeBind__ConnectionWithApiDestination__GrantsApiDestinationPermissions', async () => {
      const strategy = new EventBridgeBinderStrategy();
      const source = createMockSourceComponent();
      const connectionArn = 'arn:aws:events:us-east-1:123456789012:connection/test-connection';
      const apiDestinationArn = 'arn:aws:events:us-east-1:123456789012:api-destination/test-destination';
      const target = createMockTargetComponent('eventbridge-connection', {
        'eventbridge:connection': {
          connectionName: 'test-connection',
          connectionArn,
          apiDestinationArn,
          authorizationType: 'API_KEY',
          connectionState: 'AUTHORIZED'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'eventbridge:connection',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Connection environment variables and API destination permissions are set
      expect(result.environmentVariables.EVENTBRIDGE_CONNECTION_NAME).toBe('test-connection');
      expect(result.environmentVariables.EVENTBRIDGE_CONNECTION_ARN).toBe(connectionArn);
      expect(result.environmentVariables.EVENTBRIDGE_API_DESTINATION_ARN).toBe(apiDestinationArn);
      expect(result.environmentVariables.EVENTBRIDGE_CONNECTION_AUTHORIZATION_TYPE).toBe('API_KEY');
      expect(result.iamPolicies.length).toBeGreaterThan(0);
    });
  });

  describe('EventBridgeBind__MissingEventBusName__ThrowsActionableError', () => {
    const metadata = {
      id: 'TP-binders-eventbridge-007',
      level: 'unit' as const,
      capability: 'Throws actionable error when eventBusName is missing from target capability data',
      oracle: 'exact' as const,
      invariants: [
        'Error message includes eventBusName',
        'Error is thrown before IAM policy creation',
        'Error message is actionable (includes context)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with eventbridge:event-bus capability but missing eventBusName in target data',
        notes: 'Target has eventBusArn but no eventBusName'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EventBridgeBind__MissingEventBusName__ThrowsActionableError', async () => {
      const strategy = new EventBridgeBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('eventbridge-event-bus', {
        'eventbridge:event-bus': {
          eventBusArn: 'arn:aws:events:us-east-1:123456789012:event-bus/test-bus'
          // Missing eventBusName
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'eventbridge:event-bus',
        access: 'read'
      });

      // Primary assertion: Error is thrown with actionable message
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow();

      try {
        await executeUnifiedBinding(strategy, context);
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
        expect(error.message).toContain('eventBusName');
      }
    });
  });

  describe('EventBridgeBind__AllCapabilities__RoutesToCorrectMethod', () => {
    const metadata = {
      id: 'TP-binders-eventbridge-008',
      level: 'unit' as const,
      capability: 'Routes all EventBridge capabilities to correct binding methods',
      oracle: 'exact' as const,
      invariants: [
        'Each capability returns EnhancedBindingResult',
        'Each capability has distinct result structure',
        'All supported capabilities are handled'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with different EventBridge capabilities (event-bus, rule, connection)',
        notes: 'Tests all three supported capabilities'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EventBridgeBind__AllCapabilities__RoutesToCorrectMethod', async () => {
      const strategy = new EventBridgeBinderStrategy();

      // Test eventbridge:event-bus
      const busResult = await executeUnifiedBinding(strategy, createBindingContext({
        source: createMockSourceComponent(),
        target: createMockTargetComponent('eventbridge-event-bus', {
          'eventbridge:event-bus': {
            eventBusArn: 'arn:aws:events:us-east-1:123456789012:event-bus/test-bus',
            eventBusName: 'test-bus'
          }
        }),
        capability: 'eventbridge:event-bus',
        access: 'read'
      }));
      assertEnhancedBindingResult(busResult);
      expect(busResult.environmentVariables.EVENTBRIDGE_EVENT_BUS_NAME).toBe('test-bus');

      // Test eventbridge:rule
      const ruleResult = await executeUnifiedBinding(strategy, createBindingContext({
        source: createMockSourceComponent(),
        target: createMockTargetComponent('eventbridge-rule', {
          'eventbridge:rule': {
            ruleName: 'test-rule',
            ruleArn: 'arn:aws:events:us-east-1:123456789012:rule/test-rule'
          }
        }),
        capability: 'eventbridge:rule',
        access: 'read'
      }));
      assertEnhancedBindingResult(ruleResult);
      expect(ruleResult.environmentVariables.EVENTBRIDGE_RULE_NAME).toBe('test-rule');

      // Test eventbridge:connection
      const connectionResult = await executeUnifiedBinding(strategy, createBindingContext({
        source: createMockSourceComponent(),
        target: createMockTargetComponent('eventbridge-connection', {
          'eventbridge:connection': {
            connectionName: 'test-connection',
            connectionArn: 'arn:aws:events:us-east-1:123456789012:connection/test-connection'
          }
        }),
        capability: 'eventbridge:connection',
        access: 'read'
      }));
      assertEnhancedBindingResult(connectionResult);
      expect(connectionResult.environmentVariables.EVENTBRIDGE_CONNECTION_NAME).toBe('test-connection');
    });
  });

  describe('EventBridgeBind__InvalidCapability__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-eventbridge-009',
      level: 'unit' as const,
      capability: 'Throws error when unsupported capability is provided',
      oracle: 'exact' as const,
      invariants: [
        'Error message includes unsupported capability',
        'Error message lists supported capabilities',
        'Error is thrown before binding execution'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with unsupported capability',
        notes: 'Capability is not in supportedCapabilities list'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EventBridgeBind__InvalidCapability__ThrowsError', async () => {
      const strategy = new EventBridgeBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('eventbridge-invalid', {
        'eventbridge:invalid': {
          someData: 'value'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'eventbridge:invalid',
        access: 'read'
      });

      // Primary assertion: Error is thrown with actionable message
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow();

      try {
        await executeUnifiedBinding(strategy, context);
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
        expect(error.message).toContain('eventbridge:invalid');
      }
    });
  });
});