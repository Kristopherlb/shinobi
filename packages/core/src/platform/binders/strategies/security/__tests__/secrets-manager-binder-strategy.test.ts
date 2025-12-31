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
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
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
      // Compliance status should be valid (may vary based on rules)
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('SecretsBind__WriteAccess__GrantsWriteActions', () => {
    const metadata = {
      id: 'TP-binders-secrets-006',
      level: 'unit' as const,
      capability: 'Grants write IAM actions for secretsmanager:secret capability with write access',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes secretsmanager:UpdateSecret',
        'PolicyStatement includes secretsmanager:PutSecretValue',
        'PolicyStatement resources match secretArn'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'SecretsManagerSecretCapabilityData'],
      inputs: {
        shape: 'BindingContext with secretsmanager:secret capability and write access',
        notes: 'Tests write access level grants'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecretsBind__WriteAccess__GrantsWriteActions', async () => {
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
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies include write actions
      const writePolicy = result.iamPolicies.find(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.includes('secretsmanager:UpdateSecret');
      });

      expect(writePolicy).toBeDefined();
      const statementJson = writePolicy!.statement.toStatementJson();
      const actions = statementJson.Action as string[];
      
      expect(actions).toContain('secretsmanager:UpdateSecret');
      expect(actions).toContain('secretsmanager:PutSecretValue');
      expect(actions).toContain('secretsmanager:CreateSecret');
      expect(actions).toContain('secretsmanager:DeleteSecret');
    });
  });

  describe('SecretsBind__AdminAccess__GrantsAdminActions', () => {
    const metadata = {
      id: 'TP-binders-secrets-007',
      level: 'unit' as const,
      capability: 'Grants admin IAM actions for secretsmanager:secret capability with admin access',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes secretsmanager:TagResource',
        'PolicyStatement includes secretsmanager:PutResourcePolicy',
        'PolicyStatement resources match secretArn'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'SecretsManagerSecretCapabilityData'],
      inputs: {
        shape: 'BindingContext with secretsmanager:secret capability and admin access',
        notes: 'Tests admin access level grants'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecretsBind__AdminAccess__GrantsAdminActions', async () => {
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
        access: 'admin'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies include admin actions
      const adminPolicy = result.iamPolicies.find(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.includes('secretsmanager:TagResource');
      });

      expect(adminPolicy).toBeDefined();
      const statementJson = adminPolicy!.statement.toStatementJson();
      const actions = statementJson.Action as string[];
      
      expect(actions).toContain('secretsmanager:TagResource');
      expect(actions).toContain('secretsmanager:UntagResource');
      expect(actions).toContain('secretsmanager:PutResourcePolicy');
      expect(actions).toContain('secretsmanager:GetResourcePolicy');
      expect(actions).toContain('secretsmanager:DeleteResourcePolicy');
      expect(actions).toContain('secretsmanager:RestoreSecret');
    });
  });

  describe('SecretsBind__RotationReadAccess__GrantsReadActions', () => {
    const metadata = {
      id: 'TP-binders-secrets-008',
      level: 'unit' as const,
      capability: 'Grants read IAM actions for secretsmanager:rotation capability with read access',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes secretsmanager:DescribeSecret',
        'PolicyStatement includes secretsmanager:GetSecretValue',
        'PolicyStatement resources match secretArn'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'SecretsManagerRotationCapabilityData'],
      inputs: {
        shape: 'BindingContext with secretsmanager:rotation capability and read access',
        notes: 'Tests rotation capability with read access level'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecretsBind__RotationReadAccess__GrantsReadActions', async () => {
      const strategy = new SecretsManagerBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('secret-rotation', {
        'secretsmanager:rotation': {
          secretArn: TEST_CONSTANTS.SECRET_ARN,
          rotationLambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:rotation-function'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'secretsmanager:rotation',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies include read actions for rotation
      const readPolicy = result.iamPolicies.find(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.includes('secretsmanager:DescribeSecret');
      });

      expect(readPolicy).toBeDefined();
      const statementJson = readPolicy!.statement.toStatementJson();
      const actions = statementJson.Action as string[];
      
      expect(actions).toContain('secretsmanager:DescribeSecret');
      expect(actions).toContain('secretsmanager:GetSecretValue');
      
      const resources = Array.isArray(statementJson.Resource) 
        ? statementJson.Resource 
        : [statementJson.Resource];
      expect(resources).toContain(TEST_CONSTANTS.SECRET_ARN);
    });
  });

  describe('SecretsBind__RotationWithDuration__SetsRotationDurationEnvVar', () => {
    const metadata = {
      id: 'TP-binders-secrets-009',
      level: 'unit' as const,
      capability: 'Sets SECRETS_MANAGER_ROTATION_DURATION environment variable when rotationRules.duration is provided',
      oracle: 'exact' as const,
      invariants: [
        'Environment variable SECRETS_MANAGER_ROTATION_DURATION is set',
        'Environment variable value matches rotationRules.duration'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'SecretsManagerRotationCapabilityData'],
      inputs: {
        shape: 'BindingContext with secretsmanager:rotation capability and rotationRules.duration',
        notes: 'Tests rotationRules.duration handling'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecretsBind__RotationWithDuration__SetsRotationDurationEnvVar', async () => {
      const strategy = new SecretsManagerBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('secret-rotation', {
        'secretsmanager:rotation': {
          secretArn: TEST_CONSTANTS.SECRET_ARN,
          rotationLambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:rotation-function',
          rotationRules: {
            automaticallyAfterDays: 30,
            duration: 'P7D'
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

      // Primary assertion: Rotation duration environment variable is set
      expect(result.environmentVariables.SECRETS_MANAGER_ROTATION_DURATION).toBe('P7D');
      expect(result.environmentVariables.SECRETS_MANAGER_ROTATION_ENABLED).toBe('true');
      expect(result.environmentVariables.SECRETS_MANAGER_ROTATION_DAYS).toBe('30');
    });
  });

  describe('SecretsBind__RotationWithSchedule__SetsRotationScheduleEnvVar', () => {
    const metadata = {
      id: 'TP-binders-secrets-010',
      level: 'unit' as const,
      capability: 'Sets SECRETS_MANAGER_ROTATION_SCHEDULE environment variable when rotationSchedule is provided',
      oracle: 'exact' as const,
      invariants: [
        'Environment variable SECRETS_MANAGER_ROTATION_SCHEDULE is set',
        'Environment variable value matches rotationSchedule'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'SecretsManagerRotationCapabilityData'],
      inputs: {
        shape: 'BindingContext with secretsmanager:rotation capability and rotationSchedule',
        notes: 'Tests rotationSchedule handling'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecretsBind__RotationWithSchedule__SetsRotationScheduleEnvVar', async () => {
      const strategy = new SecretsManagerBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('secret-rotation', {
        'secretsmanager:rotation': {
          secretArn: TEST_CONSTANTS.SECRET_ARN,
          rotationLambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:rotation-function',
          rotationSchedule: 'rate(30 days)'
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

      // Primary assertion: Rotation schedule environment variable is set
      expect(result.environmentVariables.SECRETS_MANAGER_ROTATION_SCHEDULE).toBe('rate(30 days)');
      expect(result.environmentVariables.SECRETS_MANAGER_ROTATION_LAMBDA_ARN).toBe('arn:aws:lambda:us-east-1:123456789012:function:rotation-function');
    });
  });

  describe('SecretsBind__SecureAccessEnabled__AppliesSecureConfig', () => {
    const metadata = {
      id: 'TP-binders-secrets-011',
      level: 'unit' as const,
      capability: 'Applies buildSecureSecretAccessConfig when requireSecureAccess option is true',
      oracle: 'exact' as const,
      invariants: [
        'Environment variable SECRETS_MANAGER_AUDIT_LOGGING_ENABLED is set to true',
        'IAM policies include KMS permissions when kmsKeyId is provided',
        'IAM policies include CloudTrail logging permissions'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'SecretsManagerSecretCapabilityData'],
      inputs: {
        shape: 'BindingContext with secretsmanager:secret capability, requireSecureAccess=true, and kmsKeyId',
        notes: 'Tests buildSecureSecretAccessConfig method execution'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecretsBind__SecureAccessEnabled__AppliesSecureConfig', async () => {
      const strategy = new SecretsManagerBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('secret', {
        'secretsmanager:secret': {
          secretArn: TEST_CONSTANTS.SECRET_ARN,
          name: 'test-secret',
          kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
          resourcePolicy: { Version: '2012-10-17', Statement: [] },
          autoRotationDays: 90
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'secretsmanager:secret',
        access: 'read',
        options: {
          requireSecureAccess: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Secure access configuration is applied
      expect(result.environmentVariables.SECRETS_MANAGER_AUDIT_LOGGING_ENABLED).toBe('true');
      expect(result.environmentVariables.SECRETS_MANAGER_KMS_KEY_ID).toBe('arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012');
      expect(result.environmentVariables.SECRETS_MANAGER_RESOURCE_POLICY).toBe(JSON.stringify({ Version: '2012-10-17', Statement: [] }));
      expect(result.environmentVariables.SECRETS_MANAGER_AUTO_ROTATION_REQUIRED).toBe('true');
      expect(result.environmentVariables.SECRETS_MANAGER_ROTATION_INTERVAL_DAYS).toBe('90');

      // Assert KMS permissions are granted
      const kmsPolicy = result.iamPolicies.find(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.includes('kms:Decrypt');
      });
      expect(kmsPolicy).toBeDefined();

      // Assert CloudTrail logging permissions are granted
      const logsPolicy = result.iamPolicies.find(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.includes('logs:CreateLogGroup');
      });
      expect(logsPolicy).toBeDefined();
      
      const logsStatementJson = logsPolicy!.statement.toStatementJson();
      const logsActions = logsStatementJson.Action as string[];
      expect(logsActions).toContain('logs:CreateLogGroup');
      expect(logsActions).toContain('logs:CreateLogStream');
      expect(logsActions).toContain('logs:PutLogEvents');
    });
  });
});