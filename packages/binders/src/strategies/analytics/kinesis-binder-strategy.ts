/**
 * Kinesis Binder Strategy (Unified)
 * Handles real-time data streaming bindings for Amazon Kinesis with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

/**
 * Kinesis Stream capability data structure
 * @property type - Capability type identifier
 * @property streamName - Stream name (required)
 * @property streamArn - Stream ARN (required)
 * @property streamStatus - Stream status (required)
 * @property shardCount - Number of shards (required)
 * @property retentionPeriodHours - Retention period in hours (required)
 * @property streamModeDetails - Stream mode details (optional)
 * @property encryptionType - Encryption type (optional)
 * @property keyId - KMS key ID for encryption (optional)
 */
interface KinesisStreamCapabilityData {
  type: 'kinesis:stream';
  streamName: string;
  streamArn: string;
  streamStatus: string;
  shardCount: number;
  retentionPeriodHours: number;
  streamModeDetails?: {
    streamMode: string;
  };
  encryptionType?: string;
  keyId?: string;
}

/**
 * Kinesis Analytics capability data structure
 * @property type - Capability type identifier
 * @property applicationName - Application name (required)
 * @property applicationArn - Application ARN (required)
 * @property applicationStatus - Application status (required)
 * @property runtimeEnvironment - Runtime environment (optional)
 * @property applicationConfiguration - Application configuration (optional)
 */
interface KinesisAnalyticsCapabilityData {
  type: 'kinesis:analytics';
  applicationName: string;
  applicationArn: string;
  applicationStatus: string;
  runtimeEnvironment?: string;
  applicationConfiguration?: {
    sqlApplicationConfiguration?: unknown;
  };
}

/**
 * Kinesis Firehose capability data structure
 * @property type - Capability type identifier
 * @property deliveryStreamName - Delivery stream name (required)
 * @property deliveryStreamArn - Delivery stream ARN (required)
 * @property deliveryStreamStatus - Delivery stream status (required)
 * @property deliveryStreamDestinationType - Destination type (optional)
 * @property s3DestinationConfiguration - S3 destination configuration (optional)
 * @property processingConfiguration - Processing configuration with processors (optional)
 */
interface KinesisFirehoseCapabilityData {
  type: 'kinesis:firehose';
  deliveryStreamName: string;
  deliveryStreamArn: string;
  deliveryStreamStatus: string;
  deliveryStreamDestinationType?: string;
  s3DestinationConfiguration?: {
    bucketArn: string;
    encryptionConfiguration?: {
      kmsEncryptionConfig?: {
        awsKMSKeyARN: string;
      };
    };
    backupConfiguration?: {
      s3BackupConfiguration?: {
        bucketARN: string;
      };
    };
    compressionFormat?: string;
  };
  processingConfiguration?: {
    processors?: Array<{
      type: string;
      parameters?: Array<{
        parameterName: string;
        parameterValue: string;
      }>;
    }>;
  };
}

/**
 * Kinesis Video Streams capability data structure
 * @property type - Capability type identifier
 * @property streamName - Stream name (required)
 * @property streamArn - Stream ARN (required)
 * @property status - Stream status (required)
 * @property dataRetentionInHours - Data retention in hours (required)
 * @property kmsKeyId - KMS key ID for encryption (optional)
 * @property mediaType - Media type (optional)
 */
interface KinesisVideoStreamsCapabilityData {
  type: 'kinesis:video-stream';
  streamName: string;
  streamArn: string;
  status: string;
  dataRetentionInHours: number;
  kmsKeyId?: string;
  mediaType?: string;
}

type KinesisCapabilityData = KinesisStreamCapabilityData | KinesisAnalyticsCapabilityData | KinesisFirehoseCapabilityData | KinesisVideoStreamsCapabilityData;

export class KinesisBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = [
    'kinesis:stream',
    'kinesis:analytics',
    'kinesis:firehose',
    'kinesis:video-stream'
  ];

  getStrategyName(): string {
    return 'Kinesis Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'kinesis-stream',
        capability: 'kinesis:stream',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Kinesis stream for real-time data streaming',
        examples: ['lambda-api -> kinesis:stream (read)', 'lambda-api -> kinesis:stream (write)']
      },
      {
        sourceType: '*',
        targetType: 'kinesis-analytics',
        capability: 'kinesis:analytics',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Kinesis Analytics for stream processing',
        examples: ['lambda-api -> kinesis:analytics (read)', 'ci-cd -> kinesis:analytics (write)']
      },
      {
        sourceType: '*',
        targetType: 'kinesis-firehose',
        capability: 'kinesis:firehose',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Kinesis Firehose for data delivery',
        examples: ['lambda-api -> kinesis:firehose (read)', 'lambda-api -> kinesis:firehose (write)']
      },
      {
        sourceType: '*',
        targetType: 'kinesis-video-stream',
        capability: 'kinesis:video-stream',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Kinesis Video Streams for video data streaming',
        examples: ['lambda-api -> kinesis:video-stream (read)', 'lambda-api -> kinesis:video-stream (write)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for Kinesis binding');
    }
    if (!capability) {
      throw new Error('Binding capability is required');
    }

    // Normalize access to array (directive.access is a single AccessLevel string)
    const access = directive.access ? [directive.access] : [];

    // Validate access patterns
    const validAccessTypes = ['read', 'write', 'readwrite'];
    const invalidAccess = access.filter(a => !validAccessTypes.includes(a));
    if (invalidAccess.length > 0) {
      throw new Error(`Invalid access types for Kinesis binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (access.length === 0) {
      throw new Error('Access cannot be empty for Kinesis binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Route to appropriate binding method based on capability
    if (capability === 'kinesis:stream') {
      return await this.bindToStream(context, targetCapabilityData, access);
    } else if (capability === 'kinesis:analytics') {
      return await this.bindToAnalytics(context, targetCapabilityData, access);
    } else if (capability === 'kinesis:firehose') {
      return await this.bindToFirehose(context, targetCapabilityData, access);
    } else if (capability === 'kinesis:video-stream') {
      return await this.bindToVideoStream(context, targetCapabilityData, access);
    } else {
        throw new Error(`Unsupported Kinesis capability: ${capability}`);
    }
  }

  /**
   * Bind to Kinesis stream
   */
  private async bindToStream(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isKinesisStreamCapabilityData(targetData)) {
      throw new Error('Invalid Kinesis stream capability data structure. Expected streamName, streamArn, streamStatus, shardCount, and retentionPeriodHours.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getKinesisStreamActionsForAccess(acc, context).actions,
        'kinesis'
      );

      // Get resources from target data
      const resources = targetData.streamArn ? [targetData.streamArn] : ['*'];

      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources
        }),
        description: 'Kinesis stream access (granular actions)',
        complianceRequirement: 'Kinesis stream access policy'
      });
    } else {
      // Coarse access levels: use existing helper method (backward compatible)
      const actions = this.getKinesisStreamActionsForAccess(primaryAccess, context);
      if (actions.actions.length > 0) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: actions.actions,
            resources: actions.resources
          }),
          description: `Kinesis stream ${primaryAccess} access`,
          complianceRequirement: `Kinesis stream ${primaryAccess} access policy`
        });
      }
    }

    // Grant Lambda permissions for stream processing if process access is requested
    if (access.includes('process') || context.directive.options?.enableStreamProcessing === true) {
      const sourceFunctionArn = (context.source.getCapabilityData() as any)?.functionArn;
      if (sourceFunctionArn) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['lambda:InvokeFunction'],
            resources: [sourceFunctionArn]
          }),
          description: 'Lambda invocation permission for Kinesis stream processing',
          complianceRequirement: 'Lambda invoke permission for stream processing'
        });
      }
    }

    // Set environment variables
    environmentVariables['KINESIS_STREAM_NAME'] = targetData.streamName;
    environmentVariables['KINESIS_STREAM_ARN'] = targetData.streamArn;
    environmentVariables['KINESIS_STREAM_STATUS'] = targetData.streamStatus;
    environmentVariables['KINESIS_STREAM_SHARD_COUNT'] = targetData.shardCount.toString();
    environmentVariables['KINESIS_STREAM_RETENTION_PERIOD'] = targetData.retentionPeriodHours.toString();

    // Configure stream metadata
    if (targetData.streamModeDetails) {
      environmentVariables['KINESIS_STREAM_MODE'] = targetData.streamModeDetails.streamMode;
    }

    // Configure encryption
    if (targetData.encryptionType) {
      environmentVariables['KINESIS_STREAM_ENCRYPTION_TYPE'] = targetData.encryptionType;

      if (targetData.keyId) {
        environmentVariables['KINESIS_STREAM_KEY_ID'] = targetData.keyId;

        // Grant KMS permissions
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
            resources: [targetData.keyId]
          }),
          description: 'KMS permissions for Kinesis stream encryption',
          complianceRequirement: 'KMS decrypt/generate data key for stream encryption'
        });
      }
    }

    // Configure secure access if requested
    const requireSecureAccess = context.directive.options?.requireSecureAccess === true;
    if (requireSecureAccess) {
      await this.configureSecureStreamAccess(context, targetData, iamPolicies, environmentVariables);
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Kinesis Analytics
   */
  private async bindToAnalytics(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isKinesisAnalyticsCapabilityData(targetData)) {
      throw new Error('Invalid Kinesis Analytics capability data structure. Expected applicationName, applicationArn, and applicationStatus.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getKinesisAnalyticsActionsForAccess(acc, context).actions,
        'kinesisanalytics'
      );

      // Get resources from target data
      const resources = targetData.applicationArn ? [targetData.applicationArn] : ['*'];

      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources
        }),
        description: 'Kinesis Analytics access (granular actions)',
        complianceRequirement: 'Kinesis Analytics access policy'
      });
    } else {
      // Coarse access levels: use existing helper method (backward compatible)
      const actions = this.getKinesisAnalyticsActionsForAccess(primaryAccess, context);
      if (actions.actions.length > 0) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: actions.actions,
            resources: actions.resources
          }),
          description: `Kinesis Analytics ${primaryAccess} access`,
          complianceRequirement: `Kinesis Analytics ${primaryAccess} access policy`
        });
      }
    }

    // Grant CloudWatch Logs permissions
    const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
    const accountId = (context.target.context as any)?.accountId || '123456789012';
    iamPolicies.push({
      statement: new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
        resources: [`arn:aws:logs:${region}:${accountId}:log-group:/aws/kinesisanalytics/*`]
      }),
      description: 'CloudWatch Logs permissions for Kinesis Analytics',
      complianceRequirement: 'CloudWatch Logs permission for Kinesis Analytics logging'
    });

    // Set environment variables
    environmentVariables['KINESIS_ANALYTICS_APPLICATION_NAME'] = targetData.applicationName;
    environmentVariables['KINESIS_ANALYTICS_APPLICATION_ARN'] = targetData.applicationArn;
    environmentVariables['KINESIS_ANALYTICS_APPLICATION_STATUS'] = targetData.applicationStatus;

    // Configure runtime environment
    if (targetData.runtimeEnvironment) {
      environmentVariables['KINESIS_ANALYTICS_RUNTIME_ENVIRONMENT'] = targetData.runtimeEnvironment;
    }

    // Configure SQL application
    if (targetData.applicationConfiguration) {
      environmentVariables['KINESIS_ANALYTICS_SQL_APPLICATION'] = 
        targetData.applicationConfiguration.sqlApplicationConfiguration ? 'true' : 'false';
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Kinesis Firehose
   */
  private async bindToFirehose(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isKinesisFirehoseCapabilityData(targetData)) {
      throw new Error('Invalid Kinesis Firehose capability data structure. Expected deliveryStreamName, deliveryStreamArn, and deliveryStreamStatus.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getKinesisFirehoseActionsForAccess(acc, context).actions,
        'firehose'
      );

      // Get resources from target data
      const resources = targetData.deliveryStreamArn ? [targetData.deliveryStreamArn] : ['*'];

      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources
        }),
        description: 'Kinesis Firehose access (granular actions)',
        complianceRequirement: 'Kinesis Firehose access policy'
      });
    } else {
      // Coarse access levels: use existing helper method (backward compatible)
      const actions = this.getKinesisFirehoseActionsForAccess(primaryAccess, context);
      if (actions.actions.length > 0) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: actions.actions,
            resources: actions.resources
          }),
          description: `Kinesis Firehose ${primaryAccess} access`,
          complianceRequirement: `Kinesis Firehose ${primaryAccess} access policy`
        });
      }
    }

    // Grant S3 permissions for data delivery
    if (targetData.s3DestinationConfiguration) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject',
          's3:GetBucketLocation'
        ],
          resources: [
            targetData.s3DestinationConfiguration.bucketArn,
            `${targetData.s3DestinationConfiguration.bucketArn}/*`
          ]
        }),
        description: 'S3 permissions for Kinesis Firehose data delivery',
        complianceRequirement: 'S3 read/write permission for Firehose data delivery'
      });
    }

    // Grant Lambda permissions for data transformation and expose processor types
    if (targetData.processingConfiguration?.processors) {
      const processorTypes: string[] = [];
      targetData.processingConfiguration.processors.forEach((processor) => {
        processorTypes.push(processor.type);
        
        if (processor.type === 'Lambda') {
          const lambdaArn = processor.parameters?.find(p => p.parameterName === 'LambdaArn')?.parameterValue;
          if (lambdaArn) {
            iamPolicies.push({
              statement: new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['lambda:InvokeFunction'],
                resources: [lambdaArn]
              }),
              description: 'Lambda invocation permission for Kinesis Firehose data transformation',
              complianceRequirement: 'Lambda invoke permission for Firehose data transformation'
            });
          }
        }
      });
      
      // Expose processor types as environment variable
      if (processorTypes.length > 0) {
        environmentVariables['KINESIS_FIREHOSE_PROCESSOR_TYPES'] = processorTypes.join(',');
      }
    }

    // Set environment variables
    environmentVariables['KINESIS_FIREHOSE_DELIVERY_STREAM_NAME'] = targetData.deliveryStreamName;
    environmentVariables['KINESIS_FIREHOSE_DELIVERY_STREAM_ARN'] = targetData.deliveryStreamArn;
    environmentVariables['KINESIS_FIREHOSE_DELIVERY_STREAM_STATUS'] = targetData.deliveryStreamStatus;

    // Configure destination
    if (targetData.deliveryStreamDestinationType) {
      environmentVariables['KINESIS_FIREHOSE_DESTINATION_TYPE'] = targetData.deliveryStreamDestinationType;
    }

    // Configure secure access if requested
    const requireSecureAccess = context.directive.options?.requireSecureAccess === true;
    if (requireSecureAccess) {
      await this.configureSecureFirehoseAccess(context, targetData, iamPolicies, environmentVariables);
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Kinesis Video Streams
   */
  private async bindToVideoStream(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isKinesisVideoStreamsCapabilityData(targetData)) {
      throw new Error('Invalid Kinesis Video Streams capability data structure. Expected streamName, streamArn, status, and dataRetentionInHours.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getKinesisVideoStreamsActionsForAccess(acc, context).actions,
        'kinesisvideo'
      );

      // Get resources from target data
      const resources = targetData.streamArn ? [targetData.streamArn] : ['*'];

      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources
        }),
        description: 'Kinesis Video Streams access (granular actions)',
        complianceRequirement: 'Kinesis Video Streams access policy'
      });
    } else {
      // Coarse access levels: use existing helper method (backward compatible)
      const actions = this.getKinesisVideoStreamsActionsForAccess(primaryAccess, context);
      if (actions.actions.length > 0) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: actions.actions,
            resources: actions.resources
          }),
          description: `Kinesis Video Streams ${primaryAccess} access`,
          complianceRequirement: `Kinesis Video Streams ${primaryAccess} access policy`
        });
      }
    }

    // Set environment variables (targetData is now narrowed by type guard)
    environmentVariables['KINESIS_VIDEO_STREAM_NAME'] = targetData.streamName;
    environmentVariables['KINESIS_VIDEO_STREAM_ARN'] = targetData.streamArn;
    environmentVariables['KINESIS_VIDEO_STREAM_STATUS'] = targetData.status;
    environmentVariables['KINESIS_VIDEO_STREAM_DATA_RETENTION_HOURS'] = targetData.dataRetentionInHours.toString();

    // Configure stream metadata
    if (targetData.mediaType) {
      environmentVariables['KINESIS_VIDEO_STREAM_MEDIA_TYPE'] = targetData.mediaType;
    }

    // Configure encryption
    if (targetData.kmsKeyId) {
      environmentVariables['KINESIS_VIDEO_STREAM_KMS_KEY_ID'] = targetData.kmsKeyId;

      // Grant KMS permissions
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
          resources: [targetData.kmsKeyId]
        }),
        description: 'KMS permissions for Kinesis Video Streams encryption',
        complianceRequirement: 'KMS decrypt/generate data key for video stream encryption'
      });
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Configure secure stream access
   */
  private async configureSecureStreamAccess(
    context: BindingContext,
    targetData: KinesisStreamCapabilityData,
    iamPolicies: IamPolicy[],
    environmentVariables: Record<string, string>
  ): Promise<void> {
    // Configure enhanced monitoring
    environmentVariables['KINESIS_STREAM_MONITORING_ENABLED'] = 'true';

    // Configure CloudWatch metrics
    iamPolicies.push({
      statement: new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
        'cloudwatch:PutMetricData',
        'cloudwatch:GetMetricStatistics',
        'cloudwatch:ListMetrics'
      ],
        resources: ['*']
      }),
      description: 'CloudWatch permissions for Kinesis stream monitoring',
      complianceRequirement: 'CloudWatch metrics permission for stream monitoring'
    });

    // Configure CloudWatch Logs for stream metrics
    const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
    const accountId = (context.target.context as any)?.accountId || '123456789012';
    iamPolicies.push({
      statement: new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'logs:DescribeLogStreams'
        ],
        resources: [`arn:aws:logs:${region}:${accountId}:log-group:/aws/kinesis/*`]
      }),
      description: 'CloudWatch Logs permissions for Kinesis stream metrics',
      complianceRequirement: 'CloudWatch Logs permission for stream metrics logging'
    });

    // Optional: data retention setting
    if (context.directive.options?.retentionDays) {
      environmentVariables['KINESIS_STREAM_RETENTION_DAYS'] = String(context.directive.options.retentionDays);
    }

    // Configure VPC endpoint if requested
    if (context.directive.options?.enableVpcEndpoint === true) {
      environmentVariables['KINESIS_VPC_ENDPOINT_ENABLED'] = 'true';
    }
  }

  /**
   * Configure secure Firehose access
   */
  private async configureSecureFirehoseAccess(
    context: BindingContext,
    targetData: KinesisFirehoseCapabilityData,
    iamPolicies: IamPolicy[],
    environmentVariables: Record<string, string>
  ): Promise<void> {
    // Configure server-side encryption for S3 destinations
    if (targetData.s3DestinationConfiguration?.encryptionConfiguration) {
      environmentVariables['KINESIS_FIREHOSE_S3_ENCRYPTION_ENABLED'] = 'true';

      if (targetData.s3DestinationConfiguration.encryptionConfiguration.kmsEncryptionConfig) {
        const kmsKeyArn = targetData.s3DestinationConfiguration.encryptionConfiguration.kmsEncryptionConfig.awsKMSKeyARN;
        environmentVariables['KINESIS_FIREHOSE_S3_KMS_KEY_ARN'] = kmsKeyArn;

        // Grant KMS permissions
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
            resources: [kmsKeyArn]
          }),
          description: 'KMS permissions for Kinesis Firehose S3 encryption',
          complianceRequirement: 'KMS decrypt/generate data key for Firehose S3 encryption'
        });
      }
    }

    // Configure backup if requested
    if (targetData.s3DestinationConfiguration?.backupConfiguration) {
      environmentVariables['KINESIS_FIREHOSE_BACKUP_ENABLED'] = 'true';
      if (targetData.s3DestinationConfiguration.backupConfiguration.s3BackupConfiguration) {
        environmentVariables['KINESIS_FIREHOSE_BACKUP_S3_BUCKET'] = 
          targetData.s3DestinationConfiguration.backupConfiguration.s3BackupConfiguration.bucketARN;
      }
    }

    // Configure data compression
    if (targetData.s3DestinationConfiguration?.compressionFormat) {
      environmentVariables['KINESIS_FIREHOSE_COMPRESSION_FORMAT'] = 
        targetData.s3DestinationConfiguration.compressionFormat;
    }
  }

  /**
   * Get Kinesis stream actions for access level
   */
  private getKinesisStreamActionsForAccess(
    access: string,
    context: BindingContext
  ): { actions: string[]; resources: string[] } {
    const actions: string[] = [];
    const resources: string[] = [];

    // Read actions are included for read, write, and readwrite access
    // (write access needs read to verify operations)
    if (access === 'read' || access === 'write' || access === 'readwrite') {
      actions.push(
        'kinesis:DescribeStream',
        'kinesis:DescribeStreamSummary',
        'kinesis:ListStreams',
        'kinesis:GetRecords',
        'kinesis:GetShardIterator',
        'kinesis:ListShards'
      );
    }

    if (access === 'write' || access === 'readwrite') {
      actions.push(
        'kinesis:CreateStream',
        'kinesis:DeleteStream',
        'kinesis:UpdateShardCount',
        'kinesis:PutRecord',
        'kinesis:PutRecords'
      );
    }

    // Get stream ARN from target if available
    const targetCapabilities = context.target.getCapabilities();
    const streamData = targetCapabilities['kinesis:stream'] as KinesisStreamCapabilityData | undefined;
    if (streamData?.streamArn) {
      resources.push(streamData.streamArn);
    } else {
      // Fallback to wildcard if ARN not available
      resources.push('*');
    }

    return { actions, resources };
  }

  /**
   * Get Kinesis Analytics actions for access level
   */
  private getKinesisAnalyticsActionsForAccess(
    access: string,
    context: BindingContext
  ): { actions: string[]; resources: string[] } {
    const actions: string[] = [];
    const resources: string[] = [];

    // Read actions are included for read, write, and readwrite access
    // (write access needs read to verify operations)
    if (access === 'read' || access === 'write' || access === 'readwrite') {
      actions.push(
        'kinesisanalytics:DescribeApplication',
        'kinesisanalytics:ListApplications',
        'kinesisanalytics:DescribeApplicationSnapshot',
        'kinesisanalytics:ListApplicationSnapshots'
      );
    }

    if (access === 'write' || access === 'readwrite') {
      actions.push(
        'kinesisanalytics:CreateApplication',
        'kinesisanalytics:DeleteApplication',
        'kinesisanalytics:UpdateApplication',
        'kinesisanalytics:StartApplication',
        'kinesisanalytics:StopApplication'
      );
    }

    // Get application ARN from target if available
    const targetCapabilities = context.target.getCapabilities();
    const analyticsData = targetCapabilities['kinesis:analytics'] as KinesisAnalyticsCapabilityData | undefined;
    if (analyticsData?.applicationArn) {
      resources.push(analyticsData.applicationArn);
    } else {
      // Fallback to wildcard if ARN not available
      resources.push('*');
    }

    return { actions, resources };
  }

  /**
   * Get Kinesis Firehose actions for access level
   */
  private getKinesisFirehoseActionsForAccess(
    access: string,
    context: BindingContext
  ): { actions: string[]; resources: string[] } {
    const actions: string[] = [];
    const resources: string[] = [];

    // Read actions are included for read, write, and readwrite access
    // (write access needs read to verify operations)
    if (access === 'read' || access === 'write' || access === 'readwrite') {
      actions.push(
        'firehose:DescribeDeliveryStream',
        'firehose:ListDeliveryStreams'
      );
    }

    if (access === 'write' || access === 'readwrite') {
      actions.push(
        'firehose:CreateDeliveryStream',
        'firehose:DeleteDeliveryStream',
        'firehose:UpdateDestination',
        'firehose:PutRecord',
        'firehose:PutRecordBatch'
      );
    }

    // Get delivery stream ARN from target if available
    const targetCapabilities = context.target.getCapabilities();
    const firehoseData = targetCapabilities['kinesis:firehose'] as KinesisFirehoseCapabilityData | undefined;
    if (firehoseData?.deliveryStreamArn) {
      resources.push(firehoseData.deliveryStreamArn);
    } else {
      // Fallback to wildcard if ARN not available
      resources.push('*');
    }

    return { actions, resources };
  }

  /**
   * Type guard for Kinesis stream capability data
   */
  private isKinesisStreamCapabilityData(data: unknown): data is KinesisStreamCapabilityData {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const d = data as Record<string, unknown>;
    return (
      d.type === 'kinesis:stream' &&
      typeof d.streamName === 'string' &&
      typeof d.streamArn === 'string' &&
      typeof d.streamStatus === 'string' &&
      typeof d.shardCount === 'number' &&
      typeof d.retentionPeriodHours === 'number'
    );
  }

  /**
   * Type guard for Kinesis Analytics capability data
   */
  private isKinesisAnalyticsCapabilityData(data: unknown): data is KinesisAnalyticsCapabilityData {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const d = data as Record<string, unknown>;
    return (
      d.type === 'kinesis:analytics' &&
      typeof d.applicationName === 'string' &&
      typeof d.applicationArn === 'string' &&
      typeof d.applicationStatus === 'string'
    );
  }

  /**
   * Type guard for Kinesis Firehose capability data
   */
  private isKinesisFirehoseCapabilityData(data: unknown): data is KinesisFirehoseCapabilityData {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const d = data as Record<string, unknown>;
    return (
      d.type === 'kinesis:firehose' &&
      typeof d.deliveryStreamName === 'string' &&
      typeof d.deliveryStreamArn === 'string' &&
      typeof d.deliveryStreamStatus === 'string'
    );
  }

  /**
   * Get Kinesis Video Streams actions for access level
   */
  private getKinesisVideoStreamsActionsForAccess(
    access: string,
    context: BindingContext
  ): { actions: string[]; resources: string[] } {
    const actions: string[] = [];
    const resources: string[] = [];

    // Read actions are included for read, write, and readwrite access
    // (write access needs read to verify operations)
    if (access === 'read' || access === 'write' || access === 'readwrite') {
      actions.push(
        'kinesisvideo:DescribeStream',
        'kinesisvideo:GetDataEndpoint',
        'kinesisvideo:ListStreams',
        'kinesisvideo:GetMedia',
        'kinesisvideo:GetMediaForFragmentList'
      );
    }

    if (access === 'write' || access === 'readwrite') {
      actions.push(
        'kinesisvideo:CreateStream',
        'kinesisvideo:DeleteStream',
        'kinesisvideo:UpdateStream',
        'kinesisvideo:PutMedia',
        'kinesisvideo:ListFragments',
        'kinesisvideo:GetHLSStreamingSessionURL',
        'kinesisvideo:GetDASHStreamingSessionURL'
      );
    }

    // Get stream ARN from target if available
    const targetCapabilities = context.target.getCapabilities();
    const videoStreamData = targetCapabilities['kinesis:video-stream'] as KinesisVideoStreamsCapabilityData | undefined;
    if (videoStreamData?.streamArn) {
      resources.push(videoStreamData.streamArn);
    } else {
      // Fallback to wildcard if ARN not available
      resources.push('*');
    }

    return { actions, resources };
  }

  /**
   * Type guard for Kinesis Video Streams capability data
   */
  private isKinesisVideoStreamsCapabilityData(data: unknown): data is KinesisVideoStreamsCapabilityData {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const d = data as Record<string, unknown>;
    return (
      d.type === 'kinesis:video-stream' &&
      typeof d.streamName === 'string' &&
      typeof d.streamArn === 'string' &&
      typeof d.status === 'string' &&
      typeof d.dataRetentionInHours === 'number'
    );
  }
}
