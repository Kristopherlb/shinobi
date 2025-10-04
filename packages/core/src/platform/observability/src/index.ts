/**
 * Platform OpenTelemetry Observability Standard v1.1
 * Automatic instrumentation and monitoring for all AWS resources
 */

export type TelemetryStatistic =
  | 'Average'
  | 'Sum'
  | 'SampleCount'
  | 'Minimum'
  | 'Maximum'
  | 'p50'
  | 'p75'
  | 'p90'
  | 'p95'
  | 'p99';

export type TelemetryComparisonOperator = 'gt' | 'gte' | 'lt' | 'lte';

export type TelemetryTreatMissingData =
  | 'breaching'
  | 'notBreaching'
  | 'ignore'
  | 'missing';

export interface TelemetryMetricDescriptor {
  id: string;
  namespace: string;
  metricName: string;
  dimensions?: Record<string, string>;
  statistic?: TelemetryStatistic;
  unit?: string;
  periodSeconds?: number;
  description?: string;
}

export interface TelemetryAlarmDescriptor {
  id: string;
  metricId: string;
  alarmName?: string;
  alarmDescription?: string;
  threshold: number;
  comparisonOperator: TelemetryComparisonOperator;
  evaluationPeriods?: number;
  datapointsToAlarm?: number;
  treatMissingData?: TelemetryTreatMissingData;
  severity?: 'info' | 'warning' | 'critical';
  actions?: {
    alarmActions?: string[];
    okActions?: string[];
    insufficientDataActions?: string[];
  };
  annotations?: Record<string, string>;
}

export type TelemetryWidgetType =
  | 'metric'
  | 'log'
  | 'text'
  | 'alarm'
  | 'traceSummary';

export interface TelemetryDashboardWidgetDescriptor {
  id: string;
  type: TelemetryWidgetType;
  title: string;
  width?: number;
  height?: number;
  metrics?: Array<{ metricId: string; label?: string; stat?: TelemetryStatistic }>;
  markdown?: string;
  annotations?: Record<string, string>;
}

export interface TelemetryDashboardDescriptor {
  id: string;
  name?: string;
  description?: string;
  widgets: TelemetryDashboardWidgetDescriptor[];
  tags?: Record<string, string>;
}

export interface TelemetryTracingDescriptor {
  enabled: boolean;
  provider?: 'xray' | 'adot' | 'jaeger';
  samplingRate?: number;
  rules?: Array<{
    name: string;
    priority?: number;
    fixedRate?: number;
    reservoirSize?: number;
    serviceType?: string;
    resourceArn?: string;
  }>;
  attributes?: Record<string, string>;
}

export interface TelemetryLoggingDescriptor {
  enabled: boolean;
  destination?: 'cloudwatch-logs' | 'otel-collector' | 'firehose';
  logGroupName?: string;
  retentionDays?: number;
  format?: 'json' | 'text';
  fields?: Record<string, string>;
}

export interface ComponentTelemetryDirectives {
  metrics?: TelemetryMetricDescriptor[];
  alarms?: TelemetryAlarmDescriptor[];
  dashboards?: TelemetryDashboardDescriptor[];
  tracing?: TelemetryTracingDescriptor;
  logging?: TelemetryLoggingDescriptor;
  custom?: Record<string, any>;
}

export interface ObservabilityConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  complianceFramework?: 'fedramp-low' | 'fedramp-moderate' | 'fedramp-high' | 'pci-dss' | 'hipaa';
  customAttributes?: Record<string, string>;
  telemetry?: ComponentTelemetryDirectives;
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
  telemetry?: ComponentTelemetryDirectives;
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
      },
      telemetry: this.describeTelemetryRequirements({ includeDashboards: false })
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
   * Build declarative telemetry requirements describing metrics, alarms, dashboards and tracing
   */
  describeTelemetryRequirements(options: { includeDashboards?: boolean } = {}): ComponentTelemetryDirectives {
    const telemetry: ComponentTelemetryDirectives = {
      metrics: [],
      alarms: [],
      tracing: {
        enabled: true,
        provider: 'xray',
        samplingRate: this.config.telemetry?.tracing?.samplingRate ?? 0.1,
        rules: this.config.telemetry?.tracing?.rules,
        attributes: {
          'service.name': this.config.serviceName,
          ...(this.config.telemetry?.tracing?.attributes ?? {})
        }
      },
      logging: this.config.telemetry?.logging ?? {
        enabled: true,
        destination: 'otel-collector',
        retentionDays: 90,
        format: 'json'
      }
    };

    if (this.config.telemetry?.metrics?.length) {
      telemetry.metrics = this.config.telemetry.metrics;
    }

    if (this.config.telemetry?.alarms?.length) {
      telemetry.alarms = this.config.telemetry.alarms;
    }

    if (options.includeDashboards) {
      telemetry.dashboards = this.config.telemetry?.dashboards;
    }

    if (!telemetry.metrics || telemetry.metrics.length === 0) {
      telemetry.metrics = [
        {
          id: 'otel-throughput',
          namespace: 'OTEL/Service',
          metricName: 'RequestCount',
          dimensions: {
            ServiceName: this.config.serviceName,
            Environment: this.config.environment
          },
          statistic: 'Sum',
          periodSeconds: 300,
          description: 'Total requests processed by the service'
        }
      ];
    }

    if (!telemetry.alarms || telemetry.alarms.length === 0) {
      telemetry.alarms = [
        {
          id: 'otel-default-error-rate',
          metricId: 'otel-throughput',
          alarmName: `${this.config.serviceName}-error-rate`,
          threshold: 0.05,
          comparisonOperator: 'gt',
          evaluationPeriods: 2,
          datapointsToAlarm: 2,
          severity: 'warning',
          treatMissingData: 'notBreaching'
        }
      ];
    }

    if (!telemetry.tracing) {
      telemetry.tracing = {
        enabled: true,
        provider: 'xray',
        samplingRate: 0.1
      };
    }

    return telemetry;
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
