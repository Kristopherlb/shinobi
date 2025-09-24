/**
 * DynamoDB Binder Strategy
 * Handles NoSQL database bindings for Amazon DynamoDB
 */

import { IBinderStrategy } from '../binder-strategy';
import { BindingContext } from '../../binding-context';
import { ComponentBinding } from '../../component-binding';
// Compliance framework branching removed; use binding.options/config instead

export class DynamoDbBinderStrategy implements IBinderStrategy {
  readonly supportedCapabilities = ['dynamodb:table', 'dynamodb:index', 'dynamodb:stream'];

  async bind(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    // Validate inputs
    if (!targetComponent) {
      throw new Error('Target component is required for DynamoDB table binding');
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
    const validAccessTypes = ['read', 'write', 'admin', 'encrypt', 'decrypt', 'backup', 'process'];
    const invalidAccess = binding.access.filter(a => !validAccessTypes.includes(a));
    if (invalidAccess.length > 0) {
      throw new Error(`Invalid access types for DynamoDB table binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (binding.access.length === 0) {
      throw new Error('Access array cannot be empty for DynamoDB table binding');
    }

    const { capability, access } = binding;

    switch (capability) {
      case 'dynamodb:table':
        await this.bindToTable(sourceComponent, targetComponent, binding, context);
        break;
      case 'dynamodb:index':
        await this.bindToIndex(sourceComponent, targetComponent, binding, context);
        break;
      case 'dynamodb:stream':
        await this.bindToStream(sourceComponent, targetComponent, binding, context);
        break;
      default:
        throw new Error(`Unsupported DynamoDB capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  private async bindToTable(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    // Validate required target component properties
    if (!targetComponent?.tableArn) {
      throw new Error('Target component missing required tableArn property for DynamoDB table binding');
    }
    if (!targetComponent?.tableName) {
      throw new Error('Target component missing required tableName property for DynamoDB table binding');
    }

    const { access } = binding;

    // Grant table access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'dynamodb:GetItem',
          'dynamodb:BatchGetItem',
          'dynamodb:Query',
          'dynamodb:Scan',
          'dynamodb:DescribeTable',
          'dynamodb:ListTables'
        ],
        Resource: [
          targetComponent.tableArn,
          `${targetComponent.tableArn}/index/*`
        ]
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'dynamodb:PutItem',
          'dynamodb:BatchWriteItem',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteItem',
          'dynamodb:CreateTable',
          'dynamodb:UpdateTable',
          'dynamodb:DeleteTable'
        ],
        Resource: [
          targetComponent.tableArn,
          `${targetComponent.tableArn}/index/*`
        ]
      });
    }

    // Grant backup and restore permissions
    if (access.includes('backup')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'dynamodb:CreateBackup',
          'dynamodb:DeleteBackup',
          'dynamodb:DescribeBackup',
          'dynamodb:ListBackups',
          'dynamodb:RestoreTableFromBackup',
          'dynamodb:RestoreTableToPointInTime'
        ],
        Resource: [
          targetComponent.tableArn,
          `arn:aws:dynamodb:${context.region}:${context.accountId}:table/${targetComponent.tableName}/backup/*`
        ]
      });
    }

    // Inject table environment variables
    sourceComponent.addEnvironment('DYNAMODB_TABLE_NAME', targetComponent.tableName);
    sourceComponent.addEnvironment('DYNAMODB_TABLE_ARN', targetComponent.tableArn);
    if (targetComponent?.tableStatus) {
      sourceComponent.addEnvironment('DYNAMODB_TABLE_STATUS', targetComponent.tableStatus);
    }
    sourceComponent.addEnvironment('DYNAMODB_REGION', context.region);

    // Configure table metadata
    if (targetComponent?.keySchema) {
      sourceComponent.addEnvironment('DYNAMODB_KEY_SCHEMA', JSON.stringify(targetComponent.keySchema));
    }

    if (targetComponent?.attributeDefinitions) {
      sourceComponent.addEnvironment('DYNAMODB_ATTRIBUTE_DEFINITIONS', JSON.stringify(targetComponent.attributeDefinitions));
    }

    // Configure billing mode
    sourceComponent.addEnvironment('DYNAMODB_BILLING_MODE', targetComponent.billingMode || 'PAY_PER_REQUEST');

    // Configure secure access when requested via options/config
    if (binding.options?.requireSecureAccess === true) {
      await this.configureSecureTableAccess(sourceComponent, targetComponent, context, binding);
    }
  }

  private async bindToIndex(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant index access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'dynamodb:Query',
          'dynamodb:Scan',
          'dynamodb:DescribeTable'
        ],
        Resource: targetComponent.indexArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'dynamodb:CreateGlobalSecondaryIndex',
          'dynamodb:UpdateGlobalSecondaryIndex',
          'dynamodb:DeleteGlobalSecondaryIndex',
          'dynamodb:CreateLocalSecondaryIndex',
          'dynamodb:UpdateLocalSecondaryIndex',
          'dynamodb:DeleteLocalSecondaryIndex'
        ],
        Resource: targetComponent.indexArn
      });
    }

    // Inject index environment variables
    sourceComponent.addEnvironment('DYNAMODB_INDEX_NAME', targetComponent.indexName);
    sourceComponent.addEnvironment('DYNAMODB_INDEX_ARN', targetComponent.indexArn);
    sourceComponent.addEnvironment('DYNAMODB_INDEX_STATUS', targetComponent.indexStatus);
    sourceComponent.addEnvironment('DYNAMODB_INDEX_TYPE', targetComponent.indexType);

    // Configure index metadata
    if (targetComponent.keySchema) {
      sourceComponent.addEnvironment('DYNAMODB_INDEX_KEY_SCHEMA', JSON.stringify(targetComponent.keySchema));
    }

    if (targetComponent.projection) {
      sourceComponent.addEnvironment('DYNAMODB_INDEX_PROJECTION', JSON.stringify(targetComponent.projection));
    }
  }

  private async bindToStream(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant stream access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'dynamodb:DescribeStream',
          'dynamodb:GetRecords',
          'dynamodb:GetShardIterator',
          'dynamodb:ListStreams'
        ],
        Resource: targetComponent.streamArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'dynamodb:UpdateTable',
          'dynamodb:EnableStreaming',
          'dynamodb:DisableStreaming'
        ],
        Resource: targetComponent.streamArn
      });
    }

    // Grant Lambda permissions for stream processing
    if (access.includes('process')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'lambda:InvokeFunction'
        ],
        Resource: sourceComponent.functionArn
      });
    }

    // Inject stream environment variables
    sourceComponent.addEnvironment('DYNAMODB_STREAM_ARN', targetComponent.streamArn);
    sourceComponent.addEnvironment('DYNAMODB_STREAM_LABEL', targetComponent.streamLabel);
    sourceComponent.addEnvironment('DYNAMODB_STREAM_VIEW_TYPE', targetComponent.streamViewType);

    // Configure stream processing
    if (targetComponent.lambdaTriggerArn) {
      sourceComponent.addEnvironment('DYNAMODB_LAMBDA_TRIGGER_ARN', targetComponent.lambdaTriggerArn);
      sourceComponent.addEnvironment('DYNAMODB_LAMBDA_TRIGGER_ENABLED', 'true');
    }
  }

  private async configureSecureTableAccess(
    sourceComponent: any,
    targetComponent: any,
    context: BindingContext,
    binding?: ComponentBinding
  ): Promise<void> {
    // Configure encryption at rest
    if (targetComponent.sseSpecification?.sseEnabled) {
      sourceComponent.addEnvironment('DYNAMODB_SSE_ENABLED', 'true');
      sourceComponent.addEnvironment('DYNAMODB_SSE_TYPE', targetComponent.sseSpecification.sseType);

      if (targetComponent.sseSpecification.kmsMasterKeyId) {
        sourceComponent.addEnvironment('DYNAMODB_KMS_KEY_ID', targetComponent.sseSpecification.kmsMasterKeyId);

        // Grant KMS permissions
        sourceComponent.addToRolePolicy({
          Effect: 'Allow',
          Action: [
            'kms:Decrypt',
            'kms:GenerateDataKey'
          ],
          Resource: targetComponent.sseSpecification.kmsMasterKeyId
        });
      }
    }

    // Configure point-in-time recovery for compliance
    if (targetComponent.pointInTimeRecoverySpecification?.pointInTimeRecoveryEnabled) {
      sourceComponent.addEnvironment('DYNAMODB_PITR_ENABLED', 'true');
    }

    // Configure backup retention when specified via options or target policy
    if ((binding?.options && binding.options.backupRetentionDays !== undefined) || targetComponent.backupPolicy) {
      const retention = (binding?.options?.backupRetentionDays ?? 7).toString();
      sourceComponent.addEnvironment('DYNAMODB_BACKUP_RETENTION_DAYS', retention);
    }

    // Configure global tables for high availability
    if (targetComponent.globalTableVersion) {
      sourceComponent.addEnvironment('DYNAMODB_GLOBAL_TABLE_VERSION', targetComponent.globalTableVersion);

      // Grant global table permissions
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'dynamodb:DescribeGlobalTable',
          'dynamodb:DescribeGlobalTableSettings',
          'dynamodb:UpdateGlobalTable',
          'dynamodb:UpdateGlobalTableSettings'
        ],
        Resource: targetComponent.tableArn
      });
    }

    // Configure VPC endpoints for private access when requested
    if (binding?.options?.enableVpcEndpoint === true) {
      sourceComponent.addEnvironment('DYNAMODB_VPC_ENDPOINT_ENABLED', 'true');
    }
  }
}
