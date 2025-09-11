/**
 * MCP Server Component
 *
 * Model Context Protocol Server for platform ecosystem intelligence.
 * Provides both descriptive context and generative tooling capabilities.
 * Implements MCP Server Specification v1.0.
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
/**
 * Configuration interface for MCP Server component
 */
export interface McpServerConfig {
    /** Container image tag */
    imageTag?: string;
    /** ECR repository name */
    ecrRepository?: string;
    /** Task CPU units */
    cpu?: number;
    /** Task memory in MB */
    memory?: number;
    /** Desired task count */
    taskCount?: number;
    /** Container port */
    containerPort?: number;
    /** Application Load Balancer configuration */
    loadBalancer?: {
        /** Enable ALB */
        enabled?: boolean;
        /** Certificate ARN for HTTPS */
        certificateArn?: string;
        /** Custom domain name */
        domainName?: string;
    };
    /** Authentication configuration */
    authentication?: {
        /** JWT secret for token validation */
        jwtSecret?: string;
        /** Token expiration time */
        tokenExpiration?: string;
    };
    /** Data source configuration */
    dataSources?: {
        /** Git repository configuration */
        git?: {
            /** Repository URLs for service manifests */
            repositoryUrls?: string[];
            /** Access token secret ARN */
            accessTokenArn?: string;
        };
        /** AWS API access configuration */
        aws?: {
            /** Cross-account role ARNs for resource discovery */
            crossAccountRoles?: string[];
            /** Regions to scan */
            regions?: string[];
        };
        /** Template repository configuration */
        templates?: {
            /** Template repository URL */
            repositoryUrl?: string;
            /** Template branch */
            branch?: string;
        };
    };
    /** VPC configuration */
    vpc?: {
        vpcId?: string;
        subnetIds?: string[];
        securityGroupIds?: string[];
    };
    /** Logging configuration */
    logging?: {
        /** Log retention period in days */
        retentionDays?: number;
        /** Log level */
        logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    };
}
/**
 * Configuration schema for MCP Server component
 */
export declare const MCP_SERVER_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    required: never[];
    properties: {
        imageTag: {
            type: string;
            description: string;
            default: string;
        };
        ecrRepository: {
            type: string;
            description: string;
            default: string;
        };
        cpu: {
            type: string;
            description: string;
            enum: number[];
            default: number;
        };
        memory: {
            type: string;
            description: string;
            enum: number[];
            default: number;
        };
        taskCount: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            default: number;
        };
        containerPort: {
            type: string;
            description: string;
            default: number;
        };
    };
    additionalProperties: boolean;
    defaults: {
        imageTag: string;
        ecrRepository: string;
        cpu: number;
        memory: number;
        taskCount: number;
        containerPort: number;
    };
};
/**
 * MCP Server Component implementation
 */
export declare class McpServerComponent extends Component {
    private cluster?;
    private service?;
    private taskDefinition?;
    private loadBalancer?;
    private repository?;
    private logGroup?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create AWS resources
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
    private buildConfigSync;
    private createEcrRepository;
    private createEcsCluster;
    private createLogGroup;
    private createTaskDefinition;
    private createEcsService;
    private createLoadBalancer;
    private buildApiCapability;
    private buildContainerCapability;
    private applyComplianceDefaults;
    private applyComplianceHardening;
    private applyFedrampHighHardening;
    private applyFedrampModerateHardening;
    private applyCommercialHardening;
}
