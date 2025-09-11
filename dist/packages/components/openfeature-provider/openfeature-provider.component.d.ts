/**
 * OpenFeature Provider Component
 *
 * Provisions backend infrastructure for feature flagging providers.
 * Initial implementation supports AWS AppConfig as the default provider.
 * Implements Platform Feature Flagging & Canary Deployment Standard v1.0.
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities, ComponentConfigSchema } from '@platform/contracts';
/**
 * Configuration interface for OpenFeature Provider component
 */
export interface OpenFeatureProviderConfig {
    /** Provider type (aws-appconfig, launchdarkly, flagsmith, etc.) */
    providerType: 'aws-appconfig' | 'launchdarkly' | 'flagsmith';
    /** Application name for the feature flag provider */
    applicationName?: string;
    /** Environment name for feature flags */
    environmentName?: string;
    /** AWS AppConfig specific configuration */
    awsAppConfig?: {
        /** Configuration profile name */
        configurationProfileName?: string;
        /** Deployment strategy ID for AWS AppConfig */
        deploymentStrategyId?: string;
        /** Monitor specifications for rollback */
        monitors?: Array<{
            alarmArn: string;
            alarmRoleArn?: string;
        }>;
    };
    /** LaunchDarkly specific configuration */
    launchDarkly?: {
        /** LaunchDarkly project key */
        projectKey?: string;
        /** LaunchDarkly environment key */
        environmentKey?: string;
        /** SDK key for client-side flags */
        clientSideId?: string;
    };
    /** Flagsmith specific configuration */
    flagsmith?: {
        /** Flagsmith environment key */
        environmentKey?: string;
        /** API URL for self-hosted Flagsmith */
        apiUrl?: string;
    };
}
/**
 * Configuration schema for OpenFeature Provider component
 */
export declare const OPENFEATURE_PROVIDER_CONFIG_SCHEMA: ComponentConfigSchema;
/**
 * OpenFeature Provider Component implementing Platform Feature Flagging Standard v1.0
 */
export declare class OpenFeatureProviderComponent extends Component {
    private application?;
    private environment?;
    private configurationProfile?;
    private deploymentStrategy?;
    private retrieverRole?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create OpenFeature provider infrastructure
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
     * Create AWS AppConfig infrastructure for feature flagging
     */
    private createAwsAppConfigInfrastructure;
    /**
     * Create LaunchDarkly infrastructure (placeholder for future implementation)
     */
    private createLaunchDarklyInfrastructure;
    /**
     * Create Flagsmith infrastructure (placeholder for future implementation)
     */
    private createFlagsmithInfrastructure;
    /**
     * Build provider capability data shape
     */
    private buildProviderCapability;
    /**
     * Simplified config building for component
     */
    private buildConfigSync;
}
