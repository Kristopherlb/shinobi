/**
 * EC2 Observability Handler
 * 
 * Implements OpenTelemetry instrumentation and CloudWatch alarms for EC2 components.
 * Provides comprehensive instance monitoring including status checks and performance metrics.
 */

import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { BaseComponent } from '../../platform/contracts/component';
import { IObservabilityHandler, ObservabilityHandlerResult, ObservabilityConfig } from './observability-handler.interface';
import { ITaggingService, TaggingContext, defaultTaggingService } from '../tagging.service';
import { PlatformServiceContext } from '../../platform/contracts/platform-services';

/**
 * Handler for EC2 component observability
 */
export class Ec2ObservabilityHandler implements IObservabilityHandler {
  public readonly supportedComponentType = 'ec2-instance';
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
   * Apply OpenTelemetry instrumentation and CloudWatch alarms to EC2 components
   */
  public apply(component: BaseComponent, config: ObservabilityConfig): ObservabilityHandlerResult {
    const startTime = Date.now();
    let instrumentationApplied = false;
    let alarmsCreated = 0;

    try {
      // Apply OpenTelemetry instrumentation
      instrumentationApplied = this.applyEc2OTelInstrumentation(component, config);
      
      // Create CloudWatch alarms
      alarmsCreated = this.applyEc2InstanceObservability(component, config);

      const executionTime = Date.now() - startTime;
      
      this.context.logger.info('EC2 observability applied successfully', {
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
      this.context.logger.error('Failed to apply EC2 observability', {
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
   * Apply EC2-specific OpenTelemetry instrumentation
   * Implements Platform OpenTelemetry Observability Standard v1.0 Section 5.4
   */
  private applyEc2OTelInstrumentation(component: BaseComponent, config: ObservabilityConfig): boolean {
    const instance = component.getConstruct('instance') as ec2.Instance | undefined;
    if (!instance) {
      this.context.logger.warn('EC2 component has no instance construct registered', { 
        service: 'ObservabilityService', 
        componentType: 'ec2-instance', 
        componentName: component.node.id 
      });
      return false;
    }

    // Create OTel Collector agent configuration using config values
    const otelAgentConfig = {
      receivers: {
        hostmetrics: {
          collection_interval: `${config.metricsInterval}s`,
          scrapers: {
            cpu: { metrics: { 'system.cpu.utilization': { enabled: true } } },
            memory: { metrics: { 'system.memory.utilization': { enabled: true } } },
            disk: { metrics: { 'system.disk.io.operations': { enabled: true } } },
            network: { metrics: { 'system.network.io': { enabled: true } } }
          }
        }
      },
      exporters: {
        otlp: {
          endpoint: `https://otel-collector.${this.context.complianceFramework}.${this.context.region}.platform.local:4317`,
          headers: { authorization: `Bearer ${this.getOtelAuthToken()}` }
        }
      },
      service: {
        pipelines: {
          metrics: {
            receivers: ['hostmetrics'],
            exporters: ['otlp']
          }
        }
      }
    };

    // Build environment variables from template
    const otelEnvVars = this.buildOTelEnvironmentVariables(component.node.id, config);
    
    // Use the UserData template from configuration
    const userDataTemplate = config.ec2OtelUserDataTemplate;
    const userDataScript = userDataTemplate
      .replace('{{ otelAgentConfigJson }}', JSON.stringify(otelAgentConfig, null, 2))
      .replace('{{ otelEnvironmentVars }}', Object.entries(otelEnvVars)
        .map(([key, value]) => `export ${key}="${value}"`)
        .join('\n'));

    // Add user data to install and configure OTel Collector
    const userData = ec2.UserData.forLinux();
    userData.addCommands(userDataScript);

    // Apply user data to instance (this would need to be done during instance creation)
    this.context.logger.info('EC2 OpenTelemetry instrumentation prepared', { 
      service: 'ObservabilityService', 
      componentType: 'ec2-instance', 
      componentName: component.node.id 
    });

    return true;
  }

  /**
   * Apply EC2 Instance specific observability alarms
   */
  private applyEc2InstanceObservability(component: BaseComponent, config: ObservabilityConfig): number {
    const instance = component.getConstruct('instance');
    if (!instance) {
      this.context.logger.warn('EC2 Instance component has no instance construct registered', { 
        service: 'ObservabilityService' 
      });
      return 0;
    }

    let alarmCount = 0;
    const complianceFramework = this.context.complianceFramework;
    const ec2Thresholds = config.alarmThresholds.ec2;

    // EC2 Status Check Failed alarm
    const statusCheckAlarm = new cloudwatch.Alarm(component, 'Ec2StatusCheckFailed', {
      alarmName: `${this.context.serviceName}-${component.node.id}-status-check-failed`,
      alarmDescription: 'EC2 instance status check failed',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/EC2',
        metricName: 'StatusCheckFailed',
        statistic: 'Maximum',
        period: cdk.Duration.minutes(5),
        dimensionsMap: {
          InstanceId: (instance as any).instanceId || 'unknown'
        }
      }),
      threshold: ec2Thresholds.statusCheckFailed,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD
    });

    // Apply standard tags to the alarm
    this.applyStandardTags(statusCheckAlarm, component);
    alarmCount++;

    // EC2 CPU Utilization alarm for compliance frameworks
    if (complianceFramework === 'fedramp-moderate' || complianceFramework === 'fedramp-high') {
      const cpuAlarm = new cloudwatch.Alarm(component, 'Ec2CpuUtilization', {
        alarmName: `${this.context.serviceName}-${component.node.id}-cpu-utilization`,
        alarmDescription: 'EC2 instance CPU utilization is high',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/EC2',
          metricName: 'CPUUtilization',
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
          dimensionsMap: {
            InstanceId: (instance as any).instanceId || 'unknown'
          }
        }),
        threshold: ec2Thresholds.cpuUtilization,
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
      });

      // Apply standard tags to the alarm
      this.applyStandardTags(cpuAlarm, component);
      alarmCount++;
    }

    // EC2 Network In alarm for high compliance
    if (complianceFramework === 'fedramp-high') {
      const networkInAlarm = new cloudwatch.Alarm(component, 'Ec2NetworkIn', {
        alarmName: `${this.context.serviceName}-${component.node.id}-network-in`,
        alarmDescription: 'EC2 instance network in traffic monitoring',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/EC2',
          metricName: 'NetworkIn',
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
          dimensionsMap: {
            InstanceId: (instance as any).instanceId || 'unknown'
          }
        }),
        threshold: ec2Thresholds.networkIn,
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
      });

      // Apply standard tags to the alarm
      this.applyStandardTags(networkInAlarm, component);
      alarmCount++;
    }

    return alarmCount;
  }

  /**
   * Build standard OpenTelemetry environment variables from config template
   */
  private buildOTelEnvironmentVariables(componentName: string, config: ObservabilityConfig): Record<string, string> {
    const template = config.otelEnvironmentTemplate;
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
        .replace('{{ traceSamplingRate }}', config.traceSamplingRate.toString())
        .replace('{{ metricsInterval }}', config.metricsInterval.toString());
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
}
