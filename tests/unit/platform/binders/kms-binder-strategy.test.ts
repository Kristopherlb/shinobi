/**
 * KMS Binder Strategy Tests
 * Comprehensive tests following Platform Testing Standard
 */

/**
 * Test Metadata:
 * {
 *   "id": "TP-kms-binder-001",
 *   "level": "unit",
 *   "capability": "KMS binding strategy validation and error handling",
 *   "oracle": "exact",
 *   "invariants": ["null safety", "array safety", "access pattern validation"],
 *   "fixtures": ["deterministic clock", "seeded RNG", "mock components"],
 *   "inputs": { "shape": "KMS component properties and binding configurations", "notes": "includes null/undefined and array operation edge cases" },
 *   "risks": ["null reference errors", "array operation failures", "access pattern validation bypass"],
 *   "dependencies": ["KmsBinderStrategy", "BindingContext", "ComponentBinding"],
 *   "evidence": ["null safety validation", "array safety validation", "error message quality"],
 *   "compliance_refs": ["std://platform-testing-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { KmsBinderStrategy } from '../../../../packages/core/src/platform/binders/strategies/security/kms-binder-strategy';
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

describe('KmsBinderStrategy', () => {
  let strategy: KmsBinderStrategy;
  let mockSourceComponent: any;
  let mockTargetComponent: any;
  let bindingContext: BindingContext;

  beforeEach(() => {
    strategy = new KmsBinderStrategy();

    // Mock source component with required methods
    mockSourceComponent = {
      addToRolePolicy: jest.fn(),
      addEnvironment: jest.fn()
    };

    // Mock target component with valid KMS properties
    mockTargetComponent = {
      keyArn: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
      keyId: '12345678-1234-1234-1234-123456789012',
      description: 'Test KMS key',
      keyUsage: 'ENCRYPT_DECRYPT',
      keySpec: 'SYMMETRIC_DEFAULT',
      origin: 'AWS_KMS',
      keyPolicy: {
        Version: '2012-10-17',
        Statement: []
      },
      multiRegion: true,
      primaryRegion: 'us-east-1'
    };

    bindingContext = {
      region: 'us-east-1',
      accountId: '123456789012',
      complianceFramework: ComplianceFramework.COMMERCIAL,
      environment: 'test'
    };
  });

  describe('SupportedCapabilities__ValidStrategy__ReturnsCorrectCapabilities', () => {
    test('should return correct supported capabilities', () => {
      // Arrange & Act
      const capabilities = strategy.supportedCapabilities;

      // Assert
      expect(capabilities).toEqual(['kms:key', 'kms:alias', 'kms:grant']);
    });
  });

  describe('BindToKey__ValidInputs__ConfiguresCorrectly', () => {
    test('should configure key binding with read access', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'kms-key',
        capability: 'kms:key',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, mockTargetComponent, binding, bindingContext);

      // Assert
      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'kms:DescribeKey',
          'kms:GetKeyPolicy',
          'kms:ListKeys',
          'kms:ListAliases'
        ],
        Resource: mockTargetComponent.keyArn
      });
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KMS_KEY_ID', mockTargetComponent.keyId);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KMS_KEY_ARN', mockTargetComponent.keyArn);
    });

    test('should configure key binding with encrypt/decrypt access', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'kms-key',
        capability: 'kms:key',
        access: ['encrypt', 'decrypt']
      };

      // Act
      await strategy.bind(mockSourceComponent, mockTargetComponent, binding, bindingContext);

      // Assert
      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'kms:Encrypt',
          'kms:Decrypt',
          'kms:ReEncrypt*',
          'kms:GenerateDataKey',
          'kms:GenerateDataKeyWithoutPlaintext'
        ],
        Resource: mockTargetComponent.keyArn
      });
    });

    test('should configure key binding with admin access', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'kms-key',
        capability: 'kms:key',
        access: ['admin']
      };

      // Act
      await strategy.bind(mockSourceComponent, mockTargetComponent, binding, bindingContext);

      // Assert
      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'kms:EnableKey',
          'kms:DisableKey',
          'kms:ScheduleKeyDeletion',
          'kms:CancelKeyDeletion',
          'kms:TagResource',
          'kms:UntagResource'
        ],
        Resource: mockTargetComponent.keyArn
      });
    });
  });

  describe('BindToKey__NullTargetComponent__ThrowsDescriptiveError', () => {
    test('should throw error when target component is null', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'kms-key',
        capability: 'kms:key',
        access: ['read']
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, null, binding, bindingContext))
        .rejects.toThrow('Target component is required for KMS key binding');
    });

    test('should throw error when target component is undefined', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'kms-key',
        capability: 'kms:key',
        access: ['read']
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, undefined, binding, bindingContext))
        .rejects.toThrow('Target component is required for KMS key binding');
    });
  });

  describe('BindToKey__MissingRequiredProperties__ThrowsDescriptiveError', () => {
    test('should throw error when keyArn is missing', async () => {
      // Arrange
      const invalidTargetComponent = { ...mockTargetComponent };
      delete invalidTargetComponent.keyArn;

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'kms-key',
        capability: 'kms:key',
        access: ['read']
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, invalidTargetComponent, binding, bindingContext))
        .rejects.toThrow('Target component missing required keyArn property for KMS key binding');
    });

    test('should throw error when keyId is missing', async () => {
      // Arrange
      const invalidTargetComponent = { ...mockTargetComponent };
      delete invalidTargetComponent.keyId;

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'kms-key',
        capability: 'kms:key',
        access: ['read']
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, invalidTargetComponent, binding, bindingContext))
        .rejects.toThrow('Target component missing required keyId property for KMS key binding');
    });
  });

  describe('BindToKey__InvalidAccessPatterns__ThrowsDescriptiveError', () => {
    test('should throw error when access array contains invalid values', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'kms-key',
        capability: 'kms:key',
        access: ['invalid-access', 'read']
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, binding, bindingContext))
        .rejects.toThrow('Invalid access types for KMS key binding: invalid-access. Valid types: read, write, admin, encrypt, decrypt, process');
    });

    test('should throw error when access array is empty', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'kms-key',
        capability: 'kms:key',
        access: []
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, binding, bindingContext))
        .rejects.toThrow('Access array cannot be empty for KMS key binding');
    });
  });

  describe('BindToKey__UnsupportedCapability__ThrowsDescriptiveError', () => {
    test('should throw error for unsupported capability', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'kms-key',
        capability: 'kms:unsupported',
        access: ['read']
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, binding, bindingContext))
        .rejects.toThrow('Unsupported KMS capability: kms:unsupported. Supported capabilities: kms:key, kms:alias, kms:grant');
    });
  });

  describe('BindToAlias__ValidInputs__ConfiguresCorrectly', () => {
    test('should configure alias binding with read access', async () => {
      // Arrange
      const aliasTargetComponent = {
        aliasArn: 'arn:aws:kms:us-east-1:123456789012:alias/test-alias',
        aliasName: 'alias/test-alias',
        targetKeyId: '12345678-1234-1234-1234-123456789012'
      };

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'kms-alias',
        capability: 'kms:alias',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, aliasTargetComponent, binding, bindingContext);

      // Assert
      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'kms:ListAliases',
          'kms:DescribeKey'
        ],
        Resource: aliasTargetComponent.aliasArn
      });
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KMS_ALIAS_NAME', aliasTargetComponent.aliasName);
    });
  });

  describe('BindToGrant__ValidInputs__ConfiguresCorrectly', () => {
    test('should configure grant binding with read access', async () => {
      // Arrange
      const grantTargetComponent = {
        keyArn: mockTargetComponent.keyArn,
        grantId: 'test-grant-id',
        grantToken: 'test-grant-token',
        operations: ['Encrypt', 'Decrypt', 'GenerateDataKey'],
        granteePrincipal: 'arn:aws:iam::123456789012:user/test-user'
      };

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'kms-grant',
        capability: 'kms:grant',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, grantTargetComponent, binding, bindingContext);

      // Assert
      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'kms:ListGrants',
          'kms:DescribeKey'
        ],
        Resource: grantTargetComponent.keyArn
      });
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KMS_GRANT_ID', grantTargetComponent.grantId);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KMS_GRANT_TOKEN', grantTargetComponent.grantToken);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KMS_GRANT_OPERATIONS', grantTargetComponent.operations.join(','));
    });
  });

  describe('BindToGrant__ArraySafetyValidation__HandlesEdgeCases', () => {
    test('should handle undefined operations array gracefully', async () => {
      // Arrange
      const grantTargetComponent = {
        keyArn: mockTargetComponent.keyArn,
        grantId: 'test-grant-id',
        grantToken: 'test-grant-token',
        operations: undefined,
        granteePrincipal: 'arn:aws:iam::123456789012:user/test-user'
      };

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'kms-grant',
        capability: 'kms:grant',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, grantTargetComponent, binding, bindingContext);

      // Assert
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KMS_GRANT_OPERATIONS', '');
    });

    test('should handle null operations array gracefully', async () => {
      // Arrange
      const grantTargetComponent = {
        keyArn: mockTargetComponent.keyArn,
        grantId: 'test-grant-id',
        grantToken: 'test-grant-token',
        operations: null,
        granteePrincipal: 'arn:aws:iam::123456789012:user/test-user'
      };

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'kms-grant',
        capability: 'kms:grant',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, grantTargetComponent, binding, bindingContext);

      // Assert
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KMS_GRANT_OPERATIONS', '');
    });

    test('should handle empty operations array gracefully', async () => {
      // Arrange
      const grantTargetComponent = {
        keyArn: mockTargetComponent.keyArn,
        grantId: 'test-grant-id',
        grantToken: 'test-grant-token',
        operations: [],
        granteePrincipal: 'arn:aws:iam::123456789012:user/test-user'
      };

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'kms-grant',
        capability: 'kms:grant',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, grantTargetComponent, binding, bindingContext);

      // Assert
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KMS_GRANT_OPERATIONS', '');
    });
  });

  describe('BindToKey__TypeSafetyValidation__HandlesEdgeCases', () => {
    test('should handle undefined key usage gracefully', async () => {
      // Arrange
      const targetWithoutKeyUsage = { ...mockTargetComponent };
      delete targetWithoutKeyUsage.keyUsage;

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'kms-key',
        capability: 'kms:key',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, targetWithoutKeyUsage, binding, bindingContext);

      // Assert
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KMS_KEY_USAGE', 'ENCRYPT_DECRYPT');
    });

    test('should handle undefined key spec gracefully', async () => {
      // Arrange
      const targetWithoutKeySpec = { ...mockTargetComponent };
      delete targetWithoutKeySpec.keySpec;

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'kms-key',
        capability: 'kms:key',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, targetWithoutKeySpec, binding, bindingContext);

      // Assert
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KMS_KEY_SPEC', 'SYMMETRIC_DEFAULT');
    });

    test('should handle undefined origin gracefully', async () => {
      // Arrange
      const targetWithoutOrigin = { ...mockTargetComponent };
      delete targetWithoutOrigin.origin;

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'kms-key',
        capability: 'kms:key',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, targetWithoutOrigin, binding, bindingContext);

      // Assert
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KMS_KEY_ORIGIN', 'AWS_KMS');
    });
  });

  describe('BindToKey__FedRampCompliance__ConfiguresSecureAccess', () => {
    test('should configure automatic key rotation for FedRAMP High', async () => {
      // Arrange
      const fedrampContext = {
        ...bindingContext,
        complianceFramework: ComplianceFramework.FEDRAMP_HIGH
      };

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'kms-key',
        capability: 'kms:key',
        access: ['admin']
      };

      // Act
      await strategy.bind(mockSourceComponent, mockTargetComponent, binding, fedrampContext);

      // Assert
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KMS_AUTOMATIC_KEY_ROTATION_ENABLED', 'true');
      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'kms:EnableKeyRotation',
          'kms:DisableKeyRotation',
          'kms:GetKeyRotationStatus'
        ],
        Resource: mockTargetComponent.keyArn
      });
    });

    test('should configure multi-region keys for high availability', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'kms-key',
        capability: 'kms:key',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, mockTargetComponent, binding, bindingContext);

      // Assert
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KMS_MULTI_REGION_ENABLED', 'true');
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KMS_PRIMARY_REGION', 'us-east-1');
    });

    test('should configure FIPS endpoints for FedRAMP High', async () => {
      // Arrange
      const fedrampContext = {
        ...bindingContext,
        complianceFramework: ComplianceFramework.FEDRAMP_HIGH
      };

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'kms-key',
        capability: 'kms:key',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, mockTargetComponent, binding, fedrampContext);

      // Assert
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KMS_FIPS_ENDPOINT_ENABLED', 'true');
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KMS_ENDPOINT', 'https://kms-fips.us-east-1.amazonaws.com');
    });

    test('should configure audit logging for compliance', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'kms-key',
        capability: 'kms:key',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, mockTargetComponent, binding, bindingContext);

      // Assert
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('KMS_AUDIT_LOGGING_ENABLED', 'true');
      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents'
        ],
        Resource: `arn:aws:logs:${bindingContext.region}:${bindingContext.accountId}:log-group:/aws/kms/*`
      });
    });
  });
});
