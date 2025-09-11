"use strict";
/**
 * MCP Server Component
 *
 * Model Context Protocol Server for platform ecosystem intelligence.
 * Provides both descriptive context and generative tooling capabilities.
 * Implements MCP Server Specification v1.0.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpServerComponent = exports.MCP_SERVER_CONFIG_SCHEMA = void 0;
const ecs = __importStar(require("aws-cdk-lib/aws-ecs"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const elbv2 = __importStar(require("aws-cdk-lib/aws-elasticloadbalancingv2"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const ecr = __importStar(require("aws-cdk-lib/aws-ecr"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const cdk = __importStar(require("aws-cdk-lib"));
const contracts_1 = require("@platform/contracts");
/**
 * Configuration schema for MCP Server component
 */
exports.MCP_SERVER_CONFIG_SCHEMA = {
    type: 'object',
    title: 'MCP Server Configuration',
    description: 'Configuration for Model Context Protocol Server',
    required: [],
    properties: {
        imageTag: {
            type: 'string',
            description: 'Container image tag',
            default: 'latest'
        },
        ecrRepository: {
            type: 'string',
            description: 'ECR repository name',
            default: 'platform/mcp-server'
        },
        cpu: {
            type: 'number',
            description: 'Task CPU units',
            enum: [256, 512, 1024, 2048, 4096],
            default: 512
        },
        memory: {
            type: 'number',
            description: 'Task memory in MB',
            enum: [512, 1024, 2048, 4096, 8192, 16384],
            default: 1024
        },
        taskCount: {
            type: 'number',
            description: 'Desired number of tasks',
            minimum: 1,
            maximum: 10,
            default: 2
        },
        containerPort: {
            type: 'number',
            description: 'Container port for the API',
            default: 8080
        }
    },
    additionalProperties: false,
    defaults: {
        imageTag: 'latest',
        ecrRepository: 'platform/mcp-server',
        cpu: 512,
        memory: 1024,
        taskCount: 2,
        containerPort: 8080
    }
};
/**
 * MCP Server Component implementation
 */
class McpServerComponent extends contracts_1.Component {
    cluster;
    service;
    taskDefinition;
    loadBalancer;
    repository;
    logGroup;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    /**
     * Synthesis phase - Create AWS resources
     */
    synth() {
        this.logComponentEvent('synthesis_start', 'Starting MCP Server synthesis');
        try {
            // Build configuration
            this.config = this.buildConfigSync();
            // Create ECS resources
            this.createEcrRepository();
            this.createEcsCluster();
            this.createLogGroup();
            this.createTaskDefinition();
            this.createEcsService();
            // Create load balancer if enabled
            if (this.config.loadBalancer?.enabled) {
                this.createLoadBalancer();
            }
            // Apply compliance hardening
            this.applyComplianceHardening();
            // Register constructs for binding access
            this.registerConstruct('cluster', this.cluster);
            this.registerConstruct('service', this.service);
            this.registerConstruct('taskDefinition', this.taskDefinition);
            this.registerConstruct('repository', this.repository);
            if (this.loadBalancer) {
                this.registerConstruct('loadBalancer', this.loadBalancer);
            }
            // Register capabilities
            this.registerCapability('api:rest', this.buildApiCapability());
            this.registerCapability('container:ecs', this.buildContainerCapability());
            this.logComponentEvent('synthesis_complete', 'MCP Server synthesis completed successfully');
        }
        catch (error) {
            this.logError(error, 'MCP Server synthesis');
            throw error;
        }
    }
    /**
     * Get the capabilities this component provides
     */
    getCapabilities() {
        this.validateSynthesized();
        return this.capabilities;
    }
    /**
     * Get the component type identifier
     */
    getType() {
        return 'mcp-server';
    }
    buildConfigSync() {
        // Apply schema defaults and validation
        const config = { ...exports.MCP_SERVER_CONFIG_SCHEMA.defaults, ...this.spec.config };
        // Apply compliance-specific defaults
        return this.applyComplianceDefaults(config);
    }
    createEcrRepository() {
        this.repository = new ecr.Repository(this, 'Repository', {
            repositoryName: this.config.ecrRepository,
            imageTagMutability: ecr.TagMutability.MUTABLE,
            imageScanOnPush: true,
            lifecycleRules: [{
                    rulePriority: 1,
                    description: 'Keep last 10 images',
                    maxImageCount: 10
                }]
        });
        this.applyStandardTags(this.repository, {
            'resource-type': 'ecr-repository'
        });
        this.logResourceCreation('ecr-repository', this.repository.repositoryName);
    }
    createEcsCluster() {
        // Use existing VPC or create new one
        let vpc;
        if (this.config.vpc?.vpcId) {
            vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
                vpcId: this.config.vpc.vpcId
            });
        }
        else if (this.context.vpc) {
            vpc = this.context.vpc;
        }
        else {
            vpc = new ec2.Vpc(this, 'Vpc', {
                maxAzs: 3,
                natGateways: 1,
                enableDnsHostnames: true,
                enableDnsSupport: true
            });
        }
        this.cluster = new ecs.Cluster(this, 'Cluster', {
            vpc: vpc,
            clusterName: `${this.context.serviceName}-mcp-cluster`,
            containerInsights: true
        });
        this.applyStandardTags(this.cluster, {
            'resource-type': 'ecs-cluster'
        });
        this.logResourceCreation('ecs-cluster', this.cluster.clusterName);
    }
    createLogGroup() {
        const retentionDays = this.config.logging?.retentionDays ||
            (this.context.complianceFramework === 'fedramp-high' ?
                logs.RetentionDays.ONE_YEAR : logs.RetentionDays.ONE_MONTH);
        this.logGroup = new logs.LogGroup(this, 'LogGroup', {
            logGroupName: `/ecs/${this.context.serviceName}/mcp-server`,
            retention: retentionDays,
            removalPolicy: cdk.RemovalPolicy.RETAIN
        });
        this.applyStandardTags(this.logGroup, {
            'resource-type': 'log-group'
        });
    }
    createTaskDefinition() {
        this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
            cpu: this.config.cpu,
            memoryLimitMiB: this.config.memory,
            family: `${this.context.serviceName}-mcp-server`
        });
        // Add necessary permissions
        this.taskDefinition.addToTaskRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                // Git repository access
                'codecommit:GitPull',
                'codecommit:GetRepository',
                'codecommit:ListRepositories',
                // AWS resource discovery
                'ec2:Describe*',
                'lambda:List*',
                'lambda:Get*',
                'rds:Describe*',
                's3:List*',
                's3:GetBucket*',
                'sns:List*',
                'sns:GetTopic*',
                'sqs:List*',
                'sqs:GetQueue*',
                'ecs:Describe*',
                'ecs:List*',
                // Secrets manager for authentication
                'secretsmanager:GetSecretValue',
                // CloudFormation for stack analysis
                'cloudformation:Describe*',
                'cloudformation:List*'
            ],
            resources: ['*']
        }));
        // Cross-account roles for multi-account access
        if (this.config.dataSources?.aws?.crossAccountRoles) {
            this.taskDefinition.addToTaskRolePolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['sts:AssumeRole'],
                resources: this.config.dataSources.aws.crossAccountRoles
            }));
        }
        // Container definition
        const container = this.taskDefinition.addContainer('McpServerContainer', {
            image: ecs.ContainerImage.fromEcrRepository(this.repository, this.config.imageTag),
            environment: {
                NODE_ENV: 'production',
                PORT: this.config.containerPort.toString(),
                SERVICE_NAME: this.context.serviceName,
                ENVIRONMENT: this.context.environment,
                COMPLIANCE_FRAMEWORK: this.context.complianceFramework,
                LOG_LEVEL: this.config.logging?.logLevel || 'INFO'
            },
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: 'mcp-server',
                logGroup: this.logGroup
            }),
            healthCheck: {
                command: ['CMD-SHELL', `curl -f http://localhost:${this.config.containerPort}/admin/health || exit 1`],
                interval: cdk.Duration.seconds(30),
                timeout: cdk.Duration.seconds(5),
                retries: 3,
                startPeriod: cdk.Duration.seconds(60)
            }
        });
        container.addPortMappings({
            containerPort: this.config.containerPort,
            protocol: ecs.Protocol.TCP
        });
        this.applyStandardTags(this.taskDefinition, {
            'resource-type': 'ecs-task-definition'
        });
    }
    createEcsService() {
        this.service = new ecs.FargateService(this, 'Service', {
            cluster: this.cluster,
            taskDefinition: this.taskDefinition,
            serviceName: `${this.context.serviceName}-mcp-server`,
            desiredCount: this.config.taskCount,
            platformVersion: ecs.FargatePlatformVersion.LATEST,
            enableExecuteCommand: this.context.complianceFramework !== 'fedramp-high',
            assignPublicIp: false
        });
        // Auto-scaling
        const scalableTarget = this.service.autoScaleTaskCount({
            minCapacity: this.config.taskCount,
            maxCapacity: this.config.taskCount * 3
        });
        scalableTarget.scaleOnCpuUtilization('CpuScaling', {
            targetUtilizationPercent: 70,
            scaleInCooldown: cdk.Duration.minutes(5),
            scaleOutCooldown: cdk.Duration.minutes(1)
        });
        scalableTarget.scaleOnMemoryUtilization('MemoryScaling', {
            targetUtilizationPercent: 80,
            scaleInCooldown: cdk.Duration.minutes(5),
            scaleOutCooldown: cdk.Duration.minutes(1)
        });
        this.applyStandardTags(this.service, {
            'resource-type': 'ecs-service'
        });
        this.logResourceCreation('ecs-service', this.service.serviceName);
    }
    createLoadBalancer() {
        if (!this.cluster) {
            throw new Error('ECS Cluster must be created before Load Balancer');
        }
        this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
            vpc: this.cluster.vpc,
            internetFacing: true,
            loadBalancerName: `${this.context.serviceName}-mcp-alb`
        });
        // Target group
        const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
            vpc: this.cluster.vpc,
            port: this.config.containerPort,
            protocol: elbv2.ApplicationProtocol.HTTP,
            targetType: elbv2.TargetType.IP,
            healthCheck: {
                enabled: true,
                path: '/admin/health',
                port: this.config.containerPort.toString(),
                protocol: elbv2.Protocol.HTTP,
                healthyHttpCodes: '200',
                interval: cdk.Duration.seconds(30),
                timeout: cdk.Duration.seconds(5),
                healthyThresholdCount: 2,
                unhealthyThresholdCount: 3
            }
        });
        // Associate service with target group
        this.service.attachToApplicationTargetGroup(targetGroup);
        // Listener
        const listener = this.loadBalancer.addListener('Listener', {
            port: 443,
            protocol: elbv2.ApplicationProtocol.HTTPS,
            certificates: this.config.loadBalancer?.certificateArn ?
                [elbv2.ListenerCertificate.fromArn(this.config.loadBalancer.certificateArn)] : undefined,
            defaultTargetGroups: [targetGroup]
        });
        // HTTP redirect to HTTPS
        this.loadBalancer.addListener('HttpListener', {
            port: 80,
            protocol: elbv2.ApplicationProtocol.HTTP,
            defaultAction: elbv2.ListenerAction.redirect({
                protocol: elbv2.ApplicationProtocol.HTTPS,
                port: '443'
            })
        });
        this.applyStandardTags(this.loadBalancer, {
            'resource-type': 'application-load-balancer'
        });
        this.logResourceCreation('application-load-balancer', this.loadBalancer.loadBalancerName);
    }
    buildApiCapability() {
        const endpoint = this.loadBalancer ?
            `https://${this.config.loadBalancer?.domainName || this.loadBalancer.loadBalancerDnsName}` :
            `http://internal:${this.config.containerPort}`;
        return {
            endpoint: endpoint,
            protocol: 'HTTPS',
            apiType: 'REST',
            version: '1.0',
            paths: {
                '/platform/*': 'Platform-Level Endpoints',
                '/services/*': 'Service-Level Endpoints',
                '/platform/generate/*': 'Generative Tooling Endpoints',
                '/admin/*': 'Platform Administration Endpoints'
            },
            authentication: {
                type: 'Bearer',
                scopes: ['read:services', 'generate:components', 'admin:platform']
            }
        };
    }
    buildContainerCapability() {
        return {
            clusterArn: this.cluster.clusterArn,
            serviceArn: this.service.serviceArn,
            taskDefinitionArn: this.taskDefinition.taskDefinitionArn,
            repositoryUri: this.repository.repositoryUri,
            imageTag: this.config.imageTag,
            containerPort: this.config.containerPort
        };
    }
    applyComplianceDefaults(config) {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return {
                    ...config,
                    cpu: Math.max(config.cpu || 512, 1024),
                    memory: Math.max(config.memory || 1024, 2048),
                    taskCount: Math.max(config.taskCount || 2, 3),
                    logging: {
                        retentionDays: 365,
                        logLevel: 'INFO',
                        ...config.logging
                    }
                };
            case 'fedramp-moderate':
                return {
                    ...config,
                    cpu: Math.max(config.cpu || 512, 512),
                    memory: Math.max(config.memory || 1024, 1024),
                    taskCount: Math.max(config.taskCount || 2, 2),
                    logging: {
                        retentionDays: 90,
                        logLevel: 'INFO',
                        ...config.logging
                    }
                };
            default:
                return config;
        }
    }
    applyComplianceHardening() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                this.applyFedrampHighHardening();
                break;
            case 'fedramp-moderate':
                this.applyFedrampModerateHardening();
                break;
            default:
                this.applyCommercialHardening();
                break;
        }
    }
    applyFedrampHighHardening() {
        // Enhanced audit logging
        const auditLogGroup = new logs.LogGroup(this, 'AuditLogs', {
            logGroupName: `/audit/${this.context.serviceName}/mcp-server`,
            retention: logs.RetentionDays.ONE_YEAR,
            removalPolicy: cdk.RemovalPolicy.RETAIN
        });
        // Security group restrictions
        if (this.service && this.service.connections.securityGroups.length > 0) {
            const securityGroup = this.service.connections.securityGroups[0];
            // Restrict outbound traffic
            securityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS outbound for AWS APIs');
        }
        // Apply FedRAMP High tags
        this.applyStandardTags(this.service, {
            'compliance-level': 'fedramp-high',
            'audit-required': 'true',
            'encryption-required': 'true'
        });
    }
    applyFedrampModerateHardening() {
        // Apply FedRAMP Moderate tags
        this.applyStandardTags(this.service, {
            'compliance-level': 'fedramp-moderate',
            'audit-enabled': 'true'
        });
    }
    applyCommercialHardening() {
        // Apply commercial tags
        this.applyStandardTags(this.service, {
            'compliance-level': 'commercial'
        });
    }
}
exports.McpServerComponent = McpServerComponent;
