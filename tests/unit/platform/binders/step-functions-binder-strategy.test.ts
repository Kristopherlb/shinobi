/**
 * Step Functions Binder Strategy Tests
 * Comprehensive tests following Platform Testing Standard
 */

/**
 * Test Metadata:
 * {
 *   "id": "TP-step-functions-binder-001",
 *   "level": "unit",
 *   "capability": "Step Functions binding strategy validation and error handling",
 *   "oracle": "exact",
 *   "invariants": ["null safety", "access pattern validation", "ARN construction safety"],
 *   "fixtures": ["deterministic clock", "seeded RNG", "mock components"],
 *   "inputs": { "shape": "Step Functions component properties and binding configurations", "notes": "includes null/undefined edge cases" },
 *   "risks": ["null reference errors", "ARN construction failures", "access pattern validation bypass"],
 *   "dependencies": ["StepFunctionsBinderStrategy", "BindingContext", "ComponentBinding"],
 *   "evidence": ["null safety validation", "error message quality", "access pattern coverage"],
 *   "compliance_refs": ["std://platform-testing-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { StepFunctionsBinderStrategy } from '../../../../packages/core/src/platform/binders/strategies/messaging/step-functions-binder-strategy';
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

describe('StepFunctionsBinderStrategy', () => {
  let strategy: StepFunctionsBinderStrategy;
  let mockSourceComponent: any;
  let mockTargetComponent: any;
  let mockBinding: ComponentBinding;
  let mockContext: BindingContext;

  beforeEach(() => {
    strategy = new StepFunctionsBinderStrategy();

    mockSourceComponent = {
      addToRolePolicy: jest.fn(),
      addEnvironment: jest.fn()
    };

    mockTargetComponent = {
      stateMachineName: 'test-state-machine',
      stateMachineArn: 'arn:aws:states:us-east-1:123456789012:stateMachine:test-state-machine',
      definition: '{"Comment":"Test state machine","StartAt":"HelloWorld","States":{"HelloWorld":{"Type":"Task","Resource":"arn:aws:lambda:us-east-1:123456789012:function:HelloWorld","End":true}}}',
      roleArn: 'arn:aws:iam::123456789012:role/test-role',
      status: 'ACTIVE',
      type: 'STANDARD',
      executionName: 'test-execution',
      executionArn: 'arn:aws:states:us-east-1:123456789012:execution:test-state-machine:test-execution',
      input: '{"key":"value"}',
      output: '{"result":"success"}',
      status: 'SUCCEEDED',
      startDate: '2022-01-01T00:00:00Z',
      stopDate: '2022-01-01T00:01:00Z'
    };

    mockBinding = {
      capability: 'stepfunctions:state-machine',
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
        'stepfunctions:state-machine',
        'stepfunctions:execution',
        'stepfunctions:activity'
      ]);
    });
  });

  describe('Bind__NullTargetComponent__ThrowsError', () => {
    test('should throw error when target component is null', async () => {
      await expect(strategy.bind(mockSourceComponent, null, mockBinding, mockContext))
        .rejects.toThrow('Target component is required for Step Functions binding');
    });
  });

  describe('Bind__NullBinding__ThrowsError', () => {
    test('should throw error when binding is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, null, mockContext))
        .rejects.toThrow('Binding is required for Step Functions binding');
    });
  });

  describe('Bind__NullContext__ThrowsError', () => {
    test('should throw error when context is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, null))
        .rejects.toThrow('Context is required for Step Functions binding');
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
        .rejects.toThrow('Unsupported Step Functions capability: invalid:capability');
    });
  });

  describe('Bind__StepFunctionsStateMachineCapability__ConfiguresStateMachineAccess', () => {
    test('should configure read access for state machine', async () => {
      const readOnlyBinding = { ...mockBinding, access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, readOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'states:DescribeStateMachine',
          'states:ListStateMachines'
        ],
        Resource: mockTargetComponent.stateMachineArn
      });
    });

    test('should configure write access for state machine', async () => {
      const writeOnlyBinding = { ...mockBinding, access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, writeOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'states:CreateStateMachine',
          'states:UpdateStateMachine',
          'states:DeleteStateMachine'
        ],
        Resource: mockTargetComponent.stateMachineArn
      });
    });

    test('should inject state machine environment variables', async () => {
      await strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('STEP_FUNCTIONS_STATE_MACHINE_NAME', mockTargetComponent.stateMachineName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('STEP_FUNCTIONS_STATE_MACHINE_ARN', mockTargetComponent.stateMachineArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('STEP_FUNCTIONS_ROLE_ARN', mockTargetComponent.roleArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('STEP_FUNCTIONS_STATUS', mockTargetComponent.status);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('STEP_FUNCTIONS_TYPE', mockTargetComponent.type);
    });
  });

  describe('Bind__StepFunctionsExecutionCapability__ConfiguresExecutionAccess', () => {
    test('should configure read access for execution', async () => {
      const executionBinding = { ...mockBinding, capability: 'stepfunctions:execution', access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, executionBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'states:DescribeExecution',
          'states:ListExecutions'
        ],
        Resource: mockTargetComponent.executionArn
      });
    });

    test('should configure write access for execution', async () => {
      const executionBinding = { ...mockBinding, capability: 'stepfunctions:execution', access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, executionBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'states:StartExecution',
          'states:StopExecution'
        ],
        Resource: mockTargetComponent.stateMachineArn
      });
    });

    test('should inject execution environment variables', async () => {
      const executionBinding = { ...mockBinding, capability: 'stepfunctions:execution' };

      await strategy.bind(mockSourceComponent, mockTargetComponent, executionBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('STEP_FUNCTIONS_EXECUTION_NAME', mockTargetComponent.executionName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('STEP_FUNCTIONS_EXECUTION_ARN', mockTargetComponent.executionArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('STEP_FUNCTIONS_EXECUTION_STATUS', mockTargetComponent.status);
    });
  });

  describe('Bind__StepFunctionsActivityCapability__ConfiguresActivityAccess', () => {
    test('should configure read access for activity', async () => {
      const activityBinding = { ...mockBinding, capability: 'stepfunctions:activity', access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, activityBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'states:DescribeActivity',
          'states:ListActivities'
        ],
        Resource: `arn:aws:states:${mockContext.region}:${mockContext.accountId}:activity/*`
      });
    });

    test('should configure write access for activity', async () => {
      const activityBinding = { ...mockBinding, capability: 'stepfunctions:activity', access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, activityBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'states:CreateActivity',
          'states:DeleteActivity'
        ],
        Resource: `arn:aws:states:${mockContext.region}:${mockContext.accountId}:activity/*`
      });
    });
  });

  describe('Bind__EmptyAccessArray__ThrowsError', () => {
    test('should throw error when access array is empty', async () => {
      const emptyAccessBinding = { ...mockBinding, access: [] };

      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, emptyAccessBinding, mockContext))
        .rejects.toThrow('Access array cannot be empty for Step Functions binding');
    });
  });

  describe('Bind__InvalidAccessType__ThrowsError', () => {
    test('should throw error for invalid access type', async () => {
      const invalidAccessBinding = { ...mockBinding, access: ['invalid'] };

      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidAccessBinding, mockContext))
        .rejects.toThrow('Invalid access types for Step Functions binding: invalid. Valid types: read, write, admin, execute');
    });
  });
});
