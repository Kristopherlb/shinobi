/**
 * ECS Fargate Service Component
 *
 * Serverless containerized service that runs on ECS Fargate with
 * Service Connect integration for microservice discovery.
 * Implements the Platform ECS Service Connect Standard v1.0.
 */
import { Construct } from 'constructs';
import { BaseComponent } from '../../../src/platform/contracts/component';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from '../../../src/platform/contracts/component-interfaces';
import { ConfigBuilder } from '../../../src/platform/contracts/config-builder';
/**
 * Configuration interface for ECS Fargate Service component
 */
export interface EcsFargateServiceConfig {
    /** Name of the ECS cluster component to deploy to */
    cluster: string;
    /** Container image configuration */
    image: {
        /** Container image URI or repository name */
        repository: string;
        /** Image tag (optional, defaults to 'latest') */
        tag?: string;
    };
    /** CPU allocation for the Fargate task (256, 512, 1024, 2048, 4096) */
    cpu: number;
    /** Memory allocation for the Fargate task (512, 1024, 2048, etc.) */
    memory: number;
    /** Container port configuration */
    port: number;
    /** Service Connect configuration for service discovery */
    serviceConnect: {
        /** Friendly name for the port mapping used in service discovery */
        portMappingName: string;
    };
    /** Environment variables for the container (optional) */
    environment?: Record<string, string>;
    /** Secrets from AWS Secrets Manager (optional) */
    secrets?: Record<string, string>;
    /** Task role ARN for container permissions (optional, auto-created if not provided) */
    taskRoleArn?: string;
    /** Number of desired tasks (optional, defaults to 1) */
    desiredCount?: number;
    /** Health check configuration (optional) */
    healthCheck?: {
        /** Command to run for health check */
        command: string[];
        /** Health check interval in seconds (optional, defaults to 30) */
        interval?: number;
        /** Health check timeout in seconds (optional, defaults to 5) */
        timeout?: number;
        /** Number of retries before marking unhealthy (optional, defaults to 3) */
        retries?: number;
    };
    /** Auto scaling configuration (optional) */
    autoScaling?: {
        /** Minimum number of tasks */
        minCapacity: number;
        /** Maximum number of tasks */
        maxCapacity: number;
        /** Target CPU utilization percentage for scaling */
        targetCpuUtilization?: number;
        /** Target memory utilization percentage for scaling */
        targetMemoryUtilization?: number;
    };
    /** Deployment strategy configuration for progressive delivery (optional) */
    deploymentStrategy?: {
        /** Strategy type: 'rolling' (default) or 'blue-green' for canary deployments */
        type: 'rolling' | 'blue-green';
        /** Blue-green deployment configuration (required when type is 'blue-green') */
        blueGreen?: {
            /** Load balancer configuration for blue-green deployment */
            loadBalancer?: {
                /** ALB listener port for production traffic */
                productionPort: number;
                /** ALB listener port for test traffic (optional, defaults to productionPort + 1) */
                testPort?: number;
            };
            /** Traffic shifting configuration */
            trafficShifting?: {
                /** Percentage of traffic to shift initially (0-100, defaults to 10) */
                initialPercentage?: number;
                /** Time to wait before shifting remaining traffic in minutes (defaults to 5) */
                waitTime?: number;
            };
        };
    };
    /** Additional tags for service resources */
    tags?: Record<string, string>;
}
/**
 * Configuration schema for ECS Fargate Service component
 */
export declare const ECS_FARGATE_SERVICE_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    required: string[];
    properties: {
        cluster: {
            type: string;
            description: string;
            minLength: number;
        };
        image: {
            type: string;
            title: string;
            description: string;
            required: string[];
            properties: {
                repository: {
                    type: string;
                    description: string;
                    pattern: string;
                    examples: string[];
                };
                tag: {
                    type: string;
                    description: string;
                    pattern: string;
                    default: string;
                };
            };
            additionalProperties: boolean;
        };
        cpu: {
            type: string;
            description: string;
            enum: number[];
            examples: number[];
        };
        memory: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            examples: number[];
        };
        port: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            examples: number[];
        };
        serviceConnect: {
            type: string;
            title: string;
            description: string;
            required: string[];
            properties: {
                portMappingName: {
                    type: string;
                    description: string;
                    pattern: string;
                    minLength: number;
                    maxLength: number;
                    examples: string[];
                };
            };
            additionalProperties: boolean;
        };
        environment: {
            type: string;
            description: string;
            additionalProperties: {
                type: string;
            };
        };
        secrets: {
            type: string;
            description: string;
            additionalProperties: {
                type: string;
                pattern: string;
            };
        };
        taskRoleArn: {
            type: string;
            description: string;
            pattern: string;
        };
        desiredCount: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            default: number;
        };
        healthCheck: {
            type: string;
            title: string;
            description: string;
            required: string[];
            properties: {
                command: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                    };
                    minItems: number;
                    examples: string[][];
                };
                interval: {
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
                retries: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
            };
            additionalProperties: boolean;
        };
        autoScaling: {
            type: string;
            title: string;
            description: string;
            required: string[];
            properties: {
                minCapacity: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                };
                maxCapacity: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                };
                targetCpuUtilization: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
                targetMemoryUtilization: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
            };
            additionalProperties: boolean;
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
                blueGreen: {
                    type: string;
                    description: string;
                    properties: {
                        loadBalancer: {
                            type: string;
                            description: string;
                            properties: {
                                productionPort: {
                                    type: string;
                                    description: string;
                                    minimum: number;
                                    maximum: number;
                                };
                                testPort: {
                                    type: string;
                                    description: string;
                                    minimum: number;
                                    maximum: number;
                                };
                            };
                            required: string[];
                            additionalProperties: boolean;
                        };
                        trafficShifting: {
                            type: string;
                            description: string;
                            properties: {
                                initialPercentage: {
                                    type: string;
                                    description: string;
                                    minimum: number;
                                    maximum: number;
                                    default: number;
                                };
                                waitTime: {
                                    type: string;
                                    description: string;
                                    minimum: number;
                                    maximum: number;
                                    default: number;
                                };
                            };
                            additionalProperties: boolean;
                        };
                    };
                    additionalProperties: boolean;
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
        };
    };
    additionalProperties: boolean;
    defaults: {
        image: {
            tag: string;
        };
        desiredCount: number;
        healthCheck: {
            interval: number;
            timeout: number;
            retries: number;
        };
        autoScaling: {
            targetCpuUtilization: number;
            targetMemoryUtilization: number;
        };
    };
};
/**
 * ECS Fargate Service Configuration Builder
 * Implements the centralized 5-layer precedence engine
 */
export declare class EcsFargateServiceConfigBuilder extends ConfigBuilder<EcsFargateServiceConfig> {
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Builds the final configuration using the centralized precedence engine
     */
    build(): Promise<EcsFargateServiceConfig>;
    /**
     * Provide Fargate service-specific hardcoded fallbacks
     */
    protected getHardcodedFallbacks(): Record<string, any>;
    /**
     * Get compliance framework specific defaults
     */
    protected getComplianceFrameworkDefaults(): Record<string, any>;
}
/**
 * ECS Fargate Service Component implementing Component API Contract v1.0 and
 * Platform ECS Service Connect Standard v1.0
 */
export declare class EcsFargateServiceComponent extends BaseComponent {
    private service?;
    private taskDefinition?;
    private securityGroup?;
    private logGroup?;
    private config?;
    private configBuilder?;
    private blueGreenResources?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create ECS Fargate Service with Service Connect
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
     * Validate CPU/Memory combination for Fargate
     */
    private validateCpuMemoryCombination;
    /**
     * Create Fargate task definition
     */
    private createTaskDefinition;
    /**
     * Create security group for the service
     */
    private createSecurityGroup;
    /**
     * Create the Fargate service with Service Connect
     */
    private createFargateService;
    /**
     * Configure auto scaling if specified in configuration
     */
    private configureAutoScaling;
    /**
     * Apply standard platform tags to service resources
     */
    private applyServiceTags;
    /**
     * Build the service:connect capability for other components to bind to
     */
    private buildServiceConnectCapability;
    /**
     * Build secrets configuration from config
     */
    private buildSecretsFromConfig;
    /**
     * Get log retention based on compliance framework
     */
    private getLogRetention;
    /**
     * Check if component is running under a compliance framework
     */
    private isComplianceFramework;
    /**
     * Get ECS cluster from configuration
     * The cluster name in config should reference either the cluster name or ARN
     */
    private getClusterFromBinding;
    /**
     * Get VPC from context
     */
    private getVpcFromContext;
    /**
     * Configure OpenTelemetry observability for ECS Fargate Service
     * Creates mandatory CloudWatch alarms for operational monitoring
     * Implements Platform OpenTelemetry Observability Standard v1.0
     */
    private _configureObservabilityForEcsService;
    /**
     * Get CPU alarm threshold based on compliance framework
     */
    private getCpuAlarmThreshold;
    /**
     * Get memory alarm threshold based on compliance framework
     */
    private getMemoryAlarmThreshold;
    /**
     * Configure blue-green deployment resources for progressive delivery
     * Creates ALB target groups and configures CodeDeploy integration
     */
    private configureBlueGreenDeployment;
    /**
     * Validate that component has been synthesized
     */
    protected validateSynthesized(): void;
}
