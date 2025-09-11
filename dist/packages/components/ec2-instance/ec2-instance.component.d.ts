/**
 * EC2 Instance Component
 *
 * A managed EC2 compute instance with compliance hardening.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { BaseComponent } from '../../../src/platform/contracts/component';
import { ComponentSpec, ComponentContext, ComponentCapabilities, ConfigBuilder } from '../../../src/platform/contracts';
/**
 * Configuration interface for EC2 Instance component
 */
export interface Ec2InstanceConfig {
    /** Instance type */
    instanceType?: string;
    /** AMI ID or lookup criteria */
    ami?: {
        /** AMI ID */
        amiId?: string;
        /** AMI name pattern for lookup */
        namePattern?: string;
        /** AMI owner */
        owner?: string;
    };
    /** VPC configuration */
    vpc?: {
        /** VPC ID */
        vpcId?: string;
        /** Subnet ID */
        subnetId?: string;
        /** Security group IDs */
        securityGroupIds?: string[];
    };
    /** User data script */
    userData?: {
        /** User data script content */
        script?: string;
        /** User data from file */
        fromFile?: string;
    };
    /** Key pair for SSH access */
    keyPair?: {
        /** Key pair name */
        keyName?: string;
    };
    /** EBS configuration */
    storage?: {
        /** Root volume size in GB */
        rootVolumeSize?: number;
        /** Root volume type */
        rootVolumeType?: string;
        /** IOPS for io1/io2 volume types */
        iops?: number;
        /** Enable encryption */
        encrypted?: boolean;
        /** KMS key ARN */
        kmsKeyArn?: string;
        /** Delete on termination */
        deleteOnTermination?: boolean;
    };
    /** Monitoring configuration */
    monitoring?: {
        /** Enable detailed monitoring */
        detailed?: boolean;
        /** CloudWatch agent config */
        cloudWatchAgent?: boolean;
    };
    /** Security configuration */
    security?: {
        /** Disable IMDSv1 */
        requireImdsv2?: boolean;
        /** Instance metadata hop limit */
        httpTokens?: 'optional' | 'required';
        /** Enable Nitro Enclaves */
        nitroEnclaves?: boolean;
    };
}
/**
 * Configuration schema for EC2 Instance component
 */
export declare const EC2_INSTANCE_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    properties: {
        instanceType: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        ami: {
            type: string;
            description: string;
            properties: {
                amiId: {
                    type: string;
                    description: string;
                    pattern: string;
                };
                namePattern: {
                    type: string;
                    description: string;
                    default: string;
                };
                owner: {
                    type: string;
                    description: string;
                    enum: string[];
                    default: string;
                };
            };
            additionalProperties: boolean;
        };
        vpc: {
            type: string;
            description: string;
            properties: {
                vpcId: {
                    type: string;
                    description: string;
                    pattern: string;
                };
                subnetId: {
                    type: string;
                    description: string;
                    pattern: string;
                };
                securityGroupIds: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                        pattern: string;
                    };
                    maxItems: number;
                };
            };
            additionalProperties: boolean;
        };
        userData: {
            type: string;
            description: string;
            properties: {
                script: {
                    type: string;
                    description: string;
                };
                fromFile: {
                    type: string;
                    description: string;
                };
            };
            additionalProperties: boolean;
        };
        keyPair: {
            type: string;
            description: string;
            properties: {
                keyName: {
                    type: string;
                    description: string;
                };
            };
            additionalProperties: boolean;
        };
        storage: {
            type: string;
            description: string;
            properties: {
                rootVolumeSize: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
                rootVolumeType: {
                    type: string;
                    description: string;
                    enum: string[];
                    default: string;
                };
                encrypted: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                kmsKeyArn: {
                    type: string;
                    description: string;
                    pattern: string;
                };
                deleteOnTermination: {
                    type: string;
                    description: string;
                    default: boolean;
                };
            };
            additionalProperties: boolean;
        };
        monitoring: {
            type: string;
            description: string;
            properties: {
                detailed: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                cloudWatchAgent: {
                    type: string;
                    description: string;
                    default: boolean;
                };
            };
            additionalProperties: boolean;
        };
        security: {
            type: string;
            description: string;
            properties: {
                requireImdsv2: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                httpTokens: {
                    type: string;
                    description: string;
                    enum: string[];
                    default: string;
                };
                nitroEnclaves: {
                    type: string;
                    description: string;
                    default: boolean;
                };
            };
            additionalProperties: boolean;
        };
    };
    additionalProperties: boolean;
    defaults: {
        instanceType: string;
        ami: {
            namePattern: string;
            owner: string;
        };
        storage: {
            rootVolumeSize: number;
            rootVolumeType: string;
            encrypted: boolean;
            deleteOnTermination: boolean;
        };
        monitoring: {
            detailed: boolean;
            cloudWatchAgent: boolean;
        };
        security: {
            requireImdsv2: boolean;
            httpTokens: string;
            nitroEnclaves: boolean;
        };
    };
};
/**
 * Ec2InstanceConfigBuilder - Simplified config builder extending the abstract ConfigBuilder base class
 *
 * This builder now leverages the centralized 5-layer precedence engine from the abstract base class.
 * Its only responsibility is to provide EC2-specific hardcoded fallbacks - all orchestration,
 * loading, merging, and validation is handled automatically by the base class.
 */
export declare class Ec2InstanceConfigBuilder extends ConfigBuilder<Ec2InstanceConfig> {
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Builds the final configuration using the centralized 5-layer precedence engine
     */
    build(): Promise<Ec2InstanceConfig>;
    /**
     * Provide EC2-specific hardcoded fallbacks (Layer 1: Lowest Priority)
     * These serve as ultra-safe defaults when no other configuration is available.
     */
    protected getHardcodedFallbacks(): Record<string, any>;
}
/**
 * EC2 Instance Component implementing Component API Contract v1.0
 */
export declare class Ec2InstanceComponent extends BaseComponent {
    private instance?;
    private securityGroup?;
    private instanceProfile?;
    private role?;
    private kmsKey?;
    private config?;
    private configBuilder?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create EC2 instance with compliance hardening
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
     * Create KMS key for EBS encryption if required by compliance framework
     */
    private createKmsKeyIfNeeded;
    /**
     * Create IAM role and instance profile for the EC2 instance
     */
    private createInstanceRole;
    /**
     * Create security group for the EC2 instance
     */
    private createSecurityGroup;
    /**
     * Create the EC2 instance
     */
    private createInstance;
    /**
     * Apply compliance-specific hardening
     */
    private applyComplianceHardening;
    private applyCommercialHardening;
    private applyFedrampModerateHardening;
    private applyFedrampHighHardening;
    /**
     * Get base managed policies for the instance role
     */
    private getBaseManagedPolicies;
    /**
     * Apply compliance-specific IAM policies
     */
    private applyCompliancePolicies;
    /**
     * Apply security group rules
     */
    private applySecurityGroupRules;
    /**
     * Build user data script
     */
    private buildUserData;
    /**
     * Build block device mapping for EBS volumes
     */
    private buildBlockDevices;
    /**
     * Configure observability for the EC2 instance per OpenTelemetry standard
     * Creates mandatory CloudWatch alarms for operational monitoring
     */
    private configureObservabilityForInstance;
    /**
     * Apply instance tags using base class standard tags + EC2-specific compliance tags
     */
    private applyInstanceTags;
    /**
     * Build instance capability data shape
     */
    private buildInstanceCapability;
    /**
     * Validate instance type
     */
    private validateInstanceType;
    /**
     * Helper methods for compliance decisions
     */
    private shouldUseCustomerManagedKey;
    private shouldEnableEbsEncryption;
    private shouldEnableDetailedMonitoring;
    private shouldRequireImdsv2;
    private isComplianceFramework;
    private getInstanceAmi;
    private getVpcSubnets;
    private getEbsVolumeType;
}
