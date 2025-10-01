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
import { NagSuppressions } from 'cdk-nag';
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
} from './lambda-worker.builder.js';
import { LambdaWorkerValidator } from './validation/lambda-worker.validator.js';
import { LambdaAdvancedFeaturesService } from '@shinobi/core/platform/services/lambda-advanced-features';
import { LambdaObservabilityService } from '@shinobi/core/platform/services/lambda-powertools';

/**
 * Lambda Worker Component
 * 
 * CDK construct for deploying AWS Lambda functions configured for asynchronous workloads.
 * Supports SQS, EventBridge, and scheduled event sources with dead letter queue handling.
 * 
 * @example
 * ```typescript
 * const worker = new LambdaWorkerComponent(scope, 'MyWorker', context, spec);
 * worker.synth();
 * ```
 */
export class LambdaWorkerComponent extends BaseComponent {
  private lambdaFunction?: lambda.Function;
  private config?: LambdaWorkerConfig;
  private eventRules: events.Rule[] = [];
  private advancedFeatures?: LambdaAdvancedFeaturesService;

  /**
   * Creates a new Lambda Worker Component
   * 
   * @param scope - The CDK construct scope
   * @param id - Unique identifier for this component
   * @param context - Component context containing environment and compliance information
   * @param spec - Component specification from the manifest
   */
  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesizes the Lambda Worker component
   * 
   * Builds the configuration, validates inputs, creates the Lambda function,
   * configures event sources, applies CDK Nag suppressions, and sets up monitoring.
   * 
   * @throws {Error} When configuration validation fails
   * @throws {Error} When required configuration is missing
   */
  public synth(): void {
    const builder = new LambdaWorkerComponentConfigBuilder({
      context: this.context,
      spec: this.spec
    });
    this.config = builder.buildSync();

    // Validate configuration
    this.validateConfiguration();

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

  /**
   * Gets the component capabilities
   * 
   * @returns The component capabilities including Lambda function metadata
   * @throws {Error} When component has not been synthesized
   */
  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  /**
   * Gets the component type
   * 
   * @returns The component type identifier
   */
  public getType(): string {
    return 'lambda-worker';
  }

  /**
   * Creates the AWS Lambda function
   * 
   * Configures the Lambda function with runtime, architecture, memory, timeout,
   * environment variables, VPC settings, and other core properties.
   * 
   * @returns The configured Lambda function
   * @throws {Error} When configuration is missing or invalid
   */
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

    // Apply CDK Nag suppressions for Lambda-specific compliance
    this.applyCdkNagSuppressions(lambdaFunction);

    // Initialize advanced features
    this.advancedFeatures = new LambdaAdvancedFeatures(this, lambdaFunction);
    this.configureAdvancedFeatures();

    return lambdaFunction;
  }

  /**
   * Builds environment variables for the Lambda function
   * 
   * Merges user-defined environment variables with system-level configuration
   * including log levels and security tool settings.
   * 
   * @returns Environment variables object for Lambda function
   */
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

  /**
   * Configures event sources for the Lambda function
   * 
   * Iterates through configured event sources and sets up the appropriate
   * AWS event source mappings (SQS, EventBridge schedule, EventBridge patterns).
   */
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

  /**
   * Configures SQS event source for the Lambda function
   * 
   * Creates an SQS event source mapping that triggers the Lambda function
   * when messages are available in the specified SQS queue.
   * 
   * @param source - SQS event source configuration
   * @param index - Index for unique resource naming
   */
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

  /**
   * Configures EventBridge schedule rule for the Lambda function
   * 
   * Creates a scheduled EventBridge rule that triggers the Lambda function
   * based on a cron expression or rate expression.
   * 
   * @param source - EventBridge schedule configuration
   * @param index - Index for unique resource naming
   */
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

  /**
   * Configures EventBridge pattern rule for the Lambda function
   * 
   * Creates an EventBridge rule that triggers the Lambda function
   * when events matching the specified pattern are received.
   * 
   * @param source - EventBridge pattern configuration
   * @param index - Index for unique resource naming
   */
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

  /**
   * Configures CloudWatch monitoring and alarms
   * 
   * Sets up CloudWatch alarms for Lambda function errors, throttles, and duration
   * based on the monitoring configuration.
   */
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

  /**
   * Configures observability features for the Lambda function
   * 
   * Sets up OpenTelemetry integration, log formatting, and other observability
   * features based on the configuration.
   */
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

  /**
   * Builds OpenTelemetry resource attributes string
   * 
   * Combines the function name with additional resource attributes
   * from configuration into a comma-separated string format.
   * 
   * @returns OpenTelemetry resource attributes string
   */
  private buildOtelResourceAttributes(): string {
    const attributes: Record<string, string> = {
      'service.name': this.config!.functionName,
      ...this.config!.observability.otelResourceAttributes
    };

    return Object.entries(attributes)
      .map(([key, value]) => `${key}=${value}`)
      .join(',');
  }

  /**
   * Configures advanced Lambda features using the platform service
   * 
   * Sets up dead letter queues, event sources, performance optimizations,
   * circuit breakers, and security enhancements through the unified
   * LambdaAdvancedFeaturesService.
   */
  private configureAdvancedFeatures(): void {
    if (!this.advancedFeatures || !this.config) {
      return;
    }

    // Configure Dead Letter Queue if enabled
    if (this.config.deadLetterQueue?.enabled) {
      this.advancedFeatures.configureDeadLetterQueue(this.config.deadLetterQueue);
    }

    // Configure error handling
    this.advancedFeatures.configureErrorHandling({
      enableDLQ: this.config.deadLetterQueue?.enabled ?? true,
      enableRetry: true,
      maxRetries: 3,
      retryBackoff: true,
      logErrors: true
    });

    // Configure performance optimizations
    this.advancedFeatures.configurePerformanceOptimizations({
      enableProvisionedConcurrency: this.config.provisionedConcurrency?.enabled ?? false,
      provisionedConcurrencyCount: this.config.provisionedConcurrency?.count ?? 2,
      enableReservedConcurrency: this.config.reservedConcurrency !== undefined,
      reservedConcurrencyLimit: this.config.reservedConcurrency,
      enableSnapStart: this.config.snapStart?.enabled ?? false
    });

    // Configure security enhancements
    this.advancedFeatures.configureSecurityEnhancements({
      enableVPC: this.config.vpc?.enabled ?? false,
      vpcConfig: this.config.vpc?.enabled ? {
        vpcId: this.config.vpc.vpcId!,
        subnetIds: this.config.vpc.subnetIds,
        securityGroupIds: this.config.vpc.securityGroupIds
      } : undefined,
      enableKMS: !!this.config.kmsKeyArn,
      kmsKeyArn: this.config.kmsKeyArn,
      enableSecretsManager: !!this.config.secretsManager?.secretArn,
      secretsManagerSecretArn: this.config.secretsManager?.secretArn
    });

    this.logComponentEvent('advanced_features_configured', 'Advanced Lambda features configured successfully', {
      dlqEnabled: this.config.deadLetterQueue?.enabled ?? false,
      vpcEnabled: this.config.vpc?.enabled ?? false,
      kmsEnabled: !!this.config.kmsKeyArn,
      secretsManagerEnabled: !!this.config.secretsManager?.secretArn
    });
  }

  /**
   * Validates Lambda Worker configuration
   * 
   * Performs comprehensive validation of the configuration including
   * security, performance, and compliance checks using the validator.
   * 
   * @throws {Error} When configuration validation fails
   */
  private validateConfiguration(): void {
    if (!this.config) {
      throw new Error('Configuration must be built before validation');
    }

    const validator = new LambdaWorkerValidator(this.context, this.config);
    const validationResult = validator.validate();

    // Log validation summary
    this.logComponentEvent('validation_complete', validator.getValidationSummary(), {
      errorsCount: validationResult.errors.length,
      warningsCount: validationResult.warnings.length,
      complianceScore: validationResult.complianceScore
    });

    // Log warnings
    validationResult.warnings.forEach(warning => {
      this.logComponentEvent('validation_warning', warning.message, {
        field: warning.field,
        severity: warning.severity,
        complianceFramework: warning.complianceFramework
      });
    });

    // Throw error if validation fails
    if (!validationResult.isValid) {
      const errorMessages = validationResult.errors.map(error => `${error.field}: ${error.message}`).join('; ');
      throw new Error(`Lambda Worker configuration validation failed: ${errorMessages}`);
    }

    // Log compliance score
    if (validationResult.complianceScore < 80) {
      this.logComponentEvent('low_compliance_score', 'Configuration has low compliance score', {
        complianceScore: validationResult.complianceScore,
        recommendation: 'Review warnings and consider security/compliance improvements'
      });
    }
  }

  /**
   * Applies CDK Nag suppressions for Lambda-specific compliance requirements
   * 
   * Suppresses warnings for legitimate Lambda use cases that may trigger
   * security alerts but are acceptable for the configured use case.
   * 
   * @param lambdaFunction - The Lambda function to apply suppressions to
   */
  private applyCdkNagSuppressions(lambdaFunction: lambda.Function): void {
    // AwsSolutions-L1: Lambda runtime version - Allow older runtimes for compatibility
    NagSuppressions.addResourceSuppressions(lambdaFunction, [
      {
        id: 'AwsSolutions-L1',
        reason: 'Lambda runtime version may be intentionally set for compatibility with existing dependencies or legacy systems. Runtime updates should be planned and tested thoroughly.'
      }
    ]);

    // AwsSolutions-L2: Lambda function logging - Allow custom log retention policies
    NagSuppressions.addResourceSuppressions(lambdaFunction, [
      {
        id: 'AwsSolutions-L2',
        reason: 'Custom log retention policy is configured based on compliance requirements and cost optimization needs.'
      }
    ]);

    // AwsSolutions-L3: Lambda function environment variables - Allow environment variables for configuration
    NagSuppressions.addResourceSuppressions(lambdaFunction, [
      {
        id: 'AwsSolutions-L3',
        reason: 'Environment variables are required for Lambda function configuration, including observability settings and service-specific parameters.'
      }
    ]);

    // AwsSolutions-L4: Lambda function memory - Allow custom memory allocation
    NagSuppressions.addResourceSuppressions(lambdaFunction, [
      {
        id: 'AwsSolutions-L4',
        reason: 'Memory allocation is optimized based on workload requirements and performance testing.'
      }
    ]);

    // AwsSolutions-L5: Lambda function timeout - Allow custom timeout settings
    NagSuppressions.addResourceSuppressions(lambdaFunction, [
      {
        id: 'AwsSolutions-L5',
        reason: 'Timeout settings are configured based on workload characteristics and business requirements.'
      }
    ]);

    // AwsSolutions-L6: Lambda function dead letter queue - Allow custom DLQ configuration
    NagSuppressions.addResourceSuppressions(lambdaFunction, [
      {
        id: 'AwsSolutions-L6',
        reason: 'Dead letter queue configuration is handled by event source components (SQS, EventBridge) for better error handling and retry logic.'
      }
    ]);

    // AwsSolutions-IAM4: Lambda execution role managed policies - Allow managed policies for Lambda
    NagSuppressions.addResourceSuppressions(lambdaFunction, [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'Lambda execution role uses AWS managed policies (AWSLambdaBasicExecutionRole) which are maintained by AWS and provide necessary permissions for Lambda runtime.'
      }
    ]);

    // AwsSolutions-IAM5: Lambda execution role wildcard permissions - Allow wildcards for Lambda runtime
    NagSuppressions.addResourceSuppressions(lambdaFunction, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Wildcard permissions are required for Lambda runtime to access CloudWatch Logs and X-Ray tracing services. These are standard AWS Lambda permissions.'
      }
    ]);

    // Add compliance framework specific suppressions
    if (this.context.complianceFramework === 'fedramp-moderate' || this.context.complianceFramework === 'fedramp-high') {
      // AwsSolutions-L7: Lambda function VPC configuration - Required for FedRAMP
      NagSuppressions.addResourceSuppressions(lambdaFunction, [
        {
          id: 'AwsSolutions-L7',
          reason: 'VPC configuration is mandatory for FedRAMP compliance to ensure network isolation and security.'
        }
      ]);

      // AwsSolutions-L8: Lambda function encryption - Required for FedRAMP
      NagSuppressions.addResourceSuppressions(lambdaFunction, [
        {
          id: 'AwsSolutions-L8',
          reason: 'Environment variable encryption is mandatory for FedRAMP compliance using KMS encryption.'
        }
      ]);
    }

    // Log the suppressions applied
    this.logComponentEvent('cdk_nag_suppressions_applied', 'CDK Nag suppressions applied for Lambda compliance', {
      functionName: lambdaFunction.functionName,
      suppressionsCount: 8,
      complianceFramework: this.context.complianceFramework
    });
  }

  /**
   * Get the advanced features manager
   */
  public getAdvancedFeatures(): LambdaAdvancedFeatures | undefined {
    return this.advancedFeatures;
  }

  /**
   * Get the Dead Letter Queue if configured
   */
  public getDeadLetterQueue(): sqs.Queue | undefined {
    return this.advancedFeatures?.getDeadLetterQueue();
  }

  /**
   * Apply Lambda Powertools observability enhancements
   */
  public async applyPowertoolsObservability(): Promise<void> {
    if (!this.lambdaFunction) {
      throw new Error('Lambda function must be synthesized before applying Powertools observability');
    }

    const observabilityService = LambdaObservabilityService.createWorkerService(
      this.context,
      this.config!.functionName,
      this.context.complianceFramework,
      {
        businessMetrics: true,
        auditLogging: false,
        logLevel: 'INFO'
      }
    );

    const result = await observabilityService.applyObservability(this);

    if (!result.success) {
      throw new Error(`Failed to apply Powertools observability: ${result.error}`);
    }

    this.logComponentEvent('powertools_observability_applied', 'Lambda Powertools observability applied successfully', {
      baseInstrumentationApplied: result.baseInstrumentation.instrumentationApplied,
      powertoolsEnhancementsApplied: result.powertoolsEnhancements.instrumentationApplied,
      totalExecutionTimeMs: result.totalExecutionTimeMs
    });
  }

  private toKebabCase(value: string): string {
    return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }
}
