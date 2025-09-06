/**
 * Concrete Binder Strategy Implementations
 * Enterprise-grade binding logic for different component combinations
 */

import { 
  BinderStrategy, 
  BindingContext, 
  BindingResult 
} from '../../patterns/binding-strategies';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

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
    const { source, target, directive } = context;

    // 1. Get the REAL L2 construct handles from the component instances
    const lambdaConstruct = source.getConstruct('main') as lambda.Function;
    const rdsConstruct = target.getConstruct('main') as rds.DatabaseInstance;

    if (!lambdaConstruct || !rdsConstruct) {
      throw new Error(`Could not retrieve construct handles for binding ${source.spec.name} -> ${target.spec.name}`);
    }
    
    // 2. Use high-level L2 methods to apply wiring directly
    // Allow Lambda to connect to RDS on the default PostgreSQL port
    rdsConstruct.connections.allowDefaultPortFrom(
      lambdaConstruct, 
      `Allow connection from Lambda ${source.spec.name}`
    );

    // Grant Lambda access to connect to the database and read secrets
    this.grantDatabaseAccess(rdsConstruct, lambdaConstruct, directive.access);

    // 3. Handle advanced options like IAM Auth
    if (directive.options?.iamAuth) {
      this.enableIamDatabaseAuth(rdsConstruct, lambdaConstruct, context);
    }

    // 4. Apply compliance-specific security enhancements
    if (context.complianceFramework.startsWith('fedramp')) {
      this.applyFedRAMPSecurityEnhancements(rdsConstruct, lambdaConstruct, context);
    }

    // 5. Return environment variables (the main output now that constructs are wired directly)
    return {
      iamPolicies: [], // No longer needed - CDK handles this
      securityGroupRules: [], // No longer needed - CDK handles this
      environmentVariables: this.buildEnvironmentVariables(target, directive, rdsConstruct),
      additionalConfig: {} // No longer needed - CDK handles configuration directly
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

  /**
   * Grant Lambda access to the database using CDK L2 methods
   */
  private grantDatabaseAccess(
    rdsConstruct: rds.DatabaseInstance, 
    lambdaConstruct: lambda.Function, 
    access: string
  ): void {
    switch (access) {
      case 'read':
      case 'readwrite': // Both read and readwrite need secret access
        // Grant Lambda permission to read database credentials from Secrets Manager
        rdsConstruct.secret?.grantRead(lambdaConstruct);
        break;
      case 'write':
        // Write operations still need credential access
        rdsConstruct.secret?.grantRead(lambdaConstruct);
        break;
      case 'admin':
        // Full access including secret management
        rdsConstruct.secret?.grantRead(lambdaConstruct);
        rdsConstruct.secret?.grantWrite(lambdaConstruct);
        break;
      default:
        throw new Error(`Invalid access level: ${access}. Valid values: read, write, readwrite, admin`);
    }
  }

  /**
   * Enable IAM database authentication using CDK methods
   */
  private enableIamDatabaseAuth(
    rdsConstruct: rds.DatabaseInstance,
    lambdaConstruct: lambda.Function,
    context: BindingContext
  ): void {
    // Grant RDS connect permission for IAM database authentication
    lambdaConstruct.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['rds-db:connect'],
        resources: [
          `arn:aws:rds-db:*:*:dbuser:${(rdsConstruct.node.defaultChild as rds.CfnDBInstance).attrDbiResourceId}/${context.directive.options?.iamAuth?.username || 'lambda_user'}`
        ],
        conditions: {
          'StringEquals': {
            'aws:SecureTransport': 'true'
          }
        }
      })
    );
  }

  /**
   * Apply FedRAMP-specific security enhancements using CDK
   */
  private applyFedRAMPSecurityEnhancements(
    rdsConstruct: rds.DatabaseInstance,
    lambdaConstruct: lambda.Function,
    context: BindingContext
  ): void {
    // Add enhanced monitoring permissions for FedRAMP compliance
    lambdaConstruct.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'rds:DescribeDBInstances',
          'rds:DescribeDBClusters',
          'rds:ListTagsForResource'
        ],
        resources: ['*'], // Describe actions require wildcard resource
        conditions: {
          'StringEquals': {
            'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1',
            'aws:SecureTransport': 'true'
          }
        }
      })
    );
  }

  /**
   * Build environment variables with tokenized values directly from CDK constructs
   */
  private buildEnvironmentVariables(
    target: any,
    directive: any,
    rdsConstruct: rds.DatabaseInstance
  ): Record<string, string> {
    return {
      [directive.env?.host || 'DB_HOST']: rdsConstruct.instanceEndpoint.hostname,
      [directive.env?.port || 'DB_PORT']: rdsConstruct.instanceEndpoint.port.toString(),
      [directive.env?.dbName || 'DB_NAME']: target.spec.config.dbName,
      [directive.env?.secretArn || 'DB_SECRET_ARN']: rdsConstruct.secret!.secretArn
    };
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