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
} from '../platform/contracts/platform-services';
import { BaseComponent } from '../platform/contracts/component';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';

// External observability handlers (with fallback to local implementations)
let externalHandlers: any = null;
let externalTaggingService: any = null;

try {
  // Try to import external handlers
  const handlersModule = require('@shinobi/observability-handlers');
  const taggingModule = require('@shinobi/standards-tagging');
  externalHandlers = handlersModule;
  externalTaggingService = taggingModule;
} catch (error) {
  // External packages not available, will use local implementations
  console.debug('External observability packages not available, using local implementations');
}

// Local interfaces as fallback
interface IObservabilityHandler {
  apply(component: BaseComponent, config: ObservabilityConfig): ObservabilityHandlerResult;
}

interface ObservabilityConfig {
  traceSamplingRate: number;
  metricsInterval: number;
  logsRetentionDays: number;
  alarmThresholds: Record<string, any>;
  otelEnvironmentTemplate: Record<string, string>;
  ec2OtelUserDataTemplate: string;
}

interface ObservabilityHandlerResult {
  instrumentationApplied: boolean;
  alarmsCreated: number;
  executionTimeMs: number;
}

interface ITaggingService {
  applyTags(component: BaseComponent, tags: Record<string, string>): void;
}

const defaultTaggingService: ITaggingService = {
  applyTags: (component: BaseComponent, tags: Record<string, string>) => {
    // No-op implementation for now
    console.debug('Applying tags to component', { component: component.node.id, tags });
  }
};


class NoopHandler implements IObservabilityHandler {
  constructor(private _ctx: any) { }
  apply(): ObservabilityHandlerResult {
    return { alarmsCreated: 0, instrumentationApplied: false, executionTimeMs: 0 };
  }
}

/**
 * Local ECS Observability Handler
 * Provides basic ECS observability when external handlers are not available
 */
class LocalEcsObservabilityHandler implements IObservabilityHandler {
  constructor(private context: any) { }

  apply(component: BaseComponent, config: ObservabilityConfig): ObservabilityHandlerResult {
    const startTime = Date.now();
    let alarmsCreated = 0;

    try {
      const componentType = component.getType();

      if (componentType === 'ecs-cluster') {
        alarmsCreated = this.applyEcsClusterObservability(component, config);
      } else if (componentType === 'ecs-fargate-service' || componentType === 'ecs-ec2-service') {
        alarmsCreated = this.applyEcsServiceObservability(component, config);
      }

      return {
        instrumentationApplied: false,
        alarmsCreated,
        executionTimeMs: Date.now() - startTime
      };
    } catch (error) {
      this.context.logger.error('Failed to apply ECS observability', { error: (error as Error).message });
      return {
        instrumentationApplied: false,
        alarmsCreated: 0,
        executionTimeMs: Date.now() - startTime
      };
    }
  }

  private applyEcsClusterObservability(component: BaseComponent, config: ObservabilityConfig): number {
    const cluster = component.getConstruct('cluster');
    if (!cluster) {
      this.context.logger.warn('ECS Cluster component has no cluster construct registered');
      return 0;
    }

    // ECS Service Count alarm
    const serviceCountAlarm = new cloudwatch.Alarm(component, 'EcsClusterServiceCountAlarm', {
      alarmName: `${this.context.serviceName}-${component.node.id}-service-count`,
      alarmDescription: 'ECS cluster has too many or too few services running',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'ServiceCount',
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
        dimensionsMap: {
          ClusterName: (cluster as any).clusterName || 'unknown'
        }
      }),
      threshold: config.alarmThresholds.ecs?.taskCount || 100,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });

    return 1; // Created 1 alarm
  }

  private applyEcsServiceObservability(component: BaseComponent, config: ObservabilityConfig): number {
    const service = component.getConstruct('service');
    if (!service) {
      this.context.logger.warn('ECS Service component has no service construct registered');
      return 0;
    }

    // Running Task Count alarm
    const runningTasksAlarm = new cloudwatch.Alarm(component, 'EcsServiceRunningTasksAlarm', {
      alarmName: `${this.context.serviceName}-${component.node.id}-running-tasks`,
      alarmDescription: 'ECS service has insufficient running tasks',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'RunningTaskCount',
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
        dimensionsMap: {
          ServiceName: (service as any).serviceName || component.node.id,
          ClusterName: (service as any).cluster?.clusterName || 'unknown'
        }
      }),
      threshold: config.alarmThresholds.ecs?.taskCount || 1,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD
    });

    return 1; // Created 1 alarm
  }
}



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
   * Uses external observability handlers through dependency injection when available
   */
  private initializeHandlers(): Map<string, IObservabilityHandler> {
    const handlerMap = new Map<string, IObservabilityHandler>();

    if (externalHandlers && externalHandlers.OBSERVABILITY_HANDLERS) {
      // Use external handlers when available
      try {
        // Register external handlers using the OBSERVABILITY_HANDLERS registry
        // Each handler is instantiated with the service context and tagging service
        Object.entries(externalHandlers.OBSERVABILITY_HANDLERS).forEach(([componentType, HandlerClass]: [string, any]) => {
          try {
            const handler = new HandlerClass(this.context, this.taggingService);
            handlerMap.set(componentType, handler);
            this.context.logger.debug(`Registered external observability handler for ${componentType}`, {
              handlerType: HandlerClass.name
            });
          } catch (handlerError) {
            this.context.logger.warn(`Failed to instantiate external handler for ${componentType}`, {
              error: handlerError instanceof Error ? handlerError.message : String(handlerError),
              handlerType: HandlerClass.name
            });
            // Fallback to no-op handler for this component type
            handlerMap.set(componentType, new NoopHandler(this.context));
          }
        });

        // Add additional component type mappings for backward compatibility
        const additionalMappings = [
          { type: 'lambda-api', handlerType: 'lambda' },
          { type: 'lambda-worker', handlerType: 'lambda' },
          { type: 'ecs-cluster', handlerType: 'ecs' },
          { type: 'ecs-fargate-service', handlerType: 'ecs' },
          { type: 'ecs-ec2-service', handlerType: 'ecs' }
        ];

        additionalMappings.forEach(({ type, handlerType }) => {
          if (!handlerMap.has(type) && handlerMap.has(handlerType)) {
            handlerMap.set(type, handlerMap.get(handlerType)!);
          }
        });

        this.context.logger.info('Using external observability handlers', {
          handlerCount: handlerMap.size
        });

      } catch (error) {
        this.context.logger.warn('Failed to initialize external handlers, falling back to local implementations', {
          error: error instanceof Error ? error.message : String(error)
        });
        this.initializeLocalHandlers(handlerMap);
      }
    } else {
      // Use local implementations when external handlers are not available
      this.context.logger.info('External observability handlers not available, using local implementations');
      this.initializeLocalHandlers(handlerMap);
    }

    return handlerMap;
  }

  /**
   * Initialize local observability handlers as fallback
   */
  private initializeLocalHandlers(handlerMap: Map<string, IObservabilityHandler>): void {
    // Register local ECS handler for ECS components
    const ecsHandler = new LocalEcsObservabilityHandler(this.context);
    handlerMap.set('ecs-cluster', ecsHandler);
    handlerMap.set('ecs-fargate-service', ecsHandler);
    handlerMap.set('ecs-ec2-service', ecsHandler);

    // Use no-op handlers for other types
    const noopTypes = [
      'lambda-api', 'lambda-worker', 'vpc', 'application-load-balancer',
      'rds-postgres', 'ec2-instance', 'sqs-queue'
    ];

    noopTypes.forEach(type => {
      handlerMap.set(type, new NoopHandler(this.context));
    });
  }

  /**
   * Load observability configuration from centralized platform configuration
   * Implements Platform Configuration Standard v1.0 Layer 2
   */
  private loadObservabilityConfig(): ObservabilityConfig {
    const framework = this.context.complianceFramework;
    const configPath = this.getPlatformConfigPath(framework);

    try {
      if (!fs.existsSync(configPath)) {
        this.context.logger.warn(`Platform configuration file not found: ${configPath}, using fallback defaults`, {
          service: this.name,
          framework,
          configPath
        });
        return this.getFallbackConfig();
      }

      const fileContents = fs.readFileSync(configPath, 'utf8');
      const platformConfig = yaml.load(fileContents) as any;

      // Extract observability configuration for this compliance framework
      if (platformConfig?.defaults?.observability) {
        const config = platformConfig.defaults.observability;
        return {
          traceSamplingRate: config.traceSamplingRate || 0.1,
          metricsInterval: config.metricsInterval || 300,
          logsRetentionDays: config.logsRetentionDays || 365,
          alarmThresholds: config.alarmThresholds || this.getFallbackConfig().alarmThresholds,
          otelEnvironmentTemplate: config.otelEnvironmentTemplate || this.getFallbackConfig().otelEnvironmentTemplate,
          ec2OtelUserDataTemplate: config.ec2OtelUserDataTemplate || this.getFallbackConfig().ec2OtelUserDataTemplate
        };
      }

      this.context.logger.warn(`No observability configuration found in ${configPath}, using fallback defaults`, {
        service: this.name,
        framework,
        configPath
      });
      return this.getFallbackConfig();

    } catch (error) {
      this.context.logger.error(`Failed to load platform configuration for framework '${framework}': ${(error as Error).message}`, {
        service: this.name,
        framework,
        configPath,
        error: (error as Error).message
      });
      return this.getFallbackConfig();
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
          service: this.context.serviceName,
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
   */
  public buildOTelEnvironmentVariables(componentName: string): Record<string, string> {
    const template = this.observabilityConfig.otelEnvironmentTemplate;
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
        .replace('{{ traceSamplingRate }}', this.observabilityConfig.traceSamplingRate.toString())
        .replace('{{ metricsInterval }}', this.observabilityConfig.metricsInterval.toString());
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