/**
 * Platform OpenTelemetry Observability Standard v1.0
 * Automatic instrumentation and monitoring for all AWS resources
 */

export interface ObservabilityConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  complianceFramework?: 'fedramp-low' | 'fedramp-moderate' | 'fedramp-high' | 'pci-dss' | 'hipaa';
  customAttributes?: Record<string, string>;
}

export interface OTelEnvironmentVariables {
  OTEL_SERVICE_NAME: string;
  OTEL_SERVICE_VERSION: string;
  OTEL_RESOURCE_ATTRIBUTES: string;
  OTEL_EXPORTER_OTLP_ENDPOINT: string;
  OTEL_PROPAGATORS: string;
  OTEL_TRACES_EXPORTER: string;
  OTEL_METRICS_EXPORTER: string;
  OTEL_LOGS_EXPORTER: string;
  _AWS_LAMBDA_OPENTELEMETRY_AUTO_INSTRUMENTATION: string;
}

export interface LambdaOTelConfig {
  layerArn: string;
  environmentVariables: OTelEnvironmentVariables;
  tracingConfig: {
    mode: 'Active' | 'PassThrough';
  };
}

export interface DatabaseMonitoringConfig {
  performanceInsightsEnabled: boolean;
  performanceInsightsRetentionPeriod: number;
  enabledCloudwatchLogsExports: string[];
  monitoringInterval: number;
  monitoringRoleArn?: string;
}

export interface QueueMonitoringConfig {
  alarms: {
    queueDepth: {
      threshold: number;
      evaluationPeriods: number;
    };
    messageAge: {
      threshold: number;
      evaluationPeriods: number;
    };
    dlqMessages: {
      threshold: number;
      evaluationPeriods: number;
    };
  };
}

export class PlatformObservability {
  private readonly config: ObservabilityConfig;

  constructor(config: ObservabilityConfig) {
    this.config = config;
  }

  /**
   * Generate OpenTelemetry environment variables for Lambda functions
   */
  buildOTelEnvironmentVariables(): OTelEnvironmentVariables {
    const resourceAttributes = [
      `service.name=${this.config.serviceName}`,
      `service.version=${this.config.serviceVersion}`,
      `deployment.environment=${this.config.environment}`,
      'telemetry.sdk.language=nodejs',
      'telemetry.auto.version=0.41.1'
    ];

    // Add custom attributes
    if (this.config.customAttributes) {
      Object.entries(this.config.customAttributes).forEach(([key, value]) => {
        resourceAttributes.push(`${key}=${value}`);
      });
    }

    return {
      OTEL_SERVICE_NAME: this.config.serviceName,
      OTEL_SERVICE_VERSION: this.config.serviceVersion,
      OTEL_RESOURCE_ATTRIBUTES: resourceAttributes.join(','),
      OTEL_EXPORTER_OTLP_ENDPOINT: this.getOTelCollectorEndpoint(),
      OTEL_PROPAGATORS: 'tracecontext,baggage,xray',
      OTEL_TRACES_EXPORTER: 'otlp',
      OTEL_METRICS_EXPORTER: 'otlp',
      OTEL_LOGS_EXPORTER: 'otlp',
      _AWS_LAMBDA_OPENTELEMETRY_AUTO_INSTRUMENTATION: 'true'
    };
  }

  /**
   * Configure Lambda function with OpenTelemetry instrumentation
   */
  configureLambdaObservability(): LambdaOTelConfig {
    return {
      layerArn: this.getOTelLambdaLayerArn(),
      environmentVariables: this.buildOTelEnvironmentVariables(),
      tracingConfig: {
        mode: 'Active'
      }
    };
  }

  /**
   * Configure database monitoring based on compliance requirements
   */
  configureDatabaseMonitoring(): DatabaseMonitoringConfig {
    const isHighCompliance = this.config.complianceFramework === 'fedramp-high';
    const isModerateCompliance = ['fedramp-moderate', 'pci-dss', 'hipaa'].includes(
      this.config.complianceFramework || ''
    );

    return {
      performanceInsightsEnabled: isHighCompliance || isModerateCompliance,
      performanceInsightsRetentionPeriod: isHighCompliance ? 731 : 7, // 2 years vs 1 week
      enabledCloudwatchLogsExports: ['postgresql'],
      monitoringInterval: isHighCompliance ? 15 : 60, // seconds
    };
  }

  /**
   * Configure SQS queue monitoring and alerting
   */
  configureQueueMonitoring(): QueueMonitoringConfig {
    const isHighCompliance = this.config.complianceFramework === 'fedramp-high';
    
    return {
      alarms: {
        queueDepth: {
          threshold: isHighCompliance ? 100 : 1000,
          evaluationPeriods: 2
        },
        messageAge: {
          threshold: isHighCompliance ? 300 : 600, // seconds
          evaluationPeriods: 2
        },
        dlqMessages: {
          threshold: 1,
          evaluationPeriods: 1
        }
      }
    };
  }

  /**
   * Get the appropriate OpenTelemetry Lambda layer ARN for the current region
   */
  private getOTelLambdaLayerArn(): string {
    // Returns the AWS-provided OpenTelemetry layer ARN
    // In production, this would be region-specific
    return 'arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4';
  }

  /**
   * Get the OpenTelemetry collector endpoint based on environment
   */
  private getOTelCollectorEndpoint(): string {
    // In production, this would be environment-specific
    switch (this.config.environment) {
      case 'production':
        return 'https://otel-collector.prod.platform.internal:4318';
      case 'staging':
        return 'https://otel-collector.staging.platform.internal:4318';
      default:
        return 'https://otel-collector.dev.platform.internal:4318';
    }
  }
}