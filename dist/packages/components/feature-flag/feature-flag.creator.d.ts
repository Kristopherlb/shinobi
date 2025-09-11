/**
 * Creator for FeatureFlagComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
import { Construct } from 'constructs';
import { ComponentSpec, ComponentContext, IComponentCreator } from '../../platform/contracts/component-interfaces';
import { FeatureFlagComponentComponent } from './feature-flag.component';
/**
 * Creator class for FeatureFlagComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export declare class FeatureFlagComponentCreator implements IComponentCreator {
    /**
     * Component type identifier
     */
    readonly componentType = "feature-flag";
    /**
     * Component display name
     */
    readonly displayName = "Feature Flag Component";
    /**
     * Component description
     */
    readonly description = "Feature Flag Component";
    /**
     * Component category for organization
     */
    readonly category = "feature-flags";
    /**
     * AWS service this component manages
     */
    readonly awsService = "APPCONFIG";
    /**
     * Component tags for discovery
     */
    readonly tags: string[];
    /**
     * JSON Schema for component configuration validation
     */
    readonly configSchema: {
        type: string;
        properties: {
            name: {
                type: string;
                description: string;
                pattern: string;
                maxLength: number;
            };
            description: {
                type: string;
                description: string;
                maxLength: number;
            };
            monitoring: {
                type: string;
                description: string;
                properties: {
                    enabled: {
                        type: string;
                        default: boolean;
                        description: string;
                    };
                    detailedMetrics: {
                        type: string;
                        default: boolean;
                        description: string;
                    };
                };
                additionalProperties: boolean;
            };
            tags: {
                type: string;
                description: string;
                additionalProperties: {
                    type: string;
                };
            };
        };
        additionalProperties: boolean;
    };
    /**
     * Factory method to create component instances
     */
    createComponent(scope: Construct, spec: ComponentSpec, context: ComponentContext): FeatureFlagComponentComponent;
    /**
     * Validates component specification beyond JSON Schema validation
     */
    validateSpec(spec: ComponentSpec, context: ComponentContext): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Returns the capabilities this component provides when synthesized
     */
    getProvidedCapabilities(): string[];
    /**
     * Returns the capabilities this component requires from other components
     */
    getRequiredCapabilities(): string[];
    /**
     * Returns construct handles that will be registered by this component
     */
    getConstructHandles(): string[];
}
