/**
 * Glue Job Component
 *
 * Creates an AWS Glue job using the platform configuration precedence chain.
 * All security, logging, and monitoring behaviour is resolved via the
 * GlueJobComponentConfigBuilder so this implementation never branches on the
 * compliance framework directly.
 */

import * as glue from 'aws-cdk-lib/aws-glue';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  BaseComponent,
  ComponentCapabilities,
  ComponentContext,
  ComponentSpec
} from '@shinobi/core';
import {
  GlueJobComponentConfigBuilder,
  GlueJobConfig,
  GlueJobMonitoringConfig,
  RemovalPolicyOption
} from './glue-job.builder';

export class GlueJobComponent extends BaseComponent {
  private glueJob?: glue.CfnJob;
  private executionRole?: iam.Role;
  private securityConfiguration?: glue.CfnSecurityConfiguration;
  private kmsKey?: kms.IKey;
  private createdKmsKey?: kms.Key;
  private securityConfigurationName?: string;
  private config?: GlueJobConfig;
  private readonly logGroups: Map<string, logs.LogGroup> = new Map();
  private readonly alarms: Map<string, cloudwatch.Alarm> = new Map();

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting Glue job synthesis', {
      component: this.spec.name
    });

    const startTime = Date.now();

    try {
      const builder = new GlueJobComponentConfigBuilder(this.context, this.spec);
      this.config = builder.buildSync();

      this.logComponentEvent('config_resolved', 'Glue job configuration resolved', {
        jobType: this.config.jobType,
        glueVersion: this.config.glueVersion,
        monitoringEnabled: this.config.monitoring.enabled,
        encryptionEnabled: this.config.security.encryption.enabled
      });

      this.createKmsKeyIfNeeded();
      this.createSecurityConfigurationIfNeeded();
      this.createExecutionRoleIfNeeded();
      this.createGlueJob();
      this.configureLogging();
      this.configureMonitoring();

      this.registerConstruct('main', this.glueJob!);
      this.registerConstruct('glueJob', this.glueJob!);

      if (this.executionRole) {
        this.registerConstruct('executionRole', this.executionRole);
      }

      if (this.securityConfiguration) {
        this.registerConstruct('securityConfiguration', this.securityConfiguration);
      }

      if (this.createdKmsKey) {
        this.registerConstruct('kmsKey', this.createdKmsKey);
      }

      this.registerCapability('etl:glue-job', this.buildJobCapability());

      const duration = Date.now() - startTime;
      this.logPerformanceMetric('component_synthesis', duration, {
        resourcesCreated: this.constructs.size,
        alarmsCreated: this.alarms.size,
        logGroups: this.logGroups.size
      });

      this.logComponentEvent('synthesis_complete', 'Glue job component synthesized successfully', {
        jobName: this.buildJobName(),
        monitoringEnabled: this.config.monitoring.enabled,
        encryptionEnabled: this.config.security.encryption.enabled
      });
    } catch (error) {
      this.logError(error as Error, 'glue-job:synth', {
        jobName: this.spec.name
      });
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'glue-job';
  }

  private createKmsKeyIfNeeded(): void {
    this.kmsKey = undefined;
    this.createdKmsKey = undefined;

    const encryption = this.config!.security.encryption;
    if (!encryption.enabled) {
      if (encryption.kmsKeyArn) {
        this.kmsKey = kms.Key.fromKeyArn(this, 'ImportedGlueJobKey', encryption.kmsKeyArn);
      }
      return;
    }

    if (encryption.kmsKeyArn) {
      this.kmsKey = kms.Key.fromKeyArn(this, 'ImportedGlueJobKey', encryption.kmsKeyArn);
      return;
    }

    if (!encryption.createCustomerManagedKey) {
      throw new Error('Glue job encryption is enabled but no KMS key ARN was supplied and key creation is disabled.');
    }

    const key = new kms.Key(this, 'GlueJobKey', {
      description: `KMS key for ${this.buildJobName()} Glue job encryption`,
      enableKeyRotation: true,
      removalPolicy: this.toRemovalPolicy(encryption.removalPolicy)
    });

    this.applyStandardTags(key, {
      'key-purpose': 'glue-job',
      'job-name': this.buildJobName(),
      'rotation-enabled': 'true'
    });

    this.kmsKey = key;
    this.createdKmsKey = key;
  }

  private createSecurityConfigurationIfNeeded(): void {
    const security = this.config!.security;
    const encryption = security.encryption;

    if (security.securityConfigurationName) {
      this.securityConfigurationName = security.securityConfigurationName;
      return;
    }

    if (!encryption.enabled || !this.kmsKey) {
      return;
    }

    const name = `${this.buildJobName()}-security-config`;
    this.securityConfiguration = new glue.CfnSecurityConfiguration(this, 'SecurityConfiguration', {
      name,
      encryptionConfiguration: {
        cloudWatchEncryption: {
          cloudWatchEncryptionMode: 'SSE-KMS',
          kmsKeyArn: this.kmsKey.keyArn
        },
        jobBookmarksEncryption: {
          jobBookmarksEncryptionMode: 'SSE-KMS',
          kmsKeyArn: this.kmsKey.keyArn
        },
        s3Encryptions: [
          {
            s3EncryptionMode: 'SSE-KMS',
            kmsKeyArn: this.kmsKey.keyArn
          }
        ]
      }
    });

    this.applyStandardTags(this.securityConfiguration, {
      'config-type': 'security',
      'encryption': 'kms',
      'job-name': this.buildJobName()
    });

    this.securityConfigurationName = name;
  }

  private createExecutionRoleIfNeeded(): void {
    if (this.config!.roleArn) {
      return;
    }

    this.executionRole = new iam.Role(this, 'ExecutionRole', {
      assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
      description: `Execution role for ${this.buildJobName()} Glue job`,
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole')],
      inlinePolicies: this.buildInlinePolicies()
    });

    this.applyStandardTags(this.executionRole, {
      'role-type': 'execution',
      'job-name': this.buildJobName(),
      'service': 'glue'
    });
  }

  private createGlueJob(): void {
    const defaultArguments = this.buildDefaultArguments();
    const nonOverridableArguments = this.config!.nonOverridableArguments ?? {};

    const jobProps: glue.CfnJobProps = {
      name: this.buildJobName(),
      description: this.config!.description,
      glueVersion: this.config!.glueVersion,
      role: this.config!.roleArn ?? this.executionRole!.roleArn,
      command: {
        name: this.config!.jobType,
        scriptLocation: this.config!.scriptLocation,
        pythonVersion: this.config!.command.pythonVersion
      },
      connections: this.config!.connections.length
        ? { connections: this.config!.connections }
        : undefined,
      maxConcurrentRuns: this.config!.maxConcurrentRuns,
      maxRetries: this.config!.maxRetries,
      timeout: this.config!.timeout,
      notificationProperty: this.config!.notificationProperty?.notifyDelayAfter
        ? { notifyDelayAfter: this.config!.notificationProperty.notifyDelayAfter }
        : undefined,
      executionProperty: this.config!.executionProperty,
      workerType: this.config!.workerConfiguration.workerType,
      numberOfWorkers: this.config!.workerConfiguration.numberOfWorkers,
      securityConfiguration: this.securityConfigurationName,
      defaultArguments,
      nonOverridableArguments,
      tags: this.getJobTags()
    };

    this.glueJob = new glue.CfnJob(this, 'GlueJob', jobProps);

    this.applyStandardTags(this.glueJob, {
      'job-name': this.buildJobName(),
      'job-type': this.config!.jobType,
      'glue-version': this.config!.glueVersion,
      'worker-type': this.config!.workerConfiguration.workerType,
      'worker-count': this.config!.workerConfiguration.numberOfWorkers.toString()
    });

    this.logResourceCreation('glue-job', this.buildJobName(), {
      jobType: this.config!.jobType,
      glueVersion: this.config!.glueVersion,
      encryptionEnabled: this.config!.security.encryption.enabled
    });
  }

  private configureLogging(): void {
    this.logGroups.clear();

    const jobName = this.buildJobName();
    const groups = this.config!.logging.groups.filter(group => group.enabled !== false);

    groups.forEach(group => {
      const logGroup = new logs.LogGroup(this, `${this.toPascal(group.id)}LogGroup`, {
        logGroupName: `/aws/glue/jobs/${jobName}/${group.logGroupSuffix}`,
        retention: this.mapLogRetentionDays(group.retentionDays),
        removalPolicy: this.toRemovalPolicy(group.removalPolicy)
      });

      this.applyStandardTags(logGroup, {
        'log-id': group.id,
        'retention-days': group.retentionDays.toString()
      });

      this.logGroups.set(group.id, logGroup);
      this.registerConstruct(`logGroup:${group.id}`, logGroup);
    });
  }

  private configureMonitoring(): void {
    this.alarms.clear();

    const monitoring: GlueJobMonitoringConfig = this.config!.monitoring;
    if (!monitoring.enabled) {
      return;
    }

    const jobName = this.buildJobName();

    const jobFailureAlarm = new cloudwatch.Alarm(this, 'JobFailureAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-job-failure`,
      alarmDescription: 'Glue job failure alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Glue',
        metricName: 'glue.driver.aggregate.numFailedTasks',
        dimensionsMap: {
          JobName: jobName,
          JobRunId: 'ALL'
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(monitoring.jobFailure.periodMinutes)
      }),
      threshold: monitoring.jobFailure.threshold,
      evaluationPeriods: monitoring.jobFailure.evaluationPeriods,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.applyStandardTags(jobFailureAlarm, {
      'alarm-type': 'job-failure',
      'threshold': monitoring.jobFailure.threshold.toString()
    });

    this.alarms.set('jobFailure', jobFailureAlarm);
    this.registerConstruct('alarm:jobFailure', jobFailureAlarm);

    const jobDurationAlarm = new cloudwatch.Alarm(this, 'JobDurationAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-job-duration`,
      alarmDescription: 'Glue job duration alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Glue',
        metricName: 'glue.driver.aggregate.elapsedTime',
        dimensionsMap: {
          JobName: jobName,
          JobRunId: 'ALL'
        },
        statistic: 'Maximum',
        period: cdk.Duration.minutes(monitoring.jobDuration.periodMinutes)
      }),
      threshold: monitoring.jobDuration.thresholdMs,
      evaluationPeriods: monitoring.jobDuration.evaluationPeriods,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.applyStandardTags(jobDurationAlarm, {
      'alarm-type': 'job-duration',
      'threshold-ms': monitoring.jobDuration.thresholdMs.toString()
    });

    this.alarms.set('jobDuration', jobDurationAlarm);
    this.registerConstruct('alarm:jobDuration', jobDurationAlarm);

    this.logComponentEvent('observability_configured', 'Monitoring configured for Glue job', {
      jobName,
      alarmsCreated: this.alarms.size,
      monitoringEnabled: true
    });
  }

  private buildInlinePolicies(): Record<string, iam.PolicyDocument> {
    const policies: Record<string, iam.PolicyDocument> = {
      S3AccessPolicy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
            resources: ['arn:aws:s3:::aws-glue-*', 'arn:aws:s3:::aws-glue-*/*']
          })
        ]
      }),
      CloudWatchLogsPolicy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
            resources: [`arn:aws:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:*`]
          })
        ]
      })
    };

    if (this.kmsKey) {
      policies.KmsPolicy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['kms:Decrypt', 'kms:GenerateDataKey', 'kms:CreateGrant'],
            resources: [this.kmsKey.keyArn]
          })
        ]
      });
    }

    return policies;
  }

  private buildJobCapability(): Record<string, any> {
    return {
      jobName: this.buildJobName(),
      jobArn: `arn:aws:glue:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:job/${this.buildJobName()}`,
      roleArn: this.config!.roleArn ?? this.executionRole?.roleArn,
      securityConfiguration: this.securityConfigurationName,
      kmsKeyArn: this.kmsKey?.keyArn,
      monitoringEnabled: this.config!.monitoring.enabled
    };
  }

  private buildJobName(): string {
    return this.config!.jobName ?? `${this.context.serviceName}-${this.spec.name}`;
  }

  private buildDefaultArguments(): Record<string, string> {
    const baseArguments: Record<string, string> = {
      '--TempDir': `s3://aws-glue-temporary-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}/`,
      '--job-bookmark-option': 'job-bookmark-enable',
      '--enable-glue-datacatalog': 'true'
    };

    return {
      ...baseArguments,
      ...(this.config!.defaultArguments ?? {})
    };
  }

  private getJobTags(): Record<string, string> | undefined {
    if (!this.config!.tags || Object.keys(this.config!.tags).length === 0) {
      return undefined;
    }

    return this.config!.tags;
  }

  private toRemovalPolicy(policy: RemovalPolicyOption | undefined): cdk.RemovalPolicy {
    return policy === 'retain' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;
  }

  private toPascal(value: string): string {
    return value
      .split(/[^a-zA-Z0-9]/)
      .filter(Boolean)
      .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join('');
  }
}
