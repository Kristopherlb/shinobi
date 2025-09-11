/**
 * Creator for StepFunctionsStateMachineComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
import { Construct } from 'constructs';
import { ComponentSpec, ComponentContext, IComponentCreator } from '../../../src/platform/contracts/component-interfaces';
import { StepFunctionsStateMachineComponent } from './step-functions-statemachine.component';
/**
 * Creator class for Step Functions State Machine component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export declare class StepFunctionsStateMachineCreator implements IComponentCreator {
    /**
     * Component type identifier
     */
    readonly componentType = "step-functions-statemachine";
    /**
     * Component display name
     */
    readonly displayName = "Step Functions State Machine";
    /**
     * Component description
     */
    readonly description = "AWS Step Functions State Machine for serverless workflow orchestration with compliance-aware configuration";
    /**
     * Component category for organization
     */
    readonly category = "workflow";
    /**
     * AWS service this component manages
     */
    readonly awsService = "Step Functions";
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
        properties: {
            stateMachineName: {
                type: string;
                description: string;
                pattern: string;
                maxLength: number;
            };
            stateMachineType: {
                type: string;
                description: string;
                enum: string[];
                default: string;
            };
            definition: {
                type: string;
                description: string;
                properties: {
                    definition: {
                        type: string;
                        description: string;
                    };
                    definitionString: {
                        type: string;
                        description: string;
                    };
                    definitionSubstitutions: {
                        type: string;
                        description: string;
                        additionalProperties: {
                            type: string;
                        };
                        default: {};
                    };
                };
                additionalProperties: boolean;
                anyOf: {
                    required: string[];
                }[];
            };
            roleArn: {
                type: string;
                description: string;
            };
            loggingConfiguration: {
                type: string;
                description: string;
                properties: {
                    enabled: {
                        type: string;
                        description: string;
                        default: boolean;
                    };
                    level: {
                        type: string;
                        description: string;
                        enum: string[];
                        default: string;
                    };
                    includeExecutionData: {
                        type: string;
                        description: string;
                        default: boolean;
                    };
                };
                additionalProperties: boolean;
                default: {
                    enabled: boolean;
                    level: string;
                    includeExecutionData: boolean;
                };
            };
            tracingConfiguration: {
                type: string;
                description: string;
                properties: {
                    enabled: {
                        type: string;
                        description: string;
                        default: boolean;
                    };
                };
                additionalProperties: boolean;
                default: {
                    enabled: boolean;
                };
            };
            timeout: {
                type: string;
                description: string;
                properties: {
                    seconds: {
                        type: string;
                        description: string;
                        minimum: number;
                        maximum: number;
                        default: number;
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
        required: string[];
    };
    /**
     * Factory method to create component instances
     */
    createComponent(scope: Construct, spec: ComponentSpec, context: ComponentContext): StepFunctionsStateMachineComponent;
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
