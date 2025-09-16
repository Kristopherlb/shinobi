/**
 * Concrete Binder Strategy Implementations
 * Enterprise-grade binding logic for different component combinations
 */

import { 
  BinderStrategy, 
  BindingContext, 
  BindingResult 
} from '@platform/contracts';
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
    const { source, target, directive } = context;

    // 1. Get the REAL L2 construct handles from the component instances
    const lambdaConstruct = source.getConstruct('main') as lambda.Function;
    const sqsQueueConstruct = target.getConstruct('main') as sqs.IQueue;

    if (!lambdaConstruct || !sqsQueueConstruct) {
      throw new Error(`Could not retrieve construct handles for binding ${source.getName()} -> ${target.getName()}`);
    }

    // 2. Use high-level L2 methods to apply IAM permissions directly
    this.grantSQSAccess(sqsQueueConstruct, lambdaConstruct, directive.access);

    // 3. Apply compliance-specific security enhancements
    if (context.complianceFramework.startsWith('fedramp')) {
      this.applyFedRAMPSecurityEnhancements(sqsQueueConstruct, lambdaConstruct, context);
    }

    // 4. Handle advanced options like dead letter queue
    if (directive.options?.deadLetterQueue) {
      this.configureDeadLetterQueue(sqsQueueConstruct, lambdaConstruct, context);
    }

    // 5. Return environment variables from the REAL construct
    return {
      environmentVariables: {
        [directive.env?.queueUrl || 'QUEUE_URL']: sqsQueueConstruct.queueUrl,
        [directive.env?.queueArn || 'QUEUE_ARN']: sqsQueueConstruct.queueArn
      }
    };
  }


  /**
   * Grant Lambda access to SQS queue using CDK L2 methods
   */
  private grantSQSAccess(
    sqsQueueConstruct: sqs.IQueue, 
    lambdaConstruct: lambda.Function, 
    access: string
  ): void {
    switch (access) {
      case 'read':
        sqsQueueConstruct.grantConsumeMessages(lambdaConstruct);
        break;
      case 'write':
        sqsQueueConstruct.grantSendMessages(lambdaConstruct);
        break;
      case 'readwrite':
        sqsQueueConstruct.grantConsumeMessages(lambdaConstruct);
        sqsQueueConstruct.grantSendMessages(lambdaConstruct);
        break;
      case 'admin':
        sqsQueueConstruct.grantConsumeMessages(lambdaConstruct);
        sqsQueueConstruct.grantSendMessages(lambdaConstruct);
        sqsQueueConstruct.grantPurge(lambdaConstruct);
        break;
      default:
        throw new Error(`Invalid access level: ${access}. Valid values: read, write, readwrite, admin`);
    }
  }

  /**
   * Apply FedRAMP-specific security enhancements using CDK
   */
  private applyFedRAMPSecurityEnhancements(
    sqsQueueConstruct: sqs.IQueue,
    lambdaConstruct: lambda.Function,
    context: BindingContext
  ): void {
    // Add enhanced SQS monitoring permissions for FedRAMP compliance
    lambdaConstruct.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'sqs:GetQueueAttributes',
          'sqs:ListQueues',
          'sqs:ListQueueTags'
        ],
        resources: [sqsQueueConstruct.queueArn],
        conditions: {
          'StringEquals': {
            'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1',
            'aws:SecureTransport': 'true'
          }
        }
      })
    );

    // Additional FedRAMP High restrictions
    if (context.complianceFramework === 'fedramp-high') {
      // Restrict to VPC endpoints for FedRAMP High
      lambdaConstruct.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.DENY,
          actions: ['sqs:*'],
          resources: ['*'],
          conditions: {
            'StringNotEquals': {
              'aws:SourceVpce': context.directive.options?.vpcEndpoint || 'vpce-*'
            }
          }
        })
      );
    }
  }

  /**
   * Configure dead letter queue integration using CDK
   */
  private configureDeadLetterQueue(
    sqsQueueConstruct: sqs.IQueue,
    lambdaConstruct: lambda.Function,
    context: BindingContext
  ): void {
    // For Lambda workers, configure event source mapping with DLQ settings
    if (context.source.getType() === 'lambda-worker') {
      // Event source mapping configuration is handled by CDK construct integration
      // The queue's dead letter queue is already configured at the construct level
      
      // Grant additional permissions for DLQ processing
      lambdaConstruct.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'sqs:GetQueueAttributes',
            'sqs:ChangeMessageVisibility'
          ],
          resources: [sqsQueueConstruct.queueArn],
          conditions: {
            'StringEquals': {
              'aws:SecureTransport': 'true'
            }
          }
        })
      );
    }
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
      environmentVariables: this.buildEnvironmentVariables(target, directive, rdsConstruct)
    };
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
    const { source, target, directive } = context;

    // 1. Get the REAL L2 construct handles from the component instances
    const lambdaConstruct = source.getConstruct('main') as lambda.Function;
    const s3Construct = target.getConstruct('main') as s3.Bucket;

    if (!lambdaConstruct || !s3Construct) {
      throw new Error(`Could not retrieve construct handles for binding ${source.spec.name} -> ${target.spec.name}`);
    }
    
    // 2. Use high-level L2 methods to grant S3 access directly
    this.grantS3Access(s3Construct, lambdaConstruct, directive.access);

    // 3. Handle advanced options like KMS encryption
    if (directive.options?.kmsEncryption) {
      this.enableKMSEncryption(s3Construct, lambdaConstruct, context);
    }

    // 4. Apply compliance-specific security enhancements
    if (context.complianceFramework.startsWith('fedramp')) {
      this.applyS3FedRAMPSecurityEnhancements(s3Construct, lambdaConstruct, context);
    }

    // 5. Return environment variables (the main output now that constructs are wired directly)
    return {
      environmentVariables: this.buildS3EnvironmentVariables(directive, s3Construct)
    };
  }




  /**
   * Grant Lambda access to S3 bucket using CDK L2 methods
   */
  private grantS3Access(
    s3Construct: s3.Bucket, 
    lambdaConstruct: lambda.Function, 
    access: string
  ): void {
    switch (access) {
      case 'read':
        // Grant Lambda permission to read objects from S3 bucket
        s3Construct.grantRead(lambdaConstruct);
        break;
      case 'write':
        // Grant Lambda permission to write objects to S3 bucket
        s3Construct.grantWrite(lambdaConstruct);
        break;
      case 'readwrite':
        // Grant Lambda full read/write access to S3 bucket
        s3Construct.grantReadWrite(lambdaConstruct);
        break;
      case 'admin':
        // Grant Lambda administrative access to S3 bucket
        s3Construct.grantReadWrite(lambdaConstruct);
        // Additional admin permissions for bucket management
        lambdaConstruct.addToRolePolicy(
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              's3:GetBucketVersioning',
              's3:PutBucketVersioning',
              's3:GetBucketPolicy',
              's3:PutBucketPolicy',
              's3:GetBucketLocation'
            ],
            resources: [s3Construct.bucketArn]
          })
        );
        break;
      default:
        throw new Error(`Invalid access level: ${access}. Valid values: read, write, readwrite, admin`);
    }
  }

  /**
   * Enable KMS encryption for S3 operations using CDK methods
   */
  private enableKMSEncryption(
    s3Construct: s3.Bucket,
    lambdaConstruct: lambda.Function,
    context: BindingContext
  ): void {
    // Grant Lambda permission to use KMS key for S3 encryption
    const kmsKeyArn = context.directive.options?.kmsKeyId || 'alias/aws/s3';
    
    lambdaConstruct.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'kms:Decrypt',
          'kms:DescribeKey',
          'kms:Encrypt',
          'kms:GenerateDataKey',
          'kms:GenerateDataKeyWithoutPlaintext',
          'kms:ReEncryptFrom',
          'kms:ReEncryptTo'
        ],
        resources: [kmsKeyArn],
        conditions: {
          'StringEquals': {
            'kms:ViaService': `s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`
          }
        }
      })
    );
  }

  /**
   * Apply FedRAMP-specific security enhancements for S3 using CDK
   */
  private applyS3FedRAMPSecurityEnhancements(
    s3Construct: s3.Bucket,
    lambdaConstruct: lambda.Function,
    context: BindingContext
  ): void {
    // Add enhanced S3 monitoring permissions for FedRAMP compliance
    lambdaConstruct.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetBucketLogging',
          's3:GetBucketNotification',
          's3:GetBucketVersioning',
          's3:ListAllMyBuckets'
        ],
        resources: ['*'], // These actions require wildcard resource
        conditions: {
          'StringEquals': {
            'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1',
            'aws:SecureTransport': 'true'
          }
        }
      })
    );

    // Additional FedRAMP High restrictions
    if (context.complianceFramework === 'fedramp-high') {
      // Restrict to specific object prefix
      const allowedPrefix = context.directive.options?.objectPrefix || `${context.source.spec.name}/*`;
      
      lambdaConstruct.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.DENY,
          actions: ['s3:*'],
          resources: [`${s3Construct.bucketArn}/*`],
          conditions: {
            'StringNotLike': {
              's3:prefix': allowedPrefix
            }
          }
        })
      );
    }
  }

  /**
   * Build environment variables with tokenized values directly from CDK constructs
   */
  private buildS3EnvironmentVariables(
    directive: any,
    s3Construct: s3.Bucket
  ): Record<string, string> {
    return {
      [directive.env?.bucketName || 'BUCKET_NAME']: s3Construct.bucketName,
      [directive.env?.bucketArn || 'BUCKET_ARN']: s3Construct.bucketArn
    };
  }
}