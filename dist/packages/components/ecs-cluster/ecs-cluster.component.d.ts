/**
 * ECS Cluster Component
 *
 * Foundational component for ECS Service Connect that creates an ECS cluster
 * with optional EC2 capacity and Service Connect namespace for microservices.
 * Implements the Platform ECS Service Connect Standard v1.0.
 */
import { Construct } from 'constructs';
import { BaseComponent } from '../../../src/platform/contracts/component';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from '../../../src/platform/contracts/component-interfaces';
import { ConfigBuilder } from '../../../src/platform/contracts/config-builder';
/**
 * Configuration interface for ECS Cluster component
 */
export interface EcsClusterConfig {
    /** Service Connect configuration for microservice discovery */
    serviceConnect: {
        /** Cloud Map namespace for service discovery (e.g., "internal", "my-app.internal") */
        namespace: string;
    };
    /** Optional EC2 capacity configuration. If omitted, cluster is Fargate-only */
    capacity?: {
        /** EC2 instance type for the cluster */
        instanceType: string;
        /** Minimum number of instances in the Auto Scaling Group */
        minSize: number;
        /** Maximum number of instances in the Auto Scaling Group */
        maxSize: number;
        /** Desired number of instances (optional, defaults to minSize) */
        desiredSize?: number;
        /** Key pair name for SSH access (optional) */
        keyName?: string;
        /** Enable detailed CloudWatch monitoring (optional, defaults to false) */
        enableMonitoring?: boolean;
    };
    /** Container Insights configuration (optional, defaults based on compliance) */
    containerInsights?: boolean;
    /** Cluster name override (optional, auto-generated from service and component name) */
    clusterName?: string;
    /** Tags to apply to cluster resources */
    tags?: Record<string, string>;
}
/**
 * Configuration schema for ECS Cluster component
 */
export declare const ECS_CLUSTER_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    required: string[];
    properties: {
        serviceConnect: {
            type: string;
            title: string;
            description: string;
            required: string[];
            properties: {
                namespace: {
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
        capacity: {
            type: string;
            title: string;
            description: string;
            required: string[];
            properties: {
                instanceType: {
                    type: string;
                    description: string;
                    pattern: string;
                    examples: string[];
                };
                minSize: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                };
                maxSize: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                };
                desiredSize: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                };
                keyName: {
                    type: string;
                    description: string;
                    pattern: string;
                };
                enableMonitoring: {
                    type: string;
                    description: string;
                    default: boolean;
                };
            };
            additionalProperties: boolean;
        };
        containerInsights: {
            type: string;
            description: string;
            default: boolean;
        };
        clusterName: {
            type: string;
            description: string;
            pattern: string;
            minLength: number;
            maxLength: number;
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
        containerInsights: boolean;
        capacity: {
            enableMonitoring: boolean;
        };
    };
};
/**
 * ECS Cluster Configuration Builder
 * Implements the centralized 5-layer precedence engine for ECS cluster configuration
 */
export declare class EcsClusterConfigBuilder extends ConfigBuilder<EcsClusterConfig> {
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Builds the final configuration using the centralized 5-layer precedence engine
     */
    build(): Promise<EcsClusterConfig>;
    /**
     * Provide ECS cluster-specific hardcoded fallbacks (Layer 1: Lowest Priority)
     * These serve as ultra-safe defaults when no other configuration is available.
     */
    protected getHardcodedFallbacks(): Record<string, any>;
    /**
     * Get compliance framework specific defaults
     */
    protected getComplianceFrameworkDefaults(): Record<string, any>;
}
/**
 * ECS Cluster Component implementing Component API Contract v1.0 and
 * Platform ECS Service Connect Standard v1.0
 */
export declare class EcsClusterComponent extends BaseComponent {
    private cluster?;
    private namespace?;
    private autoScalingGroup?;
    private config?;
    private configBuilder?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create ECS Cluster with Service Connect capability
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
     * Create the ECS Cluster
     */
    private createEcsCluster;
    /**
     * Create Service Connect namespace for service discovery
     */
    private createServiceConnectNamespace;
    /**
     * Create optional EC2 capacity for the cluster
     */
    private createEc2CapacityIfNeeded;
    /**
     * Configure additional cluster settings
     */
    private configureClusterSettings;
    /**
     * Apply standard platform tags to ECS Cluster and related resources
     */
    private applyClusterTags;
    /**
     * Build the ecs:cluster capability according to the specification
     */
    private buildEcsClusterCapability;
    /**
     * Get VPC from context or throw error if not available
     */
    private getVpcFromContext;
    /**
     * Validate that component has been synthesized before accessing capabilities
     */
    protected validateSynthesized(): void;
}
