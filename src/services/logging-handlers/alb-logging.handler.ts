/**
 * Application Load Balancer Logging Handler
 * 
 * Implements logging infrastructure for ALB components according to
 * Platform Structured Logging Standard v1.0.
 * 
 * Features:
 * - Creates compliance-aware S3 bucket for ALB access logs
 * - Configures proper retention based on compliance framework (1yr/3yr/7yr)
 * - Sets up encryption (S3-managed vs customer-managed KMS)
 * - Applies security classification tags
 * - Configures ALB access logging with structured format
 * - Sets up CloudWatch log streams for ALB events
 */

import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { IComponent } from '../../platform/contracts/component-interfaces';
import { PlatformServiceContext } from '../../platform/contracts/platform-services';
import { 
  ILoggingHandler, 
  LoggingHandlerResult,
  PlatformLoggerConfig,
  LogSecurityConfig 
} from '../../platform/contracts/logging-interfaces';

/**
 * Logging handler for Application Load Balancer components
 * Supports: application-load-balancer
 */
export class AlbLoggingHandler implements ILoggingHandler {
  public readonly componentType = 'application-load-balancer';

  /**
   * Apply comprehensive logging infrastructure to an Application Load Balancer
   */
  public apply(component: IComponent, context: PlatformServiceContext): LoggingHandlerResult {
    try {
      // Get the ALB from the component
      const loadBalancer = component.getConstruct('loadBalancer') as elbv2.ApplicationLoadBalancer | undefined;
      if (!loadBalancer) {
        return {
          success: false,
          retentionDays: 0,
          encryption: { enabled: false, managedKey: true },
          classification: 'internal',
          error: 'ALB component has no loadBalancer construct registered'
        };
      }

      // Create compliance-aware S3 bucket for access logs
      const accessLogsBucket = this.createAccessLogsBucket(component, context);
      
      // Configure ALB access logging
      this.configureAlbAccessLogging(loadBalancer, accessLogsBucket, context);
      
      // Create CloudWatch Log Group for ALB events (connection logs, error logs)
      const logGroup = this.createAlbLogGroup(component, context);
      
      // Generate structured logging configuration
      const loggerConfig = this.generateAlbLoggerConfig(
        component.node.id,
        logGroup.logGroupName,
        context
      );
      
      // Apply security classification and compliance tags
      const classification = this.determineSecurityClassification(context);
      this.applySecurityClassificationTags(accessLogsBucket, logGroup, classification, context);
      
      const retentionDays = this.getRetentionDays(context);
      
      return {
        success: true,
        logGroupArn: logGroup.logGroupArn,
        retentionDays,
        encryption: {
          enabled: true,
          managedKey: context.complianceFramework === 'commercial',
          kmsKeyId: this.getEncryptionKey(component, context)?.keyArn
        },
        classification,
        metadata: {
          accessLogsBucket: accessLogsBucket.bucketName,
          logGroupName: logGroup.logGroupName,
          structured: true,
          albAccessLogsEnabled: true,
          complianceRetention: this.getComplianceRetentionDescription(context)
        }
      };
    } catch (error) {
      return {
        success: false,
        retentionDays: 0,
        encryption: { enabled: false, managedKey: true },
        classification: 'internal',
        error: `Failed to configure ALB logging: ${(error as Error).message}`
      };
    }
  }

  /**
   * Create compliance-aware S3 bucket for ALB access logs
   */
  private createAccessLogsBucket(component: IComponent, context: PlatformServiceContext): s3.Bucket {
    const bucketName = `${context.serviceName}-${component.node.id}-access-logs`;
    
    // Create KMS key for encryption if required for compliance
    let encryptionConfig: s3.BucketEncryption;
    let encryptionKey: kms.IKey | undefined;

    if (context.complianceFramework !== 'commercial') {
      // FedRAMP requires customer-managed KMS encryption
      encryptionKey = new kms.Key(component, `${component.node.id}AccessLogsEncryptionKey`, {
        description: `Encryption key for ALB access logs bucket ${bucketName}`,
        enableKeyRotation: true,
        alias: `alias/alb-access-logs/${context.serviceName}/${component.node.id}`
      });
      encryptionConfig = s3.BucketEncryption.KMS;
    } else {
      // Commercial uses S3-managed encryption for cost optimization
      encryptionConfig = s3.BucketEncryption.S3_MANAGED;
    }

    // Create S3 bucket with compliance configuration
    const bucket = new s3.Bucket(component, `${component.node.id}AccessLogsBucket`, {
      bucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: encryptionConfig,
      encryptionKey,
      lifecycleRules: [
        {
          id: 'AccessLogsRetention',
          enabled: true,
          expiration: cdk.Duration.days(this.getRetentionDays(context)),
          transitions: context.complianceFramework !== 'commercial' ? [
            {
              storageClass: s3.StorageClass.STANDARD_INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30)
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90)
            },
            {
              storageClass: s3.StorageClass.DEEP_ARCHIVE,
              transitionAfter: cdk.Duration.days(365)
            }
          ] : []
        }
      ],
      removalPolicy: context.complianceFramework !== 'commercial' ? 
        cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      versioned: context.complianceFramework !== 'commercial' // Enable versioning for compliance
    });

    // Grant ALB service access to write access logs
    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('elasticloadbalancing.amazonaws.com')],
        actions: ['s3:PutObject'],
        resources: [`${bucket.bucketArn}/AWSLogs/${context.account}/*`],
        conditions: {
          StringEquals: {
            's3:x-amz-acl': 'bucket-owner-full-control'
          }
        }
      })
    );

    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('elasticloadbalancing.amazonaws.com')],
        actions: ['s3:PutObject'],
        resources: [bucket.bucketArn]
      })
    );

    return bucket;
  }

  /**
   * Configure ALB access logging to S3 bucket
   */
  private configureAlbAccessLogging(
    loadBalancer: elbv2.ApplicationLoadBalancer, 
    bucket: s3.Bucket,
    context: PlatformServiceContext
  ): void {
    const logPrefix = `alb-access-logs/${context.serviceName}/${loadBalancer.node.id}`;
    
    // Enable access logs with compliance-appropriate prefix structure
    loadBalancer.logAccessLogs(bucket, logPrefix);
    
    context.logger.info('Configured ALB access logging', {
      service: 'AlbLoggingHandler',
      bucketName: bucket.bucketName,
      logPrefix,
      complianceFramework: context.complianceFramework,
      retention: `${this.getRetentionDays(context)} days`
    });
  }

  /**
   * Create CloudWatch Log Group for ALB events
   */
  private createAlbLogGroup(component: IComponent, context: PlatformServiceContext): logs.LogGroup {
    const logGroupName = `/platform/${context.serviceName}/alb/${component.node.id}`;
    
    // Create KMS key for log group encryption if required
    let encryptionKey: kms.IKey | undefined;
    if (context.complianceFramework !== 'commercial') {
      encryptionKey = new kms.Key(component, `${component.node.id}LogGroupEncryptionKey`, {
        description: `Encryption key for ALB log group ${logGroupName}`,
        enableKeyRotation: true,
        alias: `alias/logs/alb/${context.serviceName}/${component.node.id}`
      });
    }

    // Create log group with compliance configuration
    const logGroup = new logs.LogGroup(component, `${component.node.id}LogGroup`, {
      logGroupName,
      retention: this.mapRetentionDays(this.getRetentionDays(context)),
      encryptionKey,
      removalPolicy: context.complianceFramework !== 'commercial' ? 
        cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    return logGroup;
  }

  /**
   * Generate platform logger configuration for ALB instrumentation
   */
  private generateAlbLoggerConfig(
    componentName: string,
    logGroupName: string,
    context: PlatformServiceContext
  ): PlatformLoggerConfig {
    const classification = this.determineSecurityClassification(context);
    const maxSamplingRate = context.complianceFramework === 'commercial' ? 0.1 : 1.0;
    
    return {
      name: `${context.serviceName}.alb.${componentName}`,
      level: context.complianceFramework === 'commercial' ? 'INFO' : 'DEBUG',
      logGroup: logGroupName,
      streamPrefix: `alb/${componentName}`,
      sampling: {
        'ERROR': 1.0,   // 100% of error logs
        'WARN': 1.0,    // 100% of warning logs  
        'INFO': maxSamplingRate,
        'DEBUG': maxSamplingRate * 0.1,
        'TRACE': maxSamplingRate * 0.01
      },
      security: {
        classification,
        piiRedactionRequired: context.complianceFramework !== 'commercial',
        securityMonitoring: context.complianceFramework !== 'commercial',
        redactionRules: this.getRedactionRules(classification),
        securityAlertsEnabled: context.complianceFramework !== 'commercial'
      },
      asyncBatching: true,
      correlationFields: [
        'traceId',
        'spanId', 
        'requestId',
        'loadBalancerArn',
        'targetGroupArn',
        'clientIp',
        'userAgent'
      ]
    };
  }

  /**
   * Apply security classification tags to logging resources
   */
  private applySecurityClassificationTags(
    bucket: s3.Bucket,
    logGroup: logs.LogGroup,
    classification: LogSecurityConfig['classification'],
    context: PlatformServiceContext
  ): void {
    const tags = {
      'log-classification': classification,
      'compliance-framework': context.complianceFramework,
      'retention-days': this.getRetentionDays(context).toString(),
      'encryption-level': context.complianceFramework === 'commercial' ? 'standard' : 'customer-managed',
      'resource-type': 'alb-logging',
      'audit-required': (context.complianceFramework !== 'commercial').toString()
    };

    // Apply tags to S3 bucket
    Object.entries(tags).forEach(([key, value]) => {
      cdk.Tags.of(bucket).add(key, value);
    });

    // Apply tags to log group
    Object.entries(tags).forEach(([key, value]) => {
      cdk.Tags.of(logGroup).add(key, value);
    });
  }

  /**
   * Get retention days based on compliance framework
   */
  private getRetentionDays(context: PlatformServiceContext): number {
    switch (context.complianceFramework) {
      case 'fedramp-high':
        return 2555; // 7 years
      case 'fedramp-moderate':
        return 1095; // 3 years
      default:
        return 365;  // 1 year
    }
  }

  /**
   * Get compliance retention description
   */
  private getComplianceRetentionDescription(context: PlatformServiceContext): string {
    switch (context.complianceFramework) {
      case 'fedramp-high':
        return '7-year retention with immutable storage';
      case 'fedramp-moderate':
        return '3-year retention with enhanced security';
      default:
        return '1-year retention cost-optimized';
    }
  }

  /**
   * Determine security classification based on compliance framework
   */
  private determineSecurityClassification(context: PlatformServiceContext): LogSecurityConfig['classification'] {
    switch (context.complianceFramework) {
      case 'fedramp-high':
        return 'cui'; // Controlled Unclassified Information
      case 'fedramp-moderate':
        return 'cui';
      default:
        return 'internal';
    }
  }

  /**
   * Get encryption key if customer-managed encryption is required
   */
  private getEncryptionKey(component: IComponent, context: PlatformServiceContext): kms.IKey | undefined {
    if (context.complianceFramework === 'commercial') {
      return undefined;
    }
    
    // For FedRAMP, return the KMS key that should have been created
    return component.node.findChild(`${component.node.id}AccessLogsEncryptionKey`) as kms.Key | undefined;
  }

  /**
   * Get PII redaction rules based on classification level
   */
  private getRedactionRules(classification: LogSecurityConfig['classification']): string[] {
    const baseRules = [
      'email',
      'ipAddress',
      'userAgent',
      'sessionId'
    ];

    switch (classification) {
      case 'cui':
        return [
          ...baseRules,
          'governmentId',
          'contractorInfo',
          'securityClearance'
        ];
      
      default:
        return baseRules;
    }
  }

  /**
   * Map retention days to CloudWatch LogGroup retention enum
   */
  private mapRetentionDays(days: number): logs.RetentionDays {
    if (days <= 1) return logs.RetentionDays.ONE_DAY;
    if (days <= 3) return logs.RetentionDays.THREE_DAYS;
    if (days <= 5) return logs.RetentionDays.FIVE_DAYS;
    if (days <= 7) return logs.RetentionDays.ONE_WEEK;
    if (days <= 14) return logs.RetentionDays.TWO_WEEKS;
    if (days <= 30) return logs.RetentionDays.ONE_MONTH;
    if (days <= 60) return logs.RetentionDays.TWO_MONTHS;
    if (days <= 90) return logs.RetentionDays.THREE_MONTHS;
    if (days <= 120) return logs.RetentionDays.FOUR_MONTHS;
    if (days <= 150) return logs.RetentionDays.FIVE_MONTHS;
    if (days <= 180) return logs.RetentionDays.SIX_MONTHS;
    if (days <= 365) return logs.RetentionDays.ONE_YEAR;
    if (days <= 400) return logs.RetentionDays.THIRTEEN_MONTHS;
    if (days <= 545) return logs.RetentionDays.EIGHTEEN_MONTHS;
    if (days <= 730) return logs.RetentionDays.TWO_YEARS;
    if (days <= 1095) return logs.RetentionDays.THREE_YEARS;
    if (days <= 1827) return logs.RetentionDays.FIVE_YEARS;
    if (days <= 2192) return logs.RetentionDays.SIX_YEARS;
    if (days <= 2555) return logs.RetentionDays.SEVEN_YEARS;
    if (days <= 2922) return logs.RetentionDays.EIGHT_YEARS;
    if (days <= 3287) return logs.RetentionDays.NINE_YEARS;
    
    return logs.RetentionDays.TEN_YEARS;
  }
}
