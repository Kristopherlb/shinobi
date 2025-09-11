/**
 * Creator for VPC Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
import { Construct } from 'constructs';
import { ComponentSpec, ComponentContext, IComponentCreator } from '../../../src/platform/contracts/component-interfaces';
import { VpcComponent } from './vpc.component';
/**
 * Creator class for VPC component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export declare class VpcCreator implements IComponentCreator {
    /**
     * Component type identifier
     */
    readonly componentType = "vpc";
    /**
     * Component display name
     */
    readonly displayName = "VPC";
    /**
     * Component description
     */
    readonly description = "AWS Virtual Private Cloud (VPC) component for network isolation with compliance-aware configurations.";
    /**
     * Component category for organization
     */
    readonly category = "networking";
    /**
     * AWS service this component manages
     */
    readonly awsService = "EC2";
    /**
     * Component tags for discovery
     */
    readonly tags: string[];
    /**
     * JSON Schema for component configuration validation
     */
    readonly configSchema: import("../../../src/core-engine").ComponentConfigSchema;
    /**
     * Factory method to create component instances
     */
    createComponent(scope: Construct, spec: ComponentSpec, context: ComponentContext): VpcComponent;
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
    /**
     * Validates CIDR block format
     */
    private isValidCidr;
    /**
     * Validates log retention days
     */
    private isValidLogRetention;
}
