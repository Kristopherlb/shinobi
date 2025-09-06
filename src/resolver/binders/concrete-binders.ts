/**
 * Concrete Binder Strategy Implementations
 * Enterprise-grade binding logic for different component combinations
 */

import { 
  BinderStrategy, 
  BindingContext, 
  BindingResult 
} from '../../patterns/binding-strategies';

/**
 * Enhanced Lambda to SQS binding with enterprise security
 */
export class LambdaToSqsBinderStrategy extends BinderStrategy {
  canHandle(sourceType: string, targetCapability: string): boolean {
    return (sourceType === 'lambda-api' || sourceType === 'lambda-worker') && 
           targetCapability === 'queue:sqs';
  }

  bind(context: BindingContext): BindingResult {
    const targetCapabilities = context.target.getCapabilities();
    const sqsCapability = targetCapabilities['queue:sqs'];
    
    if (!sqsCapability) {
      throw new Error(`Target component ${context.target.spec.name} does not provide queue:sqs capability`);
    }

    const actions = this.getActionsForAccess(context.directive.access);
    const conditions = this.buildSecurityConditions(context);
    
    return {
      iamPolicies: [{
        effect: 'Allow',
        actions,
        resources: [sqsCapability.queueArn],
        conditions
      }],
      environmentVariables: {
        [context.directive.env?.queueUrl || 'QUEUE_URL']: sqsCapability.queueUrl,
        [context.directive.env?.queueArn || 'QUEUE_ARN']: sqsCapability.queueArn
      },
      additionalConfig: this.buildAdditionalConfig(context)
    };
  }

  private getActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'sqs:ReceiveMessage',
          'sqs:DeleteMessage', 
          'sqs:GetQueueAttributes',
          'sqs:GetQueueUrl'
        ];
      case 'write':
        return [
          'sqs:SendMessage',
          'sqs:GetQueueAttributes',
          'sqs:GetQueueUrl'
        ];
      case 'readwrite':
        return [
          'sqs:ReceiveMessage',
          'sqs:DeleteMessage',
          'sqs:SendMessage',
          'sqs:GetQueueAttributes',
          'sqs:GetQueueUrl',
          'sqs:ChangeMessageVisibility'
        ];
      case 'admin':
        return ['sqs:*'];
      default:
        throw new Error(`Invalid access level: ${access}. Valid values: read, write, readwrite, admin`);
    }
  }

  private buildSecurityConditions(context: BindingContext): Record<string, any> {
    const conditions: Record<string, any> = {
      'StringEquals': {
        'aws:SecureTransport': 'true'
      }
    };

    // FedRAMP-specific conditions
    if (context.complianceFramework.startsWith('fedramp')) {
      conditions['StringEquals']['aws:RequestedRegion'] = process.env.AWS_REGION || 'us-east-1';
      
      if (context.complianceFramework === 'fedramp-high') {
        // Restrict to VPC endpoints for FedRAMP High
        conditions['StringEquals']['aws:SourceVpce'] = context.directive.options?.vpcEndpoint || 'vpce-*';
      }
    }

    return conditions;
  }

  private buildAdditionalConfig(context: BindingContext): Record<string, any> {
    const config: Record<string, any> = {};

    // Dead letter queue configuration
    if (context.directive.options?.deadLetterQueue) {
      config.deadLetterQueue = {
        enabled: true,
        maxReceiveCount: context.directive.options.deadLetterQueue.maxReceiveCount || 3,
        retentionPeriod: context.directive.options.deadLetterQueue.retentionPeriod || 1209600 // 14 days
      };
    }

    // Batch processing configuration for workers
    if (context.source.getType() === 'lambda-worker') {
      config.eventSourceMapping = {
        batchSize: context.directive.options?.batchSize || 10,
        maximumBatchingWindowInSeconds: context.directive.options?.batchingWindow || 5,
        parallelizationFactor: context.directive.options?.parallelization || 1
      };
    }

    return config;
  }
}

/**
 * Enhanced Lambda to RDS binding with enterprise security
 */
export class LambdaToRdsBinderStrategy extends BinderStrategy {
  canHandle(sourceType: string, targetCapability: string): boolean {
    return (sourceType === 'lambda-api' || sourceType === 'lambda-worker') && 
           targetCapability === 'db:postgres';
  }

  bind(context: BindingContext): BindingResult {
    const targetCapabilities = context.target.getCapabilities();
    const dbCapability = targetCapabilities['db:postgres'];
    
    if (!dbCapability) {
      throw new Error(`Target component ${context.target.spec.name} does not provide db:postgres capability`);
    }

    const iamPolicies = this.buildDatabaseIAMPolicies(context, dbCapability);
    const securityGroupRules = this.buildSecurityGroupRules(context, dbCapability);
    
    return {
      iamPolicies,
      environmentVariables: {
        [context.directive.env?.host || 'DB_HOST']: dbCapability.host,
        [context.directive.env?.port || 'DB_PORT']: dbCapability.port.toString(),
        [context.directive.env?.dbName || 'DB_NAME']: dbCapability.dbName,
        [context.directive.env?.secretArn || 'DB_SECRET_ARN']: dbCapability.secretArn
      },
      securityGroupRules,
      additionalConfig: this.buildVPCConfig(context, dbCapability)
    };
  }

  private buildDatabaseIAMPolicies(context: BindingContext, dbCapability: any): Array<any> {
    const policies = [
      // Secrets Manager access for database credentials
      {
        effect: 'Allow',
        actions: [
          'secretsmanager:GetSecretValue',
          'secretsmanager:DescribeSecret'
        ],
        resources: [dbCapability.secretArn],
        conditions: {
          'StringEquals': {
            'aws:SecureTransport': 'true'
          }
        }
      }
    ];

    // IAM database authentication for enhanced security
    if (context.directive.options?.iamAuth) {
      policies.push({
        effect: 'Allow',
        actions: ['rds-db:connect'],
        resources: [`arn:aws:rds-db:${process.env.AWS_REGION}:${process.env.CDK_DEFAULT_ACCOUNT}:dbuser:${dbCapability.dbInstanceId}/${context.directive.options.iamAuth.username || 'lambda_user'}`],
        conditions: {
          'StringEquals': {
            'aws:SecureTransport': 'true'
          }
        }
      });
    }

    // Enhanced monitoring permissions for FedRAMP
    if (context.complianceFramework.startsWith('fedramp')) {
      policies.push({
        effect: 'Allow',
        actions: [
          'rds:DescribeDBInstances',
          'rds:DescribeDBClusters',
          'rds:ListTagsForResource'
        ],
        resources: [dbCapability.dbInstanceArn || '*'],
        conditions: {
          'StringEquals': {
            'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1'
          }
        }
      });
    }

    return policies;
  }

  private buildSecurityGroupRules(context: BindingContext, dbCapability: any): Array<any> {
    return [{
      type: 'egress' as const,
      protocol: 'tcp',
      port: dbCapability.port,
      source: dbCapability.sgId,
      description: this.generateSecureDescription(context)
    }];
  }

  private buildVPCConfig(context: BindingContext, dbCapability: any): Record<string, any> {
    const vpcConfig: Record<string, any> = {};

    // VPC configuration is required for RDS connections
    if (context.complianceFramework.startsWith('fedramp')) {
      vpcConfig.vpcConfig = {
        subnetIds: ['subnet-private-1', 'subnet-private-2'], // Use private subnets for FedRAMP
        securityGroupIds: [dbCapability.sgId]
      };
    } else if (context.directive.options?.iamAuth || context.directive.options?.vpcConfig) {
      vpcConfig.vpcConfig = {
        subnetIds: context.directive.options.vpcConfig?.subnetIds || ['subnet-default-1', 'subnet-default-2'],
        securityGroupIds: [dbCapability.sgId]
      };
    }

    // Connection pooling configuration
    vpcConfig.connectionPool = {
      maxConnections: context.directive.options?.maxConnections || 
                     (context.complianceFramework.startsWith('fedramp') ? 5 : 10),
      connectionTimeout: 30,
      idleTimeout: 300
    };

    return vpcConfig;
  }
}

/**
 * Enhanced Lambda to S3 binding with enterprise security
 */
export class LambdaToS3BucketBinderStrategy extends BinderStrategy {
  canHandle(sourceType: string, targetCapability: string): boolean {
    return (sourceType === 'lambda-api' || sourceType === 'lambda-worker') && 
           targetCapability === 'bucket:s3';
  }

  bind(context: BindingContext): BindingResult {
    const targetCapabilities = context.target.getCapabilities();
    const s3Capability = targetCapabilities['bucket:s3'];
    
    if (!s3Capability) {
      throw new Error(`Target component ${context.target.spec.name} does not provide bucket:s3 capability`);
    }

    const actions = this.getS3ActionsForAccess(context.directive.access);
    const conditions = this.buildS3SecurityConditions(context);

    return {
      iamPolicies: [{
        effect: 'Allow',
        actions,
        resources: [
          s3Capability.bucketArn,
          `${s3Capability.bucketArn}/*`
        ],
        conditions
      }],
      environmentVariables: {
        [context.directive.env?.bucketName || 'BUCKET_NAME']: s3Capability.bucketName,
        [context.directive.env?.bucketArn || 'BUCKET_ARN']: s3Capability.bucketArn
      },
      additionalConfig: this.buildS3AdditionalConfig(context, s3Capability)
    };
  }

  private getS3ActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          's3:GetObject',
          's3:GetObjectVersion',
          's3:ListBucket',
          's3:GetBucketLocation'
        ];
      case 'write':
        return [
          's3:PutObject',
          's3:PutObjectAcl',
          's3:AbortMultipartUpload',
          's3:ListMultipartUploadParts'
        ];
      case 'readwrite':
        return [
          's3:GetObject',
          's3:GetObjectVersion',
          's3:PutObject',
          's3:PutObjectAcl',
          's3:DeleteObject',
          's3:ListBucket',
          's3:GetBucketLocation',
          's3:AbortMultipartUpload',
          's3:ListMultipartUploadParts'
        ];
      case 'admin':
        return ['s3:*'];
      default:
        throw new Error(`Invalid access level: ${access}. Valid values: read, write, readwrite, admin`);
    }
  }

  private buildS3SecurityConditions(context: BindingContext): Record<string, any> {
    const conditions: Record<string, any> = {
      'StringEquals': {
        'aws:SecureTransport': 'true'
      }
    };

    // FedRAMP-specific conditions
    if (context.complianceFramework.startsWith('fedramp')) {
      conditions['StringLike'] = {
        's3:x-amz-server-side-encryption': 'aws:kms'
      };
      
      conditions['StringEquals']['s3:x-amz-server-side-encryption-aws-kms-key-id'] = 
        context.directive.options?.kmsKeyId || 'alias/aws/s3';

      if (context.complianceFramework === 'fedramp-high') {
        // Restrict to specific object prefix for FedRAMP High
        const allowedPrefix = context.directive.options?.objectPrefix || `${context.source.spec.name}/*`;
        conditions['StringLike']['s3:prefix'] = allowedPrefix;
      }
    }

    return conditions;
  }

  private buildS3AdditionalConfig(context: BindingContext, s3Capability: any): Record<string, any> {
    const config: Record<string, any> = {};

    // Object lifecycle management
    if (context.directive.options?.lifecycle) {
      config.lifecycle = {
        enabled: true,
        rules: context.directive.options.lifecycle.rules || [
          {
            id: 'default-transition',
            status: 'Enabled',
            transitions: [
              { days: 30, storageClass: 'STANDARD_IA' },
              { days: 90, storageClass: 'GLACIER' }
            ]
          }
        ]
      };
    }

    // Versioning configuration
    config.versioning = {
      enabled: context.complianceFramework.startsWith('fedramp') || 
               context.directive.options?.versioning === true
    };

    // Access logging for compliance
    if (context.complianceFramework.startsWith('fedramp')) {
      config.accessLogging = {
        enabled: true,
        targetBucket: context.directive.options?.accessLogsBucket || `${s3Capability.bucketName}-access-logs`,
        targetPrefix: 'access-logs/'
      };
    }

    return config;
  }
}