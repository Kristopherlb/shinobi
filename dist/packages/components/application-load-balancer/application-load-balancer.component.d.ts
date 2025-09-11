/**
 * Application Load Balancer Component implementing Component API Contract v1.0
 *
 * A managed layer 7 load balancer for distributing HTTP/HTTPS traffic across targets.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { BaseComponent } from '../../../src/platform/contracts/component';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from '../../../src/platform/contracts/component-interfaces';
/**
 * Configuration interface for Application Load Balancer component
 */
export interface ApplicationLoadBalancerConfig {
    /** Load balancer name (optional, defaults to component name) */
    loadBalancerName?: string;
    /** Load balancer scheme */
    scheme?: 'internet-facing' | 'internal';
    /** IP address type */
    ipAddressType?: 'ipv4' | 'dualstack';
    /** VPC configuration */
    vpc?: {
        vpcId?: string;
        subnetIds?: string[];
        subnetType?: 'public' | 'private';
    };
    /** Listeners configuration */
    listeners?: Array<{
        port: number;
        protocol: 'HTTP' | 'HTTPS';
        certificateArn?: string;
        sslPolicy?: string;
        redirectToHttps?: boolean;
        defaultAction?: {
            type: 'fixed-response' | 'redirect' | 'forward';
            statusCode?: number;
            contentType?: string;
            messageBody?: string;
            redirectUrl?: string;
        };
    }>;
    /** Target groups configuration */
    targetGroups?: Array<{
        name: string;
        port: number;
        protocol: 'HTTP' | 'HTTPS';
        targetType: 'instance' | 'ip' | 'lambda';
        healthCheck?: {
            enabled?: boolean;
            path?: string;
            protocol?: 'HTTP' | 'HTTPS';
            port?: number;
            healthyThresholdCount?: number;
            unhealthyThresholdCount?: number;
            timeout?: number;
            interval?: number;
            matcher?: string;
        };
        stickiness?: {
            enabled?: boolean;
            duration?: number;
        };
    }>;
    /** Access logging configuration */
    accessLogs?: {
        enabled?: boolean;
        bucket?: string;
        prefix?: string;
    };
    /** Security groups */
    securityGroups?: {
        create?: boolean;
        securityGroupIds?: string[];
        ingress?: Array<{
            port: number;
            protocol: string;
            cidr?: string;
            description?: string;
        }>;
    };
    /** Deletion protection */
    deletionProtection?: boolean;
    /** Idle timeout */
    idleTimeout?: number;
    /** Deployment strategy configuration */
    deploymentStrategy?: {
        type: 'single' | 'blue-green';
        blueGreenConfig?: {
            productionTrafficRoute?: {
                type: 'AllAtOnce' | 'Linear' | 'Canary';
                percentage?: number;
                interval?: number;
            };
            testTrafficRoute?: {
                type: 'AllAtOnce' | 'Linear' | 'Canary';
                percentage?: number;
            };
            terminationWaitTime?: number;
        };
    };
    /** CloudWatch monitoring configuration */
    monitoring?: {
        enabled?: boolean;
        alarms?: {
            httpCode5xxThreshold?: number;
            unhealthyHostThreshold?: number;
            connectionErrorThreshold?: number;
            rejectedConnectionThreshold?: number;
        };
    };
    /** Tags for the load balancer */
    tags?: Record<string, string>;
}
/**
 * Configuration schema for Application Load Balancer component
 */
export declare const APPLICATION_LOAD_BALANCER_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    properties: {
        loadBalancerName: {
            type: string;
            description: string;
            pattern: string;
            minLength: number;
            maxLength: number;
        };
        scheme: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        ipAddressType: {
            type: string;
            description: string;
            enum: string[];
            default: string;
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
                        pattern: string;
                    };
                    minItems: number;
                };
                subnetType: {
                    type: string;
                    description: string;
                    enum: string[];
                    default: string;
                };
            };
        };
        listenerConfigs: {
            type: string;
            description: string;
            items: {
                type: string;
                required: string[];
                properties: {
                    port: {
                        type: string;
                        description: string;
                        minimum: number;
                        maximum: number;
                    };
                    protocol: {
                        type: string;
                        description: string;
                        enum: string[];
                    };
                    certificateArn: {
                        type: string;
                        description: string;
                        pattern: string;
                    };
                    sslPolicy: {
                        type: string;
                        description: string;
                        default: string;
                    };
                    redirectToHttps: {
                        type: string;
                        description: string;
                        default: boolean;
                    };
                };
            };
            default: {
                port: number;
                protocol: string;
            }[];
        };
        targetGroups: {
            type: string;
            description: string;
            items: {
                type: string;
                required: string[];
                properties: {
                    name: {
                        type: string;
                        description: string;
                        pattern: string;
                        minLength: number;
                        maxLength: number;
                    };
                    port: {
                        type: string;
                        description: string;
                        minimum: number;
                        maximum: number;
                    };
                    protocol: {
                        type: string;
                        description: string;
                        enum: string[];
                    };
                    targetType: {
                        type: string;
                        description: string;
                        enum: string[];
                    };
                    healthCheck: {
                        type: string;
                        description: string;
                        properties: {
                            enabled: {
                                type: string;
                                description: string;
                                default: boolean;
                            };
                            path: {
                                type: string;
                                description: string;
                                default: string;
                            };
                            protocol: {
                                type: string;
                                description: string;
                                enum: string[];
                                default: string;
                            };
                            healthyThresholdCount: {
                                type: string;
                                description: string;
                                minimum: number;
                                maximum: number;
                                default: number;
                            };
                            unhealthyThresholdCount: {
                                type: string;
                                description: string;
                                minimum: number;
                                maximum: number;
                                default: number;
                            };
                            timeout: {
                                type: string;
                                description: string;
                                minimum: number;
                                maximum: number;
                                default: number;
                            };
                            interval: {
                                type: string;
                                description: string;
                                minimum: number;
                                maximum: number;
                                default: number;
                            };
                        };
                    };
                };
            };
        };
        accessLogs: {
            type: string;
            description: string;
            properties: {
                enabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                bucket: {
                    type: string;
                    description: string;
                };
                prefix: {
                    type: string;
                    description: string;
                };
            };
        };
        securityGroups: {
            type: string;
            description: string;
            properties: {
                create: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                securityGroupIds: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                        pattern: string;
                    };
                };
                ingress: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                        required: string[];
                        properties: {
                            port: {
                                type: string;
                                description: string;
                                minimum: number;
                                maximum: number;
                            };
                            protocol: {
                                type: string;
                                description: string;
                                enum: string[];
                            };
                            cidr: {
                                type: string;
                                description: string;
                                default: string;
                            };
                            description: {
                                type: string;
                                description: string;
                            };
                        };
                    };
                };
            };
        };
        deletionProtection: {
            type: string;
            description: string;
            default: boolean;
        };
        idleTimeout: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            default: number;
        };
        deploymentStrategy: {
            type: string;
            description: string;
            properties: {
                type: {
                    type: string;
                    description: string;
                    enum: string[];
                    default: string;
                };
                blueGreenConfig: {
                    type: string;
                    description: string;
                    properties: {
                        productionTrafficRoute: {
                            type: string;
                            description: string;
                            properties: {
                                type: {
                                    type: string;
                                    description: string;
                                    enum: string[];
                                    default: string;
                                };
                                percentage: {
                                    type: string;
                                    description: string;
                                    minimum: number;
                                    maximum: number;
                                    default: number;
                                };
                                interval: {
                                    type: string;
                                    description: string;
                                    minimum: number;
                                    maximum: number;
                                    default: number;
                                };
                            };
                        };
                        terminationWaitTime: {
                            type: string;
                            description: string;
                            minimum: number;
                            maximum: number;
                            default: number;
                        };
                    };
                };
            };
        };
        monitoring: {
            type: string;
            description: string;
            properties: {
                enabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                alarms: {
                    type: string;
                    description: string;
                    properties: {
                        httpCode5xxThreshold: {
                            type: string;
                            description: string;
                            minimum: number;
                            default: number;
                        };
                        unhealthyHostThreshold: {
                            type: string;
                            description: string;
                            minimum: number;
                            default: number;
                        };
                        connectionErrorThreshold: {
                            type: string;
                            description: string;
                            minimum: number;
                            default: number;
                        };
                        rejectedConnectionThreshold: {
                            type: string;
                            description: string;
                            minimum: number;
                            default: number;
                        };
                    };
                };
            };
        };
        tags: {
            type: string;
            description: string;
            additionalProperties: {
                type: string;
            };
        };
    };
    additionalProperties: boolean;
};
/**
 * Configuration builder for Application Load Balancer component
 * Extends the abstract ConfigBuilder to ensure consistent configuration lifecycle
 */
export declare class ApplicationLoadBalancerConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
     */
    build(): Promise<ApplicationLoadBalancerConfig>;
    /**
     * Synchronous version of build for use in synth() method
     */
    buildSync(): ApplicationLoadBalancerConfig;
    /**
     * Simple merge utility for combining configuration objects
     */
    private mergeConfigs;
    /**
     * Get platform-wide defaults for Application Load Balancer
     */
    private getPlatformDefaults;
    /**
     * Get compliance framework specific defaults
     */
    private getComplianceFrameworkDefaults;
    /**
     * Apply feature flag-driven configuration overrides
     */
    private applyFeatureFlagOverrides;
    /**
     * Evaluate a feature flag with fallback to default value
     */
    private evaluateFeatureFlag;
}
/**
 * Application Load Balancer Component implementing Component API Contract v1.0
 */
export declare class ApplicationLoadBalancerComponent extends BaseComponent {
    private loadBalancer?;
    private targetGroups;
    private listeners;
    private securityGroup?;
    private vpc?;
    private accessLogsBucket?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create Application Load Balancer with compliance hardening
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
     * Lookup VPC from configuration or use default
     */
    private lookupVpc;
    /**
     * Create security group for the load balancer if needed
     */
    private createSecurityGroupIfNeeded;
    /**
     * Create S3 bucket for access logs if needed
     */
    private createAccessLogsBucketIfNeeded;
    /**
     * Create Application Load Balancer
     */
    private createApplicationLoadBalancer;
    /**
     * Get subnets for the load balancer
     */
    private getSubnets;
    /**
     * Get security groups for the load balancer
     */
    private getSecurityGroups;
    /**
     * Create target groups from configuration
     */
    private createTargetGroups;
    /**
     * Map target type string to CDK enum
     */
    private mapTargetType;
    /**
     * Create listeners from configuration
     */
    private createListeners;
    /**
     * Build default action for listener
     */
    private buildDefaultAction;
    /**
     * Apply compliance hardening based on framework
     */
    private applyComplianceHardening;
    /**
     * Create blue-green target groups for deployment strategy
     */
    private createBlueGreenTargetGroups;
    /**
     * Configure OpenTelemetry Observability Standard - CloudWatch Alarms for ALB
     */
    private configureObservabilityForAlb;
    /**
     * Build load balancer capability data shape
     */
    private buildLoadBalancerCapability;
    /**
     * Build target capability data shape
     */
    private buildTargetCapability;
    /**
     * Apply FedRAMP High compliance hardening
     */
    private applyFedrampHighHardening;
    /**
     * Apply FedRAMP Moderate compliance hardening
     */
    private applyFedrampModerateHardening;
    /**
     * Apply commercial hardening
     */
    private applyCommercialHardening;
    /**
     * Check if this is a compliance framework
     */
    private isComplianceFramework;
}
