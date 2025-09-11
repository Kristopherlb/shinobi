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
export declare class PlatformObservability {
    private readonly config;
    constructor(config: ObservabilityConfig);
    /**
     * Generate OpenTelemetry environment variables for Lambda functions
     */
    buildOTelEnvironmentVariables(): OTelEnvironmentVariables;
    /**
     * Configure Lambda function with OpenTelemetry instrumentation
     */
    configureLambdaObservability(): LambdaOTelConfig;
    /**
     * Configure database monitoring based on compliance requirements
     */
    configureDatabaseMonitoring(): DatabaseMonitoringConfig;
    /**
     * Configure SQS queue monitoring and alerting
     */
    configureQueueMonitoring(): QueueMonitoringConfig;
    /**
     * Get the appropriate OpenTelemetry Lambda layer ARN for the current region
     */
    private getOTelLambdaLayerArn;
    /**
     * Get the OpenTelemetry collector endpoint based on environment
     */
    private getOTelCollectorEndpoint;
}
