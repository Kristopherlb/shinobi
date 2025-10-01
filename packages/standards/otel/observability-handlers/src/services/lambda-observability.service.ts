/**
 * Lambda Observability Service
 * 
 * Provides a unified service interface for Lambda observability that combines:
 * - Base OTEL + X-Ray instrumentation (from LambdaObservabilityHandler)
 * - Lambda Powertools enhancements (from LambdaPowertoolsExtensionHandler)
 * 
 * This service maintains your platform's architectural patterns while providing
 * Lambda-specific capabilities for enhanced observability and audit logging.
 */

import { BaseComponent } from '@shinobi/core';
import { PlatformServiceContext } from '@shinobi/core/platform-services';
import { LambdaObservabilityHandler } from '../observability-handlers/lambda-observability.handler.js';
import { LambdaPowertoolsExtensionHandler, LambdaPowertoolsConfig } from '../observability-handlers/lambda-powertools-extension.handler.js';
import { ObservabilityConfig, ObservabilityHandlerResult } from '../observability-handlers/observability-handler.interface.js';

/**
 * Configuration for the Lambda Observability Service
 */
export interface LambdaObservabilityServiceConfig {
  /** Base observability configuration */
  observabilityConfig: ObservabilityConfig;

  /** Powertools integration configuration */
  powertoolsConfig: Partial<LambdaPowertoolsConfig>;

  /** Enable both base OTEL and Powertools enhancements */
  enableFullIntegration: boolean;

  /** Service-specific configuration */
  serviceName: string;

  /** Compliance framework */
  complianceFramework: string;
}

/**
 * Result of applying Lambda observability
 */
export interface LambdaObservabilityResult {
  /** Base OTEL instrumentation applied */
  baseInstrumentation: ObservabilityHandlerResult;

  /** Powertools enhancements applied */
  powertoolsEnhancements: ObservabilityHandlerResult;

  /** Total execution time */
  totalExecutionTimeMs: number;

  /** Success status */
  success: boolean;

  /** Error details if any */
  error?: string;
}

/**
 * Lambda Observability Service
 * 
 * Unified service for Lambda observability that combines OTEL + X-Ray + Powertools
 */
export class LambdaObservabilityService {
  private context: PlatformServiceContext;
  private baseHandler: LambdaObservabilityHandler;
  private powertoolsExtension: LambdaPowertoolsExtensionHandler;
  private config: LambdaObservabilityServiceConfig;

  constructor(
    context: PlatformServiceContext,
    config: LambdaObservabilityServiceConfig
  ) {
    this.context = context;
    this.config = config;

    // Initialize base OTEL handler
    this.baseHandler = new LambdaObservabilityHandler(context, context.taggingService);

    // Initialize Powertools extension
    this.powertoolsExtension = new LambdaPowertoolsExtensionHandler(
      context,
      {
        serviceName: config.serviceName,
        metricsNamespace: `Shinobi/${config.serviceName}`,
        ...config.powertoolsConfig
      },
      context.taggingService
    );
  }

  /**
   * Apply complete Lambda observability (OTEL + X-Ray + Powertools)
   */
  public async applyObservability(component: BaseComponent): Promise<LambdaObservabilityResult> {
    const startTime = Date.now();
    let baseInstrumentation: ObservabilityHandlerResult;
    let powertoolsEnhancements: ObservabilityHandlerResult;

    try {
      this.context.logger.info('Applying Lambda observability', {
        service: 'LambdaObservabilityService',
        componentType: component.getType(),
        componentName: component.node.id,
        enableFullIntegration: this.config.enableFullIntegration
      });

      // Apply base OTEL + X-Ray instrumentation
      baseInstrumentation = this.baseHandler.apply(component, this.config.observabilityConfig);

      // Apply Powertools enhancements if enabled
      if (this.config.enableFullIntegration) {
        powertoolsEnhancements = this.powertoolsExtension.applyPowertoolsEnhancements(
          component,
          this.config.observabilityConfig
        );
      } else {
        powertoolsEnhancements = { instrumentationApplied: false, alarmsCreated: 0, executionTimeMs: 0 };
      }

      const totalExecutionTime = Date.now() - startTime;

      const result: LambdaObservabilityResult = {
        baseInstrumentation,
        powertoolsEnhancements,
        totalExecutionTimeMs: totalExecutionTime,
        success: true
      };

      this.context.logger.info('Lambda observability applied successfully', {
        service: 'LambdaObservabilityService',
        componentType: component.getType(),
        componentName: component.node.id,
        baseInstrumentation: baseInstrumentation.instrumentationApplied,
        powertoolsEnhancements: powertoolsEnhancements.instrumentationApplied,
        totalExecutionTimeMs: totalExecutionTime
      });

      return result;

    } catch (error) {
      const totalExecutionTime = Date.now() - startTime;
      const errorMessage = (error as Error).message;

      this.context.logger.error('Failed to apply Lambda observability', {
        service: 'LambdaObservabilityService',
        componentType: component.getType(),
        componentName: component.node.id,
        totalExecutionTimeMs: totalExecutionTime,
        error: errorMessage
      });

      return {
        baseInstrumentation: { instrumentationApplied: false, alarmsCreated: 0, executionTimeMs: 0 },
        powertoolsEnhancements: { instrumentationApplied: false, alarmsCreated: 0, executionTimeMs: 0 },
        totalExecutionTimeMs: totalExecutionTime,
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Apply only base OTEL instrumentation (without Powertools)
   */
  public applyBaseObservability(component: BaseComponent): ObservabilityHandlerResult {
    return this.baseHandler.apply(component, this.config.observabilityConfig);
  }

  /**
   * Apply only Powertools enhancements (assumes base OTEL is already applied)
   */
  public applyPowertoolsOnly(component: BaseComponent): ObservabilityHandlerResult {
    return this.powertoolsExtension.applyPowertoolsEnhancements(component, this.config.observabilityConfig);
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
    this.config = { ...this.config, ...config };

    // Update Powertools extension configuration
    if (config.powertoolsConfig) {
      this.powertoolsExtension.updatePowertoolsConfig(config.powertoolsConfig);
    }
  }

  /**
   * Get Powertools configuration
   */
  public getPowertoolsConfig(): LambdaPowertoolsConfig {
    return this.powertoolsExtension.getPowertoolsConfig();
  }

  /**
   * Update Powertools configuration
   */
  public updatePowertoolsConfig(config: Partial<LambdaPowertoolsConfig>): void {
    this.powertoolsExtension.updatePowertoolsConfig(config);
  }

  /**
   * Create a factory method for easy instantiation
   */
  static create(
    context: PlatformServiceContext,
    serviceName: string,
    complianceFramework: string,
    powertoolsConfig: Partial<LambdaPowertoolsConfig> = {}
  ): LambdaObservabilityService {
    const config: LambdaObservabilityServiceConfig = {
      observabilityConfig: {
        // Default OTEL configuration
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
            errorRate: 0.05, // 5% error rate
            duration: 5000   // 5 seconds
          }
        },
        traceSamplingRate: 1.0,
        metricsInterval: 60
      },
      powertoolsConfig: {
        serviceName,
        metricsNamespace: `Shinobi/${serviceName}`,
        businessMetrics: true,
        parameterStore: true,
        auditLogging: true,
        ...powertoolsConfig
      },
      enableFullIntegration: true,
      serviceName,
      complianceFramework
    };

    return new LambdaObservabilityService(context, config);
  }

  /**
   * Create a service for audit-specific Lambda functions
   */
  static createAuditService(
    context: PlatformServiceContext,
    serviceName: string,
    complianceFramework: string
  ): LambdaObservabilityService {
    return LambdaObservabilityService.create(context, serviceName, complianceFramework, {
      auditLogging: true,
      businessMetrics: true,
      metricsNamespace: `Shinobi/Audit/${serviceName}`,
      logLevel: 'INFO',
      logEvent: true // Enable event logging for audit trails
    });
  }

  /**
   * Create a service for worker Lambda functions
   */
  static createWorkerService(
    context: PlatformServiceContext,
    serviceName: string,
    complianceFramework: string
  ): LambdaObservabilityService {
    return LambdaObservabilityService.create(context, serviceName, complianceFramework, {
      auditLogging: false, // Less verbose for workers
      businessMetrics: true,
      metricsNamespace: `Shinobi/Worker/${serviceName}`,
      logLevel: 'WARN', // Only log warnings and errors
      logEvent: false
    });
  }
}
