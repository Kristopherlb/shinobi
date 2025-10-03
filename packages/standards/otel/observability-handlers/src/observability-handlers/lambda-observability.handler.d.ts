/**
 * Lambda Observability Handler
 *
 * Implements OpenTelemetry instrumentation and CloudWatch alarms for Lambda components.
 * Handles both lambda-api and lambda-worker component types.
 */
import { BaseComponent } from '@shinobi/core';
import { IObservabilityHandler, ObservabilityHandlerResult, ObservabilityConfig } from './observability-handler.interface.ts';
import { PlatformServiceContext } from '@shinobi/core/platform-services';
import { ITaggingService } from '@shinobi/standards-tagging';
/**
 * Handler for Lambda component observability
 */
export declare class LambdaObservabilityHandler implements IObservabilityHandler {
    readonly supportedComponentType = "lambda";
    private context;
    private taggingService;
    constructor(context: PlatformServiceContext, taggingService?: ITaggingService);
    /**
     * Apply standard tags to a resource
     */
    private applyStandardTags;
    /**
     * Apply OpenTelemetry instrumentation and CloudWatch alarms to Lambda components
     */
    apply(component: BaseComponent, config: ObservabilityConfig): ObservabilityHandlerResult;
    /**
     * Apply Lambda-specific OpenTelemetry instrumentation
     * Implements Platform OpenTelemetry Observability Standard v1.0 Section 5.1
     */
    private applyLambdaOTelInstrumentation;
    /**
     * Apply Lambda specific observability alarms
     */
    private applyLambdaObservability;
    /**
     * Build standard OpenTelemetry environment variables from config template
     */
    private buildOTelEnvironmentVariables;
    /**
     * Get OpenTelemetry authentication token for the compliance framework
     */
    private getOtelAuthToken;
    /**
     * Get OpenTelemetry Lambda layer ARN based on runtime
     */
    private getOTelLambdaLayerArn;
    private getTelemetry;
}
//# sourceMappingURL=lambda-observability.handler.d.ts.map