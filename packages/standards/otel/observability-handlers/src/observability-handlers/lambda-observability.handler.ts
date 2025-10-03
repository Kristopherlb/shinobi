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
import { BaseComponent } from '@shinobi/core';
import { IObservabilityHandler, ObservabilityHandlerResult, ObservabilityConfig } from './observability-handler.interface.ts';
import { PlatformServiceContext } from '@shinobi/core/platform-services';
import { ITaggingService, TaggingContext, defaultTaggingService } from '@shinobi/standards-tagging';
import type { ComponentTelemetryDirectives } from '@platform/observability';

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
  public apply(component: BaseComponent, config: ObservabilityConfig): ObservabilityHandlerResult {
    const startTime = Date.now();
    let instrumentationApplied = false;
    let alarmsCreated = 0;
    const telemetry = this.getTelemetry(component);

    try {
      // Apply OpenTelemetry instrumentation
      instrumentationApplied = this.applyLambdaOTelInstrumentation(component, config);
      
      // Create CloudWatch alarms
      if (!telemetry?.alarms?.length) {
        alarmsCreated = this.applyLambdaObservability(component, config);
      } else {
        this.context.logger.debug('Telemetry directives detected for Lambda component; skipping legacy alarm synthesis', {
          service: 'ObservabilityService',
          componentType: component.getType(),
          componentName: component.node.id
        });
      }

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
  private applyLambdaOTelInstrumentation(component: BaseComponent, config: ObservabilityConfig): boolean {
    const lambdaFunction = component.getConstruct('function') as lambda.Function | undefined;
    if (!lambdaFunction) {
      this.context.logger.warn('Lambda component has no function construct registered', { 
        service: 'ObservabilityService', 
        componentType: 'lambda', 
        componentName: component.node.id 
      });
      return false;
    }

    // Build OTel environment variables from config template
    const otelEnvVars = this.buildOTelEnvironmentVariables(component.node.id, config);
    
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
  private applyLambdaObservability(component: BaseComponent, config: ObservabilityConfig): number {
    const lambdaFunction = component.getConstruct('function');
    if (!lambdaFunction) {
      this.context.logger.warn('Lambda component has no function construct registered', { 
        service: 'ObservabilityService' 
      });
      return 0;
    }

    let alarmCount = 0;
    const lambdaThresholds = config.alarmThresholds.lambda;

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
      threshold: lambdaThresholds.errorRate,
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
        threshold: lambdaThresholds.duration,
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
   * Build standard OpenTelemetry environment variables from config template
   */
  private buildOTelEnvironmentVariables(componentName: string, config: ObservabilityConfig): Record<string, string> {
    const template = config.otelEnvironmentTemplate;
    const envVars: Record<string, string> = {};
    
    // Determine cloud provider - this is an AWS CDK library, so always AWS
    const cloudProvider = 'aws';
    
    for (const [key, value] of Object.entries(template)) {
      envVars[key] = value
        .replace('{{ region }}', this.context.region)
        .replace('{{ authToken }}', this.getOtelAuthToken())
        .replace('{{ componentName }}', componentName)
        .replace('{{ serviceVersion }}', this.context.serviceLabels?.version || '1.0.0')
        .replace('{{ serviceName }}', this.context.serviceName)
        .replace('{{ environment }}', this.context.environment)
        .replace('{{ cloudProvider }}', cloudProvider)
        .replace('{{ complianceFramework }}', this.context.complianceFramework)
        .replace('{{ traceSamplingRate }}', config.traceSamplingRate.toString())
        .replace('{{ metricsInterval }}', config.metricsInterval.toString());
    }
    
    return envVars;
  }

  /**
   * Get OpenTelemetry authentication token for the compliance framework
   */
  private getOtelAuthToken(): string {
    // In production, this would retrieve from AWS Secrets Manager or Parameter Store
    return `otel-token-${this.context.complianceFramework}-${this.context.environment}`;
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

  private getTelemetry(component: BaseComponent): ComponentTelemetryDirectives | undefined {
    try {
      const capabilities = component.getCapabilities();
      for (const [key, value] of Object.entries(capabilities)) {
        if (key.startsWith('observability:') && value && typeof value === 'object' && 'telemetry' in value) {
          return (value as { telemetry?: ComponentTelemetryDirectives }).telemetry;
        }
      }
    } catch (error) {
      this.context.logger.debug('Unable to inspect component telemetry for Lambda handler', {
        service: 'ObservabilityService',
        componentType: component.getType(),
        componentName: component.node.id,
        error: (error as Error).message
      });
    }
    return undefined;
  }
}
