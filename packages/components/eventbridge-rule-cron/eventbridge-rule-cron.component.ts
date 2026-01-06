import * as events from 'aws-cdk-lib/aws-events';
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
  EventBridgeRuleCronComponentConfigBuilder,
  EventBridgeRuleCronConfig
} from './eventbridge-rule-cron.builder.js';

interface CreatedAlarm {
  id: string;
  alarm: cloudwatch.Alarm;
}

export class EventBridgeRuleCronComponent extends BaseComponent {
  private rule?: events.Rule;
  private config?: EventBridgeRuleCronConfig;
  private readonly alarms: CreatedAlarm[] = [];

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting EventBridge cron rule synthesis');

    try {
      const builder = new EventBridgeRuleCronComponentConfigBuilder(this.context, this.spec);
      this.config = builder.buildSync();

      this.logComponentEvent('config_resolved', 'Resolved EventBridge cron configuration', {
        ruleName: this.config.ruleName,
        schedule: this.config.schedule,
        monitoringEnabled: this.config.monitoring.enabled,
        dlqEnabled: this.config.deadLetterQueue.enabled
      });

      this.createRule();
      this.configureLogGroup();
      this.configureMonitoring();

      this.registerConstruct('main', this.rule!);
      this.registerConstruct('rule', this.rule!);

      this.alarms.forEach(({ id, alarm }) => {
        this.registerConstruct(`alarm:${id}`, alarm);
      });

      this.registerCapability('eventbridge:rule-cron', this.buildCapability());

      this.logComponentEvent('synthesis_complete', 'EventBridge cron rule synthesized successfully', {
        ruleArn: this.rule!.ruleArn,
        alarmsCreated: this.alarms.length
      });
    } catch (error) {
      this.logError(error as Error, 'eventbridge-rule-cron:synth', {
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
    return 'eventbridge-rule-cron';
  }

  private createRule(): void {
    this.rule = new events.Rule(this, 'Rule', {
      ruleName: this.config!.ruleName,
      description: this.config!.description ?? `Cron rule for ${this.context.serviceName}-${this.spec.name}`,
      schedule: events.Schedule.expression(this.config!.schedule),
      enabled: this.config!.state === 'enabled'
    });

    this.applyStandardTags(this.rule, {
      'rule-type': 'cron',
      'schedule-expression': this.config!.schedule,
      'rule-state': this.config!.state,
      ...this.config!.tags
    });

    this.logResourceCreation('eventbridge-rule', this.rule.ruleName, {
      schedule: this.config!.schedule,
      state: this.config!.state
    });
  }

  private configureLogGroup(): void {
    const logsConfig = this.config!.monitoring.cloudWatchLogs;
    if (!logsConfig.enabled) {
      return;
    }

    const logGroup = new logs.LogGroup(this, 'RuleLogGroup', {
      logGroupName: logsConfig.logGroupName ?? `/aws/events/rule/${this.context.serviceName}-${this.spec.name}`,
      retention: this.mapLogRetentionDays(logsConfig.retentionDays),
      removalPolicy: logsConfig.removalPolicy === 'retain' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    this.applyStandardTags(logGroup, {
      'log-type': 'eventbridge',
      'rule-name': this.config!.ruleName
    });

    this.registerConstruct('logGroup', logGroup);

    this.logResourceCreation('cloudwatch-log-group', logGroup.logGroupName, {
      retentionDays: logsConfig.retentionDays,
      removalPolicy: logsConfig.removalPolicy
    });
  }

  private configureMonitoring(): void {
    if (!this.config!.monitoring.enabled) {
      return;
    }

    const alarms = this.config!.monitoring.alarms;
    const ruleName = this.rule!.ruleName;

    this.createAlarm('failedInvocations', alarms.failedInvocations, {
      namespace: 'AWS/Events',
      metricName: 'FailedInvocations',
      statistic: alarms.failedInvocations.statistic,
      dimensions: { RuleName: ruleName }
    });

    this.createAlarm('invocationRate', alarms.invocationRate, {
      namespace: 'AWS/Events',
      metricName: 'Invocations',
      statistic: alarms.invocationRate.statistic,
      dimensions: { RuleName: ruleName }
    });

    if (this.alarms.length > 0) {
      this.logComponentEvent('observability_configured', 'Monitoring configured for EventBridge rule', {
        ruleName,
        alarmsCreated: this.alarms.length
      });
    }
  }

  private createAlarm(id: string, config: AlarmConfig, metricProps: { namespace: string; metricName: string; statistic: string; dimensions: Record<string, string>; }): void {
    if (!config.enabled) {
      return;
    }

    const alarm = new cloudwatch.Alarm(this, `${this.toPascal(id)}Alarm`, {
      alarmName: `${this.context.serviceName}-${this.spec.name}-${id}`,
      alarmDescription: `EventBridge rule ${id} alarm`,
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

    this.alarms.push({ id, alarm });
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
      ruleArn: this.rule!.ruleArn,
      ruleName: this.rule!.ruleName,
      schedule: this.config!.schedule,
      state: this.config!.state,
      eventBus: this.config!.eventBus?.arn ?? this.config!.eventBus?.name ?? 'default',
      deadLetterQueue: this.config!.deadLetterQueue,
      input: this.config!.input,
      monitoring: {
        enabled: this.config!.monitoring.enabled,
        cloudWatchLogs: this.config!.monitoring.cloudWatchLogs
      }
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
