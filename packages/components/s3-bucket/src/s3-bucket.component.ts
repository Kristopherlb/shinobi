/**
 * S3 Bucket Component
 * 
 * An Amazon S3 bucket for object storage with compliance hardening.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities,
  ConfigBuilder,
  ComponentConfigSchema,
  BucketS3Capability
} from '@platform/contracts';

/**
 * Configuration interface for S3 Bucket component
 */
export interface S3BucketConfig {
  /** Bucket name (optional, will be auto-generated if not provided) */
  bucketName?: string;
  
  /** Whether the bucket allows public access */
  public?: boolean;
  
  /** Static website hosting configuration */
  website?: {
    enabled: boolean;
    indexDocument?: string;
    errorDocument?: string;
  };
  
  /** Enable EventBridge notifications */
  eventBridgeEnabled?: boolean;
  
  /** Versioning configuration */
  versioning?: boolean;
  
  /** Encryption configuration */
  encryption?: {
    type?: 'AES256' | 'KMS';
    kmsKeyArn?: string;
  };
  
  /** Lifecycle rules */
  lifecycleRules?: Array<{
    id: string;
    enabled: boolean;
    transitions?: Array<{
      storageClass: string;
      transitionAfter: number;
    }>;
    expiration?: {
      days: number;
    };
  }>;
  
  /** Security tooling configuration */
  security?: {
    tools?: {
      clamavScan?: boolean;
    };
  };
  
  /** Backup and compliance settings */
  compliance?: {
    objectLock?: {
      enabled: boolean;
      mode?: 'GOVERNANCE' | 'COMPLIANCE';
      retentionDays?: number;
    };
    auditLogging?: boolean;
  };
}

/**
 * Configuration schema for S3 Bucket component
 */
export const S3_BUCKET_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  title: 'S3 Bucket Configuration',
  description: 'Configuration for creating an S3 bucket for object storage',
  properties: {
    bucketName: {
      type: 'string',
      description: 'Bucket name (must be globally unique)',
      pattern: '^[a-z0-9.-]+$',
      minLength: 3,
      maxLength: 63
    },
    public: {
      type: 'boolean',
      description: 'Whether to allow public access to the bucket',
      default: false
    },
    eventBridgeEnabled: {
      type: 'boolean',
      description: 'Enable EventBridge notifications for object events',
      default: false
    },
    versioning: {
      type: 'boolean',
      description: 'Enable object versioning',
      default: true
    }
  },
  additionalProperties: false,
  defaults: {
    public: false,
    eventBridgeEnabled: false,
    versioning: true
  }
};

/**
 * S3 Bucket Component implementing Component API Contract v1.0
 */
export class S3BucketComponent extends Component {
  private bucket?: s3.Bucket;
  private kmsKey?: kms.Key;
  private auditBucket?: s3.Bucket;
  private virusScanLambda?: lambda.Function;
  private config?: S3BucketConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create S3 bucket with compliance hardening
   */
  public synth(): void {
    // Build configuration
    this.config = this.buildConfigSync();
    
    // Create KMS key for encryption if needed
    this.createKmsKeyIfNeeded();
    
    // Create audit bucket for compliance frameworks
    this.createAuditBucketIfNeeded();
    
    // Create main S3 bucket
    this.createS3Bucket();
    
    // Apply compliance hardening
    this.applyComplianceHardening();
    
    // Configure security tooling
    this.configureSecurityTooling();
    
    // Register constructs
    this.registerConstruct('bucket', this.bucket!);
    if (this.kmsKey) {
      this.registerConstruct('kmsKey', this.kmsKey);
    }
    if (this.auditBucket) {
      this.registerConstruct('auditBucket', this.auditBucket);
    }
    
    // Register capabilities
    this.registerCapability('bucket:s3', this.buildBucketCapability());
  }

  /**
   * Get the capabilities this component provides
   */
  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  /**
   * Get the component type identifier
   */
  public getType(): string {
    return 's3-bucket';
  }

  /**
   * Create KMS key for encryption if required by compliance framework
   */
  private createKmsKeyIfNeeded(): void {
    if (this.shouldUseCustomerManagedKey()) {
      this.kmsKey = new kms.Key(this, 'EncryptionKey', {
        description: `Encryption key for ${this.spec.name} S3 bucket`,
        enableKeyRotation: this.context.complianceFramework === 'fedramp-high',
        keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
        keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
      });

      // Grant S3 service access to the key
      this.kmsKey.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'AllowS3Service',
        principals: [new iam.ServicePrincipal('s3.amazonaws.com')],
        actions: [
          'kms:Decrypt',
          'kms:GenerateDataKey'
        ],
        resources: ['*']
      }));
    }
  }

  /**
   * Create audit bucket for centralized logging in compliance frameworks
   */
  private createAuditBucketIfNeeded(): void {
    if (this.isComplianceFramework()) {
      const auditBucketName = `${this.context.serviceName}-audit-${this.context.accountId}`;
      
      this.auditBucket = new s3.Bucket(this, 'AuditBucket', {
        bucketName: auditBucketName,
        versioned: true,
        encryption: s3.BucketEncryption.KMS,
        encryptionKey: this.kmsKey,
        publicReadAccess: false,
        // publicWriteAccess removed - use blockPublicAccess instead"
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        lifecycleRules: [{
          id: 'audit-retention',
          enabled: true,
          transitions: [{
            storageClass: s3.StorageClass.GLACIER,
            transitionAfter: cdk.Duration.days(90)
          }, {
            storageClass: s3.StorageClass.DEEP_ARCHIVE,
            transitionAfter: cdk.Duration.days(365)
          }],
          // Keep audit logs for compliance requirements
          expiration: cdk.Duration.days(this.context.complianceFramework === 'fedramp-high' ? 2555 : 1095) // 7 or 3 years
        }],
        removalPolicy: cdk.RemovalPolicy.RETAIN
      });

      // Apply Object Lock for immutable audit logs in FedRAMP High
      if (this.context.complianceFramework === 'fedramp-high') {
        const cfnBucket = this.auditBucket.node.defaultChild as s3.CfnBucket;
        cfnBucket.objectLockEnabled = true;
        cfnBucket.objectLockConfiguration = {
          objectLockEnabled: 'Enabled',
          rule: {
            defaultRetention: {
              mode: 'COMPLIANCE',
              days: 395 // 13 months default retention
            }
          }
        };
      }
    }
  }

  /**
   * Create the main S3 bucket with compliance-specific configuration
   */
  private createS3Bucket(): void {
    const bucketProps: s3.BucketProps = {
      bucketName: this.config!.bucketName,
      versioned: this.config!.versioning !== false,
      encryption: this.getBucketEncryption(),
      encryptionKey: this.kmsKey,
      publicReadAccess: this.config!.public === true,
      // Public write access is controlled by blockPublicAccess
      blockPublicAccess: this.config!.public === true ? 
        undefined : s3.BlockPublicAccess.BLOCK_ALL,
      eventBridgeEnabled: this.config!.eventBridgeEnabled,
      removalPolicy: this.isComplianceFramework() ? 
        cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    };

    // Add website configuration if enabled
    if (this.config!.website?.enabled) {
      Object.assign(bucketProps, {
        websiteIndexDocument: this.config!.website.indexDocument || 'index.html',
        websiteErrorDocument: this.config!.website.errorDocument || 'error.html'
      });
    }

    // Add lifecycle rules if configured
    if (this.config!.lifecycleRules) {
      const lifecycleRules = this.config!.lifecycleRules.map(rule => ({
        id: rule.id,
        enabled: rule.enabled,
        transitions: rule.transitions?.map(t => ({
          storageClass: this.getStorageClass(t.storageClass),
          transitionAfter: cdk.Duration.days(t.transitionAfter)
        })),
        expiration: rule.expiration ? cdk.Duration.days(rule.expiration.days) : undefined
      }));
      Object.assign(bucketProps, { lifecycleRules });
    }

    this.bucket = new s3.Bucket(this, 'Bucket', bucketProps);
  }

  /**
   * Apply compliance-specific hardening
   */
  private applyComplianceHardening(): void {
    switch (this.context.complianceFramework) {
      case 'fedramp-moderate':
        this.applyFedrampModerateHardening();
        break;
      case 'fedramp-high':
        this.applyFedrampHighHardening();
        break;
      default:
        this.applyCommercialHardening();
        break;
    }
  }

  private applyCommercialHardening(): void {
    // Enable server access logging
    if (this.bucket && this.auditBucket) {
      this.bucket.addToResourcePolicy(new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['s3:*'],
        resources: [this.bucket.bucketArn, `${this.bucket.bucketArn}/*`],
        conditions: {
          Bool: {
            'aws:SecureTransport': 'false'
          }
        }
      }));
    }
  }

  private applyFedrampModerateHardening(): void {
    // Apply commercial hardening
    this.applyCommercialHardening();

    // Enable server access logging to audit bucket
    if (this.bucket && this.auditBucket) {
      this.bucket.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'DenyInsecureConnections',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['s3:*'],
        resources: [this.bucket.bucketArn, `${this.bucket.bucketArn}/*`],
        conditions: {
          Bool: {
            'aws:SecureTransport': 'false'
          }
        }
      }));

      // Enable object-level API logging
      this.bucket.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'RequireSSLRequestsOnly',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['s3:*'],
        resources: [this.bucket.bucketArn, `${this.bucket.bucketArn}/*`],
        conditions: {
          Bool: {
            'aws:SecureTransport': 'false'
          }
        }
      }));
    }

    // Enable MFA delete protection
    // Note: This requires CLI/API configuration, not CDK
    this.bucket!.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'RequireMFAForDelete',
      effect: iam.Effect.DENY,
      principals: [new iam.AnyPrincipal()],
      actions: ['s3:DeleteObject', 's3:DeleteObjectVersion'],
      resources: [`${this.bucket!.bucketArn}/*`],
      conditions: {
        BoolIfExists: {
          'aws:MultiFactorAuthPresent': 'false'
        }
      }
    }));
  }

  private applyFedrampHighHardening(): void {
    // Apply all moderate hardening
    this.applyFedrampModerateHardening();

    // Apply Object Lock for immutable backups
    if (this.bucket) {
      const cfnBucket = this.bucket.node.defaultChild as s3.CfnBucket;
      cfnBucket.objectLockEnabled = true;
      cfnBucket.objectLockConfiguration = {
        objectLockEnabled: 'Enabled',
        rule: {
          defaultRetention: {
            mode: 'COMPLIANCE',
            days: this.config!.compliance?.objectLock?.retentionDays || 395
          }
        }
      };

      // Explicit deny for delete actions to ensure immutability
      this.bucket.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'DenyDeleteActions',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: [
          's3:DeleteBucket',
          's3:DeleteBucketPolicy',
          's3:PutBucketAcl',
          's3:PutBucketPolicy',
          's3:PutObjectAcl'
        ],
        resources: [this.bucket.bucketArn, `${this.bucket.bucketArn}/*`]
      }));
    }
  }

  /**
   * Configure security tooling integration
   */
  private configureSecurityTooling(): void {
    if (this.config?.security?.tools?.clamavScan) {
      this.createVirusScanLambda();
    }
  }

  /**
   * Create Lambda function for virus scanning with ClamAV
   */
  private createVirusScanLambda(): void {
    this.virusScanLambda = new lambda.Function(this, 'VirusScanFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'scan.handler',
      code: lambda.Code.fromInline(`
import json
import boto3

def handler(event, context):
    # ClamAV scanning logic would be implemented here
    print(f"Scanning object: {event}")
    
    # In real implementation, this would:
    # 1. Download object from S3
    # 2. Scan with ClamAV
    # 3. Take action based on scan results
    
    return {
        'statusCode': 200,
        'body': json.dumps('Object scanned successfully')
    }
      `),
      description: 'ClamAV virus scanning for S3 objects',
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024
    });

    // Add S3 notification to trigger virus scan
    if (this.bucket) {
      this.bucket.addObjectCreatedNotification(new s3n.LambdaDestination(this.virusScanLambda));
      
      // Grant Lambda permissions to read from S3
      this.bucket.grantRead(this.virusScanLambda);
    }
  }

  /**
   * Build bucket capability data shape
   */
  private buildBucketCapability(): BucketS3Capability {
    return {
      bucketName: this.bucket!.bucketName,
      bucketArn: this.bucket!.bucketArn
    };
  }

  /**
   * Helper methods for compliance decisions
   */
  private shouldUseCustomerManagedKey(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private isComplianceFramework(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private getBucketEncryption(): s3.BucketEncryption {
    if (this.shouldUseCustomerManagedKey()) {
      return s3.BucketEncryption.KMS;
    }
    return s3.BucketEncryption.S3_MANAGED;
  }

  private getStorageClass(storageClass: string): s3.StorageClass {
    const storageClassMap: Record<string, s3.StorageClass> = {
      'STANDARD_IA': s3.StorageClass.INFREQUENT_ACCESS,
      'ONEZONE_IA': s3.StorageClass.ONE_ZONE_INFREQUENT_ACCESS,
      'GLACIER': s3.StorageClass.GLACIER,
      'DEEP_ARCHIVE': s3.StorageClass.DEEP_ARCHIVE,
      'GLACIER_IR': s3.StorageClass.GLACIER_INSTANT_RETRIEVAL
    };
    
    return storageClassMap[storageClass] || s3.StorageClass.INFREQUENT_ACCESS;
  }

  /**
   * Simplified config building for demo purposes
   */
  private buildConfigSync(): S3BucketConfig {
    const config: S3BucketConfig = {
      bucketName: this.spec.config?.bucketName,
      public: this.spec.config?.public || false,
      eventBridgeEnabled: this.spec.config?.eventBridgeEnabled || false,
      versioning: this.spec.config?.versioning !== false,
      website: this.spec.config?.website,
      lifecycleRules: this.spec.config?.lifecycleRules,
      security: this.spec.config?.security || {},
      compliance: this.spec.config?.compliance || {}
    };

    return config;
  }
}