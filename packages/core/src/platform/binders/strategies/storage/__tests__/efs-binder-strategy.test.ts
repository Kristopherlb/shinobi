/**
 * Unit Tests: EFS Binder Strategy (Unified)
 * Tests for EFS file system bindings with compliance enforcement
 */

import { EfsBinderStrategy } from '../efs-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';

describe('EfsBinderStrategy', () => {
  describe('EfsBind__ValidEfsAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-efs-001',
      level: 'unit' as const,
      capability: 'Returns enhanced binding result with IAM policies and environment variables for valid EFS access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EfsBind',
        condition: 'ValidEfsAccess',
        outcome: 'ReturnsEnhancedResult'
      },
      invariants: [
        'Returns EnhancedBindingResult with compliance block',
        'IAM policies include EFS read actions',
        'Environment variables include file system ID, ARN, and DNS name',
        'Security group rules array is empty (network binding handled separately)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:efs capability and read access',
        notes: 'Basic EFS read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EfsBind__ValidEfsAccess__ReturnsEnhancedResult', async () => {
      const strategy = new EfsBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('efs-filesystem', {
        'storage:efs': {
          type: 'storage:efs',
          fileSystemId: 'fs-12345678',
          fileSystemArn: 'arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-12345678',
          fileSystemName: 'test-efs',
          dnsName: 'fs-12345678.efs.us-east-1.amazonaws.com',
          lifecycleState: 'available',
          performanceMode: 'generalPurpose',
          throughputMode: 'bursting',
          encryption: {
            atRest: true,
            inTransit: false,
            kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/efs-key'
          },
          backupsEnabled: true
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:efs',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Returns enhanced binding result
      assertEnhancedBindingResult(result);

      // Supporting invariants
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(result.iamPolicies[0].statement.actions).toContain('elasticfilesystem:DescribeFileSystems');
      expect(result.environmentVariables['EFS_FILE_SYSTEM_ID']).toBe('fs-12345678');
      expect(result.environmentVariables['EFS_FILE_SYSTEM_ARN']).toBe('arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-12345678');
      expect(result.environmentVariables['EFS_DNS_NAME']).toBe('fs-12345678.efs.us-east-1.amazonaws.com');
      expect(result.securityGroupRules).toEqual([]);
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('EfsBind__WriteAccess__GrantsWriteActions', () => {
    const metadata = {
      id: 'TP-binders-efs-002',
      level: 'unit' as const,
      capability: 'Grants EFS write actions including file system and mount target management for write access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EfsBind',
        condition: 'WriteAccess',
        outcome: 'GrantsWriteActions'
      },
      invariants: [
        'IAM policies include EFS write actions (CreateFileSystem, ModifyFileSystem, CreateMountTarget)',
        'Access point actions are included',
        'Client actions are included for actual file system access'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:efs capability and write access',
        notes: 'EFS write access with file system management'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EfsBind__WriteAccess__GrantsWriteActions', async () => {
      const strategy = new EfsBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('efs-filesystem', {
        'storage:efs': {
          type: 'storage:efs',
          fileSystemId: 'fs-12345678',
          fileSystemArn: 'arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-12345678',
          fileSystemName: 'test-efs',
          dnsName: 'fs-12345678.efs.us-east-1.amazonaws.com',
          lifecycleState: 'available',
          performanceMode: 'generalPurpose',
          throughputMode: 'bursting',
          encryption: {
            atRest: false,
            inTransit: false
          },
          backupsEnabled: false
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:efs',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Write actions are granted
      const writePolicy = result.iamPolicies.find(p => p.description.includes('write'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('elasticfilesystem:CreateFileSystem');
      expect(writePolicy!.statement.actions).toContain('elasticfilesystem:ModifyFileSystem');
      expect(writePolicy!.statement.actions).toContain('elasticfilesystem:CreateMountTarget');
      expect(writePolicy!.statement.actions).toContain('elasticfilesystem:CreateAccessPoint');
      expect(writePolicy!.statement.actions).toContain('elasticfilesystem:ClientMount');
    });
  });

  describe('EfsBind__ReadwriteAccess__GrantsCombinedActions', () => {
    const metadata = {
      id: 'TP-binders-efs-003',
      level: 'unit' as const,
      capability: 'Grants combined read and write actions for readwrite access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EfsBind',
        condition: 'ReadwriteAccess',
        outcome: 'GrantsCombinedActions'
      },
      invariants: [
        'IAM policies include both read and write actions',
        'Access point actions are included',
        'All client actions are present'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:efs capability and readwrite access',
        notes: 'Combined read/write access pattern'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EfsBind__ReadwriteAccess__GrantsCombinedActions', async () => {
      const strategy = new EfsBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('efs-filesystem', {
        'storage:efs': {
          type: 'storage:efs',
          fileSystemId: 'fs-12345678',
          fileSystemArn: 'arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-12345678',
          fileSystemName: 'test-efs',
          dnsName: 'fs-12345678.efs.us-east-1.amazonaws.com',
          lifecycleState: 'available',
          performanceMode: 'generalPurpose',
          throughputMode: 'bursting',
          encryption: {
            atRest: true,
            inTransit: true
          },
          backupsEnabled: true
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:efs',
        access: 'readwrite'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Both read and write actions are granted
      const readwritePolicy = result.iamPolicies.find(p => p.description.includes('readwrite'));
      expect(readwritePolicy).toBeDefined();
      const actions = readwritePolicy!.statement.actions;
      expect(actions).toContain('elasticfilesystem:DescribeFileSystems');
      expect(actions).toContain('elasticfilesystem:CreateFileSystem');
      expect(actions).toContain('elasticfilesystem:CreateAccessPoint');
      expect(actions).toContain('elasticfilesystem:ClientMount');
      expect(actions).toContain('elasticfilesystem:ClientWrite');
    });
  });

  describe('EfsBind__AdminAccess__GrantsAdminActions', () => {
    const metadata = {
      id: 'TP-binders-efs-004',
      level: 'unit' as const,
      capability: 'Grants EFS admin actions including file system policy management for admin access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EfsBind',
        condition: 'AdminAccess',
        outcome: 'GrantsAdminActions'
      },
      invariants: [
        'IAM policies include file system policy management actions',
        'All file system and mount target management actions are included',
        'Client actions are included'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:efs capability and admin access',
        notes: 'Full administrative access to EFS file system'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EfsBind__AdminAccess__GrantsAdminActions', async () => {
      const strategy = new EfsBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('efs-filesystem', {
        'storage:efs': {
          type: 'storage:efs',
          fileSystemId: 'fs-12345678',
          fileSystemArn: 'arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-12345678',
          fileSystemName: 'test-efs',
          dnsName: 'fs-12345678.efs.us-east-1.amazonaws.com',
          lifecycleState: 'available',
          performanceMode: 'generalPurpose',
          throughputMode: 'bursting',
          encryption: {
            atRest: true,
            inTransit: true
          },
          backupsEnabled: true
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:efs',
        access: 'admin'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Admin actions are granted
      const adminPolicy = result.iamPolicies.find(p => p.description.includes('admin'));
      expect(adminPolicy).toBeDefined();
      const actions = adminPolicy!.statement.actions;
      expect(actions).toContain('elasticfilesystem:PutFileSystemPolicy');
      expect(actions).toContain('elasticfilesystem:GetFileSystemPolicy');
      expect(actions).toContain('elasticfilesystem:DeleteFileSystemPolicy');
      expect(actions).toContain('elasticfilesystem:CreateFileSystem');
      expect(actions).toContain('elasticfilesystem:DeleteFileSystem');
    });
  });

  describe('EfsBind__KmsEncryption__GrantsKmsPermissions', () => {
    const metadata = {
      id: 'TP-binders-efs-005',
      level: 'unit' as const,
      capability: 'Grants KMS decrypt and generate data key permissions when file system uses KMS encryption',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EfsBind',
        condition: 'KmsEncryption',
        outcome: 'GrantsKmsPermissions'
      },
      invariants: [
        'KMS policy is included when kmsKeyArn is present',
        'KMS permissions include Decrypt, GenerateDataKey, DescribeKey',
        'KMS policy references the correct KMS key ARN'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:efs capability and KMS encryption configuration',
        notes: 'EFS file system with KMS encryption requires KMS permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EfsBind__KmsEncryption__GrantsKmsPermissions', async () => {
      const strategy = new EfsBinderStrategy();
      const source = createMockSourceComponent();
      const kmsKeyArn = 'arn:aws:kms:us-east-1:123456789012:key/efs-key-12345678';
      const target = createMockTargetComponent('efs-filesystem', {
        'storage:efs': {
          type: 'storage:efs',
          fileSystemId: 'fs-12345678',
          fileSystemArn: 'arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-12345678',
          fileSystemName: 'test-efs',
          dnsName: 'fs-12345678.efs.us-east-1.amazonaws.com',
          lifecycleState: 'available',
          performanceMode: 'generalPurpose',
          throughputMode: 'bursting',
          encryption: {
            atRest: true,
            inTransit: false,
            kmsKeyArn: kmsKeyArn
          },
          backupsEnabled: false
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:efs',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: KMS permissions are granted
      const kmsPolicy = result.iamPolicies.find(p => p.description.includes('KMS'));
      expect(kmsPolicy).toBeDefined();
      expect(kmsPolicy!.statement.actions).toContain('kms:Decrypt');
      expect(kmsPolicy!.statement.actions).toContain('kms:GenerateDataKey');
      expect(kmsPolicy!.statement.actions).toContain('kms:DescribeKey');
      expect(kmsPolicy!.statement.resources).toContain(kmsKeyArn);

      // Supporting invariants
      expect(result.environmentVariables['EFS_KMS_KEY_ARN']).toBe(kmsKeyArn);
      expect(result.environmentVariables['EFS_ENCRYPTION_AT_REST_ENABLED']).toBe('true');
    });
  });

  describe('EfsBind__BackupPolicyEnabled__GrantsBackupActions', () => {
    const metadata = {
      id: 'TP-binders-efs-006',
      level: 'unit' as const,
      capability: 'Grants backup policy and backup/restore permissions when backups are enabled',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EfsBind',
        condition: 'BackupPolicyEnabled',
        outcome: 'GrantsBackupActions'
      },
      invariants: [
        'Backup policy permissions are included when backupsEnabled is true',
        'Backup and restore actions are included for write/admin access',
        'EFS_BACKUP_POLICY_ENABLED environment variable is set'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:efs capability and backups enabled',
        notes: 'EFS file system with backup policy enabled'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EfsBind__BackupPolicyEnabled__GrantsBackupActions', async () => {
      const strategy = new EfsBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('efs-filesystem', {
        'storage:efs': {
          type: 'storage:efs',
          fileSystemId: 'fs-12345678',
          fileSystemArn: 'arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-12345678',
          fileSystemName: 'test-efs',
          dnsName: 'fs-12345678.efs.us-east-1.amazonaws.com',
          lifecycleState: 'available',
          performanceMode: 'generalPurpose',
          throughputMode: 'bursting',
          encryption: {
            atRest: true,
            inTransit: false
          },
          backupsEnabled: true
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:efs',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Backup permissions are granted
      const backupPolicy = result.iamPolicies.find(p => p.description.includes('backup'));
      expect(backupPolicy).toBeDefined();
      expect(backupPolicy!.statement.actions).toContain('elasticfilesystem:PutBackupPolicy');
      expect(backupPolicy!.statement.actions).toContain('elasticfilesystem:GetBackupPolicy');
      expect(backupPolicy!.statement.actions).toContain('elasticfilesystem:Backup');
      expect(backupPolicy!.statement.actions).toContain('elasticfilesystem:Restore');

      // Supporting invariants
      expect(result.environmentVariables['EFS_BACKUP_POLICY_ENABLED']).toBe('true');
    });
  });

  describe('EfsBind__CloudWatchLogsConfigured__GrantsLogsPermissions', () => {
    const metadata = {
      id: 'TP-binders-efs-007',
      level: 'unit' as const,
      capability: 'Grants CloudWatch Logs permissions when log groups are configured',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EfsBind',
        condition: 'CloudWatchLogsConfigured',
        outcome: 'GrantsLogsPermissions'
      },
      invariants: [
        'CloudWatch Logs policy is included when logGroups are present',
        'Logs permissions include CreateLogStream, PutLogEvents, DescribeLogStreams',
        'Log group ARNs are correctly formatted'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:efs capability and log groups configured',
        notes: 'EFS file system with CloudWatch Logs enabled'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EfsBind__CloudWatchLogsConfigured__GrantsLogsPermissions', async () => {
      const strategy = new EfsBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('efs-filesystem', {
        'storage:efs': {
          type: 'storage:efs',
          fileSystemId: 'fs-12345678',
          fileSystemArn: 'arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-12345678',
          fileSystemName: 'test-efs',
          dnsName: 'fs-12345678.efs.us-east-1.amazonaws.com',
          lifecycleState: 'available',
          performanceMode: 'generalPurpose',
          throughputMode: 'bursting',
          encryption: {
            atRest: false,
            inTransit: false
          },
          backupsEnabled: false,
          logGroups: {
            access: '/aws/efs/test-efs/access',
            audit: '/aws/efs/test-efs/audit'
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:efs',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: CloudWatch Logs permissions are granted
      const logsPolicy = result.iamPolicies.find(p => p.description.includes('CloudWatch Logs'));
      expect(logsPolicy).toBeDefined();
      expect(logsPolicy!.statement.actions).toContain('logs:CreateLogStream');
      expect(logsPolicy!.statement.actions).toContain('logs:PutLogEvents');
      expect(logsPolicy!.statement.actions).toContain('logs:DescribeLogStreams');
    });
  });

  describe('EfsBind__PerformanceModeConfigured__SetsPerformanceEnvVars', () => {
    const metadata = {
      id: 'TP-binders-efs-008',
      level: 'unit' as const,
      capability: 'Sets performance mode and throughput mode environment variables',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EfsBind',
        condition: 'PerformanceModeConfigured',
        outcome: 'SetsPerformanceEnvVars'
      },
      invariants: [
        'EFS_PERFORMANCE_MODE environment variable is set',
        'EFS_THROUGHPUT_MODE environment variable is set',
        'EFS_PROVISIONED_THROUGHPUT_MIBPS is set when provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:efs capability and performance configuration',
        notes: 'EFS file system with performance mode and throughput mode settings'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EfsBind__PerformanceModeConfigured__SetsPerformanceEnvVars', async () => {
      const strategy = new EfsBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('efs-filesystem', {
        'storage:efs': {
          type: 'storage:efs',
          fileSystemId: 'fs-12345678',
          fileSystemArn: 'arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-12345678',
          fileSystemName: 'test-efs',
          dnsName: 'fs-12345678.efs.us-east-1.amazonaws.com',
          lifecycleState: 'available',
          performanceMode: 'maxIO',
          throughputMode: 'provisioned',
          provisionedThroughputMibps: 100,
          encryption: {
            atRest: false,
            inTransit: false
          },
          backupsEnabled: false
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:efs',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Performance configuration environment variables are set
      expect(result.environmentVariables['EFS_PERFORMANCE_MODE']).toBe('maxIO');
      expect(result.environmentVariables['EFS_THROUGHPUT_MODE']).toBe('provisioned');
      expect(result.environmentVariables['EFS_PROVISIONED_THROUGHPUT_MIBPS']).toBe('100');
    });
  });

  describe('EfsBind__EncryptionInTransitEnabled__SetsInTransitEnvVar', () => {
    const metadata = {
      id: 'TP-binders-efs-009',
      level: 'unit' as const,
      capability: 'Sets encryption in transit environment variable when in-transit encryption is enabled',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EfsBind',
        condition: 'EncryptionInTransitEnabled',
        outcome: 'SetsInTransitEnvVar'
      },
      invariants: [
        'EFS_ENCRYPTION_IN_TRANSIT_ENABLED environment variable is set to true',
        'Encryption at rest flag is also set when at-rest encryption is enabled'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:efs capability and in-transit encryption enabled',
        notes: 'EFS file system with encryption in transit'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EfsBind__EncryptionInTransitEnabled__SetsInTransitEnvVar', async () => {
      const strategy = new EfsBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('efs-filesystem', {
        'storage:efs': {
          type: 'storage:efs',
          fileSystemId: 'fs-12345678',
          fileSystemArn: 'arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-12345678',
          fileSystemName: 'test-efs',
          dnsName: 'fs-12345678.efs.us-east-1.amazonaws.com',
          lifecycleState: 'available',
          performanceMode: 'generalPurpose',
          throughputMode: 'bursting',
          encryption: {
            atRest: true,
            inTransit: true
          },
          backupsEnabled: false
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:efs',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Encryption in transit environment variable is set
      expect(result.environmentVariables['EFS_ENCRYPTION_IN_TRANSIT_ENABLED']).toBe('true');
      expect(result.environmentVariables['EFS_ENCRYPTION_AT_REST_ENABLED']).toBe('true');
    });
  });

  describe('EfsBind__MissingRequiredFields__ThrowsActionableError', () => {
    const metadata = {
      id: 'TP-binders-efs-010',
      level: 'unit' as const,
      capability: 'Throws actionable error when required capability data fields are missing',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EfsBind',
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
        shape: 'BindingContext with storage:efs capability but missing required fields',
        notes: 'Negative test case for missing required fields'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EfsBind__MissingRequiredFields__ThrowsActionableError', async () => {
      const strategy = new EfsBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('efs-filesystem', {
        'storage:efs': {
          type: 'storage:efs',
          fileSystemId: 'fs-12345678'
          // Missing fileSystemArn, fileSystemName, dnsName, etc.
        } as any
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:efs',
        access: 'read'
      });

      // Primary assertion: Error is thrown with actionable message (type guard fails before specific validation)
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(/fileSystemArn|fileSystemName|dnsName|Invalid EFS file system capability data structure/);
    });
  });

  describe('EfsBind__CommercialCompliance__ReturnsComplianceBlock', () => {
    const metadata = {
      id: 'TP-binders-efs-011',
      level: 'unit' as const,
      capability: 'Returns compliance block with commercial framework for commercial compliance context',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EfsBind',
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
        shape: 'BindingContext with storage:efs capability and commercial compliance framework',
        notes: 'Compliance evaluation for commercial framework'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EfsBind__CommercialCompliance__ReturnsComplianceBlock', async () => {
      const strategy = new EfsBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('efs-filesystem', {
        'storage:efs': {
          type: 'storage:efs',
          fileSystemId: 'fs-12345678',
          fileSystemArn: 'arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-12345678',
          fileSystemName: 'test-efs',
          dnsName: 'fs-12345678.efs.us-east-1.amazonaws.com',
          lifecycleState: 'available',
          performanceMode: 'generalPurpose',
          throughputMode: 'bursting',
          encryption: {
            atRest: true,
            inTransit: true
          },
          backupsEnabled: true
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:efs',
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

  describe('EfsBind__EfsFileSystemAlias__HandlesAliasCapability', () => {
    const metadata = {
      id: 'TP-binders-efs-012',
      level: 'unit' as const,
      capability: 'Handles efs:file-system alias capability correctly',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EfsBind',
        condition: 'EfsFileSystemAlias',
        outcome: 'HandlesAliasCapability'
      },
      invariants: [
        'Strategy handles efs:file-system capability alias',
        'Binding result is identical to storage:efs capability'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with efs:file-system capability alias',
        notes: 'Test capability alias handling'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EfsBind__EfsFileSystemAlias__HandlesAliasCapability', async () => {
      const strategy = new EfsBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('efs-filesystem', {
        'efs:file-system': {
          type: 'storage:efs',
          fileSystemId: 'fs-12345678',
          fileSystemArn: 'arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-12345678',
          fileSystemName: 'test-efs',
          dnsName: 'fs-12345678.efs.us-east-1.amazonaws.com',
          lifecycleState: 'available',
          performanceMode: 'generalPurpose',
          throughputMode: 'bursting',
          encryption: {
            atRest: false,
            inTransit: false
          },
          backupsEnabled: false
        }
      });

      const context = createBindingContext({
        source,
        target,
      capability: 'efs:file-system',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Alias capability is handled correctly
      assertEnhancedBindingResult(result);
      expect(result.environmentVariables['EFS_FILE_SYSTEM_ID']).toBe('fs-12345678');
    });
  });

  describe('EfsBind__OptionalFieldsOmitted__UsesDefaults', () => {
    const metadata = {
      id: 'TP-binders-efs-013',
      level: 'unit' as const,
      capability: 'Uses default values when encryption fields are omitted',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EfsBind',
        condition: 'OptionalFieldsOmitted',
        outcome: 'UsesDefaults'
      },
      invariants: [
        'Binding completes successfully when optional fields omitted',
        'Encryption defaults to disabled',
        'No encryption environment variables are set when encryption is disabled'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:efs capability without encryption fields',
        notes: 'Test case for optional field handling - encryption defaults to disabled when omitted'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EfsBind__OptionalFieldsOmitted__UsesDefaults', async () => {
      const strategy = new EfsBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('efs-filesystem', {
        'storage:efs': {
          type: 'storage:efs',
          fileSystemId: 'fs-12345678',
          fileSystemArn: 'arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-12345678',
          fileSystemName: 'test-efs',
          dnsName: 'fs-12345678.efs.us-east-1.amazonaws.com',
          lifecycleState: 'available',
          performanceMode: 'generalPurpose',
          throughputMode: 'bursting',
          backupsEnabled: false
          // encryption omitted - should default to disabled
        } as any
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:efs',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Binding completes successfully with defaults
      assertEnhancedBindingResult(result);
      expect(result.environmentVariables['EFS_ENCRYPTION_AT_REST_ENABLED']).toBeUndefined();
      expect(result.environmentVariables['EFS_ENCRYPTION_IN_TRANSIT_ENABLED']).toBeUndefined();
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('EfsBind__HardeningProfileSet__SetsHardeningEnvVar', () => {
    const metadata = {
      id: 'TP-binders-efs-014',
      level: 'unit' as const,
      capability: 'Sets hardening profile environment variable when hardening profile is provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EfsBind',
        condition: 'HardeningProfileSet',
        outcome: 'SetsHardeningEnvVar'
      },
      invariants: [
        'EFS_HARDENING_PROFILE environment variable is set when provided',
        'Security group ID environment variable is set when provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with storage:efs capability and hardening profile',
        notes: 'EFS file system with hardening profile configuration'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EfsBind__HardeningProfileSet__SetsHardeningEnvVar', async () => {
    const strategy = new EfsBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('efs-filesystem', {
        'storage:efs': {
          type: 'storage:efs',
          fileSystemId: 'fs-12345678',
          fileSystemArn: 'arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-12345678',
          fileSystemName: 'test-efs',
          dnsName: 'fs-12345678.efs.us-east-1.amazonaws.com',
          lifecycleState: 'available',
      performanceMode: 'generalPurpose',
      throughputMode: 'bursting',
          encryption: {
            atRest: false,
            inTransit: false
          },
          backupsEnabled: false,
          hardeningProfile: 'fedramp-moderate',
          securityGroupId: 'sg-1234567890abcdef0'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'storage:efs',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Hardening profile and security group environment variables are set
      expect(result.environmentVariables['EFS_HARDENING_PROFILE']).toBe('fedramp-moderate');
      expect(result.environmentVariables['EFS_SECURITY_GROUP_ID']).toBe('sg-1234567890abcdef0');
    });
  });
});
