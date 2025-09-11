/**
 * ECR Repository Component
 *
 * AWS Elastic Container Registry for secure container image storage and management.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
/**
 * Configuration interface for ECR Repository component
 */
export interface EcrRepositoryConfig {
    /** Repository name (required) */
    repositoryName: string;
    /** Image tag mutability */
    imageScanningConfiguration?: {
        /** Enable image scanning */
        scanOnPush?: boolean;
    };
    /** Image tag mutability */
    imageTagMutability?: 'MUTABLE' | 'IMMUTABLE';
    /** Lifecycle policy */
    lifecyclePolicy?: {
        /** Maximum number of images to keep */
        maxImageCount?: number;
        /** Maximum image age in days */
        maxImageAge?: number;
        /** Rules for untagged images */
        untaggedImageRetentionDays?: number;
    };
    /** Repository policy (IAM policy document) */
    repositoryPolicy?: any;
    /** Encryption configuration */
    encryption?: {
        /** Encryption type */
        encryptionType?: 'AES256' | 'KMS';
        /** KMS key ARN (only for KMS encryption) */
        kmsKeyArn?: string;
    };
    /** Tags for the repository */
    tags?: Record<string, string>;
}
/**
 * Configuration schema for ECR Repository component
 */
export declare const ECR_REPOSITORY_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    required: string[];
    properties: {
        repositoryName: {
            type: string;
            description: string;
            pattern: string;
            minLength: number;
            maxLength: number;
        };
        imageScanningConfiguration: {
            type: string;
            description: string;
            properties: {
                scanOnPush: {
                    type: string;
                    description: string;
                    default: boolean;
                };
            };
            additionalProperties: boolean;
            default: {
                scanOnPush: boolean;
            };
        };
        imageTagMutability: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        lifecyclePolicy: {
            type: string;
            description: string;
            properties: {
                maxImageCount: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
                maxImageAge: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
                untaggedImageRetentionDays: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
            };
            additionalProperties: boolean;
        };
        repositoryPolicy: {
            type: string;
            description: string;
        };
        encryption: {
            type: string;
            description: string;
            properties: {
                encryptionType: {
                    type: string;
                    description: string;
                    enum: string[];
                    default: string;
                };
                kmsKeyArn: {
                    type: string;
                    description: string;
                };
            };
            additionalProperties: boolean;
            default: {
                encryptionType: string;
            };
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
        imageScanningConfiguration: {
            scanOnPush: boolean;
        };
        imageTagMutability: string;
        encryption: {
            encryptionType: string;
        };
        tags: {};
    };
};
/**
 * Configuration builder for ECR Repository component
 */
export declare class EcrRepositoryConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    build(): Promise<EcrRepositoryConfig>;
    buildSync(): EcrRepositoryConfig;
    private mergeConfigs;
    private getPlatformDefaults;
    private getComplianceFrameworkDefaults;
    private getDefaultScanOnPush;
    private getDefaultMutability;
    private getDefaultEncryptionType;
    private getDefaultLifecyclePolicy;
}
/**
 * ECR Repository Component implementing Component API Contract v1.0
 */
export declare class EcrRepositoryComponent extends Component {
    private repository?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    synth(): void;
    getCapabilities(): ComponentCapabilities;
    getType(): string;
    private createRepository;
    private mapImageTagMutability;
    private buildEncryptionConfiguration;
    private buildLifecycleRules;
    private getRemovalPolicy;
    private applyComplianceHardening;
    private applyCommercialHardening;
    private applyFedrampModerateHardening;
    private applyFedrampHighHardening;
    private buildRepositoryCapability;
    private configureObservabilityForRepository;
}
