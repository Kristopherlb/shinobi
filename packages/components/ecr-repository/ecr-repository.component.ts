/**
 * ECR Repository Component
 * 
 * AWS Elastic Container Registry for secure container image storage and management.
 * Implements platform standards with configuration-driven compliance.
 */

import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BaseComponent } from '../@shinobi/core';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from '../@shinobi/core/component-interfaces';
import { EcrRepositoryConfig, EcrRepositoryComponentConfigBuilder, ECR_REPOSITORY_CONFIG_SCHEMA } from './ecr-repository.builder';


/**
 * ECR Repository Component implementing Component API Contract v1.0
 */
export class EcrRepositoryComponent extends BaseComponent {
  private repository?: ecr.Repository;
  private readonly config: EcrRepositoryConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
    
    // Build configuration only - no synthesis in constructor
    const configBuilder = new EcrRepositoryComponentConfigBuilder({ context, spec });
    this.config = configBuilder.buildSync();
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting ECR Repository component synthesis', {
      repositoryName: this.config.repositoryName,
      scanOnPush: this.config.imageScanningConfiguration?.scanOnPush
    });
    
    const startTime = Date.now();
    
    try {
      this.createRepository();
      this.configureObservabilityForRepository();
    
      this.registerConstruct('repository', this.repository!);
      this.registerCapability('container:ecr', this.buildRepositoryCapability());
    
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('component_synthesis', duration, {
        resourcesCreated: Object.keys(this.capabilities).length
      });
    
      this.logComponentEvent('synthesis_complete', 'ECR Repository component synthesis completed successfully', {
        repositoryCreated: 1,
        scanningEnabled: this.config.imageScanningConfiguration?.scanOnPush,
        encryptionType: this.config.encryption?.encryptionType
      });
      
    } catch (error) {
      this.logError(error as Error, 'component synthesis', {
        componentType: 'ecr-repository',
        stage: 'synthesis'
      });
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'ecr-repository';
  }

  private createRepository(): void {
    const repositoryProps: ecr.RepositoryProps = {
      repositoryName: this.config!.repositoryName,
      imageScanOnPush: this.config!.imageScanningConfiguration?.scanOnPush,
      imageTagMutability: this.mapImageTagMutability(this.config!.imageTagMutability!),
      lifecycleRules: this.buildLifecycleRules(),
      encryption: this.buildEncryptionConfiguration(),
      removalPolicy: this.getRemovalPolicy()
    };

    this.repository = new ecr.Repository(this, 'Repository', repositoryProps);

    this.applyStandardTags(this.repository, {
      'repository-name': this.config!.repositoryName,
      'image-scanning': (this.config!.imageScanningConfiguration?.scanOnPush || false).toString(),
      'tag-mutability': this.config!.imageTagMutability!,
      'encryption-type': this.config!.encryption?.encryptionType || 'AES256'
    });

    if (this.config!.tags) {
      Object.entries(this.config!.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.repository!).add(key, value);
      });
    }
    
    this.logResourceCreation('ecr-repository', this.config!.repositoryName, {
      repositoryName: this.config!.repositoryName,
      scanOnPush: this.config!.imageScanningConfiguration?.scanOnPush,
      encryptionType: this.config!.encryption?.encryptionType,
      tagMutability: this.config!.imageTagMutability
    });
  }

  private mapImageTagMutability(mutability: string): ecr.TagMutability {
    switch (mutability) {
      case 'IMMUTABLE':
        return ecr.TagMutability.IMMUTABLE;
      default:
        return ecr.TagMutability.MUTABLE;
    }
  }

  private buildEncryptionConfiguration(): ecr.RepositoryEncryption {
    if (this.config!.encryption?.encryptionType === 'KMS') {
      return ecr.RepositoryEncryption.KMS;
    }
    return ecr.RepositoryEncryption.AES_256;
  }

  private buildLifecycleRules(): ecr.LifecycleRule[] | undefined {
    if (!this.config!.lifecyclePolicy) {
      return undefined;
    }

    const rules: ecr.LifecycleRule[] = [];

    // Rule for tagged images by count
    if (this.config!.lifecyclePolicy.maxImageCount) {
      rules.push({
        description: 'Keep only the most recent tagged images',
        tagStatus: ecr.TagStatus.TAGGED,
        tagPrefixList: ['*'], // Apply to all tagged images
        maxImageCount: this.config!.lifecyclePolicy.maxImageCount
      });
    }

    // Rule for tagged images by age
    if (this.config!.lifecyclePolicy.maxImageAge) {
      rules.push({
        description: 'Remove old tagged images',
        tagStatus: ecr.TagStatus.TAGGED,
        tagPrefixList: ['*'], // Apply to all tagged images
        maxImageAge: cdk.Duration.days(this.config!.lifecyclePolicy.maxImageAge)
      });
    }

    // Rule for untagged images
    if (this.config!.lifecyclePolicy.untaggedImageRetentionDays) {
      rules.push({
        description: 'Remove untagged images',
        tagStatus: ecr.TagStatus.UNTAGGED,
        maxImageAge: cdk.Duration.days(this.config!.lifecyclePolicy.untaggedImageRetentionDays)
      });
    }

    return rules.length > 0 ? rules : undefined;
  }

  private getRemovalPolicy(): cdk.RemovalPolicy {
    return this.config?.compliance?.retentionPolicy === 'retain' 
      ? cdk.RemovalPolicy.RETAIN 
      : cdk.RemovalPolicy.DESTROY;
  }

  private buildRepositoryCapability(): any {
    return {
      repositoryArn: this.repository!.repositoryArn,
      repositoryName: this.config!.repositoryName,
      repositoryUri: this.repository!.repositoryUri
    };
  }

  private configureObservabilityForRepository(): void {
    if (!this.config?.monitoring?.enabled) {
      return;
    }

    const repositoryName = this.config!.repositoryName;

    // Create CloudWatch Log Group for repository access logs
    const accessLogGroup = new logs.LogGroup(this, 'AccessLogGroup', {
      logGroupName: `/aws/ecr/${repositoryName}`,
      retention: this.getLogRetentionDays(),
      removalPolicy: this.getRemovalPolicy()
    });

    this.applyStandardTags(accessLogGroup, {
      'log-type': 'repository-access',
      'retention': `${this.getLogRetentionDays()} days`
    });

    // Create CloudWatch metrics for repository monitoring
    this.createCloudWatchMetrics(repositoryName);

    // Create CloudWatch alarms for critical metrics
    this.createCloudWatchAlarms(repositoryName);

    this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to ECR Repository', {
      alarmsCreated: 2,
      repositoryName: repositoryName,
      monitoringEnabled: true
    });
  }

  private getLogRetentionDays(): logs.RetentionDays {
    const retentionDays = this.config.monitoring?.logRetentionDays || 90;
    
    // Convert days to appropriate RetentionDays enum
    if (retentionDays >= 3650) { // 10 years
      return logs.RetentionDays.TEN_YEARS;
    } else if (retentionDays >= 365) { // 1 year
      return logs.RetentionDays.ONE_YEAR;
    } else if (retentionDays >= 90) { // 3 months
      return logs.RetentionDays.THREE_MONTHS;
    } else if (retentionDays >= 30) { // 1 month
      return logs.RetentionDays.ONE_MONTH;
    } else if (retentionDays >= 7) { // 1 week
      return logs.RetentionDays.ONE_WEEK;
    } else if (retentionDays >= 1) { // 1 day
      return logs.RetentionDays.ONE_DAY;
    } else {
      return logs.RetentionDays.ONE_DAY; // Default to 1 day minimum
    }
  }

  private createCloudWatchMetrics(repositoryName: string): void {
    // Image Push Rate Metric
    new cloudwatch.Metric({
      namespace: 'AWS/ECR',
      metricName: 'NumberOfImagesPushed',
      dimensionsMap: {
        RepositoryName: repositoryName
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5)
    });

    // Repository Size Metric
    new cloudwatch.Metric({
      namespace: 'AWS/ECR',
      metricName: 'RepositorySizeInBytes',
      dimensionsMap: {
        RepositoryName: repositoryName
      },
      statistic: 'Maximum',
      period: cdk.Duration.hours(1)
    });

    // Image Pull Rate Metric
    new cloudwatch.Metric({
      namespace: 'AWS/ECR',
      metricName: 'NumberOfImagesPulled',
      dimensionsMap: {
        RepositoryName: repositoryName
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5)
    });
  }

  private createCloudWatchAlarms(repositoryName: string): void {
    // Image Push Rate Alarm
    new cloudwatch.Alarm(this, 'ImagePushRateAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-high-push-rate`,
      alarmDescription: 'ECR repository high image push rate alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ECR',
        metricName: 'NumberOfImagesPushed',
        dimensionsMap: {
          RepositoryName: repositoryName
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(15)
      }),
      threshold: this.config?.monitoring?.alarms?.pushRateThreshold || 50,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // Repository Size Alarm
    new cloudwatch.Alarm(this, 'RepositorySizeAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-repository-size`,
      alarmDescription: 'ECR repository size threshold alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ECR',
        metricName: 'RepositorySizeInBytes',
        dimensionsMap: {
          RepositoryName: repositoryName
        },
        statistic: 'Maximum',
        period: cdk.Duration.hours(1)
      }),
      threshold: this.config?.monitoring?.alarms?.sizeThreshold || 10737418240, // 10GB default
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });
  }
}