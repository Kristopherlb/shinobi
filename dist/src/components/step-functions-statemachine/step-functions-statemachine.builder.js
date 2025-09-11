"use strict";
/**
 * Configuration Builder for StepFunctionsStateMachineComponent Component
 *
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StepFunctionsStateMachineConfigBuilder = exports.STEP_FUNCTIONS_STATEMACHINE_CONFIG_SCHEMA = void 0;
const config_builder_1 = require("../../../src/platform/contracts/config-builder");
/**
 * JSON Schema for Step Functions State Machine configuration validation
 */
exports.STEP_FUNCTIONS_STATEMACHINE_CONFIG_SCHEMA = {
    type: 'object',
    title: 'Step Functions State Machine Configuration',
    description: 'Configuration for creating a Step Functions State Machine',
    properties: {
        stateMachineName: {
            type: 'string',
            description: 'Name of the state machine (will be auto-generated if not provided)',
            pattern: '^[a-zA-Z0-9_-]+$',
            maxLength: 80
        },
        stateMachineType: {
            type: 'string',
            description: 'Type of state machine',
            enum: ['STANDARD', 'EXPRESS'],
            default: 'STANDARD'
        },
        definition: {
            type: 'object',
            description: 'State machine definition',
            properties: {
                definition: {
                    type: 'object',
                    description: 'State machine definition as JSON object'
                },
                definitionString: {
                    type: 'string',
                    description: 'State machine definition as JSON string'
                },
                definitionSubstitutions: {
                    type: 'object',
                    description: 'Definition substitutions',
                    additionalProperties: { type: 'string' },
                    default: {}
                }
            },
            additionalProperties: false,
            anyOf: [
                { required: ['definition'] },
                { required: ['definitionString'] }
            ]
        },
        roleArn: {
            type: 'string',
            description: 'IAM role ARN for state machine execution'
        },
        loggingConfiguration: {
            type: 'object',
            description: 'Logging configuration',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable logging',
                    default: false
                },
                level: {
                    type: 'string',
                    description: 'Log level',
                    enum: ['ALL', 'ERROR', 'FATAL', 'OFF'],
                    default: 'ERROR'
                },
                includeExecutionData: {
                    type: 'boolean',
                    description: 'Include execution data in logs',
                    default: false
                }
            },
            additionalProperties: false,
            default: { enabled: false, level: 'ERROR', includeExecutionData: false }
        },
        tracingConfiguration: {
            type: 'object',
            description: 'X-Ray tracing configuration',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable X-Ray tracing',
                    default: false
                }
            },
            additionalProperties: false,
            default: { enabled: false }
        },
        timeout: {
            type: 'object',
            description: 'Execution timeout configuration',
            properties: {
                seconds: {
                    type: 'number',
                    description: 'Timeout in seconds',
                    minimum: 1,
                    maximum: 31536000, // 1 year
                    default: 3600
                }
            },
            additionalProperties: false
        },
        tags: {
            type: 'object',
            description: 'Tags for the state machine',
            additionalProperties: { type: 'string' },
            default: {}
        }
    },
    additionalProperties: false,
    required: ['definition']
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
class StepFunctionsStateMachineConfigBuilder extends config_builder_1.ConfigBuilder {
    constructor(builderContext) {
        super(builderContext, exports.STEP_FUNCTIONS_STATEMACHINE_CONFIG_SCHEMA);
    }
    /**
     * Layer 1: Hardcoded Fallbacks
     * Ultra-safe baseline configuration that works in any environment
     */
    getHardcodedFallbacks() {
        return {
            stateMachineType: 'STANDARD',
            loggingConfiguration: {
                enabled: false,
                level: 'ERROR',
                includeExecutionData: false
            },
            tracingConfiguration: {
                enabled: false
            },
            timeout: {
                seconds: 3600 // 1 hour default
            },
            tags: {}
        };
    }
    /**
     * Layer 2: Compliance Framework Defaults
     * Security and compliance-specific configurations
     */
    getComplianceFrameworkDefaults() {
        const framework = this.builderContext.context.complianceFramework;
        switch (framework) {
            case 'fedramp-moderate':
                return {
                    loggingConfiguration: {
                        enabled: true, // Mandatory logging for compliance
                        level: 'ALL',
                        includeExecutionData: true // Required for audit trail
                    },
                    tracingConfiguration: {
                        enabled: true // Required for compliance monitoring
                    },
                    tags: {
                        'compliance-framework': 'fedramp-moderate',
                        'logging-level': 'comprehensive',
                        'audit-trail': 'enabled'
                    }
                };
            case 'fedramp-high':
                return {
                    loggingConfiguration: {
                        enabled: true, // Mandatory
                        level: 'ALL',
                        includeExecutionData: true // Required for detailed audit
                    },
                    tracingConfiguration: {
                        enabled: true // Mandatory for high security
                    },
                    timeout: {
                        seconds: 1800 // Shorter timeout for security
                    },
                    tags: {
                        'compliance-framework': 'fedramp-high',
                        'logging-level': 'comprehensive',
                        'audit-trail': 'enabled',
                        'security-level': 'high'
                    }
                };
            default: // commercial
                return {
                    loggingConfiguration: {
                        enabled: false,
                        level: 'ERROR'
                    },
                    tracingConfiguration: {
                        enabled: false
                    }
                };
        }
    }
    /**
     * Get the JSON Schema for validation
     */
    getSchema() {
        return exports.STEP_FUNCTIONS_STATEMACHINE_CONFIG_SCHEMA;
    }
}
exports.StepFunctionsStateMachineConfigBuilder = StepFunctionsStateMachineConfigBuilder;
