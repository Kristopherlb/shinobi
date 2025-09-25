/**
 * Application Load Balancer Observability Handler
 * 
 * Implements CloudWatch alarms for ALB components, providing comprehensive
 * monitoring for response time, unhealthy targets, and HTTP errors.
 */

import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { BaseComponent } from '@shinobi/core';
import { IObservabilityHandler, ObservabilityHandlerResult, ObservabilityConfig } from './observability-handler.interface';
import { ITaggingService, TaggingContext, defaultTaggingService } from '@shinobi/standards-tagging';
import { PlatformServiceContext } from '@shinobi/core/platform-services';

/**
 * Handler for Application Load Balancer component observability
 */
export class AlbObservabilityHandler implements IObservabilityHandler {
  public readonly supportedComponentType = 'application-load-balancer';
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
   * Apply CloudWatch alarms to ALB components
   */
  public apply(component: BaseComponent, config: ObservabilityConfig): ObservabilityHandlerResult {
    const startTime = Date.now();
    let instrumentationApplied = false; // ALB doesn't need instrumentation
    let alarmsCreated = 0;

    try {
      // Create CloudWatch alarms for ALB monitoring
      alarmsCreated = this.applyAlbObservability(component, config);

      const executionTime = Date.now() - startTime;
      
      this.context.logger.info('ALB observability applied successfully', {
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
      this.context.logger.error('Failed to apply ALB observability', {
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
   * Apply Application Load Balancer specific observability
   * Creates alarms for response time, unhealthy targets, and HTTP errors
   */
  private applyAlbObservability(component: BaseComponent, config: ObservabilityConfig): number {
    const loadBalancer = component.getConstruct('loadBalancer');
    if (!loadBalancer) {
      this.context.logger.warn('ALB component has no loadBalancer construct registered', { 
        service: 'ObservabilityService' 
      });
      return 0;
    }

    let alarmCount = 0;
    const complianceFramework = this.context.complianceFramework;
    const loadBalancerName = (loadBalancer as any).loadBalancerName || component.node.id;
    const albThresholds = config.alarmThresholds.alb;

    // Response time alarm
    const responseTimeAlarm = new cloudwatch.Alarm(component, 'AlbResponseTimeAlarm', {
      alarmName: `${this.context.serviceName}-${component.node.id}-response-time`,
      alarmDescription: 'ALB response time is high',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApplicationELB',
        metricName: 'TargetResponseTime',
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
        dimensionsMap: {
          LoadBalancer: loadBalancerName
        }
      }),
      threshold: albThresholds.responseTime,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });

    // Apply standard tags to the alarm
    this.applyStandardTags(responseTimeAlarm, component);
    alarmCount++;

    // HTTP 5xx errors alarm
    const http5xxAlarm = new cloudwatch.Alarm(component, 'AlbHttp5xxErrorsAlarm', {
      alarmName: `${this.context.serviceName}-${component.node.id}-http-5xx-errors`,
      alarmDescription: 'ALB is generating HTTP 5xx errors',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApplicationELB',
        metricName: 'HTTPCode_ELB_5XX_Count',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
        dimensionsMap: {
          LoadBalancer: loadBalancerName
        }
      }),
      threshold: albThresholds.http5xxErrors,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });

    // Apply standard tags to the alarm
    this.applyStandardTags(http5xxAlarm, component);
    alarmCount++;

    // Unhealthy target count alarm
    const unhealthyTargetsAlarm = new cloudwatch.Alarm(component, 'AlbUnhealthyTargetsAlarm', {
      alarmName: `${this.context.serviceName}-${component.node.id}-unhealthy-targets`,
      alarmDescription: 'ALB has unhealthy targets',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApplicationELB',
        metricName: 'UnHealthyHostCount',
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
        dimensionsMap: {
          LoadBalancer: loadBalancerName
        }
      }),
      threshold: albThresholds.unhealthyTargets,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });

    // Apply standard tags to the alarm
    this.applyStandardTags(unhealthyTargetsAlarm, component);
    alarmCount++;

    // HTTP 4xx errors alarm for compliance frameworks
    if (complianceFramework === 'fedramp-moderate' || complianceFramework === 'fedramp-high') {
      const http4xxAlarm = new cloudwatch.Alarm(component, 'AlbHttp4xxErrorsAlarm', {
        alarmName: `${this.context.serviceName}-${component.node.id}-http-4xx-errors`,
        alarmDescription: 'ALB is generating excessive HTTP 4xx errors - potential security issue',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ApplicationELB',
          metricName: 'HTTPCode_ELB_4XX_Count',
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
          dimensionsMap: {
            LoadBalancer: loadBalancerName
          }
        }),
        threshold: complianceFramework === 'fedramp-high' ? 50 : 100,
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
      });

      // Apply standard tags to the alarm
      this.applyStandardTags(http4xxAlarm, component);
      alarmCount++;
    }

    // Target response time alarm for compliance frameworks
    if (complianceFramework === 'fedramp-moderate' || complianceFramework === 'fedramp-high') {
      const targetResponseTimeAlarm = new cloudwatch.Alarm(component, 'AlbTargetResponseTimeAlarm', {
        alarmName: `${this.context.serviceName}-${component.node.id}-target-response-time`,
        alarmDescription: 'ALB target response time exceeds compliance threshold',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ApplicationELB',
          metricName: 'TargetResponseTime',
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
          dimensionsMap: {
            LoadBalancer: loadBalancerName
          }
        }),
        threshold: complianceFramework === 'fedramp-high' ? 1 : 2, // 1s for high, 2s for moderate
        evaluationPeriods: 3,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
      });

      // Apply standard tags to the alarm
      this.applyStandardTags(targetResponseTimeAlarm, component);
      alarmCount++;
    }

    // Request count alarm for high compliance
    if (complianceFramework === 'fedramp-high') {
      const requestCountAlarm = new cloudwatch.Alarm(component, 'AlbRequestCountAlarm', {
        alarmName: `${this.context.serviceName}-${component.node.id}-request-count`,
        alarmDescription: 'ALB request count monitoring for high compliance',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ApplicationELB',
          metricName: 'RequestCount',
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
          dimensionsMap: {
            LoadBalancer: loadBalancerName
          }
        }),
        threshold: 10000, // Alert if more than 10k requests in 5 minutes
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
      });

      // Apply standard tags to the alarm
      this.applyStandardTags(requestCountAlarm, component);
      alarmCount++;
    }

    return alarmCount;
  }
}
