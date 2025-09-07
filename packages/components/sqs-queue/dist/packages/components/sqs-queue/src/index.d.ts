/**
 * SQS Queue Component
 *
 * A managed message queue with compliance hardening and DLQ support.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
/**
 * Configuration interface for SQS Queue component
 */
export interface SqsQueueConfig {
    /** Queue name (optional, will be auto-generated if not provided) */
    queueName?: string;
    /** Visibility timeout in seconds */
    visibilityTimeoutSeconds?: number;
    /** Message retention period in seconds */
    messageRetentionPeriod?: number;
    /** Maximum message size in bytes */
    maxMessageSizeBytes?: number;
    /** Delivery delay in seconds */
    deliveryDelaySeconds?: number;
    /** Receive message wait time in seconds (long polling) */
    receiveMessageWaitTimeSeconds?: number;
    /** Dead letter queue configuration */
    deadLetterQueue?: {
        /** Enable dead letter queue */
        enabled: boolean;
        /** Maximum receive count before moving to DLQ */
        maxReceiveCount?: number;
    };
    /** FIFO queue configuration */
    fifo?: {
        /** Enable FIFO queue */
        enabled: boolean;
        /** Content-based deduplication */
        contentBasedDeduplication?: boolean;
        /** Deduplication scope */
        deduplicationScope?: 'messageGroup' | 'queue';
        /** FIFO throughput limit */
        fifoThroughputLimit?: 'perQueue' | 'perMessageGroupId';
    };
    /** Encryption configuration */
    encryption?: {
        /** Enable server-side encryption */
        enabled?: boolean;
        /** KMS key ARN for encryption */
        kmsKeyArn?: string;
        /** KMS data key reuse period in seconds */
        kmsDataKeyReusePeriodSeconds?: number;
    };
}
/**
 * Configuration schema for SQS Queue component
 */
export declare const SQS_QUEUE_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    properties: {
        queueName: {
            type: string;
            description: string;
            pattern: string;
            minLength: number;
            maxLength: number;
        };
        visibilityTimeoutSeconds: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            default: number;
        };
        messageRetentionPeriod: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            default: number;
        };
        maxMessageSizeBytes: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            default: number;
        };
        deliveryDelaySeconds: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            default: number;
        };
        receiveMessageWaitTimeSeconds: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            default: number;
        };
        deadLetterQueue: {
            type: string;
            description: string;
            properties: {
                enabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                maxReceiveCount: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
            };
            additionalProperties: boolean;
            default: {
                enabled: boolean;
                maxReceiveCount: number;
            };
        };
        fifo: {
            type: string;
            description: string;
            properties: {
                enabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                contentBasedDeduplication: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                deduplicationScope: {
                    type: string;
                    description: string;
                    enum: string[];
                    default: string;
                };
                fifoThroughputLimit: {
                    type: string;
                    description: string;
                    enum: string[];
                    default: string;
                };
            };
            additionalProperties: boolean;
            default: {
                enabled: boolean;
                contentBasedDeduplication: boolean;
                deduplicationScope: string;
                fifoThroughputLimit: string;
            };
        };
        encryption: {
            type: string;
            description: string;
            properties: {
                enabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                kmsKeyArn: {
                    type: string;
                    description: string;
                    pattern: string;
                };
                kmsDataKeyReusePeriodSeconds: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
            };
            additionalProperties: boolean;
            default: {
                enabled: boolean;
                kmsDataKeyReusePeriodSeconds: number;
            };
        };
    };
    additionalProperties: boolean;
    defaults: {
        visibilityTimeoutSeconds: number;
        messageRetentionPeriod: number;
        maxMessageSizeBytes: number;
        deliveryDelaySeconds: number;
        receiveMessageWaitTimeSeconds: number;
        deadLetterQueue: {
            enabled: boolean;
            maxReceiveCount: number;
        };
        fifo: {
            enabled: boolean;
            contentBasedDeduplication: boolean;
            deduplicationScope: string;
            fifoThroughputLimit: string;
        };
        encryption: {
            enabled: boolean;
            kmsDataKeyReusePeriodSeconds: number;
        };
    };
};
/**
 * Configuration builder for SQS Queue component
 */
export declare class SqsQueueConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
     */
    build(): Promise<SqsQueueConfig>;
    /**
     * Synchronous version of build for use in synth() method
     */
    buildSync(): SqsQueueConfig;
    /**
     * Simple merge utility for combining configuration objects
     */
    private mergeConfigs;
    /**
     * Get platform-wide defaults for SQS Queue
     */
    private getPlatformDefaults;
    /**
     * Get compliance framework specific defaults
     */
    private getComplianceFrameworkDefaults;
    /**
     * Get default visibility timeout based on compliance framework
     */
    private getDefaultVisibilityTimeout;
    /**
     * Get default message retention based on compliance framework
     */
    private getDefaultMessageRetention;
    /**
     * Get default long polling setting
     */
    private getDefaultLongPolling;
    /**
     * Get default DLQ enabled setting
     */
    private getDefaultDLQEnabled;
    /**
     * Get default max receive count for DLQ
     */
    private getDefaultMaxReceiveCount;
    /**
     * Get default encryption enabled setting
     */
    private getDefaultEncryptionEnabled;
}
/**
 * SQS Queue Component implementing Component API Contract v1.0
 */
export declare class SqsQueueComponent extends Component {
    private queue?;
    private deadLetterQueue?;
    private kmsKey?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create SQS queue with compliance hardening
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
     * Create KMS key for encryption if required by compliance framework
     */
    private createKmsKeyIfNeeded;
    /**
     * Create dead letter queue if enabled
     */
    private createDeadLetterQueueIfNeeded;
    /**
     * Create the main SQS queue
     */
    private createQueue;
    /**
     * Apply compliance-specific hardening
     */
    private applyComplianceHardening;
    private applyCommercialHardening;
    private applyFedrampModerateHardening;
    private applyFedrampHighHardening;
    /**
     * Build queue capability data shape
     */
    private buildQueueCapability;
    /**
     * Helper methods for compliance decisions
     */
    private shouldUseCustomerManagedKey;
    private isComplianceFramework;
    private getQueueEncryption;
    private buildQueueName;
    /**
     * Configure OpenTelemetry observability for SQS queue monitoring according to Platform Observability Standard
     */
    private configureObservabilityForQueue;
    /**
     * Create CloudWatch alarms for comprehensive queue monitoring
     */
    private createQueueMonitoringAlarms;
    /**
     * Configure message tracing for distributed observability
     */
    private configureMessageTracing;
    /**
     * Get alarm thresholds based on compliance framework requirements
     */
    private getQueueAlarmThresholds;
}
//# sourceMappingURL=index.d.ts.map