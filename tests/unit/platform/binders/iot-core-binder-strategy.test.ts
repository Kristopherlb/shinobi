/**
 * IoT Core Binder Strategy Tests
 * Comprehensive tests following Platform Testing Standard
 */

/**
 * Test Metadata:
 * {
 *   "id": "TP-iot-core-binder-001",
 *   "level": "unit",
 *   "capability": "IoT Core binding strategy validation and error handling",
 *   "oracle": "exact",
 *   "invariants": ["null safety", "access pattern validation", "ARN construction safety"],
 *   "fixtures": ["deterministic clock", "seeded RNG", "mock components"],
 *   "inputs": { "shape": "IoT Core component properties and binding configurations", "notes": "includes null/undefined edge cases" },
 *   "risks": ["null reference errors", "ARN construction failures", "access pattern validation bypass"],
 *   "dependencies": ["IoTCoreBinderStrategy", "BindingContext", "ComponentBinding"],
 *   "evidence": ["null safety validation", "error message quality", "access pattern coverage"],
 *   "compliance_refs": ["std://platform-testing-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { IoTCoreBinderStrategy } from '../../../../packages/core/src/platform/binders/strategies/iot/iot-core-binder-strategy';
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

describe('IoTCoreBinderStrategy', () => {
  let strategy: IoTCoreBinderStrategy;
  let mockSourceComponent: any;
  let mockTargetComponent: any;
  let mockBinding: ComponentBinding;
  let mockContext: BindingContext;

  beforeEach(() => {
    strategy = new IoTCoreBinderStrategy();
    
    mockSourceComponent = {
      addToRolePolicy: jest.fn(),
      addEnvironment: jest.fn()
    };

    mockTargetComponent = {
      thingName: 'test-thing',
      thingArn: 'arn:aws:iot:us-east-1:123456789012:thing/test-thing',
      thingTypeName: 'test-thing-type',
      thingTypeArn: 'arn:aws:iot:us-east-1:123456789012:thingtype/test-thing-type',
      certificateId: 'test-cert-id',
      certificateArn: 'arn:aws:iot:us-east-1:123456789012:cert/test-cert-id',
      policyName: 'test-policy',
      policyArn: 'arn:aws:iot:us-east-1:123456789012:policy/test-policy',
      topicName: 'test/topic',
      topicArn: 'arn:aws:iot:us-east-1:123456789012:topic/test/topic',
      ruleName: 'test-rule',
      ruleArn: 'arn:aws:iot:us-east-1:123456789012:rule/test-rule',
      sql: "SELECT * FROM 'test/topic'",
      state: 'ENABLED',
      description: 'Test IoT rule',
      endpoint: 'test-endpoint.iot.us-east-1.amazonaws.com',
      region: 'us-east-1'
    };

    mockBinding = {
      capability: 'iot:thing',
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
        'iot:thing',
        'iot:certificate',
        'iot:policy',
        'iot:topic',
        'iot:rule'
      ]);
    });
  });

  describe('Bind__NullTargetComponent__ThrowsError', () => {
    test('should throw error when target component is null', async () => {
      await expect(strategy.bind(mockSourceComponent, null, mockBinding, mockContext))
        .rejects.toThrow('Target component is required for IoT Core binding');
    });
  });

  describe('Bind__NullBinding__ThrowsError', () => {
    test('should throw error when binding is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, null, mockContext))
        .rejects.toThrow('Binding is required for IoT Core binding');
    });
  });

  describe('Bind__NullContext__ThrowsError', () => {
    test('should throw error when context is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, null))
        .rejects.toThrow('Context is required for IoT Core binding');
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
        .rejects.toThrow('Unsupported IoT Core capability: invalid:capability');
    });
  });

  describe('Bind__IoTThingCapability__ConfiguresThingAccess', () => {
    test('should configure read access for thing', async () => {
      const readOnlyBinding = { ...mockBinding, access: ['read'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, readOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'iot:DescribeThing',
          'iot:ListThings'
        ],
        Resource: mockTargetComponent.thingArn
      });
    });

    test('should configure write access for thing', async () => {
      const writeOnlyBinding = { ...mockBinding, access: ['write'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, writeOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'iot:CreateThing',
          'iot:UpdateThing',
          'iot:DeleteThing'
        ],
        Resource: mockTargetComponent.thingArn
      });
    });

    test('should inject thing environment variables', async () => {
      await strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('IOT_THING_NAME', mockTargetComponent.thingName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('IOT_THING_ARN', mockTargetComponent.thingArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('IOT_THING_TYPE', mockTargetComponent.thingTypeName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('IOT_ENDPOINT', mockTargetComponent.endpoint);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('IOT_REGION', mockTargetComponent.region);
    });
  });

  describe('Bind__IoTCertificateCapability__ConfiguresCertificateAccess', () => {
    test('should configure read access for certificate', async () => {
      const certBinding = { ...mockBinding, capability: 'iot:certificate', access: ['read'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, certBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'iot:DescribeCertificate',
          'iot:ListCertificates'
        ],
        Resource: mockTargetComponent.certificateArn
      });
    });

    test('should configure write access for certificate', async () => {
      const certBinding = { ...mockBinding, capability: 'iot:certificate', access: ['write'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, certBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'iot:CreateCertificateFromCsr',
          'iot:DeleteCertificate'
        ],
        Resource: mockTargetComponent.certificateArn
      });
    });

    test('should inject certificate environment variables', async () => {
      const certBinding = { ...mockBinding, capability: 'iot:certificate' };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, certBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('IOT_CERTIFICATE_ID', mockTargetComponent.certificateId);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('IOT_CERTIFICATE_ARN', mockTargetComponent.certificateArn);
    });
  });

  describe('Bind__IoTPolicyCapability__ConfiguresPolicyAccess', () => {
    test('should configure read access for policy', async () => {
      const policyBinding = { ...mockBinding, capability: 'iot:policy', access: ['read'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, policyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'iot:GetPolicy',
          'iot:ListPolicies'
        ],
        Resource: mockTargetComponent.policyArn
      });
    });

    test('should configure write access for policy', async () => {
      const policyBinding = { ...mockBinding, capability: 'iot:policy', access: ['write'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, policyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'iot:CreatePolicy',
          'iot:UpdatePolicy',
          'iot:DeletePolicy'
        ],
        Resource: mockTargetComponent.policyArn
      });
    });

    test('should inject policy environment variables', async () => {
      const policyBinding = { ...mockBinding, capability: 'iot:policy' };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, policyBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('IOT_POLICY_NAME', mockTargetComponent.policyName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('IOT_POLICY_ARN', mockTargetComponent.policyArn);
    });
  });

  describe('Bind__IoTTopicCapability__ConfiguresTopicAccess', () => {
    test('should configure read access for topic', async () => {
      const topicBinding = { ...mockBinding, capability: 'iot:topic', access: ['read'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, topicBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'iot:ListTopicRules'
        ],
        Resource: mockTargetComponent.topicArn
      });
    });

    test('should configure write access for topic', async () => {
      const topicBinding = { ...mockBinding, capability: 'iot:topic', access: ['write'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, topicBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'iot:Publish',
          'iot:Subscribe'
        ],
        Resource: mockTargetComponent.topicArn
      });
    });

    test('should inject topic environment variables', async () => {
      const topicBinding = { ...mockBinding, capability: 'iot:topic' };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, topicBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('IOT_TOPIC_NAME', mockTargetComponent.topicName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('IOT_TOPIC_ARN', mockTargetComponent.topicArn);
    });
  });

  describe('Bind__IoTRuleCapability__ConfiguresRuleAccess', () => {
    test('should configure read access for rule', async () => {
      const ruleBinding = { ...mockBinding, capability: 'iot:rule', access: ['read'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, ruleBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'iot:GetTopicRule',
          'iot:ListTopicRules'
        ],
        Resource: mockTargetComponent.ruleArn
      });
    });

    test('should configure write access for rule', async () => {
      const ruleBinding = { ...mockBinding, capability: 'iot:rule', access: ['write'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, ruleBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'iot:CreateTopicRule',
          'iot:UpdateTopicRule',
          'iot:DeleteTopicRule'
        ],
        Resource: mockTargetComponent.ruleArn
      });
    });

    test('should inject rule environment variables', async () => {
      const ruleBinding = { ...mockBinding, capability: 'iot:rule' };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, ruleBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('IOT_RULE_NAME', mockTargetComponent.ruleName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('IOT_RULE_ARN', mockTargetComponent.ruleArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('IOT_RULE_SQL', mockTargetComponent.sql);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('IOT_RULE_STATE', mockTargetComponent.state);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('IOT_RULE_DESCRIPTION', mockTargetComponent.description);
    });
  });

  describe('Bind__EmptyAccessArray__ThrowsError', () => {
    test('should throw error when access array is empty', async () => {
      const emptyAccessBinding = { ...mockBinding, access: [] };
      
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, emptyAccessBinding, mockContext))
        .rejects.toThrow('Access array cannot be empty for IoT Core binding');
    });
  });

  describe('Bind__InvalidAccessType__ThrowsError', () => {
    test('should throw error for invalid access type', async () => {
      const invalidAccessBinding = { ...mockBinding, access: ['invalid'] };
      
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidAccessBinding, mockContext))
        .rejects.toThrow('Invalid access types for IoT Core binding: invalid. Valid types: read, write, admin, connect, publish, subscribe');
    });
  });
});
