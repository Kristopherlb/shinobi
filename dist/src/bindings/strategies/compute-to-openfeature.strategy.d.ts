/**
 * Compute to OpenFeature Binding Strategy
 * Handles binding compute components (Lambda) to OpenFeature providers
 * Implements Platform Feature Flagging & Canary Deployment Standard v1.0
 */
import { BindingContext, StructuredLogger } from '@platform/contracts';
export interface ComputeToOpenFeatureStrategyDependencies {
    logger: StructuredLogger;
}
/**
 * Strategy for binding compute components to OpenFeature providers
 * Configures environment variables for OpenFeature SDK auto-configuration
 */
export declare class ComputeToOpenFeatureStrategy {
    private dependencies;
    constructor(dependencies: ComputeToOpenFeatureStrategyDependencies);
    /**
     * Check if this strategy can handle the given binding
     */
    canHandle(context: BindingContext): boolean;
    /**
     * Apply the binding between compute component and OpenFeature provider
     */
    apply(context: BindingContext): Promise<void>;
    /**
     * Configure IAM permissions based on provider type
     */
    private configureProviderAccess;
    /**
     * Configure AWS AppConfig access permissions
     */
    private configureAppConfigAccess;
    /**
     * Get AppConfig actions based on access level
     */
    private getAppConfigActions;
    /**
     * Set environment variables for OpenFeature SDK auto-configuration
     */
    private setOpenFeatureEnvironmentVariables;
    /**
     * Configure observability for feature flag usage
     */
    private configureFeatureFlagObservability;
    /**
     * Check if a component is a compute component
     */
    private isComputeComponent;
    /**
     * Check if component has OpenFeature capability
     */
    private hasOpenFeatureCapability;
    /**
     * Extract compute function from component
     */
    private extractComputeFunction;
    /**
     * Get OpenFeature provider capability data
     */
    private getProviderCapability;
    /**
     * Add environment variables to compute function
     */
    private addEnvironmentVariables;
}
