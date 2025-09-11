/**
 * Glue Job Component
 * 
 * AWS Glue Job for serverless ETL data processing workflows.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as glue from 'aws-cdk-lib/aws-glue';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@platform/contracts';

/**
 * Configuration interface for Glue Job component
 */
export interface GlueJobConfig {
  /** Job name (optional, will be auto-generated) */
  jobName?: string;
  
  /** Job description */
  description?: string;
  
  /** Glue version */
  glueVersion?: string;
  
  /** Job type */
  jobType?: 'glueetl' | 'gluestreaming' | 'pythonshell' | 'glueray';
  
  /** IAM role ARN for the job */
  roleArn?: string;
  
  /** Script location */
  scriptLocation: string;
  
  /** Command configuration */
  command?: {
    /** Python version */
    pythonVersion?: string;
    /** Script arguments */
    scriptArguments?: Record<string, string>;
  };
  
  /** Connection names */
  connections?: string[];
  
  /** Max concurrent runs */
  maxConcurrentRuns?: number;
  
  /** Max retries */
  maxRetries?: number;
  
  /** Timeout in minutes */
  timeout?: number;
  
  /** Notification property */
  notificationProperty?: {
    /** Notify delay after in minutes */
    notifyDelayAfter?: number;
  };
  
  /** Execution property */
  executionProperty?: {
    /** Maximum parallel capacity units */
    maxConcurrentRuns?: number;
  };
  
  /** Worker configuration */
  workerConfiguration?: {
    /** Worker type */
    workerType?: 'Standard' | 'G.1X' | 'G.2X' | 'G.4X' | 'G.8X' | 'Z.2X';
    /** Number of workers */
    numberOfWorkers?: number;
  };
  
  /** Security configuration */
  securityConfiguration?: string;
  
  /** Default arguments */
  defaultArguments?: Record<string, string>;
  
  /** Non-overridable arguments */
  nonOverridableArguments?: Record<string, string>;
  
  /** Tags for the job */
  tags?: Record<string, string>;
}

/**
 * Configuration schema for Glue Job component
 */
export const GLUE_JOB_CONFIG_SCHEMA = {
  type: 'object',
  title: 'Glue Job Configuration',
  description: 'Configuration for creating a Glue ETL Job',
  properties: {
    jobName: {
      type: 'string',
      description: 'Name of the Glue job (will be auto-generated if not provided)',
      pattern: '^[a-zA-Z0-9_-]+$',
      maxLength: 255
    },
    description: {
      type: 'string',
      description: 'Description of the Glue job',
      maxLength: 2048
    },
    glueVersion: {
      type: 'string',
      description: 'Glue version',
      enum: ['1.0', '2.0', '3.0', '4.0'],
      default: '4.0'
    },
    jobType: {
      type: 'string',
      description: 'Type of Glue job',
      enum: ['glueetl', 'gluestreaming', 'pythonshell', 'glueray'],
      default: 'glueetl'
    },
    roleArn: {
      type: 'string',
      description: 'IAM role ARN for the Glue job'
    },
    scriptLocation: {
      type: 'string',
      description: 'S3 location of the ETL script'
    },
    command: {
      type: 'object',
      description: 'Command configuration',
      properties: {
        pythonVersion: {
          type: 'string',
          description: 'Python version',
          enum: ['2', '3', '3.6', '3.7', '3.9'],
          default: '3'
        },
        scriptArguments: {
          type: 'object',
          description: 'Script arguments',
          additionalProperties: { type: 'string' },
          default: {}
        }
      },
      additionalProperties: false
    },
    connections: {
      type: 'array',
      description: 'Connection names',
      items: { type: 'string' },
      maxItems: 10
    },
    maxConcurrentRuns: {
      type: 'number',
      description: 'Maximum concurrent runs',
      minimum: 1,
      maximum: 1000,
      default: 1
    },
    maxRetries: {
      type: 'number',
      description: 'Maximum retries',
      minimum: 0,
      maximum: 10,
      default: 0
    },
    timeout: {
      type: 'number',
      description: 'Timeout in minutes',
      minimum: 1,
      maximum: 2880,
      default: 2880
    },
    notificationProperty: {
      type: 'object',
      description: 'Notification configuration',
      properties: {
        notifyDelayAfter: {
          type: 'number',
          description: 'Notify delay after in minutes',
          minimum: 1,
          default: 60
        }
      },
      additionalProperties: false
    },
    executionProperty: {
      type: 'object',
      description: 'Execution configuration',
      properties: {
        maxConcurrentRuns: {
          type: 'number',
          description: 'Maximum parallel capacity units',
          minimum: 1,
          maximum: 1000,
          default: 1
        }
      },
      additionalProperties: false
    },
    workerConfiguration: {
      type: 'object',
      description: 'Worker configuration',
      properties: {
        workerType: {
          type: 'string',
          description: 'Worker type',
          enum: ['Standard', 'G.1X', 'G.2X', 'G.4X', 'G.8X', 'Z.2X'],
          default: 'G.1X'
        },
        numberOfWorkers: {
          type: 'number',
          description: 'Number of workers',
          minimum: 2,
          maximum: 299,
          default: 10
        }
      },
      additionalProperties: false,
      default: { workerType: 'G.1X', numberOfWorkers: 10 }
    },
    securityConfiguration: {
      type: 'string',
      description: 'Security configuration name'
    },
    defaultArguments: {
      type: 'object',
      description: 'Default arguments',
      additionalProperties: { type: 'string' },
      default: {}
    },
    nonOverridableArguments: {
      type: 'object',
      description: 'Non-overridable arguments',
      additionalProperties: { type: 'string' },
      default: {}
    },
    tags: {
      type: 'object',
      description: 'Tags for the job',
      additionalProperties: { type: 'string' },
      default: {}
    }
  },
  additionalProperties: false,
  required: ['scriptLocation'],
  defaults: {
    glueVersion: '4.0',
    jobType: 'glueetl',
    maxConcurrentRuns: 1,
    maxRetries: 0,
    timeout: 2880,
    workerConfiguration: { workerType: 'G.1X', numberOfWorkers: 10 },
    defaultArguments: {},
    nonOverridableArguments: {},
    tags: {}
  }
};

/**
 * Configuration builder for Glue Job component
 */
export class GlueJobConfigBuilder {
  private context: ComponentContext;
  private spec: ComponentSpec;
  
  constructor(context: ComponentContext, spec: ComponentSpec) {
    this.context = context;
    this.spec = spec;
  }

  public async build(): Promise<GlueJobConfig> {
    return this.buildSync();
  }

  public buildSync(): GlueJobConfig {
    const platformDefaults = this.getPlatformDefaults();
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    const userConfig = this.spec.config || {};
    
    const mergedConfig = this.mergeConfigs(
      this.mergeConfigs(platformDefaults, complianceDefaults),
      userConfig
    );
    
    return mergedConfig as GlueJobConfig;
  }

  private mergeConfigs(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeConfigs(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  private getPlatformDefaults(): Record<string, any> {
    return {
      glueVersion: '4.0',
      jobType: 'glueetl',
      command: {
        pythonVersion: '3'
      },
      maxConcurrentRuns: this.getDefaultMaxConcurrentRuns(),
      maxRetries: this.getDefaultMaxRetries(),
      timeout: this.getDefaultTimeout(),
      workerConfiguration: this.getDefaultWorkerConfiguration(),
      defaultArguments: this.getDefaultArguments(),
      tags: {
        'service': this.context.serviceName,
        'environment': this.context.environment,
        'job-type': 'glue-etl'
      }
    };
  }

  private getComplianceFrameworkDefaults(): Record<string, any> {
    const framework = this.context.complianceFramework;
    
    switch (framework) {
      case 'fedramp-moderate':
        return {
          glueVersion: '4.0', // Latest version for security
          maxRetries: 3, // Allow retries for reliability
          timeout: 1440, // 24 hour timeout for large datasets
          workerConfiguration: {
            workerType: 'G.2X', // More powerful workers for compliance workloads
            numberOfWorkers: 20 // Higher parallelism
          },
          defaultArguments: {
            ...this.getDefaultArguments(),
            '--enable-continuous-cloudwatch-log': 'true', // Enhanced logging
            '--enable-metrics': 'true', // Performance metrics
            '--enable-spark-ui': 'true' // UI for monitoring
          },
          tags: {
            'compliance-framework': 'fedramp-moderate',
            'logging': 'comprehensive',
            'monitoring': 'enabled'
          }
        };
        
      case 'fedramp-high':
        return {
          glueVersion: '4.0', // Latest version mandatory
          maxRetries: 5, // Higher retry count for reliability
          timeout: 720, // 12 hour timeout for security
          workerConfiguration: {
            workerType: 'G.4X', // High-performance workers
            numberOfWorkers: 50 // Maximum parallelism for large-scale processing
          },
          defaultArguments: {
            ...this.getDefaultArguments(),
            '--enable-continuous-cloudwatch-log': 'true', // Mandatory comprehensive logging
            '--enable-metrics': 'true', // Performance metrics mandatory
            '--enable-spark-ui': 'true', // UI monitoring required
            '--enable-auto-scaling': 'true' // Auto-scaling for efficiency
          },
          tags: {
            'compliance-framework': 'fedramp-high',
            'logging': 'comprehensive',
            'monitoring': 'enabled',
            'security-level': 'high'
          }
        };
        
      default: // commercial
        return {
          maxRetries: 0,
          timeout: 2880, // 48 hours default
          workerConfiguration: {
            workerType: 'G.1X',
            numberOfWorkers: 10
          }
        };
    }
  }

  private getDefaultMaxConcurrentRuns(): number {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 5; // Higher concurrency for large-scale processing
      case 'fedramp-moderate':
        return 3;
      default:
        return 1;
    }
  }

  private getDefaultMaxRetries(): number {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 5;
      case 'fedramp-moderate':
        return 3;
      default:
        return 0;
    }
  }

  private getDefaultTimeout(): number {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 720; // 12 hours for high security
      case 'fedramp-moderate':
        return 1440; // 24 hours for moderate compliance
      default:
        return 2880; // 48 hours for commercial
    }
  }

  private getDefaultWorkerConfiguration(): Record<string, any> {
    const framework = this.context.complianceFramework;
    
    switch (framework) {
      case 'fedramp-high':
        return { workerType: 'G.4X', numberOfWorkers: 50 };
      case 'fedramp-moderate':
        return { workerType: 'G.2X', numberOfWorkers: 20 };
      default:
        return { workerType: 'G.1X', numberOfWorkers: 10 };
    }
  }

  private getDefaultArguments(): Record<string, string> {
    const framework = this.context.complianceFramework;
    
    const baseArgs = {
      '--TempDir': `s3://aws-glue-temporary-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}/`,
      '--job-bookmark-option': 'job-bookmark-enable',
      '--enable-glue-datacatalog': 'true'
    };

    if (['fedramp-moderate', 'fedramp-high'].includes(framework)) {
      return {
        ...baseArgs,
        '--enable-continuous-cloudwatch-log': 'true',
        '--enable-metrics': 'true',
        '--enable-spark-ui': 'true'
      };
    }

    return baseArgs;
  }
}

/**
 * Glue Job Component implementing Component API Contract v1.0
 */
export class GlueJobComponent extends Component {
  private glueJob?: glue.CfnJob;
  private executionRole?: iam.Role;
  private securityConfiguration?: glue.CfnSecurityConfiguration;
  private kmsKey?: kms.Key;
  private config?: GlueJobConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting Glue Job component synthesis', {
      jobName: this.spec.config?.jobName,
      jobType: this.spec.config?.jobType
    });
    
    const startTime = Date.now();
    
    try {
      const configBuilder = new GlueJobConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();
      
      this.logComponentEvent('config_built', 'Glue Job configuration built successfully', {
        jobName: this.config.jobName,
        jobType: this.config.jobType,
        workerType: this.config.workerConfiguration?.workerType
      });
      
      this.createKmsKeyIfNeeded();
      this.createSecurityConfigurationIfNeeded();
      this.createExecutionRoleIfNeeded();
      this.createGlueJob();
      this.applyComplianceHardening();
      this.configureObservabilityForJob();
    
      this.registerConstruct('glueJob', this.glueJob!);
      if (this.executionRole) {
        this.registerConstruct('executionRole', this.executionRole);
      }
      if (this.securityConfiguration) {
        this.registerConstruct('securityConfiguration', this.securityConfiguration);
      }
      if (this.kmsKey) {
        this.registerConstruct('kmsKey', this.kmsKey);
      }
    
      this.registerCapability('etl:glue-job', this.buildJobCapability());
    
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('component_synthesis', duration, {
        resourcesCreated: Object.keys(this.capabilities).length
      });
    
      this.logComponentEvent('synthesis_complete', 'Glue Job component synthesis completed successfully', {
        jobCreated: 1,
        encryptionEnabled: !!this.securityConfiguration,
        monitoringEnabled: !!this.config.defaultArguments?.['--enable-metrics']
      });
      
    } catch (error) {
      this.logError(error as Error, 'component synthesis', {
        componentType: 'glue-job',
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
    return 'glue-job';
  }

  private createKmsKeyIfNeeded(): void {
    if (['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework)) {
      this.kmsKey = new kms.Key(this, 'KmsKey', {
        description: `KMS key for ${this.buildJobName()} Glue job encryption`,
        enableKeyRotation: true,
        removalPolicy: this.getKeyRemovalPolicy()
      });

      this.applyStandardTags(this.kmsKey, {
        'key-type': 'glue-job',
        'job': this.buildJobName()!,
        'rotation-enabled': 'true'
      });
    }
  }

  private createSecurityConfigurationIfNeeded(): void {
    if (this.kmsKey && !this.config!.securityConfiguration) {
      this.securityConfiguration = new glue.CfnSecurityConfiguration(this, 'SecurityConfiguration', {
        name: `${this.buildJobName()}-security-config`,
        encryptionConfiguration: {
          cloudWatchEncryption: {
            cloudWatchEncryptionMode: 'SSE-KMS',
            kmsKeyArn: this.kmsKey.keyArn
          },
          jobBookmarksEncryption: {
            jobBookmarksEncryptionMode: 'SSE-KMS',
            kmsKeyArn: this.kmsKey.keyArn
          },
          s3Encryptions: [{
            s3EncryptionMode: 'SSE-KMS',
            kmsKeyArn: this.kmsKey.keyArn
          }]
        }
      });

      this.applyStandardTags(this.securityConfiguration, {
        'config-type': 'security',
        'job': this.buildJobName()!,
        'encryption': 'kms'
      });
    }
  }

  private createExecutionRoleIfNeeded(): void {
    if (!this.config!.roleArn) {
      this.executionRole = new iam.Role(this, 'ExecutionRole', {
        assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
        description: `Execution role for ${this.buildJobName()} Glue job`,
        managedPolicies: this.getBaseManagedPolicies(),
        inlinePolicies: this.buildInlinePolicies()
      });

      this.applyStandardTags(this.executionRole, {
        'role-type': 'execution',
        'job': this.buildJobName()!,
        'service': 'glue'
      });
    }
  }

  private createGlueJob(): void {
    const jobProps: glue.CfnJobProps = {
      name: this.buildJobName(),
      description: this.config!.description,
      glueVersion: this.config!.glueVersion,
      role: this.config!.roleArn || this.executionRole!.roleArn,
      command: {
        name: this.config!.jobType!,
        scriptLocation: this.config!.scriptLocation,
        pythonVersion: this.config!.command?.pythonVersion
      },
      connections: this.config!.connections ? {
        connections: this.config!.connections
      } : undefined,
      maxConcurrentRuns: this.config!.maxConcurrentRuns,
      maxRetries: this.config!.maxRetries,
      timeout: this.config!.timeout,
      notificationProperty: this.config!.notificationProperty,
      executionProperty: this.config!.executionProperty,
      workerType: this.config!.workerConfiguration?.workerType,
      numberOfWorkers: this.config!.workerConfiguration?.numberOfWorkers,
      securityConfiguration: this.config!.securityConfiguration || this.securityConfiguration?.name,
      defaultArguments: this.config!.defaultArguments,
      nonOverridableArguments: this.config!.nonOverridableArguments,
      tags: this.buildJobTags()
    };

    this.glueJob = new glue.CfnJob(this, 'Job', jobProps);

    this.applyStandardTags(this.glueJob, {
      'job-name': this.buildJobName()!,
      'job-type': this.config!.jobType!,
      'glue-version': this.config!.glueVersion!,
      'worker-type': this.config!.workerConfiguration?.workerType!,
      'worker-count': (this.config!.workerConfiguration?.numberOfWorkers || 10).toString()
    });
    
    this.logResourceCreation('glue-job', this.buildJobName()!, {
      jobName: this.buildJobName(),
      jobType: this.config!.jobType,
      glueVersion: this.config!.glueVersion,
      encryptionEnabled: !!this.securityConfiguration
    });
  }

  private buildJobTags(): any {
    if (!this.config!.tags || Object.keys(this.config!.tags).length === 0) {
      return undefined;
    }

    return this.config!.tags;
  }

  private getBaseManagedPolicies(): iam.IManagedPolicy[] {
    return [
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole')
    ];
  }

  private buildInlinePolicies(): Record<string, iam.PolicyDocument> {
    const policies: Record<string, iam.PolicyDocument> = {};

    // S3 access for scripts and data
    policies.S3AccessPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            's3:GetObject',
            's3:PutObject',
            's3:DeleteObject',
            's3:ListBucket'
          ],
          resources: [
            `arn:aws:s3:::aws-glue-*`,
            `arn:aws:s3:::aws-glue-*/*`
          ]
        })
      ]
    });

    // CloudWatch Logs permissions
    policies.CloudWatchLogsPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents'
          ],
          resources: [`arn:aws:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:*`]
        })
      ]
    });

    // KMS permissions for encryption
    if (this.kmsKey) {
      policies.KmsPolicy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'kms:Decrypt',
              'kms:GenerateDataKey',
              'kms:CreateGrant'
            ],
            resources: [this.kmsKey.keyArn]
          })
        ]
      });
    }

    return policies;
  }

  private buildJobName(): string | undefined {
    if (this.config!.jobName) {
      return this.config!.jobName;
    }
    return `${this.context.serviceName}-${this.spec.name}`;
  }

  private getKeyRemovalPolicy(): cdk.RemovalPolicy {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) 
      ? cdk.RemovalPolicy.RETAIN 
      : cdk.RemovalPolicy.DESTROY;
  }

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
    // Basic security logging
    if (this.glueJob) {
      const securityLogGroup = new logs.LogGroup(this, 'SecurityLogGroup', {
        logGroupName: `/aws/glue/jobs/${this.buildJobName()}/security`,
        retention: logs.RetentionDays.THREE_MONTHS,
        removalPolicy: cdk.RemovalPolicy.DESTROY
      });

      this.applyStandardTags(securityLogGroup, {
        'log-type': 'security',
        'retention': '3-months'
      });
    }
  }

  private applyFedrampModerateHardening(): void {
    this.applyCommercialHardening();

    if (this.glueJob) {
      const complianceLogGroup = new logs.LogGroup(this, 'ComplianceLogGroup', {
        logGroupName: `/aws/glue/jobs/${this.buildJobName()}/compliance`,
        retention: logs.RetentionDays.ONE_YEAR,
        removalPolicy: cdk.RemovalPolicy.RETAIN
      });

      this.applyStandardTags(complianceLogGroup, {
        'log-type': 'compliance',
        'retention': '1-year',
        'compliance': 'fedramp-moderate'
      });
    }
  }

  private applyFedrampHighHardening(): void {
    this.applyFedrampModerateHardening();

    if (this.glueJob) {
      const auditLogGroup = new logs.LogGroup(this, 'AuditLogGroup', {
        logGroupName: `/aws/glue/jobs/${this.buildJobName()}/audit`,
        retention: logs.RetentionDays.TEN_YEARS,
        removalPolicy: cdk.RemovalPolicy.RETAIN
      });

      this.applyStandardTags(auditLogGroup, {
        'log-type': 'audit',
        'retention': '10-years',
        'compliance': 'fedramp-high'
      });
    }
  }

  private buildJobCapability(): any {
    return {
      jobName: this.buildJobName(),
      jobArn: `arn:aws:glue:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:job/${this.buildJobName()}`
    };
  }

  private configureObservabilityForJob(): void {
    if (this.context.complianceFramework === 'commercial') {
      return;
    }

    const jobName = this.buildJobName()!;

    // 1. Job Failure Alarm
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
        period: cdk.Duration.minutes(5)
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.applyStandardTags(jobFailureAlarm, {
      'alarm-type': 'job-failure',
      'metric-type': 'reliability',
      'threshold': '1'
    });

    // 2. Job Duration Alarm
    const jobDurationAlarm = new cloudwatch.Alarm(this, 'JobDurationAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-long-duration`,
      alarmDescription: 'Glue job long duration alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Glue',
        metricName: 'glue.driver.aggregate.elapsedTime',
        dimensionsMap: {
          JobName: jobName,
          JobRunId: 'ALL'
        },
        statistic: 'Maximum',
        period: cdk.Duration.minutes(15)
      }),
      threshold: 3600000, // 1 hour in milliseconds
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.applyStandardTags(jobDurationAlarm, {
      'alarm-type': 'long-duration',
      'metric-type': 'performance',
      'threshold': '1-hour'
    });

    this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to Glue Job', {
      alarmsCreated: 2,
      jobName: jobName,
      monitoringEnabled: true
    });
  }
}