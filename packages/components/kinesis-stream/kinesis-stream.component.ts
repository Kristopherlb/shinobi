import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@platform/contracts';
import {
  KinesisStreamComponentConfigBuilder,
  KinesisStreamConfig,
  KinesisStreamAlarmConfig,
  KinesisStreamMonitoringConfig
} from './kinesis-stream.builder.js';

export class KinesisStreamComponent extends Component {
  private stream?: kinesis.Stream;
  private kmsKey?: kms.IKey;
  private managedKmsKey?: kms.Key;
  private config?: KinesisStreamConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting Kinesis stream synthesis');

    try {
      const builder = new KinesisStreamComponentConfigBuilder(this.context, this.spec);
      this.config = builder.buildSync();

      this.logComponentEvent('config_resolved', 'Resolved Kinesis stream configuration', {
        streamName: this.config.streamName,
        streamMode: this.config.streamMode,
        shardCount: this.config.shardCount,
        retentionHours: this.config.retentionHours,
        encryption: this.config.encryption.type,
        monitoringEnabled: this.config.monitoring.enabled
      });

      this.resolveEncryptionKey();
      this.createStream();
      this.configureMonitoring();

      this.registerConstruct('main', this.stream!);
      this.registerConstruct('stream', this.stream!);
      if (this.managedKmsKey) {
        this.registerConstruct('kmsKey', this.managedKmsKey);
      }

      this.registerCapability('stream:kinesis', this.buildCapability());

      this.logComponentEvent('synthesis_complete', 'Kinesis stream synthesis completed', {
        streamName: this.stream!.streamName,
        streamArn: this.stream!.streamArn
      });
    } catch (error) {
      this.logError(error as Error, 'kinesis stream synthesis');
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'kinesis-stream';
  }

  private resolveEncryptionKey(): void {
    this.kmsKey = undefined;
    this.managedKmsKey = undefined;

    const encryption = this.config!.encryption;
    if (encryption.type !== 'kms') {
      return;
    }

    if (encryption.kmsKeyArn) {
      this.kmsKey = kms.Key.fromKeyArn(this, 'ImportedKinesisKey', encryption.kmsKeyArn);
      return;
    }

    if (encryption.customerManagedKey?.create) {
      const key = new kms.Key(this, 'KinesisStreamKey', {
        description: `Customer managed key for ${this.spec.name} Kinesis stream`,
        enableKeyRotation: encryption.customerManagedKey.enableRotation ?? true
      });

      if (encryption.customerManagedKey.alias) {
        key.addAlias(encryption.customerManagedKey.alias);
      }

      this.applyStandardTags(key, {
        'encryption-scope': 'kinesis-stream',
        'managed-by': 'shinobi'
      });

      this.kmsKey = key;
      this.managedKmsKey = key;
    }
  }

  private createStream(): void {
    const props: kinesis.StreamProps = {
      streamName: this.config!.streamName,
      retentionPeriod: cdk.Duration.hours(this.config!.retentionHours)
    };

    if (this.config!.streamMode === 'on-demand') {
      props.streamMode = kinesis.StreamMode.ON_DEMAND;
    } else {
      props.shardCount = this.config!.shardCount ?? 1;
    }

    switch (this.config!.encryption.type) {
      case 'kms':
        if (this.kmsKey) {
          props.encryption = kinesis.StreamEncryption.KMS;
          props.encryptionKey = this.kmsKey;
        } else {
          props.encryption = kinesis.StreamEncryption.KMS_MANAGED;
          this.logComponentEvent('encryption_fallback', 'Kinesis stream encryption set to AWS-managed KMS key');
        }
        break;
      case 'aws-managed':
        props.encryption = kinesis.StreamEncryption.MANAGED;
        break;
      default:
        props.encryption = kinesis.StreamEncryption.UNENCRYPTED;
        break;
    }

    this.stream = new kinesis.Stream(this, 'KinesisStream', props);

    this.applyStandardTags(this.stream, {
      'stream-mode': this.config!.streamMode,
      'shard-count': this.config!.streamMode === 'provisioned'
        ? (this.config!.shardCount ?? 1).toString()
        : 'on-demand',
      'encryption': this.config!.encryption.type
    });

    this.logResourceCreation('kinesis-stream', this.stream.streamName, {
      streamMode: this.config!.streamMode,
      shardCount: this.config!.shardCount,
      retentionHours: this.config!.retentionHours,
      encryption: this.config!.encryption.type
    });
  }

  private configureMonitoring(): void {
    const monitoring = this.config!.monitoring;
    if (!monitoring.enabled) {
      return;
    }

    if (monitoring.enhancedMetrics) {
      this.logComponentEvent('enhanced_metrics_requested', 'Enhanced metrics requested for Kinesis stream', {
        streamName: this.stream!.streamName
      });
    }

    this.createAlarm(
      'IteratorAgeAlarm',
      monitoring,
      monitoring.alarms?.iteratorAgeMs,
      {
        alarmName: `${this.context.serviceName}-${this.spec.name}-iterator-age`,
        metricName: 'GetRecords.IteratorAgeMilliseconds',
        statistic: 'Maximum'
      }
    );

    this.createAlarm(
      'ReadThroughputAlarm',
      monitoring,
      monitoring.alarms?.readProvisionedExceeded,
      {
        alarmName: `${this.context.serviceName}-${this.spec.name}-read-provisioned`,
        metricName: 'ReadProvisionedThroughputExceeded',
        statistic: 'Sum'
      }
    );

    this.createAlarm(
      'WriteThroughputAlarm',
      monitoring,
      monitoring.alarms?.writeProvisionedExceeded,
      {
        alarmName: `${this.context.serviceName}-${this.spec.name}-write-provisioned`,
        metricName: 'WriteProvisionedThroughputExceeded',
        statistic: 'Sum'
      }
    );
  }

  private createAlarm(
    id: string,
    monitoring: KinesisStreamMonitoringConfig,
    alarmConfig: KinesisStreamAlarmConfig | undefined,
    options: { alarmName: string; metricName: string; statistic: string }
  ): void {
    if (!alarmConfig?.enabled) {
      return;
    }

    const metric = new cloudwatch.Metric({
      namespace: 'AWS/Kinesis',
      metricName: options.metricName,
      dimensionsMap: {
        StreamName: this.stream!.streamName
      },
      statistic: alarmConfig.statistic ?? options.statistic,
      period: cdk.Duration.minutes(alarmConfig.periodMinutes ?? 5)
    });

    const alarm = new cloudwatch.Alarm(this, id, {
      alarmName: options.alarmName,
      alarmDescription: `${options.metricName} alarm for ${this.spec.name}`,
      metric,
      threshold: alarmConfig.threshold ?? this.defaultThresholdForMetric(options.metricName),
      evaluationPeriods: alarmConfig.evaluationPeriods ?? 2,
      comparisonOperator: this.resolveComparisonOperator(alarmConfig.comparisonOperator),
      treatMissingData: this.resolveTreatMissingData(alarmConfig.treatMissingData)
    });

    this.applyStandardTags(alarm, {
      'alarm-metric': options.metricName.toLowerCase(),
      ...(alarmConfig.tags ?? {})
    });

    this.registerConstruct(`${id}Construct`, alarm);
  }

  private defaultThresholdForMetric(metricName: string): number {
    if (metricName === 'GetRecords.IteratorAgeMilliseconds') {
      return 600000;
    }
    return 1;
  }

  private resolveComparisonOperator(operator?: string): cloudwatch.ComparisonOperator {
    switch (operator) {
      case 'gt':
        return cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD;
      case 'lt':
        return cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD;
      case 'lte':
        return cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD;
      case 'gte':
      default:
        return cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD;
    }
  }

  private resolveTreatMissingData(value?: string): cloudwatch.TreatMissingData {
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
      type: 'stream:kinesis',
      streamName: this.stream!.streamName,
      streamArn: this.stream!.streamArn,
      streamMode: this.config!.streamMode,
      shardCount: this.config!.shardCount,
      retentionHours: this.config!.retentionHours,
      encryption: this.config!.encryption.type,
      kmsKeyArn: this.kmsKey?.keyArn,
      hardeningProfile: this.config!.hardeningProfile
    };
  }
}
