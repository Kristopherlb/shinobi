/**
 * Platform OpenTelemetry Observability Service
 * 
 * Implements the Platform OpenTelemetry Observability Standard v1.0 by automatically
 * configuring OpenTelemetry instrumentation, CloudWatch alarms, and compliance-aware
 * monitoring for all supported component types.
 * 
 * This service ensures every component is observable by default with:
 * - OpenTelemetry instrumentation (traces, metrics, logs)
 * - Compliance-aware configuration (Commercial/FedRAMP Moderate/FedRAMP High)
 * - Automatic environment variable injection
 * - CloudWatch alarms for operational monitoring
 * 
 * Architecture: Uses the Handler Pattern for scalable, maintainable component-specific logic.
 */

import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { 
  IPlatformService, 
  PlatformServiceContext, 
  PlatformServiceResult 
} from '@shinobi/core';
import { BaseComponent } from '@shinobi/core';
import { IObservabilityHandler, ObservabilityConfig } from '../observability-handlers/observability-handlers/observability-handler.interface.js';
import { LambdaObservabilityHandler } from '../observability-handlers/observability-handlers/lambda-observability.handler.js';
import { VpcObservabilityHandler } from '../observability-handlers/observability-handlers/vpc-observability.handler.js';
import { AlbObservabilityHandler } from '../observability-handlers/observability-handlers/alb-observability.handler.js';
import { RdsObservabilityHandler } from '../observability-handlers/observability-handlers/rds-observability.handler.js';
import { Ec2ObservabilityHandler } from '../observability-handlers/observability-handlers/ec2-observability.handler.js';
import { SqsObservabilityHandler } from '../observability-handlers/observability-handlers/sqs-observability.handler.js';
import { EcsObservabilityHandler } from '../observability-handlers/observability-handlers/ecs-observability.handler.js';
import { ITaggingService, defaultTaggingService } from '@shinobi/standards-tagging';


/**
 * Platform OpenTelemetry Observability Service
 * 
 * Implements Platform OpenTelemetry Observability Standard v1.0 and
 * Platform Service Injector Standard v1.0 using the Handler Pattern
 */
export class ObservabilityService implements IPlatformService {
  public readonly name = 'ObservabilityService';
  private context: PlatformServiceContext;
  private readonly observabilityConfig: ObservabilityConfig;
  private readonly handlers: Map<string, IObservabilityHandler>;
  private readonly taggingService: ITaggingService;
  
  // Performance optimization: In-memory cache for configuration files
  private static readonly configCache = new Map<string, ObservabilityConfig>();

  constructor(context: PlatformServiceContext, taggingService: ITaggingService = defaultTaggingService) {
    this.context = context;
    this.taggingService = taggingService;
    // Load centralized observability configuration from platform configuration
    this.observabilityConfig = this.loadObservabilityConfig();
    
    // Initialize the handler registry using the Handler Pattern
    this.handlers = this.initializeHandlers();
  }

  /**
   * Initialize the handler registry using the Handler Pattern
   * This replaces the monolithic switch statement with a scalable Map-based approach
   */
  private initializeHandlers(): Map<string, IObservabilityHandler> {
    const handlerMap = new Map<string, IObservabilityHandler>();
    
    // Register all component-specific handlers with tagging service injection
    handlerMap.set('lambda-api', new LambdaObservabilityHandler(this.context, this.taggingService));
    handlerMap.set('lambda-worker', new LambdaObservabilityHandler(this.context, this.taggingService));
    handlerMap.set('vpc', new VpcObservabilityHandler(this.context, this.taggingService));
    handlerMap.set('application-load-balancer', new AlbObservabilityHandler(this.context, this.taggingService));
    handlerMap.set('rds-postgres', new RdsObservabilityHandler(this.context, this.taggingService));
    handlerMap.set('ec2-instance', new Ec2ObservabilityHandler(this.context, this.taggingService));
    handlerMap.set('sqs-queue', new SqsObservabilityHandler(this.context, this.taggingService));
    handlerMap.set('ecs-cluster', new EcsObservabilityHandler(this.context, this.taggingService));
    handlerMap.set('ecs-fargate-service', new EcsObservabilityHandler(this.context, this.taggingService));
    handlerMap.set('ecs-ec2-service', new EcsObservabilityHandler(this.context, this.taggingService));
    
    return handlerMap;
  }

  /**
   * Load observability configuration from centralized platform configuration
   * Implements Platform Configuration Standard v1.0 Layer 2
   * Performance optimized with in-memory caching
   */
  private loadObservabilityConfig(): ObservabilityConfig {
    const framework = this.context.complianceFramework;
    const configPath = this.getPlatformConfigPath(framework);
    
    // Performance optimization: Check cache first
    const cacheKey = `${framework}:${configPath}`;
    if (ObservabilityService.configCache.has(cacheKey)) {
      this.context.logger.debug('Using cached observability configuration', {
        service: this.name,
        framework,
        cacheKey
      });
      return ObservabilityService.configCache.get(cacheKey)!;
    }
    
    try {
      if (!fs.existsSync(configPath)) {
        this.context.logger.warn(`Platform configuration file not found: ${configPath}, using fallback defaults`, {
          service: this.name,
          framework,
          configPath
        });
        const fallbackConfig = this.getFallbackConfig();
        // Cache the fallback config to avoid repeated file system checks
        ObservabilityService.configCache.set(cacheKey, fallbackConfig);
        return fallbackConfig;
      }
      
      const fileContents = fs.readFileSync(configPath, 'utf8');
      const platformConfig = yaml.load(fileContents) as any;
      
      // Extract observability configuration for this compliance framework
      if (platformConfig?.defaults?.observability) {
        const config = platformConfig.defaults.observability;
        const loadedConfig: ObservabilityConfig = {
          traceSamplingRate: config.traceSamplingRate || 0.1,
          metricsInterval: config.metricsInterval || 300,
          logsRetentionDays: config.logsRetentionDays || 365,
          alarmThresholds: config.alarmThresholds || this.getFallbackConfig().alarmThresholds,
          otelEnvironmentTemplate: config.otelEnvironmentTemplate || this.getFallbackConfig().otelEnvironmentTemplate,
          ec2OtelUserDataTemplate: config.ec2OtelUserDataTemplate || this.getFallbackConfig().ec2OtelUserDataTemplate
        };
        
        // Performance optimization: Cache the loaded configuration
        ObservabilityService.configCache.set(cacheKey, loadedConfig);
        return loadedConfig;
      }
      
      this.context.logger.warn(`No observability configuration found in ${configPath}, using fallback defaults`, {
        service: this.name,
        framework,
        configPath
      });
      const fallbackConfig = this.getFallbackConfig();
      // Cache the fallback config
      ObservabilityService.configCache.set(cacheKey, fallbackConfig);
      return fallbackConfig;
      
    } catch (error) {
      this.context.logger.error(`Failed to load platform configuration for framework '${framework}': ${(error as Error).message}`, {
        service: this.name,
        framework,
        configPath,
        error: (error as Error).message
      });
      const fallbackConfig = this.getFallbackConfig();
      // Cache the fallback config even in error cases
      ObservabilityService.configCache.set(cacheKey, fallbackConfig);
      return fallbackConfig;
    }
  }

  /**
   * Get the file path for platform configuration based on compliance framework
   */
  private getPlatformConfigPath(framework: string): string {
    const configDir = path.join(process.cwd(), 'config');
    return path.join(configDir, `${framework}.yml`);
  }

  /**
   * Clear the configuration cache
   * Useful for testing or when configuration files change at runtime
   */
  public static clearConfigCache(): void {
    ObservabilityService.configCache.clear();
  }

  /**
   * Get cache statistics for monitoring and debugging
   */
  public static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: ObservabilityService.configCache.size,
      keys: Array.from(ObservabilityService.configCache.keys())
    };
  }

  /**
   * Get fallback configuration when platform configuration is not available
   * These serve as the absolute final fallback (Layer 1 of Configuration Standard)
   */
  private getFallbackConfig(): ObservabilityConfig {
    return {
      traceSamplingRate: 0.1,
      metricsInterval: 300,
      logsRetentionDays: 365,
      alarmThresholds: {
        ec2: {
          cpuUtilization: 85,
          statusCheckFailed: 1,
          networkIn: 100000000
        },
        rds: {
          freeStorageSpace: 10,
          cpuUtilization: 85,
          connectionCount: 80
        },
        lambda: {
          errorRate: 5,
          duration: 5000,
          throttles: 10
        },
        alb: {
          responseTime: 2,
          http5xxErrors: 10,
          unhealthyTargets: 1
        },
        sqs: {
          messageAge: 300,
          deadLetterMessages: 5
        },
        ecs: {
          cpuUtilization: 80,
          memoryUtilization: 80,
          taskCount: 0
        },
        vpc: {
          natGatewayPacketDropThreshold: 1000,
          natGatewayPortAllocationErrors: 1
        }
      },
      otelEnvironmentTemplate: {
        'OTEL_EXPORTER_OTLP_ENDPOINT': 'https://otel-collector.{{ region }}.platform.local:4317',
        'OTEL_EXPORTER_OTLP_HEADERS': 'authorization=Bearer {{ authToken }}',
        'OTEL_SERVICE_NAME': '{{ componentName }}',
        'OTEL_SERVICE_VERSION': '{{ serviceVersion }}',
        'OTEL_RESOURCE_ATTRIBUTES': 'service.name={{ serviceName }},deployment.environment={{ environment }},cloud.provider={{ cloudProvider }}',
      'OTEL_TRACES_SAMPLER': 'traceidratio',
        'OTEL_TRACES_SAMPLER_ARG': '{{ traceSamplingRate }}',
      'OTEL_METRICS_EXPORTER': 'otlp',
      'OTEL_LOGS_EXPORTER': 'otlp',
      'OTEL_PROPAGATORS': 'tracecontext,baggage,xray',
      'OTEL_INSTRUMENTATION_COMMON_DEFAULT_ENABLED': 'true',
      'OTEL_BSP_MAX_EXPORT_BATCH_SIZE': '512',
      'OTEL_BSP_EXPORT_TIMEOUT': '30000',
        'OTEL_METRIC_EXPORT_INTERVAL': '{{ metricsInterval }}'
      },
      ec2OtelUserDataTemplate: '#!/bin/bash\nyum update -y\ncurl -L -o /tmp/otelcol-contrib.deb https://github.com/open-telemetry/opentelemetry-collector-releases/releases/latest/download/otelcol-contrib_linux_amd64.deb\ndpkg -i /tmp/otelcol-contrib.deb\ncat > /opt/aws/otel-collector/config.yaml << \'EOF\'\n{{ otelAgentConfigJson }}\nEOF\n{{ otelEnvironmentVars }}\nsystemctl enable otelcol-contrib\nsystemctl start otelcol-contrib'
    };
  }

  /**
   * The core method that applies OpenTelemetry observability to a component
   * after it has been fully synthesized.
   * 
   * Implements Platform OpenTelemetry Observability Standard v1.0:
   * - Configures OpenTelemetry instrumentation
   * - Injects OTel environment variables
   * - Creates compliance-aware CloudWatch alarms
   * - Sets up proper retention and sampling
   * 
   * Architecture: Uses the Handler Pattern for scalable, maintainable component-specific logic.
   */
  public apply(component: BaseComponent): void {
    const startTime = Date.now();
    const componentType = component.getType();
    const componentName = component.node.id;

    // Find the appropriate handler for this component type
    const handler = this.handlers.get(componentType);
    
    if (!handler) {
      // Simply log and return for unsupported types - don't throw error
      this.context.logger.info(`No OpenTelemetry instrumentation for component type ${componentType}`, { 
        service: this.name,
        componentType, 
        componentName 
      });
      return;
    }

    try {
      // Delegate to the appropriate handler using the Handler Pattern
      // Pass the centralized configuration to the handler
      const result = handler.apply(component, this.observabilityConfig);

      // Ensure result is valid before accessing properties
      if (result) {
      // Log successful application
      this.context.logger.info('OpenTelemetry observability applied successfully', {
        service: this.name,
        componentType,
        componentName,
          alarmsCreated: result.alarmsCreated,
          instrumentationApplied: result.instrumentationApplied,
          executionTimeMs: result.executionTimeMs
        });
      }
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.context.logger.error('Failed to apply observability', {
        service: this.name,
        componentType,
        componentName,
        executionTimeMs: executionTime,
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      throw error;
    }
  }

  /**
   * Build OpenTelemetry environment variables from template
   * Performs string substitution on the template with actual values
   * Performance optimized with pre-computed substitution values
   */
  public buildOTelEnvironmentVariables(componentName: string): Record<string, string> {
    const template = this.observabilityConfig.otelEnvironmentTemplate;
    const envVars: Record<string, string> = {};
    
    // Performance optimization: Pre-compute all substitution values
    const substitutions = {
      '{{ region }}': this.context.region,
      '{{ authToken }}': this.getOtelAuthToken(),
      '{{ componentName }}': componentName,
      '{{ serviceVersion }}': this.context.serviceLabels?.version || '1.0.0',
      '{{ serviceName }}': this.context.serviceName,
      '{{ environment }}': this.context.environment,
      '{{ cloudProvider }}': 'aws', // Fixed value for AWS CDK library
      '{{ complianceFramework }}': this.context.complianceFramework,
      '{{ traceSamplingRate }}': this.observabilityConfig.traceSamplingRate.toString(),
      '{{ metricsInterval }}': this.observabilityConfig.metricsInterval.toString()
    };
    
    // Performance optimization: Use Object.entries for better performance
    for (const [key, value] of Object.entries(template)) {
      let processedValue = value;
      
      // Apply all substitutions in a single pass
      for (const [placeholder, replacement] of Object.entries(substitutions)) {
        processedValue = processedValue.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), replacement);
      }
      
      envVars[key] = processedValue;
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
   * Get the current observability configuration
   * Provides type-safe access to the loaded configuration
   */
  public getObservabilityConfig(): Readonly<ObservabilityConfig> {
    return this.observabilityConfig;
  }

  /**
   * Get handler information for debugging and monitoring
   */
  public getHandlerInfo(): { supportedTypes: string[]; handlerCount: number } {
    return {
      supportedTypes: Array.from(this.handlers.keys()),
      handlerCount: this.handlers.size
    };
  }

  /**
   * Get the centralized observability configuration
   * This allows handlers to access configuration without hardcoding values
   */
  public getObservabilityConfig(): ObservabilityConfig {
    return this.observabilityConfig;
  }

  /**
   * Get the list of supported component types for this service
   * Useful for debugging and service discovery
   */
  public getSupportedComponentTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get handler information for debugging and monitoring
   */
  public getHandlerInfo(): Record<string, string> {
    const info: Record<string, string> = {};
    this.handlers.forEach((handler, componentType) => {
      info[componentType] = handler.constructor.name;
    });
    return info;
  }
}