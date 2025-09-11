/**
 * Configuration Builder for IamRoleComponent Component
 *
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */
import { ConfigBuilder, ConfigBuilderContext } from '../../../../src/platform/contracts/config-builder';
/**
 * Configuration interface for IamRoleComponent component
 */
export interface IamRoleConfig {
    /** Component name (optional, will be auto-generated) */
    name?: string;
    /** Component description */
    description?: string;
    /** IAM Role configuration */
    role: {
        /** Principal that can assume this role */
        assumedBy: {
            /** AWS service principal (e.g., 'ec2.amazonaws.com') */
            service?: string;
            /** AWS account ID for cross-account access */
            account?: string;
            /** External ID for cross-account access */
            externalId?: string;
            /** ARN pattern for custom principals */
            arn?: string;
        };
        /** Inline policies attached to the role */
        inlinePolicies?: Record<string, {
            /** Policy document with statements */
            statements: Array<{
                /** Effect: Allow or Deny */
                effect: 'Allow' | 'Deny';
                /** Actions this policy applies to */
                actions: string[];
                /** Resources this policy applies to */
                resources: string[];
                /** Conditions for policy application */
                conditions?: Record<string, any>;
            }>;
        }>;
        /** Managed policy ARNs to attach */
        managedPolicies?: string[];
        /** Maximum session duration in seconds (1-43200) */
        maxSessionDuration?: number;
        /** Path for the role */
        path?: string;
    };
    /** Compliance and security settings */
    compliance?: {
        /** Enable permissions boundary for FedRAMP compliance */
        permissionsBoundary?: boolean;
        /** Custom permissions boundary ARN */
        permissionsBoundaryArn?: string;
        /** Enable least privilege enforcement */
        leastPrivilege?: boolean;
        /** Require MFA for role assumption */
        requireMfa?: boolean;
    };
    /** Tagging configuration */
    tags?: Record<string, string>;
}
/**
 * JSON Schema for IamRoleComponent configuration validation
 */
export declare const IAM_ROLE_CONFIG_SCHEMA: {
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
        role: {
            type: string;
            description: string;
            properties: {
                assumedBy: {
                    type: string;
                    description: string;
                    properties: {
                        service: {
                            type: string;
                            description: string;
                            pattern: string;
                        };
                        account: {
                            type: string;
                            description: string;
                            pattern: string;
                        };
                        externalId: {
                            type: string;
                            description: string;
                            minLength: number;
                            maxLength: number;
                        };
                        arn: {
                            type: string;
                            description: string;
                            pattern: string;
                        };
                    };
                    required: string[];
                };
                inlinePolicies: {
                    type: string;
                    description: string;
                    additionalProperties: {
                        type: string;
                        properties: {
                            statements: {
                                type: string;
                                description: string;
                                items: {
                                    type: string;
                                    properties: {
                                        effect: {
                                            type: string;
                                            enum: string[];
                                            description: string;
                                        };
                                        actions: {
                                            type: string;
                                            description: string;
                                            items: {
                                                type: string;
                                                pattern: string;
                                            };
                                            minItems: number;
                                        };
                                        resources: {
                                            type: string;
                                            description: string;
                                            items: {
                                                type: string;
                                            };
                                            minItems: number;
                                        };
                                        conditions: {
                                            type: string;
                                            description: string;
                                            additionalProperties: boolean;
                                        };
                                    };
                                    required: string[];
                                };
                                minItems: number;
                            };
                        };
                        required: string[];
                    };
                };
                managedPolicies: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                        pattern: string;
                    };
                };
                maxSessionDuration: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
                path: {
                    type: string;
                    description: string;
                    pattern: string;
                    default: string;
                };
            };
            required: string[];
        };
        compliance: {
            type: string;
            description: string;
            properties: {
                permissionsBoundary: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                permissionsBoundaryArn: {
                    type: string;
                    description: string;
                    pattern: string;
                };
                leastPrivilege: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                requireMfa: {
                    type: string;
                    description: string;
                    default: boolean;
                };
            };
        };
        tags: {
            type: string;
            description: string;
            additionalProperties: {
                type: string;
                maxLength: number;
            };
        };
    };
    required: string[];
    additionalProperties: boolean;
};
/**
 * Configuration Builder for IamRoleComponent
 *
 * Extends the abstract ConfigBuilder to provide IAM role-specific configuration
 * with 5-layer precedence chain and compliance-aware defaults.
 */
export declare class IamRoleConfigBuilder extends ConfigBuilder<IamRoleConfig> {
    constructor(context: ConfigBuilderContext);
    /**
     * Provide component-specific hardcoded fallbacks.
     * These are the absolute, safest, most minimal defaults possible.
     *
     * Layer 1 (Priority 5 - Lowest): Hardcoded Fallbacks
     */
    protected getHardcodedFallbacks(): Record<string, any>;
}
