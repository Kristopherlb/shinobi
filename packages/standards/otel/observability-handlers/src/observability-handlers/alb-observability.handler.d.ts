/**
 * Application Load Balancer Observability Handler
 *
 * Implements CloudWatch alarms for ALB components, providing comprehensive
 * monitoring for response time, unhealthy targets, and HTTP errors.
 */
import { BaseComponent } from '@shinobi/core';
import { IObservabilityHandler, ObservabilityHandlerResult, ObservabilityConfig } from './observability-handler.interface';
import { ITaggingService } from '@shinobi/standards-tagging';
import { PlatformServiceContext } from '@shinobi/core/platform-services';
/**
 * Handler for Application Load Balancer component observability
 */
export declare class AlbObservabilityHandler implements IObservabilityHandler {
    readonly supportedComponentType = "application-load-balancer";
    private context;
    private taggingService;
    constructor(context: PlatformServiceContext, taggingService?: ITaggingService);
    /**
     * Apply standard tags to a resource
     */
    private applyStandardTags;
    /**
     * Apply CloudWatch alarms to ALB components
     */
    apply(component: BaseComponent, config: ObservabilityConfig): ObservabilityHandlerResult;
    /**
     * Apply Application Load Balancer specific observability
     * Creates alarms for response time, unhealthy targets, and HTTP errors
     */
    private applyAlbObservability;
}
//# sourceMappingURL=alb-observability.handler.d.ts.map