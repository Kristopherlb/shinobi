/**
 * DynamoDB Table Component implementing Component API Contract v1.0
 *
 * A managed NoSQL database table with comprehensive compliance hardening.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '../../../platform/contracts/src';
/**
 * Configuration interface for DynamoDB Table component
 */
export interface DynamoDbTableConfig {
    /** Table name (optional, defaults to component name) */
    tableName?: string;
    /** Partition key configuration */
    partitionKey: {
        name: string;
        type: 'string' | 'number' | 'binary';
    };
    /** Sort key configuration (optional) */
    sortKey?: {
        name: string;
        type: 'string' | 'number' | 'binary';
    };
    /** Billing mode */
    billingMode?: 'pay-per-request' | 'provisioned';
    /** Provisioned throughput (required if billingMode is provisioned) */
    provisioned?: {
        readCapacity: number;
        writeCapacity: number;
    };
    /** Global Secondary Indexes */
    globalSecondaryIndexes?: Array<{
        indexName: string;
        partitionKey: {
            name: string;
            type: 'string' | 'number' | 'binary';
        };
        sortKey?: {
            name: string;
            type: 'string' | 'number' | 'binary';
        };
        projectionType?: 'all' | 'keys-only' | 'include';
        nonKeyAttributes?: string[];
        provisioned?: {
            readCapacity: number;
            writeCapacity: number;
        };
    }>;
    /** Local Secondary Indexes */
    localSecondaryIndexes?: Array<{
        indexName: string;
        sortKey: {
            name: string;
            type: 'string' | 'number' | 'binary';
        };
        projectionType?: 'all' | 'keys-only' | 'include';
        nonKeyAttributes?: string[];
    }>;
    /** Time to Live configuration */
    timeToLive?: {
        attributeName: string;
    };
    /** Stream configuration */
    stream?: {
        viewType: 'keys-only' | 'new-image' | 'old-image' | 'new-and-old-images';
    };
    /** Point-in-time recovery */
    pointInTimeRecovery?: boolean;
    /** Encryption configuration */
    encryption?: {
        type: 'aws-managed' | 'customer-managed';
        kmsKeyArn?: string;
    };
    /** Backup configuration */
    backup?: {
        enabled?: boolean;
        retentionPeriod?: number;
    };
    /** Tags for the table */
    tags?: Record<string, string>;
}
/**
 * Configuration schema for DynamoDB Table component
 */
export declare const DYNAMODB_TABLE_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    required: string[];
    properties: {
        tableName: {
            type: string;
            description: string;
            pattern: string;
            minLength: number;
            maxLength: number;
        };
        partitionKey: {
            type: string;
            description: string;
            required: string[];
            properties: {
                name: {
                    type: string;
                    description: string;
                    pattern: string;
                    minLength: number;
                    maxLength: number;
                };
                type: {
                    type: string;
                    description: string;
                    enum: string[];
                    default: string;
                };
            };
        };
        sortKey: {
            type: string;
            description: string;
            required: string[];
            properties: {
                name: {
                    type: string;
                    description: string;
                    pattern: string;
                    minLength: number;
                    maxLength: number;
                };
                type: {
                    type: string;
                    description: string;
                    enum: string[];
                    default: string;
                };
            };
        };
        billingMode: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        provisioned: {
            type: string;
            description: string;
            required: string[];
            properties: {
                readCapacity: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
                writeCapacity: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
            };
        };
        globalSecondaryIndexes: {
            type: string;
            description: string;
            items: {
                type: string;
                required: string[];
                properties: {
                    indexName: {
                        type: string;
                        description: string;
                        pattern: string;
                        minLength: number;
                        maxLength: number;
                    };
                    partitionKey: {
                        type: string;
                        description: string;
                        required: string[];
                        properties: {
                            name: {
                                type: string;
                                pattern: string;
                            };
                            type: {
                                type: string;
                                enum: string[];
                            };
                        };
                    };
                    sortKey: {
                        type: string;
                        description: string;
                        required: string[];
                        properties: {
                            name: {
                                type: string;
                                pattern: string;
                            };
                            type: {
                                type: string;
                                enum: string[];
                            };
                        };
                    };
                    projectionType: {
                        type: string;
                        description: string;
                        enum: string[];
                        default: string;
                    };
                };
            };
        };
        pointInTimeRecovery: {
            type: string;
            description: string;
            default: boolean;
        };
        encryption: {
            type: string;
            description: string;
            properties: {
                type: {
                    type: string;
                    description: string;
                    enum: string[];
                    default: string;
                };
                kmsKeyArn: {
                    type: string;
                    description: string;
                    pattern: string;
                };
            };
        };
        stream: {
            type: string;
            description: string;
            properties: {
                viewType: {
                    type: string;
                    description: string;
                    enum: string[];
                    default: string;
                };
            };
        };
    };
    additionalProperties: boolean;
};
/**
 * Configuration builder for DynamoDB Table component
 */
export declare class DynamoDbTableConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
     */
    build(): Promise<DynamoDbTableConfig>;
    /**
     * Synchronous version of build for use in synth() method
     */
    buildSync(): DynamoDbTableConfig;
    /**
     * Simple merge utility for combining configuration objects
     */
    private mergeConfigs;
    /**
     * Get platform-wide defaults for DynamoDB Table
     */
    private getPlatformDefaults;
    /**
     * Get compliance framework specific defaults
     */
    private getComplianceFrameworkDefaults;
    /**
     * Apply feature flag-driven configuration overrides
     */
    private applyFeatureFlagOverrides;
    /**
     * Evaluate a feature flag with fallback to default value
     */
    private evaluateFeatureFlag;
}
/**
 * DynamoDB Table Component implementing Component API Contract v1.0
 */
export declare class DynamoDbTableComponent extends Component {
    private table?;
    private kmsKey?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create DynamoDB table with compliance hardening
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
     * Create KMS key for customer-managed encryption if needed
     */
    private createKmsKeyIfNeeded;
    /**
     * Create DynamoDB table with configuration
     */
    private createDynamoDbTable;
    /**
     * Build attribute definition for keys
     */
    private buildAttribute;
    /**
     * Map string attribute type to DynamoDB attribute type
     */
    private mapAttributeType;
    /**
     * Build encryption specification
     */
    private buildEncryptionSpec;
    /**
     * Map stream view type string to DynamoDB enum
     */
    private mapStreamViewType;
    /**
     * Add Global Secondary Indexes to the table
     */
    private addGlobalSecondaryIndexes;
    /**
     * Add Local Secondary Indexes to the table
     */
    private addLocalSecondaryIndexes;
    /**
     * Map projection type string to DynamoDB enum
     */
    private mapProjectionType;
    /**
     * Build KMS key policy for DynamoDB encryption
     */
    private buildKmsKeyPolicy;
    /**
     * Build DynamoDB capability data shape
     */
    private buildDynamoDbCapability;
    /**
     * Configure OpenTelemetry Observability Standard - CloudWatch Alarms for DynamoDB Table
     */
    private configureObservabilityForTable;
    /**
     * Apply compliance hardening with auto-scaling for FedRAMP environments
     */
    private applyComplianceHardening;
    /**
     * Apply FedRAMP High compliance hardening with mandatory auto-scaling
     */
    private applyFedrampHighHardening;
    /**
     * Apply FedRAMP Moderate compliance hardening with auto-scaling
     */
    private applyFedrampModerateHardening;
    /**
     * Apply commercial hardening
     */
    private applyCommercialHardening;
    /**
     * Configure auto-scaling for provisioned throughput to prevent throttling
     */
    private configureAutoScaling;
    /**
     * Enable auto-scaling for table read/write capacity
     */
    private enableTableAutoScaling;
    /**
     * Enable auto-scaling for GSI read/write capacity
     */
    private enableGsiAutoScaling;
    /**
     * Check if table is using provisioned billing mode
     */
    private isProvisionedMode;
    /**
     * Check if this is a compliance framework
     */
    private isComplianceFramework;
}
