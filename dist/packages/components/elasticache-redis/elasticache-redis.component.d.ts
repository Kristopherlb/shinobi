/**
 * ElastiCache Redis Component implementing Component API Contract v1.0
 *
 * A managed Redis cluster for high-performance in-memory caching.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '../../../platform/contracts/src';
/**
 * Configuration interface for ElastiCache Redis component
 */
export interface ElastiCacheRedisConfig {
    /** Cluster name (optional, defaults to component name) */
    clusterName?: string;
    /** Redis engine version */
    engineVersion?: string;
    /** Node type for the Redis cluster */
    nodeType?: string;
    /** Number of cache nodes */
    numCacheNodes?: number;
    /** Port for Redis access */
    port?: number;
    /** VPC configuration */
    vpc?: {
        vpcId?: string;
        subnetIds?: string[];
        subnetGroupName?: string;
    };
    /** Security group configuration */
    securityGroups?: {
        create?: boolean;
        securityGroupIds?: string[];
        allowedCidrs?: string[];
    };
    /** Parameter group configuration */
    parameterGroup?: {
        family?: string;
        parameters?: Record<string, string>;
    };
    /** Encryption configuration */
    encryption?: {
        atRest?: boolean;
        inTransit?: boolean;
        authTokenEnabled?: boolean;
    };
    /** Backup configuration */
    backup?: {
        enabled?: boolean;
        retentionPeriod?: number;
        window?: string;
    };
    /** Maintenance configuration */
    maintenance?: {
        window?: string;
        notificationTopicArn?: string;
    };
    /** Monitoring configuration */
    monitoring?: {
        enabled?: boolean;
        logDeliveryConfigurations?: Array<{
            logType: 'slow-log' | 'engine-log';
            destinationType: 'cloudwatch-logs' | 'kinesis-firehose';
            destinationName: string;
            logFormat?: 'text' | 'json';
        }>;
    };
    /** Multi-AZ configuration */
    multiAz?: {
        enabled?: boolean;
        automaticFailover?: boolean;
    };
    /** Tags for the cluster */
    tags?: Record<string, string>;
}
/**
 * Configuration schema for ElastiCache Redis component
 */
export declare const ELASTICACHE_REDIS_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    properties: {
        clusterName: {
            type: string;
            description: string;
            pattern: string;
            minLength: number;
            maxLength: number;
        };
        engineVersion: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        nodeType: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        numCacheNodes: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            default: number;
        };
        port: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            default: number;
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
                        pattern: string;
                    };
                    minItems: number;
                };
                subnetGroupName: {
                    type: string;
                    description: string;
                };
            };
        };
        securityGroups: {
            type: string;
            description: string;
            properties: {
                create: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                securityGroupIds: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                        pattern: string;
                    };
                };
                allowedCidrs: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                        pattern: string;
                    };
                    default: string[];
                };
            };
        };
        parameterGroup: {
            type: string;
            description: string;
            properties: {
                family: {
                    type: string;
                    description: string;
                    enum: string[];
                    default: string;
                };
                parameters: {
                    type: string;
                    description: string;
                    additionalProperties: {
                        type: string;
                    };
                };
            };
        };
        encryption: {
            type: string;
            description: string;
            properties: {
                atRest: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                inTransit: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                authTokenEnabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
            };
        };
        backup: {
            type: string;
            description: string;
            properties: {
                enabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                retentionPeriod: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
                window: {
                    type: string;
                    description: string;
                    pattern: string;
                    default: string;
                };
            };
        };
        maintenance: {
            type: string;
            description: string;
            properties: {
                window: {
                    type: string;
                    description: string;
                    pattern: string;
                    default: string;
                };
                notificationTopicArn: {
                    type: string;
                    description: string;
                };
            };
        };
        multiAz: {
            type: string;
            description: string;
            properties: {
                enabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                automaticFailover: {
                    type: string;
                    description: string;
                    default: boolean;
                };
            };
        };
        monitoring: {
            type: string;
            description: string;
            properties: {
                enabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                logDeliveryConfigurations: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                        required: string[];
                        properties: {
                            logType: {
                                type: string;
                                description: string;
                                enum: string[];
                            };
                            destinationType: {
                                type: string;
                                description: string;
                                enum: string[];
                            };
                            destinationName: {
                                type: string;
                                description: string;
                            };
                            logFormat: {
                                type: string;
                                description: string;
                                enum: string[];
                                default: string;
                            };
                        };
                    };
                };
            };
        };
    };
    additionalProperties: boolean;
};
/**
 * Configuration builder for ElastiCache Redis component
 */
export declare class ElastiCacheRedisConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
     */
    build(): Promise<ElastiCacheRedisConfig>;
    /**
     * Synchronous version of build for use in synth() method
     */
    buildSync(): ElastiCacheRedisConfig;
    /**
     * Simple merge utility for combining configuration objects
     */
    private mergeConfigs;
    /**
     * Get platform-wide defaults for ElastiCache Redis
     */
    private getPlatformDefaults;
    /**
     * Get compliance framework specific defaults
     */
    private getComplianceFrameworkDefaults;
}
/**
 * ElastiCache Redis Component implementing Component API Contract v1.0
 */
export declare class ElastiCacheRedisComponent extends Component {
    private replicationGroup?;
    private subnetGroup?;
    private securityGroup?;
    private parameterGroup?;
    private authToken?;
    private vpc?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create ElastiCache Redis cluster with compliance hardening
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
     * Lookup VPC from configuration or use default
     */
    private lookupVpc;
    /**
     * Create auth token secret if auth is enabled
     */
    private createAuthTokenIfNeeded;
    /**
     * Create parameter group for Redis configuration
     */
    private createParameterGroup;
    /**
     * Create subnet group for Redis cluster
     */
    private createSubnetGroup;
    /**
     * Create security group for Redis cluster if needed
     */
    private createSecurityGroupIfNeeded;
    /**
     * Create Redis replication group
     */
    private createRedisCluster;
    /**
     * Get security group IDs for the cluster
     */
    private getSecurityGroupIds;
    /**
     * Build log delivery configurations
     */
    private buildLogDeliveryConfigurations;
    /**
     * Build Redis capability data shape
     */
    private buildRedisCapability;
    /**
     * Apply compliance hardening based on framework
     */
    private applyComplianceHardening;
    /**
     * Apply FedRAMP High compliance hardening
     */
    private applyFedrampHighHardening;
    /**
     * Apply FedRAMP Moderate compliance hardening
     */
    private applyFedrampModerateHardening;
    /**
     * Apply commercial hardening
     */
    private applyCommercialHardening;
    /**
     * Configure CloudWatch observability for ElastiCache Redis
     */
    private configureObservabilityForRedis;
    /**
     * Check if this is a compliance framework
     */
    private isComplianceFramework;
}
