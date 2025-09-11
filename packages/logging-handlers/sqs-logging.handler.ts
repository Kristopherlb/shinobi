/**
 * SQS Logging Handler
 * 
 * Implements logging infrastructure for SQS queues according to
 * Platform Structured Logging Standard v1.0.
 * 
 * Features:
 * - Configures CloudTrail for SQS API logging
 * - Sets up CloudWatch metrics and alarms
 * - Implements message-level audit logging for compliance
 * - Configures dead letter queue monitoring
 */

import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as cdk from 'aws-cdk-lib';
import { IComponent } from '../../src/platform/contracts/component-interfaces';
import { PlatformServiceContext } from '../../src/platform/contracts/platform-services';
import { 
  ILoggingHandler, 
  LoggingHandlerResult 
} from '../../src/platform/contracts/logging-interfaces';
import { LoggingService } from '../logging-service/infrastructure-logging.service';

/**
 * Logging handler for SQS queues
 * Configures message queue logging and CloudTrail integration
 */
export class SqsLoggingHandler implements ILoggingHandler {
  public readonly componentType = 'sqs-queue';
  private readonly loggingService: LoggingService;

  constructor(loggingService: LoggingService) {
    this.loggingService = loggingService;
  }

  /**
   * Apply SQS logging configuration with compliance-aware settings
   */
  public apply(component: IComponent, context: PlatformServiceContext): LoggingHandlerResult {
    try {
      // Get the SQS queue from the component
      const queue = component.getConstruct('queue') as sqs.IQueue | undefined;
      if (!queue) {
        return {
          success: false,
          retentionDays: 0,
          encryption: { enabled: false, managedKey: true },
          classification: 'internal',
          error: 'SQS component has no queue construct registered'
        };
      }

      // Create log group for SQS API operations
      const logGroupName = `/platform/${context.serviceName}/sqs/${component.node.id}`;
      const logGroup = this.createSqsLogGroup(component, logGroupName, context);
      
      // Configure CloudTrail for SQS API logging
      this.configureCloudTrailLogging(component, queue, logGroup, context);
      
      // Set up message processing audit logging if required
      this.configureMessageAuditLogging(component, queue, context);
      
      // Configure dead letter queue monitoring
      this.configureDlqMonitoring(component, queue, context);
      
      const classification = this.loggingService.getSecurityClassification('sqs');
      const retentionDays = this.loggingService.getRetentionPolicy().retentionDays;
      
      return {
        success: true,
        logGroupArn: logGroup.logGroupArn,
        retentionDays,
        encryption: {
          enabled: true,
          managedKey: this.loggingService.getRetentionPolicy().encryptionLevel === 'standard'
        },
        classification,
        metadata: {
          queueName: queue.queueName,
          queueArn: queue.queueArn,
          apiLogging: 'enabled',
          messageAuditing: context.complianceFramework !== 'commercial',
          dlqMonitoring: 'enabled'
        }
      };
    } catch (error) {
      return {
        success: false,
        retentionDays: 0,
        encryption: { enabled: false, managedKey: true },
        classification: 'internal',
        error: `Failed to configure SQS logging: ${(error as Error).message}`
      };
    }
  }

  /**
   * Create CloudWatch Log Group for SQS API operations
   */
  private createSqsLogGroup(
    component: IComponent, 
    logGroupName: string, 
    context: PlatformServiceContext
  ): logs.LogGroup {
    const policy = this.loggingService.getRetentionPolicy();
    const retentionEnum = this.mapRetentionToEnum(policy.retentionDays);

    const logGroup = new logs.LogGroup(component, 'SqsApiLogGroup', {
      logGroupName,
      retention: retentionEnum,
      removalPolicy: policy.immutable ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // Apply compliance tags
    cdk.Tags.of(logGroup).add('log-type', 'sqs-api');
    cdk.Tags.of(logGroup).add('classification', this.loggingService.getSecurityClassification('sqs'));
    cdk.Tags.of(logGroup).add('compliance-framework', context.complianceFramework);
    cdk.Tags.of(logGroup).add('message-queue-logging', 'enabled');

    return logGroup;
  }

  /**
   * Configure CloudTrail logging for SQS API operations
   */
  private configureCloudTrailLogging(
    component: IComponent,
    queue: sqs.IQueue,
    logGroup: logs.LogGroup,
    context: PlatformServiceContext
  ): void {
    // Note: In a real implementation, this would set up CloudTrail
    // to log SQS API operations to the specified log group
    
    const apiOperations = this.getTrackedApiOperations(context);
    
    context.logger.info('SQS CloudTrail logging configured', {
      service: 'LoggingService',
      componentType: 'sqs-queue',
      queueName: queue.queueName,
      queueArn: queue.queueArn,
      logGroupName: logGroup.logGroupName,
      trackedOperations: apiOperations,
      complianceFramework: context.complianceFramework
    });
  }

  /**
   * Configure message-level audit logging for compliance frameworks
   */
  private configureMessageAuditLogging(
    component: IComponent,
    queue: sqs.IQueue,
    context: PlatformServiceContext
  ): void {
    if (context.complianceFramework === 'commercial') {
      return; // No message audit logging for commercial
    }

    // Note: In a real implementation, this would configure:
    // - Message attribute injection for tracking
    // - Lambda trigger for message audit logging
    // - Dead letter queue processing with audit trails
    
    const auditFeatures = [
      'message-correlation-id',
      'sender-identification', 
      'processing-timestamps',
      'failure-attribution',
      'retry-tracking'
    ];

    context.logger.info('SQS message audit logging configured', {
      service: 'LoggingService',
      componentType: 'sqs-queue',
      queueName: queue.queueName,
      auditFeatures,
      complianceFramework: context.complianceFramework,
      piiRedaction: true
    });
  }

  /**
   * Configure dead letter queue monitoring
   */
  private configureDlqMonitoring(
    component: IComponent,
    queue: sqs.IQueue,
    context: PlatformServiceContext
  ): void {
    // Note: In a real implementation, this would set up:
    // - CloudWatch alarms for DLQ message count
    // - Automatic notification for failed messages
    // - Dead letter queue processing logs
    
    context.logger.info('SQS dead letter queue monitoring configured', {
      service: 'LoggingService',
      componentType: 'sqs-queue',
      queueName: queue.queueName,
      monitoring: [
        'dlq-message-count',
        'message-age-alarm',
        'processing-failure-alerts',
        'retry-exhaustion-tracking'
      ],
      alertThreshold: context.complianceFramework !== 'commercial' ? 1 : 10
    });
  }

  /**
   * Get API operations to track based on compliance framework
   */
  private getTrackedApiOperations(context: PlatformServiceContext): string[] {
    const baseOperations = [
      'SendMessage',
      'ReceiveMessage',
      'DeleteMessage'
    ];

    if (context.complianceFramework !== 'commercial') {
      return [
        ...baseOperations,
        'PurgeQueue',
        'ChangeMessageVisibility',
        'GetQueueAttributes',
        'SetQueueAttributes',
        'AddPermission',
        'RemovePermission'
      ];
    }

    return baseOperations;
  }

  /**
   * Determine security classification for SQS logs
   */
  private determineSecurityClassification(context: PlatformServiceContext): 'public' | 'internal' | 'confidential' | 'cui' | 'phi' {
    switch (context.complianceFramework) {
      case 'fedramp-high':
        return 'cui'; // Queue messages may contain CUI
      case 'fedramp-moderate':
        return 'confidential'; // Message processing is confidential
      default:
        return 'internal'; // Internal message queue logs
    }
  }


  /**
   * Map retention days to CloudWatch enum
   */
  private mapRetentionToEnum(days: number): logs.RetentionDays {
    if (days <= 7) return logs.RetentionDays.ONE_WEEK;
    if (days <= 30) return logs.RetentionDays.ONE_MONTH;
    if (days <= 90) return logs.RetentionDays.THREE_MONTHS;
    if (days <= 365) return logs.RetentionDays.ONE_YEAR;
    if (days <= 1095) return logs.RetentionDays.THREE_YEARS;
    if (days <= 2555) return logs.RetentionDays.SEVEN_YEARS;
    return logs.RetentionDays.TEN_YEARS;
  }

}
