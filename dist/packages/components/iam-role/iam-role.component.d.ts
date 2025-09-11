/**
 * IAM Role Component
 *
 * AWS IAM Role for secure resource access with least privilege security patterns.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
/**
 * Configuration interface for IAM Role component
 */
export interface IamRoleConfig {
    /** Role name (optional, will be auto-generated if not provided) */
    roleName?: string;
    /** Role description */
    description?: string;
    /** Services that can assume this role */
    assumedBy?: Array<{
        /** AWS service name (e.g., 'lambda.amazonaws.com') */
        service?: string;
        /** AWS account ID */
        accountId?: string;
        /** Specific IAM role ARN */
        roleArn?: string;
        /** Federated identity provider */
        federatedProvider?: string;
    }>;
    /** Managed policy ARNs to attach */
    managedPolicies?: string[];
    /** Inline policies to attach */
    inlinePolicies?: Array<{
        name: string;
        document: any;
    }>;
    /** Maximum session duration */
    maxSessionDuration?: number;
    /** External ID for cross-account access */
    externalId?: string;
    /** Path for the role */
    path?: string;
    /** Permission boundary policy ARN */
    permissionsBoundary?: string;
    /** Tags for the role */
    tags?: Record<string, string>;
}
/**
 * Configuration schema for IAM Role component
 */
export declare const IAM_ROLE_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    properties: {
        roleName: {
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
        assumedBy: {
            type: string;
            description: string;
            items: {
                type: string;
                properties: {
                    service: {
                        type: string;
                        description: string;
                    };
                    accountId: {
                        type: string;
                        description: string;
                        pattern: string;
                    };
                    roleArn: {
                        type: string;
                        description: string;
                    };
                    federatedProvider: {
                        type: string;
                        description: string;
                    };
                };
                additionalProperties: boolean;
            };
            default: never[];
        };
        managedPolicies: {
            type: string;
            description: string;
            items: {
                type: string;
                description: string;
            };
            default: never[];
        };
        inlinePolicies: {
            type: string;
            description: string;
            items: {
                type: string;
                properties: {
                    name: {
                        type: string;
                        description: string;
                    };
                    document: {
                        type: string;
                        description: string;
                    };
                };
                required: string[];
                additionalProperties: boolean;
            };
            default: never[];
        };
        maxSessionDuration: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            default: number;
        };
        externalId: {
            type: string;
            description: string;
            maxLength: number;
        };
        path: {
            type: string;
            description: string;
            pattern: string;
            default: string;
        };
        permissionsBoundary: {
            type: string;
            description: string;
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
    defaults: {
        assumedBy: never[];
        managedPolicies: never[];
        inlinePolicies: never[];
        maxSessionDuration: number;
        path: string;
        tags: {};
    };
};
/**
 * Configuration builder for IAM Role component
 */
export declare class IamRoleConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
     */
    build(): Promise<IamRoleConfig>;
    /**
     * Synchronous version of build for use in synth() method
     */
    buildSync(): IamRoleConfig;
    /**
     * Simple merge utility for combining configuration objects
     */
    private mergeConfigs;
    /**
     * Get platform-wide defaults for IAM Role
     */
    private getPlatformDefaults;
    /**
     * Get compliance framework specific defaults
     */
    private getComplianceFrameworkDefaults;
    /**
     * Get default session duration based on compliance framework
     */
    private getDefaultSessionDuration;
    /**
     * Get compliance permission boundary ARN
     */
    private getCompliancePermissionBoundary;
}
/**
 * IAM Role Component implementing Component API Contract v1.0
 */
export declare class IamRoleComponent extends Component {
    private role?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create IAM Role with compliance hardening
     */
    synth(): void;
    /**
     * Get the capabilities this component provides
     */
    getCapabilities(): ComponentCapabilities;
    /**
     * Get the component type identifier
     */
    getType(): string;
    /**
     * Create the IAM Role
     */
    private createRole;
    /**
     * Build the principal that can assume this role
     */
    private buildAssumedByPrincipal;
    /**
     * Build role name
     */
    private buildRoleName;
    /**
     * Apply compliance-specific hardening
     */
    private applyComplianceHardening;
    private applyCommercialHardening;
    private applyFedrampModerateHardening;
    private applyFedrampHighHardening;
    /**
     * Build role capability data shape
     */
    private buildRoleCapability;
    /**
     * Configure CloudWatch observability for IAM Role
     */
    private configureObservabilityForRole;
}
