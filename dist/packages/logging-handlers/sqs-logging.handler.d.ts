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
import { IComponent } from '../../src/platform/contracts/component-interfaces';
import { PlatformServiceContext } from '../../src/platform/contracts/platform-services';
import { ILoggingHandler, LoggingHandlerResult } from '../../src/platform/contracts/logging-interfaces';
import { LoggingService } from '../logging-service/infrastructure-logging.service';
/**
 * Logging handler for SQS queues
 * Configures message queue logging and CloudTrail integration
 */
export declare class SqsLoggingHandler implements ILoggingHandler {
    readonly componentType = "sqs-queue";
    private readonly loggingService;
    constructor(loggingService: LoggingService);
    /**
     * Apply SQS logging configuration with compliance-aware settings
     */
    apply(component: IComponent, context: PlatformServiceContext): LoggingHandlerResult;
    /**
     * Create CloudWatch Log Group for SQS API operations
     */
    private createSqsLogGroup;
    /**
     * Configure CloudTrail logging for SQS API operations
     */
    private configureCloudTrailLogging;
    /**
     * Configure message-level audit logging for compliance frameworks
     */
    private configureMessageAuditLogging;
    /**
     * Configure dead letter queue monitoring
     */
    private configureDlqMonitoring;
    /**
     * Get API operations to track based on compliance framework
     */
    private getTrackedApiOperations;
    /**
     * Determine security classification for SQS logs
     */
    private determineSecurityClassification;
    /**
     * Map retention days to CloudWatch enum
     */
    private mapRetentionToEnum;
}
