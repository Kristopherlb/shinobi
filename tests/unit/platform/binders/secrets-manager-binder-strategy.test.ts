/**
 * Secrets Manager Binder Strategy Tests
 * Comprehensive tests following Platform Testing Standard
 */

/**
 * Test Metadata:
 * {
 *   "id": "TP-secrets-manager-binder-001",
 *   "level": "unit",
 *   "capability": "Secrets Manager binding strategy validation and error handling",
 *   "oracle": "exact",
 *   "invariants": ["null safety", "access pattern validation", "ARN construction safety"],
 *   "fixtures": ["deterministic clock", "seeded RNG", "mock components"],
 *   "inputs": { "shape": "Secrets Manager component properties and binding configurations", "notes": "includes null/undefined edge cases" },
 *   "risks": ["null reference errors", "ARN construction failures", "access pattern validation bypass"],
 *   "dependencies": ["SecretsManagerBinderStrategy", "BindingContext", "ComponentBinding"],
 *   "evidence": ["null safety validation", "error message quality", "access pattern coverage"],
 *   "compliance_refs": ["std://platform-testing-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SecretsManagerBinderStrategy } from '../../../../packages/core/src/platform/binders/strategies/security/secrets-manager-binder-strategy';
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

describe('SecretsManagerBinderStrategy', () => {
  let strategy: SecretsManagerBinderStrategy;
  let mockSourceComponent: any;
  let mockTargetComponent: any;
  let mockBinding: ComponentBinding;
  let mockContext: BindingContext;

  beforeEach(() => {
    strategy = new SecretsManagerBinderStrategy();

    mockSourceComponent = {
      addToRolePolicy: jest.fn(),
      addEnvironment: jest.fn()
    };

    mockTargetComponent = {
      secretName: 'test-secret',
      secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret-abc123',
      description: 'Test secret for application',
      kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/test-key',
      secretString: '{"username":"admin","password":"secret123"}',
      versionId: '12345678-1234-1234-1234-123456789012',
      versionStages: ['AWSCURRENT'],
      rotationEnabled: true,
      rotationLambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-rotation',
      rotationInterval: 30,
      tags: [
        { Key: 'Environment', Value: 'Production' },
        { Key: 'Application', Value: 'TestApp' }
      ]
    };

    mockBinding = {
      capability: 'secretsmanager:secret',
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
        'secretsmanager:secret',
        'secretsmanager:rotation',
        'secretsmanager:policy'
      ]);
    });
  });

  describe('Bind__NullTargetComponent__ThrowsError', () => {
    test('should throw error when target component is null', async () => {
      await expect(strategy.bind(mockSourceComponent, null, mockBinding, mockContext))
        .rejects.toThrow('Target component is required for Secrets Manager binding');
    });
  });

  describe('Bind__NullBinding__ThrowsError', () => {
    test('should throw error when binding is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, null, mockContext))
        .rejects.toThrow('Binding is required for Secrets Manager binding');
    });
  });

  describe('Bind__NullContext__ThrowsError', () => {
    test('should throw error when context is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, null))
        .rejects.toThrow('Context is required for Secrets Manager binding');
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
        .rejects.toThrow('Unsupported Secrets Manager capability: invalid:capability');
    });
  });

  describe('Bind__SecretsManagerSecretCapability__ConfiguresSecretAccess', () => {
    test('should configure read access for secret', async () => {
      const readOnlyBinding = { ...mockBinding, access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, readOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'secretsmanager:GetSecretValue',
          'secretsmanager:DescribeSecret'
        ],
        Resource: mockTargetComponent.secretArn
      });
    });

    test('should configure write access for secret', async () => {
      const writeOnlyBinding = { ...mockBinding, access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, writeOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'secretsmanager:CreateSecret',
          'secretsmanager:UpdateSecret',
          'secretsmanager:PutSecretValue',
          'secretsmanager:DeleteSecret'
        ],
        Resource: mockTargetComponent.secretArn
      });
    });

    test('should inject secret environment variables', async () => {
      await strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SECRET_NAME', mockTargetComponent.secretName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SECRET_ARN', mockTargetComponent.secretArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SECRET_DESCRIPTION', mockTargetComponent.description);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SECRET_VERSION_ID', mockTargetComponent.versionId);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SECRET_VERSION_STAGES', mockTargetComponent.versionStages.join(','));
    });

    test('should configure KMS encryption when enabled', async () => {
      await strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SECRET_KMS_KEY_ID', mockTargetComponent.kmsKeyId);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'kms:Decrypt',
          'kms:GenerateDataKey'
        ],
        Resource: mockTargetComponent.kmsKeyId
      });
    });
  });

  describe('Bind__SecretsManagerRotationCapability__ConfiguresRotationAccess', () => {
    test('should configure read access for rotation', async () => {
      const rotationBinding = { ...mockBinding, capability: 'secretsmanager:rotation', access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, rotationBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'secretsmanager:GetSecretValue',
          'secretsmanager:DescribeSecret'
        ],
        Resource: mockTargetComponent.secretArn
      });
    });

    test('should configure write access for rotation', async () => {
      const rotationBinding = { ...mockBinding, capability: 'secretsmanager:rotation', access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, rotationBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'secretsmanager:UpdateSecret',
          'secretsmanager:RotateSecret'
        ],
        Resource: mockTargetComponent.secretArn
      });
    });

    test('should inject rotation environment variables', async () => {
      const rotationBinding = { ...mockBinding, capability: 'secretsmanager:rotation' };

      await strategy.bind(mockSourceComponent, mockTargetComponent, rotationBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SECRET_ROTATION_ENABLED', mockTargetComponent.rotationEnabled.toString());
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SECRET_ROTATION_LAMBDA_ARN', mockTargetComponent.rotationLambdaArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SECRET_ROTATION_INTERVAL', mockTargetComponent.rotationInterval.toString());
    });
  });

  describe('Bind__SecretsManagerPolicyCapability__ConfiguresPolicyAccess', () => {
    test('should configure read access for policy', async () => {
      const policyBinding = { ...mockBinding, capability: 'secretsmanager:policy', access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, policyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'secretsmanager:GetResourcePolicy'
        ],
        Resource: mockTargetComponent.secretArn
      });
    });

    test('should configure write access for policy', async () => {
      const policyBinding = { ...mockBinding, capability: 'secretsmanager:policy', access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, policyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'secretsmanager:PutResourcePolicy',
          'secretsmanager:DeleteResourcePolicy'
        ],
        Resource: mockTargetComponent.secretArn
      });
    });
  });

  describe('Bind__EmptyAccessArray__ThrowsError', () => {
    test('should throw error when access array is empty', async () => {
      const emptyAccessBinding = { ...mockBinding, access: [] };

      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, emptyAccessBinding, mockContext))
        .rejects.toThrow('Access array cannot be empty for Secrets Manager binding');
    });
  });

  describe('Bind__InvalidAccessType__ThrowsError', () => {
    test('should throw error for invalid access type', async () => {
      const invalidAccessBinding = { ...mockBinding, access: ['invalid'] };

      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidAccessBinding, mockContext))
        .rejects.toThrow('Invalid access types for Secrets Manager binding: invalid. Valid types: read, write, admin, rotate');
    });
  });
});
