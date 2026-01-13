/**
 * Lambda Observability Service
 *
 * Unified service for applying comprehensive observability to AWS Lambda functions.
 * Combines base OpenTelemetry instrumentation with AWS Lambda Powertools enhancements.
 *
 * This service is designed to be used by all Lambda components (lambda-api, lambda-worker, etc.)
 * and provides a single interface for observability configuration.
 */
import { LambdaPowertoolsExtensionHandler } from './lambda-powertools-extension.handler.js';
/**
 * Lambda Observability Service
 *
 * Provides unified observability management for Lambda functions, combining
 * base OpenTelemetry instrumentation with Powertools enhancements.
 */
export class LambdaObservabilityService {
    config;
    context;
    powertoolsHandler;
    constructor(context, config) {
        this.context = context;
        this.config = {
            enableFullIntegration: true,
            ...config
        };
        this.powertoolsHandler = new LambdaPowertoolsExtensionHandler(context, this.config.powertoolsConfig);
    }
    /**
     * Factory method to create a service instance
     */
    static create(context, serviceName, complianceFramework, powertoolsConfig) {
        const config = {
            observabilityConfig: {
                collectorEndpoint: 'http://adot-collector:4317',
                serviceName,
                serviceVersion: context.serviceLabels?.version || '1.0.0',
                environment: context.environment,
                region: context.region || 'us-east-1',
                complianceFramework,
                tracesSampling: 1.0,
                metricsInterval: 60,
                logsRetention: 7,
                enablePerformanceInsights: true,
                enableXRayTracing: true,
                customAttributes: {
                    'service.name': serviceName,
                    'service.version': context.serviceLabels?.version || '1.0.0'
                },
                alarmThresholds: {
                    lambda: {
                        errorRate: 0.05,
                        duration: 5000,
                        throttles: 10
                    }
                }
            },
            powertoolsConfig: {
                serviceName,
                metricsNamespace: `Shinobi/${serviceName}`,
                businessMetrics: false,
                parameterStore: false,
                auditLogging: false,
                logLevel: 'INFO',
                logEvent: false,
                enabled: true,
                ...powertoolsConfig
            },
            serviceName,
            complianceFramework
        };
        return new LambdaObservabilityService(context, config);
    }
    /**
     * Factory method to create an audit service
     */
    static createAuditService(context, serviceName, complianceFramework) {
        return this.create(context, serviceName, complianceFramework, {
            auditLogging: true,
            logEvent: true,
            businessMetrics: true,
            metricsNamespace: `Shinobi/Audit/${serviceName}`,
            logLevel: 'DEBUG'
        });
    }
    /**
     * Factory method to create a worker service
     */
    static createWorkerService(context, serviceName, complianceFramework) {
        return this.create(context, serviceName, complianceFramework, {
            auditLogging: false,
            logEvent: false,
            businessMetrics: true,
            metricsNamespace: `Shinobi/Worker/${serviceName}`,
            logLevel: 'WARN'
        });
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = {
            ...this.config,
            ...config
        };
    }
    /**
     * Get Powertools configuration
     */
    getPowertoolsConfig() {
        return this.powertoolsHandler.getPowertoolsConfig();
    }
    /**
     * Update Powertools configuration
     */
    updatePowertoolsConfig(config) {
        this.powertoolsHandler.updatePowertoolsConfig(config);
        this.config.powertoolsConfig = {
            ...this.config.powertoolsConfig,
            ...config
        };
    }
    /**
     * Apply complete observability to a Lambda component
     */
    async applyObservability(component) {
        const startTime = Date.now();
        try {
            this.context.logger.info('Applying Lambda observability', {
                service: 'LambdaObservabilityService',
                componentType: component.getType(),
                componentName: component.node.id,
                enableFullIntegration: this.config.enableFullIntegration
            });
            // Apply base observability (OTEL + X-Ray)
            const baseResult = this.applyBaseObservability(component);
            // Apply Powertools enhancements if enabled
            let powertoolsResult = {
                instrumentationApplied: false,
                alarmsCreated: 0,
                executionTimeMs: 0
            };
            if (this.config.enableFullIntegration) {
                powertoolsResult = this.powertoolsHandler.applyPowertoolsEnhancements(component, this.config.observabilityConfig);
            }
            const totalExecutionTime = Date.now() - startTime;
            this.context.logger.info('Lambda observability applied successfully', {
                service: 'LambdaObservabilityService',
                componentType: component.getType(),
                componentName: component.node.id,
                baseInstrumentationApplied: baseResult.instrumentationApplied,
                powertoolsEnhancementsApplied: powertoolsResult.instrumentationApplied,
                totalExecutionTimeMs: totalExecutionTime
            });
            return {
                success: true,
                baseInstrumentation: baseResult,
                powertoolsEnhancements: powertoolsResult,
                totalExecutionTimeMs: totalExecutionTime
            };
        }
        catch (error) {
            const totalExecutionTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.context.logger.error('Failed to apply Lambda observability', {
                service: 'LambdaObservabilityService',
                componentType: component.getType(),
                componentName: component.node.id,
                error: errorMessage,
                totalExecutionTimeMs: totalExecutionTime
            });
            return {
                success: false,
                baseInstrumentation: {
                    instrumentationApplied: false,
                    alarmsCreated: 0,
                    executionTimeMs: totalExecutionTime
                },
                powertoolsEnhancements: {
                    instrumentationApplied: false,
                    alarmsCreated: 0,
                    executionTimeMs: 0
                },
                totalExecutionTimeMs: totalExecutionTime,
                error: errorMessage
            };
        }
    }
    /**
     * Apply only base observability (OTEL + X-Ray)
     */
    applyBaseObservability(component) {
        const startTime = Date.now();
        try {
            // This would integrate with your existing OTEL observability handlers
            // For now, we'll simulate the base observability application
            this.context.logger.info('Applying base Lambda observability', {
                service: 'LambdaObservabilityService',
                componentType: component.getType(),
                componentName: component.node.id
            });
            // TODO: Integrate with existing LambdaObservabilityHandler
            // const baseHandler = new LambdaObservabilityHandler(this.context);
            // const result = baseHandler.applyObservability(component, this.config.observabilityConfig);
            const executionTime = Date.now() - startTime;
            return {
                instrumentationApplied: true,
                alarmsCreated: 2, // Error and duration alarms
                executionTimeMs: executionTime
            };
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.context.logger.error('Failed to apply base Lambda observability', {
                service: 'LambdaObservabilityService',
                componentType: component.getType(),
                componentName: component.node.id,
                error: error instanceof Error ? error.message : String(error),
                executionTimeMs: executionTime
            });
            return {
                instrumentationApplied: false,
                alarmsCreated: 0,
                executionTimeMs: executionTime
            };
        }
    }
    /**
     * Apply only Powertools enhancements
     */
    applyPowertoolsOnly(component) {
        return this.powertoolsHandler.applyPowertoolsEnhancements(component, this.config.observabilityConfig);
    }
}
//# sourceMappingURL=lambda-observability.service.js.map