"use strict";
/**
 * ElastiCache Redis Component implementing Component API Contract v1.0
 *
 * A managed Redis cluster for high-performance in-memory caching.
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
exports.ElastiCacheRedisComponent = exports.ElastiCacheRedisConfigBuilder = exports.ELASTICACHE_REDIS_CONFIG_SCHEMA = void 0;
const elasticache = __importStar(require("aws-cdk-lib/aws-elasticache"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cdk = __importStar(require("aws-cdk-lib"));
const src_1 = require("../../../platform/contracts/src");
/**
 * Configuration schema for ElastiCache Redis component
 */
exports.ELASTICACHE_REDIS_CONFIG_SCHEMA = {
    type: 'object',
    title: 'ElastiCache Redis Configuration',
    description: 'Configuration for creating an ElastiCache Redis cluster',
    properties: {
        clusterName: {
            type: 'string',
            description: 'Name of the Redis cluster',
            pattern: '^[a-zA-Z0-9-]+$',
            minLength: 1,
            maxLength: 40
        },
        engineVersion: {
            type: 'string',
            description: 'Redis engine version',
            enum: ['6.2', '7.0', '7.1'],
            default: '7.0'
        },
        nodeType: {
            type: 'string',
            description: 'EC2 instance type for cache nodes',
            enum: [
                'cache.t4g.micro', 'cache.t4g.small', 'cache.t4g.medium',
                'cache.t3.micro', 'cache.t3.small', 'cache.t3.medium',
                'cache.m6g.large', 'cache.m6g.xlarge', 'cache.m6g.2xlarge',
                'cache.m5.large', 'cache.m5.xlarge', 'cache.m5.2xlarge',
                'cache.r6g.large', 'cache.r6g.xlarge', 'cache.r6g.2xlarge',
                'cache.r5.large', 'cache.r5.xlarge', 'cache.r5.2xlarge'
            ],
            default: 'cache.t4g.micro'
        },
        numCacheNodes: {
            type: 'number',
            description: 'Number of cache nodes in the cluster',
            minimum: 1,
            maximum: 20,
            default: 1
        },
        port: {
            type: 'number',
            description: 'Port number for Redis access',
            minimum: 1024,
            maximum: 65535,
            default: 6379
        },
        vpc: {
            type: 'object',
            description: 'VPC configuration',
            properties: {
                vpcId: {
                    type: 'string',
                    description: 'VPC ID where the cluster will be created'
                },
                subnetIds: {
                    type: 'array',
                    description: 'Subnet IDs for the cluster',
                    items: {
                        type: 'string',
                        pattern: '^subnet-[a-f0-9]+$'
                    },
                    minItems: 1
                },
                subnetGroupName: {
                    type: 'string',
                    description: 'Name of the cache subnet group'
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
                allowedCidrs: {
                    type: 'array',
                    description: 'CIDR blocks allowed to access Redis',
                    items: {
                        type: 'string',
                        pattern: '^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$'
                    },
                    default: ['10.0.0.0/8']
                }
            }
        },
        parameterGroup: {
            type: 'object',
            description: 'Parameter group configuration',
            properties: {
                family: {
                    type: 'string',
                    description: 'Parameter group family',
                    enum: ['redis6.x', 'redis7'],
                    default: 'redis7'
                },
                parameters: {
                    type: 'object',
                    description: 'Redis configuration parameters',
                    additionalProperties: {
                        type: 'string'
                    }
                }
            }
        },
        encryption: {
            type: 'object',
            description: 'Encryption configuration',
            properties: {
                atRest: {
                    type: 'boolean',
                    description: 'Enable encryption at rest',
                    default: false
                },
                inTransit: {
                    type: 'boolean',
                    description: 'Enable encryption in transit',
                    default: false
                },
                authTokenEnabled: {
                    type: 'boolean',
                    description: 'Enable Redis AUTH token',
                    default: false
                }
            }
        },
        backup: {
            type: 'object',
            description: 'Backup configuration',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable automatic backups',
                    default: false
                },
                retentionPeriod: {
                    type: 'number',
                    description: 'Backup retention period in days',
                    minimum: 1,
                    maximum: 35,
                    default: 7
                },
                window: {
                    type: 'string',
                    description: 'Backup window (HH:MM-HH:MM UTC)',
                    pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-3]):[0-5][0-9]$',
                    default: '03:00-05:00'
                }
            }
        },
        maintenance: {
            type: 'object',
            description: 'Maintenance configuration',
            properties: {
                window: {
                    type: 'string',
                    description: 'Maintenance window (ddd:HH:MM-ddd:HH:MM UTC)',
                    pattern: '^(sun|mon|tue|wed|thu|fri|sat):[0-2][0-9]:[0-5][0-9]-(sun|mon|tue|wed|thu|fri|sat):[0-2][0-9]:[0-5][0-9]$',
                    default: 'sun:03:00-sun:04:00'
                },
                notificationTopicArn: {
                    type: 'string',
                    description: 'SNS topic ARN for maintenance notifications'
                }
            }
        },
        multiAz: {
            type: 'object',
            description: 'Multi-AZ configuration',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable Multi-AZ deployment',
                    default: false
                },
                automaticFailover: {
                    type: 'boolean',
                    description: 'Enable automatic failover',
                    default: false
                }
            }
        },
        monitoring: {
            type: 'object',
            description: 'Monitoring configuration',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable enhanced monitoring',
                    default: false
                },
                logDeliveryConfigurations: {
                    type: 'array',
                    description: 'Log delivery configurations',
                    items: {
                        type: 'object',
                        required: ['logType', 'destinationType', 'destinationName'],
                        properties: {
                            logType: {
                                type: 'string',
                                description: 'Type of log',
                                enum: ['slow-log', 'engine-log']
                            },
                            destinationType: {
                                type: 'string',
                                description: 'Destination type for logs',
                                enum: ['cloudwatch-logs', 'kinesis-firehose']
                            },
                            destinationName: {
                                type: 'string',
                                description: 'Name of the destination'
                            },
                            logFormat: {
                                type: 'string',
                                description: 'Log format',
                                enum: ['text', 'json'],
                                default: 'text'
                            }
                        }
                    }
                }
            }
        }
    },
    additionalProperties: false
};
/**
 * Configuration builder for ElastiCache Redis component
 */
class ElastiCacheRedisConfigBuilder {
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
        const mergedConfig = this.mergeConfigs(this.mergeConfigs(platformDefaults, complianceDefaults), userConfig);
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
     * Get platform-wide defaults for ElastiCache Redis
     */
    getPlatformDefaults() {
        return {
            engineVersion: '7.0',
            nodeType: 'cache.t4g.micro',
            numCacheNodes: 1,
            port: 6379,
            encryption: {
                atRest: false,
                inTransit: false,
                authTokenEnabled: false
            },
            backup: {
                enabled: false,
                retentionPeriod: 7,
                window: '03:00-05:00'
            },
            maintenance: {
                window: 'sun:03:00-sun:04:00'
            },
            multiAz: {
                enabled: false,
                automaticFailover: false
            },
            monitoring: {
                enabled: false
            },
            securityGroups: {
                create: true,
                allowedCidrs: ['10.0.0.0/8']
            },
            parameterGroup: {
                family: 'redis7'
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
                    encryption: {
                        atRest: true, // Required for compliance
                        inTransit: true, // Required for compliance
                        authTokenEnabled: true // Required for compliance
                    },
                    backup: {
                        enabled: true, // Required for compliance
                        retentionPeriod: 14 // Extended retention
                    },
                    multiAz: {
                        enabled: true, // High availability required
                        automaticFailover: true
                    },
                    monitoring: {
                        enabled: true, // Enhanced monitoring required
                        logDeliveryConfigurations: [
                            {
                                logType: 'slow-log',
                                destinationType: 'cloudwatch-logs',
                                destinationName: `/aws/elasticache/redis/${this.context.serviceName}-${this.spec.name}`,
                                logFormat: 'json'
                            }
                        ]
                    },
                    parameterGroup: {
                        family: 'redis7',
                        parameters: {
                            'tcp-keepalive': '60',
                            'timeout': '300'
                        }
                    }
                };
            case 'fedramp-high':
                return {
                    encryption: {
                        atRest: true, // Mandatory for high compliance
                        inTransit: true, // Mandatory for high compliance
                        authTokenEnabled: true // Mandatory for high compliance
                    },
                    backup: {
                        enabled: true, // Mandatory for high compliance
                        retentionPeriod: 30 // Maximum retention
                    },
                    multiAz: {
                        enabled: true, // High availability mandatory
                        automaticFailover: true
                    },
                    monitoring: {
                        enabled: true, // Comprehensive monitoring required
                        logDeliveryConfigurations: [
                            {
                                logType: 'slow-log',
                                destinationType: 'cloudwatch-logs',
                                destinationName: `/aws/elasticache/redis/${this.context.serviceName}-${this.spec.name}`,
                                logFormat: 'json'
                            },
                            {
                                logType: 'engine-log',
                                destinationType: 'cloudwatch-logs',
                                destinationName: `/aws/elasticache/redis/engine/${this.context.serviceName}-${this.spec.name}`,
                                logFormat: 'json'
                            }
                        ]
                    },
                    parameterGroup: {
                        family: 'redis7',
                        parameters: {
                            'tcp-keepalive': '60',
                            'timeout': '300',
                            'maxmemory-policy': 'allkeys-lru'
                        }
                    },
                    securityGroups: {
                        create: true,
                        allowedCidrs: ['10.0.0.0/16'] // More restrictive CIDR
                    }
                };
            default: // commercial
                return {
                    encryption: {
                        atRest: false, // Cost optimization
                        inTransit: false,
                        authTokenEnabled: false
                    },
                    backup: {
                        enabled: false, // Cost optimization
                        retentionPeriod: 1
                    },
                    multiAz: {
                        enabled: false, // Single AZ for cost
                        automaticFailover: false
                    }
                };
        }
    }
}
exports.ElastiCacheRedisConfigBuilder = ElastiCacheRedisConfigBuilder;
/**
 * ElastiCache Redis Component implementing Component API Contract v1.0
 */
class ElastiCacheRedisComponent extends src_1.Component {
    replicationGroup;
    subnetGroup;
    securityGroup;
    parameterGroup;
    authToken;
    vpc;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    /**
     * Synthesis phase - Create ElastiCache Redis cluster with compliance hardening
     */
    synth() {
        this.logComponentEvent('synthesis_start', 'Starting ElastiCache Redis synthesis');
        try {
            // Build configuration using ConfigBuilder
            const configBuilder = new ElastiCacheRedisConfigBuilder(this.context, this.spec);
            this.config = configBuilder.buildSync();
            // Lookup VPC
            this.lookupVpc();
            // Create auth token if needed
            this.createAuthTokenIfNeeded();
            // Create parameter group
            this.createParameterGroup();
            // Create subnet group
            this.createSubnetGroup();
            // Create security group if needed
            this.createSecurityGroupIfNeeded();
            // Create Redis cluster
            this.createRedisCluster();
            // Apply compliance hardening
            this.applyComplianceHardening();
            // Configure observability
            this.configureObservabilityForRedis();
            // Register constructs
            this.registerConstruct('replicationGroup', this.replicationGroup);
            if (this.securityGroup) {
                this.registerConstruct('securityGroup', this.securityGroup);
            }
            if (this.subnetGroup) {
                this.registerConstruct('subnetGroup', this.subnetGroup);
            }
            if (this.parameterGroup) {
                this.registerConstruct('parameterGroup', this.parameterGroup);
            }
            if (this.authToken) {
                this.registerConstruct('authToken', this.authToken);
            }
            // Register capabilities
            this.registerCapability('cache:redis', this.buildRedisCapability());
            this.logComponentEvent('synthesis_complete', 'ElastiCache Redis synthesis completed successfully');
        }
        catch (error) {
            this.logError(error, 'ElastiCache Redis synthesis');
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
        return 'elasticache-redis';
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
     * Create auth token secret if auth is enabled
     */
    createAuthTokenIfNeeded() {
        if (this.config.encryption?.authTokenEnabled) {
            this.authToken = new secretsmanager.Secret(this, 'AuthToken', {
                description: `Redis AUTH token for ${this.context.serviceName}-${this.spec.name}`,
                generateSecretString: {
                    excludeCharacters: '"@/\\',
                    passwordLength: 32,
                    excludePunctuation: true
                },
                removalPolicy: this.isComplianceFramework() ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
            });
            // Apply standard tags
            this.applyStandardTags(this.authToken, {
                'resource-type': 'secret',
                'purpose': 'redis-auth'
            });
            this.logResourceCreation('secret', this.authToken.secretName);
        }
    }
    /**
     * Create parameter group for Redis configuration
     */
    createParameterGroup() {
        const paramConfig = this.config.parameterGroup;
        if (paramConfig?.parameters && Object.keys(paramConfig.parameters).length > 0) {
            this.parameterGroup = new elasticache.CfnParameterGroup(this, 'ParameterGroup', {
                cacheParameterGroupFamily: paramConfig.family || 'redis7',
                description: `Parameter group for ${this.context.serviceName}-${this.spec.name}`,
                properties: paramConfig.parameters
            });
            // Apply standard tags
            this.applyStandardTags(this.parameterGroup, {
                'resource-type': 'parameter-group',
                'family': paramConfig.family || 'redis7'
            });
            this.logResourceCreation('parameter-group', this.parameterGroup.ref);
        }
    }
    /**
     * Create subnet group for Redis cluster
     */
    createSubnetGroup() {
        const vpcConfig = this.config.vpc;
        const subnetGroupName = vpcConfig?.subnetGroupName || `${this.context.serviceName}-${this.spec.name}-subnet-group`;
        // Get subnet IDs
        let subnetIds;
        if (vpcConfig?.subnetIds) {
            subnetIds = vpcConfig.subnetIds;
        }
        else {
            // Use private subnets by default for security
            subnetIds = this.vpc.privateSubnets.map(subnet => subnet.subnetId);
        }
        this.subnetGroup = new elasticache.CfnSubnetGroup(this, 'SubnetGroup', {
            description: `Subnet group for ${this.context.serviceName}-${this.spec.name}`,
            subnetIds,
            cacheSubnetGroupName: subnetGroupName
        });
        // Apply standard tags
        this.applyStandardTags(this.subnetGroup, {
            'resource-type': 'subnet-group',
            'subnet-count': subnetIds.length.toString()
        });
        this.logResourceCreation('subnet-group', subnetGroupName);
    }
    /**
     * Create security group for Redis cluster if needed
     */
    createSecurityGroupIfNeeded() {
        const sgConfig = this.config.securityGroups;
        if (sgConfig?.create) {
            this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
                vpc: this.vpc,
                description: `Security group for ${this.context.serviceName}-${this.spec.name} Redis cluster`,
                allowAllOutbound: false
            });
            // Add ingress rules for Redis access
            const allowedCidrs = sgConfig.allowedCidrs || ['10.0.0.0/8'];
            for (const cidr of allowedCidrs) {
                this.securityGroup.addIngressRule(ec2.Peer.ipv4(cidr), ec2.Port.tcp(this.config.port || 6379), `Allow Redis access from ${cidr}`);
            }
            // Apply standard tags
            this.applyStandardTags(this.securityGroup, {
                'resource-type': 'security-group',
                'purpose': 'redis-access'
            });
            this.logResourceCreation('security-group', this.securityGroup.securityGroupId);
        }
    }
    /**
     * Create Redis replication group
     */
    createRedisCluster() {
        const clusterName = this.config.clusterName || `${this.context.serviceName}-${this.spec.name}`;
        // Build log delivery configurations
        const logDeliveryConfigurations = this.buildLogDeliveryConfigurations();
        this.replicationGroup = new elasticache.CfnReplicationGroup(this, 'ReplicationGroup', {
            replicationGroupId: clusterName,
            replicationGroupDescription: `Redis cluster for ${this.context.serviceName}-${this.spec.name}`,
            // Engine configuration
            engine: 'redis',
            engineVersion: this.config.engineVersion,
            cacheNodeType: this.config.nodeType,
            numCacheClusters: this.config.numCacheNodes,
            port: this.config.port,
            // Network configuration
            cacheSubnetGroupName: this.subnetGroup.cacheSubnetGroupName,
            securityGroupIds: this.getSecurityGroupIds(),
            // Parameter group
            cacheParameterGroupName: this.parameterGroup?.ref,
            // Encryption configuration
            atRestEncryptionEnabled: this.config.encryption?.atRest,
            transitEncryptionEnabled: this.config.encryption?.inTransit,
            authToken: this.authToken?.secretValue.unsafeUnwrap(),
            // Backup configuration
            snapshotRetentionLimit: this.config.backup?.enabled ? this.config.backup.retentionPeriod : 0,
            snapshotWindow: this.config.backup?.window,
            // Maintenance configuration
            preferredMaintenanceWindow: this.config.maintenance?.window,
            notificationTopicArn: this.config.maintenance?.notificationTopicArn,
            // Multi-AZ configuration
            multiAzEnabled: this.config.multiAz?.enabled,
            automaticFailoverEnabled: this.config.multiAz?.automaticFailover,
            // Monitoring
            logDeliveryConfigurations: logDeliveryConfigurations.length > 0 ? logDeliveryConfigurations : undefined
        });
        // Apply standard tags
        this.applyStandardTags(this.replicationGroup, {
            'resource-type': 'redis-cluster',
            'engine-version': this.config.engineVersion || '7.0',
            'node-type': this.config.nodeType || 'cache.t4g.micro',
            ...this.config.tags
        });
        this.logResourceCreation('redis-cluster', clusterName);
    }
    /**
     * Get security group IDs for the cluster
     */
    getSecurityGroupIds() {
        const sgConfig = this.config.securityGroups;
        if (sgConfig?.securityGroupIds) {
            return sgConfig.securityGroupIds;
        }
        if (this.securityGroup) {
            return [this.securityGroup.securityGroupId];
        }
        return [];
    }
    /**
     * Build log delivery configurations
     */
    buildLogDeliveryConfigurations() {
        const monitoringConfig = this.config.monitoring;
        if (!monitoringConfig?.enabled || !monitoringConfig.logDeliveryConfigurations) {
            return [];
        }
        return monitoringConfig.logDeliveryConfigurations.map(config => ({
            logType: config.logType,
            destinationType: config.destinationType,
            destinationDetails: {
                cloudWatchLogsDetails: config.destinationType === 'cloudwatch-logs' ? {
                    logGroup: config.destinationName
                } : undefined,
                kinesisFirehoseDetails: config.destinationType === 'kinesis-firehose' ? {
                    deliveryStream: config.destinationName
                } : undefined
            },
            logFormat: config.logFormat || 'text'
        }));
    }
    /**
     * Build Redis capability data shape
     */
    buildRedisCapability() {
        const clusterName = this.config.clusterName || `${this.context.serviceName}-${this.spec.name}`;
        return {
            clusterId: this.replicationGroup.replicationGroupId,
            primaryEndpoint: this.replicationGroup.attrPrimaryEndPointAddress,
            primaryPort: this.replicationGroup.attrPrimaryEndPointPort,
            readerEndpoint: this.replicationGroup.attrReaderEndPointAddress,
            authTokenArn: this.authToken?.secretArn
        };
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
     * Apply FedRAMP High compliance hardening
     */
    applyFedrampHighHardening() {
        this.logComplianceEvent('fedramp_high_hardening_applied', 'Applied FedRAMP High hardening to Redis cluster', {
            encryptionAtRest: this.config.encryption?.atRest,
            encryptionInTransit: this.config.encryption?.inTransit,
            authTokenEnabled: this.config.encryption?.authTokenEnabled,
            multiAzEnabled: this.config.multiAz?.enabled,
            backupRetention: this.config.backup?.retentionPeriod
        });
    }
    /**
     * Apply FedRAMP Moderate compliance hardening
     */
    applyFedrampModerateHardening() {
        this.logComplianceEvent('fedramp_moderate_hardening_applied', 'Applied FedRAMP Moderate hardening to Redis cluster', {
            encryptionAtRest: this.config.encryption?.atRest,
            encryptionInTransit: this.config.encryption?.inTransit,
            authTokenEnabled: this.config.encryption?.authTokenEnabled,
            multiAzEnabled: this.config.multiAz?.enabled
        });
    }
    /**
     * Apply commercial hardening
     */
    applyCommercialHardening() {
        this.logComponentEvent('commercial_hardening_applied', 'Applied commercial security hardening to Redis cluster');
    }
    /**
     * Configure CloudWatch observability for ElastiCache Redis
     */
    configureObservabilityForRedis() {
        const monitoringConfig = this.config.monitoring;
        if (!monitoringConfig?.enabled) {
            return;
        }
        const clusterName = this.config.clusterName || this.spec.name;
        // 1. CPU Utilization Alarm
        new cloudwatch.Alarm(this, 'CPUUtilizationAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-cpu-utilization`,
            alarmDescription: 'ElastiCache Redis CPU utilization alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ElastiCache',
                metricName: 'CPUUtilization',
                dimensionsMap: {
                    CacheClusterId: clusterName
                },
                statistic: 'Average',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 80,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // 2. Cache Misses Alarm
        new cloudwatch.Alarm(this, 'CacheMissesAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-cache-misses`,
            alarmDescription: 'ElastiCache Redis cache misses alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ElastiCache',
                metricName: 'CacheMisses',
                dimensionsMap: {
                    CacheClusterId: clusterName
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 1000,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // 3. Evictions Alarm
        new cloudwatch.Alarm(this, 'EvictionsAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-evictions`,
            alarmDescription: 'ElastiCache Redis evictions alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ElastiCache',
                metricName: 'Evictions',
                dimensionsMap: {
                    CacheClusterId: clusterName
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 10,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // 4. Connection Count Alarm
        new cloudwatch.Alarm(this, 'CurrConnectionsAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-connections`,
            alarmDescription: 'ElastiCache Redis connection count alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ElastiCache',
                metricName: 'CurrConnections',
                dimensionsMap: {
                    CacheClusterId: clusterName
                },
                statistic: 'Average',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 500,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to ElastiCache Redis', {
            alarmsCreated: 4,
            clusterName: clusterName,
            monitoringEnabled: true
        });
    }
    /**
     * Check if this is a compliance framework
     */
    isComplianceFramework() {
        return this.context.complianceFramework !== 'commercial';
    }
}
exports.ElastiCacheRedisComponent = ElastiCacheRedisComponent;
