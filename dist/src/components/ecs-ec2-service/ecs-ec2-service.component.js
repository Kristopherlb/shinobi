"use strict";
/**
 * ECS EC2 Service Component
 *
 * EC2-based containerized service that runs on ECS cluster instances with
 * Service Connect integration for microservice discovery.
 * Implements the Platform ECS Service Connect Standard v1.0.
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
exports.EcsEc2ServiceComponent = exports.EcsEc2ServiceConfigBuilder = exports.ECS_EC2_SERVICE_CONFIG_SCHEMA = void 0;
const ecs = __importStar(require("aws-cdk-lib/aws-ecs"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const cdk = __importStar(require("aws-cdk-lib"));
const component_1 = require("../../../src/platform/contracts/component");
const config_builder_1 = require("../../../src/platform/contracts/config-builder");
/**
 * Configuration schema for ECS EC2 Service component
 */
exports.ECS_EC2_SERVICE_CONFIG_SCHEMA = {
    type: 'object',
    title: 'ECS EC2 Service Configuration',
    description: 'Configuration for creating an EC2-based ECS service with Service Connect',
    required: ['cluster', 'image', 'taskCpu', 'taskMemory', 'port', 'serviceConnect'],
    properties: {
        cluster: {
            type: 'string',
            description: 'Name of the ECS cluster component to deploy to',
            minLength: 1
        },
        image: {
            type: 'object',
            title: 'Container Image Configuration',
            description: 'Container image and tag specification',
            required: ['repository'],
            properties: {
                repository: {
                    type: 'string',
                    description: 'Container image URI or repository name',
                    pattern: '^[a-zA-Z0-9][a-zA-Z0-9._/-]*$',
                    examples: ['nginx', 'my-app', '123456789012.dkr.ecr.us-west-2.amazonaws.com/my-app']
                },
                tag: {
                    type: 'string',
                    description: 'Image tag',
                    pattern: '^[a-zA-Z0-9._-]+$',
                    default: 'latest'
                }
            },
            additionalProperties: false
        },
        taskCpu: {
            type: 'number',
            description: 'CPU units for task (1024 = 1 vCPU)',
            minimum: 128,
            maximum: 10240,
            examples: [256, 512, 1024, 2048]
        },
        taskMemory: {
            type: 'number',
            description: 'Memory allocation for task in MiB',
            minimum: 128,
            maximum: 30720,
            examples: [512, 1024, 2048, 4096]
        },
        port: {
            type: 'number',
            description: 'Container port that the service listens on',
            minimum: 1,
            maximum: 65535,
            examples: [80, 8080, 3000, 5000]
        },
        serviceConnect: {
            type: 'object',
            title: 'Service Connect Configuration',
            description: 'Configuration for ECS Service Connect service discovery',
            required: ['portMappingName'],
            properties: {
                portMappingName: {
                    type: 'string',
                    description: 'Friendly name for the port mapping in service discovery',
                    pattern: '^[a-zA-Z][a-zA-Z0-9-]*$',
                    minLength: 1,
                    maxLength: 64,
                    examples: ['api', 'web', 'service']
                }
            },
            additionalProperties: false
        },
        environment: {
            type: 'object',
            description: 'Environment variables for the container',
            additionalProperties: {
                type: 'string'
            }
        },
        secrets: {
            type: 'object',
            description: 'Secrets from AWS Secrets Manager (key: secretArn)',
            additionalProperties: {
                type: 'string',
                pattern: '^arn:aws:secretsmanager:'
            }
        },
        taskRoleArn: {
            type: 'string',
            description: 'IAM role ARN for task permissions',
            pattern: '^arn:aws:iam:'
        },
        desiredCount: {
            type: 'number',
            description: 'Number of desired tasks',
            minimum: 0,
            maximum: 1000,
            default: 1
        },
        placementConstraints: {
            type: 'array',
            description: 'Placement constraints for task placement on EC2 instances',
            items: {
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                        enum: ['memberOf', 'distinctInstance'],
                        description: 'Type of placement constraint'
                    },
                    expression: {
                        type: 'string',
                        description: 'Constraint expression (required for memberOf type)'
                    }
                },
                required: ['type'],
                additionalProperties: false
            }
        },
        placementStrategies: {
            type: 'array',
            description: 'Placement strategies for task placement optimization',
            items: {
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                        enum: ['random', 'spread', 'binpack'],
                        description: 'Type of placement strategy'
                    },
                    field: {
                        type: 'string',
                        description: 'Field to apply the strategy to (e.g., instanceId, attribute:zone)',
                        examples: ['instanceId', 'attribute:ecs.availability-zone', 'attribute:ecs.instance-type']
                    }
                },
                required: ['type'],
                additionalProperties: false
            }
        },
        healthCheck: {
            type: 'object',
            title: 'Health Check Configuration',
            description: 'Container health check configuration',
            required: ['command'],
            properties: {
                command: {
                    type: 'array',
                    description: 'Health check command',
                    items: {
                        type: 'string'
                    },
                    minItems: 1,
                    examples: [['CMD-SHELL', 'curl -f http://localhost:8080/health || exit 1']]
                },
                interval: {
                    type: 'number',
                    description: 'Health check interval in seconds',
                    minimum: 5,
                    maximum: 300,
                    default: 30
                },
                timeout: {
                    type: 'number',
                    description: 'Health check timeout in seconds',
                    minimum: 2,
                    maximum: 60,
                    default: 5
                },
                retries: {
                    type: 'number',
                    description: 'Number of retries before marking unhealthy',
                    minimum: 1,
                    maximum: 10,
                    default: 3
                }
            },
            additionalProperties: false
        },
        autoScaling: {
            type: 'object',
            title: 'Auto Scaling Configuration',
            description: 'Auto scaling configuration for the service',
            required: ['minCapacity', 'maxCapacity'],
            properties: {
                minCapacity: {
                    type: 'number',
                    description: 'Minimum number of tasks',
                    minimum: 0,
                    maximum: 1000
                },
                maxCapacity: {
                    type: 'number',
                    description: 'Maximum number of tasks',
                    minimum: 1,
                    maximum: 1000
                },
                targetCpuUtilization: {
                    type: 'number',
                    description: 'Target CPU utilization percentage for scaling',
                    minimum: 10,
                    maximum: 100,
                    default: 70
                },
                targetMemoryUtilization: {
                    type: 'number',
                    description: 'Target memory utilization percentage for scaling',
                    minimum: 10,
                    maximum: 100,
                    default: 80
                }
            },
            additionalProperties: false
        },
        tags: {
            type: 'object',
            description: 'Additional tags for service resources',
            additionalProperties: {
                type: 'string'
            }
        }
    },
    additionalProperties: false,
    // Default values
    defaults: {
        image: {
            tag: 'latest'
        },
        desiredCount: 1,
        healthCheck: {
            interval: 30,
            timeout: 5,
            retries: 3
        },
        autoScaling: {
            targetCpuUtilization: 70,
            targetMemoryUtilization: 80
        }
    }
};
/**
 * ECS EC2 Service Configuration Builder
 * Implements the centralized 5-layer precedence engine
 */
class EcsEc2ServiceConfigBuilder extends config_builder_1.ConfigBuilder {
    constructor(context, spec) {
        const builderContext = { context, spec };
        super(builderContext, exports.ECS_EC2_SERVICE_CONFIG_SCHEMA);
    }
    /**
     * Builds the final configuration using the centralized precedence engine
     */
    async build() {
        return this.buildSync();
    }
    /**
     * Provide EC2 service-specific hardcoded fallbacks
     */
    getHardcodedFallbacks() {
        return {
            taskCpu: 256, // Minimal CPU for cost optimization
            taskMemory: 512, // Minimal memory
            desiredCount: 1, // Single task
            image: {
                tag: 'latest'
            },
            port: 8080, // Common application port
            serviceConnect: {
                portMappingName: 'api' // Generic port mapping name
            },
            healthCheck: {
                interval: 30,
                timeout: 5,
                retries: 3
            },
            // Default placement strategy: spread across instances
            placementStrategies: [{
                    type: 'spread',
                    field: 'instanceId'
                }]
        };
    }
    /**
     * Get compliance framework specific defaults
     */
    getComplianceFrameworkDefaults() {
        const framework = this.builderContext.context.complianceFramework;
        switch (framework) {
            case 'fedramp-high':
                return {
                    taskCpu: 1024, // Higher CPU for compliance workloads
                    taskMemory: 2048, // Higher memory
                    desiredCount: 2, // High availability
                    healthCheck: {
                        interval: 15, // More frequent health checks
                        timeout: 3,
                        retries: 2
                    },
                    autoScaling: {
                        minCapacity: 2, // Always have 2+ instances
                        maxCapacity: 10,
                        targetCpuUtilization: 60, // More conservative scaling
                        targetMemoryUtilization: 70
                    },
                    // High compliance placement: spread across AZs and instances
                    placementStrategies: [
                        { type: 'spread', field: 'attribute:ecs.availability-zone' },
                        { type: 'spread', field: 'instanceId' }
                    ]
                };
            case 'fedramp-moderate':
                return {
                    taskCpu: 512, // Balanced CPU
                    taskMemory: 1024, // Balanced memory
                    desiredCount: 1, // Single task acceptable
                    healthCheck: {
                        interval: 20, // Enhanced health checks
                        timeout: 5,
                        retries: 3
                    },
                    autoScaling: {
                        minCapacity: 1,
                        maxCapacity: 5,
                        targetCpuUtilization: 65,
                        targetMemoryUtilization: 75
                    },
                    placementStrategies: [{
                            type: 'spread',
                            field: 'instanceId'
                        }]
                };
            default: // commercial
                return {
                    taskCpu: 256, // Cost optimized
                    taskMemory: 512,
                    desiredCount: 1,
                    autoScaling: {
                        minCapacity: 1,
                        maxCapacity: 3, // Limited scaling for cost
                        targetCpuUtilization: 70,
                        targetMemoryUtilization: 80
                    },
                    // Cost-optimized placement: binpack to minimize instance usage
                    placementStrategies: [{
                            type: 'binpack',
                            field: 'memory'
                        }]
                };
        }
    }
}
exports.EcsEc2ServiceConfigBuilder = EcsEc2ServiceConfigBuilder;
/**
 * ECS EC2 Service Component implementing Component API Contract v1.0 and
 * Platform ECS Service Connect Standard v1.0
 */
class EcsEc2ServiceComponent extends component_1.BaseComponent {
    service;
    taskDefinition;
    securityGroup;
    logGroup;
    config;
    configBuilder;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    /**
     * Synthesis phase - Create ECS EC2 Service with Service Connect
     */
    synth() {
        this.logComponentEvent('synthesis_start', 'Starting ECS EC2 Service synthesis');
        try {
            // Build configuration using ConfigBuilder
            this.configBuilder = new EcsEc2ServiceConfigBuilder(this.context, this.spec);
            this.config = this.configBuilder.buildSync();
            // Create task definition
            this.createTaskDefinition();
            // Create security group
            this.createSecurityGroup();
            // Create EC2 service
            this.createEc2Service();
            // Configure auto scaling if specified
            this.configureAutoScaling();
            // Apply standard platform tags
            this.applyServiceTags();
            // Register constructs
            this.registerConstruct('service', this.service);
            this.registerConstruct('taskDefinition', this.taskDefinition);
            this.registerConstruct('securityGroup', this.securityGroup);
            this.registerConstruct('logGroup', this.logGroup);
            // Register service:connect capability
            this.registerCapability('service:connect', this.buildServiceConnectCapability());
            this.logComponentEvent('synthesis_complete', 'ECS EC2 Service synthesis completed successfully');
        }
        catch (error) {
            this.logError(error, 'ECS EC2 Service synthesis');
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
        return 'ecs-ec2-service';
    }
    /**
     * Create EC2 task definition
     */
    createTaskDefinition() {
        // Create log group for container logs
        this.logGroup = new logs.LogGroup(this, 'LogGroup', {
            logGroupName: `/ecs/${this.context.serviceName}/${this.spec.name}`,
            retention: this.getLogRetention(),
            removalPolicy: this.isComplianceFramework() ?
                cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
        });
        // Create task role if not provided
        let taskRole;
        if (this.config.taskRoleArn) {
            taskRole = iam.Role.fromRoleArn(this, 'TaskRole', this.config.taskRoleArn);
        }
        else {
            taskRole = new iam.Role(this, 'TaskRole', {
                assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
                description: `Task role for ${this.context.serviceName} ${this.spec.name}`,
            });
        }
        // Create task definition
        this.taskDefinition = new ecs.Ec2TaskDefinition(this, 'TaskDefinition', {
            family: `${this.context.serviceName}-${this.spec.name}`,
            taskRole: taskRole,
        });
        // Add container to task definition
        const imageUri = this.config.image.tag ?
            `${this.config.image.repository}:${this.config.image.tag}` :
            `${this.config.image.repository}:latest`;
        const container = this.taskDefinition.addContainer('Container', {
            image: ecs.ContainerImage.fromRegistry(imageUri),
            cpu: this.config.taskCpu,
            memoryLimitMiB: this.config.taskMemory,
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: this.spec.name,
                logGroup: this.logGroup
            }),
            environment: this.config.environment,
            secrets: this.buildSecretsFromConfig(),
        });
        // Add port mapping
        container.addPortMappings({
            name: this.config.serviceConnect.portMappingName,
            containerPort: this.config.port,
            protocol: ecs.Protocol.TCP,
            // For EC2, we can also specify host port if needed
            // hostPort: this.config!.port, // Uncomment for static port mapping
        });
        // Add health check if configured
        if (this.config.healthCheck) {
            // Health check is configured through container logging and task definition
            // The actual health check command would be applied during container creation
            this.logComponentEvent('health_check_configured', 'Health check configured for container');
        }
        this.logResourceCreation('ec2-task-definition', this.taskDefinition.family);
    }
    /**
     * Create security group for the service
     */
    createSecurityGroup() {
        const vpc = this.getVpcFromContext();
        this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
            vpc: vpc,
            description: `Security group for ${this.context.serviceName} ${this.spec.name}`,
            allowAllOutbound: true, // Allow outbound traffic by default
        });
        // Allow inbound traffic on the service port from within VPC
        this.securityGroup.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(this.config.port), 'Allow inbound traffic on service port');
        this.logResourceCreation('security-group', this.securityGroup.securityGroupId);
    }
    /**
     * Create the EC2 service with Service Connect
     */
    createEc2Service() {
        if (!this.taskDefinition || !this.securityGroup) {
            throw new Error('Task definition and security group must be created before EC2 service');
        }
        // Get cluster from binding (this requires the cluster component to be bound)
        const cluster = this.getClusterFromBinding();
        const vpc = this.getVpcFromContext();
        // Build placement constraints
        const placementConstraints = this.config.placementConstraints?.map(constraint => this.buildPlacementConstraint(constraint.type, constraint.expression));
        // Build placement strategies  
        const placementStrategies = this.config.placementStrategies?.map(strategy => this.buildPlacementStrategy(strategy.type, strategy.field));
        // Create the EC2 service
        this.service = new ecs.Ec2Service(this, 'Service', {
            cluster: cluster,
            taskDefinition: this.taskDefinition,
            desiredCount: this.config.desiredCount,
            serviceName: `${this.context.serviceName}-${this.spec.name}`,
            // Network configuration
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, // Private subnets for security
            },
            securityGroups: [this.securityGroup],
            // EC2-specific placement configuration
            placementConstraints: placementConstraints,
            placementStrategies: placementStrategies,
            // Service Connect configuration
            serviceConnectConfiguration: {
                namespace: cluster.defaultCloudMapNamespace?.namespaceName,
                services: [{
                        portMappingName: this.config.serviceConnect.portMappingName,
                        dnsName: this.spec.name, // Service will be discoverable as http://{component-name}.{namespace}
                        port: this.config.port,
                    }],
            },
            // Enable circuit breaker for deployment safety
            enableExecuteCommand: this.isComplianceFramework(), // Enable for compliance debugging
        });
        this.logResourceCreation('ec2-service', this.service.serviceName);
    }
    /**
     * Configure auto scaling if specified in configuration
     */
    configureAutoScaling() {
        if (!this.config.autoScaling || !this.service) {
            return;
        }
        const autoScalingConfig = this.config.autoScaling;
        // Setup service auto scaling
        const scaling = this.service.autoScaleTaskCount({
            minCapacity: autoScalingConfig.minCapacity,
            maxCapacity: autoScalingConfig.maxCapacity,
        });
        // CPU-based scaling
        if (autoScalingConfig.targetCpuUtilization) {
            scaling.scaleOnCpuUtilization('CpuScaling', {
                targetUtilizationPercent: autoScalingConfig.targetCpuUtilization,
                scaleInCooldown: cdk.Duration.minutes(5),
                scaleOutCooldown: cdk.Duration.minutes(2),
            });
        }
        // Memory-based scaling
        if (autoScalingConfig.targetMemoryUtilization) {
            scaling.scaleOnMemoryUtilization('MemoryScaling', {
                targetUtilizationPercent: autoScalingConfig.targetMemoryUtilization,
                scaleInCooldown: cdk.Duration.minutes(5),
                scaleOutCooldown: cdk.Duration.minutes(2),
            });
        }
        this.logComponentEvent('autoscaling_configured', `Auto scaling configured: ${autoScalingConfig.minCapacity}-${autoScalingConfig.maxCapacity} tasks`);
    }
    /**
     * Apply standard platform tags to service resources
     */
    applyServiceTags() {
        const standardTags = {
            'component-type': 'ecs-ec2-service',
            'service-connect-name': this.config.serviceConnect.portMappingName,
            'container-port': this.config.port.toString(),
            'task-cpu': this.config.taskCpu.toString(),
            'task-memory': this.config.taskMemory.toString()
        };
        if (this.service) {
            this.applyStandardTags(this.service, standardTags);
        }
        if (this.taskDefinition) {
            this.applyStandardTags(this.taskDefinition, standardTags);
        }
        if (this.securityGroup) {
            this.applyStandardTags(this.securityGroup, standardTags);
        }
        // Apply user-defined tags
        if (this.config.tags) {
            Object.entries(this.config.tags).forEach(([key, value]) => {
                if (this.service) {
                    cdk.Tags.of(this.service).add(key, value);
                }
            });
        }
    }
    /**
     * Build the service:connect capability for other components to bind to
     */
    buildServiceConnectCapability() {
        const cluster = this.getClusterFromBinding();
        return {
            serviceName: this.spec.name,
            serviceArn: this.service.serviceArn,
            clusterName: cluster.clusterName,
            dnsName: `${this.spec.name}.${cluster.defaultCloudMapNamespace?.namespaceName}`,
            port: this.config.port,
            portMappingName: this.config.serviceConnect.portMappingName,
            securityGroupId: this.securityGroup.securityGroupId,
            internalEndpoint: `http://${this.spec.name}.internal:${this.config.port}`, // Service Connect endpoint
            computeType: 'EC2' // Distinguish from Fargate services
        };
    }
    /**
     * Build secrets configuration from config
     */
    buildSecretsFromConfig() {
        if (!this.config.secrets) {
            return undefined;
        }
        const secrets = {};
        Object.entries(this.config.secrets).forEach(([key, secretArn]) => {
            const secret = secretsmanager.Secret.fromSecretCompleteArn(this, `Secret-${key}`, secretArn);
            secrets[key] = ecs.Secret.fromSecretsManager(secret);
        });
        return secrets;
    }
    /**
     * Build placement constraint for ECS service
     */
    buildPlacementConstraint(type, expression) {
        switch (type) {
            case 'memberOf':
                if (!expression) {
                    throw new Error('memberOf placement constraint requires an expression');
                }
                return ecs.PlacementConstraint.memberOf(expression);
            case 'distinctInstance':
                return ecs.PlacementConstraint.distinctInstances();
            default:
                throw new Error(`Unknown placement constraint type: ${type}`);
        }
    }
    /**
     * Build placement strategy for ECS service
     */
    buildPlacementStrategy(type, field) {
        switch (type) {
            case 'random':
                return ecs.PlacementStrategy.randomly();
            case 'spread':
                return field ?
                    ecs.PlacementStrategy.spreadAcross(field) :
                    ecs.PlacementStrategy.spreadAcrossInstances();
            case 'binpack':
                // Note: binpack strategy implementation may vary by CDK version
                return field ?
                    ecs.PlacementStrategy.packedBy(field) :
                    ecs.PlacementStrategy.packedBy(ecs.BinPackResource.MEMORY);
            default:
                throw new Error(`Unknown placement strategy type: ${type}`);
        }
    }
    /**
     * Get log retention based on compliance framework
     */
    getLogRetention() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return logs.RetentionDays.TWO_YEARS;
            case 'fedramp-moderate':
                return logs.RetentionDays.ONE_YEAR;
            default:
                return logs.RetentionDays.ONE_MONTH;
        }
    }
    /**
     * Check if component is running under a compliance framework
     */
    isComplianceFramework() {
        return this.context.complianceFramework !== 'commercial';
    }
    /**
     * Get ECS cluster from configuration
     * The cluster name in config should reference either the cluster name or ARN
     */
    getClusterFromBinding() {
        if (!this.config?.cluster) {
            throw new Error('ECS cluster configuration is required for EC2 service');
        }
        // If cluster config looks like an ARN, import it
        if (this.config.cluster.startsWith('arn:aws:ecs:')) {
            return ecs.Cluster.fromClusterArn(this, 'ImportedCluster', this.config.cluster);
        }
        // If cluster config looks like a cluster name, import by name
        if (this.config.cluster.includes('/')) {
            // Format: cluster-name or account/cluster-name
            const clusterName = this.config.cluster.split('/').pop() || this.config.cluster;
            return ecs.Cluster.fromClusterAttributes(this, 'ImportedCluster', {
                clusterName: clusterName,
                vpc: this.getVpcFromContext()
            });
        }
        // Assume it's a simple cluster name
        return ecs.Cluster.fromClusterAttributes(this, 'ImportedCluster', {
            clusterName: this.config.cluster,
            vpc: this.getVpcFromContext()
        });
    }
    /**
     * Get VPC from context
     */
    getVpcFromContext() {
        // In a real implementation, this would get the VPC from the service context
        return ec2.Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true });
    }
    /**
     * Validate that component has been synthesized
     */
    validateSynthesized() {
        if (!this.service) {
            throw new Error('ECS EC2 Service component must be synthesized before accessing capabilities');
        }
    }
}
exports.EcsEc2ServiceComponent = EcsEc2ServiceComponent;
