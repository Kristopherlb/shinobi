/**
 * Secrets Manager Component
 *
 * AWS Secrets Manager for secure storage and retrieval of sensitive information.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
/**
 * Configuration interface for Secrets Manager component
 */
export interface SecretsManagerConfig {
    /** Secret name (optional, will be auto-generated if not provided) */
    secretName?: string;
    /** Secret description */
    description?: string;
    /** Initial secret value (for string secrets) */
    secretValue?: {
        /** Secret string value */
        secretStringValue?: string;
        /** Secret binary value */
        secretBinaryValue?: Buffer;
    };
    /** Generate secret automatically */
    generateSecret?: {
        enabled: boolean;
        /** Characters to exclude from generated secret */
        excludeCharacters?: string;
        /** Include space in generated secret */
        includeSpace?: boolean;
        /** Password length */
        passwordLength?: number;
        /** Require each included type */
        requireEachIncludedType?: boolean;
        /** Secret string template */
        secretStringTemplate?: string;
        /** Generate string key */
        generateStringKey?: string;
    };
    /** Automatic rotation configuration */
    automaticRotation?: {
        enabled: boolean;
        /** Lambda function for rotation */
        rotationLambda?: {
            functionArn?: string;
            /** Create rotation Lambda automatically */
            createFunction?: boolean;
            runtime?: string;
        };
        /** Rotation schedule */
        schedule?: {
            /** Rotation interval in days */
            automaticallyAfterDays?: number;
        };
    };
    /** Replica configuration for multi-region */
    replicas?: Array<{
        region: string;
        kmsKeyArn?: string;
    }>;
    /** Encryption configuration */
    encryption?: {
        /** KMS key ARN for encryption */
        kmsKeyArn?: string;
    };
    /** Recovery configuration */
    recovery?: {
        /** Deletion protection */
        deletionProtection?: boolean;
        /** Recovery window in days */
        recoveryWindowInDays?: number;
    };
}
/**
 * Configuration schema for Secrets Manager component
 */
export declare const SECRETS_MANAGER_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    properties: {
        secretName: {
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
        secretValue: {
            type: string;
            description: string;
            properties: {
                secretStringValue: {
                    type: string;
                    description: string;
                };
            };
            additionalProperties: boolean;
        };
        generateSecret: {
            type: string;
            description: string;
            properties: {
                enabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                excludeCharacters: {
                    type: string;
                    description: string;
                    default: string;
                };
                includeSpace: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                passwordLength: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
                requireEachIncludedType: {
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
        automaticRotation: {
            type: string;
            description: string;
            properties: {
                enabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                rotationLambda: {
                    type: string;
                    description: string;
                    properties: {
                        createFunction: {
                            type: string;
                            description: string;
                            default: boolean;
                        };
                        runtime: {
                            type: string;
                            description: string;
                            enum: string[];
                            default: string;
                        };
                    };
                };
                schedule: {
                    type: string;
                    description: string;
                    properties: {
                        automaticallyAfterDays: {
                            type: string;
                            description: string;
                            minimum: number;
                            maximum: number;
                            default: number;
                        };
                    };
                };
            };
            additionalProperties: boolean;
            default: {
                enabled: boolean;
            };
        };
        replicas: {
            type: string;
            description: string;
            items: {
                type: string;
                properties: {
                    region: {
                        type: string;
                        description: string;
                    };
                    kmsKeyArn: {
                        type: string;
                        description: string;
                    };
                };
                required: string[];
                additionalProperties: boolean;
            };
            default: never[];
        };
        encryption: {
            type: string;
            description: string;
            properties: {
                kmsKeyArn: {
                    type: string;
                    description: string;
                };
            };
            additionalProperties: boolean;
        };
        recovery: {
            type: string;
            description: string;
            properties: {
                deletionProtection: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                recoveryWindowInDays: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
            };
            additionalProperties: boolean;
            default: {
                deletionProtection: boolean;
                recoveryWindowInDays: number;
            };
        };
    };
    additionalProperties: boolean;
    defaults: {
        generateSecret: {
            enabled: boolean;
        };
        automaticRotation: {
            enabled: boolean;
        };
        replicas: never[];
        recovery: {
            deletionProtection: boolean;
            recoveryWindowInDays: number;
        };
    };
};
/**
 * Configuration builder for Secrets Manager component
 */
export declare class SecretsManagerConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
     */
    build(): Promise<SecretsManagerConfig>;
    /**
     * Synchronous version of build for use in synth() method
     */
    buildSync(): SecretsManagerConfig;
    /**
     * Simple merge utility for combining configuration objects
     */
    private mergeConfigs;
    /**
     * Get platform-wide defaults for Secrets Manager
     */
    private getPlatformDefaults;
    /**
     * Get compliance framework specific defaults
     */
    private getComplianceFrameworkDefaults;
    /**
     * Get default rotation days based on compliance framework
     */
    private getDefaultRotationDays;
    /**
     * Get default deletion protection setting
     */
    private getDefaultDeletionProtection;
    /**
     * Get default recovery window
     */
    private getDefaultRecoveryWindow;
    /**
     * Get compliance replica regions
     */
    private getComplianceReplicas;
}
/**
 * Secrets Manager Component implementing Component API Contract v1.0
 */
export declare class SecretsManagerComponent extends Component {
    private secret?;
    private kmsKey?;
    private rotationLambda?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create Secrets Manager secret with compliance hardening
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
     * Create rotation Lambda function if automatic rotation is enabled
     */
    private createRotationLambdaIfNeeded;
    /**
     * Create the Secrets Manager secret
     */
    private createSecret;
    /**
     * Apply compliance-specific hardening
     */
    private applyComplianceHardening;
    private applyCommercialHardening;
    private applyFedrampModerateHardening;
    private applyFedrampHighHardening;
    /**
     * Build secret capability data shape
     */
    private buildSecretCapability;
    /**
     * Helper methods for compliance decisions
     */
    private shouldUseCustomerManagedKey;
    private buildSecretName;
    /**
     * Configure CloudWatch observability for Secrets Manager
     */
    private configureObservabilityForSecret;
}
