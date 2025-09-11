/**
 * S3 Logging Handler
 *
 * Implements logging infrastructure for S3 buckets according to
 * Platform Structured Logging Standard v1.0.
 *
 * Features:
 * - Configures S3 access logging
 * - Sets up CloudTrail for API-level logging
 * - Implements compliance-aware log retention
 * - Configures server access logs with structured format
 */
import { IComponent } from '../../src/platform/contracts/component-interfaces';
import { PlatformServiceContext } from '../../src/platform/contracts/platform-services';
import { ILoggingHandler, LoggingHandlerResult } from '../../src/platform/contracts/logging-interfaces';
import { LoggingService } from '../logging-service/infrastructure-logging.service';
/**
 * Logging handler for S3 buckets
 * Configures access logging and CloudTrail integration
 */
export declare class S3LoggingHandler implements ILoggingHandler {
    readonly componentType = "s3-bucket";
    private readonly loggingService;
    constructor(loggingService: LoggingService);
    /**
     * Apply S3 logging configuration with compliance-aware settings
     */
    apply(component: IComponent, context: PlatformServiceContext): LoggingHandlerResult;
    /**
     * Create dedicated bucket for S3 access logs
     */
    private createAccessLogsBucket;
    /**
     * Configure server access logging for the main bucket
     */
    private configureServerAccessLogging;
    /**
     * Create CloudWatch Log Group for S3 CloudTrail integration
     */
    private createS3LogGroup;
    /**
     * Get appropriate bucket encryption based on compliance framework
     */
    private getBucketEncryption;
    /**
     * Determine security classification for S3 logs
     */
    private determineSecurityClassification;
    /**
     * Get log retention days based on compliance framework
     */
    private getRetentionDays;
    /**
     * Map retention days to CloudWatch enum
     */
    private mapRetentionToEnum;
}
