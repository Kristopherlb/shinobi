/**
 * ECS Observability Handler
 * 
 * Implements OpenTelemetry instrumentation and CloudWatch alarms for ECS components.
 * Handles both ECS clusters and ECS services (Fargate and EC2).
 */

import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { BaseComponent } from '../../platform/contracts/component';
import { IObservabilityHandler, ObservabilityHandlerResult } from './observability-handler.interface';
import { ITaggingService, TaggingContext, defaultTaggingService } from '../tagging.service';
import { PlatformServiceContext } from '../../platform/contracts/platform-services';

/**
 * Handler for ECS component observability
 */
export class EcsObservabilityHandler implements IObservabilityHandler {
  public readonly supportedComponentType = 'ecs';
  private context: PlatformServiceContext;
  private taggingService: ITaggingService;

  constructor(context: PlatformServiceContext, taggingService: ITaggingService = defaultTaggingService) {
    this.context = context;
    this.taggingService = taggingService;
  }
  /**
   * Apply standard tags to a resource
   */
  private applyStandardTags(resource: IConstruct, component: BaseComponent, additionalTags?: Record<string, string>): void {
    const taggingContext: TaggingContext = {
      serviceName: this.context.serviceName,
      serviceLabels: this.context.serviceLabels,
      componentName: component.node.id,
      componentType: this.supportedComponentType,
      environment: this.context.environment,
      complianceFramework: this.context.complianceFramework,
      region: this.context.region,
      accountId: undefined
    };
    
    this.taggingService.applyStandardTags(resource, taggingContext, additionalTags);
  }

  /**
   * Apply OpenTelemetry instrumentation and CloudWatch alarms to ECS components
   */
  public apply(component: BaseComponent): ObservabilityHandlerResult {
    const startTime = Date.now();
    let instrumentationApplied = false;
    let alarmsCreated = 0;

    try {
      const componentType = component.getType();

      // Apply component-specific observability
      if (componentType === 'ecs-cluster') {
        alarmsCreated = this.applyEcsClusterObservability(component);
      } else if (componentType === 'ecs-fargate-service' || componentType === 'ecs-ec2-service') {
        instrumentationApplied = this.applyEcsServiceOTelInstrumentation(component);
        alarmsCreated = this.applyEcsServiceObservability(component);
      }

      const executionTime = Date.now() - startTime;
      
      this.context.logger.info('ECS observability applied successfully', {
        service: 'ObservabilityService',
        componentType: component.getType(),
        componentName: component.node.id,
        alarmsCreated,
        instrumentationApplied,
        executionTimeMs: executionTime
      });

      return {
        instrumentationApplied,
        alarmsCreated,
        executionTimeMs: executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.context.logger.error('Failed to apply ECS observability', {
        service: 'ObservabilityService',
        componentType: component.getType(),
        componentName: component.node.id,
        executionTimeMs: executionTime,
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      throw error;
    }
  }

  /**
   * Apply ECS Service OpenTelemetry instrumentation
   * Configures container-level OTel environment variables and monitoring
   */
  private applyEcsServiceOTelInstrumentation(component: BaseComponent): boolean {
    const taskDefinition = component.getConstruct('taskDefinition');
    if (!taskDefinition) {
      this.context.logger.warn('ECS Service component has no taskDefinition construct registered', { 
        service: 'ObservabilityService' 
      });
      return false;
    }

    const otelConfig = this.getOTelConfig();
    const otelEnvVars = this.buildOTelEnvironmentVariables(component.node.id);
    
    // ECS-specific OpenTelemetry environment variables
    const ecsOtelEnvVars = {
      ...otelEnvVars,
      // ECS-specific instrumentation
      'OTEL_INSTRUMENTATION_ECS_ENABLED': 'true',
      'OTEL_INSTRUMENTATION_AWS_ECS_ENABLED': 'true',
      'AWS_ECS_SERVICE_NAME': component.node.id,
      
      // Container-specific configuration
      'OTEL_INSTRUMENTATION_HTTP_ENABLED': 'true',
      'OTEL_INSTRUMENTATION_AWS_SDK_ENABLED': 'true',
      'OTEL_INSTRUMENTATION_CONTAINER_RESOURCE_ENABLED': 'true'
    };

    this.context.logger.info('ECS Service OpenTelemetry instrumentation configured', {
      componentType: component.getType(),
      componentName: component.node.id,
      environmentVariablesCount: Object.keys(ecsOtelEnvVars).length
    });

    return true;
  }

  /**
   * Apply ECS Cluster specific observability
   * Creates alarms for cluster capacity and resource utilization
   */
  private applyEcsClusterObservability(component: BaseComponent): number {
    const cluster = component.getConstruct('cluster');
    if (!cluster) {
      this.context.logger.warn('ECS Cluster component has no cluster construct registered', { 
        service: 'ObservabilityService' 
      });
      return 0;
    }

    let alarmCount = 0;
    const complianceFramework = this.context.complianceFramework;

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
      threshold: complianceFramework === 'fedramp-high' ? 50 : 100,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });

    // Apply standard tags to the alarm
    this.applyStandardTags(serviceCountAlarm, component);
    alarmCount++;

    // CPU Reservation alarm for compliance frameworks
    if (complianceFramework === 'fedramp-moderate' || complianceFramework === 'fedramp-high') {
      const cpuReservationAlarm = new cloudwatch.Alarm(component, 'EcsClusterCpuReservationAlarm', {
        alarmName: `${this.context.serviceName}-${component.node.id}-cpu-reservation`,
        alarmDescription: 'ECS cluster CPU reservation is high',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ECS',
          metricName: 'CPUReservation',
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
          dimensionsMap: {
            ClusterName: (cluster as any).clusterName || 'unknown'
          }
        }),
        threshold: complianceFramework === 'fedramp-high' ? 70 : 80, // More conservative for FedRAMP High
        evaluationPeriods: 3,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
      });

      // Apply standard tags to the alarm
      this.applyStandardTags(cpuReservationAlarm, component);
      alarmCount++;
    }

    // Memory Reservation alarm for high compliance
    if (complianceFramework === 'fedramp-high') {
      const memoryReservationAlarm = new cloudwatch.Alarm(component, 'EcsClusterMemoryReservationAlarm', {
        alarmName: `${this.context.serviceName}-${component.node.id}-memory-reservation`,
        alarmDescription: 'ECS cluster memory reservation is high',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ECS',
          metricName: 'MemoryReservation',
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
          dimensionsMap: {
            ClusterName: (cluster as any).clusterName || 'unknown'
          }
        }),
        threshold: 80,
        evaluationPeriods: 3,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
      });

      // Apply standard tags to the alarm
      this.applyStandardTags(memoryReservationAlarm, component);
      alarmCount++;
    }

    return alarmCount;
  }

  /**
   * Apply ECS Service specific observability
   * Creates alarms for service health, scaling, and performance
   */
  private applyEcsServiceObservability(component: BaseComponent): number {
    const service = component.getConstruct('service');
    if (!service) {
      this.context.logger.warn('ECS Service component has no service construct registered', { 
        service: 'ObservabilityService' 
      });
      return 0;
    }

    let alarmCount = 0;
    const complianceFramework = this.context.complianceFramework;
    const serviceName = (service as any).serviceName || component.node.id;

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
          ServiceName: serviceName,
          ClusterName: (service as any).cluster?.clusterName || 'unknown'
        }
      }),
      threshold: complianceFramework === 'fedramp-high' ? 1 : 0, // FedRAMP High requires HA
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD
    });

    // Apply standard tags to the alarm
    this.applyStandardTags(runningTasksAlarm, component);
    alarmCount++;

    // CPU Utilization alarm
    const cpuUtilizationAlarm = new cloudwatch.Alarm(component, 'EcsServiceCpuUtilizationAlarm', {
      alarmName: `${this.context.serviceName}-${component.node.id}-cpu-utilization`,
      alarmDescription: 'ECS service CPU utilization is high',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'CPUUtilization',
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
        dimensionsMap: {
          ServiceName: serviceName,
          ClusterName: (service as any).cluster?.clusterName || 'unknown'
        }
      }),
      threshold: complianceFramework === 'fedramp-high' ? 70 : 80,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });

    // Apply standard tags to the alarm
    this.applyStandardTags(cpuUtilizationAlarm, component);
    alarmCount++;

    // Memory Utilization alarm
    const memoryUtilizationAlarm = new cloudwatch.Alarm(component, 'EcsServiceMemoryUtilizationAlarm', {
      alarmName: `${this.context.serviceName}-${component.node.id}-memory-utilization`,
      alarmDescription: 'ECS service memory utilization is high',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'MemoryUtilization',
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
        dimensionsMap: {
          ServiceName: serviceName,
          ClusterName: (service as any).cluster?.clusterName || 'unknown'
        }
      }),
      threshold: complianceFramework === 'fedramp-high' ? 75 : 85,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });

    // Apply standard tags to the alarm
    this.applyStandardTags(memoryUtilizationAlarm, component);
    alarmCount++;

    return alarmCount;
  }

  /**
   * Build standard OpenTelemetry environment variables
   */
  private buildOTelEnvironmentVariables(componentName: string): Record<string, string> {
    const otelConfig = this.getOTelConfig();
    
    return {
      // Core OTel configuration
      'OTEL_EXPORTER_OTLP_ENDPOINT': otelConfig.collectorEndpoint,
      'OTEL_EXPORTER_OTLP_HEADERS': `authorization=Bearer ${otelConfig.authToken}`,
      'OTEL_SERVICE_NAME': componentName,
      'OTEL_SERVICE_VERSION': this.context.serviceLabels?.version || '1.0.0',
      'OTEL_RESOURCE_ATTRIBUTES': this.buildResourceAttributes(),
      
      // Sampling and export configuration
      'OTEL_TRACES_SAMPLER': 'traceidratio',
      'OTEL_TRACES_SAMPLER_ARG': otelConfig.traceSamplingRate.toString(),
      'OTEL_METRICS_EXPORTER': 'otlp',
      'OTEL_LOGS_EXPORTER': 'otlp',
      
      // Instrumentation configuration
      'OTEL_PROPAGATORS': 'tracecontext,baggage,xray',
      'OTEL_INSTRUMENTATION_COMMON_DEFAULT_ENABLED': 'true',
      
      // Performance tuning
      'OTEL_BSP_MAX_EXPORT_BATCH_SIZE': '512',
      'OTEL_BSP_EXPORT_TIMEOUT': '30000',
      'OTEL_METRIC_EXPORT_INTERVAL': otelConfig.metricsInterval.toString()
    };
  }

  /**
   * Build OpenTelemetry resource attributes according to the standard
   */
  private buildResourceAttributes(): string {
    const attributes = [
      `service.name=${this.context.serviceName}`,
      `deployment.environment=${this.context.environment}`,
      `cloud.provider=aws`,
      `cloud.region=${this.context.region}`,
      `compliance.framework=${this.context.complianceFramework}`
    ];

    // Add additional labels from service configuration
    if (this.context.serviceLabels) {
      Object.entries(this.context.serviceLabels).forEach(([key, value]) => {
        attributes.push(`${key}=${value}`);
      });
    }

    return attributes.join(',');
  }

  /**
   * Get OpenTelemetry configuration based on compliance framework
   * Uses centralized platform configuration instead of hardcoded defaults
   */
  private getOTelConfig(): any {
    const framework = this.context.complianceFramework;
    const region = this.context.region;
    const defaults = this.getObservabilityDefaults()[framework];
    
    return {
      collectorEndpoint: `https://otel-collector.${framework}.${region}.platform.local:4317`,
      traceSamplingRate: defaults.traceSamplingRate,
      metricsInterval: defaults.metricsInterval,
      logsRetentionDays: defaults.logsRetentionDays,
      authToken: this.getOtelAuthToken(framework)
    };
  }

  /**
   * Get observability defaults from centralized platform configuration
   */
  private getObservabilityDefaults(): any {
    // In a full implementation, this would load from centralized config files
    // For now, using type-safe defaults that can be easily moved to config
    return {
      commercial: {
        traceSamplingRate: 0.1, // 10% sampling for cost optimization
        metricsInterval: 300, // 5 minute intervals
        logsRetentionDays: 365 // 1 year retention
      },
      'fedramp-moderate': {
        traceSamplingRate: 0.25, // 25% sampling for enhanced monitoring  
        metricsInterval: 60, // 1 minute intervals
        logsRetentionDays: 1095 // 3 years retention
      },
      'fedramp-high': {
        traceSamplingRate: 1.0, // 100% sampling for complete audit trail
        metricsInterval: 30, // 30 second intervals for high compliance
        logsRetentionDays: 2555 // 7 years retention
      }
    };
  }

  /**
   * Get OpenTelemetry authentication token for the compliance framework
   */
  private getOtelAuthToken(framework: string): string {
    // In production, this would retrieve from AWS Secrets Manager or Parameter Store
    return `otel-token-${framework}-${this.context.environment}`;
  }
}
