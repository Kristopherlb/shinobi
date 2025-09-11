/**
 * RDS Logging Handler
 *
 * Implements logging infrastructure for RDS instances according to
 * Platform Structured Logging Standard v1.0.
 *
 * Features:
 * - Configures RDS log exports to CloudWatch
 * - Sets up compliance-aware log retention
 * - Configures audit logging for database operations
 * - Implements security monitoring for database access
 */
import { IComponent } from '../../src/platform/contracts/component-interfaces';
import { PlatformServiceContext } from '../../src/platform/contracts/platform-services';
import { ILoggingHandler, LoggingHandlerResult } from '../../src/platform/contracts/logging-interfaces';
import { LoggingService } from '../logging-service/infrastructure-logging.service';
/**
 * Logging handler for RDS instances
 * Configures database logging and CloudWatch integration
 */
export declare class RdsLoggingHandler implements ILoggingHandler {
    readonly componentType = "rds-database";
    private readonly loggingService;
    constructor(loggingService: LoggingService);
    /**
     * Apply RDS logging configuration with compliance-aware settings
     */
    apply(component: IComponent, context: PlatformServiceContext): LoggingHandlerResult;
    /**
     * Create CloudWatch Log Groups for different RDS log types
     */
    private createRdsLogGroups;
    /**
     * Configure RDS log exports to CloudWatch
     */
    private configureRdsLogExports;
    /**
     * Configure audit logging for compliance frameworks
     */
    private configureAuditLogging;
    /**
     * Get enabled log types based on compliance framework
     */
    private getEnabledLogTypes;
    /**
     * Map retention days to CloudWatch enum
     */
    private mapRetentionToEnum;
}
