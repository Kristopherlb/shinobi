/**
 * Feature Flag Component
 *
 * Defines individual feature flags within an OpenFeature provider.
 * Implements Platform Feature Flagging & Canary Deployment Standard v1.0.
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
/**
 * Configuration interface for Feature Flag component
 */
export interface FeatureFlagConfig {
    /** Feature flag key/name (required) */
    flagKey: string;
    /** Flag type (boolean, string, number, object) */
    flagType: 'boolean' | 'string' | 'number' | 'object';
    /** Default value for the flag */
    defaultValue: any;
    /** Flag description for documentation */
    description?: string;
    /** Enabled state of the flag */
    enabled?: boolean;
    /** Targeting rules for the flag */
    targetingRules?: {
        /** Percentage rollout (0-100) */
        percentage?: number;
        /** User/context targeting conditions */
        conditions?: Array<{
            attribute: string;
            operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'starts_with' | 'ends_with';
            value: any;
        }>;
        /** Variant configuration for string/object flags */
        variants?: Array<{
            name: string;
            value: any;
            weight: number;
        }>;
    };
    /** Provider-specific configuration */
    providerConfig?: {
        /** AWS AppConfig specific settings */
        awsAppConfig?: {
            /** JSON constraints for validation */
            constraints?: Record<string, any>;
        };
        /** LaunchDarkly specific settings */
        launchDarkly?: {
            /** Flag tags for organization */
            tags?: string[];
            /** Temporary flag indicator */
            temporary?: boolean;
        };
        /** Flagsmith specific settings */
        flagsmith?: {
            /** Flag description */
            description?: string;
            /** Initial value */
            initialValue?: string;
        };
    };
}
/**
 * Configuration schema for Feature Flag component
 */
export declare const FEATURE_FLAG_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    properties: {
        flagKey: {
            type: string;
            description: string;
            pattern: string;
            minLength: number;
            maxLength: number;
        };
        flagType: {
            type: string;
            enum: string[];
            description: string;
            default: string;
        };
        defaultValue: {
            description: string;
        };
        description: {
            type: string;
            description: string;
            maxLength: number;
        };
        enabled: {
            type: string;
            description: string;
            default: boolean;
        };
    };
    required: string[];
    additionalProperties: boolean;
    defaults: {
        flagType: string;
        enabled: boolean;
    };
};
/**
 * Feature Flag Component implementing OpenFeature Standard
 */
export declare class FeatureFlagComponent extends Component {
    private hostedConfigurationVersion?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create feature flag definition
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
     * Create feature flag definition
     */
    private createFeatureFlagDefinition;
    /**
     * Build JSON definition for the feature flag compatible with OpenFeature
     */
    private buildFlagDefinitionJson;
    /**
     * Build targeting rules for progressive delivery
     */
    private buildTargetingRules;
    /**
     * Get disabled value based on flag type
     */
    private getDisabledValue;
    /**
     * Map generic operators to AWS AppConfig operators
     */
    private mapOperatorToAppConfig;
    /**
     * Resolve dependent resource from bound components
     */
    private resolveDependentResource;
    /**
     * Build flag capability data shape
     */
    private buildFlagCapability;
    /**
     * Simplified config building for component
     */
    private buildConfigSync;
}
