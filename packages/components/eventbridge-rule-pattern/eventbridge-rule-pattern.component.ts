/**
 * EventBridge Rule Pattern Component
 *
 * Creates an EventBridge rule that filters events based on a configuration-driven
 * pattern. Dead-letter queues, logging, and monitoring behaviour are resolved
 * entirely via the EventBridgeRulePatternComponentConfigBuilder so the component
 * never inspects the compliance framework directly.
 */

import * as events from 'aws-cdk-lib/aws-events';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  BaseComponent,
  ComponentCapabilities,
  ComponentContext,
  ComponentSpec
} from '@shinobi/core';
import {
  AlarmComparisonOperator,
  AlarmConfig,
  AlarmTreatMissingData,
  EventBridgeRulePatternComponentConfigBuilder,
  EventBridgeRulePatternConfig
} from './eventbridge-rule-pattern.builder.ts';

interface CreatedAlarm {
  id: string;
  alarm: cloudwatch.Alarm;
}

export class EventBridgeRulePatternComponent extends BaseComponent {
  private rule?: events.Rule;
  private deadLetterQueue?: sqs.Queue;
  private logGroup?: logs.LogGroup;
  private config?: EventBridgeRulePatternConfig;
  private readonly createdAlarms: CreatedAlarm[] = [];

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting EventBridge rule pattern synthesis');

    try {
      const builder = new EventBridgeRulePatternComponentConfigBuilder(this.context, this.spec);
      this.config = builder.buildSync();

      this.logComponentEvent('config_resolved', 'Resolved EventBridge rule configuration', {
        ruleName: this.config.ruleName,
        eventBus: this.config.eventBus?.name ?? this.config.eventBus?.arn ?? 'default',
        monitoringEnabled: this.config.monitoring.enabled,
        dlqEnabled: this.config.deadLetterQueue.enabled
      });

      this.createDeadLetterQueue();
      this.createLogGroup();
      this.createRule();
      this.configureMonitoring();

      this.registerConstruct('main', this.rule!);
      this.registerConstruct('rule', this.rule!);

      if (this.deadLetterQueue) {
        this.registerConstruct('deadLetterQueue', this.deadLetterQueue);
      }

      if (this.logGroup) {
        this.registerConstruct('logGroup', this.logGroup);
      }

      this.createdAlarms.forEach(({ id, alarm }) => {
        this.registerConstruct(`alarm:${id}`, alarm);
      });

      this.registerCapability('eventbridge:rule-pattern', this.buildCapability());

      this.logComponentEvent('synthesis_complete', 'EventBridge rule pattern synthesized successfully', {
        ruleName: this.rule!.ruleName,
        alarmsConfigured: this.createdAlarms.length
      });
    } catch (error) {
      this.logError(error as Error, 'eventbridge-rule-pattern:synth', {
        componentName: this.spec.name
      });
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'eventbridge-rule-pattern';
  }

  private createDeadLetterQueue(): void {
    const dlqConfig = this.config!.deadLetterQueue;
    if (!dlqConfig.enabled) {
      return;
    }

    this.deadLetterQueue = new sqs.Queue(this, 'DeadLetterQueue', {
      queueName: `${this.context.serviceName}-${this.spec.name}-dlq`,
      retentionPeriod: cdk.Duration.days(dlqConfig.retentionDays),
      visibilityTimeout: cdk.Duration.minutes(5)
    });

    this.applyStandardTags(this.deadLetterQueue, {
      'queue-type': 'dead-letter'
    });

    this.logResourceCreation('dead-letter-queue', this.deadLetterQueue.queueName, {
      retentionDays: dlqConfig.retentionDays,
      maxRetryAttempts: dlqConfig.maxRetryAttempts
    });
  }

  private createLogGroup(): void {
    const logsConfig = this.config!.monitoring.cloudWatchLogs;
    if (!logsConfig.enabled) {
      return;
    }

    const logGroupName = logsConfig.logGroupName ?? `/aws/events/rule/${this.context.serviceName}-${this.spec.name}`;
    this.logGroup = new logs.LogGroup(this, 'RuleLogGroup', {
      logGroupName,
      retention: this.mapLogRetentionDays(logsConfig.retentionDays),
      removalPolicy: logsConfig.removalPolicy === 'retain' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    this.applyStandardTags(this.logGroup, {
      'log-type': 'eventbridge',
      'rule-name': this.config!.ruleName
    });

    this.logResourceCreation('log-group', logGroupName, {
      retentionDays: logsConfig.retentionDays,
      removalPolicy: logsConfig.removalPolicy
    });
  }

  private createRule(): void {
    const ruleName = this.config!.ruleName;
    const eventBus = this.resolveEventBus();

    this.rule = new events.Rule(this, 'EventBridgeRule', {
      ruleName,
      description: this.config!.description,
      eventPattern: this.config!.eventPattern,
      enabled: this.config!.state === 'enabled',
      eventBus
    });

    this.applyStandardTags(this.rule, {
      'rule-type': 'pattern',
      'event-source': this.config!.eventPattern.source?.join(',') ?? 'unspecified'
    });

    this.logResourceCreation('eventbridge-rule', ruleName, {
      state: this.config!.state,
      eventBus: eventBus.eventBusName
    });
  }

  private resolveEventBus(): events.IEventBus {
    if (this.config!.eventBus?.arn) {
      return events.EventBus.fromEventBusArn(this, 'EventBusArn', this.config!.eventBus.arn);
    }

    const busName = this.config!.eventBus?.name ?? 'default';
    return events.EventBus.fromEventBusName(this, 'EventBusName', busName);
  }

  private configureMonitoring(): void {
    if (!this.config!.monitoring.enabled) {
      return;
    }

    const ruleName = this.rule!.ruleName;

    this.createAlarm('failedInvocations', this.config!.monitoring.failedInvocations, {
      namespace: 'AWS/Events',
      metricName: 'FailedInvocations',
      statistic: this.config!.monitoring.failedInvocations.statistic,
      dimensions: { RuleName: ruleName }
    });

    this.createAlarm('invocations', this.config!.monitoring.invocations, {
      namespace: 'AWS/Events',
      metricName: 'Invocations',
      statistic: this.config!.monitoring.invocations.statistic,
      dimensions: { RuleName: ruleName }
    });

    this.createAlarm('matchedEvents', this.config!.monitoring.matchedEvents, {
      namespace: 'AWS/Events',
      metricName: 'MatchedEvents',
      statistic: this.config!.monitoring.matchedEvents.statistic,
      dimensions: { RuleName: ruleName }
    });

    if (this.deadLetterQueue) {
      this.createAlarm('deadLetterQueueMessages', this.config!.monitoring.deadLetterQueueMessages, {
        namespace: 'AWS/SQS',
        metricName: 'ApproximateNumberOfVisibleMessages',
        statistic: this.config!.monitoring.deadLetterQueueMessages.statistic,
        dimensions: { QueueName: this.deadLetterQueue.queueName }
      });
    }

    if (this.createdAlarms.length > 0) {
      this.logComponentEvent('observability_configured', 'Monitoring configured for EventBridge rule', {
        ruleName,
        alarmsCreated: this.createdAlarms.length
      });
    }
  }

  private createAlarm(id: string, config: AlarmConfig, metricProps: { namespace: string; metricName: string; statistic: string; dimensions: Record<string, string>; }): void {
    if (!config.enabled) {
      return;
    }

    const alarm = new cloudwatch.Alarm(this, `${this.toPascal(id)}Alarm`, {
      alarmName: `${this.context.serviceName}-${this.spec.name}-${id}`,
      alarmDescription: `Alarm for EventBridge rule ${id}`,
      metric: new cloudwatch.Metric({
        namespace: metricProps.namespace,
        metricName: metricProps.metricName,
        statistic: metricProps.statistic,
        dimensionsMap: metricProps.dimensions,
        period: cdk.Duration.minutes(config.periodMinutes)
      }),
      threshold: config.threshold,
      evaluationPeriods: config.evaluationPeriods,
      comparisonOperator: this.mapComparisonOperator(config.comparisonOperator),
      treatMissingData: this.mapTreatMissingData(config.treatMissingData)
    });

    this.applyStandardTags(alarm, {
      'alarm-type': id,
      threshold: config.threshold.toString()
    });

    this.createdAlarms.push({ id, alarm });
  }

  private mapComparisonOperator(operator: AlarmComparisonOperator): cloudwatch.ComparisonOperator {
    switch (operator) {
      case 'gt':
        return cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD;
      case 'gte':
        return cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD;
      case 'lt':
        return cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD;
      case 'lte':
      default:
        return cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD;
    }
  }

  private mapTreatMissingData(value: AlarmTreatMissingData): cloudwatch.TreatMissingData {
    switch (value) {
      case 'breaching':
        return cloudwatch.TreatMissingData.BREACHING;
      case 'ignore':
        return cloudwatch.TreatMissingData.IGNORE;
      case 'missing':
        return cloudwatch.TreatMissingData.MISSING;
      case 'not-breaching':
      default:
        return cloudwatch.TreatMissingData.NOT_BREACHING;
    }
  }

  private buildCapability(): Record<string, any> {
    return {
      ruleName: this.rule!.ruleName,
      ruleArn: this.rule!.ruleArn,
      state: this.config!.state,
      eventBus: this.config!.eventBus?.name ?? this.config!.eventBus?.arn ?? 'default',
      deadLetterQueue: this.deadLetterQueue
        ? {
            queueUrl: this.deadLetterQueue.queueUrl,
            queueArn: this.deadLetterQueue.queueArn
          }
        : undefined
    };
  }

  private toPascal(value: string): string {
    return value
      .split(/[^a-zA-Z0-9]/)
      .filter(Boolean)
      .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join('');
  }
}
