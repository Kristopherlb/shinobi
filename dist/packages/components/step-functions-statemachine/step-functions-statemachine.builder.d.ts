/**
 * Configuration Builder for StepFunctionsStateMachineComponent Component
 *
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */
import { ConfigBuilder, ConfigBuilderContext } from '../../../src/platform/contracts/config-builder';
/**
 * Configuration interface for Step Functions State Machine component
 */
export interface StepFunctionsStateMachineConfig {
    /** State machine name (optional, will be auto-generated) */
    stateMachineName?: string;
    /** State machine type */
    stateMachineType?: 'STANDARD' | 'EXPRESS';
    /** State machine definition */
    definition?: {
        /** JSON definition as object */
        definition?: any;
        /** Definition from JSON string */
        definitionString?: string;
        /** Definition substitutions */
        definitionSubstitutions?: Record<string, string>;
    };
    /** State machine role ARN (optional, will create if not provided) */
    roleArn?: string;
    /** Logging configuration */
    loggingConfiguration?: {
        /** Enable logging */
        enabled?: boolean;
        /** Log level */
        level?: 'ALL' | 'ERROR' | 'FATAL' | 'OFF';
        /** Include execution data */
        includeExecutionData?: boolean;
    };
    /** Tracing configuration */
    tracingConfiguration?: {
        /** Enable X-Ray tracing */
        enabled?: boolean;
    };
    /** Timeout for state machine execution */
    timeout?: {
        /** Timeout in seconds */
        seconds?: number;
    };
    /** Additional resource tags */
    tags?: Record<string, string>;
}
/**
 * JSON Schema for Step Functions State Machine configuration validation
 */
export declare const STEP_FUNCTIONS_STATEMACHINE_CONFIG_SCHEMA: {
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
 * ConfigBuilder for Step Functions State Machine component
 *
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config)
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
export declare class StepFunctionsStateMachineConfigBuilder extends ConfigBuilder<StepFunctionsStateMachineConfig> {
    constructor(builderContext: ConfigBuilderContext);
    /**
     * Layer 1: Hardcoded Fallbacks
     * Ultra-safe baseline configuration that works in any environment
     */
    protected getHardcodedFallbacks(): Partial<StepFunctionsStateMachineConfig>;
    /**
     * Layer 2: Compliance Framework Defaults
     * Security and compliance-specific configurations
     */
    protected getComplianceFrameworkDefaults(): Partial<StepFunctionsStateMachineConfig>;
    /**
     * Get the JSON Schema for validation
     */
    getSchema(): any;
}
