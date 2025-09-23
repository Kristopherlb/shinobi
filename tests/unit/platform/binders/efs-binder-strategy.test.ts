/**
 * EFS Binder Strategy Tests
 * Comprehensive tests following Platform Testing Standard
 */

/**
 * Test Metadata:
 * {
 *   "id": "TP-efs-binder-001",
 *   "level": "unit",
 *   "capability": "EFS binding strategy validation and error handling",
 *   "oracle": "exact",
 *   "invariants": ["null safety", "access pattern validation", "ARN construction safety"],
 *   "fixtures": ["deterministic clock", "seeded RNG", "mock components"],
 *   "inputs": { "shape": "EFS component properties and binding configurations", "notes": "includes null/undefined edge cases" },
 *   "risks": ["null reference errors", "ARN construction failures", "access pattern validation bypass"],
 *   "dependencies": ["EfsBinderStrategy", "BindingContext", "ComponentBinding"],
 *   "evidence": ["null safety validation", "error message quality", "access pattern coverage"],
 *   "compliance_refs": ["std://platform-testing-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EfsBinderStrategy } from '../../../../packages/core/src/platform/binders/strategies/storage/efs-binder-strategy';
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

describe('EfsBinderStrategy', () => {
  let strategy: EfsBinderStrategy;
  let mockSourceComponent: any;
  let mockTargetComponent: any;
  let mockBinding: ComponentBinding;
  let mockContext: BindingContext;

  beforeEach(() => {
    strategy = new EfsBinderStrategy();

    mockSourceComponent = {
      addToRolePolicy: jest.fn(),
      addEnvironment: jest.fn()
    };

    mockTargetComponent = {
      fileSystemId: 'fs-12345',
      fileSystemArn: 'arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-12345',
      creationToken: 'test-creation-token',
      performanceMode: 'generalPurpose',
      throughputMode: 'provisioned',
      provisionedThroughputInMibps: 100,
      encrypted: true,
      kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/test-key',
      mountTargetId: 'fsmt-12345',
      mountTargetArn: 'arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-12345/mount-target/fsmt-12345',
      subnetId: 'subnet-12345',
      securityGroups: ['sg-12345', 'sg-67890'],
      ipAddress: '10.0.1.100',
      lifecycleState: 'available'
    };

    mockBinding = {
      from: 'test-source',
      to: 'test-target',
      capability: 'efs:file-system',
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
        'efs:file-system',
        'efs:mount-target',
        'efs:access-point'
      ]);
    });
  });

  describe('Bind__NullTargetComponent__ThrowsError', () => {
    test('should throw error when target component is null', async () => {
      await expect(strategy.bind(mockSourceComponent, null, mockBinding, mockContext))
        .rejects.toThrow('Target component is required for EFS binding');
    });
  });

  describe('Bind__NullBinding__ThrowsError', () => {
    test('should throw error when binding is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, null as any, mockContext))
        .rejects.toThrow('Binding is required for EFS binding');
    });
  });

  describe('Bind__NullContext__ThrowsError', () => {
    test('should throw error when context is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, null as any))
        .rejects.toThrow('Context is required for EFS binding');
    });
  });

  describe('Bind__MissingCapability__ThrowsError', () => {
    test('should throw error when capability is missing', async () => {
      const invalidBinding = { ...mockBinding, capability: undefined as any };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Binding capability is required');
    });
  });

  describe('Bind__MissingAccess__ThrowsError', () => {
    test('should throw error when access is missing', async () => {
      const invalidBinding = { ...mockBinding, access: undefined as any };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Binding access is required');
    });
  });

  describe('Bind__InvalidCapability__ThrowsError', () => {
    test('should throw error for unsupported capability', async () => {
      const invalidBinding = { ...mockBinding, capability: 'invalid:capability' };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Unsupported EFS capability: invalid:capability');
    });
  });

  describe('Bind__EfsFileSystemCapability__ConfiguresFileSystemAccess', () => {
    test('should configure read access for file system', async () => {
      const readOnlyBinding = { ...mockBinding, access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, readOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'elasticfilesystem:DescribeFileSystems',
          'elasticfilesystem:DescribeFileSystemPolicy'
        ],
        Resource: mockTargetComponent.fileSystemArn
      });
    });

    test('should configure write access for file system', async () => {
      const writeOnlyBinding = { ...mockBinding, access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, writeOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'elasticfilesystem:CreateFileSystem',
          'elasticfilesystem:ModifyFileSystem',
          'elasticfilesystem:DeleteFileSystem'
        ],
        Resource: mockTargetComponent.fileSystemArn
      });
    });

    test('should inject file system environment variables', async () => {
      await strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EFS_FILE_SYSTEM_ID', mockTargetComponent.fileSystemId);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EFS_FILE_SYSTEM_ARN', mockTargetComponent.fileSystemArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EFS_CREATION_TOKEN', mockTargetComponent.creationToken);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EFS_PERFORMANCE_MODE', mockTargetComponent.performanceMode);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EFS_THROUGHPUT_MODE', mockTargetComponent.throughputMode);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EFS_PROVISIONED_THROUGHPUT', mockTargetComponent.provisionedThroughputInMibps.toString());
    });

    test('should configure KMS encryption when enabled', async () => {
      await strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EFS_ENCRYPTED', mockTargetComponent.encrypted.toString());
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EFS_KMS_KEY_ID', mockTargetComponent.kmsKeyId);

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

  describe('Bind__EfsMountTargetCapability__ConfiguresMountTargetAccess', () => {
    test('should configure read access for mount target', async () => {
      const mountTargetBinding = { ...mockBinding, capability: 'efs:mount-target', access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, mountTargetBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'elasticfilesystem:DescribeMountTargets'
        ],
        Resource: mockTargetComponent.mountTargetArn
      });
    });

    test('should configure write access for mount target', async () => {
      const mountTargetBinding = { ...mockBinding, capability: 'efs:mount-target', access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, mountTargetBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'elasticfilesystem:CreateMountTarget',
          'elasticfilesystem:ModifyMountTargetSecurityGroups',
          'elasticfilesystem:DeleteMountTarget'
        ],
        Resource: mockTargetComponent.mountTargetArn
      });
    });

    test('should inject mount target environment variables', async () => {
      const mountTargetBinding = { ...mockBinding, capability: 'efs:mount-target' };

      await strategy.bind(mockSourceComponent, mockTargetComponent, mountTargetBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EFS_MOUNT_TARGET_ID', mockTargetComponent.mountTargetId);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EFS_MOUNT_TARGET_ARN', mockTargetComponent.mountTargetArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EFS_SUBNET_ID', mockTargetComponent.subnetId);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EFS_SECURITY_GROUPS', mockTargetComponent.securityGroups.join(','));
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EFS_IP_ADDRESS', mockTargetComponent.ipAddress);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EFS_LIFECYCLE_STATE', mockTargetComponent.lifecycleState);
    });
  });

  describe('Bind__EfsAccessPointCapability__ConfiguresAccessPointAccess', () => {
    test('should configure read access for access point', async () => {
      const accessPointBinding = { ...mockBinding, capability: 'efs:access-point', access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, accessPointBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'elasticfilesystem:DescribeAccessPoints'
        ],
        Resource: `arn:aws:elasticfilesystem:${mockContext.region}:${mockContext.accountId}:access-point/*`
      });
    });

    test('should configure write access for access point', async () => {
      const accessPointBinding = { ...mockBinding, capability: 'efs:access-point', access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, accessPointBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'elasticfilesystem:CreateAccessPoint',
          'elasticfilesystem:DeleteAccessPoint'
        ],
        Resource: `arn:aws:elasticfilesystem:${mockContext.region}:${mockContext.accountId}:access-point/*`
      });
    });
  });

  describe('Bind__EmptyAccessArray__ThrowsError', () => {
    test('should throw error when access array is empty', async () => {
      const emptyAccessBinding = { ...mockBinding, access: [] };

      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, emptyAccessBinding, mockContext))
        .rejects.toThrow('Access array cannot be empty for EFS binding');
    });
  });

  describe('Bind__InvalidAccessType__ThrowsError', () => {
    test('should throw error for invalid access type', async () => {
      const invalidAccessBinding = { ...mockBinding, access: ['invalid'] };

      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidAccessBinding, mockContext))
        .rejects.toThrow('Invalid access types for EFS binding: invalid. Valid types: read, write, admin, mount');
    });
  });
});
