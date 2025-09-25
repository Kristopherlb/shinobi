/**
 * EventBridge Binder Strategy Tests
 * Comprehensive tests following Platform Testing Standard
 */

/**
 * Test Metadata:
 * {
 *   "id": "TP-eventbridge-binder-001",
 *   "level": "unit",
 *   "capability": "EventBridge binding strategy validation and error handling",
 *   "oracle": "exact",
 *   "invariants": ["null safety", "access pattern validation", "ARN construction safety"],
 *   "fixtures": ["deterministic clock", "seeded RNG", "mock components"],
 *   "inputs": { "shape": "EventBridge component properties and binding configurations", "notes": "includes null/undefined edge cases" },
 *   "risks": ["null reference errors", "ARN construction failures", "access pattern validation bypass"],
 *   "dependencies": ["EventBridgeBinderStrategy", "BindingContext", "ComponentBinding"],
 *   "evidence": ["null safety validation", "error message quality", "access pattern coverage"],
 *   "compliance_refs": ["std://platform-testing-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EventBridgeBinderStrategy } from '../../../../packages/core/src/platform/binders/strategies/messaging/eventbridge-binder-strategy';
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

describe('EventBridgeBinderStrategy', () => {
  let strategy: EventBridgeBinderStrategy;
  let mockSourceComponent: any;
  let mockTargetComponent: any;
  let mockBinding: ComponentBinding;
  let mockContext: BindingContext;

  beforeEach(() => {
    strategy = new EventBridgeBinderStrategy();

    mockSourceComponent = {
      addToRolePolicy: jest.fn(),
      addEnvironment: jest.fn()
    };

    mockTargetComponent = {
      eventBusName: 'test-event-bus',
      eventBusArn: 'arn:aws:events:us-east-1:123456789012:event-bus/test-event-bus',
      ruleName: 'test-rule',
      ruleArn: 'arn:aws:events:us-east-1:123456789012:rule/test-event-bus/test-rule',
      eventPattern: '{"source":["aws.ec2"],"detail-type":["EC2 Instance State-change Notification"]}',
      state: 'ENABLED',
      description: 'Test EventBridge rule',
      targetId: 'test-target',
      targetArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
      targetRoleArn: 'arn:aws:iam::123456789012:role/test-role',
      scheduleExpression: 'rate(5 minutes)',
      eventSourceName: 'aws.ec2',
      eventDetailType: 'EC2 Instance State-change Notification'
    };

    mockBinding = {
      capability: 'eventbridge:event-bus',
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
        'eventbridge:event-bus',
        'eventbridge:rule',
        'eventbridge:target'
      ]);
    });
  });

  describe('Bind__NullTargetComponent__ThrowsError', () => {
    test('should throw error when target component is null', async () => {
      await expect(strategy.bind(mockSourceComponent, null, mockBinding, mockContext))
        .rejects.toThrow('Target component is required for EventBridge binding');
    });
  });

  describe('Bind__NullBinding__ThrowsError', () => {
    test('should throw error when binding is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, null, mockContext))
        .rejects.toThrow('Binding is required for EventBridge binding');
    });
  });

  describe('Bind__NullContext__ThrowsError', () => {
    test('should throw error when context is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, null))
        .rejects.toThrow('Context is required for EventBridge binding');
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
        .rejects.toThrow('Unsupported EventBridge capability: invalid:capability');
    });
  });

  describe('Bind__EventBridgeEventBusCapability__ConfiguresEventBusAccess', () => {
    test('should configure read access for event bus', async () => {
      const readOnlyBinding = { ...mockBinding, access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, readOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'events:DescribeEventBus',
          'events:ListEventBuses'
        ],
        Resource: mockTargetComponent.eventBusArn
      });
    });

    test('should configure write access for event bus', async () => {
      const writeOnlyBinding = { ...mockBinding, access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, writeOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'events:CreateEventBus',
          'events:DeleteEventBus',
          'events:PutEvents'
        ],
        Resource: mockTargetComponent.eventBusArn
      });
    });

    test('should inject event bus environment variables', async () => {
      await strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EVENTBRIDGE_EVENT_BUS_NAME', mockTargetComponent.eventBusName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EVENTBRIDGE_EVENT_BUS_ARN', mockTargetComponent.eventBusArn);
    });
  });

  describe('Bind__EventBridgeRuleCapability__ConfiguresRuleAccess', () => {
    test('should configure read access for rule', async () => {
      const ruleBinding = { ...mockBinding, capability: 'eventbridge:rule', access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, ruleBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'events:DescribeRule',
          'events:ListRules'
        ],
        Resource: mockTargetComponent.ruleArn
      });
    });

    test('should configure write access for rule', async () => {
      const ruleBinding = { ...mockBinding, capability: 'eventbridge:rule', access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, ruleBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'events:PutRule',
          'events:DeleteRule',
          'events:EnableRule',
          'events:DisableRule'
        ],
        Resource: mockTargetComponent.ruleArn
      });
    });

    test('should inject rule environment variables', async () => {
      const ruleBinding = { ...mockBinding, capability: 'eventbridge:rule' };

      await strategy.bind(mockSourceComponent, mockTargetComponent, ruleBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EVENTBRIDGE_RULE_NAME', mockTargetComponent.ruleName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EVENTBRIDGE_RULE_ARN', mockTargetComponent.ruleArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EVENTBRIDGE_EVENT_PATTERN', mockTargetComponent.eventPattern);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EVENTBRIDGE_RULE_STATE', mockTargetComponent.state);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EVENTBRIDGE_RULE_DESCRIPTION', mockTargetComponent.description);
    });
  });

  describe('Bind__EventBridgeTargetCapability__ConfiguresTargetAccess', () => {
    test('should configure read access for target', async () => {
      const targetBinding = { ...mockBinding, capability: 'eventbridge:target', access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, targetBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'events:ListTargetsByRule'
        ],
        Resource: mockTargetComponent.ruleArn
      });
    });

    test('should configure write access for target', async () => {
      const targetBinding = { ...mockBinding, capability: 'eventbridge:target', access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, targetBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'events:PutTargets',
          'events:RemoveTargets'
        ],
        Resource: mockTargetComponent.ruleArn
      });
    });

    test('should inject target environment variables', async () => {
      const targetBinding = { ...mockBinding, capability: 'eventbridge:target' };

      await strategy.bind(mockSourceComponent, mockTargetComponent, targetBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EVENTBRIDGE_TARGET_ID', mockTargetComponent.targetId);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EVENTBRIDGE_TARGET_ARN', mockTargetComponent.targetArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EVENTBRIDGE_TARGET_ROLE_ARN', mockTargetComponent.targetRoleArn);
    });
  });

  describe('Bind__EmptyAccessArray__ThrowsError', () => {
    test('should throw error when access array is empty', async () => {
      const emptyAccessBinding = { ...mockBinding, access: [] };

      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, emptyAccessBinding, mockContext))
        .rejects.toThrow('Access array cannot be empty for EventBridge binding');
    });
  });

  describe('Bind__InvalidAccessType__ThrowsError', () => {
    test('should throw error for invalid access type', async () => {
      const invalidAccessBinding = { ...mockBinding, access: ['invalid'] };

      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidAccessBinding, mockContext))
        .rejects.toThrow('Invalid access types for EventBridge binding: invalid. Valid types: read, write, admin, publish, subscribe');
    });
  });
});
