/**
 * VPC Component
 *
 * Defines network isolation with compliance-aware networking rules.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
/**
 * Configuration interface for VPC component
 */
export interface VpcConfig {
    /** CIDR block for the VPC */
    cidr?: string;
    /** Maximum number of Availability Zones */
    maxAzs?: number;
    /** Enable NAT gateways for private subnets */
    natGateways?: number;
    /** Enable VPC Flow Logs */
    flowLogsEnabled?: boolean;
    /** Subnet configuration */
    subnets?: {
        /** Public subnet configuration */
        public?: {
            cidrMask?: number;
            name?: string;
        };
        /** Private subnet configuration */
        private?: {
            cidrMask?: number;
            name?: string;
        };
        /** Database subnet configuration */
        database?: {
            cidrMask?: number;
            name?: string;
        };
    };
    /** VPC Endpoints configuration */
    vpcEndpoints?: {
        s3?: boolean;
        dynamodb?: boolean;
        secretsManager?: boolean;
        kms?: boolean;
    };
    /** DNS configuration */
    dns?: {
        enableDnsHostnames?: boolean;
        enableDnsSupport?: boolean;
    };
}
/**
 * Configuration schema for VPC component
 */
export declare const VPC_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    properties: {
        cidr: {
            type: string;
            description: string;
            pattern: string;
            default: string;
        };
        maxAzs: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            default: number;
        };
        natGateways: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            default: number;
        };
        flowLogsEnabled: {
            type: string;
            description: string;
            default: boolean;
        };
        subnets: {
            type: string;
            description: string;
            properties: {
                public: {
                    type: string;
                    description: string;
                    properties: {
                        cidrMask: {
                            type: string;
                            description: string;
                            minimum: number;
                            maximum: number;
                            default: number;
                        };
                        name: {
                            type: string;
                            description: string;
                            maxLength: number;
                            default: string;
                        };
                    };
                    additionalProperties: boolean;
                    default: {
                        cidrMask: number;
                        name: string;
                    };
                };
                private: {
                    type: string;
                    description: string;
                    properties: {
                        cidrMask: {
                            type: string;
                            description: string;
                            minimum: number;
                            maximum: number;
                            default: number;
                        };
                        name: {
                            type: string;
                            description: string;
                            maxLength: number;
                            default: string;
                        };
                    };
                    additionalProperties: boolean;
                    default: {
                        cidrMask: number;
                        name: string;
                    };
                };
                database: {
                    type: string;
                    description: string;
                    properties: {
                        cidrMask: {
                            type: string;
                            description: string;
                            minimum: number;
                            maximum: number;
                            default: number;
                        };
                        name: {
                            type: string;
                            description: string;
                            maxLength: number;
                            default: string;
                        };
                    };
                    additionalProperties: boolean;
                    default: {
                        cidrMask: number;
                        name: string;
                    };
                };
            };
            additionalProperties: boolean;
            default: {
                public: {
                    cidrMask: number;
                    name: string;
                };
                private: {
                    cidrMask: number;
                    name: string;
                };
                database: {
                    cidrMask: number;
                    name: string;
                };
            };
        };
        vpcEndpoints: {
            type: string;
            description: string;
            properties: {
                s3: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                dynamodb: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                secretsManager: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                kms: {
                    type: string;
                    description: string;
                    default: boolean;
                };
            };
            additionalProperties: boolean;
            default: {
                s3: boolean;
                dynamodb: boolean;
                secretsManager: boolean;
                kms: boolean;
            };
        };
        dns: {
            type: string;
            description: string;
            properties: {
                enableDnsHostnames: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                enableDnsSupport: {
                    type: string;
                    description: string;
                    default: boolean;
                };
            };
            additionalProperties: boolean;
            default: {
                enableDnsHostnames: boolean;
                enableDnsSupport: boolean;
            };
        };
    };
    additionalProperties: boolean;
    defaults: {
        cidr: string;
        maxAzs: number;
        natGateways: number;
        flowLogsEnabled: boolean;
        subnets: {
            public: {
                cidrMask: number;
                name: string;
            };
            private: {
                cidrMask: number;
                name: string;
            };
            database: {
                cidrMask: number;
                name: string;
            };
        };
        vpcEndpoints: {
            s3: boolean;
            dynamodb: boolean;
            secretsManager: boolean;
            kms: boolean;
        };
        dns: {
            enableDnsHostnames: boolean;
            enableDnsSupport: boolean;
        };
    };
};
/**
 * Configuration builder for VPC component
 */
export declare class VpcConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
     */
    build(): Promise<VpcConfig>;
    /**
     * Synchronous version of build for use in synth() method
     */
    buildSync(): VpcConfig;
    /**
     * Simple merge utility for combining configuration objects
     */
    private mergeConfigs;
    /**
     * Get platform-wide defaults for VPC
     */
    private getPlatformDefaults;
    /**
     * Get compliance framework specific defaults
     */
    private getComplianceFrameworkDefaults;
    /**
     * Get default VPC endpoints based on compliance framework
     */
    private getDefaultVpcEndpoints;
}
/**
 * VPC Component implementing Component API Contract v1.0
 */
export declare class VpcComponent extends Component {
    private vpc?;
    private flowLogGroup?;
    private flowLogRole?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create VPC with compliance hardening
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
     * Create the VPC with appropriate subnet configuration
     */
    private createVpc;
    /**
     * Create VPC Flow Logs for network monitoring
     */
    private createVpcFlowLogsIfEnabled;
    /**
     * Create VPC Endpoints based on configuration
     */
    private createVpcEndpointsIfNeeded;
    /**
     * Apply compliance-specific hardening
     */
    private applyComplianceHardening;
    private applyCommercialHardening;
    private applyFedrampModerateHardening;
    private applyFedrampHighHardening;
    /**
     * Create default security groups with least privilege
     */
    private createDefaultSecurityGroups;
    /**
     * Create compliance-grade Network ACLs
     */
    private createComplianceNacls;
    /**
     * Create high-security Network ACLs for FedRAMP High
     */
    private createHighSecurityNacls;
    /**
     * Restrict the default security group
     */
    private restrictDefaultSecurityGroup;
    /**
     * Build subnet configuration based on compliance requirements
     */
    private buildSubnetConfiguration;
    /**
     * Build VPC capability data shape
     */
    private buildVpcCapability;
    /**
     * Helper methods for compliance decisions
     */
    private isComplianceFramework;
    private getFlowLogRetention;
}
//# sourceMappingURL=vpc.component.d.ts.map