/**
 * Enhanced Lambda Worker Component
 * 
 * Extends the base Lambda Worker Component with enhanced observability capabilities
 * using the new Lambda Observability Service that combines OTEL + X-Ray + Powertools.
 * 
 * This component demonstrates how to integrate the Lambda-specific observability
 * service while maintaining compatibility with existing platform patterns.
 */

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { BaseComponent } from '@shinobi/core';
import { PlatformServiceContext } from '@shinobi/core/platform-services';
import { LambdaObservabilityService, LambdaObservabilityServiceConfig } from '@shinobi/standards-otel/observability-handlers/services/lambda-observability.service';

/**
 * Enhanced Lambda Worker Configuration
 */
export interface EnhancedLambdaWorkerConfig {
  /** Base Lambda configuration */
  runtime: string;
  architecture: string;
  memorySize: number;
  timeoutSeconds: number;
  handler: string;
  code: lambda.Code;

  /** Enhanced observability configuration */
  observability: {
    /** Enable full observability (OTEL + X-Ray + Powertools) */
    enabled: boolean;

    /** Service name for observability */
    serviceName: string;

    /** Compliance framework */
    complianceFramework: string;

    /** Powertools-specific configuration */
    powertools: {
      /** Enable business metrics */
      businessMetrics: boolean;

      /** Enable parameter store integration */
      parameterStore: boolean;

      /** Enable enhanced audit logging */
      auditLogging: boolean;

      /** Log level for Powertools */
      logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    };
  };

  /** VPC configuration */
  vpc?: {
    enabled: boolean;
    securityGroupIds?: string[];
    subnetIds?: string[];
  };

  /** Environment variables */
  environment?: Record<string, string>;

  /** IAM policies */
  policies?: iam.PolicyStatement[];
}

/**
 * Enhanced Lambda Worker Component
 * 
 * Demonstrates integration of Lambda Observability Service with Powertools
 * while maintaining platform architectural patterns.
 */
export class EnhancedLambdaWorkerComponent extends BaseComponent {
  private lambdaFunction?: lambda.Function;
  private observabilityService?: LambdaObservabilityService;
  private config?: EnhancedLambdaWorkerConfig;

  constructor(scope: any, id: string, config: EnhancedLambdaWorkerConfig) {
    super(scope, id);
    this.config = config;
    this.configureLambda();
    this.configureObservability();
    this.configurePermissions();
    this.registerConstructs();
  }

  /**
   * Configure the Lambda function
   */
  private configureLambda(): void {
    if (!this.config) return;

    const {
      runtime,
      architecture,
      memorySize,
      timeoutSeconds,
      handler,
      code,
      environment = {},
      vpc
    } = this.config;

    // Create VPC configuration if enabled
    const vpcConfig = vpc?.enabled ? {
      securityGroups: vpc.securityGroupIds?.map(id =>
        iam.SecurityGroup.fromSecurityGroupId(this, `SecurityGroup-${id}`, id)
      ),
      subnets: vpc.subnetIds?.map(id =>
        iam.Subnet.fromSubnetId(this, `Subnet-${id}`, id)
      )
    } : undefined;

    this.lambdaFunction = new lambda.Function(this, 'Function', {
      runtime: this.mapRuntime(runtime),
      architecture: this.mapArchitecture(architecture),
      memorySize,
      timeout: cdk.Duration.seconds(timeoutSeconds),
      handler,
      code,
      environment: {
        ...environment,
        // Add service identification
        SERVICE_NAME: this.config.observability.serviceName,
        COMPONENT_TYPE: 'lambda-worker',
        COMPONENT_NAME: this.node.id
      },
      vpc: vpcConfig,
      logRetention: logs.RetentionDays.THIRTY_DAYS,
      tracing: lambda.Tracing.ACTIVE, // Enable X-Ray tracing
    });
  }

  /**
   * Configure enhanced observability using the Lambda Observability Service
   */
  private async configureObservability(): Promise<void> {
    if (!this.config?.observability.enabled || !this.lambdaFunction) {
      return;
    }

    // Create platform service context
    const context = new PlatformServiceContext({
      serviceName: this.config.observability.serviceName,
      environment: process.env.ENVIRONMENT || 'development',
      complianceFramework: this.config.observability.complianceFramework,
      region: process.env.AWS_REGION || 'us-east-1',
      serviceLabels: {
        version: process.env.SERVICE_VERSION || '1.0.0'
      }
    });

    // Create observability service configuration
    const observabilityConfig: LambdaObservabilityServiceConfig = {
      observabilityConfig: {
        otelEnvironmentTemplate: {
          'OTEL_SERVICE_NAME': '{{ serviceName }}',
          'OTEL_RESOURCE_ATTRIBUTES': 'service.name={{ serviceName }},service.version={{ serviceVersion }},deployment.environment={{ environment }}',
          'OTEL_EXPORTER_OTLP_ENDPOINT': 'http://adot-collector:4317',
          'OTEL_EXPORTER_OTLP_HEADERS': 'x-api-key={{ authToken }}',
          'OTEL_TRACES_EXPORTER': 'otlp',
          'OTEL_METRICS_EXPORTER': 'otlp',
          'OTEL_LOGS_EXPORTER': 'otlp'
        },
        alarmThresholds: {
          lambda: {
            errorRate: 0.05,
            duration: 5000
          }
        },
        traceSamplingRate: 1.0,
        metricsInterval: 60
      },
      powertoolsConfig: {
        serviceName: this.config.observability.serviceName,
        metricsNamespace: `Shinobi/Worker/${this.config.observability.serviceName}`,
        businessMetrics: this.config.observability.powertools.businessMetrics,
        parameterStore: this.config.observability.powertools.parameterStore,
        auditLogging: this.config.observability.powertools.auditLogging,
        logLevel: this.config.observability.powertools.logLevel,
        logEvent: false // Disable event logging for workers
      },
      enableFullIntegration: true,
      serviceName: this.config.observability.serviceName,
      complianceFramework: this.config.observability.complianceFramework
    };

    // Initialize the observability service
    this.observabilityService = new LambdaObservabilityService(context, observabilityConfig);

    // Apply observability to the component
    try {
      const result = await this.observabilityService.applyObservability(this);

      if (result.success) {
        console.log(`✅ Enhanced observability applied to ${this.node.id}:`, {
          baseInstrumentation: result.baseInstrumentation.instrumentationApplied,
          powertoolsEnhancements: result.powertoolsEnhancements.instrumentationApplied,
          totalExecutionTime: result.totalExecutionTimeMs
        });
      } else {
        console.error(`❌ Failed to apply enhanced observability to ${this.node.id}:`, result.error);
      }
    } catch (error) {
      console.error(`❌ Error applying enhanced observability to ${this.node.id}:`, error);
    }
  }

  /**
   * Configure IAM permissions
   */
  private configurePermissions(): void {
    if (!this.lambdaFunction || !this.config?.policies) return;

    // Add custom policies
    this.config.policies.forEach((policy, index) => {
      this.lambdaFunction!.addToRolePolicy(policy);
    });

    // Add basic Lambda execution permissions (if not already present)
    this.lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: ['*']
    }));
  }

  /**
   * Register constructs for the component
   */
  private registerConstructs(): void {
    if (this.lambdaFunction) {
      this.registerConstruct('function', this.lambdaFunction);
    }
  }

  /**
   * Map runtime string to Lambda runtime
   */
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
      case 'python3.12':
        return lambda.Runtime.PYTHON_3_12;
      case 'nodejs20.x':
      default:
        return lambda.Runtime.NODEJS_20_X;
    }
  }

  /**
   * Map architecture string to Lambda architecture
   */
  private mapArchitecture(architecture: string): lambda.Architecture {
    switch (architecture) {
      case 'arm64':
        return lambda.Architecture.ARM_64;
      case 'x86_64':
      default:
        return lambda.Architecture.X86_64;
    }
  }

  /**
   * Get the Lambda function ARN
   */
  public getFunctionArn(): string | undefined {
    return this.lambdaFunction?.functionArn;
  }

  /**
   * Get the Lambda function name
   */
  public getFunctionName(): string | undefined {
    return this.lambdaFunction?.functionName;
  }

  /**
   * Get the observability service instance
   */
  public getObservabilityService(): LambdaObservabilityService | undefined {
    return this.observabilityService;
  }

  /**
   * Update observability configuration
   */
  public updateObservabilityConfig(config: Partial<LambdaObservabilityServiceConfig>): void {
    if (this.observabilityService) {
      this.observabilityService.updateConfig(config);
    }
  }

  /**
   * Get component capability information
   */
  public getCapability(): Record<string, any> {
    return {
      functionArn: this.lambdaFunction?.functionArn,
      functionName: this.lambdaFunction?.functionName,
      runtime: this.config?.runtime,
      architecture: this.config?.architecture,
      memorySize: this.config?.memorySize,
      timeoutSeconds: this.config?.timeoutSeconds,
      observabilityEnabled: this.config?.observability.enabled,
      powertoolsEnabled: this.config?.observability.powertools.businessMetrics,
      complianceFramework: this.config?.observability.complianceFramework
    };
  }
}
