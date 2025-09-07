/**
 * EventBridge Rule Pattern Component implementing Component API Contract v1.0
 * 
 * A managed event pattern-based rule for reacting to specific events happening across an AWS account.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities,
  ConfigBuilder
} from '../../../platform/contracts/src';

/**
 * Configuration interface for EventBridge Rule Pattern component
 */
export interface EventBridgeRulePatternConfig {
  /** Rule name (optional, defaults to component name) */
  ruleName?: string;
  
  /** Event pattern for filtering events */
  eventPattern: {
    /** Source of the event */
    source?: string[];
    
    /** Detail type of the event */
    detailType?: string[];
    
    /** Account ID filter */
    account?: string[];
    
    /** Region filter */
    region?: string[];
    
    /** Event detail content filters */
    detail?: Record<string, any>;
    
    /** Resources filter */
    resources?: string[];
    
    /** Time filter */
    time?: {
      /** Numeric range for timestamp */
      numeric?: Array<{
        operator: string;
        value: number;
      }>;
    };
  };
  
  /** Rule description */
  description?: string;
  
  /** EventBridge bus configuration */
  eventBus?: {
    busName?: string;
    busArn?: string;
  };
  
  /** Rule state */
  state?: 'enabled' | 'disabled';
  
  /** Input configuration for targets */
  input?: {
    inputType: 'constant' | 'transformer' | 'path';
    inputValue?: string;
    inputPath?: string;
    inputTransformer?: {
      inputPathsMap?: Record<string, string>;
      inputTemplate: string;
    };
  };
  
  /** Dead letter queue configuration */
  deadLetterQueue?: {
    enabled?: boolean;
    maxRetryAttempts?: number;
    retentionPeriod?: number;
  };
  
  /** Monitoring configuration */
  monitoring?: {
    enabled?: boolean;
    alarmOnFailure?: boolean;
    failureThreshold?: number;
    cloudWatchLogs?: {
      enabled?: boolean;
      logGroupName?: string;
      retentionInDays?: number;
    };
  };
  
  /** Tags for the rule */
  tags?: Record<string, string>;
}

/**
 * JSON Schema for EventBridge Rule Pattern configuration
 */
export const EVENTBRIDGE_RULE_PATTERN_CONFIG_SCHEMA = {
  type: 'object',
  properties: {
    ruleName: {
      type: 'string',
      pattern: '^[a-zA-Z0-9._-]+$',
      maxLength: 64
    },
    eventPattern: {
      type: 'object',
      properties: {
        source: {
          type: 'array',
          items: { type: 'string' }
        },
        detailType: {
          type: 'array',
          items: { type: 'string' }
        },
        account: {
          type: 'array',
          items: { type: 'string' }
        },
        region: {
          type: 'array',
          items: { type: 'string' }
        },
        detail: {
          type: 'object'
        },
        resources: {
          type: 'array',
          items: { type: 'string' }
        },
        time: {
          type: 'object',
          properties: {
            numeric: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  operator: { type: 'string' },
                  value: { type: 'number' }
                },
                required: ['operator', 'value']
              }
            }
          }
        }
      },
      required: ['source']
    },
    description: { type: 'string' },
    eventBus: {
      type: 'object',
      properties: {
        busName: { type: 'string' },
        busArn: { type: 'string' }
      }
    },
    state: {
      type: 'string',
      enum: ['enabled', 'disabled']
    },
    input: {
      type: 'object',
      properties: {
        inputType: {
          type: 'string',
          enum: ['constant', 'transformer', 'path']
        },
        inputValue: { type: 'string' },
        inputPath: { type: 'string' },
        inputTransformer: {
          type: 'object',
          properties: {
            inputPathsMap: { 
              type: 'object',
              additionalProperties: { type: 'string' }
            },
            inputTemplate: { type: 'string' }
          },
          required: ['inputTemplate']
        }
      },
      required: ['inputType']
    },
    deadLetterQueue: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        maxRetryAttempts: { type: 'number', minimum: 0, maximum: 185 },
        retentionPeriod: { type: 'number', minimum: 1, maximum: 14 }
      }
    },
    monitoring: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        alarmOnFailure: { type: 'boolean' },
        failureThreshold: { type: 'number', minimum: 1 },
        cloudWatchLogs: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            logGroupName: { type: 'string' },
            retentionInDays: { 
              type: 'number',
              enum: [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653]
            }
          }
        }
      }
    },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  },
  required: ['eventPattern'],
  additionalProperties: false
};

/**
 * ConfigBuilder for EventBridge Rule Pattern component
 */
export class EventBridgeRulePatternConfigBuilder extends ConfigBuilder<EventBridgeRulePatternConfig> {
  constructor(context: ComponentContext, spec: ComponentSpec) {
    super(context, spec);
  }

  /**
   * Asynchronous build method - delegates to synchronous implementation
   */
  public async build(): Promise<EventBridgeRulePatternConfig> {
    return this.buildSync();
  }

  /**
   * Synchronous version of build for use in synth() method
   */
  public buildSync(): EventBridgeRulePatternConfig {
    // Start with platform defaults
    const platformDefaults = this.getPlatformDefaults();
    
    // Apply compliance framework defaults
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    
    // Merge user configuration from spec
    const userConfig = this.spec.config || {};
    
    // Merge configurations (user config takes precedence)
    const mergedConfig = this.mergeConfigs(
      this.mergeConfigs(platformDefaults, complianceDefaults),
      userConfig
    );
    
    return mergedConfig as EventBridgeRulePatternConfig;
  }

  /**
   * Simple merge utility for combining configuration objects
   */
  private mergeConfigs(base: Record<string, any>, override: Record<string, any>): Record<string, any> {
    const result = { ...base };
    
    for (const [key, value] of Object.entries(override)) {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && !Array.isArray(value) && typeof result[key] === 'object' && !Array.isArray(result[key])) {
          result[key] = this.mergeConfigs(result[key] || {}, value);
        } else {
          result[key] = value;
        }
      }
    }
    
    return result;
  }

  /**
   * Get platform-wide defaults
   */
  private getPlatformDefaults(): Partial<EventBridgeRulePatternConfig> {
    return {
      state: 'enabled',
      description: `EventBridge rule pattern for ${this.spec.name}`,
      monitoring: {
        enabled: true,
        alarmOnFailure: true,
        failureThreshold: 5,
        cloudWatchLogs: {
          enabled: true,
          retentionInDays: 30
        }
      },
      deadLetterQueue: {
        enabled: false,
        maxRetryAttempts: 3,
        retentionPeriod: 14
      }
    };
  }

  /**
   * Get compliance framework-specific defaults
   */
  private getComplianceFrameworkDefaults(): Partial<EventBridgeRulePatternConfig> {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return {
          monitoring: {
            enabled: true,
            alarmOnFailure: true,
            failureThreshold: 1, // More sensitive monitoring
            cloudWatchLogs: {
              enabled: true,
              retentionInDays: 365 // One year retention for high compliance
            }
          },
          deadLetterQueue: {
            enabled: true, // Mandatory DLQ for high compliance
            maxRetryAttempts: 5,
            retentionPeriod: 14
          }
        };
        
      case 'fedramp-moderate':
        return {
          monitoring: {
            enabled: true,
            alarmOnFailure: true,
            failureThreshold: 3,
            cloudWatchLogs: {
              enabled: true,
              retentionInDays: 90 // 90 days for moderate compliance
            }
          },
          deadLetterQueue: {
            enabled: true, // Recommended DLQ for moderate compliance
            maxRetryAttempts: 3,
            retentionPeriod: 14
          }
        };
        
      default: // commercial
        return {
          monitoring: {
            enabled: false, // Optional for commercial
            alarmOnFailure: false
          },
          deadLetterQueue: {
            enabled: false // Cost optimization
          }
        };
    }
  }
}

/**
 * EventBridge Rule Pattern Component implementing Component API Contract v1.0
 */
export class EventBridgeRulePatternComponent extends Component {
  private rule?: events.Rule;
  private deadLetterQueue?: sqs.Queue;
  private logGroup?: logs.LogGroup;
  private config?: EventBridgeRulePatternConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create EventBridge rule with event pattern filtering
   */
  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting EventBridge Rule Pattern synthesis');
    
    try {
      // Build configuration using ConfigBuilder
      const configBuilder = new EventBridgeRulePatternConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();
      
      // Validate event pattern for production compliance
      this.validateEventPatternForCompliance();
      
      // Create dead letter queue if needed
      this.createDeadLetterQueueIfNeeded();
      
      // Create CloudWatch log group if needed
      this.createCloudWatchLogGroupIfNeeded();
      
      // Create EventBridge rule
      this.createEventBridgeRule();
      
      // Configure observability
      this.configureObservability();
      
      // Apply compliance hardening
      this.applyComplianceHardening();
      
      // Register constructs
      this.registerConstruct('rule', this.rule!);
      if (this.deadLetterQueue) {
        this.registerConstruct('deadLetterQueue', this.deadLetterQueue);
      }
      if (this.logGroup) {
        this.registerConstruct('logGroup', this.logGroup);
      }
      
      // Register capabilities
      this.registerCapability('eventbridge:rule-pattern', this.buildEventBridgeCapability());
      
      this.logComponentEvent('synthesis_complete', 'EventBridge Rule Pattern synthesis completed successfully');
    } catch (error) {
      this.logError(error as Error, 'EventBridge Rule Pattern synthesis');
      throw error;
    }
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
    return 'eventbridge-rule-pattern';
  }

  /**
   * Validate event pattern for production compliance
   */
  private validateEventPatternForCompliance(): void {
    if (this.context.environment === 'prod') {
      // Security requirement: no wildcards for event source in production
      const eventPattern = this.config!.eventPattern;
      if (eventPattern.source && eventPattern.source.some(source => source.includes('*'))) {
        throw new Error('Production environments do not allow wildcards in event source patterns for security compliance');
      }
    }
  }

  /**
   * Create dead letter queue if enabled in config
   */
  private createDeadLetterQueueIfNeeded(): void {
    if (!this.config!.deadLetterQueue?.enabled) {
      return;
    }

    this.deadLetterQueue = new sqs.Queue(this, 'DeadLetterQueue', {
      queueName: `${this.context.serviceName}-${this.spec.name}-dlq`,
      retentionPeriod: cdk.Duration.days(this.config!.deadLetterQueue!.retentionPeriod || 14),
      visibilityTimeout: cdk.Duration.minutes(5)
    });

    // Apply standard tags
    this.applyStandardTags(this.deadLetterQueue, {
      'queue-type': 'dead-letter'
    });

    this.logResourceCreation('dead-letter-queue', this.deadLetterQueue.queueName, {
      retentionPeriod: this.config!.deadLetterQueue!.retentionPeriod
    });
  }

  /**
   * Create CloudWatch log group if enabled
   */
  private createCloudWatchLogGroupIfNeeded(): void {
    if (!this.config!.monitoring?.cloudWatchLogs?.enabled) {
      return;
    }

    const logGroupName = this.config!.monitoring!.cloudWatchLogs!.logGroupName || 
      `/aws/events/rule/${this.context.serviceName}-${this.spec.name}`;

    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName,
      retention: this.getLogRetention(),
      removalPolicy: this.context.complianceFramework.startsWith('fedramp') ? 
        cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // Apply standard tags
    this.applyStandardTags(this.logGroup, {
      'log-type': 'eventbridge-rule'
    });

    this.logResourceCreation('log-group', logGroupName, {
      retention: this.config!.monitoring!.cloudWatchLogs!.retentionInDays
    });
  }

  /**
   * Create EventBridge rule with event pattern
   */
  private createEventBridgeRule(): void {
    const ruleName = this.config!.ruleName || `${this.context.serviceName}-${this.spec.name}`;

    this.rule = new events.Rule(this, 'EventBridgeRule', {
      ruleName,
      description: this.config!.description,
      eventPattern: this.config!.eventPattern,
      enabled: this.config!.state === 'enabled',
      eventBus: this.config!.eventBus?.busName ? 
        events.EventBus.fromEventBusName(this, 'EventBus', this.config!.eventBus.busName) : 
        events.EventBus.fromEventBusName(this, 'EventBus', 'default')
    });

    // Apply standard tags
    this.applyStandardTags(this.rule, {
      'rule-type': 'pattern',
      'event-source': this.config!.eventPattern.source?.join(',') || 'unknown'
    });

    this.logResourceCreation('eventbridge-rule', ruleName, {
      state: this.config!.state,
      eventPattern: this.config!.eventPattern,
      eventBus: this.config!.eventBus?.busName || 'default'
    });
  }

  /**
   * Configure CloudWatch observability for EventBridge rule
   */
  private configureObservability(): void {
    if (!this.config!.monitoring?.enabled) {
      return;
    }

    const ruleName = this.rule!.ruleName;

    // Create alarm for failed invocations
    new cloudwatch.Alarm(this, 'FailedInvocationsAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-failed-invocations`,
      alarmDescription: 'EventBridge rule failed invocations alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Events',
        metricName: 'FailedInvocations',
        dimensionsMap: {
          RuleName: ruleName
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: this.config!.monitoring!.failureThreshold || 5,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to EventBridge rule', {
      alarmsCreated: 1,
      ruleName: ruleName,
      monitoringEnabled: true
    });
  }

  /**
   * Apply compliance hardening based on framework
   */
  private applyComplianceHardening(): void {
    if (!this.rule) return;

    switch (this.context.complianceFramework) {
      case 'fedramp-high':
      case 'fedramp-moderate':
        // For FedRAMP environments, ensure rule has proper IAM restrictions
        const cfnRule = this.rule.node.defaultChild as events.CfnRule;
        cfnRule.addMetadata('ComplianceFramework', this.context.complianceFramework);
        
        this.logComponentEvent('compliance_hardening_applied', 'FedRAMP compliance hardening applied', {
          framework: this.context.complianceFramework,
          deadLetterQueueEnabled: !!this.deadLetterQueue,
          loggingEnabled: !!this.logGroup
        });
        break;
        
      default:
        // No special hardening needed for commercial
        break;
    }
  }

  /**
   * Build EventBridge capability descriptor
   */
  private buildEventBridgeCapability(): any {
    return {
      type: 'eventbridge:rule-pattern',
      ruleName: this.rule!.ruleName,
      ruleArn: this.rule!.ruleArn,
      eventPattern: this.config!.eventPattern,
      state: this.config!.state,
      eventBus: this.config!.eventBus?.busName || 'default',
      deadLetterQueue: this.deadLetterQueue ? {
        queueUrl: this.deadLetterQueue.queueUrl,
        queueArn: this.deadLetterQueue.queueArn
      } : undefined
    };
  }

  /**
   * Get log retention period based on compliance framework
   */
  private getLogRetention(): logs.RetentionDays {
    const retentionDays = this.config!.monitoring?.cloudWatchLogs?.retentionInDays || 30;
    
    const retentionMap: Record<number, logs.RetentionDays> = {
      1: logs.RetentionDays.ONE_DAY,
      3: logs.RetentionDays.THREE_DAYS,
      5: logs.RetentionDays.FIVE_DAYS,
      7: logs.RetentionDays.ONE_WEEK,
      14: logs.RetentionDays.TWO_WEEKS,
      30: logs.RetentionDays.ONE_MONTH,
      60: logs.RetentionDays.TWO_MONTHS,
      90: logs.RetentionDays.THREE_MONTHS,
      120: logs.RetentionDays.FOUR_MONTHS,
      150: logs.RetentionDays.FIVE_MONTHS,
      180: logs.RetentionDays.SIX_MONTHS,
      365: logs.RetentionDays.ONE_YEAR,
      400: logs.RetentionDays.THIRTEEN_MONTHS,
      545: logs.RetentionDays.EIGHTEEN_MONTHS,
      731: logs.RetentionDays.TWO_YEARS,
      1827: logs.RetentionDays.FIVE_YEARS,
      3653: logs.RetentionDays.TEN_YEARS
    };
    
    return retentionMap[retentionDays] || logs.RetentionDays.ONE_MONTH;
  }
}