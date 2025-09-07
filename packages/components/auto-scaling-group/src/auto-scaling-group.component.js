"use strict";
/**
 * Auto Scaling Group Component
 * * A managed auto scaling group with launch template and compliance hardening.
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
exports.AutoScalingGroupComponent = exports.AutoScalingGroupConfigBuilder = exports.AUTO_SCALING_GROUP_CONFIG_SCHEMA = void 0;
const autoscaling = __importStar(require("aws-cdk-lib/aws-autoscaling"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
const cdk = __importStar(require("aws-cdk-lib"));
const contracts_1 = require("@platform/contracts");
/**
 * Configuration schema for Auto Scaling Group component
 */
exports.AUTO_SCALING_GROUP_CONFIG_SCHEMA = {
    type: 'object',
    title: 'Auto Scaling Group Configuration',
    description: 'Configuration for creating an Auto Scaling Group with launch template and compliance hardening',
    properties: {
        launchTemplate: {
            type: 'object',
            description: 'Launch template configuration',
            properties: {
                instanceType: {
                    type: 'string',
                    description: 'EC2 instance type',
                    enum: [
                        't3.micro', 't3.small', 't3.medium', 't3.large', 't3.xlarge', 't3.2xlarge',
                        'm5.large', 'm5.xlarge', 'm5.2xlarge', 'm5.4xlarge', 'm5.8xlarge',
                        'c5.large', 'c5.xlarge', 'c5.2xlarge', 'c5.4xlarge',
                        'r5.large', 'r5.xlarge', 'r5.2xlarge'
                    ],
                    default: 't3.micro'
                },
                ami: {
                    type: 'object',
                    description: 'AMI configuration',
                    properties: {
                        amiId: {
                            type: 'string',
                            description: 'Specific AMI ID to use',
                            pattern: '^ami-[a-f0-9]{8,17}$'
                        },
                        namePattern: {
                            type: 'string',
                            description: 'AMI name pattern for lookup',
                            default: 'amzn2-ami-hvm-*-x86_64-gp2'
                        },
                        owner: {
                            type: 'string',
                            description: 'AMI owner',
                            enum: ['amazon', 'self', 'aws-marketplace'],
                            default: 'amazon'
                        }
                    },
                    additionalProperties: false
                },
                userData: {
                    type: 'string',
                    description: 'User data script to run on instance startup'
                },
                keyName: {
                    type: 'string',
                    description: 'EC2 key pair name for SSH access'
                }
            },
            additionalProperties: false
        },
        autoScaling: {
            type: 'object',
            description: 'Auto scaling configuration',
            properties: {
                minCapacity: {
                    type: 'number',
                    description: 'Minimum number of instances',
                    minimum: 0,
                    maximum: 1000,
                    default: 1
                },
                maxCapacity: {
                    type: 'number',
                    description: 'Maximum number of instances',
                    minimum: 1,
                    maximum: 1000,
                    default: 3
                },
                desiredCapacity: {
                    type: 'number',
                    description: 'Desired number of instances',
                    minimum: 0,
                    maximum: 1000,
                    default: 2
                }
            },
            additionalProperties: false
        },
        vpc: {
            type: 'object',
            description: 'VPC configuration',
            properties: {
                vpcId: {
                    type: 'string',
                    description: 'VPC ID to deploy into',
                    pattern: '^vpc-[a-f0-9]{8,17}$'
                },
                subnetIds: {
                    type: 'array',
                    description: 'Subnet IDs for the Auto Scaling Group',
                    items: {
                        type: 'string',
                        pattern: '^subnet-[a-f0-9]{8,17}$'
                    },
                    minItems: 1,
                    maxItems: 10
                },
                securityGroupIds: {
                    type: 'array',
                    description: 'Additional security group IDs',
                    items: {
                        type: 'string',
                        pattern: '^sg-[a-f0-9]{8,17}$'
                    },
                    maxItems: 5
                }
            },
            additionalProperties: false
        },
        storage: {
            type: 'object',
            description: 'EBS storage configuration',
            properties: {
                rootVolumeSize: {
                    type: 'number',
                    description: 'Root volume size in GB',
                    minimum: 8,
                    maximum: 16384,
                    default: 20
                },
                rootVolumeType: {
                    type: 'string',
                    description: 'Root volume type',
                    enum: ['gp2', 'gp3', 'io1', 'io2'],
                    default: 'gp3'
                },
                encrypted: {
                    type: 'boolean',
                    description: 'Enable EBS encryption',
                    default: false
                },
                kmsKeyArn: {
                    type: 'string',
                    description: 'KMS key ARN for encryption',
                    pattern: '^arn:aws:kms:[a-z0-9-]+:[0-9]{12}:key/[a-f0-9-]{36}$'
                }
            },
            additionalProperties: false
        },
        healthCheck: {
            type: 'object',
            description: 'Health check configuration',
            properties: {
                type: {
                    type: 'string',
                    description: 'Health check type',
                    enum: ['EC2', 'ELB'],
                    default: 'EC2'
                },
                gracePeriod: {
                    type: 'number',
                    description: 'Health check grace period in seconds',
                    minimum: 0,
                    maximum: 7200,
                    default: 300
                }
            },
            additionalProperties: false
        },
        terminationPolicies: {
            type: 'array',
            description: 'Termination policies for the Auto Scaling Group',
            items: {
                type: 'string',
                enum: ['Default', 'OldestInstance', 'NewestInstance', 'OldestLaunchConfiguration', 'ClosestToNextInstanceHour']
            },
            default: ['Default'],
            maxItems: 5
        },
        updatePolicy: {
            type: 'object',
            description: 'Update policy configuration',
            properties: {
                rollingUpdate: {
                    type: 'object',
                    description: 'Rolling update configuration',
                    properties: {
                        minInstancesInService: {
                            type: 'number',
                            description: 'Minimum instances in service during update',
                            minimum: 0,
                            default: 1
                        },
                        maxBatchSize: {
                            type: 'number',
                            description: 'Maximum batch size for updates',
                            minimum: 1,
                            default: 1
                        },
                        pauseTime: {
                            type: 'string',
                            description: 'Pause time between batches (ISO 8601 duration)',
                            pattern: '^PT(?:[0-9]+H)?(?:[0-9]+M)?(?:[0-9]+S)?$',
                            default: 'PT5M'
                        }
                    },
                    additionalProperties: false
                }
            },
            additionalProperties: false
        }
    },
    additionalProperties: false,
    defaults: {
        launchTemplate: {
            instanceType: 't3.micro',
            ami: { namePattern: 'amzn2-ami-hvm-*-x86_64-gp2', owner: 'amazon' }
        },
        autoScaling: {
            minCapacity: 1,
            maxCapacity: 3,
            desiredCapacity: 2
        },
        storage: {
            rootVolumeSize: 20,
            rootVolumeType: 'gp3',
            encrypted: false
        },
        healthCheck: {
            type: 'EC2',
            gracePeriod: 300
        },
        terminationPolicies: ['Default']
    }
};
/**
 * AutoScalingGroupConfigBuilder - Handles configuration building and defaults for AutoScalingGroup
 */
class AutoScalingGroupConfigBuilder {
    context;
    spec;
    constructor(context, spec) {
        this.context = context;
        this.spec = spec;
    }
    /**
     * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
     */
    buildSync() {
        const platformDefaults = this.getPlatformDefaults();
        const complianceDefaults = this.getComplianceFrameworkDefaults();
        const userConfig = this.spec.config || {};
        // Deep merge with user config taking highest precedence
        const finalConfig = this.mergeConfigs(this.mergeConfigs(platformDefaults, complianceDefaults), userConfig);
        return finalConfig;
    }
    mergeConfigs(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this.mergeConfigs(result[key] || {}, source[key]);
                }
                else {
                    result[key] = source[key];
                }
            }
        }
        return result;
    }
    getPlatformDefaults() {
        return {
            launchTemplate: { instanceType: 't3.micro' },
            autoScaling: { minCapacity: 1, maxCapacity: 3, desiredCapacity: 2 },
            storage: { rootVolumeSize: 20, rootVolumeType: 'gp3', encrypted: false },
            healthCheck: { type: 'EC2', gracePeriod: 300 },
            terminationPolicies: ['Default']
        };
    }
    getComplianceFrameworkDefaults() {
        const framework = this.context.complianceFramework;
        switch (framework) {
            case 'fedramp-moderate':
                return {
                    launchTemplate: { instanceType: 't3.medium' },
                    storage: { rootVolumeSize: 50, encrypted: true },
                    healthCheck: { gracePeriod: 180 }
                };
            case 'fedramp-high':
                return {
                    launchTemplate: { instanceType: 'm5.large' },
                    storage: { rootVolumeSize: 100, encrypted: true },
                    healthCheck: { gracePeriod: 120 }
                };
            default: // commercial
                return { storage: { encrypted: false } };
        }
    }
}
exports.AutoScalingGroupConfigBuilder = AutoScalingGroupConfigBuilder;
/**
 * Auto Scaling Group Component implementing Component API Contract v1.0
 */
class AutoScalingGroupComponent extends contracts_1.Component {
    autoScalingGroup;
    launchTemplate;
    securityGroup;
    role;
    instanceProfile;
    kmsKey;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    synth() {
        this.logComponentEvent('synthesis_start', 'Starting Auto Scaling Group synthesis');
        try {
            const configBuilder = new AutoScalingGroupConfigBuilder(this.context, this.spec);
            this.config = configBuilder.buildSync();
            this.createKmsKeyIfNeeded();
            this.createInstanceRole();
            this.createSecurityGroup();
            this.createLaunchTemplate();
            this.createAutoScalingGroup();
            this.applyComplianceHardening();
            this.registerConstruct('autoScalingGroup', this.autoScalingGroup);
            this.registerConstruct('launchTemplate', this.launchTemplate);
            this.registerConstruct('securityGroup', this.securityGroup);
            this.registerConstruct('role', this.role);
            if (this.kmsKey) {
                this.registerConstruct('kmsKey', this.kmsKey);
            }
            this.registerCapability('compute:asg', this.buildAutoScalingGroupCapability());
            this.logComponentEvent('synthesis_complete', 'Auto Scaling Group synthesis completed successfully');
        }
        catch (error) {
            this.logError(error, 'Auto Scaling Group synthesis');
            throw error;
        }
    }
    getCapabilities() {
        this.validateSynthesized();
        return this.capabilities;
    }
    getType() {
        return 'auto-scaling-group';
    }
    createKmsKeyIfNeeded() {
        if (this.shouldUseCustomerManagedKey()) {
            this.kmsKey = new kms.Key(this, 'EbsEncryptionKey', {
                description: `EBS encryption key for ${this.spec.name} Auto Scaling Group`,
                enableKeyRotation: this.context.complianceFramework === 'fedramp-high',
                keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
                keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
            });
        }
    }
    createInstanceRole() {
        this.role = new iam.Role(this, 'InstanceRole', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            description: `IAM role for ${this.spec.name} Auto Scaling Group instances`,
            managedPolicies: this.getBaseManagedPolicies()
        });
        this.applyCompliancePolicies();
        this.instanceProfile = new iam.InstanceProfile(this, 'InstanceProfile', {
            role: this.role
        });
    }
    createSecurityGroup() {
        const vpc = this.getVpc();
        this.securityGroup = new ec2.SecurityGroup(this, 'InstanceSecurityGroup', {
            vpc,
            description: `Security group for ${this.spec.name} Auto Scaling Group`,
            allowAllOutbound: !this.isComplianceFramework()
        });
        this.applySecurityGroupRules();
    }
    createLaunchTemplate() {
        this.launchTemplate = new ec2.LaunchTemplate(this, 'LaunchTemplate', {
            launchTemplateName: `${this.context.serviceName}-${this.spec.name}`,
            instanceType: new ec2.InstanceType(this.config.launchTemplate?.instanceType || 't3.micro'),
            machineImage: this.getInstanceAmi(),
            userData: this.buildUserData(),
            keyName: this.config.launchTemplate?.keyName,
            securityGroup: this.securityGroup,
            role: this.role,
            blockDevices: this.buildBlockDevices(),
            detailedMonitoring: this.shouldEnableDetailedMonitoring(),
            requireImdsv2: this.shouldRequireImdsv2()
        });
    }
    createAutoScalingGroup() {
        const vpc = this.getVpc();
        this.autoScalingGroup = new autoscaling.AutoScalingGroup(this, 'AutoScalingGroup', {
            autoScalingGroupName: `${this.context.serviceName}-${this.spec.name}`,
            vpc,
            vpcSubnets: this.getVpcSubnets(),
            launchTemplate: this.launchTemplate,
            minCapacity: this.config.autoScaling?.minCapacity,
            maxCapacity: this.config.autoScaling?.maxCapacity,
            desiredCapacity: this.config.autoScaling?.desiredCapacity,
            healthCheck: this.getHealthCheckType(),
            terminationPolicies: this.getTerminationPolicies(),
            updatePolicy: this.getUpdatePolicy()
        });
        this.applyAutoScalingGroupTags();
    }
    applyComplianceHardening() {
        if (this.isComplianceFramework()) {
            this.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
            this.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'));
        }
        if (this.context.complianceFramework === 'fedramp-high') {
            cdk.Tags.of(this.autoScalingGroup).add('STIGCompliant', 'true');
        }
    }
    getBaseManagedPolicies() {
        return this.isComplianceFramework()
            ? [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')]
            : [];
    }
    applyCompliancePolicies() {
        if (this.isComplianceFramework()) {
            this.role.addToPolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['logs:PutLogEvents', 'logs:CreateLogStream', 'logs:CreateLogGroup'],
                resources: ['arn:aws:logs:*:*:*']
            }));
        }
    }
    applySecurityGroupRules() {
        // Example: Allow inbound web traffic
        this.securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic');
    }
    buildUserData() {
        const userData = ec2.UserData.forLinux();
        if (this.config?.launchTemplate?.userData) {
            userData.addCommands(this.config.launchTemplate.userData);
        }
        if (this.isComplianceFramework()) {
            userData.addCommands('yum install -y amazon-ssm-agent', 'systemctl enable amazon-ssm-agent', 'systemctl start amazon-ssm-agent');
        }
        if (this.context.complianceFramework === 'fedramp-high') {
            userData.addCommands('# STIG hardening scripts here');
        }
        return userData;
    }
    buildBlockDevices() {
        return [{
                deviceName: '/dev/xvda',
                volume: ec2.BlockDeviceVolume.ebs(this.config.storage?.rootVolumeSize, {
                    volumeType: this.getEbsVolumeType(),
                    encrypted: this.shouldEnableEbsEncryption(),
                    kmsKey: this.kmsKey,
                    deleteOnTermination: true
                })
            }];
    }
    applyAutoScalingGroupTags() {
        cdk.Tags.of(this.autoScalingGroup).add('Name', `${this.context.serviceName}-${this.spec.name}`);
        // ... add other mandatory tags
    }
    buildAutoScalingGroupCapability() {
        this.validateSynthesized();
        return {
            asgArn: this.autoScalingGroup.autoScalingGroupArn,
            asgName: this.autoScalingGroup.autoScalingGroupName,
            roleArn: this.role.roleArn,
            securityGroupId: this.securityGroup.securityGroupId,
            launchTemplateId: this.launchTemplate.launchTemplateId,
            launchTemplateName: this.launchTemplate.launchTemplateName
        };
    }
    // --- Helper methods for compliance decisions and configurations ---
    getVpc() {
        return this.context.vpc || ec2.Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true });
    }
    isComplianceFramework() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    shouldUseCustomerManagedKey() {
        return this.isComplianceFramework() && this.config?.storage?.kmsKeyArn === undefined;
    }
    shouldEnableEbsEncryption() {
        return this.isComplianceFramework() || this.config?.storage?.encrypted === true;
    }
    shouldEnableDetailedMonitoring() {
        return this.isComplianceFramework();
    }
    shouldRequireImdsv2() {
        return this.isComplianceFramework();
    }
    getInstanceAmi() {
        if (this.config?.launchTemplate?.ami?.amiId) {
            const amiMap = {};
            amiMap[this.context.region] = this.config.launchTemplate.ami.amiId;
            return ec2.MachineImage.genericLinux(amiMap);
        }
        // In a real scenario, you'd have hardened AMI lookups here based on framework
        return ec2.MachineImage.latestAmazonLinux2();
    }
    getVpcSubnets() {
        if (this.config?.vpc?.subnetIds) {
            return { subnets: this.config.vpc.subnetIds.map(id => ec2.Subnet.fromSubnetId(this, id, id)) };
        }
        return { subnetType: this.isComplianceFramework() ? ec2.SubnetType.PRIVATE_WITH_EGRESS : ec2.SubnetType.PUBLIC };
    }
    getEbsVolumeType() {
        const type = this.config?.storage?.rootVolumeType || 'gp3';
        return ec2.EbsDeviceVolumeType[type.toUpperCase()];
    }
    getHealthCheckType() {
        return this.config?.healthCheck?.type === 'ELB'
            ? autoscaling.HealthCheck.elb({ grace: cdk.Duration.seconds(this.config.healthCheck.gracePeriod) })
            : autoscaling.HealthCheck.ec2({ grace: cdk.Duration.seconds(this.config?.healthCheck?.gracePeriod) });
    }
    getTerminationPolicies() {
        return this.config?.terminationPolicies?.map(p => autoscaling.TerminationPolicy[p.toUpperCase()]) || [autoscaling.TerminationPolicy.DEFAULT];
    }
    getUpdatePolicy() {
        const rollingUpdate = this.config?.updatePolicy?.rollingUpdate;
        if (rollingUpdate) {
            return autoscaling.UpdatePolicy.rollingUpdate({
                minInstancesInService: rollingUpdate.minInstancesInService,
                maxBatchSize: rollingUpdate.maxBatchSize,
                pauseTime: rollingUpdate.pauseTime ? cdk.Duration.parse(rollingUpdate.pauseTime) : undefined
            });
        }
        return autoscaling.UpdatePolicy.rollingUpdate();
    }
}
exports.AutoScalingGroupComponent = AutoScalingGroupComponent;
//# sourceMappingURL=auto-scaling-group.component.js.map