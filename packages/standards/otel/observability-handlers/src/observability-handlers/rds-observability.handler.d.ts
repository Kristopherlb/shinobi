/**
 * RDS Observability Handler
 *
 * Implements OpenTelemetry instrumentation and CloudWatch alarms for RDS components.
 * Provides comprehensive database monitoring including CPU, connections, and performance insights.
 */
import { BaseComponent } from '@shinobi/core';
import { IObservabilityHandler, ObservabilityHandlerResult, ObservabilityConfig } from './observability-handler.interface.ts';
import { ITaggingService } from '@shinobi/standards-tagging';
import { PlatformServiceContext } from '@shinobi/core/platform-services';
/**
 * Handler for RDS component observability
 */
export declare class RdsObservabilityHandler implements IObservabilityHandler {
    readonly supportedComponentType = "rds-postgres";
    private context;
    private taggingService;
    constructor(context: PlatformServiceContext, taggingService?: ITaggingService);
    /**
     * Apply standard tags to a resource
     */
    private applyStandardTags;
    /**
     * Apply OpenTelemetry instrumentation and CloudWatch alarms to RDS components
     */
    apply(component: BaseComponent, config: ObservabilityConfig): ObservabilityHandlerResult;
    /**
     * Apply RDS-specific OpenTelemetry instrumentation
     * Implements Platform OpenTelemetry Observability Standard v1.0 Section 5.2
     */
    private applyRdsOTelInstrumentation;
    /**
     * Apply RDS specific observability alarms
     */
    private applyRdsObservability;
}
//# sourceMappingURL=rds-observability.handler.d.ts.map