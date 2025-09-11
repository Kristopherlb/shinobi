/**
 * IAM Policy Component
 *
 * AWS IAM Policy for granular access control with least privilege security patterns.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
/**
 * Configuration interface for IAM Policy component
 */
export interface IamPolicyConfig {
    /** Policy name (optional, will be auto-generated if not provided) */
    policyName?: string;
    /** Policy description */
    description?: string;
    /** Policy type */
    policyType?: 'managed' | 'inline';
    /** Policy document (IAM policy statements) */
    policyDocument?: {
        Version?: string;
        Statement: Array<{
            Sid?: string;
            Effect: 'Allow' | 'Deny';
            Action: string | string[];
            Resource?: string | string[];
            Principal?: any;
            Condition?: Record<string, any>;
        }>;
    };
    /** Predefined policy templates */
    policyTemplate?: {
        /** Template type */
        type: 'read-only' | 'power-user' | 'admin' | 'lambda-execution' | 'ecs-task' | 's3-access' | 'rds-access';
        /** Resources to apply template to */
        resources?: string[];
        /** Additional permissions beyond template */
        additionalStatements?: Array<{
            Sid?: string;
            Effect: 'Allow' | 'Deny';
            Action: string | string[];
            Resource?: string | string[];
            Condition?: Record<string, any>;
        }>;
    };
    /** Path for managed policies */
    path?: string;
    /** Groups to attach policy to */
    groups?: string[];
    /** Roles to attach policy to */
    roles?: string[];
    /** Users to attach policy to */
    users?: string[];
    /** Tags for the policy */
    tags?: Record<string, string>;
}
/**
 * Configuration schema for IAM Policy component
 */
export declare const IAM_POLICY_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    properties: {
        policyName: {
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
        policyType: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        policyDocument: {
            type: string;
            description: string;
            properties: {
                Version: {
                    type: string;
                    description: string;
                    default: string;
                };
                Statement: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                        properties: {
                            Sid: {
                                type: string;
                                description: string;
                            };
                            Effect: {
                                type: string;
                                description: string;
                                enum: string[];
                            };
                            Action: {
                                oneOf: ({
                                    type: string;
                                    items?: undefined;
                                } | {
                                    type: string;
                                    items: {
                                        type: string;
                                    };
                                })[];
                                description: string;
                            };
                            Resource: {
                                oneOf: ({
                                    type: string;
                                    items?: undefined;
                                } | {
                                    type: string;
                                    items: {
                                        type: string;
                                    };
                                })[];
                                description: string;
                            };
                            Condition: {
                                type: string;
                                description: string;
                            };
                        };
                        required: string[];
                        additionalProperties: boolean;
                    };
                    minItems: number;
                };
            };
            required: string[];
            additionalProperties: boolean;
        };
        policyTemplate: {
            type: string;
            description: string;
            properties: {
                type: {
                    type: string;
                    description: string;
                    enum: string[];
                };
                resources: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                    };
                    default: string[];
                };
                additionalStatements: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                        properties: {
                            Sid: {
                                type: string;
                            };
                            Effect: {
                                type: string;
                                enum: string[];
                            };
                            Action: {
                                oneOf: ({
                                    type: string;
                                    items?: undefined;
                                } | {
                                    type: string;
                                    items: {
                                        type: string;
                                    };
                                })[];
                            };
                            Resource: {
                                oneOf: ({
                                    type: string;
                                    items?: undefined;
                                } | {
                                    type: string;
                                    items: {
                                        type: string;
                                    };
                                })[];
                            };
                            Condition: {
                                type: string;
                            };
                        };
                        required: string[];
                    };
                    default: never[];
                };
            };
            required: string[];
            additionalProperties: boolean;
        };
        path: {
            type: string;
            description: string;
            pattern: string;
            default: string;
        };
        groups: {
            type: string;
            description: string;
            items: {
                type: string;
            };
            default: never[];
        };
        roles: {
            type: string;
            description: string;
            items: {
                type: string;
            };
            default: never[];
        };
        users: {
            type: string;
            description: string;
            items: {
                type: string;
            };
            default: never[];
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
    anyOf: {
        required: string[];
    }[];
    defaults: {
        policyType: string;
        path: string;
        groups: never[];
        roles: never[];
        users: never[];
        tags: {};
    };
};
/**
 * Configuration builder for IAM Policy component
 */
export declare class IamPolicyConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    build(): Promise<IamPolicyConfig>;
    buildSync(): IamPolicyConfig;
    private mergeConfigs;
    private getPlatformDefaults;
    private getComplianceFrameworkDefaults;
    private getComplianceStatements;
}
/**
 * IAM Policy Component implementing Component API Contract v1.0
 */
export declare class IamPolicyComponent extends Component {
    private policy?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    synth(): void;
    getCapabilities(): ComponentCapabilities;
    getType(): string;
    private createPolicy;
    private buildPolicyDocument;
    private buildTemplateStatements;
    private buildComplianceStatements;
    private buildPolicyName;
    private attachPolicyToEntities;
    private applyComplianceHardening;
    private applyCommercialHardening;
    private applyFedrampModerateHardening;
    private applyFedrampHighHardening;
    private buildPolicyCapability;
    private configureObservabilityForPolicy;
}
