/**
 * Lambda Powertools Extension Handler
 * 
 * Extends the base Lambda Observability Handler with AWS Lambda Powertools integration.
 * Provides Lambda-specific enhancements while maintaining OTEL + X-Ray compatibility.
 * 
 * Features:
 * - Automatic Lambda context injection
 * - Business metrics helpers
 * - Parameter store integration
 * - Enhanced audit logging
 * - Seamless OTEL correlation
 */

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { BaseComponent } from '@shinobi/core';
import { LambdaObservabilityHandler } from './lambda-observability.handler.ts';
import { ObservabilityConfig, ObservabilityHandlerResult } from './observability-handler.interface.ts';
import { PlatformServiceContext } from '@shinobi/core/platform-services';

/**
 * Configuration for Lambda Powertools integration
 */
export interface LambdaPowertoolsConfig {
  /** Enable Powertools integration */
  enabled: boolean;

  /** Service name for Powertools logger */
  serviceName: string;

  /** Metrics namespace */
  metricsNamespace: string;

  /** Enable business metrics */
  businessMetrics: boolean;

  /** Enable parameter store integration */
  parameterStore: boolean;

  /** Enable enhanced audit logging */
  auditLogging: boolean;

  /** Powertools log level */
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

  /** Enable log event correlation */
  logEvent: boolean;
}

/**
 * Default Powertools configuration
 */
export const DEFAULT_POWERTOOLS_CONFIG: LambdaPowertoolsConfig = {
  enabled: true,
  serviceName: '',
  metricsNamespace: 'Shinobi/Platform',
  businessMetrics: true,
  parameterStore: true,
  auditLogging: true,
  logLevel: 'INFO',
  logEvent: false
};

/**
 * Lambda Powertools Extension Handler
 * 
 * Extends the base Lambda Observability Handler with Powertools capabilities
 * while maintaining full compatibility with existing OTEL + X-Ray setup.
 */
export class LambdaPowertoolsExtensionHandler extends LambdaObservabilityHandler {
  private powertoolsConfig: LambdaPowertoolsConfig;

  constructor(
    context: PlatformServiceContext,
    powertoolsConfig: Partial<LambdaPowertoolsConfig> = {},
    taggingService = context.taggingService
  ) {
    super(context, taggingService);

    // Merge with default configuration
    this.powertoolsConfig = {
      ...DEFAULT_POWERTOOLS_CONFIG,
      ...powertoolsConfig,
      serviceName: powertoolsConfig.serviceName || context.serviceName
    };
  }

  /**
   * Apply Lambda Powertools enhancements to the base observability setup
   */
  public applyPowertoolsEnhancements(
    component: BaseComponent,
    config: ObservabilityConfig
  ): ObservabilityHandlerResult {
    if (!this.powertoolsConfig.enabled) {
      this.context.logger.info('Lambda Powertools integration disabled', {
        service: 'ObservabilityService',
        componentName: component.node.id
      });
      return { instrumentationApplied: false, alarmsCreated: 0, executionTimeMs: 0 };
    }

    const startTime = Date.now();
    let enhancementsApplied = 0;

    try {
      const lambdaFunction = component.getConstruct('function') as lambda.Function | undefined;
      if (!lambdaFunction) {
        this.context.logger.warn('Lambda component has no function construct for Powertools integration', {
          service: 'ObservabilityService',
          componentName: component.node.id
        });
        return { instrumentationApplied: false, alarmsCreated: 0, executionTimeMs: Date.now() - startTime };
      }

      // Apply Powertools layer
      if (this.applyPowertoolsLayer(lambdaFunction)) {
        enhancementsApplied++;
      }

      // Apply Powertools environment variables
      if (this.applyPowertoolsEnvironmentVariables(lambdaFunction)) {
        enhancementsApplied++;
      }

      // Apply Powertools IAM permissions
      if (this.applyPowertoolsIAMPermissions(lambdaFunction)) {
        enhancementsApplied++;
      }

      // Apply business metrics configuration
      if (this.powertoolsConfig.businessMetrics && this.applyBusinessMetricsConfig(lambdaFunction)) {
        enhancementsApplied++;
      }

      // Apply parameter store configuration
      if (this.powertoolsConfig.parameterStore && this.applyParameterStoreConfig(lambdaFunction)) {
        enhancementsApplied++;
      }

      const executionTime = Date.now() - startTime;

      this.context.logger.info('Lambda Powertools enhancements applied successfully', {
        service: 'ObservabilityService',
        componentType: component.getType(),
        componentName: component.node.id,
        enhancementsApplied,
        executionTimeMs: executionTime,
        config: this.powertoolsConfig
      });

      return {
        instrumentationApplied: true,
        alarmsCreated: 0,
        executionTimeMs: executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.context.logger.error('Failed to apply Lambda Powertools enhancements', {
        service: 'ObservabilityService',
        componentName: component.node.id,
        executionTimeMs: executionTime,
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      throw error;
    }
  }

  /**
   * Apply Powertools Lambda layer based on runtime
   */
  private applyPowertoolsLayer(lambdaFunction: lambda.Function): boolean {
    const runtime = lambdaFunction.runtime;
    const layerArn = this.getPowertoolsLayerArn(runtime);

    if (!layerArn) {
      this.context.logger.warn('No Powertools layer available for runtime', {
        service: 'ObservabilityService',
        runtime: runtime.name
      });
      return false;
    }

    lambdaFunction.addLayers(
      lambda.LayerVersion.fromLayerVersionArn(
        lambdaFunction, 'PowertoolsLayer', layerArn
      )
    );

    this.context.logger.info('Powertools layer applied', {
      service: 'ObservabilityService',
      runtime: runtime.name,
      layerArn
    });

    return true;
  }

  /**
   * Apply Powertools environment variables
   */
  private applyPowertoolsEnvironmentVariables(lambdaFunction: lambda.Function): boolean {
    const envVars = {
      // Core Powertools configuration
      'POWERTOOLS_SERVICE_NAME': this.powertoolsConfig.serviceName,
      'POWERTOOLS_LOGGER_LOG_LEVEL': this.powertoolsConfig.logLevel,
      'POWERTOOLS_LOGGER_LOG_EVENT': this.powertoolsConfig.logEvent.toString(),

      // Metrics configuration
      'POWERTOOLS_METRICS_NAMESPACE': this.powertoolsConfig.metricsNamespace,
      'POWERTOOLS_METRICS_DEFAULT_DIMENSIONS': JSON.stringify({
        Service: this.powertoolsConfig.serviceName,
        Environment: this.context.environment,
        ComplianceFramework: this.context.complianceFramework
      }),

      // OTEL integration (maintains compatibility)
      'POWERTOOLS_TRACE_MIDDLEWARES': 'true',
      'POWERTOOLS_TRACER_CAPTURE_RESPONSE': 'true',
      'POWERTOOLS_TRACER_CAPTURE_ERROR': 'true',

      // Parameter store configuration
      'POWERTOOLS_PARAMETERS_MAX_AGE': '300', // 5 minutes cache
      'POWERTOOLS_PARAMETERS_RAISE_ON_TRANSFORM_ERROR': 'false'
    };

    // Apply environment variables
    Object.entries(envVars).forEach(([key, value]) => {
      lambdaFunction.addEnvironment(key, value);
    });

    this.context.logger.info('Powertools environment variables applied', {
      service: 'ObservabilityService',
      envVarsCount: Object.keys(envVars).length
    });

    return true;
  }

  /**
   * Apply Powertools IAM permissions
   */
  private applyPowertoolsIAMPermissions(lambdaFunction: lambda.Function): boolean {
    const permissions: iam.PolicyStatement[] = [];

    // CloudWatch Metrics permissions (for business metrics)
    if (this.powertoolsConfig.businessMetrics) {
      permissions.push(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudwatch:PutMetricData'
        ],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'cloudwatch:namespace': this.powertoolsConfig.metricsNamespace
          }
        }
      }));
    }

    // Parameter Store permissions (for secure configuration)
    if (this.powertoolsConfig.parameterStore) {
      permissions.push(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ssm:GetParameter',
          'ssm:GetParameters',
          'ssm:GetParametersByPath'
        ],
        resources: [
          `arn:aws:ssm:${this.context.region}:*:parameter/shinobi/*`,
          `arn:aws:ssm:${this.context.region}:*:parameter/${this.powertoolsConfig.serviceName}/*`
        ]
      }));
    }

    // Apply permissions to Lambda function role
    permissions.forEach(permission => {
      lambdaFunction.addToRolePolicy(permission);
    });

    this.context.logger.info('Powertools IAM permissions applied', {
      service: 'ObservabilityService',
      permissionsCount: permissions.length
    });

    return true;
  }

  /**
   * Apply business metrics configuration
   */
  private applyBusinessMetricsConfig(lambdaFunction: lambda.Function): boolean {
    // Add environment variables for business metrics
    lambdaFunction.addEnvironment('POWERTOOLS_BUSINESS_METRICS_ENABLED', 'true');
    lambdaFunction.addEnvironment('POWERTOOLS_METRICS_DEFAULT_DIMENSIONS', JSON.stringify({
      Service: this.powertoolsConfig.serviceName,
      Environment: this.context.environment,
      ComplianceFramework: this.context.complianceFramework
    }));

    this.context.logger.info('Business metrics configuration applied', {
      service: 'ObservabilityService'
    });

    return true;
  }

  /**
   * Apply parameter store configuration
   */
  private applyParameterStoreConfig(lambdaFunction: lambda.Function): boolean {
    // Add environment variables for parameter store
    lambdaFunction.addEnvironment('POWERTOOLS_PARAMETERS_ENABLED', 'true');
    lambdaFunction.addEnvironment('POWERTOOLS_PARAMETERS_DEFAULT_PREFIX', '/shinobi');

    this.context.logger.info('Parameter store configuration applied', {
      service: 'ObservabilityService'
    });

    return true;
  }

  /**
   * Get Powertools Lambda layer ARN based on runtime
   */
  private getPowertoolsLayerArn(runtime: lambda.Runtime): string | undefined {
    const region = this.context.region;

    // AWS Lambda Powertools layers
    const layerMap: Record<string, string> = {
      'python3.9': `arn:aws:lambda:${region}:017000801446:layer:AWSLambdaPowertoolsPythonV2:1`,
      'python3.10': `arn:aws:lambda:${region}:017000801446:layer:AWSLambdaPowertoolsPythonV2:1`,
      'python3.11': `arn:aws:lambda:${region}:017000801446:layer:AWSLambdaPowertoolsPythonV2:1`,
      'python3.12': `arn:aws:lambda:${region}:017000801446:layer:AWSLambdaPowertoolsPythonV2:1`,
      'nodejs18.x': `arn:aws:lambda:${region}:017000801446:layer:AWSLambdaPowertoolsTypeScriptV2:1`,
      'nodejs20.x': `arn:aws:lambda:${region}:017000801446:layer:AWSLambdaPowertoolsTypeScriptV2:1`,
      'java11': `arn:aws:lambda:${region}:017000801446:layer:AWSLambdaPowertoolsJavaV2:1`,
      'java17': `arn:aws:lambda:${region}:017000801446:layer:AWSLambdaPowertoolsJavaV2:1`,
      'java21': `arn:aws:lambda:${region}:017000801446:layer:AWSLambdaPowertoolsJavaV2:1`
    };

    return layerMap[runtime.name];
  }

  /**
   * Create a factory method for easy instantiation
   */
  static create(
    context: PlatformServiceContext,
    config: Partial<LambdaPowertoolsConfig> = {}
  ): LambdaPowertoolsExtensionHandler {
    return new LambdaPowertoolsExtensionHandler(context, config);
  }

  /**
   * Get the current Powertools configuration
   */
  getPowertoolsConfig(): LambdaPowertoolsConfig {
    return { ...this.powertoolsConfig };
  }

  /**
   * Update Powertools configuration
   */
  updatePowertoolsConfig(config: Partial<LambdaPowertoolsConfig>): void {
    this.powertoolsConfig = {
      ...this.powertoolsConfig,
      ...config
    };
  }
}
