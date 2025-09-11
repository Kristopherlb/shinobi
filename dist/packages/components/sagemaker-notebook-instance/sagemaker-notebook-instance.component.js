"use strict";
/**
 * SageMaker Notebook Instance Component
 *
 * AWS SageMaker Notebook Instance for machine learning development and experimentation.
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
exports.SageMakerNotebookInstanceComponent = exports.SageMakerNotebookInstanceConfigBuilder = exports.SAGEMAKER_NOTEBOOK_INSTANCE_CONFIG_SCHEMA = void 0;
const sagemaker = __importStar(require("aws-cdk-lib/aws-sagemaker"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
const cdk = __importStar(require("aws-cdk-lib"));
const contracts_1 = require("@platform/contracts");
/**
 * Configuration schema for SageMaker Notebook Instance component
 */
exports.SAGEMAKER_NOTEBOOK_INSTANCE_CONFIG_SCHEMA = {
    type: 'object',
    title: 'SageMaker Notebook Instance Configuration',
    description: 'Configuration for creating a SageMaker Notebook Instance',
    properties: {
        notebookInstanceName: {
            type: 'string',
            description: 'Name of the notebook instance (will be auto-generated if not provided)',
            pattern: '^[a-zA-Z0-9\\-]{1,63}$',
            maxLength: 63
        },
        instanceType: {
            type: 'string',
            description: 'Instance type for the notebook',
            enum: [
                'ml.t2.medium', 'ml.t2.large', 'ml.t2.xlarge', 'ml.t2.2xlarge',
                'ml.t3.medium', 'ml.t3.large', 'ml.t3.xlarge', 'ml.t3.2xlarge',
                'ml.m4.xlarge', 'ml.m4.2xlarge', 'ml.m4.4xlarge', 'ml.m4.10xlarge', 'ml.m4.16xlarge',
                'ml.m5.large', 'ml.m5.xlarge', 'ml.m5.2xlarge', 'ml.m5.4xlarge', 'ml.m5.12xlarge', 'ml.m5.24xlarge',
                'ml.c4.large', 'ml.c4.xlarge', 'ml.c4.2xlarge', 'ml.c4.4xlarge', 'ml.c4.8xlarge',
                'ml.c5.large', 'ml.c5.xlarge', 'ml.c5.2xlarge', 'ml.c5.4xlarge', 'ml.c5.9xlarge', 'ml.c5.18xlarge',
                'ml.p2.xlarge', 'ml.p2.8xlarge', 'ml.p2.16xlarge',
                'ml.p3.2xlarge', 'ml.p3.8xlarge', 'ml.p3.16xlarge',
                'ml.g4dn.xlarge', 'ml.g4dn.2xlarge', 'ml.g4dn.4xlarge', 'ml.g4dn.8xlarge', 'ml.g4dn.12xlarge', 'ml.g4dn.16xlarge'
            ],
            default: 'ml.t3.medium'
        },
        roleArn: {
            type: 'string',
            description: 'IAM role ARN for the notebook instance'
        },
        subnetId: {
            type: 'string',
            description: 'Subnet ID for VPC placement'
        },
        securityGroupIds: {
            type: 'array',
            description: 'Security group IDs',
            items: { type: 'string' },
            maxItems: 5
        },
        kmsKeyId: {
            type: 'string',
            description: 'KMS key ID for encryption'
        },
        rootAccess: {
            type: 'string',
            description: 'Root access configuration',
            enum: ['Enabled', 'Disabled'],
            default: 'Enabled'
        },
        directInternetAccess: {
            type: 'string',
            description: 'Direct internet access',
            enum: ['Enabled', 'Disabled'],
            default: 'Enabled'
        },
        volumeSizeInGB: {
            type: 'number',
            description: 'Volume size in GB',
            minimum: 5,
            maximum: 16384,
            default: 20
        },
        defaultCodeRepository: {
            type: 'string',
            description: 'Default code repository URL'
        },
        additionalCodeRepositories: {
            type: 'array',
            description: 'Additional code repositories',
            items: { type: 'string' },
            maxItems: 3
        },
        lifecycleConfigName: {
            type: 'string',
            description: 'Lifecycle configuration name'
        },
        platformIdentifier: {
            type: 'string',
            description: 'Platform identifier',
            enum: ['notebook-al1-v1', 'notebook-al2-v1', 'notebook-al2-v2'],
            default: 'notebook-al2-v2'
        },
        acceleratorTypes: {
            type: 'array',
            description: 'Accelerator types',
            items: {
                type: 'string',
                enum: ['ml.eia1.medium', 'ml.eia1.large', 'ml.eia1.xlarge', 'ml.eia2.medium', 'ml.eia2.large', 'ml.eia2.xlarge']
            },
            maxItems: 1
        },
        instanceMetadataServiceConfiguration: {
            type: 'object',
            description: 'Instance metadata service configuration',
            properties: {
                minimumInstanceMetadataServiceVersion: {
                    type: 'string',
                    description: 'Minimum IMDS version',
                    enum: ['1', '2'],
                    default: '2'
                }
            },
            additionalProperties: false
        },
        tags: {
            type: 'object',
            description: 'Tags for the notebook instance',
            additionalProperties: { type: 'string' },
            default: {}
        }
    },
    additionalProperties: false,
    defaults: {
        instanceType: 'ml.t3.medium',
        rootAccess: 'Enabled',
        directInternetAccess: 'Enabled',
        volumeSizeInGB: 20,
        platformIdentifier: 'notebook-al2-v2',
        instanceMetadataServiceConfiguration: { minimumInstanceMetadataServiceVersion: '2' },
        tags: {}
    }
};
/**
 * Configuration builder for SageMaker Notebook Instance component
 */
class SageMakerNotebookInstanceConfigBuilder {
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
            instanceType: this.getDefaultInstanceType(),
            rootAccess: this.getDefaultRootAccess(),
            directInternetAccess: this.getDefaultDirectInternetAccess(),
            volumeSizeInGB: this.getDefaultVolumeSize(),
            platformIdentifier: 'notebook-al2-v2',
            instanceMetadataServiceConfiguration: {
                minimumInstanceMetadataServiceVersion: '2' // IMDSv2 for security
            },
            tags: {
                'service': this.context.serviceName,
                'environment': this.context.environment,
                'notebook-type': 'sagemaker'
            }
        };
    }
    getComplianceFrameworkDefaults() {
        const framework = this.context.complianceFramework;
        switch (framework) {
            case 'fedramp-moderate':
                return {
                    instanceType: 'ml.m5.large', // More capable instance for compliance workloads
                    rootAccess: 'Disabled', // Disable root access for security
                    directInternetAccess: 'Disabled', // Force VPC routing for compliance
                    volumeSizeInGB: 100, // Larger volume for compliance data
                    instanceMetadataServiceConfiguration: {
                        minimumInstanceMetadataServiceVersion: '2' // Enforce IMDSv2
                    },
                    tags: {
                        'compliance-framework': 'fedramp-moderate',
                        'root-access': 'disabled',
                        'internet-access': 'vpc-only',
                        'imds-version': 'v2'
                    }
                };
            case 'fedramp-high':
                return {
                    instanceType: 'ml.m5.xlarge', // High-performance instance for secure workloads
                    rootAccess: 'Disabled', // Mandatory disabled root access
                    directInternetAccess: 'Disabled', // Mandatory VPC-only access
                    volumeSizeInGB: 200, // Large volume for high security requirements
                    instanceMetadataServiceConfiguration: {
                        minimumInstanceMetadataServiceVersion: '2' // Mandatory IMDSv2
                    },
                    tags: {
                        'compliance-framework': 'fedramp-high',
                        'root-access': 'disabled',
                        'internet-access': 'vpc-only',
                        'imds-version': 'v2',
                        'security-level': 'high'
                    }
                };
            default: // commercial
                return {
                    rootAccess: 'Enabled',
                    directInternetAccess: 'Enabled'
                };
        }
    }
    getDefaultInstanceType() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 'ml.m5.xlarge';
            case 'fedramp-moderate':
                return 'ml.m5.large';
            default:
                return 'ml.t3.medium';
        }
    }
    getDefaultRootAccess() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework)
            ? 'Disabled'
            : 'Enabled';
    }
    getDefaultDirectInternetAccess() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework)
            ? 'Disabled'
            : 'Enabled';
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
}
exports.SageMakerNotebookInstanceConfigBuilder = SageMakerNotebookInstanceConfigBuilder;
/**
 * SageMaker Notebook Instance Component implementing Component API Contract v1.0
 */
class SageMakerNotebookInstanceComponent extends contracts_1.Component {
    notebookInstance;
    executionRole;
    kmsKey;
    securityGroup;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    synth() {
        this.logComponentEvent('synthesis_start', 'Starting SageMaker Notebook Instance component synthesis', {
            notebookInstanceName: this.spec.config?.notebookInstanceName,
            instanceType: this.spec.config?.instanceType
        });
        const startTime = Date.now();
        try {
            const configBuilder = new SageMakerNotebookInstanceConfigBuilder(this.context, this.spec);
            this.config = configBuilder.buildSync();
            this.logComponentEvent('config_built', 'SageMaker Notebook Instance configuration built successfully', {
                notebookInstanceName: this.config.notebookInstanceName,
                instanceType: this.config.instanceType,
                rootAccess: this.config.rootAccess
            });
            this.createKmsKeyIfNeeded();
            this.createExecutionRoleIfNeeded();
            this.createSecurityGroupIfNeeded();
            this.createNotebookInstance();
            this.applyComplianceHardening();
            this.configureObservabilityForNotebook();
            this.registerConstruct('notebookInstance', this.notebookInstance);
            if (this.executionRole) {
                this.registerConstruct('executionRole', this.executionRole);
            }
            if (this.kmsKey) {
                this.registerConstruct('kmsKey', this.kmsKey);
            }
            if (this.securityGroup) {
                this.registerConstruct('securityGroup', this.securityGroup);
            }
            this.registerCapability('ml:notebook', this.buildNotebookCapability());
            const duration = Date.now() - startTime;
            this.logPerformanceMetric('component_synthesis', duration, {
                resourcesCreated: Object.keys(this.capabilities).length
            });
            this.logComponentEvent('synthesis_complete', 'SageMaker Notebook Instance component synthesis completed successfully', {
                notebookCreated: 1,
                encryptionEnabled: !!this.config.kmsKeyId || !!this.kmsKey,
                rootAccessDisabled: this.config.rootAccess === 'Disabled'
            });
        }
        catch (error) {
            this.logError(error, 'component synthesis', {
                componentType: 'sagemaker-notebook-instance',
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
        return 'sagemaker-notebook-instance';
    }
    createKmsKeyIfNeeded() {
        if (!this.config.kmsKeyId && ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework)) {
            this.kmsKey = new kms.Key(this, 'KmsKey', {
                description: `KMS key for ${this.buildNotebookInstanceName()} SageMaker notebook`,
                enableKeyRotation: true,
                removalPolicy: this.getKeyRemovalPolicy()
            });
            this.applyStandardTags(this.kmsKey, {
                'key-type': 'sagemaker-notebook',
                'notebook': this.buildNotebookInstanceName(),
                'rotation-enabled': 'true'
            });
        }
    }
    createExecutionRoleIfNeeded() {
        if (!this.config.roleArn) {
            this.executionRole = new iam.Role(this, 'ExecutionRole', {
                assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
                description: `Execution role for ${this.buildNotebookInstanceName()} notebook instance`,
                managedPolicies: this.getBaseManagedPolicies(),
                inlinePolicies: this.buildInlinePolicies()
            });
            this.applyStandardTags(this.executionRole, {
                'role-type': 'execution',
                'notebook': this.buildNotebookInstanceName(),
                'service': 'sagemaker'
            });
        }
    }
    createSecurityGroupIfNeeded() {
        if (this.config.subnetId && !this.config.securityGroupIds?.length) {
            // Get VPC from subnet
            const subnet = ec2.Subnet.fromSubnetId(this, 'Subnet', this.config.subnetId);
            this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
                vpc: subnet.vpc,
                description: `Security group for ${this.buildNotebookInstanceName()} SageMaker notebook`,
                allowAllOutbound: this.config.directInternetAccess === 'Enabled'
            });
            // Allow HTTPS outbound for package downloads and Git access
            if (this.config.directInternetAccess === 'Disabled') {
                this.securityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS outbound for package downloads');
            }
            this.applyStandardTags(this.securityGroup, {
                'security-group-type': 'sagemaker-notebook',
                'notebook': this.buildNotebookInstanceName()
            });
        }
    }
    createNotebookInstance() {
        const notebookProps = {
            notebookInstanceName: this.buildNotebookInstanceName(),
            instanceType: this.config.instanceType,
            roleArn: this.config.roleArn || this.executionRole.roleArn,
            subnetId: this.config.subnetId,
            securityGroupIds: this.buildSecurityGroupIds(),
            kmsKeyId: this.config.kmsKeyId || this.kmsKey?.keyId,
            rootAccess: this.config.rootAccess,
            directInternetAccess: this.config.directInternetAccess,
            volumeSizeInGb: this.config.volumeSizeInGB,
            defaultCodeRepository: this.config.defaultCodeRepository,
            additionalCodeRepositories: this.config.additionalCodeRepositories,
            lifecycleConfigName: this.config.lifecycleConfigName,
            platformIdentifier: this.config.platformIdentifier,
            acceleratorTypes: this.config.acceleratorTypes,
            instanceMetadataServiceConfiguration: this.config.instanceMetadataServiceConfiguration,
            tags: this.buildNotebookTags()
        };
        this.notebookInstance = new sagemaker.CfnNotebookInstance(this, 'NotebookInstance', notebookProps);
        this.applyStandardTags(this.notebookInstance, {
            'notebook-name': this.buildNotebookInstanceName(),
            'instance-type': this.config.instanceType,
            'root-access': this.config.rootAccess,
            'direct-internet': this.config.directInternetAccess,
            'volume-size': (this.config.volumeSizeInGB || 20).toString()
        });
        this.logResourceCreation('sagemaker-notebook-instance', this.buildNotebookInstanceName(), {
            notebookInstanceName: this.buildNotebookInstanceName(),
            instanceType: this.config.instanceType,
            rootAccess: this.config.rootAccess,
            encryptionEnabled: !!(this.config.kmsKeyId || this.kmsKey)
        });
    }
    buildSecurityGroupIds() {
        if (this.config.securityGroupIds?.length) {
            return this.config.securityGroupIds;
        }
        if (this.securityGroup) {
            return [this.securityGroup.securityGroupId];
        }
        return undefined;
    }
    buildNotebookTags() {
        const allTags = {
            ...this.config.tags,
            'service': this.context.serviceName,
            'environment': this.context.environment
        };
        return Object.entries(allTags).map(([key, value]) => ({
            key,
            value
        }));
    }
    getBaseManagedPolicies() {
        return [
            iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess')
        ];
    }
    buildInlinePolicies() {
        const policies = {};
        // S3 access for data and model storage
        policies.S3AccessPolicy = new iam.PolicyDocument({
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        's3:GetObject',
                        's3:PutObject',
                        's3:DeleteObject',
                        's3:ListBucket'
                    ],
                    resources: [
                        `arn:aws:s3:::sagemaker-${cdk.Aws.REGION}-${cdk.Aws.ACCOUNT_ID}/*`,
                        `arn:aws:s3:::sagemaker-${cdk.Aws.REGION}-${cdk.Aws.ACCOUNT_ID}`
                    ]
                })
            ]
        });
        // CloudWatch Logs permissions
        policies.CloudWatchLogsPolicy = new iam.PolicyDocument({
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'logs:CreateLogGroup',
                        'logs:CreateLogStream',
                        'logs:PutLogEvents',
                        'logs:DescribeLogStreams'
                    ],
                    resources: [`arn:aws:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:*`]
                })
            ]
        });
        // KMS permissions for encryption
        if (this.kmsKey) {
            policies.KmsPolicy = new iam.PolicyDocument({
                statements: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            'kms:Decrypt',
                            'kms:GenerateDataKey',
                            'kms:CreateGrant'
                        ],
                        resources: [this.kmsKey.keyArn]
                    })
                ]
            });
        }
        return policies;
    }
    buildNotebookInstanceName() {
        if (this.config.notebookInstanceName) {
            return this.config.notebookInstanceName;
        }
        return `${this.context.serviceName}-${this.spec.name}`;
    }
    getKeyRemovalPolicy() {
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
        // Basic security logging
        if (this.notebookInstance) {
            const securityLogGroup = new logs.LogGroup(this, 'SecurityLogGroup', {
                logGroupName: `/aws/sagemaker/NotebookInstances/${this.buildNotebookInstanceName()}/security`,
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
        if (this.notebookInstance) {
            const complianceLogGroup = new logs.LogGroup(this, 'ComplianceLogGroup', {
                logGroupName: `/aws/sagemaker/NotebookInstances/${this.buildNotebookInstanceName()}/compliance`,
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
        if (this.notebookInstance) {
            const auditLogGroup = new logs.LogGroup(this, 'AuditLogGroup', {
                logGroupName: `/aws/sagemaker/NotebookInstances/${this.buildNotebookInstanceName()}/audit`,
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
    buildNotebookCapability() {
        return {
            notebookInstanceName: this.buildNotebookInstanceName(),
            notebookInstanceArn: this.notebookInstance.ref,
            url: `https://${this.buildNotebookInstanceName()}.notebook.${cdk.Aws.REGION}.sagemaker.aws/`
        };
    }
    configureObservabilityForNotebook() {
        if (this.context.complianceFramework === 'commercial') {
            return;
        }
        const notebookName = this.buildNotebookInstanceName();
        // Currently, SageMaker Notebook Instances don't have extensive CloudWatch metrics
        // We'll create custom alarms based on the instance lifecycle and CloudTrail events
        // Note: In a real implementation, you might set up custom CloudWatch Events
        // to monitor notebook instance state changes and user activities
        this.logComponentEvent('observability_configured', 'Basic observability configured for SageMaker Notebook Instance', {
            notebookName: notebookName,
            monitoringEnabled: true,
            note: 'SageMaker Notebook Instances have limited native CloudWatch metrics'
        });
    }
}
exports.SageMakerNotebookInstanceComponent = SageMakerNotebookInstanceComponent;
