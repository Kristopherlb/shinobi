/**
 * ECS EC2 Service Component
 *
 * EC2-based containerized service that runs on ECS cluster instances with
 * Service Connect integration for microservice discovery.
 * Implements the Platform ECS Service Connect Standard v1.0.
 */
import { Construct } from 'constructs';
import { BaseComponent } from '../../../src/platform/contracts/component';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from '../../../src/platform/contracts/component-interfaces';
import { ConfigBuilder } from '../../../src/platform/contracts/config-builder';
/**
 * Configuration interface for ECS EC2 Service component
 */
export interface EcsEc2ServiceConfig {
    /** Name of the ECS cluster component to deploy to */
    cluster: string;
    /** Container image configuration */
    image: {
        /** Container image URI or repository name */
        repository: string;
        /** Image tag (optional, defaults to 'latest') */
        tag?: string;
    };
    /** CPU allocation at task level (CPU units, 1024 = 1 vCPU) */
    taskCpu: number;
    /** Memory allocation at task level (MiB) */
    taskMemory: number;
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
    /** Placement constraints for EC2 service (optional) */
    placementConstraints?: Array<{
        /** Constraint type (memberOf, distinctInstance, etc.) */
        type: string;
        /** Constraint expression */
        expression?: string;
    }>;
    /** Placement strategies for EC2 service (optional) */
    placementStrategies?: Array<{
        /** Strategy type (random, spread, binpack) */
        type: string;
        /** Field to apply strategy to */
        field?: string;
    }>;
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
    /** Additional tags for service resources */
    tags?: Record<string, string>;
}
/**
 * Configuration schema for ECS EC2 Service component
 */
export declare const ECS_EC2_SERVICE_CONFIG_SCHEMA: {
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
        taskCpu: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            examples: number[];
        };
        taskMemory: {
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
        placementConstraints: {
            type: string;
            description: string;
            items: {
                type: string;
                properties: {
                    type: {
                        type: string;
                        enum: string[];
                        description: string;
                    };
                    expression: {
                        type: string;
                        description: string;
                    };
                };
                required: string[];
                additionalProperties: boolean;
            };
        };
        placementStrategies: {
            type: string;
            description: string;
            items: {
                type: string;
                properties: {
                    type: {
                        type: string;
                        enum: string[];
                        description: string;
                    };
                    field: {
                        type: string;
                        description: string;
                        examples: string[];
                    };
                };
                required: string[];
                additionalProperties: boolean;
            };
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
 * ECS EC2 Service Configuration Builder
 * Implements the centralized 5-layer precedence engine
 */
export declare class EcsEc2ServiceConfigBuilder extends ConfigBuilder<EcsEc2ServiceConfig> {
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Builds the final configuration using the centralized precedence engine
     */
    build(): Promise<EcsEc2ServiceConfig>;
    /**
     * Provide EC2 service-specific hardcoded fallbacks
     */
    protected getHardcodedFallbacks(): Record<string, any>;
    /**
     * Get compliance framework specific defaults
     */
    protected getComplianceFrameworkDefaults(): Record<string, any>;
}
/**
 * ECS EC2 Service Component implementing Component API Contract v1.0 and
 * Platform ECS Service Connect Standard v1.0
 */
export declare class EcsEc2ServiceComponent extends BaseComponent {
    private service?;
    private taskDefinition?;
    private securityGroup?;
    private logGroup?;
    private config?;
    private configBuilder?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create ECS EC2 Service with Service Connect
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
     * Create EC2 task definition
     */
    private createTaskDefinition;
    /**
     * Create security group for the service
     */
    private createSecurityGroup;
    /**
     * Create the EC2 service with Service Connect
     */
    private createEc2Service;
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
     * Build placement constraint for ECS service
     */
    private buildPlacementConstraint;
    /**
     * Build placement strategy for ECS service
     */
    private buildPlacementStrategy;
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
     * Validate that component has been synthesized
     */
    protected validateSynthesized(): void;
}
