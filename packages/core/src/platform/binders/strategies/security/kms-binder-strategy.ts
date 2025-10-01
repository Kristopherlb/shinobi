/**
 * KMS Binder Strategy
 * Handles Key Management Service bindings for AWS KMS
 */

import { IBinderStrategy } from '../binder-strategy.js';
import { BindingContext } from '../../binding-context.js';
import { ComponentBinding } from '../../component-binding.js';
// Compliance framework branching removed; use binding.options/config instead

export class KmsBinderStrategy implements IBinderStrategy {
  readonly supportedCapabilities = ['kms:key', 'kms:alias', 'kms:grant'];

  async bind(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    // Validate inputs
    if (!targetComponent) {
      throw new Error('Target component is required for KMS key binding');
    }
    if (!binding?.capability) {
      throw new Error('Binding capability is required');
    }
    if (!binding?.access || !Array.isArray(binding.access)) {
      throw new Error('Binding access array is required');
    }
    if (!context?.region || !context?.accountId) {
      throw new Error('Missing required context properties for ARN construction: region, accountId');
    }

    // Validate access patterns
    const validAccessTypes = ['read', 'write', 'admin', 'encrypt', 'decrypt', 'process'];
    const invalidAccess = binding.access.filter(a => !validAccessTypes.includes(a));
    if (invalidAccess.length > 0) {
      throw new Error(`Invalid access types for KMS key binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (binding.access.length === 0) {
      throw new Error('Access array cannot be empty for KMS key binding');
    }

    const { capability, access } = binding;

    switch (capability) {
      case 'kms:key':
        await this.bindToKey(sourceComponent, targetComponent, binding, context);
        break;
      case 'kms:alias':
        await this.bindToAlias(sourceComponent, targetComponent, binding, context);
        break;
      case 'kms:grant':
        await this.bindToGrant(sourceComponent, targetComponent, binding, context);
        break;
      default:
        throw new Error(`Unsupported KMS capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  private async bindToKey(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    // Validate required target component properties
    if (!targetComponent?.keyArn) {
      throw new Error('Target component missing required keyArn property for KMS key binding');
    }
    if (!targetComponent?.keyId) {
      throw new Error('Target component missing required keyId property for KMS key binding');
    }

    const { access } = binding;

    // Grant key access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'kms:DescribeKey',
          'kms:GetKeyPolicy',
          'kms:ListKeys',
          'kms:ListAliases'
        ],
        Resource: targetComponent.keyArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'kms:CreateKey',
          'kms:DeleteKey',
          'kms:UpdateKeyDescription',
          'kms:PutKeyPolicy'
        ],
        Resource: targetComponent.keyArn
      });
    }

    // Grant encryption/decryption permissions
    if (access.includes('encrypt') || access.includes('decrypt')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'kms:Encrypt',
          'kms:Decrypt',
          'kms:ReEncrypt*',
          'kms:GenerateDataKey',
          'kms:GenerateDataKeyWithoutPlaintext'
        ],
        Resource: targetComponent.keyArn
      });
    }

    // Grant key management permissions
    if (access.includes('admin')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'kms:EnableKey',
          'kms:DisableKey',
          'kms:ScheduleKeyDeletion',
          'kms:CancelKeyDeletion',
          'kms:TagResource',
          'kms:UntagResource'
        ],
        Resource: targetComponent.keyArn
      });
    }

    // Inject key environment variables
    sourceComponent.addEnvironment('KMS_KEY_ID', targetComponent.keyId);
    sourceComponent.addEnvironment('KMS_KEY_ARN', targetComponent.keyArn);
    if (targetComponent?.description) {
      sourceComponent.addEnvironment('KMS_KEY_DESCRIPTION', targetComponent.description);
    }

    // Configure key metadata with safe defaults
    sourceComponent.addEnvironment('KMS_KEY_USAGE', targetComponent.keyUsage || 'ENCRYPT_DECRYPT');
    sourceComponent.addEnvironment('KMS_KEY_SPEC', targetComponent.keySpec || 'SYMMETRIC_DEFAULT');
    sourceComponent.addEnvironment('KMS_KEY_ORIGIN', targetComponent.origin || 'AWS_KMS');

    // Configure secure access when requested via options/config
    if (binding.options?.requireSecureAccess === true) {
      await this.configureSecureKeyAccess(sourceComponent, targetComponent, context);
    }
  }

  private async bindToAlias(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant alias access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'kms:ListAliases',
          'kms:DescribeKey'
        ],
        Resource: targetComponent.aliasArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'kms:CreateAlias',
          'kms:DeleteAlias',
          'kms:UpdateAlias'
        ],
        Resource: targetComponent.aliasArn
      });
    }

    // Inject alias environment variables
    sourceComponent.addEnvironment('KMS_ALIAS_NAME', targetComponent.aliasName);
    sourceComponent.addEnvironment('KMS_ALIAS_ARN', targetComponent.aliasArn);
    sourceComponent.addEnvironment('KMS_ALIAS_TARGET_KEY_ID', targetComponent.targetKeyId);
  }

  private async bindToGrant(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    // Validate required target component properties
    if (!targetComponent?.keyArn) {
      throw new Error('Target component missing required keyArn property for KMS grant binding');
    }

    const { access } = binding;

    // Grant grant access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'kms:ListGrants',
          'kms:DescribeKey'
        ],
        Resource: targetComponent.keyArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'kms:CreateGrant',
          'kms:RetireGrant',
          'kms:RevokeGrant'
        ],
        Resource: targetComponent.keyArn
      });
    }

    // Inject grant environment variables with safe array handling
    if (targetComponent?.grantId) {
      sourceComponent.addEnvironment('KMS_GRANT_ID', targetComponent.grantId);
    }
    if (targetComponent?.grantToken) {
      sourceComponent.addEnvironment('KMS_GRANT_TOKEN', targetComponent.grantToken);
    }
    if (targetComponent?.granteePrincipal) {
      sourceComponent.addEnvironment('KMS_GRANT_GRANTEE_PRINCIPAL', targetComponent.granteePrincipal);
    }

    // Safe array handling for operations
    const operations = targetComponent?.operations;
    if (operations && Array.isArray(operations)) {
      sourceComponent.addEnvironment('KMS_GRANT_OPERATIONS', operations.join(','));
    } else {
      sourceComponent.addEnvironment('KMS_GRANT_OPERATIONS', '');
    }
  }

  private async configureSecureKeyAccess(
    sourceComponent: any,
    targetComponent: any,
    context: BindingContext
  ): Promise<void> {
    // Configure key policy for access control
    if (targetComponent.keyPolicy) {
      sourceComponent.addEnvironment('KMS_KEY_POLICY', JSON.stringify(targetComponent.keyPolicy));
    }

    // Configure automatic key rotation when requested
    if ((targetComponent as any)?.enableKeyRotation === true) {
      sourceComponent.addEnvironment('KMS_AUTOMATIC_KEY_ROTATION_ENABLED', 'true');
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: ['kms:EnableKeyRotation', 'kms:DisableKeyRotation', 'kms:GetKeyRotationStatus'],
        Resource: targetComponent.keyArn
      });
    }

    // Configure multi-region keys for high availability
    if (targetComponent.multiRegion) {
      sourceComponent.addEnvironment('KMS_MULTI_REGION_ENABLED', 'true');
      sourceComponent.addEnvironment('KMS_PRIMARY_REGION', targetComponent.primaryRegion || context.region);
    }

    // Configure audit logging
    sourceComponent.addEnvironment('KMS_AUDIT_LOGGING_ENABLED', 'true');

    // Grant CloudTrail permissions for audit logging
    sourceComponent.addToRolePolicy({
      Effect: 'Allow',
      Action: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      Resource: `arn:aws:logs:${context.region}:${context.accountId}:log-group:/aws/kms/*`
    });

    // Configure FIPS endpoints when requested
    if ((targetComponent as any)?.enableFipsEndpoint === true) {
      sourceComponent.addEnvironment('KMS_FIPS_ENDPOINT_ENABLED', 'true');
      sourceComponent.addEnvironment('KMS_ENDPOINT', `https://kms-fips.${context.region}.amazonaws.com`);
    }
  }
}
