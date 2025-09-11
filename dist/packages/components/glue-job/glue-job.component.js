"use strict";
/**
 * Glue Job Component
 *
 * AWS Glue Job for serverless ETL data processing workflows.
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
exports.GlueJobComponent = exports.GlueJobConfigBuilder = exports.GLUE_JOB_CONFIG_SCHEMA = void 0;
const glue = __importStar(require("aws-cdk-lib/aws-glue"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
const cdk = __importStar(require("aws-cdk-lib"));
const contracts_1 = require("@platform/contracts");
/**
 * Configuration schema for Glue Job component
 */
exports.GLUE_JOB_CONFIG_SCHEMA = {
    type: 'object',
    title: 'Glue Job Configuration',
    description: 'Configuration for creating a Glue ETL Job',
    properties: {
        jobName: {
            type: 'string',
            description: 'Name of the Glue job (will be auto-generated if not provided)',
            pattern: '^[a-zA-Z0-9_-]+$',
            maxLength: 255
        },
        description: {
            type: 'string',
            description: 'Description of the Glue job',
            maxLength: 2048
        },
        glueVersion: {
            type: 'string',
            description: 'Glue version',
            enum: ['1.0', '2.0', '3.0', '4.0'],
            default: '4.0'
        },
        jobType: {
            type: 'string',
            description: 'Type of Glue job',
            enum: ['glueetl', 'gluestreaming', 'pythonshell', 'glueray'],
            default: 'glueetl'
        },
        roleArn: {
            type: 'string',
            description: 'IAM role ARN for the Glue job'
        },
        scriptLocation: {
            type: 'string',
            description: 'S3 location of the ETL script'
        },
        command: {
            type: 'object',
            description: 'Command configuration',
            properties: {
                pythonVersion: {
                    type: 'string',
                    description: 'Python version',
                    enum: ['2', '3', '3.6', '3.7', '3.9'],
                    default: '3'
                },
                scriptArguments: {
                    type: 'object',
                    description: 'Script arguments',
                    additionalProperties: { type: 'string' },
                    default: {}
                }
            },
            additionalProperties: false
        },
        connections: {
            type: 'array',
            description: 'Connection names',
            items: { type: 'string' },
            maxItems: 10
        },
        maxConcurrentRuns: {
            type: 'number',
            description: 'Maximum concurrent runs',
            minimum: 1,
            maximum: 1000,
            default: 1
        },
        maxRetries: {
            type: 'number',
            description: 'Maximum retries',
            minimum: 0,
            maximum: 10,
            default: 0
        },
        timeout: {
            type: 'number',
            description: 'Timeout in minutes',
            minimum: 1,
            maximum: 2880,
            default: 2880
        },
        notificationProperty: {
            type: 'object',
            description: 'Notification configuration',
            properties: {
                notifyDelayAfter: {
                    type: 'number',
                    description: 'Notify delay after in minutes',
                    minimum: 1,
                    default: 60
                }
            },
            additionalProperties: false
        },
        executionProperty: {
            type: 'object',
            description: 'Execution configuration',
            properties: {
                maxConcurrentRuns: {
                    type: 'number',
                    description: 'Maximum parallel capacity units',
                    minimum: 1,
                    maximum: 1000,
                    default: 1
                }
            },
            additionalProperties: false
        },
        workerConfiguration: {
            type: 'object',
            description: 'Worker configuration',
            properties: {
                workerType: {
                    type: 'string',
                    description: 'Worker type',
                    enum: ['Standard', 'G.1X', 'G.2X', 'G.4X', 'G.8X', 'Z.2X'],
                    default: 'G.1X'
                },
                numberOfWorkers: {
                    type: 'number',
                    description: 'Number of workers',
                    minimum: 2,
                    maximum: 299,
                    default: 10
                }
            },
            additionalProperties: false,
            default: { workerType: 'G.1X', numberOfWorkers: 10 }
        },
        securityConfiguration: {
            type: 'string',
            description: 'Security configuration name'
        },
        defaultArguments: {
            type: 'object',
            description: 'Default arguments',
            additionalProperties: { type: 'string' },
            default: {}
        },
        nonOverridableArguments: {
            type: 'object',
            description: 'Non-overridable arguments',
            additionalProperties: { type: 'string' },
            default: {}
        },
        tags: {
            type: 'object',
            description: 'Tags for the job',
            additionalProperties: { type: 'string' },
            default: {}
        }
    },
    additionalProperties: false,
    required: ['scriptLocation'],
    defaults: {
        glueVersion: '4.0',
        jobType: 'glueetl',
        maxConcurrentRuns: 1,
        maxRetries: 0,
        timeout: 2880,
        workerConfiguration: { workerType: 'G.1X', numberOfWorkers: 10 },
        defaultArguments: {},
        nonOverridableArguments: {},
        tags: {}
    }
};
/**
 * Configuration builder for Glue Job component
 */
class GlueJobConfigBuilder {
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
            glueVersion: '4.0',
            jobType: 'glueetl',
            command: {
                pythonVersion: '3'
            },
            maxConcurrentRuns: this.getDefaultMaxConcurrentRuns(),
            maxRetries: this.getDefaultMaxRetries(),
            timeout: this.getDefaultTimeout(),
            workerConfiguration: this.getDefaultWorkerConfiguration(),
            defaultArguments: this.getDefaultArguments(),
            tags: {
                'service': this.context.serviceName,
                'environment': this.context.environment,
                'job-type': 'glue-etl'
            }
        };
    }
    getComplianceFrameworkDefaults() {
        const framework = this.context.complianceFramework;
        switch (framework) {
            case 'fedramp-moderate':
                return {
                    glueVersion: '4.0', // Latest version for security
                    maxRetries: 3, // Allow retries for reliability
                    timeout: 1440, // 24 hour timeout for large datasets
                    workerConfiguration: {
                        workerType: 'G.2X', // More powerful workers for compliance workloads
                        numberOfWorkers: 20 // Higher parallelism
                    },
                    defaultArguments: {
                        ...this.getDefaultArguments(),
                        '--enable-continuous-cloudwatch-log': 'true', // Enhanced logging
                        '--enable-metrics': 'true', // Performance metrics
                        '--enable-spark-ui': 'true' // UI for monitoring
                    },
                    tags: {
                        'compliance-framework': 'fedramp-moderate',
                        'logging': 'comprehensive',
                        'monitoring': 'enabled'
                    }
                };
            case 'fedramp-high':
                return {
                    glueVersion: '4.0', // Latest version mandatory
                    maxRetries: 5, // Higher retry count for reliability
                    timeout: 720, // 12 hour timeout for security
                    workerConfiguration: {
                        workerType: 'G.4X', // High-performance workers
                        numberOfWorkers: 50 // Maximum parallelism for large-scale processing
                    },
                    defaultArguments: {
                        ...this.getDefaultArguments(),
                        '--enable-continuous-cloudwatch-log': 'true', // Mandatory comprehensive logging
                        '--enable-metrics': 'true', // Performance metrics mandatory
                        '--enable-spark-ui': 'true', // UI monitoring required
                        '--enable-auto-scaling': 'true' // Auto-scaling for efficiency
                    },
                    tags: {
                        'compliance-framework': 'fedramp-high',
                        'logging': 'comprehensive',
                        'monitoring': 'enabled',
                        'security-level': 'high'
                    }
                };
            default: // commercial
                return {
                    maxRetries: 0,
                    timeout: 2880, // 48 hours default
                    workerConfiguration: {
                        workerType: 'G.1X',
                        numberOfWorkers: 10
                    }
                };
        }
    }
    getDefaultMaxConcurrentRuns() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 5; // Higher concurrency for large-scale processing
            case 'fedramp-moderate':
                return 3;
            default:
                return 1;
        }
    }
    getDefaultMaxRetries() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 5;
            case 'fedramp-moderate':
                return 3;
            default:
                return 0;
        }
    }
    getDefaultTimeout() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 720; // 12 hours for high security
            case 'fedramp-moderate':
                return 1440; // 24 hours for moderate compliance
            default:
                return 2880; // 48 hours for commercial
        }
    }
    getDefaultWorkerConfiguration() {
        const framework = this.context.complianceFramework;
        switch (framework) {
            case 'fedramp-high':
                return { workerType: 'G.4X', numberOfWorkers: 50 };
            case 'fedramp-moderate':
                return { workerType: 'G.2X', numberOfWorkers: 20 };
            default:
                return { workerType: 'G.1X', numberOfWorkers: 10 };
        }
    }
    getDefaultArguments() {
        const framework = this.context.complianceFramework;
        const baseArgs = {
            '--TempDir': `s3://aws-glue-temporary-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}/`,
            '--job-bookmark-option': 'job-bookmark-enable',
            '--enable-glue-datacatalog': 'true'
        };
        if (['fedramp-moderate', 'fedramp-high'].includes(framework)) {
            return {
                ...baseArgs,
                '--enable-continuous-cloudwatch-log': 'true',
                '--enable-metrics': 'true',
                '--enable-spark-ui': 'true'
            };
        }
        return baseArgs;
    }
}
exports.GlueJobConfigBuilder = GlueJobConfigBuilder;
/**
 * Glue Job Component implementing Component API Contract v1.0
 */
class GlueJobComponent extends contracts_1.Component {
    glueJob;
    executionRole;
    securityConfiguration;
    kmsKey;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    synth() {
        this.logComponentEvent('synthesis_start', 'Starting Glue Job component synthesis', {
            jobName: this.spec.config?.jobName,
            jobType: this.spec.config?.jobType
        });
        const startTime = Date.now();
        try {
            const configBuilder = new GlueJobConfigBuilder(this.context, this.spec);
            this.config = configBuilder.buildSync();
            this.logComponentEvent('config_built', 'Glue Job configuration built successfully', {
                jobName: this.config.jobName,
                jobType: this.config.jobType,
                workerType: this.config.workerConfiguration?.workerType
            });
            this.createKmsKeyIfNeeded();
            this.createSecurityConfigurationIfNeeded();
            this.createExecutionRoleIfNeeded();
            this.createGlueJob();
            this.applyComplianceHardening();
            this.configureObservabilityForJob();
            this.registerConstruct('glueJob', this.glueJob);
            if (this.executionRole) {
                this.registerConstruct('executionRole', this.executionRole);
            }
            if (this.securityConfiguration) {
                this.registerConstruct('securityConfiguration', this.securityConfiguration);
            }
            if (this.kmsKey) {
                this.registerConstruct('kmsKey', this.kmsKey);
            }
            this.registerCapability('etl:glue-job', this.buildJobCapability());
            const duration = Date.now() - startTime;
            this.logPerformanceMetric('component_synthesis', duration, {
                resourcesCreated: Object.keys(this.capabilities).length
            });
            this.logComponentEvent('synthesis_complete', 'Glue Job component synthesis completed successfully', {
                jobCreated: 1,
                encryptionEnabled: !!this.securityConfiguration,
                monitoringEnabled: !!this.config.defaultArguments?.['--enable-metrics']
            });
        }
        catch (error) {
            this.logError(error, 'component synthesis', {
                componentType: 'glue-job',
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
        return 'glue-job';
    }
    createKmsKeyIfNeeded() {
        if (['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework)) {
            this.kmsKey = new kms.Key(this, 'KmsKey', {
                description: `KMS key for ${this.buildJobName()} Glue job encryption`,
                enableKeyRotation: true,
                removalPolicy: this.getKeyRemovalPolicy()
            });
            this.applyStandardTags(this.kmsKey, {
                'key-type': 'glue-job',
                'job': this.buildJobName(),
                'rotation-enabled': 'true'
            });
        }
    }
    createSecurityConfigurationIfNeeded() {
        if (this.kmsKey && !this.config.securityConfiguration) {
            this.securityConfiguration = new glue.CfnSecurityConfiguration(this, 'SecurityConfiguration', {
                name: `${this.buildJobName()}-security-config`,
                encryptionConfiguration: {
                    cloudWatchEncryption: {
                        cloudWatchEncryptionMode: 'SSE-KMS',
                        kmsKeyArn: this.kmsKey.keyArn
                    },
                    jobBookmarksEncryption: {
                        jobBookmarksEncryptionMode: 'SSE-KMS',
                        kmsKeyArn: this.kmsKey.keyArn
                    },
                    s3Encryptions: [{
                            s3EncryptionMode: 'SSE-KMS',
                            kmsKeyArn: this.kmsKey.keyArn
                        }]
                }
            });
            this.applyStandardTags(this.securityConfiguration, {
                'config-type': 'security',
                'job': this.buildJobName(),
                'encryption': 'kms'
            });
        }
    }
    createExecutionRoleIfNeeded() {
        if (!this.config.roleArn) {
            this.executionRole = new iam.Role(this, 'ExecutionRole', {
                assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
                description: `Execution role for ${this.buildJobName()} Glue job`,
                managedPolicies: this.getBaseManagedPolicies(),
                inlinePolicies: this.buildInlinePolicies()
            });
            this.applyStandardTags(this.executionRole, {
                'role-type': 'execution',
                'job': this.buildJobName(),
                'service': 'glue'
            });
        }
    }
    createGlueJob() {
        const jobProps = {
            name: this.buildJobName(),
            description: this.config.description,
            glueVersion: this.config.glueVersion,
            role: this.config.roleArn || this.executionRole.roleArn,
            command: {
                name: this.config.jobType,
                scriptLocation: this.config.scriptLocation,
                pythonVersion: this.config.command?.pythonVersion
            },
            connections: this.config.connections ? {
                connections: this.config.connections
            } : undefined,
            maxConcurrentRuns: this.config.maxConcurrentRuns,
            maxRetries: this.config.maxRetries,
            timeout: this.config.timeout,
            notificationProperty: this.config.notificationProperty,
            executionProperty: this.config.executionProperty,
            workerType: this.config.workerConfiguration?.workerType,
            numberOfWorkers: this.config.workerConfiguration?.numberOfWorkers,
            securityConfiguration: this.config.securityConfiguration || this.securityConfiguration?.name,
            defaultArguments: this.config.defaultArguments,
            nonOverridableArguments: this.config.nonOverridableArguments,
            tags: this.buildJobTags()
        };
        this.glueJob = new glue.CfnJob(this, 'Job', jobProps);
        this.applyStandardTags(this.glueJob, {
            'job-name': this.buildJobName(),
            'job-type': this.config.jobType,
            'glue-version': this.config.glueVersion,
            'worker-type': this.config.workerConfiguration?.workerType,
            'worker-count': (this.config.workerConfiguration?.numberOfWorkers || 10).toString()
        });
        this.logResourceCreation('glue-job', this.buildJobName(), {
            jobName: this.buildJobName(),
            jobType: this.config.jobType,
            glueVersion: this.config.glueVersion,
            encryptionEnabled: !!this.securityConfiguration
        });
    }
    buildJobTags() {
        if (!this.config.tags || Object.keys(this.config.tags).length === 0) {
            return undefined;
        }
        return this.config.tags;
    }
    getBaseManagedPolicies() {
        return [
            iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole')
        ];
    }
    buildInlinePolicies() {
        const policies = {};
        // S3 access for scripts and data
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
                        `arn:aws:s3:::aws-glue-*`,
                        `arn:aws:s3:::aws-glue-*/*`
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
                        'logs:PutLogEvents'
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
    buildJobName() {
        if (this.config.jobName) {
            return this.config.jobName;
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
        if (this.glueJob) {
            const securityLogGroup = new logs.LogGroup(this, 'SecurityLogGroup', {
                logGroupName: `/aws/glue/jobs/${this.buildJobName()}/security`,
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
        if (this.glueJob) {
            const complianceLogGroup = new logs.LogGroup(this, 'ComplianceLogGroup', {
                logGroupName: `/aws/glue/jobs/${this.buildJobName()}/compliance`,
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
        if (this.glueJob) {
            const auditLogGroup = new logs.LogGroup(this, 'AuditLogGroup', {
                logGroupName: `/aws/glue/jobs/${this.buildJobName()}/audit`,
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
    buildJobCapability() {
        return {
            jobName: this.buildJobName(),
            jobArn: `arn:aws:glue:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:job/${this.buildJobName()}`
        };
    }
    configureObservabilityForJob() {
        if (this.context.complianceFramework === 'commercial') {
            return;
        }
        const jobName = this.buildJobName();
        // 1. Job Failure Alarm
        const jobFailureAlarm = new cloudwatch.Alarm(this, 'JobFailureAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-job-failure`,
            alarmDescription: 'Glue job failure alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/Glue',
                metricName: 'glue.driver.aggregate.numFailedTasks',
                dimensionsMap: {
                    JobName: jobName,
                    JobRunId: 'ALL'
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 1,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        this.applyStandardTags(jobFailureAlarm, {
            'alarm-type': 'job-failure',
            'metric-type': 'reliability',
            'threshold': '1'
        });
        // 2. Job Duration Alarm
        const jobDurationAlarm = new cloudwatch.Alarm(this, 'JobDurationAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-long-duration`,
            alarmDescription: 'Glue job long duration alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/Glue',
                metricName: 'glue.driver.aggregate.elapsedTime',
                dimensionsMap: {
                    JobName: jobName,
                    JobRunId: 'ALL'
                },
                statistic: 'Maximum',
                period: cdk.Duration.minutes(15)
            }),
            threshold: 3600000, // 1 hour in milliseconds
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        this.applyStandardTags(jobDurationAlarm, {
            'alarm-type': 'long-duration',
            'metric-type': 'performance',
            'threshold': '1-hour'
        });
        this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to Glue Job', {
            alarmsCreated: 2,
            jobName: jobName,
            monitoringEnabled: true
        });
    }
}
exports.GlueJobComponent = GlueJobComponent;
