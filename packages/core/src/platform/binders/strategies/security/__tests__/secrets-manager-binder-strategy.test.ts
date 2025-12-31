/**
 * Secrets Manager Binder Strategy Tests (Unified)
 * 
 * Tests for SecretsManagerBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { SecretsManagerBinderStrategy } from '../secrets-manager-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from './unified-strategy-test-helpers.js';

describe('SecretsManagerBinderStrategy', () => {
  describe('SecretsBind__ValidSecretAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-secrets-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with SECRETS_MANAGER_SECRET_ARN for valid secret binding',
      oracle: 'exact' as const,
      invariants: [
        'result.environmentVariables.SECRETS_MANAGER_SECRET_ARN matches input secretArn',
        'result.compliance.status exists',
        'result.iamPolicies is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'SecretsManagerSecretCapabilityData'],
      inputs: {
        shape: 'BindingContext with secretsmanager:secret capability, secretArn',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecretsBind__ValidSecretAccess__ReturnsEnhancedResult', async () => {
    const strategy = new SecretsManagerBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-function');
      const target = createMockTargetComponent('secret', {
        'secretsmanager:secret': {
          secretArn: TEST_CONSTANTS.SECRET_ARN,
          name: 'test-secret'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'secretsmanager:secret',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Assert EnhancedBindingResult structure
      assertEnhancedBindingResult(result);

      // Primary assertion: SECRETS_MANAGER_SECRET_ARN is set correctly
      expect(result.environmentVariables.SECRETS_MANAGER_SECRET_ARN).toBe(TEST_CONSTANTS.SECRET_ARN);

      // Invariants
      expect(result.compliance.status).toBe('compliant');
      expect(result.compliance.framework).toBe(TEST_CONSTANTS.COMPLIANCE_FRAMEWORK);
      expect(Array.isArray(result.iamPolicies)).toBe(true);
    });
  });

  describe('SecretsBind__ReadAccess__GrantsGetSecretValueAction', () => {
    const metadata = {
      id: 'TP-binders-secrets-002',
      level: 'unit' as const,
      capability: 'Grants secretsmanager:GetSecretValue IAM action for read access',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes secretsmanager:GetSecretValue',
        'PolicyStatement resources match secretArn',
        'PolicyStatement Effect is Allow'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'SecretsManagerSecretCapabilityData'],
      inputs: {
        shape: 'BindingContext with secretsmanager:secret capability and read access',
        notes: 'Standard AccessLevel read value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecretsBind__ReadAccess__GrantsGetSecretValueAction', async () => {
    const strategy = new SecretsManagerBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('secret', {
        'secretsmanager:secret': {
          secretArn: TEST_CONSTANTS.SECRET_ARN,
          name: 'test-secret'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'secretsmanager:secret',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies include GetSecretValue action
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      
      const policy = result.iamPolicies[0];
      const statementJson = policy.statement.toStatementJson();
      const actions = statementJson.Action as string[];
      
      expect(actions).toContain('secretsmanager:GetSecretValue');
      expect(statementJson.Effect).toBe('Allow');
      
      const resources = Array.isArray(statementJson.Resource) 
        ? statementJson.Resource 
        : [statementJson.Resource];
      expect(resources).toContain(TEST_CONSTANTS.SECRET_ARN);
    });
  });

  describe('SecretsBind__RotationCapability__SetsRotationEnvVars', () => {
    const metadata = {
      id: 'TP-binders-secrets-003',
      level: 'unit' as const,
      capability: 'Sets rotation-related environment variables for secretsmanager:rotation capability',
      oracle: 'exact' as const,
      invariants: [
        'Environment variables include rotation configuration',
        'IAM policies include Lambda invoke permissions when rotationLambdaArn present'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'SecretsManagerRotationCapabilityData'],
      inputs: {
        shape: 'BindingContext with secretsmanager:rotation capability and rotation configuration',
        notes: 'Target data includes rotationLambdaArn and rotationRules'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecretsBind__RotationCapability__SetsRotationEnvVars', async () => {
      const strategy = new SecretsManagerBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('secret-rotation', {
        'secretsmanager:rotation': {
          secretArn: TEST_CONSTANTS.SECRET_ARN,
          rotationLambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:rotation-function',
          rotationRules: {
            automaticallyAfterDays: 30
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'secretsmanager:rotation',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Rotation environment variables are set
      expect(result.environmentVariables.SECRETS_MANAGER_ROTATION_ENABLED).toBe('true');
      expect(result.environmentVariables.SECRETS_MANAGER_ROTATION_DAYS).toBe('30');
      expect(result.environmentVariables.SECRETS_MANAGER_SECRET_ARN).toBe(TEST_CONSTANTS.SECRET_ARN);

      // Invariants
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      
      // Check for Lambda invoke permission if rotationLambdaArn is present
      const hasLambdaInvoke = result.iamPolicies.some(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.includes('lambda:InvokeFunction');
      });
      expect(hasLambdaInvoke).toBe(true);
    });
  });

  describe('SecretsBind__MissingSecretArn__ThrowsActionableError', () => {
    const metadata = {
      id: 'TP-binders-secrets-004',
      level: 'unit' as const,
      capability: 'Throws actionable error when secretArn is missing from target capability data',
      oracle: 'exact' as const,
      invariants: [
        'Error message includes secretArn',
        'Error message is actionable (includes context)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with secretsmanager:secret capability but missing secretArn',
        notes: 'Target capability data missing required secretArn field'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecretsBind__MissingSecretArn__ThrowsActionableError', async () => {
      const strategy = new SecretsManagerBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('secret', {
        'secretsmanager:secret': {
          name: 'test-secret'
          // Missing secretArn
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'secretsmanager:secret',
        access: 'read'
      });

      // Primary assertion: Error is thrown with actionable message
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow();

      // Invariant: Error message should include secretArn
      try {
        await executeUnifiedBinding(strategy, context);
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
        // Error should mention secretArn or secret
        expect(error.message.toLowerCase()).toMatch(/secret/);
      }
    });
  });

  describe('SecretsBind__ComplianceFrameworkFedrampModerate__ReturnsCompliantStatus', () => {
    const metadata = {
      id: 'TP-binders-secrets-005',
      level: 'unit' as const,
      capability: 'Returns compliant status when complianceFramework is fedramp-moderate',
      oracle: 'exact' as const,
      invariants: [
        'compliance.framework matches input framework',
        'compliance.status is compliant for fedramp-moderate framework'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'SecretsManagerSecretCapabilityData'],
      inputs: {
        shape: 'BindingContext with complianceFramework=fedramp-moderate',
        notes: 'Tests compliance framework propagation'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecretsBind__ComplianceFrameworkFedrampModerate__ReturnsCompliantStatus', async () => {
      const strategy = new SecretsManagerBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('secret', {
        'secretsmanager:secret': {
          secretArn: TEST_CONSTANTS.SECRET_ARN,
          name: 'test-secret'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'secretsmanager:secret',
        access: 'read',
        complianceFramework: 'fedramp-moderate'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: compliance framework matches input
      expect(result.compliance.framework).toBe('fedramp-moderate');
      expect(result.compliance.status).toBe('compliant');
    });
  });
});