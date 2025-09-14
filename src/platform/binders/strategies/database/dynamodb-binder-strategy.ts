/**
 * DynamoDB Binder Strategy
 * Handles NoSQL database bindings for Amazon DynamoDB
 */

import { IBinderStrategy } from '../binder-strategy';
import { BindingContext } from '../../binding-context';
import { ComponentBinding } from '../../component-binding';
import { ComplianceFramework } from '../../../compliance/compliance-framework';

export class DynamoDbBinderStrategy implements IBinderStrategy {
  readonly supportedCapabilities = ['dynamodb:table', 'dynamodb:index', 'dynamodb:stream'];

  async bind(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
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
        throw new Error(`Unsupported DynamoDB capability: ${capability}`);
    }
  }

  private async bindToTable(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
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
    sourceComponent.addEnvironment('DYNAMODB_TABLE_STATUS', targetComponent.tableStatus);
    sourceComponent.addEnvironment('DYNAMODB_REGION', context.region);

    // Configure table metadata
    if (targetComponent.keySchema) {
      sourceComponent.addEnvironment('DYNAMODB_KEY_SCHEMA', JSON.stringify(targetComponent.keySchema));
    }

    if (targetComponent.attributeDefinitions) {
      sourceComponent.addEnvironment('DYNAMODB_ATTRIBUTE_DEFINITIONS', JSON.stringify(targetComponent.attributeDefinitions));
    }

    // Configure billing mode
    sourceComponent.addEnvironment('DYNAMODB_BILLING_MODE', targetComponent.billingMode || 'PAY_PER_REQUEST');

    // Configure secure access for FedRAMP environments
    if (context.complianceFramework === ComplianceFramework.FEDRAMP_MODERATE ||
      context.complianceFramework === ComplianceFramework.FEDRAMP_HIGH) {
      await this.configureSecureTableAccess(sourceComponent, targetComponent, context);
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
    context: BindingContext
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

    // Configure backup retention for compliance
    if (targetComponent.backupPolicy) {
      sourceComponent.addEnvironment('DYNAMODB_BACKUP_RETENTION_DAYS',
        context.complianceFramework === ComplianceFramework.FEDRAMP_HIGH ? '30' : '7');
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

    // Configure VPC endpoints for private access in FedRAMP High
    if (context.complianceFramework === ComplianceFramework.FEDRAMP_HIGH) {
      sourceComponent.addEnvironment('DYNAMODB_VPC_ENDPOINT_ENABLED', 'true');
    }
  }
}
