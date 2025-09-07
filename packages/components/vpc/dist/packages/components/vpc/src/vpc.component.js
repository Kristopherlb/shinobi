"use strict";
/**
 * VPC Component
 *
 * Defines network isolation with compliance-aware networking rules.
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
exports.VpcComponent = exports.VpcConfigBuilder = exports.VPC_CONFIG_SCHEMA = void 0;
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const cdk = __importStar(require("aws-cdk-lib"));
const contracts_1 = require("@platform/contracts");
/**
 * Configuration schema for VPC component
 */
exports.VPC_CONFIG_SCHEMA = {
    type: 'object',
    title: 'VPC Configuration',
    description: 'Configuration for creating a Virtual Private Cloud',
    properties: {
        cidr: {
            type: 'string',
            description: 'CIDR block for the VPC',
            pattern: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$',
            default: '10.0.0.0/16'
        },
        maxAzs: {
            type: 'number',
            description: 'Maximum number of Availability Zones',
            minimum: 2,
            maximum: 6,
            default: 2
        },
        natGateways: {
            type: 'number',
            description: 'Number of NAT gateways',
            minimum: 0,
            maximum: 6,
            default: 1
        },
        flowLogsEnabled: {
            type: 'boolean',
            description: 'Enable VPC Flow Logs',
            default: true
        },
        subnets: {
            type: 'object',
            description: 'Subnet configuration for different tiers',
            properties: {
                public: {
                    type: 'object',
                    description: 'Public subnet configuration',
                    properties: {
                        cidrMask: {
                            type: 'number',
                            description: 'CIDR mask for public subnets',
                            minimum: 16,
                            maximum: 28,
                            default: 24
                        },
                        name: {
                            type: 'string',
                            description: 'Name prefix for public subnets',
                            maxLength: 50,
                            default: 'Public'
                        }
                    },
                    additionalProperties: false,
                    default: {
                        cidrMask: 24,
                        name: 'Public'
                    }
                },
                private: {
                    type: 'object',
                    description: 'Private subnet configuration',
                    properties: {
                        cidrMask: {
                            type: 'number',
                            description: 'CIDR mask for private subnets',
                            minimum: 16,
                            maximum: 28,
                            default: 24
                        },
                        name: {
                            type: 'string',
                            description: 'Name prefix for private subnets',
                            maxLength: 50,
                            default: 'Private'
                        }
                    },
                    additionalProperties: false,
                    default: {
                        cidrMask: 24,
                        name: 'Private'
                    }
                },
                database: {
                    type: 'object',
                    description: 'Database subnet configuration (isolated)',
                    properties: {
                        cidrMask: {
                            type: 'number',
                            description: 'CIDR mask for database subnets',
                            minimum: 16,
                            maximum: 28,
                            default: 28
                        },
                        name: {
                            type: 'string',
                            description: 'Name prefix for database subnets',
                            maxLength: 50,
                            default: 'Database'
                        }
                    },
                    additionalProperties: false,
                    default: {
                        cidrMask: 28,
                        name: 'Database'
                    }
                }
            },
            additionalProperties: false,
            default: {
                public: { cidrMask: 24, name: 'Public' },
                private: { cidrMask: 24, name: 'Private' },
                database: { cidrMask: 28, name: 'Database' }
            }
        },
        vpcEndpoints: {
            type: 'object',
            description: 'VPC Endpoints configuration for AWS services',
            properties: {
                s3: {
                    type: 'boolean',
                    description: 'Enable S3 VPC Gateway Endpoint',
                    default: false
                },
                dynamodb: {
                    type: 'boolean',
                    description: 'Enable DynamoDB VPC Gateway Endpoint',
                    default: false
                },
                secretsManager: {
                    type: 'boolean',
                    description: 'Enable Secrets Manager VPC Interface Endpoint',
                    default: false
                },
                kms: {
                    type: 'boolean',
                    description: 'Enable KMS VPC Interface Endpoint',
                    default: false
                }
            },
            additionalProperties: false,
            default: {
                s3: false,
                dynamodb: false,
                secretsManager: false,
                kms: false
            }
        },
        dns: {
            type: 'object',
            description: 'DNS configuration for the VPC',
            properties: {
                enableDnsHostnames: {
                    type: 'boolean',
                    description: 'Enable DNS hostnames in the VPC',
                    default: true
                },
                enableDnsSupport: {
                    type: 'boolean',
                    description: 'Enable DNS support in the VPC',
                    default: true
                }
            },
            additionalProperties: false,
            default: {
                enableDnsHostnames: true,
                enableDnsSupport: true
            }
        }
    },
    additionalProperties: false,
    defaults: {
        cidr: '10.0.0.0/16',
        maxAzs: 2,
        natGateways: 1,
        flowLogsEnabled: true,
        subnets: {
            public: { cidrMask: 24, name: 'Public' },
            private: { cidrMask: 24, name: 'Private' },
            database: { cidrMask: 28, name: 'Database' }
        },
        vpcEndpoints: {
            s3: false,
            dynamodb: false,
            secretsManager: false,
            kms: false
        },
        dns: {
            enableDnsHostnames: true,
            enableDnsSupport: true
        }
    }
};
/**
 * Configuration builder for VPC component
 */
class VpcConfigBuilder {
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
     * Get platform-wide defaults for VPC
     */
    getPlatformDefaults() {
        return {
            cidr: '10.0.0.0/16',
            maxAzs: 2,
            natGateways: 1,
            flowLogsEnabled: true,
            subnets: {
                public: {
                    cidrMask: 24,
                    name: 'Public'
                },
                private: {
                    cidrMask: 24,
                    name: 'Private'
                },
                database: {
                    cidrMask: 28,
                    name: 'Database'
                }
            },
            vpcEndpoints: this.getDefaultVpcEndpoints(),
            dns: {
                enableDnsHostnames: true,
                enableDnsSupport: true
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
                    flowLogsEnabled: true, // Mandatory flow logs
                    natGateways: 2, // High availability NAT gateways
                    maxAzs: 3, // Multi-AZ deployment for compliance
                    vpcEndpoints: {
                        s3: true, // Required VPC endpoints
                        dynamodb: true,
                        secretsManager: false, // Interface endpoints not required for moderate
                        kms: false
                    },
                    subnets: {
                        public: {
                            cidrMask: 26 // Smaller public subnets for tighter control
                        },
                        private: {
                            cidrMask: 24 // Standard private subnet size
                        },
                        database: {
                            cidrMask: 28 // Small isolated database subnets
                        }
                    }
                };
            case 'fedramp-high':
                return {
                    flowLogsEnabled: true, // Mandatory enhanced monitoring
                    natGateways: 3, // Maximum availability for high compliance
                    maxAzs: 3, // Required multi-AZ for high compliance
                    vpcEndpoints: {
                        s3: true, // All VPC endpoints required
                        dynamodb: true,
                        secretsManager: true, // Interface endpoints required for high compliance
                        kms: true
                    },
                    subnets: {
                        public: {
                            cidrMask: 27 // Very small public subnets
                        },
                        private: {
                            cidrMask: 25 // Larger private subnets for workloads
                        },
                        database: {
                            cidrMask: 28 // Isolated and small database subnets
                        }
                    }
                };
            default: // commercial
                return {
                    natGateways: 1, // Cost optimization for commercial
                    maxAzs: 2, // Standard availability
                    vpcEndpoints: {
                        s3: false, // VPC endpoints optional for commercial
                        dynamodb: false,
                        secretsManager: false,
                        kms: false
                    }
                };
        }
    }
    /**
     * Get default VPC endpoints based on compliance framework
     */
    getDefaultVpcEndpoints() {
        const framework = this.context.complianceFramework;
        if (framework === 'fedramp-high') {
            return {
                s3: true,
                dynamodb: true,
                secretsManager: true,
                kms: true
            };
        }
        else if (framework === 'fedramp-moderate') {
            return {
                s3: true,
                dynamodb: true,
                secretsManager: false,
                kms: false
            };
        }
        return {
            s3: false,
            dynamodb: false,
            secretsManager: false,
            kms: false
        };
    }
}
exports.VpcConfigBuilder = VpcConfigBuilder;
/**
 * VPC Component implementing Component API Contract v1.0
 */
class VpcComponent extends contracts_1.Component {
    vpc;
    flowLogGroup;
    flowLogRole;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    /**
     * Synthesis phase - Create VPC with compliance hardening
     */
    synth() {
        // Build configuration using ConfigBuilder
        const configBuilder = new VpcConfigBuilder(this.context, this.spec);
        this.config = configBuilder.buildSync();
        // Create VPC
        this.createVpc();
        // Create VPC Flow Logs
        this.createVpcFlowLogsIfEnabled();
        // Create VPC Endpoints for compliance frameworks
        this.createVpcEndpointsIfNeeded();
        // Apply compliance hardening
        this.applyComplianceHardening();
        // Register constructs
        this.registerConstruct('vpc', this.vpc);
        if (this.flowLogGroup) {
            this.registerConstruct('flowLogGroup', this.flowLogGroup);
        }
        if (this.flowLogRole) {
            this.registerConstruct('flowLogRole', this.flowLogRole);
        }
        // Register capabilities
        this.registerCapability('net:vpc', this.buildVpcCapability());
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
        return 'vpc';
    }
    /**
     * Create the VPC with appropriate subnet configuration
     */
    createVpc() {
        const subnetConfiguration = this.buildSubnetConfiguration();
        this.vpc = new ec2.Vpc(this, 'Vpc', {
            cidr: this.config.cidr || '10.0.0.0/16',
            maxAzs: this.config.maxAzs || 2,
            natGateways: this.config.natGateways ?? 1,
            subnetConfiguration,
            enableDnsHostnames: this.config.dns?.enableDnsHostnames !== false,
            enableDnsSupport: this.config.dns?.enableDnsSupport !== false,
            vpcName: `${this.context.serviceName}-${this.spec.name}`
        });
        // Add name tags to subnets
        this.vpc.publicSubnets.forEach((subnet, index) => {
            cdk.Tags.of(subnet).add('Name', `${this.context.serviceName}-public-${index + 1}`);
        });
        this.vpc.privateSubnets.forEach((subnet, index) => {
            cdk.Tags.of(subnet).add('Name', `${this.context.serviceName}-private-${index + 1}`);
        });
        this.vpc.isolatedSubnets.forEach((subnet, index) => {
            cdk.Tags.of(subnet).add('Name', `${this.context.serviceName}-database-${index + 1}`);
        });
    }
    /**
     * Create VPC Flow Logs for network monitoring
     */
    createVpcFlowLogsIfEnabled() {
        if (this.config.flowLogsEnabled !== false) {
            // Create log group for VPC Flow Logs
            this.flowLogGroup = new logs.LogGroup(this, 'VpcFlowLogGroup', {
                logGroupName: `/aws/vpc/flowlogs/${this.vpc.vpcId}`,
                retention: this.getFlowLogRetention(),
                removalPolicy: this.isComplianceFramework() ?
                    cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
            });
            // Create IAM role for Flow Logs
            this.flowLogRole = new iam.Role(this, 'VpcFlowLogRole', {
                assumedBy: new iam.ServicePrincipal('vpc-flow-logs.amazonaws.com'),
                inlinePolicies: {
                    flowLogsDeliveryRolePolicy: new iam.PolicyDocument({
                        statements: [
                            new iam.PolicyStatement({
                                actions: [
                                    'logs:CreateLogGroup',
                                    'logs:CreateLogStream',
                                    'logs:PutLogEvents',
                                    'logs:DescribeLogGroups',
                                    'logs:DescribeLogStreams'
                                ],
                                resources: [`${this.flowLogGroup.logGroupArn}:*`]
                            })
                        ]
                    })
                }
            });
            // Create VPC Flow Log
            new ec2.FlowLog(this, 'VpcFlowLog', {
                resourceType: ec2.FlowLogResourceType.fromVpc(this.vpc),
                destination: ec2.FlowLogDestination.toCloudWatchLogs(this.flowLogGroup, this.flowLogRole),
                trafficType: ec2.FlowLogTrafficType.ALL
            });
        }
    }
    /**
     * Create VPC Endpoints based on configuration
     */
    createVpcEndpointsIfNeeded() {
        const endpoints = this.config.vpcEndpoints;
        // S3 Gateway Endpoint (no cost) - enabled by config or compliance framework
        if (endpoints?.s3 || this.isComplianceFramework()) {
            this.vpc.addGatewayEndpoint('S3Endpoint', {
                service: ec2.GatewayVpcEndpointAwsService.S3,
                subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }]
            });
        }
        // DynamoDB Gateway Endpoint (no cost) - enabled by config or compliance framework
        if (endpoints?.dynamodb || this.isComplianceFramework()) {
            this.vpc.addGatewayEndpoint('DynamoDbEndpoint', {
                service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
                subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }]
            });
        }
        // Secrets Manager Interface Endpoint - enabled by config or FedRAMP High
        if (endpoints?.secretsManager || this.context.complianceFramework === 'fedramp-high') {
            this.vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
                service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
                privateDnsEnabled: true,
                subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
            });
        }
        // KMS Interface Endpoint - enabled by config or FedRAMP High
        if (endpoints?.kms || this.context.complianceFramework === 'fedramp-high') {
            this.vpc.addInterfaceEndpoint('KmsEndpoint', {
                service: ec2.InterfaceVpcEndpointAwsService.KMS,
                privateDnsEnabled: true,
                subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
            });
        }
        // Lambda endpoint for FedRAMP High (always created for highest compliance)
        if (this.context.complianceFramework === 'fedramp-high') {
            this.vpc.addInterfaceEndpoint('LambdaEndpoint', {
                service: ec2.InterfaceVpcEndpointAwsService.LAMBDA,
                privateDnsEnabled: true,
                subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
            });
        }
    }
    /**
     * Apply compliance-specific hardening
     */
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
        // Basic security group rules
        this.createDefaultSecurityGroups();
    }
    applyFedrampModerateHardening() {
        // Apply commercial hardening
        this.applyCommercialHardening();
        // Create stricter NACLs
        this.createComplianceNacls();
    }
    applyFedrampHighHardening() {
        // Apply all moderate hardening
        this.applyFedrampModerateHardening();
        // Additional high-security NACLs
        this.createHighSecurityNacls();
        // Remove default security group rules
        this.restrictDefaultSecurityGroup();
    }
    /**
     * Create default security groups with least privilege
     */
    createDefaultSecurityGroups() {
        // Web tier security group
        const webSecurityGroup = new ec2.SecurityGroup(this, 'WebSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for web tier',
            allowAllOutbound: false
        });
        webSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS from internet');
        webSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP from internet (redirect to HTTPS)');
        // App tier security group
        const appSecurityGroup = new ec2.SecurityGroup(this, 'AppSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for application tier',
            allowAllOutbound: false
        });
        appSecurityGroup.addIngressRule(webSecurityGroup, ec2.Port.tcp(8080), 'App traffic from web tier');
        // Database tier security group
        const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for database tier',
            allowAllOutbound: false
        });
        dbSecurityGroup.addIngressRule(appSecurityGroup, ec2.Port.tcp(5432), 'PostgreSQL from app tier');
        // Register security groups as constructs
        this.registerConstruct('webSecurityGroup', webSecurityGroup);
        this.registerConstruct('appSecurityGroup', appSecurityGroup);
        this.registerConstruct('dbSecurityGroup', dbSecurityGroup);
    }
    /**
     * Create compliance-grade Network ACLs
     */
    createComplianceNacls() {
        // Private subnet NACL with stricter rules
        const privateNacl = new ec2.NetworkAcl(this, 'PrivateNacl', {
            vpc: this.vpc,
            networkAclName: 'private-subnet-nacl'
        });
        // Allow HTTPS outbound
        privateNacl.addEntry('AllowHttpsOutbound', {
            ruleNumber: 100,
            cidr: ec2.AclCidr.anyIpv4(),
            traffic: ec2.AclTraffic.tcpPort(443),
            direction: ec2.TrafficDirection.EGRESS,
            ruleAction: ec2.Action.ALLOW
        });
        // Allow ephemeral ports inbound for responses
        privateNacl.addEntry('AllowEphemeralInbound', {
            ruleNumber: 100,
            cidr: ec2.AclCidr.anyIpv4(),
            traffic: ec2.AclTraffic.tcpPortRange(1024, 65535),
            direction: ec2.TrafficDirection.INGRESS,
            ruleAction: ec2.Action.ALLOW
        });
        // Associate with private subnets
        this.vpc.privateSubnets.forEach((subnet, index) => {
            new ec2.SubnetNetworkAclAssociation(this, `PrivateNaclAssoc${index}`, {
                subnet,
                networkAcl: privateNacl
            });
        });
    }
    /**
     * Create high-security Network ACLs for FedRAMP High
     */
    createHighSecurityNacls() {
        // Even more restrictive rules for FedRAMP High
        // This would implement specific port restrictions and source/destination filtering
        // based on the organization's security requirements
    }
    /**
     * Restrict the default security group
     */
    restrictDefaultSecurityGroup() {
        // Remove all rules from default security group
        const defaultSg = ec2.SecurityGroup.fromSecurityGroupId(this, 'DefaultSg', this.vpc.vpcDefaultSecurityGroup);
        // Add explicit deny rules (this is a placeholder - actual implementation would
        // require custom resources to modify the default security group)
    }
    /**
     * Build subnet configuration based on compliance requirements
     */
    buildSubnetConfiguration() {
        const config = [];
        // Public subnets (for load balancers, NAT gateways)
        config.push({
            name: 'Public',
            subnetType: ec2.SubnetType.PUBLIC,
            cidrMask: this.config.subnets?.public?.cidrMask || 24
        });
        // Private subnets (for application servers)
        config.push({
            name: 'Private',
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            cidrMask: this.config.subnets?.private?.cidrMask || 24
        });
        // Isolated subnets (for databases)
        config.push({
            name: 'Database',
            subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            cidrMask: this.config.subnets?.database?.cidrMask || 28
        });
        return config;
    }
    /**
     * Build VPC capability data shape
     */
    buildVpcCapability() {
        return {
            vpcId: this.vpc.vpcId,
            publicSubnetIds: this.vpc.publicSubnets.map(s => s.subnetId),
            privateSubnetIds: this.vpc.privateSubnets.map(s => s.subnetId)
        };
    }
    /**
     * Helper methods for compliance decisions
     */
    isComplianceFramework() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    getFlowLogRetention() {
        switch (this.context.complianceFramework) {
            case 'fedramp-moderate':
                return logs.RetentionDays.THREE_MONTHS;
            case 'fedramp-high':
                return logs.RetentionDays.ONE_YEAR;
            default:
                return logs.RetentionDays.ONE_MONTH;
        }
    }
}
exports.VpcComponent = VpcComponent;
//# sourceMappingURL=vpc.component.js.map