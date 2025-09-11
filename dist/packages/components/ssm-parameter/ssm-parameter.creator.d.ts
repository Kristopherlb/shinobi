/**
 * Creator for SSM Parameter Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
import { Construct } from 'constructs';
import { ComponentSpec, ComponentContext, IComponentCreator } from '../../../src/platform/contracts/component-interfaces';
import { SsmParameterComponent } from './ssm-parameter.component';
/**
 * Creator class for SSM Parameter component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export declare class SsmParameterCreator implements IComponentCreator {
    /**
     * Component type identifier
     */
    readonly componentType = "ssm-parameter";
    /**
     * Component display name
     */
    readonly displayName = "SSM Parameter";
    /**
     * Component description
     */
    readonly description = "AWS Systems Manager Parameter Store for configuration management and application parameters with compliance-aware encryption";
    /**
     * Component category for organization
     */
    readonly category = "configuration";
    /**
     * AWS service this component manages
     */
    readonly awsService = "SSM";
    /**
     * Component tags for discovery
     */
    readonly tags: string[];
    /**
     * JSON Schema for component configuration validation
     */
    readonly configSchema: {
        type: string;
        title: string;
        description: string;
        required: string[];
        properties: {
            parameterName: {
                type: string;
                description: string;
                pattern: string;
                minLength: number;
                maxLength: number;
            };
            description: {
                type: string;
                description: string;
                maxLength: number;
            };
            parameterType: {
                type: string;
                description: string;
                enum: string[];
                default: string;
            };
            value: {
                type: string;
                description: string;
                maxLength: number;
            };
            sensitivityLevel: {
                type: string;
                description: string;
                enum: string[];
                default: string;
            };
            validationPattern: {
                type: string;
                description: string;
                enum: string[];
                default: string;
            };
            customValidationPattern: {
                type: string;
                description: string;
            };
            encryption: {
                type: string;
                description: string;
                properties: {
                    kmsKeyArn: {
                        type: string;
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
                default: {};
            };
        };
        additionalProperties: boolean;
    };
    /**
     * Factory method to create component instances
     */
    createComponent(scope: Construct, spec: ComponentSpec, context: ComponentContext): SsmParameterComponent;
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
