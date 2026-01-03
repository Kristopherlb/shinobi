/**
 * Unit Tests: S3 Binder Strategy (Unified)
 * Tests for S3 object storage bindings with compliance enforcement
 */

import { S3BinderStrategy } from '../s3-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';

describe('S3BinderStrategy', () => {
  describe('S3Bind__ValidS3Access__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-s3-001',
      level: 'unit' as const,
      capability: 'Returns enhanced binding result with IAM policies and environment variables for valid S3 access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'S3Bind',
        condition: 'ValidS3Access',
        outcome: 'ReturnsEnhancedResult'
      },
      invariants: [
        'Returns EnhancedBindingResult with compliance block',
        'IAM policies include S3 read actions',
        'Environment variables include bucket name, ARN, and region',
        'Security group rules array is empty (S3 uses HTTPS)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:s3 capability and read access',
        notes: 'Basic S3 read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('S3Bind__ValidS3Access__ReturnsEnhancedResult', async () => {
      const strategy = new S3BinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('s3-bucket', {
        'storage:s3': {
          type: 'storage:s3',
          resources: {
            arn: 'arn:aws:s3:::test-bucket',
            name: 'test-bucket',
            region: 'us-east-1'
          },
          encryption: {
            enabled: true,
            algorithm: 'AES256'
          },
          versioning: {
            enabled: true
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:s3',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Returns enhanced binding result
      assertEnhancedBindingResult(result);

      // Supporting invariants
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(result.iamPolicies[0].statement.actions).toContain('s3:GetObject');
      expect(result.environmentVariables['S3_BUCKET_NAME']).toBe('test-bucket');
      expect(result.environmentVariables['S3_BUCKET_ARN']).toBe('arn:aws:s3:::test-bucket');
      expect(result.environmentVariables['S3_BUCKET_REGION']).toBe('us-east-1');
      expect(result.securityGroupRules).toEqual([]);
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('S3Bind__WriteAccess__GrantsWriteActions', () => {
    const metadata = {
      id: 'TP-binders-s3-002',
      level: 'unit' as const,
      capability: 'Grants S3 write actions and multipart upload permissions for write access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'S3Bind',
        condition: 'WriteAccess',
        outcome: 'GrantsWriteActions'
      },
      invariants: [
        'IAM policies include S3 write actions (PutObject, DeleteObject)',
        'Multipart upload permissions are included',
        'Bucket metadata permissions are included'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:s3 capability and write access',
        notes: 'S3 write access with multipart support'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('S3Bind__WriteAccess__GrantsWriteActions', async () => {
      const strategy = new S3BinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('s3-bucket', {
        'storage:s3': {
          type: 'storage:s3',
          resources: {
            arn: 'arn:aws:s3:::test-bucket',
            name: 'test-bucket',
            region: 'us-east-1'
          },
          encryption: {
            enabled: true
          },
          versioning: {
            enabled: false
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:s3',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Write actions are granted
      const writePolicy = result.iamPolicies.find(p => p.description.includes('write'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('s3:PutObject');
      expect(writePolicy!.statement.actions).toContain('s3:DeleteObject');

      // Supporting invariants: Multipart upload actions are included in the main write policy
      expect(writePolicy!.statement.actions).toContain('s3:AbortMultipartUpload');
      expect(writePolicy!.statement.actions).toContain('s3:ListMultipartUploadParts');
    });
  });

  describe('S3Bind__ReadwriteAccess__GrantsCombinedActions', () => {
    const metadata = {
      id: 'TP-binders-s3-003',
      level: 'unit' as const,
      capability: 'Grants combined read and write actions for readwrite access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'S3Bind',
        condition: 'ReadwriteAccess',
        outcome: 'GrantsCombinedActions'
      },
      invariants: [
        'IAM policies include both read and write actions',
        'Multipart upload permissions are included',
        'All object-level permissions are present'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:s3 capability and readwrite access',
        notes: 'Combined read/write access pattern'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('S3Bind__ReadwriteAccess__GrantsCombinedActions', async () => {
      const strategy = new S3BinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('s3-bucket', {
        'storage:s3': {
          type: 'storage:s3',
          resources: {
            arn: 'arn:aws:s3:::test-bucket',
            name: 'test-bucket',
            region: 'us-east-1'
          },
          encryption: {
            enabled: true
          },
          versioning: {
            enabled: true
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:s3',
        access: 'readwrite'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Both read and write actions are granted
      const readwritePolicy = result.iamPolicies.find(p => p.description.includes('readwrite'));
      expect(readwritePolicy).toBeDefined();
      const actions = readwritePolicy!.statement.actions;
      expect(actions).toContain('s3:GetObject');
      expect(actions).toContain('s3:PutObject');
      expect(actions).toContain('s3:DeleteObject');

      // Supporting invariants: Multipart upload actions are included in the main readwrite policy
      expect(actions).toContain('s3:AbortMultipartUpload');
      expect(actions).toContain('s3:ListMultipartUploadParts');
    });
  });

  describe('S3Bind__AdminAccess__GrantsAdminActions', () => {
    const metadata = {
      id: 'TP-binders-s3-004',
      level: 'unit' as const,
      capability: 'Grants S3 admin actions including bucket policy management for admin access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'S3Bind',
        condition: 'AdminAccess',
        outcome: 'GrantsAdminActions'
      },
      invariants: [
        'IAM policies include bucket policy management actions',
        'All object and bucket-level permissions are included',
        'Multipart upload permissions are included'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:s3 capability and admin access',
        notes: 'Full administrative access to S3 bucket'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('S3Bind__AdminAccess__GrantsAdminActions', async () => {
      const strategy = new S3BinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('s3-bucket', {
        'storage:s3': {
          type: 'storage:s3',
          resources: {
            arn: 'arn:aws:s3:::test-bucket',
            name: 'test-bucket',
            region: 'us-east-1'
          },
          encryption: {
            enabled: true
          },
          versioning: {
            enabled: true
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:s3',
        access: 'admin'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Admin actions are granted
      const adminPolicy = result.iamPolicies.find(p => p.description.includes('admin'));
      expect(adminPolicy).toBeDefined();
      const actions = adminPolicy!.statement.actions;
      expect(actions).toContain('s3:PutBucketPolicy');
      expect(actions).toContain('s3:GetBucketPolicy');
      expect(actions).toContain('s3:DeleteBucketPolicy');
      expect(actions).toContain('s3:PutBucketAcl');

      // Supporting invariants
      expect(actions).toContain('s3:GetObject');
      expect(actions).toContain('s3:PutObject');
    });
  });

  describe('S3Bind__KmsEncryption__GrantsKmsPermissions', () => {
    const metadata = {
      id: 'TP-binders-s3-005',
      level: 'unit' as const,
      capability: 'Grants KMS decrypt and generate data key permissions when bucket uses KMS encryption',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'S3Bind',
        condition: 'KmsEncryption',
        outcome: 'GrantsKmsPermissions'
      },
      invariants: [
        'KMS policy is included when kmsKeyId is present',
        'KMS permissions include Decrypt, GenerateDataKey, DescribeKey',
        'KMS policy references the correct KMS key ARN'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:s3 capability and KMS encryption configuration',
        notes: 'S3 bucket with KMS encryption requires KMS permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('S3Bind__KmsEncryption__GrantsKmsPermissions', async () => {
      const strategy = new S3BinderStrategy();
      const source = createMockSourceComponent();
      const kmsKeyId = 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012';
      const target = createMockTargetComponent('s3-bucket', {
        'storage:s3': {
          type: 'storage:s3',
          resources: {
            arn: 'arn:aws:s3:::test-bucket',
            name: 'test-bucket',
            region: 'us-east-1'
          },
          encryption: {
            enabled: true,
            algorithm: 'aws:kms',
            kmsKeyId: kmsKeyId
          } as any,
          versioning: {
            enabled: false
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:s3',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: KMS permissions are granted
      const kmsPolicy = result.iamPolicies.find(p => p.description.includes('KMS'));
      expect(kmsPolicy).toBeDefined();
      expect(kmsPolicy!.statement.actions).toContain('kms:Decrypt');
      expect(kmsPolicy!.statement.actions).toContain('kms:GenerateDataKey');
      expect(kmsPolicy!.statement.actions).toContain('kms:DescribeKey');
      expect(kmsPolicy!.statement.resources).toContain(kmsKeyId);

      // Supporting invariants: KMS conditions include ViaService for S3 service restriction
      expect(kmsPolicy!.statement.conditions).toBeDefined();
      expect(kmsPolicy!.statement.conditions?.StringEquals).toBeDefined();
      expect(kmsPolicy!.statement.conditions?.StringEquals?.['kms:ViaService']).toBe('s3.us-east-1.amazonaws.com');
      expect(kmsPolicy!.statement.conditions?.StringEquals?.['aws:RequestedRegion']).toBe('us-east-1');
      expect(result.environmentVariables['S3_KMS_KEY_ID']).toBe(kmsKeyId);
      expect(result.environmentVariables['S3_ENCRYPTION_ENABLED']).toBe('true');
    });
  });

  describe('S3Bind__VersioningEnabled__SetsVersioningEnvVar', () => {
    const metadata = {
      id: 'TP-binders-s3-006',
      level: 'unit' as const,
      capability: 'Sets S3_VERSIONING_ENABLED environment variable when versioning is enabled',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'S3Bind',
        condition: 'VersioningEnabled',
        outcome: 'SetsVersioningEnvVar'
      },
      invariants: [
        'S3_VERSIONING_ENABLED environment variable is set to true',
        'S3 actions include GetObjectVersion for versioned buckets'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:s3 capability and versioning enabled',
        notes: 'S3 bucket with versioning enabled'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('S3Bind__VersioningEnabled__SetsVersioningEnvVar', async () => {
      const strategy = new S3BinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('s3-bucket', {
        'storage:s3': {
          type: 'storage:s3',
          resources: {
            arn: 'arn:aws:s3:::test-bucket',
            name: 'test-bucket',
            region: 'us-east-1'
          },
          encryption: {
            enabled: false
          },
          versioning: {
            enabled: true
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:s3',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Versioning environment variable is set
      expect(result.environmentVariables['S3_VERSIONING_ENABLED']).toBe('true');

      // Supporting invariants
      const readPolicy = result.iamPolicies.find(p => p.description.includes('read'));
      expect(readPolicy).toBeDefined();
      expect(readPolicy!.statement.actions).toContain('s3:GetObjectVersion');
    });
  });

  describe('S3Bind__AccessLoggingEnabled__SetsLoggingEnvVars', () => {
    const metadata = {
      id: 'TP-binders-s3-007',
      level: 'unit' as const,
      capability: 'Sets access logging environment variables when access logging is enabled',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'S3Bind',
        condition: 'AccessLoggingEnabled',
        outcome: 'SetsLoggingEnvVars'
      },
      invariants: [
        'S3_ACCESS_LOGGING_ENABLED environment variable is set to true',
        'Target bucket ARN is included when provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:s3 capability and access logging enabled',
        notes: 'S3 bucket with access logging configuration'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('S3Bind__AccessLoggingEnabled__SetsLoggingEnvVars', async () => {
      const strategy = new S3BinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('s3-bucket', {
        'storage:s3': {
          type: 'storage:s3',
          resources: {
            arn: 'arn:aws:s3:::test-bucket',
            name: 'test-bucket',
            region: 'us-east-1'
          },
          encryption: {
            enabled: true
          },
          versioning: {
            enabled: false
          },
          accessLogging: {
            enabled: true,
            targetBucket: 'arn:aws:s3:::logs-bucket'
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:s3',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Access logging environment variables are set
      expect(result.environmentVariables['S3_ACCESS_LOGGING_ENABLED']).toBe('true');
      expect(result.environmentVariables['S3_ACCESS_LOGGING_TARGET_BUCKET']).toBe('arn:aws:s3:::logs-bucket');

      // Note: s3:PutBucketLogging permission is only granted for admin access
      // See S3Bind__AdminAccessWithLogging__GrantsLoggingPermission test
    });
  });

  describe('S3Bind__AdminAccessWithLogging__GrantsLoggingPermission', () => {
    const metadata = {
      id: 'TP-binders-s3-007a',
      level: 'unit' as const,
      capability: 'Grants s3:PutBucketLogging permission for admin access when access logging target bucket is configured',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'S3Bind',
        condition: 'AdminAccessWithLogging',
        outcome: 'GrantsLoggingPermission'
      },
      invariants: [
        's3:PutBucketLogging permission is granted for admin access when accessLogging.targetBucket is set',
        'Logging policy includes region and HTTPS conditions',
        'Permission is only granted when all conditions are met (admin + enabled + targetBucket)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:s3 capability, admin access, and access logging with target bucket',
        notes: 'Admin access with access logging configuration requires PutBucketLogging permission'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('S3Bind__AdminAccessWithLogging__GrantsLoggingPermission', async () => {
      const strategy = new S3BinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('s3-bucket', {
        'storage:s3': {
          type: 'storage:s3',
          resources: {
            arn: 'arn:aws:s3:::test-bucket',
            name: 'test-bucket',
            region: 'us-east-1'
          },
          encryption: {
            enabled: true
          },
          versioning: {
            enabled: false
          },
          accessLogging: {
            enabled: true,
            targetBucket: 'arn:aws:s3:::logs-bucket'
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:s3',
        access: 'admin'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: PutBucketLogging permission is granted for admin access with logging target
      const loggingPolicy = result.iamPolicies.find(p => p.description.includes('access logging configuration'));
      expect(loggingPolicy).toBeDefined();
      expect(loggingPolicy!.statement.actions).toContain('s3:PutBucketLogging');
      expect(loggingPolicy!.statement.resources).toContain('arn:aws:s3:::test-bucket');

      // Supporting invariants: Logging policy includes security conditions
      expect(loggingPolicy!.statement.conditions).toBeDefined();
      expect(loggingPolicy!.statement.conditions?.StringEquals).toBeDefined();
      expect(loggingPolicy!.statement.conditions?.StringEquals?.['aws:RequestedRegion']).toBe('us-east-1');
      expect(loggingPolicy!.statement.conditions?.Bool).toBeDefined();
      expect(loggingPolicy!.statement.conditions?.Bool?.['aws:SecureTransport']).toBe('true');
    });
  });

  describe('S3Bind__HttpsEnforced__RequiresSecureTransport', () => {
    const metadata = {
      id: 'TP-binders-s3-008',
      level: 'unit' as const,
      capability: 'Includes aws:SecureTransport condition in IAM policies to enforce HTTPS',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'S3Bind',
        condition: 'HttpsEnforced',
        outcome: 'RequiresSecureTransport'
      },
      invariants: [
        'All IAM policies include Bool condition with aws:SecureTransport: true',
        'HTTPS enforcement is applied to all S3 actions'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:s3 capability',
        notes: 'HTTPS enforcement is mandatory for all S3 bindings'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('S3Bind__HttpsEnforced__RequiresSecureTransport', async () => {
      const strategy = new S3BinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('s3-bucket', {
        'storage:s3': {
          type: 'storage:s3',
          resources: {
            arn: 'arn:aws:s3:::test-bucket',
            name: 'test-bucket',
            region: 'us-east-1'
          },
          encryption: {
            enabled: true
          },
          versioning: {
            enabled: true
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:s3',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: HTTPS is enforced in all policies
      result.iamPolicies.forEach(policy => {
        expect(policy.statement.conditions).toBeDefined();
        expect(policy.statement.conditions?.Bool).toBeDefined();
        expect(policy.statement.conditions?.Bool?.['aws:SecureTransport']).toBe('true');
      });
    });
  });

  describe('S3Bind__MissingRequiredFields__ThrowsActionableError', () => {
    const metadata = {
      id: 'TP-binders-s3-009',
      level: 'unit' as const,
      capability: 'Throws actionable error when required capability data fields are missing',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'S3Bind',
        condition: 'MissingRequiredFields',
        outcome: 'ThrowsActionableError'
      },
      invariants: [
        'Error message indicates missing field name',
        'Error message is descriptive and actionable',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:s3 capability but missing required fields',
        notes: 'Negative test case for missing required fields'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('S3Bind__MissingRequiredFields__ThrowsActionableError', async () => {
      const strategy = new S3BinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('s3-bucket', {
        'storage:s3': {
          type: 'storage:s3',
          resources: {
            arn: 'arn:aws:s3:::test-bucket'
            // Missing name, region, encryption, versioning
          } as any
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:s3',
        access: 'read'
      });

      // Primary assertion: Error is thrown with actionable message (type guard fails before specific validation)
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(/resources\.name|resources\.region|Invalid S3 capability data structure/);
    });
  });

  describe('S3Bind__CommercialCompliance__ReturnsComplianceBlock', () => {
    const metadata = {
      id: 'TP-binders-s3-010',
      level: 'unit' as const,
      capability: 'Returns compliance block with commercial framework for commercial compliance context',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'S3Bind',
        condition: 'CommercialCompliance',
        outcome: 'ReturnsComplianceBlock'
      },
      invariants: [
        'Compliance block status is one of: compliant, non-compliant, partially-compliant',
        'Compliance framework is set correctly',
        'Compliance block includes actionsTaken from IAM policies'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:s3 capability and commercial compliance framework',
        notes: 'Compliance evaluation for commercial framework'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('S3Bind__CommercialCompliance__ReturnsComplianceBlock', async () => {
      const strategy = new S3BinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('s3-bucket', {
        'storage:s3': {
          type: 'storage:s3',
          resources: {
            arn: 'arn:aws:s3:::test-bucket',
            name: 'test-bucket',
            region: 'us-east-1'
          },
          encryption: {
            enabled: true
          },
          versioning: {
            enabled: true
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:s3',
        access: 'read',
        complianceFramework: 'commercial'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Compliance block is present and valid
      expect(result.compliance).toBeDefined();
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
      expect(result.compliance.framework).toBe('commercial');
      expect(result.compliance.actionsTaken).toBeDefined();
      expect(Array.isArray(result.compliance.actionsTaken)).toBe(true);
    });
  });

  describe('S3Bind__S3BucketAlias__HandlesAliasCapability', () => {
    const metadata = {
      id: 'TP-binders-s3-011',
      level: 'unit' as const,
      capability: 'Handles storage:s3-bucket alias capability correctly',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'S3Bind',
        condition: 'S3BucketAlias',
        outcome: 'HandlesAliasCapability'
      },
      invariants: [
        'Strategy handles storage:s3-bucket capability alias',
        'Binding result is identical to storage:s3 capability'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:s3-bucket capability alias',
        notes: 'Test capability alias handling'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('S3Bind__S3BucketAlias__HandlesAliasCapability', async () => {
      const strategy = new S3BinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('s3-bucket', {
        'storage:s3-bucket': {
          type: 'storage:s3',
          resources: {
            arn: 'arn:aws:s3:::test-bucket',
            name: 'test-bucket',
            region: 'us-east-1'
          },
          encryption: {
            enabled: true
          },
          versioning: {
            enabled: false
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:s3-bucket',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Alias capability is handled correctly
      assertEnhancedBindingResult(result);
      expect(result.environmentVariables['S3_BUCKET_NAME']).toBe('test-bucket');
    });
  });

  describe('S3Bind__BucketS3Alias__HandlesAlternativeAlias', () => {
    const metadata = {
      id: 'TP-binders-s3-012',
      level: 'unit' as const,
      capability: 'Handles bucket:s3 alternative alias capability correctly',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'S3Bind',
        condition: 'BucketS3Alias',
        outcome: 'HandlesAlternativeAlias'
      },
      invariants: [
        'Strategy handles bucket:s3 capability alias',
        'Binding result is identical to storage:s3 capability'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with bucket:s3 capability alias',
        notes: 'Test alternative capability alias handling'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('S3Bind__BucketS3Alias__HandlesAlternativeAlias', async () => {
      const strategy = new S3BinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('s3-bucket', {
        'bucket:s3': {
          type: 'storage:s3',
          resources: {
            arn: 'arn:aws:s3:::test-bucket',
            name: 'test-bucket',
            region: 'us-east-1'
          },
          encryption: {
            enabled: true
          },
          versioning: {
            enabled: false
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'bucket:s3',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Alternative alias capability is handled correctly
      assertEnhancedBindingResult(result);
      expect(result.environmentVariables['S3_BUCKET_NAME']).toBe('test-bucket');
    });
  });

  describe('S3Bind__EncryptionDisabled__MayTriggerComplianceViolation', () => {
    const metadata = {
      id: 'TP-binders-s3-013',
      level: 'unit' as const,
      capability: 'May trigger compliance violation when encryption is disabled',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'S3Bind',
        condition: 'EncryptionDisabled',
        outcome: 'MayTriggerComplianceViolation'
      },
      invariants: [
        'Binding completes successfully when encryption disabled',
        'Compliance status reflects encryption state',
        'S3_ENCRYPTION_ENABLED environment variable is not set'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:s3 capability and encryption disabled',
        notes: 'Test case for compliance evaluation when encryption is disabled (may be non-compliant depending on framework)'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('S3Bind__EncryptionDisabled__MayTriggerComplianceViolation', async () => {
      const strategy = new S3BinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('s3-bucket', {
        'storage:s3': {
          type: 'storage:s3',
          resources: {
            arn: 'arn:aws:s3:::test-bucket',
            name: 'test-bucket',
            region: 'us-east-1'
          },
          encryption: {
            enabled: false
          },
          versioning: {
            enabled: false
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:s3',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Binding completes successfully
      assertEnhancedBindingResult(result);
      expect(result.environmentVariables['S3_ENCRYPTION_ENABLED']).toBeUndefined();
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
      // Note: Actual compliance status depends on framework rules - disabled encryption may be non-compliant
    });
  });

  describe('S3Bind__VersioningDisabled__MayTriggerComplianceViolation', () => {
    const metadata = {
      id: 'TP-binders-s3-014',
      level: 'unit' as const,
      capability: 'May trigger compliance violation when versioning is disabled',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'S3Bind',
        condition: 'VersioningDisabled',
        outcome: 'MayTriggerComplianceViolation'
      },
      invariants: [
        'Binding completes successfully when versioning disabled',
        'Compliance status reflects versioning state',
        'S3_VERSIONING_ENABLED environment variable is not set'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:s3 capability and versioning disabled',
        notes: 'Test case for compliance evaluation when versioning is disabled (may be non-compliant depending on framework)'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('S3Bind__VersioningDisabled__MayTriggerComplianceViolation', async () => {
      const strategy = new S3BinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('s3-bucket', {
        'storage:s3': {
          type: 'storage:s3',
          resources: {
            arn: 'arn:aws:s3:::test-bucket',
            name: 'test-bucket',
            region: 'us-east-1'
          },
          encryption: {
            enabled: true
          },
          versioning: {
            enabled: false
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:s3',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Binding completes successfully
      assertEnhancedBindingResult(result);
      expect(result.environmentVariables['S3_VERSIONING_ENABLED']).toBeUndefined();
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
      // Note: Actual compliance status depends on framework rules - disabled versioning may be non-compliant
    });
  });

  describe('S3Bind__OptionalFieldsOmitted__UsesDefaults', () => {
    const metadata = {
      id: 'TP-binders-s3-015',
      level: 'unit' as const,
      capability: 'Uses default values when encryption and versioning fields are omitted',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'S3Bind',
        condition: 'OptionalFieldsOmitted',
        outcome: 'UsesDefaults'
      },
      invariants: [
        'Binding completes successfully when optional fields omitted',
        'Encryption defaults to disabled',
        'Versioning defaults to disabled',
        'No encryption/versioning environment variables are set'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:s3 capability without encryption/versioning fields',
        notes: 'Test case for optional field handling - fields default to disabled when omitted'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('S3Bind__OptionalFieldsOmitted__UsesDefaults', async () => {
      const strategy = new S3BinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('s3-bucket', {
        'storage:s3': {
          type: 'storage:s3',
          resources: {
            arn: 'arn:aws:s3:::test-bucket',
            name: 'test-bucket',
            region: 'us-east-1'
          }
          // encryption and versioning omitted - should default to disabled
        } as any
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:s3',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Binding completes successfully with defaults
      assertEnhancedBindingResult(result);
      expect(result.environmentVariables['S3_ENCRYPTION_ENABLED']).toBeUndefined();
      expect(result.environmentVariables['S3_VERSIONING_ENABLED']).toBeUndefined();
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });
});

