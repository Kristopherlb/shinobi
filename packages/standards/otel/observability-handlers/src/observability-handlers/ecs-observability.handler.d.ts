/**
 * ECS Observability Handler
 *
 * Implements OpenTelemetry instrumentation and CloudWatch alarms for ECS components.
 * Handles both ECS clusters and ECS services (Fargate and EC2).
 */
import { BaseComponent } from '@shinobi/core';
import { IObservabilityHandler, ObservabilityHandlerResult, ObservabilityConfig } from './observability-handler.interface';
import { ITaggingService } from '@shinobi/standards-tagging';
import { PlatformServiceContext } from '@shinobi/core/platform-services';
/**
 * Handler for ECS component observability
 */
export declare class EcsObservabilityHandler implements IObservabilityHandler {
    readonly supportedComponentType = "ecs";
    private context;
    private taggingService;
    constructor(context: PlatformServiceContext, taggingService?: ITaggingService);
    /**
     * Apply standard tags to a resource
     */
    private applyStandardTags;
    /**
     * Apply OpenTelemetry instrumentation and CloudWatch alarms to ECS components
     */
    apply(component: BaseComponent, config: ObservabilityConfig): ObservabilityHandlerResult;
    /**
     * Apply ECS Service OpenTelemetry instrumentation
     * Configures container-level OTel environment variables and monitoring
     */
    private applyEcsServiceOTelInstrumentation;
    /**
     * Apply ECS Cluster specific observability
     * Creates alarms for cluster capacity and resource utilization
     */
    private applyEcsClusterObservability;
    /**
     * Apply ECS Service specific observability
     * Creates alarms for service health, scaling, and performance
     */
    private applyEcsServiceObservability;
    /**
     * Build standard OpenTelemetry environment variables
     */
    private buildOTelEnvironmentVariables;
    /**
     * Get OpenTelemetry authentication token for the compliance framework
     */
    private getOtelAuthToken;
}
//# sourceMappingURL=ecs-observability.handler.d.ts.map