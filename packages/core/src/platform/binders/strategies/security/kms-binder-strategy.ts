/**
 * KMS Binder Strategy (Unified)
 * Handles Key Management Service bindings for AWS KMS with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase } from '../../../contracts/unified-binder-strategy-base.js';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '../../../contracts/platform-binding-trigger-spec.js';
import type { IamPolicy } from '../../../contracts/bindings.js';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class KmsBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['kms:key', 'kms:alias', 'kms:grant'];

  getStrategyName(): string {
    return 'KMS Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'kms:key',
        capability: 'kms:key',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to KMS key for encryption/decryption operations',
        examples: ['lambda-api -> kms:key (read/write)']
      },
      {
        sourceType: '*',
        targetType: 'kms:alias',
        capability: 'kms:alias',
        supportedAccess: ['read', 'write'],
        description: 'Bind to KMS key alias for key management',
        examples: ['lambda-api -> kms:alias (read)']
      },
      {
        sourceType: '*',
        targetType: 'kms:grant',
        capability: 'kms:grant',
        supportedAccess: ['read', 'write'],
        description: 'Bind to KMS grant for cross-account key access',
        examples: ['lambda-api -> kms:grant (read)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability, access } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for KMS binding');
    }
    if (!capability) {
      throw new Error('Binding capability is required');
    }
    if (!access || !Array.isArray(access)) {
      throw new Error('Binding access array is required');
    }

    // Validate access patterns
    const validAccessTypes = ['read', 'write', 'admin', 'encrypt', 'decrypt', 'process'];
    const invalidAccess = access.filter(a => !validAccessTypes.includes(a));
    if (invalidAccess.length > 0) {
      throw new Error(`Invalid access types for KMS binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (access.length === 0) {
      throw new Error('Access array cannot be empty for KMS binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Route to appropriate binding method
    switch (capability) {
      case 'kms:key':
        return await this.bindToKey(context, targetCapabilityData, access);
      case 'kms:alias':
        return await this.bindToAlias(context, targetCapabilityData, access);
      case 'kms:grant':
        return await this.bindToGrant(context, targetCapabilityData, access);
      default:
        throw new Error(`Unsupported KMS capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  /**
   * Bind to KMS key
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - keyArn (required): string - ARN of the KMS key
   *   - keyId (required): string - ID of the KMS key
   *   - description?: string - Key description
   *   - keyUsage?: string - Key usage (default: 'ENCRYPT_DECRYPT')
   *   - keySpec?: string - Key specification (default: 'SYMMETRIC_DEFAULT')
   *   - origin?: string - Key origin (default: 'AWS_KMS')
   *   - keyPolicy?: object - Key policy JSON (when requireSecureAccess is true)
   *   - enableKeyRotation?: boolean - Enable automatic rotation (when requireSecureAccess is true)
   *   - multiRegion?: boolean - Multi-region key flag (when requireSecureAccess is true)
   *   - primaryRegion?: string - Primary region for multi-region keys
   *   - enableFipsEndpoint?: boolean - Use FIPS endpoint (when requireSecureAccess is true)
   * @param access - Array of access levels (read, write, admin, encrypt, decrypt)
   */
  private async bindToKey(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.keyArn) {
      throw new Error('Target component missing required keyArn property for KMS key binding');
    }
    if (!targetData?.keyId) {
      throw new Error('Target component missing required keyId property for KMS key binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Grant key access permissions
    if (access.includes('read')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'kms:DescribeKey',
          'kms:GetKeyPolicy',
          'kms:ListKeys',
          'kms:ListAliases'
        ],
        resources: [targetData.keyArn]
      });
      iamPolicies.push({
        statement,
        description: 'KMS key read access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    if (access.includes('write')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'kms:CreateKey',
          'kms:DeleteKey',
          'kms:UpdateKeyDescription',
          'kms:PutKeyPolicy'
        ],
        resources: [targetData.keyArn]
      });
      iamPolicies.push({
        statement,
        description: 'KMS key write access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Grant encryption/decryption permissions
    if (access.includes('encrypt') || access.includes('decrypt')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'kms:Encrypt',
          'kms:Decrypt',
          'kms:ReEncrypt*',
          'kms:GenerateDataKey',
          'kms:GenerateDataKeyWithoutPlaintext'
        ],
        resources: [targetData.keyArn]
      });
      iamPolicies.push({
        statement,
        description: 'KMS encryption/decryption permissions',
        complianceRequirement: 'Encryption at rest and in transit'
      });
    }

    // Grant key management permissions
    if (access.includes('admin')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'kms:EnableKey',
          'kms:DisableKey',
          'kms:ScheduleKeyDeletion',
          'kms:CancelKeyDeletion',
          'kms:TagResource',
          'kms:UntagResource'
        ],
        resources: [targetData.keyArn]
      });
      iamPolicies.push({
        statement,
        description: 'KMS key administration permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Set key environment variables
    environmentVariables['KMS_KEY_ID'] = targetData.keyId;
    environmentVariables['KMS_KEY_ARN'] = targetData.keyArn;
    if (targetData.description) {
      environmentVariables['KMS_KEY_DESCRIPTION'] = targetData.description;
    }

    // Configure key metadata with safe defaults
    environmentVariables['KMS_KEY_USAGE'] = targetData.keyUsage || 'ENCRYPT_DECRYPT';
    environmentVariables['KMS_KEY_SPEC'] = targetData.keySpec || 'SYMMETRIC_DEFAULT';
    environmentVariables['KMS_KEY_ORIGIN'] = targetData.origin || 'AWS_KMS';

    // Configure secure access when requested via options/config
    if (context.directive.options?.requireSecureAccess === true) {
      const secureConfig = await this.buildSecureKeyAccessConfig(context, targetData);
      Object.assign(environmentVariables, secureConfig.environmentVariables);
      iamPolicies.push(...secureConfig.iamPolicies);
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to KMS key alias
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - aliasArn (required): string - ARN of the alias
   *   - aliasName?: string - Alias name
   *   - targetKeyId?: string - Target key ID the alias points to
   * @param access - Array of access levels (read, write)
   */
  private async bindToAlias(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!targetData?.aliasArn) {
      throw new Error('Target component missing required aliasArn property for KMS alias binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Grant alias access permissions
    if (access.includes('read')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'kms:ListAliases',
          'kms:DescribeKey'
        ],
        resources: [targetData.aliasArn]
      });
      iamPolicies.push({
        statement,
        description: 'KMS alias read access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    if (access.includes('write')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'kms:CreateAlias',
          'kms:DeleteAlias',
          'kms:UpdateAlias'
        ],
        resources: [targetData.aliasArn]
      });
      iamPolicies.push({
        statement,
        description: 'KMS alias write access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Set alias environment variables
    if (targetData.aliasName) {
      environmentVariables['KMS_ALIAS_NAME'] = targetData.aliasName;
    }
    if (targetData.aliasArn) {
      environmentVariables['KMS_ALIAS_ARN'] = targetData.aliasArn;
    }
    if (targetData.targetKeyId) {
      environmentVariables['KMS_ALIAS_TARGET_KEY_ID'] = targetData.targetKeyId;
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to KMS grant
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - keyArn (required): string - ARN of the KMS key
   *   - grantId?: string - Grant ID
   *   - grantToken?: string - Grant token
   *   - granteePrincipal?: string - Principal receiving the grant
   *   - operations?: string[] - Array of allowed operations
   * @param access - Array of access levels (read, write)
   */
  private async bindToGrant(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!targetData?.keyArn) {
      throw new Error('Target component missing required keyArn property for KMS grant binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Grant grant access permissions
    if (access.includes('read')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'kms:ListGrants',
          'kms:DescribeKey'
        ],
        resources: [targetData.keyArn]
      });
      iamPolicies.push({
        statement,
        description: 'KMS grant read access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    if (access.includes('write')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'kms:CreateGrant',
          'kms:RetireGrant',
          'kms:RevokeGrant'
        ],
        resources: [targetData.keyArn]
      });
      iamPolicies.push({
        statement,
        description: 'KMS grant write access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Set grant environment variables with safe handling
    if (targetData.grantId) {
      environmentVariables['KMS_GRANT_ID'] = targetData.grantId;
    }
    if (targetData.grantToken) {
      environmentVariables['KMS_GRANT_TOKEN'] = targetData.grantToken;
    }
    if (targetData.granteePrincipal) {
      environmentVariables['KMS_GRANT_GRANTEE_PRINCIPAL'] = targetData.granteePrincipal;
    }

    // Safe array handling for operations
    const operations = targetData.operations;
    if (operations && Array.isArray(operations)) {
      environmentVariables['KMS_GRANT_OPERATIONS'] = operations.join(',');
    } else {
      environmentVariables['KMS_GRANT_OPERATIONS'] = '';
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Build secure access configuration for KMS key
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - keyArn: string - ARN of the KMS key
   *   - keyPolicy?: object - Key policy JSON
   *   - enableKeyRotation?: boolean - Enable automatic key rotation
   *   - multiRegion?: boolean - Multi-region key flag
   *   - primaryRegion?: string - Primary region for multi-region keys
   *   - enableFipsEndpoint?: boolean - Use FIPS endpoint
   * @returns Secure access configuration with environment variables and IAM policies
   */
  private async buildSecureKeyAccessConfig(
    context: BindingContext,
    targetData: any
  ): Promise<{ environmentVariables: Record<string, string>; iamPolicies: IamPolicy[] }> {
    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Configure key policy for access control
    if (targetData.keyPolicy) {
      environmentVariables['KMS_KEY_POLICY'] = JSON.stringify(targetData.keyPolicy);
    }

    // Configure automatic key rotation when requested
    if (targetData.enableKeyRotation === true) {
      environmentVariables['KMS_AUTOMATIC_KEY_ROTATION_ENABLED'] = 'true';
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['kms:EnableKeyRotation', 'kms:DisableKeyRotation', 'kms:GetKeyRotationStatus'],
        resources: [targetData.keyArn]
      });
      iamPolicies.push({
        statement,
        description: 'KMS key rotation permissions',
        complianceRequirement: 'Automatic key rotation'
      });
    }

    // Configure multi-region keys for high availability
    if (targetData.multiRegion) {
      environmentVariables['KMS_MULTI_REGION_ENABLED'] = 'true';
      const region = context.environment || 'us-east-1';
      environmentVariables['KMS_PRIMARY_REGION'] = targetData.primaryRegion || region;
    }

    // Configure audit logging
    environmentVariables['KMS_AUDIT_LOGGING_ENABLED'] = 'true';

    // Grant CloudTrail permissions for audit logging (requires region/account from context)
    // Note: In real implementation, region/account would come from context properly
    const region = context.environment || 'us-east-1';
    const statement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: [`arn:aws:logs:${region}:*:log-group:/aws/kms/*`]
    });
    iamPolicies.push({
      statement,
      description: 'CloudTrail permissions for KMS audit logging',
      complianceRequirement: 'Audit logging and compliance'
    });

    // Configure FIPS endpoints when requested
    if (targetData.enableFipsEndpoint === true) {
      environmentVariables['KMS_FIPS_ENDPOINT_ENABLED'] = 'true';
      environmentVariables['KMS_ENDPOINT'] = `https://kms-fips.${region}.amazonaws.com`;
    }

    return { environmentVariables, iamPolicies };
  }
}