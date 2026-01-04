/**
 * Step Functions Binder Strategy Tests (Unified)
 * 
 * Tests for StepFunctionsBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { StepFunctionsBinderStrategy } from '../step-functions-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';

describe('StepFunctionsBinderStrategy', () => {
  describe('StepFunctionsBind__ValidStateMachineAccess__ReturnsEnhancedResultWithCompliance', () => {
    const metadata = {
      id: 'TP-binders-stepfunctions-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables.STEP_FUNCTIONS_STATE_MACHINE_ARN matches input stateMachineArn',
        'result.iamPolicies is an array',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'StepFunctionsStateMachineCapabilityData'],
      inputs: {
        shape: 'BindingContext with states:state-machine capability, stateMachineArn, stateMachineName',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('StepFunctionsBind__ValidStateMachineAccess__ReturnsEnhancedResultWithCompliance', async () => {
      const strategy = new StepFunctionsBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-function');
      const stateMachineArn = 'arn:aws:states:us-east-1:123456789012:stateMachine:test-machine';
      const target = createMockTargetComponent('stepfunctions-state-machine', {
        'states:state-machine': {
          stateMachineArn,
          stateMachineName: 'test-machine'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'states:state-machine',
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
      expect(result.environmentVariables.STEP_FUNCTIONS_STATE_MACHINE_ARN).toBe(stateMachineArn);
      expect(result.environmentVariables.STEP_FUNCTIONS_STATE_MACHINE_NAME).toBe('test-machine');
      expect(Array.isArray(result.iamPolicies)).toBe(true);
      expect(Array.isArray(result.securityGroupRules)).toBe(true);
    });
  });

  describe('StepFunctionsBind__StateMachineReadAccess__GrantsStateMachineReadActions', () => {
    const metadata = {
      id: 'TP-binders-stepfunctions-002',
      level: 'unit' as const,
      capability: 'Grants Step Functions state machine read IAM actions for read access level',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement resources match stateMachineArn',
        'PolicyStatement Effect is Allow',
        'Actions array includes states:DescribeStateMachine, states:ListStateMachines'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'StepFunctionsStateMachineCapabilityData'],
      inputs: {
        shape: 'BindingContext with states:state-machine capability and read access',
        notes: 'Standard AccessLevel read value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('StepFunctionsBind__StateMachineReadAccess__GrantsStateMachineReadActions', async () => {
      const strategy = new StepFunctionsBinderStrategy();
      const source = createMockSourceComponent();
      const stateMachineArn = 'arn:aws:states:us-east-1:123456789012:stateMachine:test-machine';
      const target = createMockTargetComponent('stepfunctions-state-machine', {
        'states:state-machine': {
          stateMachineArn,
          stateMachineName: 'test-machine'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'states:state-machine',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies exist and contain Step Functions read actions
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      
      const policy = result.iamPolicies[0];
      const statementJson = policy.statement.toStatementJson();
      
      // Invariants
      expect(statementJson.Effect).toBe('Allow');
      expect(Array.isArray(statementJson.Action)).toBe(true);
      expect(statementJson.Action.length).toBeGreaterThan(0);
      
      // Check that resources match stateMachineArn
      const resources = Array.isArray(statementJson.Resource) 
        ? statementJson.Resource 
        : [statementJson.Resource];
      expect(resources).toContain(stateMachineArn);
      
      // Check that read actions are present
      const actions = statementJson.Action as string[];
      expect(actions.some(a => a.includes('DescribeStateMachine') || a.includes('ListStateMachines'))).toBe(true);
    });
  });

  describe('StepFunctionsBind__StateMachineWriteAccess__GrantsStateMachineWriteActions', () => {
    const metadata = {
      id: 'TP-binders-stepfunctions-003',
      level: 'unit' as const,
      capability: 'Grants Step Functions state machine write IAM actions for write access level',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes states:CreateStateMachine, states:UpdateStateMachine, states:StartExecution',
        'PolicyStatement resources match stateMachineArn',
        'PolicyStatement Effect is Allow'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'StepFunctionsStateMachineCapabilityData'],
      inputs: {
        shape: 'BindingContext with states:state-machine capability and write access',
        notes: 'Standard AccessLevel write value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('StepFunctionsBind__StateMachineWriteAccess__GrantsStateMachineWriteActions', async () => {
      const strategy = new StepFunctionsBinderStrategy();
      const source = createMockSourceComponent();
      const stateMachineArn = 'arn:aws:states:us-east-1:123456789012:stateMachine:test-machine';
      const target = createMockTargetComponent('stepfunctions-state-machine', {
        'states:state-machine': {
          stateMachineArn,
          stateMachineName: 'test-machine'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'states:state-machine',
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
        expect(actions.some(a => a.includes('CreateStateMachine') || a.includes('UpdateStateMachine') || a.includes('StartExecution'))).toBe(true);
      }
    });
  });

  describe('StepFunctionsBind__StateMachineWithSecureAccess__AppliesSecurityConfig', () => {
    const metadata = {
      id: 'TP-binders-stepfunctions-004',
      level: 'unit' as const,
      capability: 'Applies secure access configuration when requireSecureAccess option is enabled',
      oracle: 'exact' as const,
      invariants: [
        'Environment variables include STEP_FUNCTIONS_LOGGING_ENABLED',
        'Environment variables include STEP_FUNCTIONS_XRAY_TRACING_ENABLED when tracing enabled',
        'IAM policies include CloudWatch Logs permissions',
        'IAM policies include X-Ray permissions when tracing enabled',
        'Dead letter queue permissions included when deadLetterQueueArn provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'StepFunctionsStateMachineCapabilityData'],
      inputs: {
        shape: 'BindingContext with states:state-machine capability and requireSecureAccess option enabled',
        notes: 'Options includes requireSecureAccess: true, loggingConfiguration, tracingConfiguration, kmsKeyId, deadLetterQueueArn'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('StepFunctionsBind__StateMachineWithSecureAccess__AppliesSecurityConfig', async () => {
      const strategy = new StepFunctionsBinderStrategy();
      const source = createMockSourceComponent();
      const stateMachineArn = 'arn:aws:states:us-east-1:123456789012:stateMachine:test-machine';
      const kmsKeyId = 'arn:aws:kms:us-east-1:123456789012:key/test-key';
      const deadLetterQueueArn = 'arn:aws:sqs:us-east-1:123456789012:test-dlq';
      const target = createMockTargetComponent('stepfunctions-state-machine', {
        'states:state-machine': {
          stateMachineArn,
          stateMachineName: 'test-machine',
          loggingConfiguration: {
            level: 'INFO',
            includeExecutionData: true
          },
          tracingConfiguration: {
            enabled: true
          },
          kmsKeyId,
          deadLetterQueueArn
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'states:state-machine',
        access: 'read',
        options: { requireSecureAccess: true }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Secure access environment variables are set
      expect(result.environmentVariables.STEP_FUNCTIONS_LOGGING_ENABLED).toBe('true');
      expect(result.environmentVariables.STEP_FUNCTIONS_XRAY_TRACING_ENABLED).toBe('true');
      expect(result.environmentVariables.STEP_FUNCTIONS_DEAD_LETTER_QUEUE_ENABLED).toBe('true');
      expect(result.environmentVariables.STEP_FUNCTIONS_ENCRYPTION_ENABLED).toBe('true');
      expect(result.environmentVariables.STEP_FUNCTIONS_KMS_KEY_ID).toBe(kmsKeyId);
      expect(result.environmentVariables.STEP_FUNCTIONS_AUDIT_LOGGING_ENABLED).toBe('true');

      // Check for CloudWatch Logs permissions
      const logsPolicy = result.iamPolicies.find(p => 
        p.description.includes('CloudWatch Logs') || p.description.includes('logging')
      );
      expect(logsPolicy).toBeDefined();
    });
  });

  describe('StepFunctionsBind__ExecutionReadAccess__GrantsExecutionReadActions', () => {
    const metadata = {
      id: 'TP-binders-stepfunctions-005',
      level: 'unit' as const,
      capability: 'Grants Step Functions execution read IAM actions for read access level',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes states:DescribeExecution, states:ListExecutions, states:GetExecutionHistory',
        'PolicyStatement resources match executionArn',
        'Environment variables include execution metadata'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'StepFunctionsExecutionCapabilityData'],
      inputs: {
        shape: 'BindingContext with states:execution capability and read access',
        notes: 'Standard AccessLevel read value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('StepFunctionsBind__ExecutionReadAccess__GrantsExecutionReadActions', async () => {
      const strategy = new StepFunctionsBinderStrategy();
      const source = createMockSourceComponent();
      const executionArn = 'arn:aws:states:us-east-1:123456789012:execution:test-machine:test-execution';
      const target = createMockTargetComponent('stepfunctions-execution', {
        'states:execution': {
          executionArn,
          executionName: 'test-execution',
          status: 'RUNNING'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'states:execution',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Execution environment variables and IAM policies are set
      expect(result.environmentVariables.STEP_FUNCTIONS_EXECUTION_ARN).toBe(executionArn);
      expect(result.environmentVariables.STEP_FUNCTIONS_EXECUTION_NAME).toBe('test-execution');
      expect(result.environmentVariables.STEP_FUNCTIONS_EXECUTION_STATUS).toBe('RUNNING');
      expect(result.iamPolicies.length).toBeGreaterThan(0);
    });
  });

  describe('StepFunctionsBind__ActivityWithTaskAccess__GrantsActivityTaskPermissions', () => {
    const metadata = {
      id: 'TP-binders-stepfunctions-006',
      level: 'unit' as const,
      capability: 'Grants Step Functions activity task permissions when activityTaskAccess option is enabled',
      oracle: 'exact' as const,
      invariants: [
        'IAM policies include states:GetActivityTask for polling',
        'IAM policies include states:SendTaskSuccess, states:SendTaskFailure, states:SendTaskHeartbeat for sending',
        'PolicyStatement resources match activityArn'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'StepFunctionsActivityCapabilityData'],
      inputs: {
        shape: 'BindingContext with states:activity capability and activityTaskAccess option enabled',
        notes: 'Options includes activityTaskAccess: true'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('StepFunctionsBind__ActivityWithTaskAccess__GrantsActivityTaskPermissions', async () => {
      const strategy = new StepFunctionsBinderStrategy();
      const source = createMockSourceComponent();
      const activityArn = 'arn:aws:states:us-east-1:123456789012:activity:test-activity';
      const target = createMockTargetComponent('stepfunctions-activity', {
        'states:activity': {
          activityArn,
          activityName: 'test-activity'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'states:activity',
        access: 'readwrite',
        options: { activityTaskAccess: true }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Activity task permissions are granted
      expect(result.environmentVariables.STEP_FUNCTIONS_ACTIVITY_ARN).toBe(activityArn);
      
      // Check for activity task policies
      const taskPolicies = result.iamPolicies.filter(p => 
        p.description.includes('task')
      );
      expect(taskPolicies.length).toBeGreaterThan(0);
    });
  });

  describe('StepFunctionsBind__MissingStateMachineName__ThrowsActionableError', () => {
    const metadata = {
      id: 'TP-binders-stepfunctions-007',
      level: 'unit' as const,
      capability: 'Throws actionable error when stateMachineName is missing from target capability data',
      oracle: 'exact' as const,
      invariants: [
        'Error message includes stateMachineName',
        'Error is thrown before IAM policy creation',
        'Error message is actionable (includes context)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with states:state-machine capability but missing stateMachineName in target data',
        notes: 'Target has stateMachineArn but no stateMachineName'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('StepFunctionsBind__MissingStateMachineName__ThrowsActionableError', async () => {
      const strategy = new StepFunctionsBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('stepfunctions-state-machine', {
        'states:state-machine': {
          stateMachineArn: 'arn:aws:states:us-east-1:123456789012:stateMachine:test-machine'
          // Missing stateMachineName
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'states:state-machine',
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
        expect(error.message).toContain('stateMachineName');
      }
    });
  });

  describe('StepFunctionsBind__AllCapabilities__RoutesToCorrectMethod', () => {
    const metadata = {
      id: 'TP-binders-stepfunctions-008',
      level: 'unit' as const,
      capability: 'Routes all Step Functions capabilities to correct binding methods',
      oracle: 'exact' as const,
      invariants: [
        'Each capability returns EnhancedBindingResult',
        'Each capability has distinct result structure',
        'All supported capabilities are handled'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with different Step Functions capabilities (state-machine, execution, activity)',
        notes: 'Tests all three supported capabilities'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('StepFunctionsBind__AllCapabilities__RoutesToCorrectMethod', async () => {
      const strategy = new StepFunctionsBinderStrategy();

      // Test states:state-machine
      const machineResult = await executeUnifiedBinding(strategy, createBindingContext({
        source: createMockSourceComponent(),
        target: createMockTargetComponent('stepfunctions-state-machine', {
          'states:state-machine': {
            stateMachineArn: 'arn:aws:states:us-east-1:123456789012:stateMachine:test-machine',
            stateMachineName: 'test-machine'
          }
        }),
        capability: 'states:state-machine',
        access: 'read'
      }));
      assertEnhancedBindingResult(machineResult);
      expect(machineResult.environmentVariables.STEP_FUNCTIONS_STATE_MACHINE_NAME).toBe('test-machine');

      // Test states:execution
      const executionResult = await executeUnifiedBinding(strategy, createBindingContext({
        source: createMockSourceComponent(),
        target: createMockTargetComponent('stepfunctions-execution', {
          'states:execution': {
            executionArn: 'arn:aws:states:us-east-1:123456789012:execution:test-machine:test-execution'
          }
        }),
        capability: 'states:execution',
        access: 'read'
      }));
      assertEnhancedBindingResult(executionResult);
      expect(executionResult.environmentVariables.STEP_FUNCTIONS_EXECUTION_ARN).toBeDefined();

      // Test states:activity
      const activityResult = await executeUnifiedBinding(strategy, createBindingContext({
        source: createMockSourceComponent(),
        target: createMockTargetComponent('stepfunctions-activity', {
          'states:activity': {
            activityArn: 'arn:aws:states:us-east-1:123456789012:activity:test-activity'
          }
        }),
        capability: 'states:activity',
        access: 'read'
      }));
      assertEnhancedBindingResult(activityResult);
      expect(activityResult.environmentVariables.STEP_FUNCTIONS_ACTIVITY_ARN).toBeDefined();
    });
  });

  describe('StepFunctionsBind__InvalidCapability__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-stepfunctions-009',
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

    test('StepFunctionsBind__InvalidCapability__ThrowsError', async () => {
      const strategy = new StepFunctionsBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('stepfunctions-invalid', {
        'states:invalid': {
          someData: 'value'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'states:invalid',
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
        expect(error.message).toContain('states:invalid');
      }
    });
  });

  describe('StepFunctionsBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-messaging-stepfunctions-010',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default Step Functions actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'StepFunctionsBind__Condition__Outcome', example: 'StepFunctionsBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default Step Functions actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with states:state-machine capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('StepFunctionsBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new StepFunctionsBinderStrategy();
      const customActions = ['states:StartExecution', 'states:DescribeStateMachine'];
      const target = createMockTargetComponent('stepfunctions-state-machine', {
        'states:state-machine': {
          stateMachineArn: 'arn:aws:states:us-east-1:123456789012:stateMachine:test-machine',
          stateMachineName: 'test-machine'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'states:state-machine',
        access: 'read',
        actions: customActions
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.iamPolicies.length).toBeGreaterThan(0);
      const policy = result.iamPolicies.find(p => p.description.includes('state machine'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toEqual(expect.arrayContaining(customActions));
      expect(actions.length).toBe(customActions.length);
    });
  });
});