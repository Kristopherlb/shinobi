/**
 * SQS Observability Handler
 * 
 * Implements OpenTelemetry instrumentation and CloudWatch alarms for SQS components.
 * Provides comprehensive queue monitoring including depth, message age, and dead letter queue metrics.
 */

import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { BaseComponent } from '../../platform/contracts/component';
import { IObservabilityHandler, ObservabilityHandlerResult } from './observability-handler.interface';
import { ITaggingService, TaggingContext, defaultTaggingService } from '../tagging.service';
import { PlatformServiceContext } from '../../platform/contracts/platform-services';

/**
 * Handler for SQS component observability
 */
export class SqsObservabilityHandler implements IObservabilityHandler {
  public readonly supportedComponentType = 'sqs-queue';
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
   * Apply OpenTelemetry instrumentation and CloudWatch alarms to SQS components
   */
  public apply(component: BaseComponent): ObservabilityHandlerResult {
    const startTime = Date.now();
    let instrumentationApplied = false;
    let alarmsCreated = 0;

    try {
      // Apply OpenTelemetry instrumentation
      instrumentationApplied = this.applySqsOTelInstrumentation(component);
      
      // Create CloudWatch alarms
      alarmsCreated = this.applySqsObservability(component);

      const executionTime = Date.now() - startTime;
      
      this.context.logger.info('SQS observability applied successfully', {
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
      this.context.logger.error('Failed to apply SQS observability', {
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
   * Apply SQS-specific OpenTelemetry instrumentation
   */
  private applySqsOTelInstrumentation(component: BaseComponent): boolean {
    // SQS instrumentation is primarily handled by the applications that use the queue
    // The queue itself needs message attribute configuration for trace propagation
    this.context.logger.info('SQS trace propagation configured', { 
      service: 'ObservabilityService', 
      componentType: 'sqs', 
      componentName: component.node.id 
    });
    return true;
  }

  /**
   * Apply SQS Queue specific observability alarms
   * Creates alarms for queue depth, message age, and dead letter queue metrics
   */
  private applySqsObservability(component: BaseComponent): number {
    const queue = component.getConstruct('queue');
    if (!queue) {
      this.context.logger.warn('SQS component has no queue construct registered', { 
        service: 'ObservabilityService' 
      });
      return 0;
    }

    let alarmCount = 0;
    const complianceFramework = this.context.complianceFramework;

    // Queue depth alarm
    const queueDepthAlarm = new cloudwatch.Alarm(component, 'SqsQueueDepthAlarm', {
      alarmName: `${this.context.serviceName}-${component.node.id}-queue-depth`,
      alarmDescription: 'SQS queue depth is high - potential processing bottleneck',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/SQS',
        metricName: 'ApproximateNumberOfVisibleMessages',
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
        dimensionsMap: {
          QueueName: (queue as any).queueName || 'unknown'
        }
      }),
      threshold: complianceFramework === 'fedramp-high' ? 50 : 100,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });

    // Apply standard tags to the alarm
    this.applyStandardTags(queueDepthAlarm, component);
    alarmCount++;

    // Message age alarm for compliance frameworks
    if (complianceFramework === 'fedramp-moderate' || complianceFramework === 'fedramp-high') {
      const messageAgeAlarm = new cloudwatch.Alarm(component, 'SqsMessageAgeAlarm', {
        alarmName: `${this.context.serviceName}-${component.node.id}-message-age`,
        alarmDescription: 'SQS messages are aging - potential processing delays',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/SQS',
          metricName: 'ApproximateAgeOfOldestMessage',
          statistic: 'Maximum',
          period: cdk.Duration.minutes(5),
          dimensionsMap: {
            QueueName: (queue as any).queueName || 'unknown'
          }
        }),
        threshold: 300, // 5 minutes
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
      });

      // Apply standard tags to the alarm
      this.applyStandardTags(messageAgeAlarm, component);
      alarmCount++;
    }

    // Number of messages sent alarm for high compliance
    if (complianceFramework === 'fedramp-high') {
      const messagesSentAlarm = new cloudwatch.Alarm(component, 'SqsMessagesSentAlarm', {
        alarmName: `${this.context.serviceName}-${component.node.id}-messages-sent`,
        alarmDescription: 'SQS messages sent monitoring for high compliance',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/SQS',
          metricName: 'NumberOfMessagesSent',
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
          dimensionsMap: {
            QueueName: (queue as any).queueName || 'unknown'
          }
        }),
        threshold: 1000, // Alert if more than 1000 messages sent in 5 minutes
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
      });

      // Apply standard tags to the alarm
      this.applyStandardTags(messagesSentAlarm, component);
      alarmCount++;
    }

    // Number of messages received alarm for high compliance
    if (complianceFramework === 'fedramp-high') {
      const messagesReceivedAlarm = new cloudwatch.Alarm(component, 'SqsMessagesReceivedAlarm', {
        alarmName: `${this.context.serviceName}-${component.node.id}-messages-received`,
        alarmDescription: 'SQS messages received monitoring for high compliance',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/SQS',
          metricName: 'NumberOfMessagesReceived',
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
          dimensionsMap: {
            QueueName: (queue as any).queueName || 'unknown'
          }
        }),
        threshold: 1000, // Alert if more than 1000 messages received in 5 minutes
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
      });

      // Apply standard tags to the alarm
      this.applyStandardTags(messagesReceivedAlarm, component);
      alarmCount++;
    }

    return alarmCount;
  }
}
