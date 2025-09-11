"use strict";
/**
 * Application Load Balancer Component implementing Component API Contract v1.0
 *
 * A managed layer 7 load balancer for distributing HTTP/HTTPS traffic across targets.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
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
exports.ApplicationLoadBalancerComponent = exports.ApplicationLoadBalancerConfigBuilder = exports.APPLICATION_LOAD_BALANCER_CONFIG_SCHEMA = void 0;
const elbv2 = __importStar(require("aws-cdk-lib/aws-elasticloadbalancingv2"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cdk = __importStar(require("aws-cdk-lib"));
const component_1 = require("../../../src/platform/contracts/component");
/**
 * Configuration schema for Application Load Balancer component
 */
exports.APPLICATION_LOAD_BALANCER_CONFIG_SCHEMA = {
    type: 'object',
    title: 'Application Load Balancer Configuration',
    description: 'Configuration for creating an Application Load Balancer',
    properties: {
        loadBalancerName: {
            type: 'string',
            description: 'Name of the Application Load Balancer',
            pattern: '^[a-zA-Z0-9-]+$',
            minLength: 1,
            maxLength: 32
        },
        scheme: {
            type: 'string',
            description: 'Load balancer scheme',
            enum: ['internet-facing', 'internal'],
            default: 'internet-facing'
        },
        ipAddressType: {
            type: 'string',
            description: 'IP address type',
            enum: ['ipv4', 'dualstack'],
            default: 'ipv4'
        },
        vpc: {
            type: 'object',
            description: 'VPC configuration',
            properties: {
                vpcId: {
                    type: 'string',
                    description: 'VPC ID where the load balancer will be created'
                },
                subnetIds: {
                    type: 'array',
                    description: 'Subnet IDs for the load balancer',
                    items: {
                        type: 'string',
                        pattern: '^subnet-[a-f0-9]+$'
                    },
                    minItems: 2
                },
                subnetType: {
                    type: 'string',
                    description: 'Type of subnets to use',
                    enum: ['public', 'private'],
                    default: 'public'
                }
            }
        },
        listenerConfigs: {
            type: 'array',
            description: 'Listener configurations',
            items: {
                type: 'object',
                required: ['port', 'protocol'],
                properties: {
                    port: {
                        type: 'number',
                        description: 'Port number for the listener',
                        minimum: 1,
                        maximum: 65535
                    },
                    protocol: {
                        type: 'string',
                        description: 'Protocol for the listener',
                        enum: ['HTTP', 'HTTPS']
                    },
                    certificateArn: {
                        type: 'string',
                        description: 'ARN of the SSL certificate for HTTPS listeners',
                        pattern: '^arn:aws:acm:[a-z0-9-]+:[0-9]{12}:certificate/[a-f0-9-]+$'
                    },
                    sslPolicy: {
                        type: 'string',
                        description: 'SSL policy for HTTPS listeners',
                        default: 'ELBSecurityPolicy-TLS-1-2-2017-01'
                    },
                    redirectToHttps: {
                        type: 'boolean',
                        description: 'Whether to redirect HTTP to HTTPS',
                        default: false
                    }
                }
            },
            default: [
                {
                    port: 80,
                    protocol: 'HTTP'
                }
            ]
        },
        targetGroups: {
            type: 'array',
            description: 'Target group configurations',
            items: {
                type: 'object',
                required: ['name', 'port', 'protocol', 'targetType'],
                properties: {
                    name: {
                        type: 'string',
                        description: 'Name of the target group',
                        pattern: '^[a-zA-Z0-9-]+$',
                        minLength: 1,
                        maxLength: 32
                    },
                    port: {
                        type: 'number',
                        description: 'Port for the target group',
                        minimum: 1,
                        maximum: 65535
                    },
                    protocol: {
                        type: 'string',
                        description: 'Protocol for the target group',
                        enum: ['HTTP', 'HTTPS']
                    },
                    targetType: {
                        type: 'string',
                        description: 'Type of targets',
                        enum: ['instance', 'ip', 'lambda']
                    },
                    healthCheck: {
                        type: 'object',
                        description: 'Health check configuration',
                        properties: {
                            enabled: {
                                type: 'boolean',
                                description: 'Enable health checks',
                                default: true
                            },
                            path: {
                                type: 'string',
                                description: 'Health check path',
                                default: '/'
                            },
                            protocol: {
                                type: 'string',
                                description: 'Health check protocol',
                                enum: ['HTTP', 'HTTPS'],
                                default: 'HTTP'
                            },
                            healthyThresholdCount: {
                                type: 'number',
                                description: 'Healthy threshold count',
                                minimum: 2,
                                maximum: 10,
                                default: 2
                            },
                            unhealthyThresholdCount: {
                                type: 'number',
                                description: 'Unhealthy threshold count',
                                minimum: 2,
                                maximum: 10,
                                default: 2
                            },
                            timeout: {
                                type: 'number',
                                description: 'Health check timeout in seconds',
                                minimum: 2,
                                maximum: 120,
                                default: 5
                            },
                            interval: {
                                type: 'number',
                                description: 'Health check interval in seconds',
                                minimum: 5,
                                maximum: 300,
                                default: 30
                            }
                        }
                    }
                }
            }
        },
        accessLogs: {
            type: 'object',
            description: 'Access logging configuration',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable access logging',
                    default: false
                },
                bucket: {
                    type: 'string',
                    description: 'S3 bucket for access logs'
                },
                prefix: {
                    type: 'string',
                    description: 'S3 prefix for access logs'
                }
            }
        },
        securityGroups: {
            type: 'object',
            description: 'Security group configuration',
            properties: {
                create: {
                    type: 'boolean',
                    description: 'Create a new security group',
                    default: true
                },
                securityGroupIds: {
                    type: 'array',
                    description: 'Existing security group IDs',
                    items: {
                        type: 'string',
                        pattern: '^sg-[a-f0-9]+$'
                    }
                },
                ingress: {
                    type: 'array',
                    description: 'Ingress rules for the security group',
                    items: {
                        type: 'object',
                        required: ['port', 'protocol'],
                        properties: {
                            port: {
                                type: 'number',
                                description: 'Port number',
                                minimum: 1,
                                maximum: 65535
                            },
                            protocol: {
                                type: 'string',
                                description: 'Protocol',
                                enum: ['tcp', 'udp', 'icmp']
                            },
                            cidr: {
                                type: 'string',
                                description: 'CIDR block',
                                default: '0.0.0.0/0'
                            },
                            description: {
                                type: 'string',
                                description: 'Rule description'
                            }
                        }
                    }
                }
            }
        },
        deletionProtection: {
            type: 'boolean',
            description: 'Enable deletion protection',
            default: false
        },
        idleTimeout: {
            type: 'number',
            description: 'Idle timeout in seconds',
            minimum: 1,
            maximum: 4000,
            default: 60
        },
        deploymentStrategy: {
            type: 'object',
            description: 'Deployment strategy configuration',
            properties: {
                type: {
                    type: 'string',
                    description: 'Deployment strategy type',
                    enum: ['single', 'blue-green'],
                    default: 'single'
                },
                blueGreenConfig: {
                    type: 'object',
                    description: 'Blue-green deployment configuration',
                    properties: {
                        productionTrafficRoute: {
                            type: 'object',
                            description: 'Production traffic routing configuration',
                            properties: {
                                type: {
                                    type: 'string',
                                    description: 'Traffic routing type',
                                    enum: ['AllAtOnce', 'Linear', 'Canary'],
                                    default: 'AllAtOnce'
                                },
                                percentage: {
                                    type: 'number',
                                    description: 'Traffic percentage for canary/linear deployments',
                                    minimum: 1,
                                    maximum: 100,
                                    default: 10
                                },
                                interval: {
                                    type: 'number',
                                    description: 'Interval in minutes between traffic shifts',
                                    minimum: 1,
                                    maximum: 60,
                                    default: 5
                                }
                            }
                        },
                        terminationWaitTime: {
                            type: 'number',
                            description: 'Wait time in minutes before terminating old environment',
                            minimum: 0,
                            maximum: 2880,
                            default: 5
                        }
                    }
                }
            }
        },
        monitoring: {
            type: 'object',
            description: 'CloudWatch monitoring configuration',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable CloudWatch monitoring and alarms',
                    default: false
                },
                alarms: {
                    type: 'object',
                    description: 'CloudWatch alarm thresholds',
                    properties: {
                        httpCode5xxThreshold: {
                            type: 'number',
                            description: 'Threshold for HTTP 5xx errors alarm',
                            minimum: 1,
                            default: 10
                        },
                        unhealthyHostThreshold: {
                            type: 'number',
                            description: 'Threshold for unhealthy hosts alarm',
                            minimum: 1,
                            default: 1
                        },
                        connectionErrorThreshold: {
                            type: 'number',
                            description: 'Threshold for connection errors alarm',
                            minimum: 1,
                            default: 5
                        },
                        rejectedConnectionThreshold: {
                            type: 'number',
                            description: 'Threshold for rejected connections alarm',
                            minimum: 1,
                            default: 1
                        }
                    }
                }
            }
        },
        tags: {
            type: 'object',
            description: 'Tags for the load balancer',
            additionalProperties: {
                type: 'string'
            }
        }
    },
    additionalProperties: false
};
/**
 * Configuration builder for Application Load Balancer component
 * Extends the abstract ConfigBuilder to ensure consistent configuration lifecycle
 */
class ApplicationLoadBalancerConfigBuilder {
    context;
    spec;
    constructor(context, spec) {
        this.context = context;
        this.spec = spec;
    }
    /**
     * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
     */
    async build() {
        return this.buildSync();
    }
    /**
     * Synchronous version of build for use in synth() method
     */
    buildSync() {
        // Start with platform defaults
        const platformDefaults = this.getPlatformDefaults();
        // Apply compliance framework defaults
        const complianceDefaults = this.getComplianceFrameworkDefaults();
        // Merge user configuration from spec
        const userConfig = this.spec.config || {};
        // Merge configurations (user config takes precedence)
        let mergedConfig = this.mergeConfigs(this.mergeConfigs(platformDefaults, complianceDefaults), userConfig);
        // Apply feature flag-driven configuration overrides
        mergedConfig = this.applyFeatureFlagOverrides(mergedConfig);
        return mergedConfig;
    }
    /**
     * Simple merge utility for combining configuration objects
     */
    mergeConfigs(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.mergeConfigs(result[key] || {}, source[key]);
            }
            else {
                result[key] = source[key];
            }
        }
        return result;
    }
    /**
     * Get platform-wide defaults for Application Load Balancer
     */
    getPlatformDefaults() {
        return {
            scheme: 'internet-facing',
            ipAddressType: 'ipv4',
            deletionProtection: false,
            idleTimeout: 60,
            listeners: [
                {
                    port: 80,
                    protocol: 'HTTP'
                }
            ],
            securityGroups: {
                create: true,
                ingress: [
                    {
                        port: 80,
                        protocol: 'tcp',
                        cidr: '0.0.0.0/0',
                        description: 'HTTP access from internet'
                    },
                    {
                        port: 443,
                        protocol: 'tcp',
                        cidr: '0.0.0.0/0',
                        description: 'HTTPS access from internet'
                    }
                ]
            },
            accessLogs: {
                enabled: false
            },
            deploymentStrategy: {
                type: 'single'
            },
            monitoring: {
                enabled: false
            }
        };
    }
    /**
     * Get compliance framework specific defaults
     */
    getComplianceFrameworkDefaults() {
        const framework = this.context.complianceFramework;
        switch (framework) {
            case 'fedramp-moderate':
                return {
                    deletionProtection: true, // Prevent accidental deletion
                    accessLogs: {
                        enabled: true, // Required for audit compliance
                        prefix: 'alb-access-logs'
                    },
                    deploymentStrategy: {
                        type: 'single' // Blue-green handled by CodeDeploy
                    },
                    monitoring: {
                        enabled: true // Enhanced monitoring for compliance
                    },
                    listeners: [
                        {
                            port: 443,
                            protocol: 'HTTPS',
                            sslPolicy: 'ELBSecurityPolicy-TLS-1-2-2017-01'
                        }
                    ],
                    securityGroups: {
                        create: true,
                        ingress: [
                            {
                                port: 443,
                                protocol: 'tcp',
                                cidr: '0.0.0.0/0',
                                description: 'HTTPS access from internet'
                            }
                        ]
                    }
                };
            case 'fedramp-high':
                return {
                    deletionProtection: true, // Mandatory for high compliance
                    accessLogs: {
                        enabled: true, // Mandatory audit logging
                        prefix: 'alb-access-logs'
                    },
                    deploymentStrategy: {
                        type: 'single' // Blue-green handled by CodeDeploy
                    },
                    monitoring: {
                        enabled: true // Comprehensive monitoring required
                    },
                    listeners: [
                        {
                            port: 443,
                            protocol: 'HTTPS',
                            sslPolicy: 'ELBSecurityPolicy-TLS-1-2-Ext-2018-06' // More secure TLS policy
                        }
                    ],
                    securityGroups: {
                        create: true,
                        ingress: [
                            {
                                port: 443,
                                protocol: 'tcp',
                                cidr: '0.0.0.0/0',
                                description: 'HTTPS access from internet'
                            }
                        ]
                    }
                };
            default: // commercial
                return {
                    deletionProtection: false, // Cost optimization
                    accessLogs: {
                        enabled: false // Optional for commercial
                    },
                    deploymentStrategy: {
                        type: 'single'
                    },
                    monitoring: {
                        enabled: false
                    }
                };
        }
    }
    /**
     * Apply feature flag-driven configuration overrides
     */
    applyFeatureFlagOverrides(config) {
        const result = { ...config };
        // Evaluate feature flags for deployment strategy
        if (this.evaluateFeatureFlag('enable-blue-green-deployment', false)) {
            result.deploymentStrategy = {
                type: 'blue-green',
                blueGreenConfig: {
                    productionTrafficRoute: {
                        type: 'Linear',
                        percentage: 10,
                        interval: 5
                    },
                    terminationWaitTime: 5
                }
            };
        }
        // Evaluate feature flags for enhanced monitoring
        if (this.evaluateFeatureFlag('enable-enhanced-monitoring', false)) {
            result.monitoring = {
                enabled: true,
                alarms: {
                    httpCode5xxThreshold: 5, // More sensitive when enhanced monitoring is enabled
                    unhealthyHostThreshold: 1,
                    connectionErrorThreshold: 3,
                    rejectedConnectionThreshold: 1
                }
            };
        }
        // Evaluate feature flags for deletion protection override
        if (this.evaluateFeatureFlag('force-deletion-protection', false)) {
            result.deletionProtection = true;
        }
        return result;
    }
    /**
     * Evaluate a feature flag with fallback to default value
     */
    evaluateFeatureFlag(flagKey, defaultValue) {
        // In a real implementation, this would:
        // 1. Connect to the bound OpenFeature provider component
        // 2. Evaluate the flag using the provider's client
        // 3. Return the result with proper error handling
        // For now, return enhanced behavior for compliance frameworks
        if (this.context.complianceFramework !== 'commercial') {
            return true; // Enable enhanced features for compliance frameworks
        }
        return defaultValue;
    }
}
exports.ApplicationLoadBalancerConfigBuilder = ApplicationLoadBalancerConfigBuilder;
/**
 * Application Load Balancer Component implementing Component API Contract v1.0
 */
class ApplicationLoadBalancerComponent extends component_1.BaseComponent {
    loadBalancer;
    targetGroups = [];
    listeners = [];
    securityGroup;
    vpc;
    accessLogsBucket;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    /**
     * Synthesis phase - Create Application Load Balancer with compliance hardening
     */
    synth() {
        this.logComponentEvent('synthesis_start', 'Starting Application Load Balancer synthesis');
        try {
            // Build configuration using ConfigBuilder
            const configBuilder = new ApplicationLoadBalancerConfigBuilder(this.context, this.spec);
            this.config = configBuilder.buildSync();
            // Lookup or create VPC
            this.lookupVpc();
            // Create security group if needed
            this.createSecurityGroupIfNeeded();
            // Create access logs bucket if needed
            this.createAccessLogsBucketIfNeeded();
            // Create Application Load Balancer
            this.createApplicationLoadBalancer();
            // Create target groups
            this.createTargetGroups();
            // Create listeners
            this.createListeners();
            // Configure observability (OpenTelemetry Standard)
            this.configureObservabilityForAlb();
            // Apply compliance hardening
            this.applyComplianceHardening();
            // Register constructs
            this.registerConstruct('loadBalancer', this.loadBalancer);
            if (this.securityGroup) {
                this.registerConstruct('securityGroup', this.securityGroup);
            }
            this.targetGroups.forEach((tg, index) => {
                this.registerConstruct(`targetGroup${index}`, tg);
            });
            // Register capabilities
            this.registerCapability('net:load-balancer', this.buildLoadBalancerCapability());
            this.registerCapability('net:load-balancer-target', this.buildTargetCapability());
            this.logComponentEvent('synthesis_complete', 'Application Load Balancer synthesis completed successfully');
        }
        catch (error) {
            this.logError(error, 'Application Load Balancer synthesis');
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
        return 'application-load-balancer';
    }
    /**
     * Lookup VPC from configuration or use default
     */
    lookupVpc() {
        const vpcConfig = this.config.vpc;
        if (vpcConfig?.vpcId) {
            this.vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
                vpcId: vpcConfig.vpcId
            });
        }
        else {
            // Use default VPC
            this.vpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', {
                isDefault: true
            });
        }
    }
    /**
     * Create security group for the load balancer if needed
     */
    createSecurityGroupIfNeeded() {
        const sgConfig = this.config.securityGroups;
        if (sgConfig?.create) {
            this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
                vpc: this.vpc,
                description: `Security group for ${this.context.serviceName}-${this.spec.name} ALB`,
                allowAllOutbound: true
            });
            // Add ingress rules
            if (sgConfig.ingress) {
                for (const rule of sgConfig.ingress) {
                    this.securityGroup.addIngressRule(ec2.Peer.ipv4(rule.cidr || '0.0.0.0/0'), ec2.Port.tcp(rule.port), rule.description || `Allow ${rule.protocol} on port ${rule.port}`);
                }
            }
            // Apply standard tags
            this.applyStandardTags(this.securityGroup, {
                'resource-type': 'security-group',
                'alb-name': this.config.loadBalancerName || `${this.context.serviceName}-${this.spec.name}`
            });
            this.logResourceCreation('security-group', this.securityGroup.securityGroupId);
        }
    }
    /**
     * Create S3 bucket for access logs if needed
     */
    createAccessLogsBucketIfNeeded() {
        const accessLogsConfig = this.config.accessLogs;
        if (accessLogsConfig?.enabled && !accessLogsConfig.bucket) {
            // Create access logs bucket
            const bucketName = `${this.context.serviceName}-${this.spec.name}-access-logs`;
            this.accessLogsBucket = new s3.Bucket(this, 'AccessLogsBucket', {
                bucketName,
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
                encryption: s3.BucketEncryption.S3_MANAGED,
                enforceSSL: true,
                lifecycleRules: [
                    {
                        id: 'DeleteOldLogs',
                        enabled: true,
                        expiration: cdk.Duration.days(this.isComplianceFramework() ? 90 : 30)
                    }
                ],
                removalPolicy: this.isComplianceFramework() ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
            });
            // Apply standard tags
            this.applyStandardTags(this.accessLogsBucket, {
                'resource-type': 's3-bucket',
                'purpose': 'alb-access-logs'
            });
            this.logResourceCreation('s3-bucket', bucketName);
        }
    }
    /**
     * Create Application Load Balancer
     */
    createApplicationLoadBalancer() {
        const loadBalancerName = this.config.loadBalancerName || `${this.context.serviceName}-${this.spec.name}`;
        // Get subnets
        const subnets = this.getSubnets();
        // Get security groups
        const securityGroups = this.getSecurityGroups();
        this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
            loadBalancerName,
            vpc: this.vpc,
            vpcSubnets: { subnets },
            internetFacing: this.config.scheme === 'internet-facing',
            ipAddressType: this.config.ipAddressType === 'dualstack'
                ? elbv2.IpAddressType.DUAL_STACK
                : elbv2.IpAddressType.IPV4,
            securityGroup: this.securityGroup,
            deletionProtection: this.config.deletionProtection,
            idleTimeout: cdk.Duration.seconds(this.config.idleTimeout || 60)
        });
        // Enable access logs if configured
        if (this.config.accessLogs?.enabled) {
            const bucket = this.accessLogsBucket || s3.Bucket.fromBucketName(this, 'ExistingAccessLogsBucket', this.config.accessLogs.bucket);
            this.loadBalancer.logAccessLogs(bucket, this.config.accessLogs.prefix);
        }
        // Apply standard tags
        this.applyStandardTags(this.loadBalancer, {
            'resource-type': 'application-load-balancer',
            'scheme': this.config.scheme || 'internet-facing',
            ...this.config.tags
        });
        this.logResourceCreation('application-load-balancer', this.loadBalancer.loadBalancerName);
    }
    /**
     * Get subnets for the load balancer
     */
    getSubnets() {
        const vpcConfig = this.config.vpc;
        if (vpcConfig?.subnetIds) {
            return vpcConfig.subnetIds.map((subnetId, index) => ec2.Subnet.fromSubnetId(this, `Subnet${index}`, subnetId));
        }
        // Use subnets by type
        const subnetType = vpcConfig?.subnetType || 'public';
        if (subnetType === 'public') {
            return this.vpc.publicSubnets;
        }
        else {
            return this.vpc.privateSubnets;
        }
    }
    /**
     * Get security groups for the load balancer
     */
    getSecurityGroups() {
        const sgConfig = this.config.securityGroups;
        if (sgConfig?.securityGroupIds) {
            return sgConfig.securityGroupIds.map((sgId, index) => ec2.SecurityGroup.fromSecurityGroupId(this, `ExistingSG${index}`, sgId));
        }
        if (this.securityGroup) {
            return [this.securityGroup];
        }
        return [];
    }
    /**
     * Create target groups from configuration
     */
    createTargetGroups() {
        if (!this.config.targetGroups) {
            // Handle blue-green deployment strategy
            if (this.config.deploymentStrategy?.type === 'blue-green') {
                this.createBlueGreenTargetGroups();
                return;
            }
            return;
        }
        for (const tgConfig of this.config.targetGroups) {
            const targetGroup = new elbv2.ApplicationTargetGroup(this, `TargetGroup${tgConfig.name}`, {
                targetGroupName: `${this.context.serviceName}-${tgConfig.name}`,
                port: tgConfig.port,
                protocol: tgConfig.protocol === 'HTTPS' ? elbv2.ApplicationProtocol.HTTPS : elbv2.ApplicationProtocol.HTTP,
                vpc: this.vpc,
                targetType: this.mapTargetType(tgConfig.targetType),
                healthCheck: tgConfig.healthCheck ? {
                    enabled: tgConfig.healthCheck.enabled,
                    path: tgConfig.healthCheck.path,
                    protocol: tgConfig.healthCheck.protocol === 'HTTPS' ? elbv2.Protocol.HTTPS : elbv2.Protocol.HTTP,
                    port: tgConfig.healthCheck.port?.toString(),
                    healthyThresholdCount: tgConfig.healthCheck.healthyThresholdCount,
                    unhealthyThresholdCount: tgConfig.healthCheck.unhealthyThresholdCount,
                    timeout: tgConfig.healthCheck.timeout ? cdk.Duration.seconds(tgConfig.healthCheck.timeout) : undefined,
                    interval: tgConfig.healthCheck.interval ? cdk.Duration.seconds(tgConfig.healthCheck.interval) : undefined,
                    healthyHttpCodes: tgConfig.healthCheck.matcher
                } : undefined
            });
            // Configure stickiness if specified
            if (tgConfig.stickiness?.enabled) {
                targetGroup.setAttribute('stickiness.enabled', 'true');
                targetGroup.setAttribute('stickiness.type', 'lb_cookie');
                if (tgConfig.stickiness.duration) {
                    targetGroup.setAttribute('stickiness.lb_cookie.duration_seconds', tgConfig.stickiness.duration.toString());
                }
            }
            this.targetGroups.push(targetGroup);
            // Apply standard tags
            this.applyStandardTags(targetGroup, {
                'resource-type': 'target-group',
                'target-type': tgConfig.targetType
            });
            this.logResourceCreation('target-group', targetGroup.targetGroupName);
        }
    }
    /**
     * Map target type string to CDK enum
     */
    mapTargetType(targetType) {
        switch (targetType) {
            case 'instance':
                return elbv2.TargetType.INSTANCE;
            case 'ip':
                return elbv2.TargetType.IP;
            case 'lambda':
                return elbv2.TargetType.LAMBDA;
            default:
                throw new Error(`Unsupported target type: ${targetType}`);
        }
    }
    /**
     * Create listeners from configuration
     */
    createListeners() {
        if (!this.config.listeners)
            return;
        for (const listenerConfig of this.config.listeners) {
            const listener = this.loadBalancer.addListener(`Listener${listenerConfig.port}`, {
                port: listenerConfig.port,
                protocol: listenerConfig.protocol === 'HTTPS' ? elbv2.ApplicationProtocol.HTTPS : elbv2.ApplicationProtocol.HTTP,
                certificates: listenerConfig.certificateArn ? [
                    elbv2.ListenerCertificate.fromArn(listenerConfig.certificateArn)
                ] : undefined,
                sslPolicy: listenerConfig.sslPolicy ? elbv2.SslPolicy.TLS12_EXT : undefined,
                defaultAction: this.buildDefaultAction(listenerConfig)
            });
            this.listeners.push(listener);
            this.logResourceCreation('listener', `port-${listenerConfig.port}`);
        }
    }
    /**
     * Build default action for listener
     */
    buildDefaultAction(listenerConfig) {
        if (listenerConfig.redirectToHttps && listenerConfig.protocol === 'HTTP') {
            return elbv2.ListenerAction.redirect({
                protocol: 'HTTPS',
                port: '443',
                permanent: true
            });
        }
        if (listenerConfig.defaultAction) {
            const action = listenerConfig.defaultAction;
            switch (action.type) {
                case 'fixed-response':
                    return elbv2.ListenerAction.fixedResponse(action.statusCode || 200, {
                        contentType: action.contentType,
                        messageBody: action.messageBody
                    });
                case 'redirect':
                    return elbv2.ListenerAction.redirect({
                        host: action.redirectUrl ? new URL(action.redirectUrl).hostname : undefined,
                        path: action.redirectUrl ? new URL(action.redirectUrl).pathname : undefined,
                        permanent: true
                    });
                case 'forward':
                    if (this.targetGroups.length > 0) {
                        return elbv2.ListenerAction.forward(this.targetGroups);
                    }
                    break;
            }
        }
        // Default action: return fixed response
        return elbv2.ListenerAction.fixedResponse(200, {
            contentType: 'text/plain',
            messageBody: 'OK'
        });
    }
    /**
     * Apply compliance hardening based on framework
     */
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
    /**
     * Create blue-green target groups for deployment strategy
     */
    createBlueGreenTargetGroups() {
        // Create Blue target group
        const blueTargetGroup = new elbv2.ApplicationTargetGroup(this, 'BlueTargetGroup', {
            targetGroupName: `${this.context.serviceName}-${this.spec.name}-blue`,
            port: 80,
            protocol: elbv2.ApplicationProtocol.HTTP,
            vpc: this.vpc,
            targetType: elbv2.TargetType.INSTANCE,
            healthCheck: {
                enabled: true,
                path: '/health',
                protocol: elbv2.Protocol.HTTP,
                healthyThresholdCount: 2,
                unhealthyThresholdCount: 2,
                timeout: cdk.Duration.seconds(5),
                interval: cdk.Duration.seconds(30)
            }
        });
        // Create Green target group
        const greenTargetGroup = new elbv2.ApplicationTargetGroup(this, 'GreenTargetGroup', {
            targetGroupName: `${this.context.serviceName}-${this.spec.name}-green`,
            port: 80,
            protocol: elbv2.ApplicationProtocol.HTTP,
            vpc: this.vpc,
            targetType: elbv2.TargetType.INSTANCE,
            healthCheck: {
                enabled: true,
                path: '/health',
                protocol: elbv2.Protocol.HTTP,
                healthyThresholdCount: 2,
                unhealthyThresholdCount: 2,
                timeout: cdk.Duration.seconds(5),
                interval: cdk.Duration.seconds(30)
            }
        });
        this.targetGroups.push(blueTargetGroup, greenTargetGroup);
        // Apply standard tags
        this.applyStandardTags(blueTargetGroup, {
            'resource-type': 'target-group',
            'deployment-strategy': 'blue-green',
            'environment-type': 'blue'
        });
        this.applyStandardTags(greenTargetGroup, {
            'resource-type': 'target-group',
            'deployment-strategy': 'blue-green',
            'environment-type': 'green'
        });
        this.logResourceCreation('blue-target-group', blueTargetGroup.targetGroupName);
        this.logResourceCreation('green-target-group', greenTargetGroup.targetGroupName);
    }
    /**
     * Configure OpenTelemetry Observability Standard - CloudWatch Alarms for ALB
     */
    configureObservabilityForAlb() {
        const monitoringConfig = this.config.monitoring;
        if (!monitoringConfig?.enabled) {
            return;
        }
        const alarmThresholds = monitoringConfig.alarms || {};
        const loadBalancerFullName = this.loadBalancer.loadBalancerFullName;
        // 1. HTTP 5xx Server Errors Alarm
        new cloudwatch.Alarm(this, 'HTTPCode5xxAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-http-5xx-errors`,
            alarmDescription: 'ALB HTTP 5xx server errors alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ApplicationELB',
                metricName: 'HTTPCode_Target_5XX_Count',
                dimensionsMap: {
                    LoadBalancer: loadBalancerFullName
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: alarmThresholds.httpCode5xxThreshold || 10,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // 2. Unhealthy Host Count Alarm
        new cloudwatch.Alarm(this, 'UnHealthyHostAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-unhealthy-hosts`,
            alarmDescription: 'ALB unhealthy host count alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ApplicationELB',
                metricName: 'UnHealthyHostCount',
                dimensionsMap: {
                    LoadBalancer: loadBalancerFullName
                },
                statistic: 'Average',
                period: cdk.Duration.minutes(5)
            }),
            threshold: alarmThresholds.unhealthyHostThreshold || 1,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // 3. Target Connection Error Count Alarm
        new cloudwatch.Alarm(this, 'TargetConnectionErrorAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-connection-errors`,
            alarmDescription: 'ALB target connection errors alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ApplicationELB',
                metricName: 'TargetConnectionErrorCount',
                dimensionsMap: {
                    LoadBalancer: loadBalancerFullName
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: alarmThresholds.connectionErrorThreshold || 5,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // 4. Rejected Connection Count Alarm
        new cloudwatch.Alarm(this, 'RejectedConnectionAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-rejected-connections`,
            alarmDescription: 'ALB rejected connections alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ApplicationELB',
                metricName: 'RejectedConnectionCount',
                dimensionsMap: {
                    LoadBalancer: loadBalancerFullName
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: alarmThresholds.rejectedConnectionThreshold || 1,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to ALB', {
            alarmsCreated: 4,
            monitoringEnabled: true,
            thresholds: alarmThresholds
        });
    }
    /**
     * Build load balancer capability data shape
     */
    buildLoadBalancerCapability() {
        const capability = {
            loadBalancerArn: this.loadBalancer.loadBalancerArn,
            loadBalancerDnsName: this.loadBalancer.loadBalancerDnsName,
            loadBalancerCanonicalHostedZoneId: this.loadBalancer.loadBalancerCanonicalHostedZoneId,
            listeners: this.listeners.map(listener => ({
                listenerArn: listener.listenerArn,
                port: listener.port
            }))
        };
        // Add blue-green specific capabilities for CodeDeploy integration
        if (this.config.deploymentStrategy?.type === 'blue-green') {
            capability.deploymentStrategy = {
                type: 'blue-green',
                blueTargetGroupArn: this.targetGroups[0]?.targetGroupArn,
                greenTargetGroupArn: this.targetGroups[1]?.targetGroupArn,
                listenerArn: this.listeners[0]?.listenerArn
            };
        }
        return capability;
    }
    /**
     * Build target capability data shape
     */
    buildTargetCapability() {
        return {
            targetGroups: this.targetGroups.map(tg => ({
                targetGroupArn: tg.targetGroupArn,
                targetGroupName: tg.targetGroupName
            }))
        };
    }
    /**
     * Apply FedRAMP High compliance hardening
     */
    applyFedrampHighHardening() {
        this.logComplianceEvent('fedramp_high_hardening_applied', 'Applied FedRAMP High hardening to Application Load Balancer', {
            deletionProtection: this.config.deletionProtection,
            accessLogsEnabled: this.config.accessLogs?.enabled,
            httpsEnforced: this.config.listeners?.every(l => l.protocol === 'HTTPS'),
            observabilityEnabled: this.config.monitoring?.enabled,
            deploymentStrategy: this.config.deploymentStrategy?.type
        });
    }
    /**
     * Apply FedRAMP Moderate compliance hardening
     */
    applyFedrampModerateHardening() {
        this.logComplianceEvent('fedramp_moderate_hardening_applied', 'Applied FedRAMP Moderate hardening to Application Load Balancer', {
            deletionProtection: this.config.deletionProtection,
            accessLogsEnabled: this.config.accessLogs?.enabled,
            observabilityEnabled: this.config.monitoring?.enabled,
            deploymentStrategy: this.config.deploymentStrategy?.type
        });
    }
    /**
     * Apply commercial hardening
     */
    applyCommercialHardening() {
        this.logComponentEvent('commercial_hardening_applied', 'Applied commercial security hardening to Application Load Balancer');
    }
    /**
     * Check if this is a compliance framework
     */
    isComplianceFramework() {
        return this.context.complianceFramework !== 'commercial';
    }
}
exports.ApplicationLoadBalancerComponent = ApplicationLoadBalancerComponent;
