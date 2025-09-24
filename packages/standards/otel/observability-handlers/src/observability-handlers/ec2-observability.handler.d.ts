/**
 * EC2 Observability Handler
 *
 * Implements OpenTelemetry instrumentation and CloudWatch alarms for EC2 components.
 * Provides comprehensive instance monitoring including status checks and performance metrics.
 */
import { BaseComponent } from '@shinobi/core';
import { IObservabilityHandler, ObservabilityHandlerResult, ObservabilityConfig } from './observability-handler.interface';
import { ITaggingService } from '@shinobi/standards-tagging';
import { PlatformServiceContext } from '@shinobi/core';
/**
 * Handler for EC2 component observability
 */
export declare class Ec2ObservabilityHandler implements IObservabilityHandler {
    readonly supportedComponentType = "ec2-instance";
    private context;
    private taggingService;
    constructor(context: PlatformServiceContext, taggingService?: ITaggingService);
    /**
     * Apply standard tags to a resource
     */
    private applyStandardTags;
    /**
     * Apply OpenTelemetry instrumentation and CloudWatch alarms to EC2 components
     */
    apply(component: BaseComponent, config: ObservabilityConfig): ObservabilityHandlerResult;
    /**
     * Apply EC2-specific OpenTelemetry instrumentation
     * Implements Platform OpenTelemetry Observability Standard v1.0 Section 5.4
     */
    private applyEc2OTelInstrumentation;
    /**
     * Apply EC2 Instance specific observability alarms
     */
    private applyEc2InstanceObservability;
    /**
     * Build standard OpenTelemetry environment variables from config template
     */
    private buildOTelEnvironmentVariables;
    /**
     * Get OpenTelemetry authentication token for the compliance framework
     */
    private getOtelAuthToken;
}
//# sourceMappingURL=ec2-observability.handler.d.ts.map