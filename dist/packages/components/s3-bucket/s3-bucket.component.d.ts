/**
 * S3 Bucket Component
 *
 * An Amazon S3 bucket for object storage with compliance hardening.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
/**
 * Configuration interface for S3 Bucket component
 */
export interface S3BucketConfig {
    /** Bucket name (optional, will be auto-generated if not provided) */
    bucketName?: string;
    /** Whether the bucket allows public access */
    public?: boolean;
    /** Static website hosting configuration */
    website?: {
        enabled: boolean;
        indexDocument?: string;
        errorDocument?: string;
    };
    /** Enable EventBridge notifications */
    eventBridgeEnabled?: boolean;
    /** Versioning configuration */
    versioning?: boolean;
    /** Encryption configuration */
    encryption?: {
        type?: 'AES256' | 'KMS';
        kmsKeyArn?: string;
    };
    /** Lifecycle rules */
    lifecycleRules?: Array<{
        id: string;
        enabled: boolean;
        transitions?: Array<{
            storageClass: string;
            transitionAfter: number;
        }>;
        expiration?: {
            days: number;
        };
    }>;
    /** Security tooling configuration */
    security?: {
        tools?: {
            clamavScan?: boolean;
        };
    };
    /** Backup and compliance settings */
    compliance?: {
        objectLock?: {
            enabled: boolean;
            mode?: 'GOVERNANCE' | 'COMPLIANCE';
            retentionDays?: number;
        };
        auditLogging?: boolean;
    };
}
/**
 * Configuration schema for S3 Bucket component
 */
export declare const S3_BUCKET_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    properties: {
        bucketName: {
            type: string;
            description: string;
            pattern: string;
            minLength: number;
            maxLength: number;
        };
        public: {
            type: string;
            description: string;
            default: boolean;
        };
        website: {
            type: string;
            description: string;
            properties: {
                enabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                indexDocument: {
                    type: string;
                    description: string;
                    default: string;
                };
                errorDocument: {
                    type: string;
                    description: string;
                    default: string;
                };
            };
            additionalProperties: boolean;
            default: {
                enabled: boolean;
                indexDocument: string;
                errorDocument: string;
            };
        };
        eventBridgeEnabled: {
            type: string;
            description: string;
            default: boolean;
        };
        versioning: {
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
            additionalProperties: boolean;
            default: {
                type: string;
            };
        };
        lifecycleRules: {
            type: string;
            description: string;
            items: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        description: string;
                    };
                    enabled: {
                        type: string;
                        description: string;
                        default: boolean;
                    };
                    transitions: {
                        type: string;
                        description: string;
                        items: {
                            type: string;
                            properties: {
                                storageClass: {
                                    type: string;
                                    description: string;
                                    enum: string[];
                                };
                                transitionAfter: {
                                    type: string;
                                    description: string;
                                    minimum: number;
                                };
                            };
                            required: string[];
                            additionalProperties: boolean;
                        };
                    };
                    expiration: {
                        type: string;
                        description: string;
                        properties: {
                            days: {
                                type: string;
                                description: string;
                                minimum: number;
                            };
                        };
                        required: string[];
                        additionalProperties: boolean;
                    };
                };
                required: string[];
                additionalProperties: boolean;
            };
            default: never[];
        };
        security: {
            type: string;
            description: string;
            properties: {
                tools: {
                    type: string;
                    description: string;
                    properties: {
                        clamavScan: {
                            type: string;
                            description: string;
                            default: boolean;
                        };
                    };
                    additionalProperties: boolean;
                    default: {
                        clamavScan: boolean;
                    };
                };
            };
            additionalProperties: boolean;
            default: {
                tools: {
                    clamavScan: boolean;
                };
            };
        };
        compliance: {
            type: string;
            description: string;
            properties: {
                objectLock: {
                    type: string;
                    description: string;
                    properties: {
                        enabled: {
                            type: string;
                            description: string;
                            default: boolean;
                        };
                        mode: {
                            type: string;
                            description: string;
                            enum: string[];
                            default: string;
                        };
                        retentionDays: {
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
                        mode: string;
                        retentionDays: number;
                    };
                };
                auditLogging: {
                    type: string;
                    description: string;
                    default: boolean;
                };
            };
            additionalProperties: boolean;
            default: {
                objectLock: {
                    enabled: boolean;
                    mode: string;
                    retentionDays: number;
                };
                auditLogging: boolean;
            };
        };
    };
    additionalProperties: boolean;
    defaults: {
        public: boolean;
        website: {
            enabled: boolean;
            indexDocument: string;
            errorDocument: string;
        };
        eventBridgeEnabled: boolean;
        versioning: boolean;
        encryption: {
            type: string;
        };
        lifecycleRules: never[];
        security: {
            tools: {
                clamavScan: boolean;
            };
        };
        compliance: {
            objectLock: {
                enabled: boolean;
                mode: string;
                retentionDays: number;
            };
            auditLogging: boolean;
        };
    };
};
/**
 * Configuration builder for S3 Bucket component
 */
export declare class S3BucketConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
     */
    build(): Promise<S3BucketConfig>;
    /**
     * Synchronous version of build for use in synth() method
     */
    buildSync(): S3BucketConfig;
    /**
     * Simple merge utility for combining configuration objects
     */
    private mergeConfigs;
    /**
     * Get platform-wide defaults for S3 Bucket
     */
    private getPlatformDefaults;
    /**
     * Get compliance framework specific defaults
     */
    private getComplianceFrameworkDefaults;
    /**
     * Get default versioning setting based on compliance framework
     */
    private getDefaultVersioning;
    /**
     * Get default encryption type based on compliance framework
     */
    private getDefaultEncryptionType;
    /**
     * Get default ClamAV scanning setting
     */
    private getDefaultClamAVEnabled;
    /**
     * Get default Object Lock setting
     */
    private getDefaultObjectLockEnabled;
    /**
     * Get default retention days based on compliance framework
     */
    private getDefaultRetentionDays;
    /**
     * Get default audit logging setting
     */
    private getDefaultAuditLogging;
    /**
     * Get default lifecycle rules based on compliance framework
     */
    private getDefaultLifecycleRules;
}
/**
 * S3 Bucket Component implementing Component API Contract v1.0
 */
export declare class S3BucketComponent extends Component {
    private bucket?;
    private kmsKey?;
    private auditBucket?;
    private virusScanLambda?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create S3 bucket with compliance hardening
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
     * Create audit bucket for centralized logging in compliance frameworks
     */
    private createAuditBucketIfNeeded;
    /**
     * Create the main S3 bucket with compliance-specific configuration
     */
    private createS3Bucket;
    /**
     * Apply compliance-specific hardening
     */
    private applyComplianceHardening;
    private applyCommercialHardening;
    private applyFedrampModerateHardening;
    private applyFedrampHighHardening;
    /**
     * Configure security tooling integration
     */
    private configureSecurityTooling;
    /**
     * Create Lambda function for virus scanning with ClamAV
     */
    private createVirusScanLambda;
    /**
     * Build bucket capability data shape
     */
    private buildBucketCapability;
    /**
     * Helper methods for compliance decisions
     */
    private shouldUseCustomerManagedKey;
    private isComplianceFramework;
    private getBucketEncryption;
    private getStorageClass;
    /**
     * Configure CloudWatch observability for S3 Bucket
     */
    private configureObservabilityForS3;
}
