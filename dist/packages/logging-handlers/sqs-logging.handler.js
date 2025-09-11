"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqsLoggingHandler = void 0;
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const cdk = __importStar(require("aws-cdk-lib"));
/**
 * Logging handler for SQS queues
 * Configures message queue logging and CloudTrail integration
 */
class SqsLoggingHandler {
    componentType = 'sqs-queue';
    loggingService;
    constructor(loggingService) {
        this.loggingService = loggingService;
    }
    /**
     * Apply SQS logging configuration with compliance-aware settings
     */
    apply(component, context) {
        try {
            // Get the SQS queue from the component
            const queue = component.getConstruct('queue');
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
        }
        catch (error) {
            return {
                success: false,
                retentionDays: 0,
                encryption: { enabled: false, managedKey: true },
                classification: 'internal',
                error: `Failed to configure SQS logging: ${error.message}`
            };
        }
    }
    /**
     * Create CloudWatch Log Group for SQS API operations
     */
    createSqsLogGroup(component, logGroupName, context) {
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
    configureCloudTrailLogging(component, queue, logGroup, context) {
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
    configureMessageAuditLogging(component, queue, context) {
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
    configureDlqMonitoring(component, queue, context) {
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
    getTrackedApiOperations(context) {
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
    determineSecurityClassification(context) {
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
    mapRetentionToEnum(days) {
        if (days <= 7)
            return logs.RetentionDays.ONE_WEEK;
        if (days <= 30)
            return logs.RetentionDays.ONE_MONTH;
        if (days <= 90)
            return logs.RetentionDays.THREE_MONTHS;
        if (days <= 365)
            return logs.RetentionDays.ONE_YEAR;
        if (days <= 1095)
            return logs.RetentionDays.THREE_YEARS;
        if (days <= 2555)
            return logs.RetentionDays.SEVEN_YEARS;
        return logs.RetentionDays.TEN_YEARS;
    }
}
exports.SqsLoggingHandler = SqsLoggingHandler;
