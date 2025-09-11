/**
 * EFS Filesystem Component
 *
 * AWS Elastic File System for scalable, shared storage across multiple instances.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
/**
 * Configuration interface for EFS Filesystem component
 */
export interface EfsFilesystemConfig {
    /** Filesystem name (optional, will be auto-generated) */
    filesystemName?: string;
    /** VPC where filesystem will be created */
    vpc?: {
        vpcId?: string;
        subnetIds?: string[];
    };
    /** Performance mode */
    performanceMode?: 'generalPurpose' | 'maxIO';
    /** Throughput mode */
    throughputMode?: 'provisioned' | 'bursting';
    /** Provisioned throughput (only for provisioned mode) */
    provisionedThroughputPerSecond?: number;
    /** Encryption configuration */
    encryption?: {
        /** Encrypt data at rest */
        encrypted?: boolean;
        /** KMS key ARN for encryption */
        kmsKeyArn?: string;
        /** Encrypt data in transit */
        encryptInTransit?: boolean;
    };
    /** Lifecycle policy */
    lifecyclePolicy?: {
        /** Transition to Infrequent Access */
        transitionToIA?: 'AFTER_7_DAYS' | 'AFTER_14_DAYS' | 'AFTER_30_DAYS' | 'AFTER_60_DAYS' | 'AFTER_90_DAYS';
        /** Transition out of Infrequent Access */
        transitionToPrimaryStorageClass?: 'AFTER_1_ACCESS';
    };
    /** Backup policy */
    enableAutomaticBackups?: boolean;
    /** File system policy */
    filesystemPolicy?: any;
    /** Tags for the filesystem */
    tags?: Record<string, string>;
}
/**
 * Configuration schema for EFS Filesystem component
 */
export declare const EFS_FILESYSTEM_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    properties: {
        filesystemName: {
            type: string;
            description: string;
            maxLength: number;
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
                };
            };
            additionalProperties: boolean;
        };
        performanceMode: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        throughputMode: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        provisionedThroughputPerSecond: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
        };
        encryption: {
            type: string;
            description: string;
            properties: {
                encrypted: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                kmsKeyArn: {
                    type: string;
                    description: string;
                };
                encryptInTransit: {
                    type: string;
                    description: string;
                    default: boolean;
                };
            };
            additionalProperties: boolean;
            default: {
                encrypted: boolean;
                encryptInTransit: boolean;
            };
        };
        lifecyclePolicy: {
            type: string;
            description: string;
            properties: {
                transitionToIA: {
                    type: string;
                    description: string;
                    enum: string[];
                };
                transitionToPrimaryStorageClass: {
                    type: string;
                    description: string;
                    enum: string[];
                };
            };
            additionalProperties: boolean;
        };
        enableAutomaticBackups: {
            type: string;
            description: string;
            default: boolean;
        };
        filesystemPolicy: {
            type: string;
            description: string;
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
        performanceMode: string;
        throughputMode: string;
        encryption: {
            encrypted: boolean;
            encryptInTransit: boolean;
        };
        enableAutomaticBackups: boolean;
        tags: {};
    };
};
/**
 * Configuration builder for EFS Filesystem component
 */
export declare class EfsFilesystemConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    build(): Promise<EfsFilesystemConfig>;
    buildSync(): EfsFilesystemConfig;
    private mergeConfigs;
    private getPlatformDefaults;
    private getComplianceFrameworkDefaults;
    private getDefaultEncryptInTransit;
    private getDefaultBackupPolicy;
}
/**
 * EFS Filesystem Component implementing Component API Contract v1.0
 */
export declare class EfsFilesystemComponent extends Component {
    private filesystem?;
    private kmsKey?;
    private vpc?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    synth(): void;
    getCapabilities(): ComponentCapabilities;
    getType(): string;
    private lookupVpcIfNeeded;
    private createKmsKeyIfNeeded;
    private createFilesystem;
    private mapPerformanceMode;
    private mapThroughputMode;
    private buildLifecyclePolicy;
    private buildFilesystemName;
    private shouldUseCustomerManagedKey;
    private applyComplianceHardening;
    private applyCommercialHardening;
    private applyFedrampModerateHardening;
    private applyFedrampHighHardening;
    private buildFilesystemCapability;
    private configureObservabilityForFilesystem;
}
