/**
 * Auto Scaling Group Component
 * * A managed auto scaling group with launch template and compliance hardening.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
/**
 * Configuration interface for Auto Scaling Group component
 */
export interface AutoScalingGroupConfig {
    /** Launch template configuration */
    launchTemplate?: {
        /** Instance type */
        instanceType?: string;
        /** AMI ID or lookup criteria */
        ami?: {
            amiId?: string;
            namePattern?: string;
            owner?: string;
        };
        /** User data script */
        userData?: string;
        /** Key pair name */
        keyName?: string;
    };
    /** Auto Scaling configuration */
    autoScaling?: {
        /** Minimum capacity */
        minCapacity?: number;
        /** Maximum capacity */
        maxCapacity?: number;
        /** Desired capacity */
        desiredCapacity?: number;
    };
    /** VPC configuration */
    vpc?: {
        vpcId?: string;
        subnetIds?: string[];
        securityGroupIds?: string[];
    };
    /** EBS configuration */
    storage?: {
        /** Root volume size in GB */
        rootVolumeSize?: number;
        /** Root volume type */
        rootVolumeType?: string;
        /** Enable encryption */
        encrypted?: boolean;
        /** KMS key ARN */
        kmsKeyArn?: string;
    };
    /** Health check configuration */
    healthCheck?: {
        /** Health check type */
        type?: 'EC2' | 'ELB';
        /** Health check grace period */
        gracePeriod?: number;
    };
    /** Termination policies */
    terminationPolicies?: Array<'Default' | 'OldestInstance' | 'NewestInstance' | 'OldestLaunchConfiguration' | 'ClosestToNextInstanceHour'>;
    /** Update policy */
    updatePolicy?: {
        /** Rolling update configuration */
        rollingUpdate?: {
            minInstancesInService?: number;
            maxBatchSize?: number;
            pauseTime?: string;
        };
    };
}
/**
 * Configuration schema for Auto Scaling Group component
 */
export declare const AUTO_SCALING_GROUP_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    properties: {
        launchTemplate: {
            type: string;
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
                userData: {
                    type: string;
                    description: string;
                };
                keyName: {
                    type: string;
                    description: string;
                };
            };
            additionalProperties: boolean;
        };
        autoScaling: {
            type: string;
            description: string;
            properties: {
                minCapacity: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
                maxCapacity: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
                desiredCapacity: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
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
                subnetIds: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                        pattern: string;
                    };
                    minItems: number;
                    maxItems: number;
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
            };
            additionalProperties: boolean;
        };
        healthCheck: {
            type: string;
            description: string;
            properties: {
                type: {
                    type: string;
                    description: string;
                    enum: string[];
                    default: string;
                };
                gracePeriod: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
            };
            additionalProperties: boolean;
        };
        terminationPolicies: {
            type: string;
            description: string;
            items: {
                type: string;
                enum: string[];
            };
            default: string[];
            maxItems: number;
        };
        updatePolicy: {
            type: string;
            description: string;
            properties: {
                rollingUpdate: {
                    type: string;
                    description: string;
                    properties: {
                        minInstancesInService: {
                            type: string;
                            description: string;
                            minimum: number;
                            default: number;
                        };
                        maxBatchSize: {
                            type: string;
                            description: string;
                            minimum: number;
                            default: number;
                        };
                        pauseTime: {
                            type: string;
                            description: string;
                            pattern: string;
                            default: string;
                        };
                    };
                    additionalProperties: boolean;
                };
            };
            additionalProperties: boolean;
        };
    };
    additionalProperties: boolean;
    defaults: {
        launchTemplate: {
            instanceType: string;
            ami: {
                namePattern: string;
                owner: string;
            };
        };
        autoScaling: {
            minCapacity: number;
            maxCapacity: number;
            desiredCapacity: number;
        };
        storage: {
            rootVolumeSize: number;
            rootVolumeType: string;
            encrypted: boolean;
        };
        healthCheck: {
            type: string;
            gracePeriod: number;
        };
        terminationPolicies: string[];
    };
};
/**
 * AutoScalingGroupConfigBuilder - Handles configuration building and defaults for AutoScalingGroup
 */
export declare class AutoScalingGroupConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
     */
    buildSync(): AutoScalingGroupConfig;
    private mergeConfigs;
    private getPlatformDefaults;
    private getComplianceFrameworkDefaults;
}
/**
 * Auto Scaling Group Component implementing Component API Contract v1.0
 */
export declare class AutoScalingGroupComponent extends Component {
    private autoScalingGroup?;
    private launchTemplate?;
    private securityGroup?;
    private role?;
    private instanceProfile?;
    private kmsKey?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    synth(): void;
    getCapabilities(): ComponentCapabilities;
    getType(): string;
    private createKmsKeyIfNeeded;
    private createInstanceRole;
    private createSecurityGroup;
    private createLaunchTemplate;
    private createAutoScalingGroup;
    private applyComplianceHardening;
    private getBaseManagedPolicies;
    private applyCompliancePolicies;
    private applySecurityGroupRules;
    private buildUserData;
    private buildBlockDevices;
    private applyAutoScalingGroupTags;
    private buildAutoScalingGroupCapability;
    private getVpc;
    private isComplianceFramework;
    private shouldUseCustomerManagedKey;
    private shouldEnableEbsEncryption;
    private shouldEnableDetailedMonitoring;
    private shouldRequireImdsv2;
    private getInstanceAmi;
    private getVpcSubnets;
    private getEbsVolumeType;
    private getHealthCheckType;
    private getTerminationPolicies;
    private getUpdatePolicy;
    /**
     * Configure observability for Auto Scaling Group following OpenTelemetry standards
     * Creates standard CloudWatch alarms for essential ASG metrics
     */
    private configureObservabilityForAsg;
}
