import * as sns from 'aws-cdk-lib/aws-sns';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
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
  AlarmComparisonOperator,
  AlarmConfig,
  AlarmTreatMissingData,
  SnsTopicComponentConfigBuilder,
  SnsTopicConfig,
  TopicPolicyPrincipalConfig,
  TopicPolicyStatementConfig
} from './sns-topic.builder.ts';

interface CreatedAlarm {
  id: string;
  alarm: cloudwatch.Alarm;
}

export class SnsTopicComponent extends BaseComponent {
  private topic?: sns.Topic;
  private kmsKey?: kms.Key;
  private importedKey?: kms.IKey;
  private config?: SnsTopicConfig;
  private readonly alarms: CreatedAlarm[] = [];

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting SNS topic synthesis');

    try {
      const builder = new SnsTopicComponentConfigBuilder(this.context, this.spec);
      this.config = builder.buildSync();

      this.logComponentEvent('config_resolved', 'Resolved SNS topic configuration', {
        topicName: this.config.topicName,
        fifo: this.config.fifo.enabled,
        encryptionEnabled: this.config.encryption.enabled,
        monitoringEnabled: this.config.monitoring.enabled
      });

      const key = this.resolveEncryptionKey();
      this.createTopic(key);
      this.applyPolicies();
      this.configureMonitoring();

      this.registerConstruct('main', this.topic!);
      this.registerConstruct('topic', this.topic!);

      if (this.kmsKey) {
        this.registerConstruct('kmsKey', this.kmsKey);
      }

      this.alarms.forEach(({ id, alarm }) => {
        this.registerConstruct(`alarm:${id}`, alarm);
      });

      this.registerCapability('topic:sns', this.buildCapability());

      this.logComponentEvent('synthesis_complete', 'SNS topic synthesis complete', {
        topicArn: this.topic!.topicArn,
        alarmsCreated: this.alarms.length
      });
    } catch (error) {
      this.logError(error as Error, 'sns-topic:synth', {
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
    return 'sns-topic';
  }

  private resolveEncryptionKey(): kms.IKey | undefined {
    const encryption = this.config!.encryption;
    if (!encryption.enabled) {
      return undefined;
    }

    if (encryption.customerManagedKey.create) {
      const key = new kms.Key(this, 'SnsTopicKey', {
        description: `Customer managed key for ${this.context.serviceName}-${this.spec.name} SNS topic`,
        enableKeyRotation: encryption.customerManagedKey.enableRotation
      });

      if (encryption.customerManagedKey.alias) {
        key.addAlias(encryption.customerManagedKey.alias);
      }

      this.applyStandardTags(key, {
        'resource-type': 'kms-key',
        'sns-topic': this.getTopicName(),
        'key-rotation': encryption.customerManagedKey.enableRotation.toString()
      });

      this.kmsKey = key;
      return key;
    }

    if (encryption.kmsKeyArn) {
      this.importedKey = kms.Key.fromKeyArn(this, 'ImportedSnsKey', encryption.kmsKeyArn);
      return this.importedKey;
    }

    return undefined;
  }

  private createTopic(masterKey?: kms.IKey): void {
    const topicProps: sns.TopicProps = {
      topicName: this.getTopicName(),
      displayName: this.config!.displayName,
      masterKey,
      fifo: this.config!.fifo.enabled,
      contentBasedDeduplication: this.config!.fifo.contentBasedDeduplication
    };

    this.topic = new sns.Topic(this, 'Topic', topicProps);

    const cfnTopic = this.topic.node.defaultChild as sns.CfnTopic;
    cfnTopic.tracingConfig = this.config!.tracing;

    if (this.config!.deliveryPolicy) {
      cfnTopic.deliveryPolicy = this.config!.deliveryPolicy;
    }

    this.applyStandardTags(this.topic, {
      'fifo-enabled': this.config!.fifo.enabled.toString(),
      'encryption-enabled': this.config!.encryption.enabled.toString()
    });

    this.logResourceCreation('sns-topic', this.topic.topicName, {
      fifo: this.config!.fifo.enabled,
      encryptionEnabled: this.config!.encryption.enabled
    });
  }

  private applyPolicies(): void {
    if (!this.topic || this.config!.policies.length === 0) {
      return;
    }

    this.config!.policies.forEach(statementConfig => {
      const statement = this.buildPolicyStatement(statementConfig);
      this.topic!.addToResourcePolicy(statement);
    });
  }

  private buildPolicyStatement(config: TopicPolicyStatementConfig): iam.PolicyStatement {
    const effect = config.effect === 'deny' ? iam.Effect.DENY : iam.Effect.ALLOW;
    const statement = new iam.PolicyStatement({
      effect,
      actions: config.actions,
      resources: config.resources ?? [this.topic!.topicArn]
    });

    if (config.sid) {
      statement.sid = config.sid;
    }

    if (config.principals && config.principals.length > 0) {
      config.principals.forEach(principalConfig => {
        this.applyPrincipal(statement, principalConfig);
      });
    } else {
      statement.addAnyPrincipal();
    }

    if (config.conditions) {
      Object.entries(config.conditions).forEach(([operator, condition]) => {
        statement.addCondition(operator, condition);
      });
    }

    return statement;
  }

  private applyPrincipal(statement: iam.PolicyStatement, principal: TopicPolicyPrincipalConfig): void {
    switch (principal.type) {
      case 'service':
        (principal.identifiers ?? []).forEach(identifier => {
          statement.addServicePrincipal(identifier);
        });
        break;
      case 'account':
        (principal.identifiers ?? []).forEach(identifier => {
          statement.addAccountPrincipal(identifier);
        });
        break;
      case 'any':
      default:
        statement.addAnyPrincipal();
        break;
    }
  }

  private configureMonitoring(): void {
    if (!this.config!.monitoring.enabled) {
      return;
    }

    const alarms = this.config!.monitoring.alarms;
    const topicName = this.topic!.topicName;

    this.createAlarm('failedNotifications', alarms.failedNotifications, {
      namespace: 'AWS/SNS',
      metricName: 'NumberOfNotificationsFailed',
      statistic: alarms.failedNotifications.statistic,
      dimensions: { TopicName: topicName }
    });

    this.createAlarm('messageRate', alarms.messageRate, {
      namespace: 'AWS/SNS',
      metricName: 'NumberOfMessagesPublished',
      statistic: alarms.messageRate.statistic,
      dimensions: { TopicName: topicName }
    });

    if (this.alarms.length > 0) {
      this.logComponentEvent('observability_configured', 'Monitoring configured for SNS topic', {
        topicName,
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
      alarmDescription: `SNS topic ${id} alarm`,
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
      topicArn: this.topic!.topicArn,
      encrypted: this.config!.encryption.enabled,
      fifo: this.config!.fifo.enabled,
      tracing: this.config!.tracing,
      masterKeyArn: this.kmsKey?.keyArn ?? this.importedKey?.keyArn
    };
  }

  private getTopicName(): string {
    const baseName = this.config!.topicName ?? `${this.context.serviceName}-${this.spec.name}`;
    if (this.config!.fifo.enabled && !baseName.endsWith('.fifo')) {
      return `${baseName}.fifo`;
    }
    return baseName;
  }

  private toPascal(value: string): string {
    return value
      .split(/[^a-zA-Z0-9]/)
      .filter(Boolean)
      .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join('');
  }
}
