/**
 * S3 Bucket Component
 *
 * Creates an Amazon S3 bucket that honours the platform configuration
 * precedence chain and applies optional security and compliance controls
 * defined in the manifest and segregated /config defaults.
 */

import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  BaseComponent,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@shinobi/core';
import {
  S3BucketConfig,
  S3BucketComponentConfigBuilder
} from './s3-bucket.builder';

export class S3BucketComponent extends BaseComponent {
  private bucket?: s3.Bucket;
  private kmsKey?: kms.IKey;
  private managedKmsKey?: kms.Key;
  private auditBucket?: s3.Bucket;
  private config?: S3BucketConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    const configBuilder = new S3BucketComponentConfigBuilder({
      context: this.context,
      spec: this.spec
    });

    this.config = configBuilder.buildSync();

    this.createKmsKeyIfNeeded();
    this.createAuditBucketIfNeeded();
    this.createS3Bucket();
    this.applyBucketSecurityPolicies();
    this.configureObjectLock();
    this.configureSecurityTooling();
    this.configureMonitoring();

    this.registerConstruct('main', this.bucket!);
    this.registerConstruct('bucket', this.bucket!);

    if (this.managedKmsKey) {
      this.registerConstruct('kmsKey', this.managedKmsKey);
    }
    if (this.auditBucket) {
      this.registerConstruct('auditBucket', this.auditBucket);
    }
    this.registerCapability('bucket:s3', this.buildBucketCapability());
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 's3-bucket';
  }

  private createKmsKeyIfNeeded(): void {
    this.kmsKey = undefined;
    this.managedKmsKey = undefined;

    if (this.config?.encryption?.type !== 'KMS') {
      return;
    }

    if (this.config.encryption?.kmsKeyArn) {
      this.kmsKey = kms.Key.fromKeyArn(this, 'ImportedEncryptionKey', this.config.encryption.kmsKeyArn);
      return;
    }

    const key = new kms.Key(this, 'EncryptionKey', {
      description: `Encryption key for ${this.spec.name} S3 bucket`,
      enableKeyRotation: true,
      keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
      keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
    });

    this.applyStandardTags(key, {
      'encryption-type': 'customer-managed',
      'resource-type': 's3-bucket-encryption'
    });

    key.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'AllowS3ServiceUse',
      principals: [new iam.ServicePrincipal('s3.amazonaws.com')],
      actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
      resources: ['*']
    }));

    this.kmsKey = key;
    this.managedKmsKey = key;
  }

  private createAuditBucketIfNeeded(): void {
    const compliance = this.config?.compliance;
    if (!compliance?.auditLogging) {
      return;
    }

    const baseBucketName = compliance.auditBucketName ?? this.buildAuditBucketName();
    const retentionDays = compliance.auditBucketRetentionDays ?? 365;
    const auditLifecycleRules = (compliance.auditBucketLifecycleRules ?? []).map(rule => ({
      id: rule.id,
      enabled: rule.enabled,
      transitions: rule.transitions?.map(transition => ({
        storageClass: this.getStorageClass(transition.storageClass),
        transitionAfter: cdk.Duration.days(transition.transitionAfter)
      })),
      expiration: rule.expiration?.days
        ? cdk.Duration.days(rule.expiration.days)
        : undefined
    }));

    this.auditBucket = new s3.Bucket(this, 'AuditBucket', {
      bucketName: baseBucketName,
      versioned: true,
      encryption: this.getBucketEncryption(),
      encryptionKey: this.kmsKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: auditLifecycleRules.length
        ? auditLifecycleRules
        : [
            {
              id: 'audit-retention',
              enabled: true,
              transitions: [
                {
                  storageClass: s3.StorageClass.GLACIER,
                  transitionAfter: cdk.Duration.days(90)
                },
                {
                  storageClass: s3.StorageClass.DEEP_ARCHIVE,
                  transitionAfter: cdk.Duration.days(365)
                }
              ],
              expiration: cdk.Duration.days(retentionDays)
            }
          ]
    });

    this.applyStandardTags(this.auditBucket, {
      'bucket-type': 'audit',
      'retention-days': retentionDays.toString()
    });

    if (compliance.auditBucketObjectLock?.enabled) {
      const cfnAuditBucket = this.auditBucket.node.defaultChild as s3.CfnBucket;
      cfnAuditBucket.objectLockEnabled = true;
      cfnAuditBucket.objectLockConfiguration = {
        objectLockEnabled: 'Enabled',
        rule: {
          defaultRetention: {
            mode: compliance.auditBucketObjectLock.mode ?? 'COMPLIANCE',
            days: compliance.auditBucketObjectLock.retentionDays ?? retentionDays
          }
        }
      };
    }
  }

  private createS3Bucket(): void {
    this.ensureObjectLockPreconditions();

    const baseProps: s3.BucketProps = {
      ...(this.config?.bucketName ? { bucketName: this.config.bucketName } : {}),
      versioned: this.config?.versioning ?? false,
      encryption: this.getBucketEncryption(),
      encryptionKey: this.kmsKey,
      publicReadAccess: this.config?.public === true,
      blockPublicAccess:
        this.config?.public === true || this.config?.security?.blockPublicAccess === false
          ? undefined
          : s3.BlockPublicAccess.BLOCK_ALL,
      eventBridgeEnabled: this.config?.eventBridgeEnabled === true,
      removalPolicy:
        this.config?.compliance?.auditLogging || this.config?.compliance?.objectLock?.enabled
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY
    };

    const websiteProps = this.config?.website?.enabled
      ? {
        websiteIndexDocument: this.config.website.indexDocument ?? 'index.html',
        websiteErrorDocument: this.config.website.errorDocument ?? 'error.html'
      }
      : {};

    const lifecycleProps = this.config?.lifecycleRules?.length
      ? {
        lifecycleRules: this.config.lifecycleRules.map(rule => ({
          id: rule.id,
          enabled: rule.enabled,
          transitions: rule.transitions?.map(transition => ({
            storageClass: this.getStorageClass(transition.storageClass),
            transitionAfter: cdk.Duration.days(transition.transitionAfter)
          })),
          expiration: rule.expiration?.days
            ? cdk.Duration.days(rule.expiration.days)
            : undefined
        }))
      }
      : {};

    const loggingProps = this.config?.compliance?.auditLogging && this.auditBucket
      ? {
        serverAccessLogsBucket: this.auditBucket,
        serverAccessLogsPrefix: `logs/${this.spec.name}/`
      }
      : {};

    const bucketProps: s3.BucketProps = {
      ...baseProps,
      ...websiteProps,
      ...lifecycleProps,
      ...loggingProps
    };

    this.bucket = new s3.Bucket(this, 'Bucket', bucketProps);

    this.applyStandardTags(this.bucket, {
      'bucket-type': 'primary',
      'public-access': (this.config?.public === true).toString(),
      'versioning': (this.config?.versioning ?? false).toString()
    });
  }

  private applyBucketSecurityPolicies(): void {
    if (!this.bucket) {
      return;
    }

    if (this.config?.security?.requireSecureTransport !== false) {
      this.bucket.addToResourcePolicy(
        new iam.PolicyStatement({
          sid: 'DenyInsecureTransport',
          effect: iam.Effect.DENY,
          principals: [new iam.AnyPrincipal()],
          actions: ['s3:*'],
          resources: [this.bucket.bucketArn, `${this.bucket.bucketArn}/*`],
          conditions: {
            Bool: {
              'aws:SecureTransport': 'false'
            }
          }
        })
      );
    }

    if (this.config?.security?.requireMfaDelete) {
      this.bucket.addToResourcePolicy(
        new iam.PolicyStatement({
          sid: 'RequireMFAForDelete',
          effect: iam.Effect.DENY,
          principals: [new iam.AnyPrincipal()],
          actions: ['s3:DeleteObject', 's3:DeleteObjectVersion'],
          resources: [`${this.bucket.bucketArn}/*`],
          conditions: {
            BoolIfExists: {
              'aws:MultiFactorAuthPresent': 'false'
            }
          }
        })
      );
    }

    if (this.config?.security?.denyDeleteActions) {
      this.bucket.addToResourcePolicy(
        new iam.PolicyStatement({
          sid: 'DenyDeleteActions',
          effect: iam.Effect.DENY,
          principals: [new iam.AnyPrincipal()],
          actions: ['s3:DeleteBucket', 's3:DeleteBucketPolicy'],
          resources: [this.bucket.bucketArn, `${this.bucket.bucketArn}/*`]
        })
      );
    }
  }

  private configureObjectLock(): void {
    if (!this.bucket || !this.config?.compliance?.objectLock?.enabled) {
      return;
    }

    const retention = this.config.compliance.objectLock.retentionDays ?? 365;
    const mode = this.config.compliance.objectLock.mode ?? 'COMPLIANCE';

    const cfnBucket = this.bucket.node.defaultChild as s3.CfnBucket;
    cfnBucket.objectLockEnabled = true;
    cfnBucket.objectLockConfiguration = {
      objectLockEnabled: 'Enabled',
      rule: {
        defaultRetention: {
          mode,
          days: retention
        }
      }
    };
  }

  private configureSecurityTooling(): void {
    if (this.config?.security?.tools?.clamavScan) {
      throw new Error('S3BucketComponent: ClamAV scanning is not implemented. Disable security.tools.clamavScan or integrate the dedicated virus scanning component.');
    }
  }

  private configureMonitoring(): void {
    if (!this.config?.monitoring?.enabled || !this.bucket) {
      return;
    }

    const bucketName = this.bucket.bucketName;
    const requestMetricDimensions = {
      BucketName: bucketName,
      FilterId: 'EntireBucket'
    };
    this.bucket.addMetric({ id: 'EntireBucket' });
    const clientThreshold = this.config.monitoring.clientErrorThreshold ?? 10;
    const serverThreshold = this.config.monitoring.serverErrorThreshold ?? 1;

    const clientErrorsAlarm = new cloudwatch.Alarm(this, 'S3ClientErrorsAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-client-errors`,
      alarmDescription: 'Alarm for S3 bucket client (4xx) errors',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/S3',
        metricName: '4xxErrors',
        dimensionsMap: requestMetricDimensions,
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: clientThreshold,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.applyStandardTags(clientErrorsAlarm, {
      'alarm-type': 'client-errors',
      'threshold': clientThreshold.toString()
    });

    const serverErrorsAlarm = new cloudwatch.Alarm(this, 'S3ServerErrorsAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-server-errors`,
      alarmDescription: 'Alarm for S3 bucket server (5xx) errors',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/S3',
        metricName: '5xxErrors',
        dimensionsMap: requestMetricDimensions,
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: serverThreshold,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.applyStandardTags(serverErrorsAlarm, {
      'alarm-type': 'server-errors',
      'threshold': serverThreshold.toString()
    });

    this.logComponentEvent('observability_configured', 'Monitoring enabled for S3 bucket', {
      bucketName,
      alarmsCreated: 2,
      clientThreshold,
      serverThreshold
    });
  }

  private buildBucketCapability(): Record<string, any> {
    return {
      bucketName: this.bucket!.bucketName,
      bucketArn: this.bucket!.bucketArn,
      encryption: this.config?.encryption?.type ?? 'AES256'
    };
  }

  private ensureObjectLockPreconditions(): void {
    const objectLockConfig = this.config?.compliance?.objectLock;
    if (objectLockConfig?.enabled && this.config?.versioning !== true) {
      throw new Error('S3BucketComponent: objectLock.enabled requires versioning to be true. Update the manifest or configuration defaults to enable versioning.');
    }
  }

  private getBucketEncryption(): s3.BucketEncryption {
    return this.config?.encryption?.type === 'KMS'
      ? s3.BucketEncryption.KMS
      : s3.BucketEncryption.S3_MANAGED;
  }

  private buildAuditBucketName(): string {
    const account = this.context.accountId ?? (this.context as any).account ?? 'unknown-account';
    const environment = this.context.environment ?? 'env';
    const parts = [
      this.context.serviceName,
      this.spec.name,
      environment,
      'audit',
      account
    ];

    const normalized = parts
      .map(part => part?.toString().trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'))
      .filter(part => part && part.length > 0) as string[];

    let candidate = normalized.join('-').replace(/-+/g, '-');
    candidate = candidate.replace(/^-+/, '').replace(/-+$/, '');

    if (candidate.length < 3) {
      candidate = `audit-${account}`.toLowerCase();
    }

    if (candidate.length > 63) {
      candidate = candidate.slice(0, 63).replace(/-+$/, '');
    }

    if (!/^[a-z0-9]/.test(candidate)) {
      candidate = `a-${candidate}`;
    }

    return candidate;
  }

  private getStorageClass(storageClass: string): s3.StorageClass {
    const mapping: Record<string, s3.StorageClass> = {
      STANDARD_IA: s3.StorageClass.INFREQUENT_ACCESS,
      ONEZONE_IA: s3.StorageClass.ONE_ZONE_INFREQUENT_ACCESS,
      GLACIER: s3.StorageClass.GLACIER,
      DEEP_ARCHIVE: s3.StorageClass.DEEP_ARCHIVE,
      GLACIER_IR: s3.StorageClass.GLACIER_INSTANT_RETRIEVAL
    };

    return mapping[storageClass] ?? s3.StorageClass.INFREQUENT_ACCESS;
  }
}
