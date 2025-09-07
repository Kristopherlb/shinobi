/**
 * SNS Topic Component
 *
 * A pub/sub topic with compliance hardening and subscription management.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
/**
 * Configuration interface for SNS Topic component
 */
export interface SnsTopicConfig {
    /** Topic name (optional, will be auto-generated if not provided) */
    topicName?: string;
    /** Display name for the topic */
    displayName?: string;
    /** FIFO topic configuration */
    fifo?: {
        /** Enable FIFO topic */
        enabled: boolean;
        /** Content-based deduplication */
        contentBasedDeduplication?: boolean;
    };
    /** Encryption configuration */
    encryption?: {
        /** Enable server-side encryption */
        enabled?: boolean;
        /** KMS key ARN for encryption */
        kmsKeyArn?: string;
    };
    /** Delivery policy configuration */
    deliveryPolicy?: {
        /** HTTP retry policy */
        http?: {
            defaultHealthyRetryPolicy?: {
                numRetries?: number;
                numMinDelayRetries?: number;
                minDelayTarget?: number;
                maxDelayTarget?: number;
                numMaxDelayRetries?: number;
                backoffFunction?: 'linear' | 'arithmetic' | 'geometric' | 'exponential';
            };
        };
    };
    /** Message filtering policy */
    messageFilterPolicy?: Record<string, any>;
    /** Tracing configuration */
    tracingConfig?: {
        /** Enable X-Ray tracing */
        enabled?: boolean;
    };
}
/**
 * Configuration schema for SNS Topic component
 */
export declare const SNS_TOPIC_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    properties: {
        topicName: {
            type: string;
            description: string;
            pattern: string;
            minLength: number;
            maxLength: number;
        };
        displayName: {
            type: string;
            description: string;
            maxLength: number;
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
            };
            additionalProperties: boolean;
            default: {
                enabled: boolean;
                contentBasedDeduplication: boolean;
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
            };
            additionalProperties: boolean;
            default: {
                enabled: boolean;
            };
        };
        deliveryPolicy: {
            type: string;
            description: string;
            properties: {
                http: {
                    type: string;
                    description: string;
                    properties: {
                        defaultHealthyRetryPolicy: {
                            type: string;
                            description: string;
                            properties: {
                                numRetries: {
                                    type: string;
                                    description: string;
                                    minimum: number;
                                    maximum: number;
                                    default: number;
                                };
                                numMinDelayRetries: {
                                    type: string;
                                    description: string;
                                    minimum: number;
                                    maximum: number;
                                    default: number;
                                };
                                minDelayTarget: {
                                    type: string;
                                    description: string;
                                    minimum: number;
                                    maximum: number;
                                    default: number;
                                };
                                maxDelayTarget: {
                                    type: string;
                                    description: string;
                                    minimum: number;
                                    maximum: number;
                                    default: number;
                                };
                                numMaxDelayRetries: {
                                    type: string;
                                    description: string;
                                    minimum: number;
                                    maximum: number;
                                    default: number;
                                };
                                backoffFunction: {
                                    type: string;
                                    description: string;
                                    enum: string[];
                                    default: string;
                                };
                            };
                            additionalProperties: boolean;
                            default: {
                                numRetries: number;
                                numMinDelayRetries: number;
                                minDelayTarget: number;
                                maxDelayTarget: number;
                                numMaxDelayRetries: number;
                                backoffFunction: string;
                            };
                        };
                    };
                    additionalProperties: boolean;
                };
            };
            additionalProperties: boolean;
        };
        messageFilterPolicy: {
            type: string;
            description: string;
            additionalProperties: boolean;
        };
        tracingConfig: {
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
    };
    additionalProperties: boolean;
    defaults: {
        fifo: {
            enabled: boolean;
            contentBasedDeduplication: boolean;
        };
        encryption: {
            enabled: boolean;
        };
        tracingConfig: {
            enabled: boolean;
        };
    };
};
/**
 * Configuration builder for SNS Topic component
 */
export declare class SnsTopicConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
     */
    build(): Promise<SnsTopicConfig>;
    /**
     * Synchronous version of build for use in synth() method
     */
    buildSync(): SnsTopicConfig;
    /**
     * Simple merge utility for combining configuration objects
     */
    private mergeConfigs;
    /**
     * Get platform-wide defaults for SNS Topic
     */
    private getPlatformDefaults;
    /**
     * Get compliance framework specific defaults
     */
    private getComplianceFrameworkDefaults;
    /**
     * Get default encryption enabled setting
     */
    private getDefaultEncryptionEnabled;
    /**
     * Get default tracing enabled setting
     */
    private getDefaultTracingEnabled;
    /**
     * Get default delivery policy based on compliance framework
     */
    private getDefaultDeliveryPolicy;
}
/**
 * SNS Topic Component implementing Component API Contract v1.0
 */
export declare class SnsTopicComponent extends Component {
    private topic?;
    private kmsKey?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create SNS topic with compliance hardening
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
     * Create the SNS topic
     */
    private createTopic;
    /**
     * Apply compliance-specific hardening
     */
    private applyComplianceHardening;
    private applyCommercialHardening;
    private applyFedrampModerateHardening;
    private applyFedrampHighHardening;
    /**
     * Build topic capability data shape
     */
    private buildTopicCapability;
    /**
     * Helper methods for compliance decisions
     */
    private shouldUseCustomerManagedKey;
    private buildTopicName;
}
//# sourceMappingURL=sns-topic.component.d.ts.map