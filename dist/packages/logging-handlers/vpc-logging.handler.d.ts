/**
 * VPC Logging Handler
 *
 * Implements logging infrastructure for VPC Flow Logs according to
 * Platform Structured Logging Standard v1.0.
 *
 * Features:
 * - Configures VPC Flow Logs to CloudWatch
 * - Sets up compliance-aware log retention for network traffic
 * - Implements security monitoring for network anomalies
 * - Configures log format for structured analysis
 */
import { IComponent } from '../../src/platform/contracts/component-interfaces';
import { PlatformServiceContext } from '../../src/platform/contracts/platform-services';
import { ILoggingHandler, LoggingHandlerResult } from '../../src/platform/contracts/logging-interfaces';
import { LoggingService } from '../logging-service/infrastructure-logging.service';
/**
 * Logging handler for VPC components
 * Configures VPC Flow Logs for network traffic monitoring and security analysis
 */
export declare class VpcLoggingHandler implements ILoggingHandler {
    readonly componentType = "vpc";
    private readonly loggingService;
    constructor(loggingService: LoggingService);
    /**
     * Apply VPC Flow Logs configuration with compliance-aware settings
     */
    apply(component: IComponent, context: PlatformServiceContext): LoggingHandlerResult;
    /**
     * Create CloudWatch Log Group for VPC Flow Logs
     */
    private createVpcFlowLogGroup;
    /**
     * Create IAM role for VPC Flow Logs to write to CloudWatch
     */
    private createFlowLogRole;
    /**
     * Configure VPC Flow Logs with structured format
     */
    private configureVpcFlowLogs;
    /**
     * Apply security monitoring configuration
     */
    private applySecurityMonitoring;
    /**
     * Get structured log format based on compliance requirements
     */
    private getStructuredLogFormatFields;
    /**
     * Determine security classification for VPC logs
     */
    private determineSecurityClassification;
    /**
     * Map retention days to CloudWatch enum
     */
    private mapRetentionToEnum;
}
