/**
 * Kinesis Stream Component implementing Component API Contract v1.0
 *
 * A managed high-throughput, real-time data ingestion service.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
/**
 * Configuration interface for Kinesis Stream component
 */
export interface KinesisStreamConfig {
    /** Stream name (optional, defaults to component name) */
    streamName?: string;
    /** Number of shards for the stream */
    shardCount: number;
    /** Data retention period in hours */
    retentionPeriod?: number;
    /** Encryption configuration */
    encryption?: {
        type: 'none' | 'kms';
        kmsKeyId?: string;
    };
    /** Monitoring configuration */
    monitoring?: {
        enabled?: boolean;
        enhancedMetrics?: boolean;
        alarms?: {
            iteratorAgeThreshold?: number;
            readThroughputThreshold?: number;
            writeThroughputThreshold?: number;
        };
    };
    /** Tags for the stream */
    tags?: Record<string, string>;
}
/**
 * JSON Schema for Kinesis Stream configuration
 */
export declare const KINESIS_STREAM_CONFIG_SCHEMA: {
    type: string;
    properties: {
        streamName: {
            type: string;
            pattern: string;
            maxLength: number;
        };
        shardCount: {
            type: string;
            minimum: number;
            maximum: number;
        };
        retentionPeriod: {
            type: string;
            minimum: number;
            maximum: number;
        };
        encryption: {
            type: string;
            properties: {
                type: {
                    type: string;
                    enum: string[];
                };
                kmsKeyId: {
                    type: string;
                };
            };
            required: string[];
        };
        monitoring: {
            type: string;
            properties: {
                enabled: {
                    type: string;
                };
                enhancedMetrics: {
                    type: string;
                };
                alarms: {
                    type: string;
                    properties: {
                        iteratorAgeThreshold: {
                            type: string;
                            minimum: number;
                        };
                        readThroughputThreshold: {
                            type: string;
                            minimum: number;
                        };
                        writeThroughputThreshold: {
                            type: string;
                            minimum: number;
                        };
                    };
                };
            };
        };
        tags: {
            type: string;
            additionalProperties: {
                type: string;
            };
        };
    };
    required: string[];
    additionalProperties: boolean;
};
/**
 * ConfigBuilder for Kinesis Stream component
 */
export declare class KinesisStreamConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Asynchronous build method - delegates to synchronous implementation
     */
    build(): Promise<KinesisStreamConfig>;
    /**
     * Synchronous version of build for use in synth() method
     */
    buildSync(): KinesisStreamConfig;
    /**
     * Simple merge utility for combining configuration objects
     */
    private mergeConfigs;
    /**
     * Get platform-wide defaults with intelligent configuration
     */
    private getPlatformDefaults;
    /**
     * Get compliance framework-specific defaults
     */
    private getComplianceFrameworkDefaults;
    /**
     * Get default retention period based on compliance framework
     */
    private getDefaultRetentionPeriod;
    /**
     * Determine if encryption should be enabled by default
     */
    private shouldEnableEncryption;
    /**
     * Determine if enhanced metrics should be enabled by default
     */
    private shouldEnableEnhancedMetrics;
    /**
     * Get default iterator age threshold based on compliance framework
     */
    private getDefaultIteratorAgeThreshold;
}
/**
 * Kinesis Stream Component implementing Component API Contract v1.0
 */
export declare class KinesisStreamComponent extends Component {
    private stream?;
    private kmsKey?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create Kinesis stream with compliance hardening
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
     * Create KMS key for encryption if needed
     */
    private createKmsKeyIfNeeded;
    /**
     * Create Kinesis stream
     */
    private createKinesisStream;
    /**
     * Configure CloudWatch observability for Kinesis stream
     */
    private configureKinesisObservability;
    /**
     * Apply compliance hardening based on framework
     */
    private applyComplianceHardening;
    /**
     * Build Kinesis capability descriptor
     */
    private buildKinesisCapability;
}
