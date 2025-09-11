"use strict";
/**
 * Configuration Builder for IamRoleComponent Component
 *
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IamRoleConfigBuilder = exports.IAM_ROLE_CONFIG_SCHEMA = void 0;
const config_builder_1 = require("../../../../src/platform/contracts/config-builder");
/**
 * JSON Schema for IamRoleComponent configuration validation
 */
exports.IAM_ROLE_CONFIG_SCHEMA = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
            description: 'Component name (optional, will be auto-generated from component name)',
            pattern: '^[a-zA-Z][a-zA-Z0-9-_]*$',
            maxLength: 128
        },
        description: {
            type: 'string',
            description: 'Component description for documentation',
            maxLength: 500
        },
        role: {
            type: 'object',
            description: 'IAM Role configuration',
            properties: {
                assumedBy: {
                    type: 'object',
                    description: 'Principal that can assume this role',
                    properties: {
                        service: {
                            type: 'string',
                            description: 'AWS service principal (e.g., ec2.amazonaws.com)',
                            pattern: '^[a-zA-Z0-9.-]+\\.amazonaws\\.com$'
                        },
                        account: {
                            type: 'string',
                            description: 'AWS account ID for cross-account access',
                            pattern: '^[0-9]{12}$'
                        },
                        externalId: {
                            type: 'string',
                            description: 'External ID for cross-account access',
                            minLength: 2,
                            maxLength: 1224
                        },
                        arn: {
                            type: 'string',
                            description: 'ARN pattern for custom principals',
                            pattern: '^arn:aws:[a-z0-9-]+:[a-z0-9-]*:[0-9]{12}:[a-zA-Z0-9-_/]+$'
                        }
                    },
                    required: ['service']
                },
                inlinePolicies: {
                    type: 'object',
                    description: 'Inline policies attached to the role',
                    additionalProperties: {
                        type: 'object',
                        properties: {
                            statements: {
                                type: 'array',
                                description: 'Policy statements',
                                items: {
                                    type: 'object',
                                    properties: {
                                        effect: {
                                            type: 'string',
                                            enum: ['Allow', 'Deny'],
                                            description: 'Effect of the policy statement'
                                        },
                                        actions: {
                                            type: 'array',
                                            description: 'Actions this policy applies to',
                                            items: {
                                                type: 'string',
                                                pattern: '^[a-zA-Z0-9-]+:[a-zA-Z0-9*]+$'
                                            },
                                            minItems: 1
                                        },
                                        resources: {
                                            type: 'array',
                                            description: 'Resources this policy applies to',
                                            items: {
                                                type: 'string'
                                            },
                                            minItems: 1
                                        },
                                        conditions: {
                                            type: 'object',
                                            description: 'Conditions for policy application',
                                            additionalProperties: true
                                        }
                                    },
                                    required: ['effect', 'actions', 'resources']
                                },
                                minItems: 1
                            }
                        },
                        required: ['statements']
                    }
                },
                managedPolicies: {
                    type: 'array',
                    description: 'Managed policy ARNs to attach',
                    items: {
                        type: 'string',
                        pattern: '^arn:aws:iam::[0-9]{12}:policy/[a-zA-Z0-9-_/]+$'
                    }
                },
                maxSessionDuration: {
                    type: 'integer',
                    description: 'Maximum session duration in seconds',
                    minimum: 3600,
                    maximum: 43200,
                    default: 3600
                },
                path: {
                    type: 'string',
                    description: 'Path for the role',
                    pattern: '^/[a-zA-Z0-9/_-]*/$',
                    default: '/'
                }
            },
            required: ['assumedBy']
        },
        compliance: {
            type: 'object',
            description: 'Compliance and security settings',
            properties: {
                permissionsBoundary: {
                    type: 'boolean',
                    description: 'Enable permissions boundary for FedRAMP compliance',
                    default: false
                },
                permissionsBoundaryArn: {
                    type: 'string',
                    description: 'Custom permissions boundary ARN',
                    pattern: '^arn:aws:iam::[0-9]{12}:policy/[a-zA-Z0-9-_/]+$'
                },
                leastPrivilege: {
                    type: 'boolean',
                    description: 'Enable least privilege enforcement',
                    default: true
                },
                requireMfa: {
                    type: 'boolean',
                    description: 'Require MFA for role assumption',
                    default: false
                }
            }
        },
        tags: {
            type: 'object',
            description: 'Tagging configuration',
            additionalProperties: {
                type: 'string',
                maxLength: 256
            }
        }
    },
    required: ['role'],
    additionalProperties: false
};
/**
 * Configuration Builder for IamRoleComponent
 *
 * Extends the abstract ConfigBuilder to provide IAM role-specific configuration
 * with 5-layer precedence chain and compliance-aware defaults.
 */
class IamRoleConfigBuilder extends config_builder_1.ConfigBuilder {
    constructor(context) {
        super(context, exports.IAM_ROLE_CONFIG_SCHEMA);
    }
    /**
     * Provide component-specific hardcoded fallbacks.
     * These are the absolute, safest, most minimal defaults possible.
     *
     * Layer 1 (Priority 5 - Lowest): Hardcoded Fallbacks
     */
    getHardcodedFallbacks() {
        return {
            role: {
                assumedBy: {
                    service: 'ec2.amazonaws.com' // Safest default for EC2 instances
                },
                inlinePolicies: {},
                managedPolicies: [],
                maxSessionDuration: 3600, // 1 hour - minimal session duration
                path: '/'
            },
            compliance: {
                permissionsBoundary: false, // Disabled by default for commercial
                leastPrivilege: true, // Always enforce least privilege
                requireMfa: false // Disabled by default for service roles
            },
            tags: {
                'Component': 'iam-role',
                'ManagedBy': 'platform'
            }
        };
    }
}
exports.IamRoleConfigBuilder = IamRoleConfigBuilder;
