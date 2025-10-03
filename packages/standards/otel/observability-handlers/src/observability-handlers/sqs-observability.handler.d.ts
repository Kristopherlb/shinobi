/**
 * SQS Observability Handler
 *
 * Implements OpenTelemetry instrumentation and CloudWatch alarms for SQS components.
 * Provides comprehensive queue monitoring including depth, message age, and dead letter queue metrics.
 */
import { BaseComponent } from '@shinobi/core';
import { IObservabilityHandler, ObservabilityHandlerResult, ObservabilityConfig } from './observability-handler.interface.ts';
import { ITaggingService } from '@shinobi/standards-tagging';
import { PlatformServiceContext } from '@shinobi/core/platform-services';
/**
 * Handler for SQS component observability
 */
export declare class SqsObservabilityHandler implements IObservabilityHandler {
    readonly supportedComponentType = "sqs-queue";
    private context;
    private taggingService;
    constructor(context: PlatformServiceContext, taggingService?: ITaggingService);
    /**
     * Apply standard tags to a resource
     */
    private applyStandardTags;
    /**
     * Apply OpenTelemetry instrumentation and CloudWatch alarms to SQS components
     */
    apply(component: BaseComponent, config: ObservabilityConfig): ObservabilityHandlerResult;
    /**
     * Apply SQS-specific OpenTelemetry instrumentation
     */
    private applySqsOTelInstrumentation;
    /**
     * Apply SQS Queue specific observability alarms
     * Creates alarms for queue depth, message age, and dead letter queue metrics
     */
    private applySqsObservability;
}
//# sourceMappingURL=sqs-observability.handler.d.ts.map