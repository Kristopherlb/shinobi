/**
 * VPC Observability Handler
 *
 * Implements CloudWatch alarms for VPC components, focusing on NAT Gateway monitoring
 * for compliance frameworks that require enhanced network observability.
 */
import { BaseComponent } from '@shinobi/core';
import { IObservabilityHandler, ObservabilityHandlerResult, ObservabilityConfig } from './observability-handler.interface';
import { ITaggingService } from '@shinobi/standards-tagging';
import { PlatformServiceContext } from '@shinobi/core/platform-services';
/**
 * Handler for VPC component observability
 */
export declare class VpcObservabilityHandler implements IObservabilityHandler {
    readonly supportedComponentType = "vpc";
    private context;
    private taggingService;
    constructor(context: PlatformServiceContext, taggingService?: ITaggingService);
    /**
     * Apply standard tags to a resource
     */
    private applyStandardTags;
    /**
     * Apply CloudWatch alarms to VPC components
     */
    apply(component: BaseComponent, config: ObservabilityConfig): ObservabilityHandlerResult;
    /**
     * Apply VPC-specific observability (NAT Gateway alarms)
     */
    private applyVpcObservability;
    /**
     * Create NAT Gateway specific alarms
     */
    private createNatGatewayAlarms;
}
//# sourceMappingURL=vpc-observability.handler.d.ts.map