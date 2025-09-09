/**
 * LocalStack Environment Component
 *
 * A special, non-deployable component that configures ephemeral local development environments.
 * This component is only used to configure the 'svc local up' command and does not create
 * any AWS resources during deployment.
 */
import { Construct } from 'constructs';
import { BaseComponent, ComponentSpec, ComponentContext, ComponentCapabilities, ComponentConfigSchema, ConfigBuilder } from '@platform/contracts';
/**
 * Configuration interface for LocalStack environment
 */
export interface LocalStackEnvironmentConfig {
    /** AWS services to emulate in LocalStack */
    services: string[];
    /** LocalStack configuration options */
    localstack?: {
        /** Use LocalStack Pro features (default: false) */
        pro?: boolean;
        /** Custom LocalStack image tag */
        tag?: string;
        /** Additional environment variables */
        environment?: Record<string, string>;
        /** Custom port mappings */
        ports?: Record<string, number>;
    };
    /** Docker Compose configuration */
    docker?: {
        /** Custom network name */
        network?: string;
        /** Custom container name */
        containerName?: string;
        /** Resource limits */
        resources?: {
            memory?: string;
            cpus?: string;
        };
    };
}
/**
 * Configuration schema for LocalStack environment
 */
export declare const LOCALSTACK_ENVIRONMENT_CONFIG_SCHEMA: ComponentConfigSchema;
/**
 * Configuration builder for LocalStack environment
 */
export declare class LocalStackEnvironmentConfigBuilder extends ConfigBuilder<LocalStackEnvironmentConfig> {
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Builds the final configuration using the centralized 5-layer precedence engine
     */
    build(): Promise<LocalStackEnvironmentConfig>;
    /**
     * Provide component-specific hardcoded fallbacks (Layer 1: Lowest Priority)
     */
    protected getHardcodedFallbacks(): Record<string, any>;
}
/**
 * LocalStack Environment Component
 *
 * This is a special component that does not create AWS resources.
 * Instead, it provides configuration for the local development environment.
 */
export declare class LocalStackEnvironmentComponent extends BaseComponent {
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - This component does not create resources
     */
    synth(): void;
    /**
     * Get the capabilities this component provides
     */
    getCapabilities(): ComponentCapabilities;
    /**
     * Get the component type identifier
     */
    getType(): string;
    /**
     * Get the LocalStack configuration for CLI use
     */
    getLocalStackConfig(): LocalStackEnvironmentConfig;
    /**
     * Check if this component should be deployed (it shouldn't)
     */
    isDeployable(): boolean;
    /**
     * Apply standard platform tags (Not applicable for non-deployable components)
     * This method is provided for consistency with Platform Tagging Standard
     */
    protected applyStandardTags(): void;
    /**
     * Configure observability (Not applicable for non-deployable components)
     * This method is provided for consistency with Platform Observability Standard
     */
    protected configureLocalStackObservability(): void;
    /**
     * Configure feature flags and deployment strategies (Limited applicability for development tools)
     * This method provides development-specific configuration options
     */
    protected configureFeatureFlags(): void;
    /**
     * Validate LocalStack configuration and log warnings using structured logging
     */
    private validateLocalStackConfiguration;
    /**
     * Build local development capability
     */
    private buildLocalDevCapability;
}
