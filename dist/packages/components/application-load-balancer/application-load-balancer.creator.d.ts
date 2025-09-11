/**
 * Creator for ApplicationLoadBalancerComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
import { Construct } from 'constructs';
import { ComponentSpec, ComponentContext, IComponentCreator } from '../../platform/contracts/component-interfaces';
/**
 * Creator class for ApplicationLoadBalancerComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export declare class ApplicationLoadBalancerComponentCreator implements IComponentCreator {
    /**
     * Component type identifier
     */
    readonly componentType = "application-load-balancer";
    /**
     * Component display name
     */
    readonly displayName = "Application Load Balancer Component";
    /**
     * Component description
     */
    readonly description = "Application Load Balancer Component implementing Component API Contract v1.0";
    /**
     * Component category for organization
     */
    readonly category = "networking";
    /**
     * AWS service this component manages
     */
    readonly awsService = "ELASTICLOADBALANCINGV2";
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
    createComponent(scope: Construct, spec: ComponentSpec, context: ComponentContext): ApplicationLoadBalancerComponentComponent;
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
