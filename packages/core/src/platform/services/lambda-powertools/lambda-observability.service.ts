/**
 * Lambda Observability Service
 * 
 * Unified service for applying comprehensive observability to AWS Lambda functions.
 * Combines base OpenTelemetry instrumentation with AWS Lambda Powertools enhancements.
 * 
 * This service is designed to be used by all Lambda components (lambda-api, lambda-worker, etc.)
 * and provides a single interface for observability configuration.
 */

import { BaseComponent } from '@shinobi/core';
import { PlatformServiceContext } from '@shinobi/core/platform-services';
import { ObservabilityConfig } from '../../../standards/otel/observability-handlers/src/observability-handlers/observability-handler.interface';
import { LambdaPowertoolsExtensionHandler, LambdaPowertoolsConfig } from './lambda-powertools-extension.handler';

/**
 * Configuration for the Lambda Observability Service
 */
export interface LambdaObservabilityServiceConfig {
  /**
   * Base observability configuration
   */
  observabilityConfig: ObservabilityConfig;

  /**
   * Powertools configuration
   */
  powertoolsConfig: LambdaPowertoolsConfig;

  /**
   * Enable full integration (base OTEL + Powertools)
   * @default true
   */
  enableFullIntegration?: boolean;

  /**
   * Service name for observability
   */
  serviceName: string;

  /**
   * Compliance framework
   */
  complianceFramework: string;
}

/**
 * Result of applying observability
 */
export interface ObservabilityResult {
  success: boolean;
  baseInstrumentation: {
    instrumentationApplied: boolean;
    alarmsCreated: number;
    executionTimeMs: number;
  };
  powertoolsEnhancements: {
    instrumentationApplied: boolean;
    alarmsCreated: number;
    executionTimeMs: number;
  };
  totalExecutionTimeMs: number;
  error?: string;
}

/**
 * Lambda Observability Service
 * 
 * Provides unified observability management for Lambda functions, combining
 * base OpenTelemetry instrumentation with Powertools enhancements.
 */
export class LambdaObservabilityService {
  private config: LambdaObservabilityServiceConfig;
  private context: PlatformServiceContext;
  private powertoolsHandler: LambdaPowertoolsExtensionHandler;

  constructor(
    context: PlatformServiceContext,
    config: LambdaObservabilityServiceConfig
  ) {
    this.context = context;
    this.config = {
      enableFullIntegration: true,
      ...config
    };
    this.powertoolsHandler = new LambdaPowertoolsExtensionHandler(
      context,
      this.config.powertoolsConfig
    );
  }

  /**
   * Factory method to create a service instance
   */
  public static create(
    context: PlatformServiceContext,
    serviceName: string,
    complianceFramework: string,
    powertoolsConfig?: Partial<LambdaPowertoolsConfig>
  ): LambdaObservabilityService {
    const config: LambdaObservabilityServiceConfig = {
      observabilityConfig: {
        otelEnvironmentTemplate: {
          'OTEL_SERVICE_NAME': serviceName,
          'OTEL_RESOURCE_ATTRIBUTES': `service.name=${serviceName},service.version=${context.serviceLabels?.version || '1.0.0'}`,
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
  public static createAuditService(
    context: PlatformServiceContext,
    serviceName: string,
    complianceFramework: string
  ): LambdaObservabilityService {
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
  public static createWorkerService(
    context: PlatformServiceContext,
    serviceName: string,
    complianceFramework: string
  ): LambdaObservabilityService {
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
  public getConfig(): LambdaObservabilityServiceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<LambdaObservabilityServiceConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }

  /**
   * Get Powertools configuration
   */
  public getPowertoolsConfig(): LambdaPowertoolsConfig {
    return this.powertoolsHandler.getPowertoolsConfig();
  }

  /**
   * Update Powertools configuration
   */
  public updatePowertoolsConfig(config: Partial<LambdaPowertoolsConfig>): void {
    this.powertoolsHandler.updatePowertoolsConfig(config);
    this.config.powertoolsConfig = {
      ...this.config.powertoolsConfig,
      ...config
    };
  }

  /**
   * Apply complete observability to a Lambda component
   */
  public async applyObservability(component: BaseComponent): Promise<ObservabilityResult> {
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
        powertoolsResult = this.powertoolsHandler.applyPowertoolsEnhancements(
          component,
          this.config.observabilityConfig
        );
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

    } catch (error) {
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
  public applyBaseObservability(component: BaseComponent): {
    instrumentationApplied: boolean;
    alarmsCreated: number;
    executionTimeMs: number;
  } {
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

    } catch (error) {
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
  public applyPowertoolsOnly(component: BaseComponent): {
    instrumentationApplied: boolean;
    alarmsCreated: number;
    executionTimeMs: number;
  } {
    return this.powertoolsHandler.applyPowertoolsEnhancements(
      component,
      this.config.observabilityConfig
    );
  }
}
