/**
 * S3 Binder Strategy (Unified)
 * Handles object storage bindings for Amazon S3 with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy, S3CapabilityData } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class S3BinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['storage:s3', 'storage:s3-bucket', 'bucket:s3'];

  getStrategyName(): string {
    return 'S3 Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 's3-bucket',
        capability: 'storage:s3',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to S3 bucket for object storage operations',
        examples: ['lambda-api -> storage:s3 (read/write)']
      },
      {
        sourceType: '*',
        targetType: 's3-bucket',
        capability: 'storage:s3-bucket',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to S3 bucket (alias for storage:s3)',
        examples: ['lambda-api -> storage:s3-bucket (read)']
      },
      {
        sourceType: '*',
        targetType: 's3-bucket',
        capability: 'bucket:s3',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to S3 bucket (alternative alias)',
        examples: ['lambda-api -> bucket:s3 (read)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for S3 binding');
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
      throw new Error(`Invalid access types for S3 binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (access.length === 0) {
      throw new Error('Access cannot be empty for S3 binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Validate capability data structure
    if (!this.isS3CapabilityData(targetCapabilityData)) {
      throw new Error(`Invalid S3 capability data structure for capability '${capability}'`);
    }

    // Route to binding method
    return await this.bindToBucket(context, targetCapabilityData, access);
  }

  /**
   * Bind to S3 bucket
   * 
   * @param context - Binding context
   * @param targetData - Expected structure (S3CapabilityData):
   *   - type (required): 'storage:s3'
   *   - resources (required): { arn: string, name: string, region: string }
   *   - encryption (optional): { enabled: boolean, algorithm?: string, kmsKeyId?: string } - defaults to { enabled: false }
   *   - versioning (optional): { enabled: boolean } - defaults to { enabled: false }
   *   - accessLogging (optional): { enabled: boolean, targetBucket?: string }
   * @param access - Array of access levels (read, write, readwrite, admin)
   * @returns Enhanced binding result without compliance block
   */
  private async bindToBucket(
    context: BindingContext,
    targetData: S3CapabilityData,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required fields
    if (!targetData.resources?.arn) {
      throw new Error('Target component missing required resources.arn property for S3 binding');
    }
    if (!targetData.resources?.name) {
      throw new Error('Target component missing required resources.name property for S3 binding');
    }
    if (!targetData.resources?.region) {
      throw new Error('Target component missing required resources.region property for S3 binding');
    }
    // encryption and versioning are optional - default to disabled if not provided

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];
    const bucketArn = targetData.resources.arn;

    // Create IAM policies for S3 access
    await this.createS3IamPolicies(context, targetData, access, iamPolicies);

    // Generate environment variables
    this.generateEnvironmentVariables(context, targetData, environmentVariables);

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: [] // S3 uses HTTPS, no security group rules needed
    };
  }

  /**
   * Create IAM policies for S3 bucket access
   */
  private async createS3IamPolicies(
    context: BindingContext,
    targetData: S3CapabilityData,
    access: string[],
    iamPolicies: IamPolicy[]
  ): Promise<void> {
    const bucketArn = targetData.resources.arn;
    const bucketRegion = targetData.resources.region;

    // Base S3 access policy with least-privilege principle
    const s3Actions = this.getS3ActionsForAccess(access);

    const basePolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: s3Actions,
      resources: [
        bucketArn,
        `${bucketArn}/*` // Allow access to objects within the bucket
      ],
      conditions: {
        StringEquals: bucketRegion ? {
          'aws:RequestedRegion': bucketRegion
        } : undefined,
        Bool: {
          'aws:SecureTransport': 'true' // Require HTTPS
        }
      }
    });

    iamPolicies.push({
      statement: basePolicy,
      description: `S3 ${access[0]} access permissions`,
      complianceRequirement: 'Least privilege IAM access'
    });

    // S3 bucket metadata access (always required)
    const metadataPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        's3:GetBucketLocation',
        's3:ListBucket'
      ],
      resources: [bucketArn],
      conditions: {
        StringEquals: bucketRegion ? {
          'aws:RequestedRegion': bucketRegion
        } : undefined,
        Bool: {
          'aws:SecureTransport': 'true'
        }
      }
    });

    iamPolicies.push({
      statement: metadataPolicy,
      description: 'S3 bucket metadata access permissions',
      complianceRequirement: 'S3 bucket metadata'
    });

    // KMS permissions if bucket encryption uses KMS (default encryption to disabled if not provided)
    const encryption = targetData.encryption || { enabled: false };
    if (encryption.enabled && (encryption as any).kmsKeyId) {
      const kmsKeyId = (encryption as any).kmsKeyId;
      // Build KMS conditions with ViaService (always required) and optional region scoping
      // ViaService restricts KMS usage to the S3 service, providing defense-in-depth
      const kmsConditions: Record<string, any> = {
        StringEquals: {
          'kms:ViaService': `s3.${bucketRegion}.amazonaws.com`
        }
      };
      // Add region condition for additional security (bucketRegion is validated as required)
      if (bucketRegion) {
        kmsConditions.StringEquals['aws:RequestedRegion'] = bucketRegion;
      }
      
      const kmsPolicy = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'kms:Decrypt',
          'kms:GenerateDataKey',
          'kms:DescribeKey'
        ],
        resources: [kmsKeyId],
        conditions: kmsConditions
      });

      iamPolicies.push({
        statement: kmsPolicy,
        description: 'KMS permissions for S3 bucket encryption',
        complianceRequirement: 'Encryption at rest'
      });
    }

    // Access logging permissions for admin access
    // Note: s3:PutBucketLogging is required to configure access logging target
    const primaryAccess = access[0] || 'read';
    if (primaryAccess === 'admin' && targetData.accessLogging?.enabled && targetData.accessLogging.targetBucket) {
      const loggingPolicy = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:PutBucketLogging'],
        resources: [bucketArn],
        conditions: {
          StringEquals: bucketRegion ? {
            'aws:RequestedRegion': bucketRegion
          } : undefined,
          Bool: {
            'aws:SecureTransport': 'true'
          }
        }
      });

      iamPolicies.push({
        statement: loggingPolicy,
        description: 'S3 bucket access logging configuration permissions',
        complianceRequirement: 'Audit logging'
      });
    }
  }

  /**
   * Get S3 actions based on access level
   * 
   * Note on multipart upload permissions:
   * - AbortMultipartUpload and ListMultipartUploadParts are required for write operations
   *   on large objects (>5MB) which automatically use multipart uploads. Without these,
   *   large file uploads will fail.
   * 
   * Note on admin-level permissions:
   * - PutBucketPolicy, GetBucketPolicy, DeleteBucketPolicy are high-privilege actions
   *   that allow modifying bucket-level security policies. These are included by default
   *   for admin access but should be reviewed for compliance requirements.
   *   DESIGN CONSIDERATION: Future enhancement could require explicit opt-in via binding
   *   directive options (e.g., { allowBucketPolicyManagement: true }) or a separate
   *   capability (e.g., 'storage:s3-policy-admin') to provide finer-grained access control.
   * - PutBucketAcl and GetBucketAcl are included for ACL management but ACLs are generally
   *   discouraged in favor of bucket policies. Consider deprecating if ACLs are not required.
   * 
   * Future extensibility (acceptable for core scope):
   * - S3 event notifications (s3:PutBucketNotification, s3:GetBucketNotification) are not
   *   included but could be added if bucket notification configuration is needed.
   * - S3 replication permissions (s3:ReplicateObject, s3:ReplicateDelete, etc.) are not
   *   included but could be added if cross-region replication is required.
   */
  private getS3ActionsForAccess(access: string[]): string[] {
    // Handle array - typically just one access level, but handle all cases
    const primaryAccess = access[0] || 'read';
    
    switch (primaryAccess) {
      case 'read':
        return [
          's3:GetObject',
          's3:GetObjectVersion',
          's3:GetObjectAcl',
          's3:GetObjectVersionAcl'
        ];
      case 'write':
        // Includes multipart upload permissions for large object support (>5MB)
        return [
          's3:PutObject',
          's3:PutObjectAcl',
          's3:DeleteObject',
          's3:DeleteObjectVersion',
          's3:AbortMultipartUpload',
          's3:ListMultipartUploadParts'
        ];
      case 'readwrite':
        // Includes multipart upload permissions for large object support (>5MB)
        return [
          's3:GetObject',
          's3:GetObjectVersion',
          's3:GetObjectAcl',
          's3:GetObjectVersionAcl',
          's3:PutObject',
          's3:PutObjectAcl',
          's3:DeleteObject',
          's3:DeleteObjectVersion',
          's3:AbortMultipartUpload',
          's3:ListMultipartUploadParts'
        ];
      case 'admin':
        // Includes multipart upload permissions for large object support (>5MB)
        // Includes high-privilege bucket policy and ACL management actions
        return [
          's3:GetObject',
          's3:GetObjectVersion',
          's3:GetObjectAcl',
          's3:GetObjectVersionAcl',
          's3:PutObject',
          's3:PutObjectAcl',
          's3:DeleteObject',
          's3:DeleteObjectVersion',
          's3:AbortMultipartUpload',
          's3:ListMultipartUploadParts',
          's3:PutBucketAcl',
          's3:GetBucketAcl',
          's3:PutBucketPolicy',
          's3:GetBucketPolicy',
          's3:DeleteBucketPolicy'
        ];
      default:
        throw new Error(`Unsupported S3 access level: ${primaryAccess}`);
    }
  }

  /**
   * Generate environment variables for S3 bucket connection
   */
  private generateEnvironmentVariables(
    context: BindingContext,
    targetData: S3CapabilityData,
    environmentVariables: Record<string, string>
  ): void {
    // Default environment variable mappings
    const defaultMappings = {
      bucketName: 'S3_BUCKET_NAME',
      bucketArn: 'S3_BUCKET_ARN',
      region: 'S3_BUCKET_REGION'
    };

    // Use custom mappings if provided via directive.env
    const customMappings = context.directive.env || {};
    const finalMappings = { ...defaultMappings, ...customMappings };

    // Set basic bucket information
    environmentVariables[finalMappings.bucketName] = targetData.resources.name;
    environmentVariables[finalMappings.bucketArn] = targetData.resources.arn;
    environmentVariables[finalMappings.region] = targetData.resources.region;

    // Generate S3 URLs
    const s3Url = `https://s3.${targetData.resources.region}.amazonaws.com/${targetData.resources.name}`;
    environmentVariables['S3_URL'] = s3Url;
    environmentVariables['S3_BUCKET_URL'] = s3Url;

    // Set encryption information (default to disabled if not provided)
    const encryption = targetData.encryption || { enabled: false };
    if (encryption.enabled) {
      environmentVariables['S3_ENCRYPTION_ENABLED'] = 'true';
      if (encryption.algorithm) {
        environmentVariables['S3_ENCRYPTION_ALGORITHM'] = encryption.algorithm;
      }
      if ((encryption as any).kmsKeyId) {
        environmentVariables['S3_KMS_KEY_ID'] = (encryption as any).kmsKeyId;
      }
    }

    // Set versioning information (default to disabled if not provided)
    const versioning = targetData.versioning || { enabled: false };
    if (versioning.enabled) {
      environmentVariables['S3_VERSIONING_ENABLED'] = 'true';
    }

    // Set access logging information if available
    if (targetData.accessLogging?.enabled) {
      environmentVariables['S3_ACCESS_LOGGING_ENABLED'] = 'true';
      if (targetData.accessLogging.targetBucket) {
        environmentVariables['S3_ACCESS_LOGGING_TARGET_BUCKET'] = targetData.accessLogging.targetBucket;
      }
    }
  }

  /**
   * Type guard for S3 capability data
   * Note: encryption and versioning are optional and default to { enabled: false } if not provided
   */
  private isS3CapabilityData(capability: any): capability is S3CapabilityData {
    return capability &&
      typeof capability === 'object' &&
      (capability.type === 'storage:s3' || 
       capability.type === 'storage:s3-bucket' || 
       capability.type === 'bucket:s3') &&
      capability.resources &&
      typeof capability.resources === 'object' &&
      typeof capability.resources.arn === 'string' &&
      typeof capability.resources.name === 'string' &&
      typeof capability.resources.region === 'string';
    // encryption and versioning are optional - validation removed to allow defaults
  }
}

