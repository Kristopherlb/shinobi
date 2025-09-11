"use strict";
/**
 * EC2 Instance Component
 *
 * A managed EC2 compute instance with compliance hardening.
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
exports.Ec2InstanceComponent = exports.Ec2InstanceConfigBuilder = exports.EC2_INSTANCE_CONFIG_SCHEMA = void 0;
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
const cdk = __importStar(require("aws-cdk-lib"));
// File system operations are now handled by the abstract ConfigBuilder base class
const component_1 = require("../../../src/platform/contracts/component");
const contracts_1 = require("../../../src/platform/contracts");
/**
 * Configuration schema for EC2 Instance component
 */
exports.EC2_INSTANCE_CONFIG_SCHEMA = {
    type: 'object',
    title: 'EC2 Instance Configuration',
    description: 'Configuration for creating an EC2 compute instance with compliance hardening',
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
        vpc: {
            type: 'object',
            description: 'VPC configuration',
            properties: {
                vpcId: {
                    type: 'string',
                    description: 'VPC ID to deploy into',
                    pattern: '^vpc-[a-f0-9]{8,17}$'
                },
                subnetId: {
                    type: 'string',
                    description: 'Subnet ID for the instance',
                    pattern: '^subnet-[a-f0-9]{8,17}$'
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
        userData: {
            type: 'object',
            description: 'User data script configuration',
            properties: {
                script: {
                    type: 'string',
                    description: 'User data script content'
                },
                fromFile: {
                    type: 'string',
                    description: 'Path to user data script file'
                }
            },
            additionalProperties: false
        },
        keyPair: {
            type: 'object',
            description: 'Key pair configuration for SSH access',
            properties: {
                keyName: {
                    type: 'string',
                    description: 'EC2 key pair name'
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
                },
                deleteOnTermination: {
                    type: 'boolean',
                    description: 'Delete volume on instance termination',
                    default: true
                }
            },
            additionalProperties: false
        },
        monitoring: {
            type: 'object',
            description: 'Monitoring configuration',
            properties: {
                detailed: {
                    type: 'boolean',
                    description: 'Enable detailed CloudWatch monitoring',
                    default: false
                },
                cloudWatchAgent: {
                    type: 'boolean',
                    description: 'Enable CloudWatch agent installation',
                    default: false
                }
            },
            additionalProperties: false
        },
        security: {
            type: 'object',
            description: 'Security configuration',
            properties: {
                requireImdsv2: {
                    type: 'boolean',
                    description: 'Disable IMDSv1 and require IMDSv2',
                    default: false
                },
                httpTokens: {
                    type: 'string',
                    description: 'Instance metadata service token requirement',
                    enum: ['optional', 'required'],
                    default: 'optional'
                },
                nitroEnclaves: {
                    type: 'boolean',
                    description: 'Enable AWS Nitro Enclaves',
                    default: false
                }
            },
            additionalProperties: false
        }
    },
    additionalProperties: false,
    defaults: {
        instanceType: 't3.micro',
        ami: {
            namePattern: 'al2023-ami-*-x86_64',
            owner: 'amazon'
        },
        storage: {
            rootVolumeSize: 20,
            rootVolumeType: 'gp3',
            encrypted: false,
            deleteOnTermination: true
        },
        monitoring: {
            detailed: false,
            cloudWatchAgent: false
        },
        security: {
            requireImdsv2: false,
            httpTokens: 'optional',
            nitroEnclaves: false
        }
    }
};
/**
 * Ec2InstanceConfigBuilder - Simplified config builder extending the abstract ConfigBuilder base class
 *
 * This builder now leverages the centralized 5-layer precedence engine from the abstract base class.
 * Its only responsibility is to provide EC2-specific hardcoded fallbacks - all orchestration,
 * loading, merging, and validation is handled automatically by the base class.
 */
class Ec2InstanceConfigBuilder extends contracts_1.ConfigBuilder {
    constructor(context, spec) {
        const builderContext = { context, spec };
        super(builderContext, exports.EC2_INSTANCE_CONFIG_SCHEMA);
    }
    /**
     * Builds the final configuration using the centralized 5-layer precedence engine
     */
    async build() {
        return this.buildSync();
    }
    /**
     * Provide EC2-specific hardcoded fallbacks (Layer 1: Lowest Priority)
     * These serve as ultra-safe defaults when no other configuration is available.
     */
    getHardcodedFallbacks() {
        return {
            instanceType: 't3.micro', // Ultra-safe default
            ami: {
                namePattern: 'al2023-ami-*-x86_64',
                owner: 'amazon'
            },
            storage: {
                rootVolumeSize: 20,
                rootVolumeType: 'gp3',
                encrypted: false,
                deleteOnTermination: true
            },
            monitoring: {
                detailed: false,
                cloudWatchAgent: false
            },
            security: {
                requireImdsv2: false,
                httpTokens: 'optional',
                nitroEnclaves: false
            },
            networking: {
                associatePublicIpAddress: false,
                sourceDestCheck: true
            }
        };
    }
}
exports.Ec2InstanceConfigBuilder = Ec2InstanceConfigBuilder;
/**
 * EC2 Instance Component implementing Component API Contract v1.0
 */
class Ec2InstanceComponent extends component_1.BaseComponent {
    instance;
    securityGroup;
    instanceProfile;
    role;
    kmsKey;
    config;
    configBuilder;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    /**
     * Synthesis phase - Create EC2 instance with compliance hardening
     */
    synth() {
        this.logComponentEvent('synthesis_start', 'Starting EC2 Instance synthesis');
        try {
            // Build configuration using ConfigBuilder
            this.configBuilder = new Ec2InstanceConfigBuilder(this.context, this.spec);
            this.config = this.configBuilder.buildSync();
            // Create KMS key for EBS encryption if needed
            this.createKmsKeyIfNeeded();
            // Create IAM role and instance profile
            this.createInstanceRole();
            // Create security group
            this.createSecurityGroup();
            // Create EC2 instance
            this.createInstance();
            // Apply compliance hardening
            this.applyComplianceHardening();
            // Configure observability (required by OpenTelemetry standard)
            this.configureObservabilityForInstance();
            // Register constructs
            this.registerConstruct('instance', this.instance);
            this.registerConstruct('securityGroup', this.securityGroup);
            this.registerConstruct('role', this.role);
            if (this.kmsKey) {
                this.registerConstruct('kmsKey', this.kmsKey);
            }
            // Register capabilities
            this.registerCapability('compute:ec2', this.buildInstanceCapability());
            // Validate that synthesis was successful
            this.validateSynthesized();
            this.logComponentEvent('synthesis_complete', 'EC2 Instance synthesis completed successfully');
        }
        catch (error) {
            this.logError(error, 'EC2 Instance synthesis');
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
        return 'ec2-instance';
    }
    /**
     * Create KMS key for EBS encryption if required by compliance framework
     */
    createKmsKeyIfNeeded() {
        if (this.shouldUseCustomerManagedKey()) {
            this.kmsKey = new kms.Key(this, 'EbsEncryptionKey', {
                description: `EBS encryption key for ${this.spec.name} EC2 instance`,
                enableKeyRotation: this.context.complianceFramework === 'fedramp-high',
                keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
                keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
            });
            // Grant EC2 service access to the key
            this.kmsKey.addToResourcePolicy(new iam.PolicyStatement({
                sid: 'AllowEC2Service',
                principals: [new iam.ServicePrincipal('ec2.amazonaws.com')],
                actions: [
                    'kms:Decrypt',
                    'kms:GenerateDataKey*',
                    'kms:ReEncrypt*',
                    'kms:DescribeKey'
                ],
                resources: ['*']
            }));
        }
    }
    /**
     * Create IAM role and instance profile for the EC2 instance
     */
    createInstanceRole() {
        this.role = new iam.Role(this, 'InstanceRole', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            description: `IAM role for ${this.spec.name} EC2 instance`,
            managedPolicies: this.getBaseManagedPolicies()
        });
        // Apply compliance-specific policies
        this.applyCompliancePolicies();
        // Create instance profile
        this.instanceProfile = new iam.InstanceProfile(this, 'InstanceProfile', {
            instanceProfileName: `${this.context.serviceName}-${this.spec.name}-profile`,
            role: this.role
        });
    }
    /**
     * Create security group for the EC2 instance
     */
    createSecurityGroup() {
        // Use provided VPC or default
        const vpc = this.config.vpc?.vpcId ?
            ec2.Vpc.fromLookup(this, 'Vpc', { vpcId: this.config.vpc.vpcId }) :
            ec2.Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true });
        this.securityGroup = new ec2.SecurityGroup(this, 'InstanceSecurityGroup', {
            vpc,
            description: `Security group for ${this.spec.name} EC2 instance`,
            allowAllOutbound: !this.isComplianceFramework() // Restrict outbound for compliance
        });
        // Apply basic security rules
        this.applySecurityGroupRules();
    }
    /**
     * Create the EC2 instance
     */
    createInstance() {
        const vpc = this.config.vpc?.vpcId ?
            ec2.Vpc.fromLookup(this, 'VpcForInstance', { vpcId: this.config.vpc.vpcId }) :
            ec2.Vpc.fromLookup(this, 'DefaultVpcForInstance', { isDefault: true });
        // Get AMI
        const ami = this.getInstanceAmi();
        // Build user data
        const userData = this.buildUserData();
        // Validate instance type
        const instanceType = this.config.instanceType || 't3.micro';
        this.validateInstanceType(instanceType);
        const instanceProps = {
            instanceType: new ec2.InstanceType(instanceType),
            machineImage: ami,
            vpc,
            vpcSubnets: this.getVpcSubnets(),
            securityGroup: this.securityGroup,
            role: this.role,
            userData: userData,
            keyPair: this.config.keyPair?.keyName ?
                ec2.KeyPair.fromKeyPairName(this, 'KeyPair', this.config.keyPair.keyName) :
                undefined,
            blockDevices: this.buildBlockDevices(),
            detailedMonitoring: !!this.shouldEnableDetailedMonitoring(),
            requireImdsv2: this.shouldRequireImdsv2(), // Use CDK's built-in IMDSv2 support
            sourceDestCheck: !this.isComplianceFramework() // Disable for NAT instances in compliance
        };
        this.instance = new ec2.Instance(this, 'Instance', instanceProps);
        // Apply additional tags
        this.applyInstanceTags();
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
        // Basic CloudWatch monitoring
        if (this.instance) {
            // Enable CloudWatch agent
            this.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'));
        }
    }
    applyFedrampModerateHardening() {
        // Apply commercial hardening
        this.applyCommercialHardening();
        // Enhanced monitoring and logging
        this.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
        // Install SSM agent via user data
        if (this.instance) {
            this.instance.userData.addCommands('yum update -y', 'yum install -y amazon-ssm-agent', 'systemctl enable amazon-ssm-agent', 'systemctl start amazon-ssm-agent');
        }
    }
    applyFedrampHighHardening() {
        // Apply all moderate hardening
        this.applyFedrampModerateHardening();
        // Additional high-security configurations
        if (this.instance) {
            // Install security agents and STIG hardening
            this.instance.userData.addCommands('# STIG hardening commands', 'yum install -y aide', 'aide --init', 'mv /var/lib/aide/aide.db.new.gz /var/lib/aide/aide.db.gz', '# Configure auditd', 'systemctl enable auditd', 'systemctl start auditd', '# Disable unnecessary services', 'systemctl disable bluetooth', 'systemctl disable cups', 'systemctl disable avahi-daemon', '# Set up log forwarding to central logging', 'echo "*.* @@logs.internal.company.com:514" >> /etc/rsyslog.conf', 'systemctl restart rsyslog');
            // FedRAMP High tags will be applied in applyInstanceTags() method
        }
    }
    /**
     * Get base managed policies for the instance role
     */
    getBaseManagedPolicies() {
        const policies = [];
        // Always include SSM for compliance frameworks
        if (this.isComplianceFramework()) {
            policies.push(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
        }
        return policies;
    }
    /**
     * Apply compliance-specific IAM policies
     */
    applyCompliancePolicies() {
        // CloudWatch permissions for logging and monitoring
        this.role.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'cloudwatch:PutMetricData',
                'ec2:DescribeVolumes',
                'ec2:DescribeTags',
                'logs:PutLogEvents',
                'logs:CreateLogGroup',
                'logs:CreateLogStream'
            ],
            resources: ['*']
        }));
        if (this.context.complianceFramework === 'fedramp-high') {
            // Additional permissions for STIG compliance
            this.role.addToPolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    's3:GetObject',
                    's3:PutObject'
                ],
                resources: [`arn:aws:s3:::${this.context.serviceName}-compliance-logs/*`]
            }));
        }
    }
    /**
     * Apply security group rules
     */
    applySecurityGroupRules() {
        if (this.context.complianceFramework === 'commercial') {
            // Allow SSH from anywhere (not recommended for production)
            this.securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'SSH access');
        }
        else {
            // Restrict SSH to VPC only
            const vpcCidr = this.config.vpc?.vpcId ? '10.0.0.0/16' : '172.31.0.0/16';
            this.securityGroup.addIngressRule(ec2.Peer.ipv4(vpcCidr), ec2.Port.tcp(22), 'SSH access from VPC only');
        }
        // Allow HTTPS outbound for updates and package downloads
        if (this.isComplianceFramework()) {
            this.securityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS outbound');
        }
    }
    /**
     * Build user data script
     */
    buildUserData() {
        const userData = ec2.UserData.forLinux();
        // Add custom user data script if provided
        if (this.config.userData?.script) {
            userData.addCommands(this.config.userData.script);
        }
        // Add CloudWatch agent installation for compliance frameworks
        if (this.isComplianceFramework()) {
            userData.addCommands('#!/bin/bash', 'yum update -y', 'yum install -y amazon-cloudwatch-agent', 
            // Configure CloudWatch agent
            'cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << EOF', JSON.stringify({
                metrics: {
                    namespace: 'EC2/CustomMetrics',
                    metrics_collected: {
                        cpu: { measurement: ['cpu_usage_idle', 'cpu_usage_iowait'] },
                        disk: { measurement: ['used_percent'], resources: ['*'] },
                        diskio: { measurement: ['io_time'], resources: ['*'] },
                        mem: { measurement: ['mem_used_percent'] },
                        netstat: { measurement: ['tcp_established', 'tcp_time_wait'] }
                    }
                },
                logs: {
                    logs_collected: {
                        files: {
                            collect_list: [
                                {
                                    file_path: '/var/log/messages',
                                    log_group_name: `/aws/ec2/${this.context.serviceName}`,
                                    log_stream_name: '{instance_id}/messages'
                                }
                            ]
                        }
                    }
                }
            }, null, 2), 'EOF', 'systemctl enable amazon-cloudwatch-agent', 'systemctl start amazon-cloudwatch-agent');
        }
        return userData;
    }
    /**
     * Build block device mapping for EBS volumes
     */
    buildBlockDevices() {
        const devices = [];
        const rootVolumeSize = this.config.storage?.rootVolumeSize || 20;
        const encrypted = this.shouldEnableEbsEncryption();
        const volumeType = this.getEbsVolumeType();
        // Build EBS options
        const ebsOptions = {
            volumeType: volumeType,
            encrypted: !!encrypted,
            kmsKey: this.kmsKey,
            deleteOnTermination: this.config.storage?.deleteOnTermination !== false
        };
        // Add IOPS if specified and required for volume type
        if (this.config.storage?.iops && (volumeType === ec2.EbsDeviceVolumeType.IO1 || volumeType === ec2.EbsDeviceVolumeType.IO2)) {
            ebsOptions.iops = this.config.storage.iops;
        }
        devices.push({
            deviceName: '/dev/xvda',
            volume: ec2.BlockDeviceVolume.ebs(rootVolumeSize, ebsOptions)
        });
        return devices;
    }
    /**
     * Configure observability for the EC2 instance per OpenTelemetry standard
     * Creates mandatory CloudWatch alarms for operational monitoring
     */
    configureObservabilityForInstance() {
        if (!this.instance) {
            return;
        }
        // Import CloudWatch for alarm creation
        const cloudwatch = require('aws-cdk-lib/aws-cloudwatch');
        // CPU Utilization Alarm - alerts on sustained high CPU
        const cpuAlarm = new cloudwatch.Alarm(this, 'CpuUtilizationAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-cpu-high`,
            alarmDescription: `High CPU utilization for EC2 instance ${this.spec.name}`,
            metric: new cloudwatch.Metric({
                namespace: 'AWS/EC2',
                metricName: 'CPUUtilization',
                dimensionsMap: {
                    InstanceId: this.instance.instanceId
                },
                statistic: 'Average'
            }),
            threshold: 80,
            evaluationPeriods: 3,
            datapointsToAlarm: 2,
            period: cdk.Duration.minutes(5),
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // System Status Check Failed Alarm - alerts on underlying hardware issues  
        const systemCheckAlarm = new cloudwatch.Alarm(this, 'SystemStatusCheckAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-system-check-failed`,
            alarmDescription: `System status check failed for EC2 instance ${this.spec.name}`,
            metric: new cloudwatch.Metric({
                namespace: 'AWS/EC2',
                metricName: 'StatusCheckFailed_System',
                dimensionsMap: {
                    InstanceId: this.instance.instanceId
                },
                statistic: 'Maximum'
            }),
            threshold: 1,
            evaluationPeriods: 2,
            datapointsToAlarm: 1,
            period: cdk.Duration.minutes(1),
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // Instance Status Check Failed Alarm - alerts on instance-level configuration issues
        const instanceCheckAlarm = new cloudwatch.Alarm(this, 'InstanceStatusCheckAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-instance-check-failed`,
            alarmDescription: `Instance status check failed for EC2 instance ${this.spec.name}`,
            metric: new cloudwatch.Metric({
                namespace: 'AWS/EC2',
                metricName: 'StatusCheckFailed_Instance',
                dimensionsMap: {
                    InstanceId: this.instance.instanceId
                },
                statistic: 'Maximum'
            }),
            threshold: 1,
            evaluationPeriods: 2,
            datapointsToAlarm: 1,
            period: cdk.Duration.minutes(1),
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // Apply compliance-specific alarm thresholds
        if (this.context.complianceFramework?.includes('fedramp')) {
            // FedRAMP requires more aggressive monitoring
            cpuAlarm.addAlarmAction({
                bind: () => ({ alarmActionArn: `arn:aws:sns:${this.context.region}:${this.context.accountId}:fedramp-alerts` })
            });
            systemCheckAlarm.addAlarmAction({
                bind: () => ({ alarmActionArn: `arn:aws:sns:${this.context.region}:${this.context.accountId}:fedramp-alerts` })
            });
            instanceCheckAlarm.addAlarmAction({
                bind: () => ({ alarmActionArn: `arn:aws:sns:${this.context.region}:${this.context.accountId}:fedramp-alerts` })
            });
        }
        // Register alarms as constructs for visibility
        this.registerConstruct('cpuAlarm', cpuAlarm);
        this.registerConstruct('systemCheckAlarm', systemCheckAlarm);
        this.registerConstruct('instanceCheckAlarm', instanceCheckAlarm);
        this.logComponentEvent('observability_configured', `Configured ${3} CloudWatch alarms for ${this.context.complianceFramework} compliance`);
    }
    /**
     * Apply instance tags using base class standard tags + EC2-specific compliance tags
     */
    applyInstanceTags() {
        if (this.instance) {
            // Build EC2-specific compliance tags
            const complianceTags = {};
            if (this.context.complianceFramework === 'fedramp-high') {
                complianceTags['ImmutableInfrastructure'] = 'true';
                complianceTags['STIGCompliant'] = 'true';
            }
            else if (this.context.complianceFramework === 'fedramp-moderate') {
                complianceTags['STIGCompliant'] = 'true';
            }
            // Apply standard platform tags + EC2-specific compliance tags in one call
            this.applyStandardTags(this.instance, complianceTags);
        }
    }
    /**
     * Build instance capability data shape
     */
    buildInstanceCapability() {
        return {
            instanceId: this.instance.instanceId,
            privateIp: this.instance.instancePrivateIp,
            publicIp: this.instance.instancePublicIp,
            roleArn: this.role.roleArn,
            securityGroupId: this.securityGroup.securityGroupId,
            availabilityZone: this.instance.instanceAvailabilityZone
        };
    }
    /**
     * Validate instance type
     */
    validateInstanceType(instanceType) {
        const validInstanceTypePattern = /^[a-z][0-9]+[a-z]*\.(nano|micro|small|medium|large|xlarge|[0-9]+xlarge)$/;
        if (!validInstanceTypePattern.test(instanceType)) {
            throw new Error(`Invalid instance type: ${instanceType}. Must be in format like 't3.micro', 'm5.large', etc.`);
        }
    }
    /**
     * Helper methods for compliance decisions
     */
    shouldUseCustomerManagedKey() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    shouldEnableEbsEncryption() {
        // Config has already been built through proper precedence chain
        return this.config?.storage?.encrypted ?? false;
    }
    shouldEnableDetailedMonitoring() {
        // Config has already been built through proper precedence chain
        return this.config?.monitoring?.detailed ?? false;
    }
    shouldRequireImdsv2() {
        // Config has already been built through proper precedence chain:
        // Platform Defaults → Compliance Framework → Environment → Service-Level → Component Overrides
        return this.config?.security?.requireImdsv2 ?? false;
    }
    isComplianceFramework() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    getInstanceAmi() {
        if (this.config.ami?.amiId) {
            const amiMap = {};
            amiMap[this.context.region || 'us-east-1'] = this.config.ami.amiId;
            return ec2.MachineImage.genericLinux(amiMap);
        }
        // Use latest Amazon Linux 2023
        return ec2.MachineImage.latestAmazonLinux2023();
    }
    getVpcSubnets() {
        if (this.config.vpc?.subnetId) {
            return { subnetFilters: [ec2.SubnetFilter.byIds([this.config.vpc.subnetId])] };
        }
        // Use private subnets for compliance frameworks
        return {
            subnetType: this.isComplianceFramework() ?
                ec2.SubnetType.PRIVATE_WITH_EGRESS : ec2.SubnetType.PUBLIC
        };
    }
    getEbsVolumeType() {
        const volumeType = this.config.storage?.rootVolumeType || 'gp3';
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
}
exports.Ec2InstanceComponent = Ec2InstanceComponent;
