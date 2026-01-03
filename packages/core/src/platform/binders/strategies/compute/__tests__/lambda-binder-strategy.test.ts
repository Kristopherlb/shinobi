/**
 * Lambda Binder Strategy Tests (Unified)
 * 
 * Tests for LambdaBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { LambdaBinderStrategy } from '../lambda-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';
import type { EnhancedBindingResult } from '../../../../../platform/contracts/platform-binding-trigger-spec.js';

describe('LambdaBinderStrategy', () => {
  describe('LambdaBind__ValidInvokeAccess__ReturnsEnhancedResultWithCompliance', () => {
    const metadata = {
      id: 'TP-binders-compute-lambda-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'LambdaBind__Condition__Outcome', example: 'LambdaBind__ValidInvokeAccess__ReturnsEnhancedResultWithCompliance' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables.LAMBDA_FUNCTION_ARN matches input functionArn',
        'result.iamPolicies is an array',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'LambdaCapabilityData'],
      inputs: {
        shape: 'BindingContext with lambda:function capability, resources.arn, resources.functionName',
        notes: 'Basic valid binding with invoke access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LambdaBind__ValidInvokeAccess__ReturnsEnhancedResultWithCompliance', async () => {
      const strategy = new LambdaBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-function');
      const functionArn = 'arn:aws:lambda:us-east-1:123456789012:function:test-function';
      const target = createMockTargetComponent('lambda-api', {
        'lambda:function': {
          type: 'lambda:function',
          resources: {
            arn: functionArn,
            functionName: 'test-function',
            version: '$LATEST'
          },
          environment: {}
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'lambda:function',
        access: 'invoke' as any as any
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Assert EnhancedBindingResult structure
      assertEnhancedBindingResult(result);

      // Primary assertion: compliance block exists and has correct structure
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
      expect(result.compliance.framework).toBe(TEST_CONSTANTS.COMPLIANCE_FRAMEWORK);
      expect(Array.isArray(result.compliance.actionsTaken)).toBe(true);

      // Invariants
      expect(result.environmentVariables.LAMBDA_FUNCTION_ARN).toBe(functionArn);
      expect(result.environmentVariables.LAMBDA_FUNCTION_NAME).toBe('test-function');
      expect(Array.isArray(result.iamPolicies)).toBe(true);
      expect(Array.isArray(result.securityGroupRules)).toBe(true);
    });
  });

  describe('LambdaBind__InvokeAccess__GrantsLambdaInvokeActions', () => {
    const metadata = {
      id: 'TP-binders-compute-lambda-002',
      level: 'unit' as const,
      capability: 'Grants Lambda invoke IAM actions for invoke access level',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'LambdaBind__Condition__Outcome', example: 'LambdaBind__InvokeAccess__GrantsLambdaInvokeActions' },
      invariants: [
        'PolicyStatement resources match functionArn',
        'PolicyStatement Effect is Allow',
        'Actions array includes lambda:InvokeFunction'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'LambdaCapabilityData'],
      inputs: {
        shape: 'BindingContext with lambda:function capability and invoke access',
        notes: 'Standard AccessLevel invoke value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LambdaBind__InvokeAccess__GrantsLambdaInvokeActions', async () => {
      const strategy = new LambdaBinderStrategy();
      const source = createMockSourceComponent();
      const functionArn = 'arn:aws:lambda:us-east-1:123456789012:function:test-function';
      const target = createMockTargetComponent('lambda-api', {
        'lambda:function': {
          type: 'lambda:function',
          resources: {
            arn: functionArn,
            functionName: 'test-function',
            version: '$LATEST'
          },
          environment: {}
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'lambda:function',
        access: 'invoke' as any as any
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies exist and contain Lambda invoke actions
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      
      const policy = result.iamPolicies[0];
      const statementJson = policy.statement.toStatementJson();
      
      // Invariants
      expect(statementJson.Effect).toBe('Allow');
      
      // Action can be a string or array - normalize to array
      const actions = Array.isArray(statementJson.Action) 
        ? statementJson.Action 
        : [statementJson.Action];
      expect(actions.length).toBeGreaterThan(0);
      
      // Check that resources match functionArn
      const resources = Array.isArray(statementJson.Resource) 
        ? statementJson.Resource 
        : [statementJson.Resource];
      expect(resources).toContain(functionArn);
      
      // Check that invoke actions are present
      expect(actions.some(a => a.includes('InvokeFunction'))).toBe(true);
    });
  });

  describe('LambdaBind__WithVersion__IncludesVersionInResourcesAndEnvVars', () => {
    const metadata = {
      id: 'TP-binders-compute-lambda-003',
      level: 'unit' as const,
      capability: 'Includes function version in IAM resources and environment variables',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'LambdaBind__Condition__Outcome', example: 'LambdaBind__WithVersion__IncludesVersionInResourcesAndEnvVars' },
      invariants: [
        'IAM policy resources include version-specific ARN',
        'Environment variables include LAMBDA_FUNCTION_VERSION',
        'Version matches targetData.resources.version'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'LambdaCapabilityData with version'],
      inputs: {
        shape: 'BindingContext with lambda:function capability and resources.version',
        notes: 'Lambda function with specific version'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LambdaBind__WithVersion__IncludesVersionInResourcesAndEnvVars', async () => {
      const strategy = new LambdaBinderStrategy();
      const functionArn = 'arn:aws:lambda:us-east-1:123456789012:function:test-function';
      const version = '1';
      const target = createMockTargetComponent('lambda-api', {
        'lambda:function': {
          type: 'lambda:function',
          resources: {
            arn: functionArn,
            functionName: 'test-function',
            version
          },
          environment: {}
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'lambda:function',
        access: 'invoke' as any
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Version is included in environment variables and IAM resources
      expect(result.environmentVariables.LAMBDA_FUNCTION_VERSION).toBe(version);
      
      const policy = result.iamPolicies[0];
      const statementJson = policy.statement.toStatementJson();
      const resources = Array.isArray(statementJson.Resource) 
        ? statementJson.Resource 
        : [statementJson.Resource];
      
      // Should include version-specific ARN
      expect(resources.some((r: string) => r.includes(`:${version}`))).toBe(true);
    });
  });

  describe('LambdaBind__AsyncInvoke__SetsAsyncInvokeEnvironmentVariables', () => {
    const metadata = {
      id: 'TP-binders-compute-lambda-004',
      level: 'unit' as const,
      capability: 'Sets async invoke environment variables when asyncInvoke option is true',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'LambdaBind__Condition__Outcome', example: 'LambdaBind__AsyncInvoke__SetsAsyncInvokeEnvironmentVariables' },
      invariants: [
        'Environment variables include LAMBDA_ASYNC_INVOKE=true',
        'LAMBDA_INVOCATION_TYPE is set appropriately',
        'IAM policy description mentions async invoke'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'LambdaCapabilityData'],
      inputs: {
        shape: 'BindingContext with lambda:function capability and options.asyncInvoke=true',
        notes: 'Async invoke configuration'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LambdaBind__AsyncInvoke__SetsAsyncInvokeEnvironmentVariables', async () => {
      const strategy = new LambdaBinderStrategy();
      const functionArn = 'arn:aws:lambda:us-east-1:123456789012:function:test-function';
      const target = createMockTargetComponent('lambda-api', {
        'lambda:function': {
          type: 'lambda:function',
          resources: {
            arn: functionArn,
            functionName: 'test-function',
            version: '$LATEST'
          },
          environment: {}
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'lambda:function',
        access: 'invoke' as any,
        options: {
          asyncInvoke: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Async invoke environment variables are set
      expect(result.environmentVariables.LAMBDA_ASYNC_INVOKE).toBe('true');
      expect(result.environmentVariables.LAMBDA_INVOCATION_TYPE).toBe('RequestResponse');
      
      // Policy description should mention async
      const policy = result.iamPolicies[0];
      expect(policy.description).toContain('async');
    });
  });

  describe('LambdaBind__EventInvoke__SetsEventInvokeEnvironmentVariables', () => {
    const metadata = {
      id: 'TP-binders-compute-lambda-005',
      level: 'unit' as const,
      capability: 'Sets event invoke environment variables when eventInvoke option is true',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'LambdaBind__Condition__Outcome', example: 'LambdaBind__EventInvoke__SetsEventInvokeEnvironmentVariables' },
      invariants: [
        'Environment variables include LAMBDA_ASYNC_INVOKE=true',
        'LAMBDA_INVOCATION_TYPE is "Event"',
        'IAM policy description mentions async invoke'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'LambdaCapabilityData'],
      inputs: {
        shape: 'BindingContext with lambda:function capability and options.eventInvoke=true',
        notes: 'Event invoke configuration'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LambdaBind__EventInvoke__SetsEventInvokeEnvironmentVariables', async () => {
      const strategy = new LambdaBinderStrategy();
      const functionArn = 'arn:aws:lambda:us-east-1:123456789012:function:test-function';
      const target = createMockTargetComponent('lambda-api', {
        'lambda:function': {
          type: 'lambda:function',
          resources: {
            arn: functionArn,
            functionName: 'test-function',
            version: '$LATEST'
          },
          environment: {}
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'lambda:function',
        access: 'invoke' as any,
        options: {
          eventInvoke: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Event invoke environment variables are set
      expect(result.environmentVariables.LAMBDA_ASYNC_INVOKE).toBe('true');
      expect(result.environmentVariables.LAMBDA_INVOCATION_TYPE).toBe('Event');
    });
  });

  describe('LambdaBind__WithVPC__IncludesVPCEvironmentVariables', () => {
    const metadata = {
      id: 'TP-binders-compute-lambda-006',
      level: 'unit' as const,
      capability: 'Includes VPC configuration in environment variables when VPC is configured',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'LambdaBind__Condition__Outcome', example: 'LambdaBind__WithVPC__IncludesVPCEvironmentVariables' },
      invariants: [
        'Environment variables include LAMBDA_VPC_SECURITY_GROUPS and/or LAMBDA_VPC_SUBNETS',
        'VPC values match targetData.vpc configuration'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'LambdaCapabilityData with VPC'],
      inputs: {
        shape: 'BindingContext with lambda:function capability and vpc configuration',
        notes: 'Lambda function with VPC configuration'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LambdaBind__WithVPC__IncludesVPCEvironmentVariables', async () => {
      const strategy = new LambdaBinderStrategy();
      const securityGroups = ['sg-12345678', 'sg-87654321'];
      const subnets = ['subnet-12345678', 'subnet-87654321'];
      const target = createMockTargetComponent('lambda-api', {
        'lambda:function': {
          type: 'lambda:function',
          resources: {
            arn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
            functionName: 'test-function',
            version: '$LATEST'
          },
          environment: {},
          vpc: {
            securityGroups,
            subnets
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'lambda:function',
        access: 'invoke' as any
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: VPC environment variables are set
      expect(result.environmentVariables.LAMBDA_VPC_SECURITY_GROUPS).toBe(securityGroups.join(','));
      expect(result.environmentVariables.LAMBDA_VPC_SUBNETS).toBe(subnets.join(','));
    });
  });

  describe('LambdaBind__WithTargetEnvironment__IncludesTargetEnvironmentVariables', () => {
    const metadata = {
      id: 'TP-binders-compute-lambda-007',
      level: 'unit' as const,
      capability: 'Includes target Lambda environment variables with LAMBDA_TARGET_ prefix',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'LambdaBind__Condition__Outcome', example: 'LambdaBind__WithTargetEnvironment__IncludesTargetEnvironmentVariables' },
      invariants: [
        'Environment variables include LAMBDA_TARGET_ prefixed variables',
        'Values match targetData.environment'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'LambdaCapabilityData with environment'],
      inputs: {
        shape: 'BindingContext with lambda:function capability and target environment variables',
        notes: 'Lambda function with environment variables'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LambdaBind__WithTargetEnvironment__IncludesTargetEnvironmentVariables', async () => {
      const strategy = new LambdaBinderStrategy();
      const targetEnv = {
        API_KEY: 'test-key',
        DATABASE_URL: 'postgres://localhost:5432/test'
      };
      const target = createMockTargetComponent('lambda-api', {
        'lambda:function': {
          type: 'lambda:function',
          resources: {
            arn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
            functionName: 'test-function',
            version: '$LATEST'
          },
          environment: targetEnv
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'lambda:function',
        access: 'invoke' as any
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Target environment variables are prefixed
      expect(result.environmentVariables.LAMBDA_TARGET_API_KEY).toBe('test-key');
      expect(result.environmentVariables.LAMBDA_TARGET_DATABASE_URL).toBe('postgres://localhost:5432/test');
    });
  });

  describe('LambdaBind__MissingRequiredFields__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-compute-lambda-008',
      level: 'unit' as const,
      capability: 'Throws error when required target capability data is missing',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'LambdaBind__Condition__Outcome', example: 'LambdaBind__MissingRequiredFields__ThrowsError' },
      invariants: [
        'Error message indicates missing field',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent with incomplete data'],
      inputs: {
        shape: 'BindingContext with lambda:function capability but missing resources.arn',
        notes: 'Error case - missing required field'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LambdaBind__MissingRequiredFields__ThrowsError', async () => {
      const strategy = new LambdaBinderStrategy();
      const target = createMockTargetComponent('lambda-api', {
        'lambda:function': {
          type: 'lambda:function',
          resources: {
            // Missing arn
            functionName: 'test-function',
            version: '$LATEST'
          },
          environment: {}
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'lambda:function',
        access: 'invoke' as any
      });

      // Primary assertion: Error is thrown
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'missing required resources.arn property'
      );
    });
  });

  describe('LambdaBind__InvalidAccessLevel__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-compute-lambda-009',
      level: 'unit' as const,
      capability: 'Throws error when invalid access level is provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'LambdaBind__Condition__Outcome', example: 'LambdaBind__InvalidAccessLevel__ThrowsError' },
      invariants: [
        'Error message indicates invalid access level',
        'Error specifies that only invoke is supported'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with lambda:function capability and invalid access level (e.g., "read")',
        notes: 'Error case - invalid access level for Lambda'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LambdaBind__InvalidAccessLevel__ThrowsError', async () => {
      const strategy = new LambdaBinderStrategy();
      const target = createMockTargetComponent('lambda-api', {
        'lambda:function': {
          type: 'lambda:function',
          resources: {
            arn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
            functionName: 'test-function',
            version: '$LATEST'
          },
          environment: {}
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'lambda:function',
        access: 'read' as any // Invalid access level
      });

      // Primary assertion: Error is thrown
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'Invalid access level for Lambda'
      );
    });
  });

  describe('LambdaBind__CustomEnvMappings__AppliesCustomEnvironmentVariableMappings', () => {
    const metadata = {
      id: 'TP-binders-compute-lambda-010',
      level: 'unit' as const,
      capability: 'Applies custom environment variable mappings from directive.env',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'LambdaBind__Condition__Outcome', example: 'LambdaBind__CustomEnvMappings__AppliesCustomEnvironmentVariableMappings' },
      invariants: [
        'Custom environment variable keys are used',
        'Values map to correct Lambda function properties'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with lambda:function capability and directive.env mappings',
        notes: 'Custom environment variable mappings'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LambdaBind__CustomEnvMappings__AppliesCustomEnvironmentVariableMappings', async () => {
      const strategy = new LambdaBinderStrategy();
      const functionArn = 'arn:aws:lambda:us-east-1:123456789012:function:test-function';
      const target = createMockTargetComponent('lambda-api', {
        'lambda:function': {
          type: 'lambda:function',
          resources: {
            arn: functionArn,
            functionName: 'test-function',
            version: '$LATEST'
          },
          environment: {}
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'lambda:function',
        access: 'invoke' as any,
        env: {
          'MY_FUNCTION_ARN': 'functionArn',
          'MY_FUNCTION_NAME': 'functionName'
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Custom environment variable mappings are applied
      expect(result.environmentVariables.MY_FUNCTION_ARN).toBe(functionArn);
      expect(result.environmentVariables.MY_FUNCTION_NAME).toBe('test-function');
    });
  });

  describe('LambdaBind__TargetEnvironmentWithSpecialCharacters__PrefixesAllValuesCorrectly', () => {
    const metadata = {
      id: 'TP-binders-compute-lambda-011',
      level: 'unit' as const,
      capability: 'Prefixes all target Lambda environment variables with LAMBDA_TARGET_ including special characters and edge cases',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'LambdaBind__Condition__Outcome', example: 'LambdaBind__TargetEnvironmentWithSpecialCharacters__PrefixesAllValuesCorrectly' },
      invariants: [
        'All environment variables from targetData.environment are prefixed with LAMBDA_TARGET_',
        'Empty strings, numbers, and special characters are handled correctly',
        'Variable names with underscores and mixed case are preserved'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'LambdaCapabilityData with complex environment'],
      inputs: {
        shape: 'BindingContext with lambda:function capability and targetData.environment containing various value types',
        notes: 'Comprehensive test for LAMBDA_TARGET_ prefixing with edge cases'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LambdaBind__TargetEnvironmentWithSpecialCharacters__PrefixesAllValuesCorrectly', async () => {
      const strategy = new LambdaBinderStrategy();
      const targetEnv = {
        'API_KEY': 'test-key-123',
        'DATABASE_URL': 'postgres://localhost:5432/test',
        'EMPTY_VALUE': '',
        'NUMERIC_VALUE': '42',
        'BOOLEAN_STRING': 'true',
        'JSON_STRING': '{"key":"value"}',
        'SPECIAL_CHARS': 'test@example.com',
        'UNDERSCORE_NAME': 'value_with_underscores',
        'MixedCase': 'MixedCaseValue',
        'NUMBER': 12345 // Should be converted to string
      };
      const target = createMockTargetComponent('lambda-api', {
        'lambda:function': {
          type: 'lambda:function',
          resources: {
            arn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
            functionName: 'test-function',
            version: '$LATEST'
          },
          environment: targetEnv
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'lambda:function',
        access: 'invoke' as any
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: All target environment variables are prefixed correctly
      expect(result.environmentVariables.LAMBDA_TARGET_API_KEY).toBe('test-key-123');
      expect(result.environmentVariables.LAMBDA_TARGET_DATABASE_URL).toBe('postgres://localhost:5432/test');
      expect(result.environmentVariables.LAMBDA_TARGET_EMPTY_VALUE).toBe('');
      expect(result.environmentVariables.LAMBDA_TARGET_NUMERIC_VALUE).toBe('42');
      expect(result.environmentVariables.LAMBDA_TARGET_BOOLEAN_STRING).toBe('true');
      expect(result.environmentVariables.LAMBDA_TARGET_JSON_STRING).toBe('{"key":"value"}');
      expect(result.environmentVariables.LAMBDA_TARGET_SPECIAL_CHARS).toBe('test@example.com');
      expect(result.environmentVariables.LAMBDA_TARGET_UNDERSCORE_NAME).toBe('value_with_underscores');
      expect(result.environmentVariables.LAMBDA_TARGET_MixedCase).toBe('MixedCaseValue');
      
      // Verify all values are strings (converted from any type)
      Object.keys(targetEnv).forEach(key => {
        const prefixedKey = `LAMBDA_TARGET_${key}`;
        expect(typeof result.environmentVariables[prefixedKey]).toBe('string');
      });
    });
  });

  describe('LambdaBind__RequireSecureAccessOption__NoSpecialHandling', () => {
    const metadata = {
      id: 'TP-binders-compute-lambda-012',
      level: 'unit' as const,
      capability: 'RequireSecureAccess option is not currently implemented (no special handling)',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'LambdaBind__Condition__Outcome', example: 'LambdaBind__RequireSecureAccessOption__NoSpecialHandling' },
      invariants: [
        'Binding succeeds with requireSecureAccess option',
        'No additional IAM policies or environment variables are added',
        'Standard binding behavior is unchanged'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with lambda:function capability and options.requireSecureAccess=true',
        notes: 'Note: requireSecureAccess is not implemented for Lambda bindings (future enhancement)'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LambdaBind__RequireSecureAccessOption__NoSpecialHandling', async () => {
      const strategy = new LambdaBinderStrategy();
      const functionArn = 'arn:aws:lambda:us-east-1:123456789012:function:test-function';
      const target = createMockTargetComponent('lambda-api', {
        'lambda:function': {
          type: 'lambda:function',
          resources: {
            arn: functionArn,
            functionName: 'test-function',
            version: '$LATEST'
          },
          environment: {}
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'lambda:function',
        access: 'invoke' as any,
        options: {
          requireSecureAccess: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Binding succeeds but no special secure access handling
      // Standard IAM policies and environment variables are present
      expect(result.iamPolicies.length).toBe(1);
      expect(result.environmentVariables.LAMBDA_FUNCTION_ARN).toBe(functionArn);
      
      // Verify no additional secure access policies were added
      // (requireSecureAccess is not implemented for Lambda bindings)
      const securePolicies = result.iamPolicies.filter(p => 
        p.description?.toLowerCase().includes('secure') ||
        p.description?.toLowerCase().includes('encryption') ||
        p.description?.toLowerCase().includes('vpc')
      );
      expect(securePolicies.length).toBe(0);
    });
  });

  describe('LambdaBind__VersionedVsLatestARN__IncludesBothInIAMResources', () => {
    const metadata = {
      id: 'TP-binders-compute-lambda-013',
      level: 'unit' as const,
      capability: 'Includes both versioned ARN and $LATEST alias in IAM policy resources',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'LambdaBind__Condition__Outcome', example: 'LambdaBind__VersionedVsLatestARN__IncludesBothInIAMResources' },
      invariants: [
        'When version is provided, IAM resources include both versioned ARN and $LATEST',
        'When version is not provided, IAM resources include base ARN and $LATEST',
        'All ARN formats are correctly constructed'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'LambdaCapabilityData with and without version'],
      inputs: {
        shape: 'BindingContext with lambda:function capability, testing both versioned and $LATEST scenarios',
        notes: 'IAM resource ARN handling for versioned vs unversioned Lambda functions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LambdaBind__VersionedVsLatestARN__IncludesBothInIAMResources', async () => {
      const strategy = new LambdaBinderStrategy();
      const baseArn = 'arn:aws:lambda:us-east-1:123456789012:function:test-function';
      const version = '5';
      
      // Test with version
      const targetWithVersion = createMockTargetComponent('lambda-api', {
        'lambda:function': {
          type: 'lambda:function',
          resources: {
            arn: baseArn,
            functionName: 'test-function',
            version
          },
          environment: {}
        }
      });

      const contextWithVersion = createBindingContext({
        source: createMockSourceComponent(),
        target: targetWithVersion,
        capability: 'lambda:function',
        access: 'invoke' as any
      });

      const resultWithVersion = await executeUnifiedBinding(strategy, contextWithVersion);

      assertEnhancedBindingResult(resultWithVersion);

      // Primary assertion: IAM resources include both versioned ARN and $LATEST
      const policy = resultWithVersion.iamPolicies[0];
      const statementJson = policy.statement.toStatementJson();
      const resources = Array.isArray(statementJson.Resource) 
        ? statementJson.Resource 
        : [statementJson.Resource];
      
      expect(resources).toContain(baseArn); // Base ARN
      expect(resources).toContain(`${baseArn}:${version}`); // Versioned ARN
      expect(resources).toContain(`${baseArn}:$LATEST`); // $LATEST alias
      expect(resources.length).toBe(3);

      // Test without version (should default to $LATEST)
      const targetWithoutVersion = createMockTargetComponent('lambda-api', {
        'lambda:function': {
          type: 'lambda:function',
          resources: {
            arn: baseArn,
            functionName: 'test-function'
            // No version field
          },
          environment: {}
        }
      });

      const contextWithoutVersion = createBindingContext({
        source: createMockSourceComponent(),
        target: targetWithoutVersion,
        capability: 'lambda:function',
        access: 'invoke' as any
      });

      const resultWithoutVersion = await executeUnifiedBinding(strategy, contextWithoutVersion);

      assertEnhancedBindingResult(resultWithoutVersion);

      // Primary assertion: IAM resources include base ARN and $LATEST (no versioned ARN)
      const policyNoVersion = resultWithoutVersion.iamPolicies[0];
      const statementJsonNoVersion = policyNoVersion.statement.toStatementJson();
      const resourcesNoVersion = Array.isArray(statementJsonNoVersion.Resource) 
        ? statementJsonNoVersion.Resource 
        : [statementJsonNoVersion.Resource];
      
      expect(resourcesNoVersion).toContain(baseArn); // Base ARN
      expect(resourcesNoVersion).toContain(`${baseArn}:$LATEST`); // $LATEST alias
      expect(resourcesNoVersion.length).toBe(2);
      // Should not include versioned ARN when version is not provided
      expect(resourcesNoVersion.some((r: string) => r.includes(`:${version}`))).toBe(false);
    });
  });

  describe('LambdaBind__WithDefaultPayload__ExposesPayloadInEnvironmentVariables', () => {
    const metadata = {
      id: 'TP-binders-compute-lambda-014',
      level: 'unit' as const,
      capability: 'Exposes default payload from options.payload in environment variables',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'LambdaBind__Condition__Outcome', example: 'LambdaBind__WithDefaultPayload__ExposesPayloadInEnvironmentVariables' },
      invariants: [
        'Environment variables include LAMBDA_DEFAULT_PAYLOAD',
        'Payload is stringified if provided as object',
        'Payload is preserved as-is if provided as string'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with lambda:function capability and options.payload (string or object)',
        notes: 'Default payload for Lambda invocations'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LambdaBind__WithDefaultPayload__ExposesPayloadInEnvironmentVariables', async () => {
      const strategy = new LambdaBinderStrategy();
      const target = createMockTargetComponent('lambda-api', {
        'lambda:function': {
          type: 'lambda:function',
          resources: {
            arn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
            functionName: 'test-function',
            version: '$LATEST'
          },
          environment: {}
        }
      });

      // Test with string payload
      const contextString = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'lambda:function',
        access: 'invoke' as any,
        options: {
          payload: '{"key":"value"}'
        }
      });

      const resultString = await executeUnifiedBinding(strategy, contextString);
      assertEnhancedBindingResult(resultString);
      expect(resultString.environmentVariables.LAMBDA_DEFAULT_PAYLOAD).toBe('{"key":"value"}');

      // Test with object payload (should be stringified)
      const contextObject = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'lambda:function',
        access: 'invoke' as any,
        options: {
          payload: { key: 'value', number: 42 }
        }
      });

      const resultObject = await executeUnifiedBinding(strategy, contextObject);
      assertEnhancedBindingResult(resultObject);
      expect(resultObject.environmentVariables.LAMBDA_DEFAULT_PAYLOAD).toBe('{"key":"value","number":42}');
    });
  });

  describe('LambdaBind__WithLayersAndRuntime__ExposesLayerAndRuntimeInfo', () => {
    const metadata = {
      id: 'TP-binders-compute-lambda-015',
      level: 'unit' as const,
      capability: 'Exposes Lambda layers and runtime information in environment variables',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'LambdaBind__Condition__Outcome', example: 'LambdaBind__WithLayersAndRuntime__ExposesLayerAndRuntimeInfo' },
      invariants: [
        'Environment variables include LAMBDA_RUNTIME when runtime is provided',
        'Environment variables include LAMBDA_LAYERS (comma-separated) and LAMBDA_LAYER_COUNT',
        'Individual layer ARNs are exposed as LAMBDA_LAYER_N_ARN'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'LambdaCapabilityData with layers and runtime'],
      inputs: {
        shape: 'BindingContext with lambda:function capability and targetData.layers and targetData.runtime',
        notes: 'Lambda layers and runtime exposure'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LambdaBind__WithLayersAndRuntime__ExposesLayerAndRuntimeInfo', async () => {
      const strategy = new LambdaBinderStrategy();
      const layers = [
        'arn:aws:lambda:us-east-1:123456789012:layer:layer1:1',
        'arn:aws:lambda:us-east-1:123456789012:layer:layer2:2'
      ];
      const runtime = 'nodejs20.x';
      const target = createMockTargetComponent('lambda-api', {
        'lambda:function': {
          type: 'lambda:function',
          resources: {
            arn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
            functionName: 'test-function',
            version: '$LATEST'
          },
          environment: {},
          layers,
          runtime
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'lambda:function',
        access: 'invoke' as any
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Runtime and layers are exposed
      expect(result.environmentVariables.LAMBDA_RUNTIME).toBe(runtime);
      expect(result.environmentVariables.LAMBDA_LAYERS).toBe(layers.join(','));
      expect(result.environmentVariables.LAMBDA_LAYER_COUNT).toBe('2');
      expect(result.environmentVariables.LAMBDA_LAYER_1_ARN).toBe(layers[0]);
      expect(result.environmentVariables.LAMBDA_LAYER_2_ARN).toBe(layers[1]);
    });
  });

  describe('LambdaBind__WithDeadLetterQueueAndReservedConcurrency__ExposesDLQAndConcurrencyInfo', () => {
    const metadata = {
      id: 'TP-binders-compute-lambda-016',
      level: 'unit' as const,
      capability: 'Exposes dead letter queue and reserved concurrency information in environment variables',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'LambdaBind__Condition__Outcome', example: 'LambdaBind__WithDeadLetterQueueAndReservedConcurrency__ExposesDLQAndConcurrencyInfo' },
      invariants: [
        'Environment variables include LAMBDA_DLQ_ARN when deadLetterQueue is configured',
        'Environment variables include LAMBDA_RESERVED_CONCURRENT_EXECUTIONS when reservedConcurrentExecutions is set',
        'Values match targetData configuration'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'LambdaCapabilityData with DLQ and reserved concurrency'],
      inputs: {
        shape: 'BindingContext with lambda:function capability and targetData.deadLetterQueue and targetData.reservedConcurrentExecutions',
        notes: 'Dead letter queue and reserved concurrency configuration'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LambdaBind__WithDeadLetterQueueAndReservedConcurrency__ExposesDLQAndConcurrencyInfo', async () => {
      const strategy = new LambdaBinderStrategy();
      const dlqArn = 'arn:aws:sqs:us-east-1:123456789012:test-dlq';
      const reservedConcurrency = 10;
      const target = createMockTargetComponent('lambda-api', {
        'lambda:function': {
          type: 'lambda:function',
          resources: {
            arn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
            functionName: 'test-function',
            version: '$LATEST'
          },
          environment: {},
          deadLetterQueue: {
            targetArn: dlqArn
          },
          reservedConcurrentExecutions: reservedConcurrency
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'lambda:function',
        access: 'invoke' as any
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: DLQ and reserved concurrency are exposed
      expect(result.environmentVariables.LAMBDA_DLQ_ARN).toBe(dlqArn);
      expect(result.environmentVariables.LAMBDA_RESERVED_CONCURRENT_EXECUTIONS).toBe('10');
    });
  });
});

