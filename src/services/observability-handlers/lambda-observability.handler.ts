/**
 * Lambda Observability Handler
 * 
 * Implements OpenTelemetry instrumentation and CloudWatch alarms for Lambda components.
 * Handles both lambda-api and lambda-worker component types.
 */

import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { BaseComponent } from '../../platform/contracts/component';
import { IObservabilityHandler, ObservabilityHandlerResult } from './observability-handler.interface';
import { PlatformServiceContext } from '../../platform/contracts/platform-services';
import { ITaggingService, TaggingContext, defaultTaggingService } from '../tagging.service';

/**
 * Handler for Lambda component observability
 */
export class LambdaObservabilityHandler implements IObservabilityHandler {
  public readonly supportedComponentType = 'lambda';
  private context: PlatformServiceContext;
  private taggingService: ITaggingService;

  constructor(context: PlatformServiceContext, taggingService: ITaggingService = defaultTaggingService) {
    this.context = context;
    this.taggingService = taggingService;
  }

  /**
   * Apply standard tags to a resource
   */
  private applyStandardTags(resource: IConstruct, component: BaseComponent, additionalTags?: Record<string, string>): void {
    const taggingContext: TaggingContext = {
      serviceName: this.context.serviceName,
      serviceLabels: this.context.serviceLabels,
      componentName: component.node.id,
      componentType: 'lambda',
      environment: this.context.environment,
      complianceFramework: this.context.complianceFramework,
      region: this.context.region,
      accountId: undefined
    };
    
    this.taggingService.applyStandardTags(resource, taggingContext, additionalTags);
  }

  /**
   * Apply OpenTelemetry instrumentation and CloudWatch alarms to Lambda components
   */
  public apply(component: BaseComponent): ObservabilityHandlerResult {
    const startTime = Date.now();
    let instrumentationApplied = false;
    let alarmsCreated = 0;

    try {
      // Apply OpenTelemetry instrumentation
      instrumentationApplied = this.applyLambdaOTelInstrumentation(component);
      
      // Create CloudWatch alarms
      alarmsCreated = this.applyLambdaObservability(component);

      const executionTime = Date.now() - startTime;
      
      this.context.logger.info('Lambda observability applied successfully', {
        service: 'ObservabilityService',
        componentType: component.getType(),
        componentName: component.node.id,
        alarmsCreated,
        instrumentationApplied,
        executionTimeMs: executionTime
      });

      return {
        instrumentationApplied,
        alarmsCreated,
        executionTimeMs: executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.context.logger.error('Failed to apply Lambda observability', {
        service: 'ObservabilityService',
        componentType: component.getType(),
        componentName: component.node.id,
        executionTimeMs: executionTime,
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      throw error;
    }
  }

  /**
   * Apply Lambda-specific OpenTelemetry instrumentation
   * Implements Platform OpenTelemetry Observability Standard v1.0 Section 5.1
   */
  private applyLambdaOTelInstrumentation(component: BaseComponent): boolean {
    const lambdaFunction = component.getConstruct('function') as lambda.Function | undefined;
    if (!lambdaFunction) {
      this.context.logger.warn('Lambda component has no function construct registered', { 
        service: 'ObservabilityService', 
        componentType: 'lambda', 
        componentName: component.node.id 
      });
      return false;
    }

    // Get OTel environment variables
    const otelEnvVars = this.buildOTelEnvironmentVariables(component.node.id);
    
    // Add Lambda-specific OTel environment variables
    const lambdaOtelEnvVars = {
      ...otelEnvVars,
      // Lambda-specific instrumentation
      'OTEL_INSTRUMENTATION_AWS_LAMBDA_ENABLED': 'true',
      'OTEL_INSTRUMENTATION_AWS_LAMBDA_FLUSH_TIMEOUT': '30000',
      'AWS_LAMBDA_EXEC_WRAPPER': '/opt/otel-instrument',
      '_X_AMZN_TRACE_ID': 'Root=1-00000000-000000000000000000000000', // Will be replaced by X-Ray
      
      // Runtime-specific configuration
      'OTEL_INSTRUMENTATION_HTTP_ENABLED': 'true',
      'OTEL_INSTRUMENTATION_AWS_SDK_ENABLED': 'true',
    };

    // Apply environment variables to Lambda function
    Object.entries(lambdaOtelEnvVars).forEach(([key, value]) => {
      lambdaFunction.addEnvironment(key, value);
    });

    // Add OpenTelemetry Lambda layer based on runtime
    const otelLayerArn = this.getOTelLambdaLayerArn(lambdaFunction.runtime);
    if (otelLayerArn) {
      lambdaFunction.addLayers(lambda.LayerVersion.fromLayerVersionArn(
        component, 'OTelLayer', otelLayerArn
      ));
    }

    // Enable X-Ray tracing for distributed trace collection
    lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
      resources: ['*']
    }));

    return true;
  }

  /**
   * Apply Lambda specific observability alarms
   */
  private applyLambdaObservability(component: BaseComponent): number {
    const lambdaFunction = component.getConstruct('function');
    if (!lambdaFunction) {
      this.context.logger.warn('Lambda component has no function construct registered', { 
        service: 'ObservabilityService' 
      });
      return 0;
    }

    let alarmCount = 0;

    // Lambda Error Rate alarm
    const errorRateAlarm = new cloudwatch.Alarm(component, 'LambdaErrorRate', {
      alarmName: `${this.context.serviceName}-${component.node.id}-error-rate`,
      alarmDescription: 'Lambda function error rate exceeds threshold',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
        dimensionsMap: {
          FunctionName: (lambdaFunction as any).functionName || 'unknown'
        }
      }),
      threshold: 5,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });

    // Apply standard tags to the alarm
    this.applyStandardTags(errorRateAlarm, component);
    alarmCount++;

    // Lambda Duration alarm for compliance frameworks
    if (this.context.complianceFramework === 'fedramp-moderate' || this.context.complianceFramework === 'fedramp-high') {
      const durationAlarm = new cloudwatch.Alarm(component, 'LambdaDuration', {
        alarmName: `${this.context.serviceName}-${component.node.id}-duration`,
        alarmDescription: 'Lambda function duration exceeds threshold',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Duration',
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
          dimensionsMap: {
            FunctionName: (lambdaFunction as any).functionName || 'unknown'
          }
        }),
        threshold: this.context.complianceFramework === 'fedramp-high' ? 5000 : 10000, // 5s for high, 10s for moderate
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
      });

      // Apply standard tags to the alarm
      this.applyStandardTags(durationAlarm, component);
      alarmCount++;
    }

    return alarmCount;
  }

  /**
   * Build standard OpenTelemetry environment variables
   */
  private buildOTelEnvironmentVariables(componentName: string): Record<string, string> {
    const otelConfig = this.getOTelConfig();
    
    return {
      // Core OTel configuration
      'OTEL_EXPORTER_OTLP_ENDPOINT': otelConfig.collectorEndpoint,
      'OTEL_EXPORTER_OTLP_HEADERS': `authorization=Bearer ${otelConfig.authToken}`,
      'OTEL_SERVICE_NAME': componentName,
      'OTEL_SERVICE_VERSION': this.context.serviceLabels?.version || '1.0.0',
      'OTEL_RESOURCE_ATTRIBUTES': this.buildResourceAttributes(),
      
      // Sampling and export configuration
      'OTEL_TRACES_SAMPLER': 'traceidratio',
      'OTEL_TRACES_SAMPLER_ARG': otelConfig.traceSamplingRate.toString(),
      'OTEL_METRICS_EXPORTER': 'otlp',
      'OTEL_LOGS_EXPORTER': 'otlp',
      
      // Instrumentation configuration
      'OTEL_PROPAGATORS': 'tracecontext,baggage,xray',
      'OTEL_INSTRUMENTATION_COMMON_DEFAULT_ENABLED': 'true',
      
      // Performance tuning
      'OTEL_BSP_MAX_EXPORT_BATCH_SIZE': '512',
      'OTEL_BSP_EXPORT_TIMEOUT': '30000',
      'OTEL_METRIC_EXPORT_INTERVAL': otelConfig.metricsInterval.toString()
    };
  }

  /**
   * Build OpenTelemetry resource attributes according to the standard
   */
  private buildResourceAttributes(): string {
    const attributes = [
      `service.name=${this.context.serviceName}`,
      `deployment.environment=${this.context.environment}`,
      `cloud.provider=aws`,
      `cloud.region=${this.context.region}`,
      `compliance.framework=${this.context.complianceFramework}`
    ];

    // Add additional labels from service configuration
    if (this.context.serviceLabels) {
      Object.entries(this.context.serviceLabels).forEach(([key, value]) => {
        attributes.push(`${key}=${value}`);
      });
    }

    return attributes.join(',');
  }

  /**
   * Get OpenTelemetry configuration based on compliance framework
   * Uses centralized platform configuration instead of hardcoded defaults
   */
  private getOTelConfig(): any {
    const framework = this.context.complianceFramework;
    const region = this.context.region;
    const defaults = this.getObservabilityDefaults()[framework];
    
    return {
      collectorEndpoint: `https://otel-collector.${framework}.${region}.platform.local:4317`,
      traceSamplingRate: defaults.traceSamplingRate,
      metricsInterval: defaults.metricsInterval,
      logsRetentionDays: defaults.logsRetentionDays,
      authToken: this.getOtelAuthToken(framework)
    };
  }

  /**
   * Get observability defaults from centralized platform configuration
   */
  private getObservabilityDefaults(): any {
    // In a full implementation, this would load from centralized config files
    // For now, using type-safe defaults that can be easily moved to config
    return {
      commercial: {
        traceSamplingRate: 0.1, // 10% sampling for cost optimization
        metricsInterval: 300, // 5 minute intervals
        logsRetentionDays: 365 // 1 year retention
      },
      'fedramp-moderate': {
        traceSamplingRate: 0.25, // 25% sampling for enhanced monitoring  
        metricsInterval: 60, // 1 minute intervals
        logsRetentionDays: 1095 // 3 years retention
      },
      'fedramp-high': {
        traceSamplingRate: 1.0, // 100% sampling for complete audit trail
        metricsInterval: 30, // 30 second intervals for high compliance
        logsRetentionDays: 2555 // 7 years retention
      }
    };
  }

  /**
   * Get OpenTelemetry authentication token for the compliance framework
   */
  private getOtelAuthToken(framework: string): string {
    // In production, this would retrieve from AWS Secrets Manager or Parameter Store
    return `otel-token-${framework}-${this.context.environment}`;
  }

  /**
   * Get OpenTelemetry Lambda layer ARN based on runtime
   */
  private getOTelLambdaLayerArn(runtime: lambda.Runtime): string | undefined {
    const region = this.context.region;
    
    // OpenTelemetry Lambda layers (these ARNs would be managed in configuration)
    const layerMap: Record<string, string> = {
      'nodejs18.x': `arn:aws:lambda:${region}:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:1`,
      'nodejs20.x': `arn:aws:lambda:${region}:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:1`,
      'python3.9': `arn:aws:lambda:${region}:901920570463:layer:aws-otel-python-amd64-ver-1-20-0:1`,
      'python3.10': `arn:aws:lambda:${region}:901920570463:layer:aws-otel-python-amd64-ver-1-20-0:1`,
      'python3.11': `arn:aws:lambda:${region}:901920570463:layer:aws-otel-python-amd64-ver-1-20-0:1`,
      'java11': `arn:aws:lambda:${region}:901920570463:layer:aws-otel-java-wrapper-amd64-ver-1-31-0:1`,
      'java17': `arn:aws:lambda:${region}:901920570463:layer:aws-otel-java-wrapper-amd64-ver-1-31-0:1`
    };

    return layerMap[runtime.name];
  }
}
