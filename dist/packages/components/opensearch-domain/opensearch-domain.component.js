"use strict";
/**
 * OpenSearch Domain Component
 *
 * AWS OpenSearch Service domain for search and analytics workloads.
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
exports.OpenSearchDomainComponent = exports.OpenSearchDomainConfigBuilder = exports.OPENSEARCH_DOMAIN_CONFIG_SCHEMA = void 0;
const opensearch = __importStar(require("aws-cdk-lib/aws-opensearchservice"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cdk = __importStar(require("aws-cdk-lib"));
const contracts_1 = require("@platform/contracts");
/**
 * Configuration schema for OpenSearch Domain component
 */
exports.OPENSEARCH_DOMAIN_CONFIG_SCHEMA = {
    type: 'object',
    title: 'OpenSearch Domain Configuration',
    description: 'Configuration for creating an OpenSearch domain',
    properties: {
        domainName: {
            type: 'string',
            description: 'Name of the domain (will be auto-generated if not provided)',
            pattern: '^[a-z][a-z0-9\\-]+[a-z0-9]$',
            minLength: 3,
            maxLength: 28
        },
        version: {
            type: 'string',
            description: 'OpenSearch version',
            enum: ['OpenSearch_1.3', 'OpenSearch_2.3', 'OpenSearch_2.5', 'OpenSearch_2.7'],
            default: 'OpenSearch_2.7'
        },
        cluster: {
            type: 'object',
            description: 'Cluster configuration',
            properties: {
                instanceType: {
                    type: 'string',
                    description: 'Instance type for data nodes',
                    default: 't3.small.search'
                },
                instanceCount: {
                    type: 'number',
                    description: 'Number of data nodes',
                    minimum: 1,
                    maximum: 80,
                    default: 1
                },
                dedicatedMasterEnabled: {
                    type: 'boolean',
                    description: 'Enable dedicated master nodes',
                    default: false
                },
                masterInstanceType: {
                    type: 'string',
                    description: 'Master node instance type',
                    default: 't3.small.search'
                },
                masterInstanceCount: {
                    type: 'number',
                    description: 'Number of master nodes',
                    enum: [3, 5],
                    default: 3
                },
                warmEnabled: {
                    type: 'boolean',
                    description: 'Enable warm nodes',
                    default: false
                },
                warmInstanceType: {
                    type: 'string',
                    description: 'Warm node instance type',
                    default: 'ultrawarm1.medium.search'
                },
                warmInstanceCount: {
                    type: 'number',
                    description: 'Number of warm nodes',
                    minimum: 2,
                    maximum: 150,
                    default: 2
                }
            },
            additionalProperties: false,
            default: { instanceType: 't3.small.search', instanceCount: 1, dedicatedMasterEnabled: false }
        },
        ebs: {
            type: 'object',
            description: 'EBS storage configuration',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable EBS storage',
                    default: true
                },
                volumeType: {
                    type: 'string',
                    description: 'EBS volume type',
                    enum: ['gp2', 'gp3', 'io1', 'io2'],
                    default: 'gp3'
                },
                volumeSize: {
                    type: 'number',
                    description: 'Volume size in GB',
                    minimum: 10,
                    maximum: 3584,
                    default: 20
                },
                iops: {
                    type: 'number',
                    description: 'IOPS for io1/io2 volumes',
                    minimum: 100,
                    maximum: 16000
                },
                throughput: {
                    type: 'number',
                    description: 'Throughput for gp3 volumes',
                    minimum: 125,
                    maximum: 1000
                }
            },
            additionalProperties: false,
            default: { enabled: true, volumeType: 'gp3', volumeSize: 20 }
        },
        vpc: {
            type: 'object',
            description: 'VPC configuration',
            properties: {
                vpcId: {
                    type: 'string',
                    description: 'VPC ID for domain placement'
                },
                subnetIds: {
                    type: 'array',
                    description: 'Subnet IDs for domain placement',
                    items: { type: 'string' },
                    minItems: 1,
                    maxItems: 6
                },
                securityGroupIds: {
                    type: 'array',
                    description: 'Security group IDs',
                    items: { type: 'string' }
                }
            },
            additionalProperties: false
        },
        accessPolicies: {
            type: 'object',
            description: 'Access policies for the domain',
            properties: {
                statements: {
                    type: 'array',
                    description: 'IAM policy statements',
                    items: {
                        type: 'object',
                        properties: {
                            Effect: {
                                type: 'string',
                                enum: ['Allow', 'Deny']
                            },
                            Action: {
                                oneOf: [
                                    { type: 'string' },
                                    { type: 'array', items: { type: 'string' } }
                                ]
                            },
                            Resource: {
                                oneOf: [
                                    { type: 'string' },
                                    { type: 'array', items: { type: 'string' } }
                                ]
                            },
                            Condition: { type: 'object' }
                        },
                        required: ['Effect', 'Action'],
                        additionalProperties: false
                    }
                }
            },
            additionalProperties: false
        },
        encryptionAtRest: {
            type: 'object',
            description: 'Encryption at rest configuration',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable encryption at rest',
                    default: true
                }
            },
            additionalProperties: false,
            default: { enabled: true }
        },
        nodeToNodeEncryption: {
            type: 'object',
            description: 'Node-to-node encryption configuration',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable node-to-node encryption',
                    default: true
                }
            },
            additionalProperties: false,
            default: { enabled: true }
        },
        domainEndpoint: {
            type: 'object',
            description: 'Domain endpoint options',
            properties: {
                enforceHTTPS: {
                    type: 'boolean',
                    description: 'Enforce HTTPS',
                    default: true
                },
                tlsSecurityPolicy: {
                    type: 'string',
                    description: 'TLS security policy',
                    enum: ['Policy-Min-TLS-1-0-2019-07', 'Policy-Min-TLS-1-2-2019-07'],
                    default: 'Policy-Min-TLS-1-2-2019-07'
                }
            },
            additionalProperties: false,
            default: { enforceHTTPS: true, tlsSecurityPolicy: 'Policy-Min-TLS-1-2-2019-07' }
        },
        advancedSecurity: {
            type: 'object',
            description: 'Advanced security options',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable fine-grained access control',
                    default: false
                },
                internalUserDatabaseEnabled: {
                    type: 'boolean',
                    description: 'Enable internal user database',
                    default: false
                },
                masterUserName: {
                    type: 'string',
                    description: 'Master user name'
                },
                masterUserPassword: {
                    type: 'string',
                    description: 'Master user password'
                }
            },
            additionalProperties: false,
            default: { enabled: false, internalUserDatabaseEnabled: false }
        },
        logging: {
            type: 'object',
            description: 'Logging configuration',
            properties: {
                slowSearchLogEnabled: {
                    type: 'boolean',
                    description: 'Enable slow search logs',
                    default: false
                },
                slowIndexLogEnabled: {
                    type: 'boolean',
                    description: 'Enable slow index logs',
                    default: false
                },
                errorLogEnabled: {
                    type: 'boolean',
                    description: 'Enable error logs',
                    default: false
                },
                auditLogEnabled: {
                    type: 'boolean',
                    description: 'Enable audit logs',
                    default: false
                },
                appLogEnabled: {
                    type: 'boolean',
                    description: 'Enable application logs',
                    default: false
                }
            },
            additionalProperties: false,
            default: { slowSearchLogEnabled: false, slowIndexLogEnabled: false, errorLogEnabled: false, auditLogEnabled: false, appLogEnabled: false }
        },
        advancedOptions: {
            type: 'object',
            description: 'Advanced options',
            additionalProperties: { type: 'string' },
            default: {}
        },
        tags: {
            type: 'object',
            description: 'Tags for the domain',
            additionalProperties: { type: 'string' },
            default: {}
        }
    },
    additionalProperties: false,
    defaults: {
        version: 'OpenSearch_2.7',
        cluster: { instanceType: 't3.small.search', instanceCount: 1, dedicatedMasterEnabled: false },
        ebs: { enabled: true, volumeType: 'gp3', volumeSize: 20 },
        encryptionAtRest: { enabled: true },
        nodeToNodeEncryption: { enabled: true },
        domainEndpoint: { enforceHTTPS: true, tlsSecurityPolicy: 'Policy-Min-TLS-1-2-2019-07' },
        advancedSecurity: { enabled: false, internalUserDatabaseEnabled: false },
        logging: { slowSearchLogEnabled: false, slowIndexLogEnabled: false, errorLogEnabled: false, auditLogEnabled: false, appLogEnabled: false },
        advancedOptions: {},
        tags: {}
    }
};
/**
 * Configuration builder for OpenSearch Domain component
 */
class OpenSearchDomainConfigBuilder {
    context;
    spec;
    constructor(context, spec) {
        this.context = context;
        this.spec = spec;
    }
    async build() {
        return this.buildSync();
    }
    buildSync() {
        const platformDefaults = this.getPlatformDefaults();
        const complianceDefaults = this.getComplianceFrameworkDefaults();
        const userConfig = this.spec.config || {};
        const mergedConfig = this.mergeConfigs(this.mergeConfigs(platformDefaults, complianceDefaults), userConfig);
        return mergedConfig;
    }
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
    getPlatformDefaults() {
        return {
            version: 'OpenSearch_2.7',
            cluster: {
                instanceType: this.getDefaultInstanceType(),
                instanceCount: this.getDefaultInstanceCount(),
                dedicatedMasterEnabled: this.getDefaultDedicatedMaster()
            },
            ebs: {
                enabled: true,
                volumeType: 'gp3',
                volumeSize: this.getDefaultVolumeSize()
            },
            encryptionAtRest: {
                enabled: true
            },
            nodeToNodeEncryption: {
                enabled: true
            },
            domainEndpoint: {
                enforceHTTPS: true,
                tlsSecurityPolicy: 'Policy-Min-TLS-1-2-2019-07'
            },
            logging: this.getDefaultLogging(),
            tags: {
                'service': this.context.serviceName,
                'environment': this.context.environment
            }
        };
    }
    getComplianceFrameworkDefaults() {
        const framework = this.context.complianceFramework;
        switch (framework) {
            case 'fedramp-moderate':
                return {
                    cluster: {
                        instanceType: 'm6g.medium.search', // More capable instances for compliance
                        instanceCount: 3, // Multi-node for reliability
                        dedicatedMasterEnabled: true, // Dedicated masters for stability
                        masterInstanceCount: 3
                    },
                    ebs: {
                        volumeSize: 100 // Larger storage for compliance data
                    },
                    advancedSecurity: {
                        enabled: true, // Fine-grained access control required
                        internalUserDatabaseEnabled: true
                    },
                    logging: {
                        slowSearchLogEnabled: true,
                        slowIndexLogEnabled: true,
                        errorLogEnabled: true,
                        auditLogEnabled: true, // Audit logging required
                        appLogEnabled: true
                    },
                    tags: {
                        'compliance-framework': 'fedramp-moderate',
                        'audit-logging': 'comprehensive',
                        'access-control': 'fine-grained'
                    }
                };
            case 'fedramp-high':
                return {
                    cluster: {
                        instanceType: 'm6g.large.search', // High-performance instances
                        instanceCount: 6, // More nodes for high availability
                        dedicatedMasterEnabled: true,
                        masterInstanceCount: 5, // 5-node master for high availability
                        warmEnabled: true, // Warm storage for cost optimization
                        warmInstanceCount: 2
                    },
                    ebs: {
                        volumeSize: 200, // Larger storage for high security requirements
                        volumeType: 'gp3' // High performance storage
                    },
                    advancedSecurity: {
                        enabled: true, // Mandatory fine-grained access control
                        internalUserDatabaseEnabled: true
                    },
                    logging: {
                        slowSearchLogEnabled: true,
                        slowIndexLogEnabled: true,
                        errorLogEnabled: true,
                        auditLogEnabled: true, // Mandatory comprehensive audit logging
                        appLogEnabled: true
                    },
                    tags: {
                        'compliance-framework': 'fedramp-high',
                        'audit-logging': 'comprehensive',
                        'access-control': 'fine-grained',
                        'security-level': 'high'
                    }
                };
            default: // commercial
                return {
                    advancedSecurity: {
                        enabled: false
                    },
                    logging: {
                        errorLogEnabled: true // Basic error logging
                    }
                };
        }
    }
    getDefaultInstanceType() {
        return this.context.complianceFramework === 'commercial' ? 't3.small.search' : 'm6g.medium.search';
    }
    getDefaultInstanceCount() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 6;
            case 'fedramp-moderate':
                return 3;
            default:
                return 1;
        }
    }
    getDefaultDedicatedMaster() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    getDefaultVolumeSize() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 200;
            case 'fedramp-moderate':
                return 100;
            default:
                return 20;
        }
    }
    getDefaultLogging() {
        const framework = this.context.complianceFramework;
        switch (framework) {
            case 'fedramp-moderate':
            case 'fedramp-high':
                return {
                    slowSearchLogEnabled: true,
                    slowIndexLogEnabled: true,
                    errorLogEnabled: true,
                    auditLogEnabled: true,
                    appLogEnabled: true
                };
            default:
                return {
                    slowSearchLogEnabled: false,
                    slowIndexLogEnabled: false,
                    errorLogEnabled: true,
                    auditLogEnabled: false,
                    appLogEnabled: false
                };
        }
    }
}
exports.OpenSearchDomainConfigBuilder = OpenSearchDomainConfigBuilder;
/**
 * OpenSearch Domain Component implementing Component API Contract v1.0
 */
class OpenSearchDomainComponent extends contracts_1.Component {
    domain;
    vpc;
    securityGroup;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    synth() {
        this.logComponentEvent('synthesis_start', 'Starting OpenSearch Domain component synthesis', {
            domainName: this.spec.config?.domainName,
            version: this.spec.config?.version
        });
        const startTime = Date.now();
        try {
            const configBuilder = new OpenSearchDomainConfigBuilder(this.context, this.spec);
            this.config = configBuilder.buildSync();
            this.logComponentEvent('config_built', 'OpenSearch Domain configuration built successfully', {
                domainName: this.config.domainName,
                version: this.config.version,
                instanceCount: this.config.cluster?.instanceCount
            });
            this.lookupVpcIfNeeded();
            this.createSecurityGroupIfNeeded();
            this.createOpenSearchDomain();
            this.applyComplianceHardening();
            this.configureObservabilityForDomain();
            this.registerConstruct('domain', this.domain);
            if (this.vpc) {
                this.registerConstruct('vpc', this.vpc);
            }
            if (this.securityGroup) {
                this.registerConstruct('securityGroup', this.securityGroup);
            }
            this.registerCapability('search:opensearch', this.buildDomainCapability());
            const duration = Date.now() - startTime;
            this.logPerformanceMetric('component_synthesis', duration, {
                resourcesCreated: Object.keys(this.capabilities).length
            });
            this.logComponentEvent('synthesis_complete', 'OpenSearch Domain component synthesis completed successfully', {
                domainCreated: 1,
                encryptionEnabled: this.config.encryptionAtRest?.enabled,
                advancedSecurityEnabled: this.config.advancedSecurity?.enabled
            });
        }
        catch (error) {
            this.logError(error, 'component synthesis', {
                componentType: 'opensearch-domain',
                stage: 'synthesis'
            });
            throw error;
        }
    }
    getCapabilities() {
        this.validateSynthesized();
        return this.capabilities;
    }
    getType() {
        return 'opensearch-domain';
    }
    lookupVpcIfNeeded() {
        if (this.config.vpc?.vpcId) {
            this.vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
                vpcId: this.config.vpc.vpcId
            });
        }
    }
    createSecurityGroupIfNeeded() {
        if (this.vpc && !this.config.vpc?.securityGroupIds?.length) {
            this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
                vpc: this.vpc,
                description: `Security group for ${this.buildDomainName()} OpenSearch domain`,
                allowAllOutbound: false
            });
            // Allow HTTPS traffic
            this.securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS access to OpenSearch');
            // Allow OpenSearch API access
            this.securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(9200), 'OpenSearch API access');
            this.applyStandardTags(this.securityGroup, {
                'security-group-type': 'opensearch',
                'domain': this.buildDomainName()
            });
        }
    }
    createOpenSearchDomain() {
        const domainProps = {
            domainName: this.buildDomainName(),
            version: this.mapOpenSearchVersion(this.config.version),
            capacity: this.buildCapacityConfig(),
            ebs: this.buildEbsConfig(),
            vpc: this.buildVpcConfig(),
            accessPolicies: this.buildAccessPolicies(),
            encryptionAtRest: this.config.encryptionAtRest,
            nodeToNodeEncryption: this.config.nodeToNodeEncryption?.enabled,
            domainEndpointOptions: this.buildDomainEndpointOptions(),
            fineGrainedAccessControl: this.buildAdvancedSecurityConfig(),
            logging: this.buildLoggingConfig(),
            advancedOptions: this.config.advancedOptions,
            removalPolicy: this.getDomainRemovalPolicy()
        };
        this.domain = new opensearch.Domain(this, 'Domain', domainProps);
        this.applyStandardTags(this.domain, {
            'domain-name': this.buildDomainName(),
            'opensearch-version': this.config.version,
            'instance-type': this.config.cluster?.instanceType,
            'instance-count': (this.config.cluster?.instanceCount || 1).toString(),
            'encryption-at-rest': (this.config.encryptionAtRest?.enabled || false).toString(),
            'advanced-security': (this.config.advancedSecurity?.enabled || false).toString()
        });
        if (this.config.tags) {
            Object.entries(this.config.tags).forEach(([key, value]) => {
                cdk.Tags.of(this.domain).add(key, value);
            });
        }
        this.logResourceCreation('opensearch-domain', this.buildDomainName(), {
            domainName: this.buildDomainName(),
            version: this.config.version,
            instanceCount: this.config.cluster?.instanceCount,
            encryptionEnabled: this.config.encryptionAtRest?.enabled
        });
    }
    mapOpenSearchVersion(version) {
        switch (version) {
            case 'OpenSearch_1.3':
                return opensearch.EngineVersion.OPENSEARCH_1_3;
            case 'OpenSearch_2.3':
                return opensearch.EngineVersion.OPENSEARCH_2_3;
            case 'OpenSearch_2.5':
                return opensearch.EngineVersion.OPENSEARCH_2_5;
            case 'OpenSearch_2.7':
                return opensearch.EngineVersion.OPENSEARCH_2_7;
            default:
                return opensearch.EngineVersion.OPENSEARCH_2_7;
        }
    }
    buildCapacityConfig() {
        const cluster = this.config.cluster;
        return {
            dataNodes: cluster.instanceCount,
            dataNodeInstanceType: cluster.instanceType,
            masterNodes: cluster.dedicatedMasterEnabled ? cluster.masterInstanceCount : undefined,
            masterNodeInstanceType: cluster.dedicatedMasterEnabled ? cluster.masterInstanceType : undefined,
            warmNodes: cluster.warmEnabled ? cluster.warmInstanceCount : undefined,
            warmInstanceType: cluster.warmEnabled ? cluster.warmInstanceType : undefined
        };
    }
    buildEbsConfig() {
        if (!this.config.ebs?.enabled) {
            return undefined;
        }
        const ebs = this.config.ebs;
        return {
            enabled: true,
            volumeType: this.mapVolumeType(ebs.volumeType),
            volumeSize: ebs.volumeSize,
            iops: ebs.iops,
            throughput: ebs.throughput
        };
    }
    mapVolumeType(volumeType) {
        switch (volumeType) {
            case 'gp2':
                return ec2.EbsDeviceVolumeType.GP2;
            case 'gp3':
                return ec2.EbsDeviceVolumeType.GP3;
            case 'io1':
                return ec2.EbsDeviceVolumeType.IO1;
            case 'io2':
                return ec2.EbsDeviceVolumeType.IO2;
            default:
                return ec2.EbsDeviceVolumeType.GP3;
        }
    }
    buildVpcConfig() {
        if (!this.vpc) {
            return undefined;
        }
        const securityGroups = this.config.vpc?.securityGroupIds?.map(id => ec2.SecurityGroup.fromSecurityGroupId(this, `SG${id}`, id)) || (this.securityGroup ? [this.securityGroup] : []);
        const subnets = this.config.vpc?.subnetIds?.map(id => ec2.Subnet.fromSubnetId(this, `Subnet${id}`, id)) || this.vpc.privateSubnets.slice(0, Math.min(3, this.vpc.privateSubnets.length));
        return {
            securityGroups,
            subnets
        };
    }
    buildAccessPolicies() {
        if (!this.config.accessPolicies?.statements) {
            return undefined;
        }
        const statements = this.config.accessPolicies.statements.map(stmt => new iam.PolicyStatement({
            effect: stmt.Effect === 'Allow' ? iam.Effect.ALLOW : iam.Effect.DENY,
            actions: Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action],
            resources: stmt.Resource ? (Array.isArray(stmt.Resource) ? stmt.Resource : [stmt.Resource]) : undefined,
            principals: stmt.Principal ? [new iam.ArnPrincipal(stmt.Principal)] : undefined,
            conditions: stmt.Condition
        }));
        return [new iam.PolicyDocument({ statements })];
    }
    buildDomainEndpointOptions() {
        return {
            enforceHttps: this.config.domainEndpoint?.enforceHTTPS,
            tlsSecurityPolicy: this.mapTlsSecurityPolicy(this.config.domainEndpoint?.tlsSecurityPolicy)
        };
    }
    mapTlsSecurityPolicy(policy) {
        switch (policy) {
            case 'Policy-Min-TLS-1-0-2019-07':
                return opensearch.TLSSecurityPolicy.TLS_1_0;
            case 'Policy-Min-TLS-1-2-2019-07':
                return opensearch.TLSSecurityPolicy.TLS_1_2;
            default:
                return opensearch.TLSSecurityPolicy.TLS_1_2;
        }
    }
    buildAdvancedSecurityConfig() {
        if (!this.config.advancedSecurity?.enabled) {
            return undefined;
        }
        return {
            masterUserName: this.config.advancedSecurity.masterUserName,
            masterUserPassword: this.config.advancedSecurity.masterUserPassword ?
                cdk.SecretValue.unsafePlainText(this.config.advancedSecurity.masterUserPassword) : undefined
        };
    }
    buildLoggingConfig() {
        const logging = this.config.logging;
        if (!logging) {
            return undefined;
        }
        const logGroups = {};
        if (logging.slowSearchLogEnabled) {
            logGroups.slowSearchLogGroup = this.createLogGroup('SlowSearchLogs', 'slow-search');
        }
        if (logging.slowIndexLogEnabled) {
            logGroups.slowIndexLogGroup = this.createLogGroup('SlowIndexLogs', 'slow-index');
        }
        if (logging.errorLogEnabled) {
            logGroups.errorLogGroup = this.createLogGroup('ErrorLogs', 'error');
        }
        if (logging.auditLogEnabled) {
            logGroups.auditLogGroup = this.createLogGroup('AuditLogs', 'audit');
        }
        if (logging.appLogEnabled) {
            logGroups.appLogGroup = this.createLogGroup('AppLogs', 'app');
        }
        return Object.keys(logGroups).length > 0 ? logGroups : undefined;
    }
    createLogGroup(id, logType) {
        const logGroup = new logs.LogGroup(this, id, {
            logGroupName: `/aws/opensearch/domains/${this.buildDomainName()}/${logType}`,
            retention: this.getLogRetention(),
            removalPolicy: this.getLogRemovalPolicy()
        });
        this.applyStandardTags(logGroup, {
            'log-type': logType,
            'domain': this.buildDomainName(),
            'retention': this.getLogRetention().toString()
        });
        return logGroup;
    }
    buildDomainName() {
        if (this.config.domainName) {
            return this.config.domainName;
        }
        return `${this.context.serviceName}-${this.spec.name}`;
    }
    getDomainRemovalPolicy() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework)
            ? cdk.RemovalPolicy.RETAIN
            : cdk.RemovalPolicy.DESTROY;
    }
    getLogRetention() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return logs.RetentionDays.TEN_YEARS;
            case 'fedramp-moderate':
                return logs.RetentionDays.ONE_YEAR;
            default:
                return logs.RetentionDays.THREE_MONTHS;
        }
    }
    getLogRemovalPolicy() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework)
            ? cdk.RemovalPolicy.RETAIN
            : cdk.RemovalPolicy.DESTROY;
    }
    applyComplianceHardening() {
        switch (this.context.complianceFramework) {
            case 'fedramp-moderate':
                this.applyFedrampModerateHardening();
                break;
            case 'fedramp-high':
                this.applyFedrampHighHardening();
                break;
            default:
                this.applyCommercialHardening();
                break;
        }
    }
    applyCommercialHardening() {
        // Basic security monitoring
        if (this.domain) {
            const securityLogGroup = new logs.LogGroup(this, 'SecurityLogGroup', {
                logGroupName: `/aws/opensearch/${this.buildDomainName()}/security`,
                retention: logs.RetentionDays.THREE_MONTHS,
                removalPolicy: cdk.RemovalPolicy.DESTROY
            });
            this.applyStandardTags(securityLogGroup, {
                'log-type': 'security',
                'retention': '3-months'
            });
        }
    }
    applyFedrampModerateHardening() {
        this.applyCommercialHardening();
        if (this.domain) {
            const complianceLogGroup = new logs.LogGroup(this, 'ComplianceLogGroup', {
                logGroupName: `/aws/opensearch/${this.buildDomainName()}/compliance`,
                retention: logs.RetentionDays.ONE_YEAR,
                removalPolicy: cdk.RemovalPolicy.RETAIN
            });
            this.applyStandardTags(complianceLogGroup, {
                'log-type': 'compliance',
                'retention': '1-year',
                'compliance': 'fedramp-moderate'
            });
        }
    }
    applyFedrampHighHardening() {
        this.applyFedrampModerateHardening();
        if (this.domain) {
            const auditLogGroup = new logs.LogGroup(this, 'AuditLogGroup', {
                logGroupName: `/aws/opensearch/${this.buildDomainName()}/audit`,
                retention: logs.RetentionDays.TEN_YEARS,
                removalPolicy: cdk.RemovalPolicy.RETAIN
            });
            this.applyStandardTags(auditLogGroup, {
                'log-type': 'audit',
                'retention': '10-years',
                'compliance': 'fedramp-high'
            });
        }
    }
    buildDomainCapability() {
        return {
            domainArn: this.domain.domainArn,
            domainName: this.buildDomainName(),
            domainEndpoint: this.domain.domainEndpoint
        };
    }
    configureObservabilityForDomain() {
        if (this.context.complianceFramework === 'commercial') {
            return;
        }
        const domainName = this.buildDomainName();
        // 1. Cluster Status Alarm
        const clusterStatusAlarm = new cloudwatch.Alarm(this, 'ClusterStatusAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-cluster-status`,
            alarmDescription: 'OpenSearch cluster status alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ES',
                metricName: 'ClusterStatus.red',
                dimensionsMap: {
                    DomainName: domainName,
                    ClientId: this.context.serviceName
                },
                statistic: 'Maximum',
                period: cdk.Duration.minutes(1)
            }),
            threshold: 0,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        this.applyStandardTags(clusterStatusAlarm, {
            'alarm-type': 'cluster-status',
            'metric-type': 'availability',
            'threshold': '0'
        });
        // 2. JVM Memory Pressure Alarm
        const jvmMemoryAlarm = new cloudwatch.Alarm(this, 'JVMMemoryPressureAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-jvm-memory-pressure`,
            alarmDescription: 'OpenSearch JVM memory pressure alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ES',
                metricName: 'JVMMemoryPressure',
                dimensionsMap: {
                    DomainName: domainName,
                    ClientId: this.context.serviceName
                },
                statistic: 'Maximum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 80, // 80% memory pressure threshold
            evaluationPeriods: 3,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        this.applyStandardTags(jvmMemoryAlarm, {
            'alarm-type': 'jvm-memory-pressure',
            'metric-type': 'performance',
            'threshold': '80-percent'
        });
        this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to OpenSearch Domain', {
            alarmsCreated: 2,
            domainName: domainName,
            monitoringEnabled: true
        });
    }
}
exports.OpenSearchDomainComponent = OpenSearchDomainComponent;
