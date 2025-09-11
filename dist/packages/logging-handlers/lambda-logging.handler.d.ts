/**
 * Lambda Logging Handler
 *
 * Implements logging infrastructure for Lambda functions according to
 * Platform Structured Logging Standard v1.0.
 *
 * Features:
 * - Creates dedicated CloudWatch Log Groups for Lambda functions
 * - Configures compliance-aware log retention
 * - Sets up structured logging environment variables
 * - Implements automatic PII redaction based on compliance framework
 */
import { IComponent } from '../../src/platform/contracts/component-interfaces';
import { PlatformServiceContext } from '../../src/platform/contracts/platform-services';
import { ILoggingHandler, LoggingHandlerResult } from '../../src/platform/contracts/logging-interfaces';
import { LoggingService } from '../logging-service/infrastructure-logging.service';
/**
 * Logging handler for Lambda functions
 * Supports: lambda-api, lambda-worker, lambda-scheduled
 */
export declare class LambdaLoggingHandler implements ILoggingHandler {
    readonly componentType = "lambda-api";
    private readonly loggingService;
    constructor(loggingService: LoggingService);
    /**
     * Apply comprehensive logging infrastructure to a Lambda function
     */
    apply(component: IComponent, context: PlatformServiceContext): LoggingHandlerResult;
    /**
     * Create CloudWatch Log Group for Lambda function
     */
    private createLambdaLogGroup;
    /**
     * Configure IAM permissions for Lambda to write to CloudWatch Logs
     */
    private configureLambdaLogPermissions;
    /**
     * Generate platform logger configuration for Lambda
     */
    private generateLambdaLoggerConfig;
    /**
     * Inject structured logging environment variables into Lambda
     */
    private injectLoggingEnvironment;
    /**
     * Map retention days to CloudWatch enum
     */
    private mapRetentionToEnum;
}
