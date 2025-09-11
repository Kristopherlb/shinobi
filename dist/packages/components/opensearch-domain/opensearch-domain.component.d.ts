/**
 * OpenSearch Domain Component
 *
 * AWS OpenSearch Service domain for search and analytics workloads.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
/**
 * Configuration interface for OpenSearch Domain component
 */
export interface OpenSearchDomainConfig {
    /** Domain name (optional, will be auto-generated) */
    domainName?: string;
    /** OpenSearch version */
    version?: string;
    /** Cluster configuration */
    cluster?: {
        /** Instance type for data nodes */
        instanceType?: string;
        /** Number of data nodes */
        instanceCount?: number;
        /** Enable dedicated master nodes */
        dedicatedMasterEnabled?: boolean;
        /** Master node instance type */
        masterInstanceType?: string;
        /** Number of master nodes */
        masterInstanceCount?: number;
        /** Enable warm nodes */
        warmEnabled?: boolean;
        /** Warm node instance type */
        warmInstanceType?: string;
        /** Number of warm nodes */
        warmInstanceCount?: number;
    };
    /** Storage configuration */
    ebs?: {
        /** Enable EBS storage */
        enabled?: boolean;
        /** Volume type */
        volumeType?: 'gp2' | 'gp3' | 'io1' | 'io2';
        /** Volume size in GB */
        volumeSize?: number;
        /** IOPS (for io1/io2) */
        iops?: number;
        /** Throughput (for gp3) */
        throughput?: number;
    };
    /** Network configuration */
    vpc?: {
        /** VPC ID */
        vpcId?: string;
        /** Subnet IDs */
        subnetIds?: string[];
        /** Security group IDs */
        securityGroupIds?: string[];
    };
    /** Access policy */
    accessPolicies?: {
        /** IAM policy document */
        statements?: Array<{
            Effect: 'Allow' | 'Deny';
            Principal?: any;
            Action: string | string[];
            Resource?: string | string[];
            Condition?: Record<string, any>;
        }>;
    };
    /** Encryption configuration */
    encryptionAtRest?: {
        /** Enable encryption at rest */
        enabled?: boolean;
    };
    /** Node-to-node encryption */
    nodeToNodeEncryption?: {
        /** Enable node-to-node encryption */
        enabled?: boolean;
    };
    /** Domain endpoint options */
    domainEndpoint?: {
        /** Enforce HTTPS */
        enforceHTTPS?: boolean;
        /** TLS security policy */
        tlsSecurityPolicy?: string;
    };
    /** Advanced security options */
    advancedSecurity?: {
        /** Enable fine-grained access control */
        enabled?: boolean;
        /** Internal user database */
        internalUserDatabaseEnabled?: boolean;
        /** Master user name */
        masterUserName?: string;
        /** Master user password */
        masterUserPassword?: string;
    };
    /** Logging configuration */
    logging?: {
        /** Slow search logs */
        slowSearchLogEnabled?: boolean;
        /** Slow index logs */
        slowIndexLogEnabled?: boolean;
        /** Error logs */
        errorLogEnabled?: boolean;
        /** Audit logs */
        auditLogEnabled?: boolean;
        /** Application logs */
        appLogEnabled?: boolean;
    };
    /** Advanced options */
    advancedOptions?: Record<string, string>;
    /** Tags for the domain */
    tags?: Record<string, string>;
}
/**
 * Configuration schema for OpenSearch Domain component
 */
export declare const OPENSEARCH_DOMAIN_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    properties: {
        domainName: {
            type: string;
            description: string;
            pattern: string;
            minLength: number;
            maxLength: number;
        };
        version: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        cluster: {
            type: string;
            description: string;
            properties: {
                instanceType: {
                    type: string;
                    description: string;
                    default: string;
                };
                instanceCount: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
                dedicatedMasterEnabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                masterInstanceType: {
                    type: string;
                    description: string;
                    default: string;
                };
                masterInstanceCount: {
                    type: string;
                    description: string;
                    enum: number[];
                    default: number;
                };
                warmEnabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                warmInstanceType: {
                    type: string;
                    description: string;
                    default: string;
                };
                warmInstanceCount: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
            };
            additionalProperties: boolean;
            default: {
                instanceType: string;
                instanceCount: number;
                dedicatedMasterEnabled: boolean;
            };
        };
        ebs: {
            type: string;
            description: string;
            properties: {
                enabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                volumeType: {
                    type: string;
                    description: string;
                    enum: string[];
                    default: string;
                };
                volumeSize: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
                iops: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                };
                throughput: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                };
            };
            additionalProperties: boolean;
            default: {
                enabled: boolean;
                volumeType: string;
                volumeSize: number;
            };
        };
        vpc: {
            type: string;
            description: string;
            properties: {
                vpcId: {
                    type: string;
                    description: string;
                };
                subnetIds: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                    };
                    minItems: number;
                    maxItems: number;
                };
                securityGroupIds: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                    };
                };
            };
            additionalProperties: boolean;
        };
        accessPolicies: {
            type: string;
            description: string;
            properties: {
                statements: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                        properties: {
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
                        additionalProperties: boolean;
                    };
                };
            };
            additionalProperties: boolean;
        };
        encryptionAtRest: {
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
        nodeToNodeEncryption: {
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
        domainEndpoint: {
            type: string;
            description: string;
            properties: {
                enforceHTTPS: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                tlsSecurityPolicy: {
                    type: string;
                    description: string;
                    enum: string[];
                    default: string;
                };
            };
            additionalProperties: boolean;
            default: {
                enforceHTTPS: boolean;
                tlsSecurityPolicy: string;
            };
        };
        advancedSecurity: {
            type: string;
            description: string;
            properties: {
                enabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                internalUserDatabaseEnabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                masterUserName: {
                    type: string;
                    description: string;
                };
                masterUserPassword: {
                    type: string;
                    description: string;
                };
            };
            additionalProperties: boolean;
            default: {
                enabled: boolean;
                internalUserDatabaseEnabled: boolean;
            };
        };
        logging: {
            type: string;
            description: string;
            properties: {
                slowSearchLogEnabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                slowIndexLogEnabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                errorLogEnabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                auditLogEnabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                appLogEnabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
            };
            additionalProperties: boolean;
            default: {
                slowSearchLogEnabled: boolean;
                slowIndexLogEnabled: boolean;
                errorLogEnabled: boolean;
                auditLogEnabled: boolean;
                appLogEnabled: boolean;
            };
        };
        advancedOptions: {
            type: string;
            description: string;
            additionalProperties: {
                type: string;
            };
            default: {};
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
        version: string;
        cluster: {
            instanceType: string;
            instanceCount: number;
            dedicatedMasterEnabled: boolean;
        };
        ebs: {
            enabled: boolean;
            volumeType: string;
            volumeSize: number;
        };
        encryptionAtRest: {
            enabled: boolean;
        };
        nodeToNodeEncryption: {
            enabled: boolean;
        };
        domainEndpoint: {
            enforceHTTPS: boolean;
            tlsSecurityPolicy: string;
        };
        advancedSecurity: {
            enabled: boolean;
            internalUserDatabaseEnabled: boolean;
        };
        logging: {
            slowSearchLogEnabled: boolean;
            slowIndexLogEnabled: boolean;
            errorLogEnabled: boolean;
            auditLogEnabled: boolean;
            appLogEnabled: boolean;
        };
        advancedOptions: {};
        tags: {};
    };
};
/**
 * Configuration builder for OpenSearch Domain component
 */
export declare class OpenSearchDomainConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    build(): Promise<OpenSearchDomainConfig>;
    buildSync(): OpenSearchDomainConfig;
    private mergeConfigs;
    private getPlatformDefaults;
    private getComplianceFrameworkDefaults;
    private getDefaultInstanceType;
    private getDefaultInstanceCount;
    private getDefaultDedicatedMaster;
    private getDefaultVolumeSize;
    private getDefaultLogging;
}
/**
 * OpenSearch Domain Component implementing Component API Contract v1.0
 */
export declare class OpenSearchDomainComponent extends Component {
    private domain?;
    private vpc?;
    private securityGroup?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    synth(): void;
    getCapabilities(): ComponentCapabilities;
    getType(): string;
    private lookupVpcIfNeeded;
    private createSecurityGroupIfNeeded;
    private createOpenSearchDomain;
    private mapOpenSearchVersion;
    private buildCapacityConfig;
    private buildEbsConfig;
    private mapVolumeType;
    private buildVpcConfig;
    private buildAccessPolicies;
    private buildDomainEndpointOptions;
    private mapTlsSecurityPolicy;
    private buildAdvancedSecurityConfig;
    private buildLoggingConfig;
    private createLogGroup;
    private buildDomainName;
    private getDomainRemovalPolicy;
    private getLogRetention;
    private getLogRemovalPolicy;
    private applyComplianceHardening;
    private applyCommercialHardening;
    private applyFedrampModerateHardening;
    private applyFedrampHighHardening;
    private buildDomainCapability;
    private configureObservabilityForDomain;
}
