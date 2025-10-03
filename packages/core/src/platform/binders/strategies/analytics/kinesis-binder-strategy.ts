/**
 * Kinesis Binder Strategy
 * Handles real-time data streaming bindings for Amazon Kinesis
 */

import { IBinderStrategy } from '../binder-strategy.ts';
import { BindingContext } from '../../binding-context.ts';
import { ComponentBinding } from '../../component-binding.ts';

export class KinesisBinderStrategy implements IBinderStrategy {
  readonly supportedCapabilities = ['kinesis:stream', 'kinesis:analytics', 'kinesis:firehose'];

  async bind(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { capability, access } = binding;

    switch (capability) {
      case 'kinesis:stream':
        await this.bindToStream(sourceComponent, targetComponent, binding, context);
        break;
      case 'kinesis:analytics':
        await this.bindToAnalytics(sourceComponent, targetComponent, binding, context);
        break;
      case 'kinesis:firehose':
        await this.bindToFirehose(sourceComponent, targetComponent, binding, context);
        break;
      default:
        throw new Error(`Unsupported Kinesis capability: ${capability}`);
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
          'kinesis:DescribeStream',
          'kinesis:DescribeStreamSummary',
          'kinesis:ListStreams',
          'kinesis:GetRecords',
          'kinesis:GetShardIterator',
          'kinesis:ListShards'
        ],
        Resource: targetComponent.streamArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'kinesis:CreateStream',
          'kinesis:DeleteStream',
          'kinesis:UpdateShardCount',
          'kinesis:PutRecord',
          'kinesis:PutRecords'
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
    sourceComponent.addEnvironment('KINESIS_STREAM_NAME', targetComponent.streamName);
    sourceComponent.addEnvironment('KINESIS_STREAM_ARN', targetComponent.streamArn);
    sourceComponent.addEnvironment('KINESIS_STREAM_STATUS', targetComponent.streamStatus);
    sourceComponent.addEnvironment('KINESIS_STREAM_SHARD_COUNT', targetComponent.shardCount.toString());
    sourceComponent.addEnvironment('KINESIS_STREAM_RETENTION_PERIOD', targetComponent.retentionPeriodHours.toString());

    // Configure stream metadata
    if (targetComponent.streamModeDetails) {
      sourceComponent.addEnvironment('KINESIS_STREAM_MODE', targetComponent.streamModeDetails.streamMode);
    }

    // Configure encryption
    if (targetComponent.encryptionType) {
      sourceComponent.addEnvironment('KINESIS_STREAM_ENCRYPTION_TYPE', targetComponent.encryptionType);

      if (targetComponent.keyId) {
        sourceComponent.addEnvironment('KINESIS_STREAM_KEY_ID', targetComponent.keyId);

        // Grant KMS permissions
        sourceComponent.addToRolePolicy({
          Effect: 'Allow',
          Action: [
            'kms:Decrypt',
            'kms:GenerateDataKey'
          ],
          Resource: targetComponent.keyId
        });
      }
    }

    // Configure secure access if requested by manifest/config
    if (binding.options?.requireSecureAccess === true) {
      await this.configureSecureStreamAccess(sourceComponent, targetComponent, binding, context);
    }
  }

  private async bindToAnalytics(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant analytics access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'kinesisanalytics:DescribeApplication',
          'kinesisanalytics:ListApplications',
          'kinesisanalytics:DescribeApplicationSnapshot',
          'kinesisanalytics:ListApplicationSnapshots'
        ],
        Resource: targetComponent.applicationArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'kinesisanalytics:CreateApplication',
          'kinesisanalytics:DeleteApplication',
          'kinesisanalytics:UpdateApplication',
          'kinesisanalytics:StartApplication',
          'kinesisanalytics:StopApplication'
        ],
        Resource: targetComponent.applicationArn
      });
    }

    // Grant CloudWatch Logs permissions
    sourceComponent.addToRolePolicy({
      Effect: 'Allow',
      Action: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      Resource: `arn:aws:logs:${context.region}:${context.accountId}:log-group:/aws/kinesisanalytics/*`
    });

    // Inject analytics environment variables
    sourceComponent.addEnvironment('KINESIS_ANALYTICS_APPLICATION_NAME', targetComponent.applicationName);
    sourceComponent.addEnvironment('KINESIS_ANALYTICS_APPLICATION_ARN', targetComponent.applicationArn);
    sourceComponent.addEnvironment('KINESIS_ANALYTICS_APPLICATION_STATUS', targetComponent.applicationStatus);

    // Configure runtime environment
    if (targetComponent.runtimeEnvironment) {
      sourceComponent.addEnvironment('KINESIS_ANALYTICS_RUNTIME_ENVIRONMENT', targetComponent.runtimeEnvironment);
    }

    // Configure SQL application
    if (targetComponent.applicationConfiguration) {
      sourceComponent.addEnvironment('KINESIS_ANALYTICS_SQL_APPLICATION',
        targetComponent.applicationConfiguration.sqlApplicationConfiguration ? 'true' : 'false');
    }
  }

  private async bindToFirehose(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant Firehose access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'firehose:DescribeDeliveryStream',
          'firehose:ListDeliveryStreams'
        ],
        Resource: targetComponent.deliveryStreamArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'firehose:CreateDeliveryStream',
          'firehose:DeleteDeliveryStream',
          'firehose:UpdateDestination',
          'firehose:PutRecord',
          'firehose:PutRecordBatch'
        ],
        Resource: targetComponent.deliveryStreamArn
      });
    }

    // Grant S3 permissions for data delivery
    if (targetComponent.s3DestinationConfiguration) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject',
          's3:GetBucketLocation'
        ],
        Resource: [
          targetComponent.s3DestinationConfiguration.bucketArn,
          `${targetComponent.s3DestinationConfiguration.bucketArn}/*`
        ]
      });
    }

    // Grant Lambda permissions for data transformation
    if (targetComponent.processingConfiguration?.processors) {
      targetComponent.processingConfiguration.processors.forEach((processor: any) => {
        if (processor.type === 'Lambda') {
          sourceComponent.addToRolePolicy({
            Effect: 'Allow',
            Action: [
              'lambda:InvokeFunction'
            ],
            Resource: processor.parameters.find((p: any) => p.parameterName === 'LambdaArn')?.parameterValue
          });
        }
      });
    }

    // Inject Firehose environment variables
    sourceComponent.addEnvironment('KINESIS_FIREHOSE_DELIVERY_STREAM_NAME', targetComponent.deliveryStreamName);
    sourceComponent.addEnvironment('KINESIS_FIREHOSE_DELIVERY_STREAM_ARN', targetComponent.deliveryStreamArn);
    sourceComponent.addEnvironment('KINESIS_FIREHOSE_DELIVERY_STREAM_STATUS', targetComponent.deliveryStreamStatus);

    // Configure destination
    if (targetComponent.deliveryStreamDestinationType) {
      sourceComponent.addEnvironment('KINESIS_FIREHOSE_DESTINATION_TYPE', targetComponent.deliveryStreamDestinationType);
    }

    // Configure secure access if requested by manifest/config
    if (binding.options?.requireSecureAccess === true) {
      await this.configureSecureFirehoseAccess(sourceComponent, targetComponent, context);
    }
  }

  private async configureSecureStreamAccess(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    // Configure enhanced monitoring
    sourceComponent.addEnvironment('KINESIS_STREAM_MONITORING_ENABLED', 'true');

    // Configure CloudWatch metrics
    sourceComponent.addToRolePolicy({
      Effect: 'Allow',
      Action: [
        'cloudwatch:PutMetricData',
        'cloudwatch:GetMetricStatistics',
        'cloudwatch:ListMetrics'
      ],
      Resource: '*'
    });

    // Optional: data retention setting
    if (binding.options?.retentionDays) {
      sourceComponent.addEnvironment('KINESIS_STREAM_RETENTION_DAYS', String(binding.options.retentionDays));
    }

    if (binding.options?.enableVpcEndpoint === true) {
      sourceComponent.addEnvironment('KINESIS_VPC_ENDPOINT_ENABLED', 'true');
    }
  }

  private async configureSecureFirehoseAccess(
    sourceComponent: any,
    targetComponent: any,
    context: BindingContext
  ): Promise<void> {
    // Configure server-side encryption for S3 destinations
    if (targetComponent.s3DestinationConfiguration?.encryptionConfiguration) {
      sourceComponent.addEnvironment('KINESIS_FIREHOSE_S3_ENCRYPTION_ENABLED', 'true');

      if (targetComponent.s3DestinationConfiguration.encryptionConfiguration.kmsEncryptionConfig) {
        sourceComponent.addEnvironment('KINESIS_FIREHOSE_S3_KMS_KEY_ARN',
          targetComponent.s3DestinationConfiguration.encryptionConfiguration.kmsEncryptionConfig.awsKMSKeyARN);

        // Grant KMS permissions
        sourceComponent.addToRolePolicy({
          Effect: 'Allow',
          Action: [
            'kms:Decrypt',
            'kms:GenerateDataKey'
          ],
          Resource: targetComponent.s3DestinationConfiguration.encryptionConfiguration.kmsEncryptionConfig.awsKMSKeyARN
        });
      }
    }

    // Configure backup if requested
    if (targetComponent.s3DestinationConfiguration?.backupConfiguration) {
      sourceComponent.addEnvironment('KINESIS_FIREHOSE_BACKUP_ENABLED', 'true');
      sourceComponent.addEnvironment('KINESIS_FIREHOSE_BACKUP_S3_BUCKET',
        targetComponent.s3DestinationConfiguration.backupConfiguration.s3BackupConfiguration.bucketARN);
    }

    // Configure data compression
    if (targetComponent.s3DestinationConfiguration?.compressionFormat) {
      sourceComponent.addEnvironment('KINESIS_FIREHOSE_COMPRESSION_FORMAT',
        targetComponent.s3DestinationConfiguration.compressionFormat);
    }
  }
}
