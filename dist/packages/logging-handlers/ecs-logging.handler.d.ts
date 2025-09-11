/**
 * ECS Logging Handler
 *
 * Implements logging infrastructure for ECS services according to
 * Platform Structured Logging Standard v1.0.
 *
 * Features:
 * - Configures CloudWatch Log Groups for ECS container logs
 * - Sets up structured logging with JSON format
 * - Implements compliance-aware retention policies
 * - Configures log drivers with security classification
 * - Supports both Fargate and EC2 service types
 */
import { IComponent } from '../../src/platform/contracts/component-interfaces';
import { PlatformServiceContext } from '../../src/platform/contracts/platform-services';
import { ILoggingHandler, LoggingHandlerResult } from '../../src/platform/contracts/logging-interfaces';
import { LoggingService } from '../logging-service/infrastructure-logging.service';
/**
 * Logging handler for ECS services
 * Supports: ecs-fargate-service, ecs-ec2-service, ecs-cluster
 */
export declare class EcsLoggingHandler implements ILoggingHandler {
    readonly componentType = "ecs-fargate-service";
    private readonly loggingService;
    constructor(loggingService: LoggingService);
    /**
     * Apply comprehensive logging infrastructure to ECS services
     */
    apply(component: IComponent, context: PlatformServiceContext): LoggingHandlerResult;
    /**
     * Apply logging configuration to ECS services (Fargate/EC2)
     */
    private applyServiceLogging;
    /**
     * Apply logging configuration to ECS clusters
     */
    private applyClusterLogging;
    /**
     * Create CloudWatch Log Group for ECS components
     */
    private createEcsLogGroup;
    /**
     * Configure log driver for all containers in task definition
     */
    private configureContainerLogging;
    /**
     * Generate platform logger configuration for ECS containers
     */
    private generateEcsLoggerConfig;
    /**
     * Inject structured logging environment variables into task definition
     */
    private injectLoggingEnvironment;
    /**
     * Get container count from task definition (helper method)
     */
    private getContainerCount;
    /**
     * Map retention days to CloudWatch enum
     */
    private mapRetentionToEnum;
}
