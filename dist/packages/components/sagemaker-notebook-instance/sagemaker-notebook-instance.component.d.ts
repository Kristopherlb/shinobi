/**
 * SageMaker Notebook Instance Component
 *
 * AWS SageMaker Notebook Instance for machine learning development and experimentation.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
/**
 * Configuration interface for SageMaker Notebook Instance component
 */
export interface SageMakerNotebookInstanceConfig {
    /** Notebook instance name (optional, will be auto-generated) */
    notebookInstanceName?: string;
    /** Instance type for the notebook */
    instanceType?: string;
    /** IAM role for the notebook instance */
    roleArn?: string;
    /** Subnet ID for VPC placement */
    subnetId?: string;
    /** Security group IDs */
    securityGroupIds?: string[];
    /** KMS key for encryption */
    kmsKeyId?: string;
    /** Root access configuration */
    rootAccess?: 'Enabled' | 'Disabled';
    /** Direct internet access */
    directInternetAccess?: 'Enabled' | 'Disabled';
    /** Volume size in GB */
    volumeSizeInGB?: number;
    /** Default code repository */
    defaultCodeRepository?: string;
    /** Additional code repositories */
    additionalCodeRepositories?: string[];
    /** Lifecycle configuration */
    lifecycleConfigName?: string;
    /** Platform identifier */
    platformIdentifier?: string;
    /** Accelerator types */
    acceleratorTypes?: string[];
    /** Instance metadata service configuration */
    instanceMetadataServiceConfiguration?: {
        /** Minimum IMDS version */
        minimumInstanceMetadataServiceVersion?: string;
    };
    /** Tags for the notebook instance */
    tags?: Record<string, string>;
}
/**
 * Configuration schema for SageMaker Notebook Instance component
 */
export declare const SAGEMAKER_NOTEBOOK_INSTANCE_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    properties: {
        notebookInstanceName: {
            type: string;
            description: string;
            pattern: string;
            maxLength: number;
        };
        instanceType: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        roleArn: {
            type: string;
            description: string;
        };
        subnetId: {
            type: string;
            description: string;
        };
        securityGroupIds: {
            type: string;
            description: string;
            items: {
                type: string;
            };
            maxItems: number;
        };
        kmsKeyId: {
            type: string;
            description: string;
        };
        rootAccess: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        directInternetAccess: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        volumeSizeInGB: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            default: number;
        };
        defaultCodeRepository: {
            type: string;
            description: string;
        };
        additionalCodeRepositories: {
            type: string;
            description: string;
            items: {
                type: string;
            };
            maxItems: number;
        };
        lifecycleConfigName: {
            type: string;
            description: string;
        };
        platformIdentifier: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        acceleratorTypes: {
            type: string;
            description: string;
            items: {
                type: string;
                enum: string[];
            };
            maxItems: number;
        };
        instanceMetadataServiceConfiguration: {
            type: string;
            description: string;
            properties: {
                minimumInstanceMetadataServiceVersion: {
                    type: string;
                    description: string;
                    enum: string[];
                    default: string;
                };
            };
            additionalProperties: boolean;
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
        instanceType: string;
        rootAccess: string;
        directInternetAccess: string;
        volumeSizeInGB: number;
        platformIdentifier: string;
        instanceMetadataServiceConfiguration: {
            minimumInstanceMetadataServiceVersion: string;
        };
        tags: {};
    };
};
/**
 * Configuration builder for SageMaker Notebook Instance component
 */
export declare class SageMakerNotebookInstanceConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    build(): Promise<SageMakerNotebookInstanceConfig>;
    buildSync(): SageMakerNotebookInstanceConfig;
    private mergeConfigs;
    private getPlatformDefaults;
    private getComplianceFrameworkDefaults;
    private getDefaultInstanceType;
    private getDefaultRootAccess;
    private getDefaultDirectInternetAccess;
    private getDefaultVolumeSize;
}
/**
 * SageMaker Notebook Instance Component implementing Component API Contract v1.0
 */
export declare class SageMakerNotebookInstanceComponent extends Component {
    private notebookInstance?;
    private executionRole?;
    private kmsKey?;
    private securityGroup?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    synth(): void;
    getCapabilities(): ComponentCapabilities;
    getType(): string;
    private createKmsKeyIfNeeded;
    private createExecutionRoleIfNeeded;
    private createSecurityGroupIfNeeded;
    private createNotebookInstance;
    private buildSecurityGroupIds;
    private buildNotebookTags;
    private getBaseManagedPolicies;
    private buildInlinePolicies;
    private buildNotebookInstanceName;
    private getKeyRemovalPolicy;
    private applyComplianceHardening;
    private applyCommercialHardening;
    private applyFedrampModerateHardening;
    private applyFedrampHighHardening;
    private buildNotebookCapability;
    private configureObservabilityForNotebook;
}
