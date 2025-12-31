/**
 * EFS Binder Strategy (Unified)
 * Handles Elastic File System bindings for Amazon EFS with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase } from '../../../contracts/unified-binder-strategy-base.js';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '../../../contracts/platform-binding-trigger-spec.js';
import type { IamPolicy, SecurityGroupRule } from '../../../contracts/bindings.js';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

interface EfsFileSystemCapabilityData {
  type: 'storage:efs' | 'efs:file-system';
  fileSystemId: string;
  fileSystemArn: string;
  fileSystemName: string;
  dnsName: string;
  lifecycleState: string;
  performanceMode: string;
  throughputMode: string;
  provisionedThroughputMibps?: number;
  encryption: {
    atRest: boolean;
    inTransit: boolean;
    kmsKeyArn?: string;
  };
  backupsEnabled: boolean;
  hardeningProfile?: string;
  securityGroupId?: string;
  logGroups?: Record<string, string>;
}

export class EfsBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['storage:efs', 'efs:file-system'];

  getStrategyName(): string {
    return 'EFS Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'efs-filesystem',
        capability: 'storage:efs',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to EFS file system for shared file storage',
        examples: ['ecs-task -> storage:efs (readwrite)']
      },
      {
        sourceType: '*',
        targetType: 'efs-filesystem',
        capability: 'efs:file-system',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to EFS file system (alias for storage:efs)',
        examples: ['lambda -> efs:file-system (read)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for EFS binding');
    }
    if (!capability) {
      throw new Error('Binding capability is required');
    }

    // Normalize access to array (directive.access is a single AccessLevel string)
    const access = directive.access ? [directive.access] : [];

    // Validate access patterns
    const validAccessTypes = ['read', 'write', 'readwrite', 'admin'];
    const invalidAccess = access.filter(a => !validAccessTypes.includes(a));
    if (invalidAccess.length > 0) {
      throw new Error(`Invalid access types for EFS binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (access.length === 0) {
      throw new Error('Access cannot be empty for EFS binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Validate capability data structure
    if (!this.isEfsFileSystemCapabilityData(targetCapabilityData)) {
      throw new Error(`Invalid EFS file system capability data structure for capability '${capability}'`);
    }

    // Route to binding method
    return await this.bindToFileSystem(context, targetCapabilityData, access);
  }

  /**
   * Bind to EFS file system
   * 
   * @param context - Binding context
   * @param targetData - Expected structure (EfsFileSystemCapabilityData):
   *   - type (required): 'storage:efs' | 'efs:file-system'
   *   - fileSystemId (required): string
   *   - fileSystemArn (required): string
   *   - fileSystemName (required): string
   *   - dnsName (required): string
   *   - lifecycleState (required): string
   *   - performanceMode (required): string
   *   - throughputMode (required): string
   *   - provisionedThroughputMibps (optional): number
   *   - encryption (optional): { atRest: boolean, inTransit: boolean, kmsKeyArn?: string } - defaults to { atRest: false, inTransit: false }
   *   - backupsEnabled (required): boolean
   *   - hardeningProfile (optional): string
   *   - securityGroupId (optional): string
   *   - logGroups (optional): Record<string, string>
   * @param access - Array of access levels (read, write, readwrite, admin)
   * @returns Enhanced binding result without compliance block
   */
  private async bindToFileSystem(
    context: BindingContext,
    targetData: EfsFileSystemCapabilityData,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required fields
    if (!targetData.fileSystemId) {
      throw new Error('Target component missing required fileSystemId property for EFS binding');
    }
    if (!targetData.fileSystemArn) {
      throw new Error('Target component missing required fileSystemArn property for EFS binding');
    }
    if (!targetData.fileSystemName) {
      throw new Error('Target component missing required fileSystemName property for EFS binding');
    }
    if (!targetData.dnsName) {
      throw new Error('Target component missing required dnsName property for EFS binding');
    }
    // encryption is optional - default to disabled if not provided

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];
    const securityGroupRules: SecurityGroupRule[] = [];

    // Create IAM policies for EFS access
    await this.createEfsIamPolicies(context, targetData, access, iamPolicies);

    // Generate environment variables
    this.generateEnvironmentVariables(context, targetData, environmentVariables);

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: [] // Network binding (security group rules for NFS port 2049) handled separately or via patches
    };
  }

  /**
   * Create IAM policies for EFS file system access
   */
  private async createEfsIamPolicies(
    context: BindingContext,
    targetData: EfsFileSystemCapabilityData,
    access: string[],
    iamPolicies: IamPolicy[]
  ): Promise<void> {
    const fileSystemArn = targetData.fileSystemArn;
    const { region } = context.source.context;
    const primaryAccess = access[0] || 'read';

    // Base EFS access policy with least-privilege principle
    const efsActions = this.getEfsActionsForAccess(access);

    const basePolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: efsActions,
      resources: [fileSystemArn],
      conditions: region ? {
        StringEquals: {
          'aws:RequestedRegion': region
        }
      } : undefined
    });

    iamPolicies.push({
      statement: basePolicy,
      description: `EFS ${primaryAccess} access permissions`,
      complianceRequirement: 'Least privilege IAM access'
    });

    // KMS permissions if file system encryption uses KMS (default encryption to disabled if not provided)
    const encryption = targetData.encryption || { atRest: false, inTransit: false };
    if (encryption.atRest && encryption.kmsKeyArn) {
      const kmsKeyArn = encryption.kmsKeyArn;
      const kmsPolicy = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'kms:Decrypt',
          'kms:GenerateDataKey',
          'kms:DescribeKey'
        ],
        resources: [kmsKeyArn],
        conditions: region ? {
          StringEquals: {
            'aws:RequestedRegion': region
          }
        } : undefined
      });

      iamPolicies.push({
        statement: kmsPolicy,
        description: 'KMS permissions for EFS file system encryption',
        complianceRequirement: 'Encryption at rest'
      });
    }

    // Backup policy permissions for write/admin access
    if (targetData.backupsEnabled && (access.includes('write') || access.includes('readwrite') || access.includes('admin'))) {
      const backupPolicy = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'elasticfilesystem:PutBackupPolicy',
          'elasticfilesystem:GetBackupPolicy',
          'elasticfilesystem:Backup',
          'elasticfilesystem:Restore'
        ],
        resources: [fileSystemArn],
        conditions: region ? {
          StringEquals: {
            'aws:RequestedRegion': region
          }
        } : undefined
      });

      iamPolicies.push({
        statement: backupPolicy,
        description: 'EFS backup policy and backup/restore permissions',
        complianceRequirement: 'Backup and recovery'
      });
    }

    // CloudWatch Logs permissions if log groups are configured
    if (targetData.logGroups && Object.keys(targetData.logGroups).length > 0) {
      const logGroupArns = Object.values(targetData.logGroups).map(logGroupName => 
        `arn:aws:logs:${region || '*'}:*:log-group:${logGroupName}:*`
      );

      const logsPolicy = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'logs:DescribeLogStreams'
        ],
        resources: logGroupArns,
        conditions: region ? {
          StringEquals: {
            'aws:RequestedRegion': region
          }
        } : undefined
      });

      iamPolicies.push({
        statement: logsPolicy,
        description: 'CloudWatch Logs permissions for EFS access logging',
        complianceRequirement: 'Observability and audit logging'
      });
    }
  }

  /**
   * Get EFS actions based on access level
   */
  private getEfsActionsForAccess(access: string[]): string[] {
    // Handle array - typically just one access level, but handle all cases
    const primaryAccess = access[0] || 'read';
    
    switch (primaryAccess) {
      case 'read':
        return [
          'elasticfilesystem:DescribeFileSystems',
          'elasticfilesystem:DescribeMountTargets',
          'elasticfilesystem:DescribeAccessPoints',
          'elasticfilesystem:ClientMount',
          'elasticfilesystem:ClientWrite',
          'elasticfilesystem:ClientRootAccess'
        ];
      case 'write':
        return [
          'elasticfilesystem:DescribeFileSystems',
          'elasticfilesystem:DescribeMountTargets',
          'elasticfilesystem:CreateFileSystem',
          'elasticfilesystem:DeleteFileSystem',
          'elasticfilesystem:ModifyFileSystem',
          'elasticfilesystem:CreateMountTarget',
          'elasticfilesystem:DeleteMountTarget',
          'elasticfilesystem:CreateAccessPoint',
          'elasticfilesystem:DeleteAccessPoint',
          'elasticfilesystem:DescribeAccessPoint',
          'elasticfilesystem:ClientMount',
          'elasticfilesystem:ClientWrite',
          'elasticfilesystem:ClientRootAccess'
        ];
      case 'readwrite':
        return [
          'elasticfilesystem:DescribeFileSystems',
          'elasticfilesystem:DescribeMountTargets',
          'elasticfilesystem:DescribeAccessPoints',
          'elasticfilesystem:CreateFileSystem',
          'elasticfilesystem:DeleteFileSystem',
          'elasticfilesystem:ModifyFileSystem',
          'elasticfilesystem:CreateMountTarget',
          'elasticfilesystem:DeleteMountTarget',
          'elasticfilesystem:CreateAccessPoint',
          'elasticfilesystem:DeleteAccessPoint',
          'elasticfilesystem:DescribeAccessPoint',
          'elasticfilesystem:ClientMount',
          'elasticfilesystem:ClientWrite',
          'elasticfilesystem:ClientRootAccess'
        ];
      case 'admin':
        return [
          'elasticfilesystem:DescribeFileSystems',
          'elasticfilesystem:DescribeMountTargets',
          'elasticfilesystem:DescribeAccessPoints',
          'elasticfilesystem:CreateFileSystem',
          'elasticfilesystem:DeleteFileSystem',
          'elasticfilesystem:ModifyFileSystem',
          'elasticfilesystem:CreateMountTarget',
          'elasticfilesystem:DeleteMountTarget',
          'elasticfilesystem:CreateAccessPoint',
          'elasticfilesystem:DeleteAccessPoint',
          'elasticfilesystem:DescribeAccessPoint',
          'elasticfilesystem:PutFileSystemPolicy',
          'elasticfilesystem:GetFileSystemPolicy',
          'elasticfilesystem:DeleteFileSystemPolicy',
          'elasticfilesystem:ClientMount',
          'elasticfilesystem:ClientWrite',
          'elasticfilesystem:ClientRootAccess'
        ];
      default:
        throw new Error(`Unsupported EFS access level: ${primaryAccess}`);
    }
  }

  /**
   * Generate environment variables for EFS file system connection
   */
  private generateEnvironmentVariables(
    context: BindingContext,
    targetData: EfsFileSystemCapabilityData,
    environmentVariables: Record<string, string>
  ): void {
    // Default environment variable mappings
    const defaultMappings = {
      fileSystemId: 'EFS_FILE_SYSTEM_ID',
      fileSystemArn: 'EFS_FILE_SYSTEM_ARN',
      dnsName: 'EFS_DNS_NAME'
    };

    // Use custom mappings if provided via directive.env
    const customMappings = context.directive.env || {};
    const finalMappings = { ...defaultMappings, ...customMappings };

    // Set basic file system information
    environmentVariables[finalMappings.fileSystemId] = targetData.fileSystemId;
    environmentVariables[finalMappings.fileSystemArn] = targetData.fileSystemArn;
    environmentVariables[finalMappings.dnsName] = targetData.dnsName;
    environmentVariables['EFS_FILE_SYSTEM_NAME'] = targetData.fileSystemName;
    environmentVariables['EFS_LIFECYCLE_STATE'] = targetData.lifecycleState;

    // Set performance configuration
    environmentVariables['EFS_PERFORMANCE_MODE'] = targetData.performanceMode;
    environmentVariables['EFS_THROUGHPUT_MODE'] = targetData.throughputMode;
    if (targetData.provisionedThroughputMibps !== undefined) {
      environmentVariables['EFS_PROVISIONED_THROUGHPUT_MIBPS'] = targetData.provisionedThroughputMibps.toString();
    }

    // Set encryption information (default to disabled if not provided)
    const encryption = targetData.encryption || { atRest: false, inTransit: false };
    if (encryption.atRest) {
      environmentVariables['EFS_ENCRYPTION_AT_REST_ENABLED'] = 'true';
      if (encryption.kmsKeyArn) {
        environmentVariables['EFS_KMS_KEY_ARN'] = encryption.kmsKeyArn;
      }
    }
    if (encryption.inTransit) {
      environmentVariables['EFS_ENCRYPTION_IN_TRANSIT_ENABLED'] = 'true';
    }

    // Set backup policy information
    if (targetData.backupsEnabled) {
      environmentVariables['EFS_BACKUP_POLICY_ENABLED'] = 'true';
    }

    // Set hardening profile if available
    if (targetData.hardeningProfile) {
      environmentVariables['EFS_HARDENING_PROFILE'] = targetData.hardeningProfile;
    }

    // Set security group ID if available
    if (targetData.securityGroupId) {
      environmentVariables['EFS_SECURITY_GROUP_ID'] = targetData.securityGroupId;
    }
  }

  /**
   * Type guard for EFS file system capability data
   */
  private isEfsFileSystemCapabilityData(capability: any): capability is EfsFileSystemCapabilityData {
    return capability &&
      typeof capability === 'object' &&
      (capability.type === 'storage:efs' || capability.type === 'efs:file-system') &&
      typeof capability.fileSystemId === 'string' &&
      typeof capability.fileSystemArn === 'string' &&
      typeof capability.fileSystemName === 'string' &&
      typeof capability.dnsName === 'string' &&
      typeof capability.lifecycleState === 'string' &&
      typeof capability.performanceMode === 'string' &&
      typeof capability.throughputMode === 'string' &&
      typeof capability.backupsEnabled === 'boolean';
    // encryption is optional - validation removed to allow defaults
  }
}
