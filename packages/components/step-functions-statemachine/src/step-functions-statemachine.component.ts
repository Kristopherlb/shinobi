/**
 * Step Functions State Machine Component
 * 
 * AWS Step Functions State Machine for serverless workflow orchestration.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@platform/contracts';

/**
 * Configuration interface for Step Functions State Machine component
 */
export interface StepFunctionsStateMachineConfig {
  /** State machine name (optional, will be auto-generated) */
  stateMachineName?: string;
  
  /** State machine type */
  stateMachineType?: 'STANDARD' | 'EXPRESS';
  
  /** State machine definition */
  definition?: {
    /** JSON definition as object */
    definition?: any;
    /** Definition from JSON string */
    definitionString?: string;
    /** Definition substitutions */
    definitionSubstitutions?: Record<string, string>;
  };
  
  /** State machine role ARN (optional, will create if not provided) */
  roleArn?: string;
  
  /** Logging configuration */
  loggingConfiguration?: {
    /** Enable logging */
    enabled?: boolean;
    /** Log level */
    level?: 'ALL' | 'ERROR' | 'FATAL' | 'OFF';
    /** Include execution data */
    includeExecutionData?: boolean;
    /** CloudWatch Logs destination */
    destinations?: Array<{
      /** CloudWatch Log Group ARN */
      cloudWatchLogsLogGroup?: string;
    }>;
  };
  
  /** Tracing configuration */
  tracingConfiguration?: {
    /** Enable X-Ray tracing */
    enabled?: boolean;
  };
  
  /** Timeout for state machine execution */
  timeout?: {
    /** Timeout in seconds */
    seconds?: number;
  };
  
  /** Environment variables for state machine */
  environment?: Record<string, string>;
  
  /** Tags for the state machine */
  tags?: Record<string, string>;
}

/**
 * Configuration schema for Step Functions State Machine component
 */
export const STEP_FUNCTIONS_STATEMACHINE_CONFIG_SCHEMA = {
  type: 'object',
  title: 'Step Functions State Machine Configuration',
  description: 'Configuration for creating a Step Functions State Machine',
  properties: {
    stateMachineName: {
      type: 'string',
      description: 'Name of the state machine (will be auto-generated if not provided)',
      pattern: '^[a-zA-Z0-9_-]+$',
      maxLength: 80
    },
    stateMachineType: {
      type: 'string',
      description: 'Type of state machine',
      enum: ['STANDARD', 'EXPRESS'],
      default: 'STANDARD'
    },
    definition: {
      type: 'object',
      description: 'State machine definition',
      properties: {
        definition: {
          type: 'object',
          description: 'State machine definition as JSON object'
        },
        definitionString: {
          type: 'string',
          description: 'State machine definition as JSON string'
        },
        definitionSubstitutions: {
          type: 'object',
          description: 'Definition substitutions',
          additionalProperties: { type: 'string' },
          default: {}
        }
      },
      additionalProperties: false,
      anyOf: [
        { required: ['definition'] },
        { required: ['definitionString'] }
      ]
    },
    roleArn: {
      type: 'string',
      description: 'IAM role ARN for state machine execution'
    },
    loggingConfiguration: {
      type: 'object',
      description: 'Logging configuration',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable logging',
          default: false
        },
        level: {
          type: 'string',
          description: 'Log level',
          enum: ['ALL', 'ERROR', 'FATAL', 'OFF'],
          default: 'ERROR'
        },
        includeExecutionData: {
          type: 'boolean',
          description: 'Include execution data in logs',
          default: false
        },
        destinations: {
          type: 'array',
          description: 'Log destinations',
          items: {
            type: 'object',
            properties: {
              cloudWatchLogsLogGroup: {
                type: 'string',
                description: 'CloudWatch Logs log group ARN'
              }
            },
            additionalProperties: false
          },
          default: []
        }
      },
      additionalProperties: false,
      default: { enabled: false, level: 'ERROR', includeExecutionData: false }
    },
    tracingConfiguration: {
      type: 'object',
      description: 'X-Ray tracing configuration',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable X-Ray tracing',
          default: false
        }
      },
      additionalProperties: false,
      default: { enabled: false }
    },
    timeout: {
      type: 'object',
      description: 'Execution timeout configuration',
      properties: {
        seconds: {
          type: 'number',
          description: 'Timeout in seconds',
          minimum: 1,
          maximum: 31536000, // 1 year
          default: 3600
        }
      },
      additionalProperties: false
    },
    environment: {
      type: 'object',
      description: 'Environment variables',
      additionalProperties: { type: 'string' },
      default: {}
    },
    tags: {
      type: 'object',
      description: 'Tags for the state machine',
      additionalProperties: { type: 'string' },
      default: {}
    }
  },
  additionalProperties: false,
  required: ['definition'],
  defaults: {
    stateMachineType: 'STANDARD',
    loggingConfiguration: { enabled: false, level: 'ERROR', includeExecutionData: false },
    tracingConfiguration: { enabled: false },
    environment: {},
    tags: {}
  }
};

/**
 * Configuration builder for Step Functions State Machine component
 */
export class StepFunctionsStateMachineConfigBuilder {
  private context: ComponentContext;
  private spec: ComponentSpec;
  
  constructor(context: ComponentContext, spec: ComponentSpec) {
    this.context = context;
    this.spec = spec;
  }

  public async build(): Promise<StepFunctionsStateMachineConfig> {
    return this.buildSync();
  }

  public buildSync(): StepFunctionsStateMachineConfig {
    const platformDefaults = this.getPlatformDefaults();
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    const userConfig = this.spec.config || {};
    
    const mergedConfig = this.mergeConfigs(
      this.mergeConfigs(platformDefaults, complianceDefaults),
      userConfig
    );
    
    return mergedConfig as StepFunctionsStateMachineConfig;
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
      stateMachineType: 'STANDARD',
      loggingConfiguration: {
        enabled: this.getDefaultLoggingEnabled(),
        level: 'ERROR',
        includeExecutionData: false
      },
      tracingConfiguration: {
        enabled: this.getDefaultTracingEnabled()
      },
      timeout: {
        seconds: 3600 // 1 hour default
      },
      tags: {
        'service': this.context.serviceName,
        'environment': this.context.environment
      }
    };
  }

  private getComplianceFrameworkDefaults(): Record<string, any> {
    const framework = this.context.complianceFramework;
    
    switch (framework) {
      case 'fedramp-moderate':
        return {
          loggingConfiguration: {
            enabled: true, // Mandatory logging for compliance
            level: 'ALL',
            includeExecutionData: true // Required for audit trail
          },
          tracingConfiguration: {
            enabled: true // Required for compliance monitoring
          },
          tags: {
            'compliance-framework': 'fedramp-moderate',
            'logging-level': 'comprehensive',
            'audit-trail': 'enabled'
          }
        };
        
      case 'fedramp-high':
        return {
          loggingConfiguration: {
            enabled: true, // Mandatory
            level: 'ALL',
            includeExecutionData: true // Required for detailed audit
          },
          tracingConfiguration: {
            enabled: true // Mandatory for high security
          },
          timeout: {
            seconds: 1800 // Shorter timeout for security
          },
          tags: {
            'compliance-framework': 'fedramp-high',
            'logging-level': 'comprehensive',
            'audit-trail': 'enabled',
            'security-level': 'high'
          }
        };
        
      default: // commercial
        return {
          loggingConfiguration: {
            enabled: false,
            level: 'ERROR'
          },
          tracingConfiguration: {
            enabled: false
          }
        };
    }
  }

  private getDefaultLoggingEnabled(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private getDefaultTracingEnabled(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }
}

/**
 * Step Functions State Machine Component implementing Component API Contract v1.0
 */
export class StepFunctionsStateMachineComponent extends Component {
  private stateMachine?: sfn.StateMachine;
  private executionRole?: iam.Role;
  private logGroup?: logs.LogGroup;
  private config?: StepFunctionsStateMachineConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting Step Functions State Machine component synthesis', {
      stateMachineName: this.spec.config?.stateMachineName,
      stateMachineType: this.spec.config?.stateMachineType
    });
    
    const startTime = Date.now();
    
    try {
      const configBuilder = new StepFunctionsStateMachineConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();
      
      this.logComponentEvent('config_built', 'Step Functions State Machine configuration built successfully', {
        stateMachineName: this.config.stateMachineName,
        stateMachineType: this.config.stateMachineType,
        loggingEnabled: this.config.loggingConfiguration?.enabled
      });
      
      this.createLogGroupIfNeeded();
      this.createExecutionRoleIfNeeded();
      this.createStateMachine();
      this.applyComplianceHardening();
      this.configureObservabilityForStateMachine();
    
      this.registerConstruct('stateMachine', this.stateMachine!);
      if (this.executionRole) {
        this.registerConstruct('executionRole', this.executionRole);
      }
      if (this.logGroup) {
        this.registerConstruct('logGroup', this.logGroup);
      }
    
      this.registerCapability('workflow:step-functions', this.buildStateMachineCapability());
    
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('component_synthesis', duration, {
        resourcesCreated: Object.keys(this.capabilities).length
      });
    
      this.logComponentEvent('synthesis_complete', 'Step Functions State Machine component synthesis completed successfully', {
        stateMachineCreated: 1,
        loggingEnabled: this.config.loggingConfiguration?.enabled,
        tracingEnabled: this.config.tracingConfiguration?.enabled
      });
      
    } catch (error) {
      this.logError(error as Error, 'component synthesis', {
        componentType: 'step-functions-statemachine',
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
    return 'step-functions-statemachine';
  }

  private createLogGroupIfNeeded(): void {
    if (this.config!.loggingConfiguration?.enabled) {
      this.logGroup = new logs.LogGroup(this, 'StateMachineLogGroup', {
        logGroupName: `/aws/stepfunctions/${this.buildStateMachineName()}`,
        retention: this.getLogRetention(),
        removalPolicy: this.getLogRemovalPolicy()
      });

      this.applyStandardTags(this.logGroup, {
        'log-type': 'step-functions',
        'state-machine': this.buildStateMachineName()!,
        'log-level': this.config!.loggingConfiguration.level || 'ERROR'
      });
    }
  }

  private createExecutionRoleIfNeeded(): void {
    if (!this.config!.roleArn) {
      this.executionRole = new iam.Role(this, 'StateMachineExecutionRole', {
        assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
        description: `Execution role for ${this.buildStateMachineName()} state machine`,
        managedPolicies: this.getBaseManagedPolicies(),
        inlinePolicies: this.buildInlinePolicies()
      });

      this.applyStandardTags(this.executionRole, {
        'role-type': 'execution',
        'state-machine': this.buildStateMachineName()!,
        'service': 'step-functions'
      });
    }
  }

  private createStateMachine(): void {
    const definition = this.buildDefinition();
    
    const stateMachineProps: sfn.StateMachineProps = {
      stateMachineName: this.buildStateMachineName(),
      stateMachineType: this.mapStateMachineType(this.config!.stateMachineType!),
      definition: definition,
      role: this.executionRole || (this.config!.roleArn ? 
        iam.Role.fromRoleArn(this, 'ExistingRole', this.config!.roleArn) : undefined),
      logs: this.buildLoggingConfiguration(),
      tracingEnabled: this.config!.tracingConfiguration?.enabled,
      timeout: this.config!.timeout?.seconds ? 
        cdk.Duration.seconds(this.config!.timeout.seconds) : undefined
    };

    this.stateMachine = new sfn.StateMachine(this, 'StateMachine', stateMachineProps);

    this.applyStandardTags(this.stateMachine, {
      'state-machine-name': this.buildStateMachineName()!,
      'state-machine-type': this.config!.stateMachineType!,
      'logging-enabled': (this.config!.loggingConfiguration?.enabled || false).toString(),
      'tracing-enabled': (this.config!.tracingConfiguration?.enabled || false).toString()
    });

    if (this.config!.tags) {
      Object.entries(this.config!.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.stateMachine!).add(key, value);
      });
    }
    
    this.logResourceCreation('step-functions-statemachine', this.buildStateMachineName()!, {
      stateMachineName: this.buildStateMachineName(),
      stateMachineType: this.config!.stateMachineType,
      loggingEnabled: this.config!.loggingConfiguration?.enabled,
      tracingEnabled: this.config!.tracingConfiguration?.enabled
    });
  }

  private buildDefinition(): sfn.IChainable {
    if (this.config!.definition?.definitionString) {
      return sfn.DefinitionBody.fromString(this.config!.definition.definitionString);
    }
    
    if (this.config!.definition?.definition) {
      return sfn.DefinitionBody.fromChainable(
        new sfn.Pass(this, 'DefaultPass', {
          result: sfn.Result.fromObject(this.config!.definition.definition)
        })
      );
    }
    
    // Default simple definition if none provided
    return new sfn.Pass(this, 'DefaultPass', {
      result: sfn.Result.fromObject({ message: 'Hello from Step Functions' })
    });
  }

  private mapStateMachineType(type: string): sfn.StateMachineType {
    switch (type) {
      case 'EXPRESS':
        return sfn.StateMachineType.EXPRESS;
      default:
        return sfn.StateMachineType.STANDARD;
    }
  }

  private buildLoggingConfiguration(): sfn.LogOptions | undefined {
    if (!this.config!.loggingConfiguration?.enabled || !this.logGroup) {
      return undefined;
    }

    return {
      destination: this.logGroup,
      level: this.mapLogLevel(this.config!.loggingConfiguration.level!),
      includeExecutionData: this.config!.loggingConfiguration.includeExecutionData
    };
  }

  private mapLogLevel(level: string): sfn.LogLevel {
    switch (level) {
      case 'ALL':
        return sfn.LogLevel.ALL;
      case 'FATAL':
        return sfn.LogLevel.FATAL;
      case 'OFF':
        return sfn.LogLevel.OFF;
      default:
        return sfn.LogLevel.ERROR;
    }
  }

  private getBaseManagedPolicies(): iam.IManagedPolicy[] {
    return [
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSStepFunctionsServiceRolePolicy')
    ];
  }

  private buildInlinePolicies(): Record<string, iam.PolicyDocument> {
    const policies: Record<string, iam.PolicyDocument> = {};

    // CloudWatch Logs permissions
    if (this.config!.loggingConfiguration?.enabled) {
      policies.CloudWatchLogsPolicy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'logs:CreateLogDelivery',
              'logs:GetLogDelivery',
              'logs:UpdateLogDelivery',
              'logs:DeleteLogDelivery',
              'logs:ListLogDeliveries',
              'logs:PutResourcePolicy',
              'logs:DescribeResourcePolicies',
              'logs:DescribeLogGroups'
            ],
            resources: ['*']
          })
        ]
      });
    }

    // X-Ray permissions
    if (this.config!.tracingConfiguration?.enabled) {
      policies.XRayPolicy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'xray:PutTraceSegments',
              'xray:PutTelemetryRecords',
              'xray:GetSamplingRules',
              'xray:GetSamplingTargets'
            ],
            resources: ['*']
          })
        ]
      });
    }

    return policies;
  }

  private buildStateMachineName(): string | undefined {
    if (this.config!.stateMachineName) {
      return this.config!.stateMachineName;
    }
    return `${this.context.serviceName}-${this.spec.name}`;
  }

  private getLogRetention(): logs.RetentionDays {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return logs.RetentionDays.TEN_YEARS;
      case 'fedramp-moderate':
        return logs.RetentionDays.ONE_YEAR;
      default:
        return logs.RetentionDays.THREE_MONTHS;
    }
  }

  private getLogRemovalPolicy(): cdk.RemovalPolicy {
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
    if (this.stateMachine) {
      const securityLogGroup = new logs.LogGroup(this, 'SecurityLogGroup', {
        logGroupName: `/aws/stepfunctions/${this.buildStateMachineName()}/security`,
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

    if (this.stateMachine) {
      const complianceLogGroup = new logs.LogGroup(this, 'ComplianceLogGroup', {
        logGroupName: `/aws/stepfunctions/${this.buildStateMachineName()}/compliance`,
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

    if (this.stateMachine) {
      const auditLogGroup = new logs.LogGroup(this, 'AuditLogGroup', {
        logGroupName: `/aws/stepfunctions/${this.buildStateMachineName()}/audit`,
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

  private buildStateMachineCapability(): any {
    return {
      stateMachineArn: this.stateMachine!.stateMachineArn,
      stateMachineName: this.buildStateMachineName()
    };
  }

  private configureObservabilityForStateMachine(): void {
    if (this.context.complianceFramework === 'commercial') {
      return;
    }

    const stateMachineName = this.buildStateMachineName()!;

    // 1. Execution Failed Alarm
    const executionFailedAlarm = new cloudwatch.Alarm(this, 'ExecutionFailedAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-execution-failed`,
      alarmDescription: 'Step Functions execution failure alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/States',
        metricName: 'ExecutionsFailed',
        dimensionsMap: {
          StateMachineArn: this.stateMachine!.stateMachineArn
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.applyStandardTags(executionFailedAlarm, {
      'alarm-type': 'execution-failed',
      'metric-type': 'reliability',
      'threshold': '1'
    });

    // 2. Execution Duration Alarm
    const executionDurationAlarm = new cloudwatch.Alarm(this, 'ExecutionDurationAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-long-execution`,
      alarmDescription: 'Step Functions long execution duration alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/States',
        metricName: 'ExecutionTime',
        dimensionsMap: {
          StateMachineArn: this.stateMachine!.stateMachineArn
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(15)
      }),
      threshold: 300000, // 5 minutes in milliseconds
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.applyStandardTags(executionDurationAlarm, {
      'alarm-type': 'long-execution',
      'metric-type': 'performance',
      'threshold': '5-minutes'
    });

    this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to Step Functions State Machine', {
      alarmsCreated: 2,
      stateMachineName: stateMachineName,
      monitoringEnabled: true
    });
  }
}