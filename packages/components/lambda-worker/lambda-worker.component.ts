import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  BaseComponent,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@shinobi/core';
import {
  LambdaWorkerComponentConfigBuilder,
  LambdaWorkerConfig,
  LambdaEventSource
} from './lambda-worker.builder';

export class LambdaWorkerComponent extends BaseComponent {
  private lambdaFunction?: lambda.Function;
  private config?: LambdaWorkerConfig;
  private eventRules: events.Rule[] = [];

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    const builder = new LambdaWorkerComponentConfigBuilder({
      context: this.context,
      spec: this.spec
    });
    this.config = builder.buildSync();

    this.logComponentEvent('config_resolved', 'Resolved lambda worker configuration', {
      functionName: this.config.functionName,
      runtime: this.config.runtime,
      memory: this.config.memorySize,
      timeoutSeconds: this.config.timeoutSeconds,
      hardeningProfile: this.config.hardeningProfile
    });

    this.lambdaFunction = this.createLambdaFunction();
    this.configureEventSources();
    this.configureMonitoring();
    this.configureObservability();

    this.registerConstruct('main', this.lambdaFunction);
    this.registerConstruct('lambdaFunction', this.lambdaFunction);
    this.eventRules.forEach((rule, index) => {
      this.registerConstruct(`eventRule:${index}`, rule);
    });

    this.registerCapability('lambda:function', this.buildCapability());

    this.logComponentEvent('synthesis_complete', 'Lambda worker synthesis complete', {
      functionArn: this.lambdaFunction.functionArn,
      vpcEnabled: this.config.vpc?.enabled ?? false,
      eventSources: this.config.eventSources.length
    });
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'lambda-worker';
  }

  private createLambdaFunction(): lambda.Function {
    const runtime = this.mapRuntime(this.config!.runtime);
    const architecture = this.mapArchitecture(this.config!.architecture);

    const code = lambda.Code.fromAsset(path.resolve(this.config!.codePath));

    const props: lambda.FunctionProps = {
      functionName: this.config!.functionName,
      description: this.config!.description,
      handler: this.config!.handler,
      runtime,
      architecture,
      memorySize: this.config!.memorySize,
      timeout: cdk.Duration.seconds(this.config!.timeoutSeconds),
      code,
      environment: this.buildEnvironment(),
      reservedConcurrentExecutions: this.config!.reservedConcurrency,
      tracing: this.config!.tracing.mode === 'Active' ? lambda.Tracing.ACTIVE : lambda.Tracing.PASS_THROUGH,
      logRetention: this.mapLogRetentionDays(this.config!.logging.logRetentionDays),
      logRetentionRetryOptions: {
        base: cdk.Duration.seconds(2),
        maxRetries: 5
      }
    };

    if (this.config?.kmsKeyArn) {
      props.environmentEncryption = kms.Key.fromKeyArn(this, 'LambdaEnvironmentKey', this.config.kmsKeyArn);
    }

    if (this.config?.vpc?.enabled) {
      if (!this.config.vpc.vpcId) {
        throw new Error('Lambda worker VPC configuration must include vpcId when enabled.');
      }

      const vpc = ec2.Vpc.fromLookup(this, 'LambdaVpc', {
        vpcId: this.config.vpc.vpcId
      });

      const subnets = this.config.vpc.subnetIds.length > 0
        ? this.config.vpc.subnetIds.map((subnetId, index) => ec2.Subnet.fromSubnetId(this, `LambdaSubnet${index}`, subnetId))
        : vpc.privateSubnets;

      const securityGroups = this.config.vpc.securityGroupIds.map((sgId, index) =>
        ec2.SecurityGroup.fromSecurityGroupId(this, `LambdaSecurityGroup${index}`, sgId)
      );

      props.vpc = vpc;
      props.vpcSubnets = { subnets };
      props.securityGroups = securityGroups;
    }

    const lambdaFunction = new lambda.Function(this, 'LambdaWorkerFunction', props);
    lambdaFunction.applyRemovalPolicy(this.config!.removalPolicy === 'destroy' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN);

    this.applyStandardTags(lambdaFunction, {
      'lambda-runtime': this.config!.runtime,
      'architecture': this.config!.architecture,
      'hardening-profile': this.config!.hardeningProfile,
      ...this.config!.tags
    });

    return lambdaFunction;
  }

  private buildEnvironment(): Record<string, string> {
    const env: Record<string, string> = {
      ...this.config!.environment,
      SYSTEM_LOG_LEVEL: this.config!.logging.systemLogLevel,
      APPLICATION_LOG_LEVEL: this.config!.logging.applicationLogLevel
    };

    if (this.config!.securityTools.falco) {
      env.FALCO_ENABLED = 'true';
    }

    return env;
  }

  private configureEventSources(): void {
    this.config!.eventSources.forEach((source, index) => {
      if (!this.lambdaFunction) {
        return;
      }

      switch (source.type) {
        case 'sqs':
          this.configureSqsEventSource(source, index);
          break;
        case 'eventBridge':
          this.configureEventBridgeRule(source, index);
          break;
        case 'eventBridgePattern':
          this.configureEventBridgePattern(source, index);
          break;
        default:
          break;
      }
    });
  }

  private configureSqsEventSource(source: LambdaEventSource, index: number): void {
    if (source.type !== 'sqs') {
      return;
    }

    const queue = sqs.Queue.fromQueueArn(this, `LambdaWorkerQueue${index}`, source.queueArn);

    const eventSource = new lambdaEventSources.SqsEventSource(queue, {
      batchSize: source.batchSize ?? 10,
      enabled: source.enabled ?? true,
      maxBatchingWindow: source.maximumBatchingWindowSeconds
        ? cdk.Duration.seconds(source.maximumBatchingWindowSeconds)
        : undefined,
      maxConcurrency: source.scalingConfig?.maximumConcurrency
    });

    this.lambdaFunction!.addEventSource(eventSource);
  }

  private configureEventBridgeRule(source: LambdaEventSource, index: number): void {
    if (source.type !== 'eventBridge') {
      return;
    }

    const rule = new events.Rule(this, `LambdaWorkerSchedule${index}`, {
      schedule: events.Schedule.expression(source.scheduleExpression),
      enabled: source.enabled ?? true
    });

    rule.addTarget(new targets.LambdaFunction(this.lambdaFunction!, {
      event: source.input ? targets.RuleTargetInput.fromObject(source.input) : undefined
    }));

    this.eventRules.push(rule);
  }

  private configureEventBridgePattern(source: LambdaEventSource, index: number): void {
    if (source.type !== 'eventBridgePattern') {
      return;
    }

    const eventBus = source.eventBusArn
      ? events.EventBus.fromEventBusArn(this, `LambdaWorkerBus${index}`, source.eventBusArn)
      : undefined;

    const rule = new events.Rule(this, `LambdaWorkerPattern${index}`, {
      eventBus,
      eventPattern: source.pattern,
      enabled: source.enabled ?? true
    });

    rule.addTarget(new targets.LambdaFunction(this.lambdaFunction!, {
      event: source.input ? targets.RuleTargetInput.fromObject(source.input) : undefined
    }));

    this.eventRules.push(rule);
  }

  private configureMonitoring(): void {
    if (!this.config?.monitoring.enabled || !this.lambdaFunction) {
      return;
    }

    const alarms = [
      {
        id: 'ErrorsAlarm',
        metricName: 'Errors',
        config: this.config.monitoring.alarms.errors,
        defaultThreshold: 1,
        statistic: this.config.monitoring.alarms.errors.statistic ?? 'Sum'
      },
      {
        id: 'ThrottlesAlarm',
        metricName: 'Throttles',
        config: this.config.monitoring.alarms.throttles,
        defaultThreshold: 1,
        statistic: this.config.monitoring.alarms.throttles.statistic ?? 'Sum'
      },
      {
        id: 'DurationAlarm',
        metricName: 'Duration',
        config: this.config.monitoring.alarms.duration,
        defaultThreshold: 60000,
        statistic: this.config.monitoring.alarms.duration.statistic ?? 'Average'
      }
    ];

    alarms.forEach(alarmDef => {
      if (!alarmDef.config.enabled) {
        return;
      }

      const alarm = new cloudwatch.Alarm(this, `LambdaWorker${alarmDef.id}`, {
        alarmName: `${this.context.serviceName}-${this.spec.name}-${this.toKebabCase(alarmDef.id)}`,
        alarmDescription: `Lambda worker alarm for ${alarmDef.metricName}`,
        metric: new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: alarmDef.metricName,
          statistic: alarmDef.statistic,
          period: cdk.Duration.minutes(alarmDef.config.periodMinutes ?? 5),
          dimensionsMap: {
            FunctionName: this.lambdaFunction!.functionName
          }
        }),
        threshold: alarmDef.config.threshold ?? alarmDef.defaultThreshold,
        evaluationPeriods: alarmDef.config.evaluationPeriods ?? 1,
        comparisonOperator: this.mapComparisonOperator(alarmDef.config.comparisonOperator ?? 'gt'),
        treatMissingData: this.mapTreatMissingData(alarmDef.config.treatMissingData ?? 'not-breaching')
      });

      this.applyStandardTags(alarm, {
        'resource-type': 'cloudwatch-alarm',
        'alarm-id': alarmDef.id,
        ...alarmDef.config.tags
      });
    });
  }

  private configureObservability(): void {
    if (!this.lambdaFunction) {
      return;
    }

    // Always expose log format and log levels from config
    this.lambdaFunction.addEnvironment('AWS_LAMBDA_LOG_FORMAT', this.config!.logging.logFormat);

    // Lightweight OTel integration when enabled
    if (this.config!.observability.otelEnabled) {
      this.lambdaFunction.addEnvironment('AWS_LAMBDA_EXEC_WRAPPER', '/opt/otel-handler');
      this.lambdaFunction.addEnvironment(
        'OTEL_RESOURCE_ATTRIBUTES',
        this.buildOtelResourceAttributes()
      );

      if (this.config!.observability.otelLayerArn) {
        this.lambdaFunction.addLayers(
          lambda.LayerVersion.fromLayerVersionArn(this, 'OtelLayer', this.config!.observability.otelLayerArn)
        );
      }
    }
  }

  private buildCapability(): Record<string, any> {
    return {
      functionArn: this.lambdaFunction!.functionArn,
      functionName: this.lambdaFunction!.functionName,
      runtime: this.config!.runtime,
      architecture: this.config!.architecture,
      memorySize: this.config!.memorySize,
      timeoutSeconds: this.config!.timeoutSeconds,
      hardeningProfile: this.config!.hardeningProfile,
      vpcEnabled: this.config!.vpc?.enabled ?? false
    };
  }

  private mapRuntime(runtime: string): lambda.Runtime {
    switch (runtime) {
      case 'nodejs18.x':
        return lambda.Runtime.NODEJS_18_X;
      case 'python3.9':
        return lambda.Runtime.PYTHON_3_9;
      case 'python3.10':
        return lambda.Runtime.PYTHON_3_10;
      case 'python3.11':
        return lambda.Runtime.PYTHON_3_11;
      case 'nodejs20.x':
      default:
        return lambda.Runtime.NODEJS_20_X;
    }
  }

  private mapArchitecture(architecture: string): lambda.Architecture {
    return architecture === 'arm64' ? lambda.Architecture.ARM_64 : lambda.Architecture.X86_64;
  }

  private mapComparisonOperator(operator: string): cloudwatch.ComparisonOperator {
    switch (operator) {
      case 'lt':
        return cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD;
      case 'lte':
        return cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD;
      case 'gte':
        return cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD;
      case 'gt':
      default:
        return cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD;
    }
  }

  private mapTreatMissingData(mode: string): cloudwatch.TreatMissingData {
    switch (mode) {
      case 'breaching':
        return cloudwatch.TreatMissingData.BREACHING;
      case 'ignore':
        return cloudwatch.TreatMissingData.IGNORE;
      case 'missing':
        return cloudwatch.TreatMissingData.MISSING;
      default:
        return cloudwatch.TreatMissingData.NOT_BREACHING;
    }
  }

  private buildOtelResourceAttributes(): string {
    const attributes: Record<string, string> = {
      'service.name': this.config!.functionName,
      ...this.config!.observability.otelResourceAttributes
    };

    return Object.entries(attributes)
      .map(([key, value]) => `${key}=${value}`)
      .join(',');
  }

  private toKebabCase(value: string): string {
    return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }
}
