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
exports.VpcComponent = void 0;
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const cdk = __importStar(require("aws-cdk-lib"));
const component_1 = require("../../../src/platform/contracts/component");
const vpc_builder_1 = require("./vpc.builder");
/**
 * VPC Component implementing Component API Contract v1.1
 */
class VpcComponent extends component_1.BaseComponent {
    vpc;
    flowLogGroup;
    flowLogRole;
    config;
    logger; // Platform logger instance
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
        this.logger = this.getLogger();
    }
    /**
     * Synthesis phase - Create VPC with compliance hardening
     * Follows the 6-step synthesis process defined in Platform Component API Contract v1.1
     */
    synth() {
        this.logger.info(`Synthesizing VPC component: ${this.spec.name}`);
        try {
            // Step 1: Build configuration using ConfigBuilder
            const builderContext = {
                context: this.context,
                spec: this.spec,
            };
            const builder = new vpc_builder_1.VpcConfigBuilder(builderContext, vpc_builder_1.VPC_CONFIG_SCHEMA);
            this.config = builder.buildSync();
            // Step 2: Create core AWS CDK constructs first
            this.createVpc();
            this.createVpcFlowLogsIfEnabled();
            this.createVpcEndpointsIfNeeded();
            // Step 3: Apply compliance hardening (after VPC exists)
            this.applyComplianceHardening();
            // Step 4: Apply standard tags to all taggable resources
            this.applyStandardTagsToResources();
            // Step 5: Register constructs for patches.ts access
            this.registerConstructs();
            // Step 6: Register capabilities for binding
            this.registerCapabilities();
            this.logger.info(`VPC component ${this.spec.name} synthesized successfully.`);
        }
        catch (error) {
            this.logger.error('VPC synthesis failed', { error: error instanceof Error ? error.message : error });
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
                retention: this.mapDaysToRetention(this.config.flowLogRetentionDays || 30),
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
        // Note: Default security group rule modification requires custom resources
        // and should be implemented through compliance-specific security group policies
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
            privateSubnetIds: this.vpc.privateSubnets.map(s => s.subnetId),
            isolatedSubnetIds: this.vpc.isolatedSubnets.map(s => s.subnetId)
        };
    }
    /**
     * Helper methods for compliance decisions
     */
    isComplianceFramework() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    /**
     * Maps days to CloudWatch Logs retention enum
     */
    mapDaysToRetention(days) {
        if (days <= 1)
            return logs.RetentionDays.ONE_DAY;
        if (days <= 3)
            return logs.RetentionDays.THREE_DAYS;
        if (days <= 5)
            return logs.RetentionDays.FIVE_DAYS;
        if (days <= 7)
            return logs.RetentionDays.ONE_WEEK;
        if (days <= 14)
            return logs.RetentionDays.TWO_WEEKS;
        if (days <= 30)
            return logs.RetentionDays.ONE_MONTH;
        if (days <= 60)
            return logs.RetentionDays.TWO_MONTHS;
        if (days <= 90)
            return logs.RetentionDays.THREE_MONTHS;
        if (days <= 120)
            return logs.RetentionDays.FOUR_MONTHS;
        if (days <= 150)
            return logs.RetentionDays.FIVE_MONTHS;
        if (days <= 180)
            return logs.RetentionDays.SIX_MONTHS;
        if (days <= 365)
            return logs.RetentionDays.ONE_YEAR;
        if (days <= 400)
            return logs.RetentionDays.THIRTEEN_MONTHS;
        if (days <= 545)
            return logs.RetentionDays.EIGHTEEN_MONTHS;
        if (days <= 730)
            return logs.RetentionDays.TWO_YEARS;
        if (days <= 1827)
            return logs.RetentionDays.FIVE_YEARS;
        return logs.RetentionDays.TEN_YEARS;
    }
    /**
     * Apply standard platform tags to VPC and related resources
     */
    applyVpcTags() {
        if (this.vpc) {
            // Apply standard platform tags to VPC
            this.applyStandardTags(this.vpc);
            // Apply standard tags to subnets
            this.vpc.publicSubnets.forEach((subnet) => {
                this.applyStandardTags(subnet, { 'subnet-type': 'public' });
            });
            this.vpc.privateSubnets.forEach((subnet) => {
                this.applyStandardTags(subnet, { 'subnet-type': 'private' });
            });
            this.vpc.isolatedSubnets.forEach((subnet) => {
                this.applyStandardTags(subnet, { 'subnet-type': 'isolated' });
            });
        }
        // Apply tags to flow log group if it exists
        if (this.flowLogGroup) {
            this.applyStandardTags(this.flowLogGroup);
        }
        // Apply tags to flow log role if it exists
        if (this.flowLogRole) {
            this.applyStandardTags(this.flowLogRole);
        }
    }
    /**
     * Apply standard tags to all taggable resources
     */
    applyStandardTagsToResources() {
        if (this.vpc) {
            this.applyStandardTags(this.vpc, {
                'vpc-cidr': this.config.cidr || '10.0.0.0/16',
                'nat-gateways': String(this.config.natGateways ?? 1),
                'max-azs': String(this.config.maxAzs || 2),
                'flow-logs-enabled': String(this.config.flowLogsEnabled ?? true)
            });
        }
        if (this.flowLogGroup) {
            this.applyStandardTags(this.flowLogGroup, {
                'log-type': 'vpc-flow-logs',
                'retention-days': String(this.config.flowLogRetentionDays || 365)
            });
        }
        if (this.flowLogRole) {
            this.applyStandardTags(this.flowLogRole, {
                'role-type': 'vpc-flow-logs'
            });
        }
    }
    /**
     * Register constructs for patches.ts access
     */
    registerConstructs() {
        this.registerConstruct('main', this.vpc); // 'main' handle is mandatory
        this.registerConstruct('vpc', this.vpc);
        if (this.flowLogGroup) {
            this.registerConstruct('flowLogGroup', this.flowLogGroup);
        }
        if (this.flowLogRole) {
            this.registerConstruct('flowLogRole', this.flowLogRole);
        }
    }
    /**
     * Register capabilities for binding
     */
    registerCapabilities() {
        const capabilities = {};
        // Core VPC capability
        capabilities['net:vpc'] = {
            vpcId: this.vpc.vpcId,
            vpcArn: this.vpc.vpcArn,
            cidr: this.vpc.vpcCidrBlock,
            availabilityZones: this.vpc.availabilityZones,
            publicSubnetIds: this.vpc.publicSubnets.map(subnet => subnet.subnetId),
            privateSubnetIds: this.vpc.privateSubnets.map(subnet => subnet.subnetId),
            isolatedSubnetIds: this.vpc.isolatedSubnets.map(subnet => subnet.subnetId),
            natGatewayIds: [] // NAT gateway IDs are not directly accessible from VPC construct
        };
        // Networking capability
        capabilities['networking:vpc'] = {
            vpcId: this.vpc.vpcId,
            region: this.context.region || 'us-east-1',
            availabilityZones: this.vpc.availabilityZones.length,
            hasPublicSubnets: this.vpc.publicSubnets.length > 0,
            hasPrivateSubnets: this.vpc.privateSubnets.length > 0,
            hasIsolatedSubnets: this.vpc.isolatedSubnets.length > 0
        };
        // Security capability
        capabilities['security:network-isolation'] = {
            vpcId: this.vpc.vpcId,
            flowLogsEnabled: this.config.flowLogsEnabled ?? true,
            vpcEndpointsEnabled: Object.values(this.config.vpcEndpoints || {}).some(enabled => enabled),
            complianceFramework: this.context.complianceFramework
        };
        // Register all capabilities
        Object.entries(capabilities).forEach(([key, data]) => {
            this.registerCapability(key, data);
        });
    }
}
exports.VpcComponent = VpcComponent;
