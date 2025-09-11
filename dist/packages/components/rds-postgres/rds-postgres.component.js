"use strict";
/**
 * RDS PostgreSQL Component
 *
 * A managed PostgreSQL relational database with comprehensive compliance hardening.
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
exports.RdsPostgresComponent = exports.RdsPostgresConfigBuilder = exports.RDS_POSTGRES_CONFIG_SCHEMA = void 0;
const rds = __importStar(require("aws-cdk-lib/aws-rds"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cdk = __importStar(require("aws-cdk-lib"));
const contracts_1 = require("@platform/contracts");
/**
 * Configuration schema for RDS PostgreSQL component
 */
exports.RDS_POSTGRES_CONFIG_SCHEMA = {
    type: 'object',
    title: 'RDS PostgreSQL Configuration',
    description: 'Configuration for creating an RDS PostgreSQL database instance',
    required: ['dbName'],
    properties: {
        dbName: {
            type: 'string',
            description: 'The name of the database to create',
            pattern: '^[a-zA-Z][a-zA-Z0-9_]*$',
            minLength: 1,
            maxLength: 63
        },
        username: {
            type: 'string',
            description: 'The master username for the database',
            pattern: '^[a-zA-Z][a-zA-Z0-9_]*$',
            minLength: 1,
            maxLength: 63,
            default: 'postgres'
        },
        instanceClass: {
            type: 'string',
            description: 'The EC2 instance class for the database',
            enum: ['db.t3.micro', 'db.t3.small', 'db.t3.medium', 'db.t3.large',
                'db.r5.large', 'db.r5.xlarge', 'db.r5.2xlarge', 'db.r5.4xlarge'],
            default: 'db.t3.micro'
        },
        allocatedStorage: {
            type: 'number',
            description: 'The initial storage allocation in GB',
            minimum: 20,
            maximum: 65536,
            default: 20
        },
        maxAllocatedStorage: {
            type: 'number',
            description: 'Maximum storage allocation for auto-scaling in GB',
            minimum: 20,
            maximum: 65536
        },
        multiAz: {
            type: 'boolean',
            description: 'Enable Multi-AZ deployment for high availability',
            default: false
        },
        backupRetentionDays: {
            type: 'number',
            description: 'Number of days to retain backups',
            minimum: 0,
            maximum: 35,
            default: 7
        },
        backupWindow: {
            type: 'string',
            description: 'Daily backup window in UTC (HH:mm-HH:mm format)',
            pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]-([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
        },
        maintenanceWindow: {
            type: 'string',
            description: 'Weekly maintenance window (ddd:HH:mm-ddd:HH:mm format)',
            pattern: '^(sun|mon|tue|wed|thu|fri|sat):[0-2][0-9]:[0-5][0-9]-(sun|mon|tue|wed|thu|fri|sat):[0-2][0-9]:[0-5][0-9]$'
        },
        encryptionEnabled: {
            type: 'boolean',
            description: 'Enable encryption at rest for the database',
            default: false
        },
        kmsKeyArn: {
            type: 'string',
            description: 'KMS key ARN for encryption (if not provided, AWS managed key is used)',
            pattern: '^arn:aws:kms:[a-z0-9-]+:[0-9]{12}:key/[a-f0-9-]{36}$'
        },
        vpc: {
            type: 'object',
            description: 'VPC configuration for database deployment',
            properties: {
                vpcId: {
                    type: 'string',
                    description: 'VPC ID for database deployment',
                    pattern: '^vpc-[a-f0-9]{8,17}$'
                },
                subnetIds: {
                    type: 'array',
                    description: 'Subnet IDs for database subnet group',
                    items: {
                        type: 'string',
                        pattern: '^subnet-[a-f0-9]{8,17}$'
                    },
                    minItems: 2,
                    maxItems: 6
                },
                securityGroupIds: {
                    type: 'array',
                    description: 'Security group IDs for database access',
                    items: {
                        type: 'string',
                        pattern: '^sg-[a-f0-9]{8,17}$'
                    },
                    maxItems: 5
                }
            },
            additionalProperties: false
        },
        performanceInsights: {
            type: 'object',
            description: 'Performance Insights configuration',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable Performance Insights',
                    default: false
                },
                retentionPeriod: {
                    type: 'number',
                    description: 'Performance Insights retention period in days',
                    enum: [7, 31, 93, 186, 372, 731, 1095, 1827, 2555],
                    default: 7
                }
            },
            additionalProperties: false,
            default: {
                enabled: false,
                retentionPeriod: 7
            }
        },
        enhancedMonitoring: {
            type: 'object',
            description: 'Enhanced monitoring configuration',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable enhanced monitoring',
                    default: false
                },
                interval: {
                    type: 'number',
                    description: 'Monitoring interval in seconds',
                    enum: [1, 5, 10, 15, 30, 60],
                    default: 60
                }
            },
            additionalProperties: false,
            default: {
                enabled: false,
                interval: 60
            }
        }
    },
    additionalProperties: false,
    defaults: {
        username: 'postgres',
        instanceClass: 'db.t3.micro',
        allocatedStorage: 20,
        backupRetentionDays: 7,
        multiAz: false,
        encryptionEnabled: false,
        performanceInsights: {
            enabled: false,
            retentionPeriod: 7
        },
        enhancedMonitoring: {
            enabled: false,
            interval: 60
        }
    }
};
/**
 * Configuration builder for RDS PostgreSQL component
 */
class RdsPostgresConfigBuilder {
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
     * Get platform-wide defaults for RDS PostgreSQL
     */
    getPlatformDefaults() {
        return {
            username: 'postgres',
            instanceClass: this.getDefaultInstanceClass(),
            allocatedStorage: this.getDefaultAllocatedStorage(),
            backupRetentionDays: this.getDefaultBackupRetentionDays(),
            multiAz: this.getDefaultMultiAz(),
            encryptionEnabled: this.getDefaultEncryptionEnabled(),
            performanceInsights: {
                enabled: this.getDefaultPerformanceInsightsEnabled(),
                retentionPeriod: this.getDefaultPerformanceInsightsRetention()
            },
            enhancedMonitoring: {
                enabled: this.getDefaultEnhancedMonitoringEnabled(),
                interval: this.getDefaultEnhancedMonitoringInterval()
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
                    instanceClass: this.getComplianceInstanceClass('fedramp-moderate'),
                    allocatedStorage: Math.max(this.getDefaultAllocatedStorage(), 100), // Larger storage for compliance
                    backupRetentionDays: 30, // Extended backup retention
                    multiAz: true, // Required for high availability
                    encryptionEnabled: true, // Required encryption
                    performanceInsights: {
                        enabled: true, // Enhanced monitoring required
                        retentionPeriod: 1095 // 3 years retention
                    },
                    enhancedMonitoring: {
                        enabled: true,
                        interval: 5 // More frequent monitoring
                    }
                };
            case 'fedramp-high':
                return {
                    instanceClass: this.getComplianceInstanceClass('fedramp-high'),
                    allocatedStorage: Math.max(this.getDefaultAllocatedStorage(), 200), // Even larger storage
                    backupRetentionDays: 90, // Maximum backup retention
                    multiAz: true, // Required for high availability
                    encryptionEnabled: true, // Required encryption with CMK
                    performanceInsights: {
                        enabled: true, // Enhanced monitoring required
                        retentionPeriod: 2555 // 7 years retention
                    },
                    enhancedMonitoring: {
                        enabled: true,
                        interval: 1 // High-frequency monitoring
                    }
                };
            default: // commercial
                return {};
        }
    }
    /**
     * Get default instance class based on compliance framework
     */
    getDefaultInstanceClass() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 'db.r5.xlarge'; // High-performance instances for compliance
            case 'fedramp-moderate':
                return 'db.r5.large'; // Enhanced performance for moderate compliance
            default:
                return 'db.t3.micro'; // Cost-optimized for commercial
        }
    }
    /**
     * Get compliance-specific instance class
     */
    getComplianceInstanceClass(framework) {
        switch (framework) {
            case 'fedramp-high':
                return 'db.r5.xlarge';
            case 'fedramp-moderate':
                return 'db.r5.large';
            default:
                return 'db.t3.micro';
        }
    }
    /**
     * Get default allocated storage based on compliance framework
     */
    getDefaultAllocatedStorage() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 200; // Larger storage for compliance logging
            case 'fedramp-moderate':
                return 100; // Moderate increase for compliance
            default:
                return 20; // Minimum for cost optimization
        }
    }
    /**
     * Get default backup retention days
     */
    getDefaultBackupRetentionDays() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 90; // Maximum retention for high compliance
            case 'fedramp-moderate':
                return 30; // Extended retention for moderate compliance
            default:
                return 7; // Standard retention for commercial
        }
    }
    /**
     * Get default Multi-AZ setting
     */
    getDefaultMultiAz() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    /**
     * Get default encryption setting
     */
    getDefaultEncryptionEnabled() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    /**
     * Get default Performance Insights enabled setting
     */
    getDefaultPerformanceInsightsEnabled() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    /**
     * Get default Performance Insights retention
     */
    getDefaultPerformanceInsightsRetention() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 2555; // 7 years for high compliance
            case 'fedramp-moderate':
                return 1095; // 3 years for moderate compliance
            default:
                return 7; // Minimum for commercial
        }
    }
    /**
     * Get default Enhanced Monitoring enabled setting
     */
    getDefaultEnhancedMonitoringEnabled() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    /**
     * Get default Enhanced Monitoring interval
     */
    getDefaultEnhancedMonitoringInterval() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 1; // 1 second for high-frequency monitoring
            case 'fedramp-moderate':
                return 5; // 5 seconds for standard monitoring
            default:
                return 60; // 1 minute for cost-effective monitoring
        }
    }
}
exports.RdsPostgresConfigBuilder = RdsPostgresConfigBuilder;
/**
 * RDS PostgreSQL Component implementing Component API Contract v1.0
 */
class RdsPostgresComponent extends contracts_1.Component {
    database;
    secret;
    securityGroup;
    kmsKey;
    parameterGroup;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    /**
     * Synthesis phase - Create RDS PostgreSQL database with compliance hardening
     */
    synth() {
        // Log component synthesis start
        this.logComponentEvent('synthesis_start', 'Starting RDS Postgres component synthesis', {
            dbName: this.spec.config?.dbName,
            instanceClass: this.spec.config?.instanceClass
        });
        const startTime = Date.now();
        try {
            // Build configuration using ConfigBuilder
            const configBuilder = new RdsPostgresConfigBuilder(this.context, this.spec);
            this.config = configBuilder.buildSync();
            // Log configuration built
            this.logComponentEvent('config_built', 'RDS Postgres configuration built successfully', {
                dbName: this.config.dbName,
                instanceClass: this.config.instanceClass,
                multiAz: this.config.multiAz
            });
            // Create KMS key for encryption if needed
            this.createKmsKeyIfNeeded();
            // Create database secret
            this.createDatabaseSecret();
            // Create parameter group for STIG compliance if needed
            this.createParameterGroupIfNeeded();
            // Create security group
            this.createSecurityGroup();
            // Create database instance
            this.createDatabaseInstance();
            // Apply compliance hardening
            this.applyComplianceHardening();
            // Configure observability
            this.configureObservabilityForRds();
            // Register constructs
            this.registerConstruct('database', this.database);
            this.registerConstruct('secret', this.secret);
            this.registerConstruct('securityGroup', this.securityGroup);
            if (this.kmsKey) {
                this.registerConstruct('kmsKey', this.kmsKey);
            }
            if (this.parameterGroup) {
                this.registerConstruct('parameterGroup', this.parameterGroup);
            }
            // Register capabilities
            this.registerCapability('db:postgres', this.buildDatabaseCapability());
            // Log successful synthesis completion
            const duration = Date.now() - startTime;
            this.logPerformanceMetric('component_synthesis', duration, {
                resourcesCreated: Object.keys(this.capabilities).length
            });
            this.logComponentEvent('synthesis_complete', 'RDS Postgres component synthesis completed successfully', {
                databaseCreated: 1,
                secretCreated: 1,
                kmsKeyCreated: !!this.kmsKey,
                securityGroupCreated: !!this.securityGroup
            });
        }
        catch (error) {
            this.logError(error, 'component synthesis', {
                componentType: 'rds-postgres',
                stage: 'synthesis'
            });
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
        return 'rds-postgres';
    }
    /**
     * Create KMS key for encryption if required by compliance framework
     */
    createKmsKeyIfNeeded() {
        if (this.shouldUseCustomerManagedKey()) {
            this.kmsKey = new kms.Key(this, 'EncryptionKey', {
                description: `Encryption key for ${this.spec.name} PostgreSQL database`,
                enableKeyRotation: this.context.complianceFramework === 'fedramp-high',
                keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
                keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
            });
            // Apply standard tags to KMS key
            this.applyStandardTags(this.kmsKey, {
                'key-usage': 'rds-encryption',
                'key-rotation-enabled': (this.context.complianceFramework === 'fedramp-high').toString()
            });
            // Grant RDS service access to the key
            this.kmsKey.addToResourcePolicy(new iam.PolicyStatement({
                sid: 'AllowRDSService',
                principals: [new iam.ServicePrincipal('rds.amazonaws.com')],
                actions: [
                    'kms:Decrypt',
                    'kms:GenerateDataKey*',
                    'kms:CreateGrant',
                    'kms:DescribeKey'
                ],
                resources: ['*']
            }));
        }
    }
    /**
     * Create database secret with generated password
     */
    createDatabaseSecret() {
        this.secret = new secretsmanager.Secret(this, 'DatabaseSecret', {
            description: `Database credentials for ${this.config.dbName}`,
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ username: this.config.username }),
                generateStringKey: 'password',
                excludeCharacters: '"@/\\\'',
                includeSpace: false,
                requireEachIncludedType: true,
                passwordLength: 32
            },
            encryptionKey: this.kmsKey
        });
        // Apply standard tags to secret
        this.applyStandardTags(this.secret, {
            'secret-type': 'database-credentials',
            'database-name': this.config.dbName
        });
    }
    /**
     * Create parameter group for STIG compliance in FedRAMP High
     */
    createParameterGroupIfNeeded() {
        if (this.context.complianceFramework === 'fedramp-high') {
            this.parameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
                engine: rds.DatabaseInstanceEngine.postgres({
                    version: rds.PostgresEngineVersion.VER_15_4
                }),
                description: 'STIG-compliant parameter group for PostgreSQL',
                parameters: {
                    // STIG compliance parameters
                    'log_statement': 'all',
                    'log_min_duration_statement': '0',
                    'log_connections': '1',
                    'log_disconnections': '1',
                    'log_duration': '1',
                    'log_hostname': '1',
                    'log_line_prefix': '%t:%r:%u@%d:[%p]:',
                    'shared_preload_libraries': 'pgaudit',
                    'pgaudit.log': 'all',
                    'pgaudit.log_catalog': '1',
                    'pgaudit.log_parameter': '1',
                    'pgaudit.log_statement_once': '1',
                    'ssl': '1',
                    'ssl_ciphers': 'HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
                    'password_encryption': 'scram-sha-256'
                }
            });
        }
    }
    /**
     * Create security group for database access
     */
    createSecurityGroup() {
        // For demo purposes, create a VPC or use default
        const vpc = ec2.Vpc.fromLookup(this, 'Vpc', { isDefault: true });
        this.securityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
            vpc,
            description: `Security group for ${this.config.dbName} PostgreSQL database`,
            allowAllOutbound: false
        });
        // Apply standard tags to security group
        this.applyStandardTags(this.securityGroup, {
            'security-group-type': 'database',
            'database-engine': 'postgres'
        });
        // Add ingress rule for PostgreSQL port (will be refined by binding strategies)
        this.securityGroup.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(5432), 'PostgreSQL access from VPC');
    }
    /**
     * Create the RDS database instance
     */
    createDatabaseInstance() {
        const vpc = ec2.Vpc.fromLookup(this, 'VpcForDb', { isDefault: true });
        const props = {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_15_4
            }),
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
            credentials: rds.Credentials.fromSecret(this.secret),
            vpc,
            securityGroups: [this.securityGroup],
            databaseName: this.config.dbName,
            allocatedStorage: this.config.allocatedStorage || 20,
            maxAllocatedStorage: this.config.maxAllocatedStorage,
            storageEncrypted: this.shouldEnableEncryption(),
            storageEncryptionKey: this.kmsKey,
            backupRetention: cdk.Duration.days(this.getBackupRetentionDays()),
            deleteAutomatedBackups: false,
            deletionProtection: this.isComplianceFramework(),
            multiAz: this.shouldEnableMultiAz(),
            parameterGroup: this.parameterGroup,
            monitoringInterval: this.getEnhancedMonitoringInterval(),
            enablePerformanceInsights: this.shouldEnableRdsPerformanceInsights(),
            performanceInsightRetention: this.getPerformanceInsightsRetention(),
            performanceInsightEncryptionKey: this.kmsKey,
            removalPolicy: this.isComplianceFramework() ?
                cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
        };
        this.database = new rds.DatabaseInstance(this, 'Database', props);
        // Apply standard tags to database instance
        this.applyStandardTags(this.database, {
            'database-name': this.config.dbName,
            'database-engine': 'postgres',
            'database-version': '15.4',
            'instance-class': this.config.instanceClass || 'db.t3.micro',
            'multi-az': (!!this.config.multiAz).toString(),
            'backup-retention-days': this.getBackupRetentionDays().toString()
        });
        // Configure observability for database monitoring
        this.configureObservabilityForDatabase();
        // Log database creation
        this.logResourceCreation('rds-postgres-instance', this.database.instanceIdentifier, {
            dbName: this.config.dbName,
            engine: 'postgres',
            instanceClass: this.config.instanceClass,
            multiAz: !!this.config.multiAz,
            encryptionEnabled: this.shouldEnableEncryption(),
            performanceInsightsEnabled: this.shouldEnableRdsPerformanceInsights()
        });
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
        // Basic logging configuration
        if (this.database) {
            // Enable basic logging
            this.database.addRotationSingleUser();
        }
    }
    applyFedrampModerateHardening() {
        // Enhanced monitoring and logging
        const dbLogGroup = new logs.LogGroup(this, 'DatabaseLogGroup', {
            logGroupName: `/aws/rds/instance/${this.database.instanceIdentifier}/postgresql`,
            retention: logs.RetentionDays.THREE_MONTHS,
            removalPolicy: cdk.RemovalPolicy.RETAIN
        });
        // Apply standard tags to database log group
        this.applyStandardTags(dbLogGroup, {
            'log-type': 'database',
            'database-engine': 'postgres',
            'retention-period': 'three-months',
            'compliance-logging': 'fedramp-moderate'
        });
        // Enable automated backups with longer retention
        // This is handled in createDatabaseInstance with getBackupRetentionDays()
    }
    applyFedrampHighHardening() {
        // Apply all moderate hardening
        this.applyFedrampModerateHardening();
        // Extended audit logging
        const auditLogGroup = new logs.LogGroup(this, 'AuditLogGroup', {
            logGroupName: `/aws/rds/instance/${this.database.instanceIdentifier}/audit`,
            retention: logs.RetentionDays.ONE_YEAR,
            removalPolicy: cdk.RemovalPolicy.RETAIN
        });
        // Apply standard tags to audit log group
        this.applyStandardTags(auditLogGroup, {
            'log-type': 'audit',
            'database-engine': 'postgres',
            'retention-period': 'one-year',
            'compliance-logging': 'fedramp-high'
        });
        // Enable IAM database authentication
        if (this.database) {
            const cfnInstance = this.database.node.defaultChild;
            cfnInstance.enableIamDatabaseAuthentication = true;
        }
        // Create immutable backup copies (would be implemented with cross-region backup)
        // This would copy snapshots to the WORM S3 bucket created by S3 component
    }
    /**
     * Build database capability data shape
     */
    buildDatabaseCapability() {
        return {
            host: this.database.instanceEndpoint.hostname,
            port: this.database.instanceEndpoint.port,
            dbName: this.config.dbName,
            secretArn: this.secret.secretArn,
            sgId: this.securityGroup.securityGroupId,
            instanceArn: this.database.instanceArn
        };
    }
    /**
     * Helper methods for compliance decisions
     */
    shouldUseCustomerManagedKey() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    shouldEnableEncryption() {
        return this.context.complianceFramework !== 'commercial' || !!this.config.encryptionEnabled;
    }
    shouldEnableMultiAz() {
        return this.context.complianceFramework !== 'commercial' || !!this.config.multiAz;
    }
    shouldEnableRdsPerformanceInsights() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    isComplianceFramework() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    getBackupRetentionDays() {
        return this.config.backupRetentionDays || 7;
    }
    getEnhancedMonitoringInterval() {
        if (this.config.enhancedMonitoring?.enabled) {
            return cdk.Duration.seconds(this.config.enhancedMonitoring.interval || 60);
        }
        return undefined;
    }
    getPerformanceInsightsRetention() {
        if (!this.config.performanceInsights?.enabled) {
            return undefined;
        }
        const days = this.config.performanceInsights.retentionPeriod || 7;
        if (days >= 2555) {
            return rds.PerformanceInsightRetention.LONG_TERM;
        }
        else if (days >= 93) {
            return rds.PerformanceInsightRetention.DEFAULT;
        }
        return rds.PerformanceInsightRetention.DEFAULT;
    }
    /**
     * Configure OpenTelemetry observability for database monitoring according to Platform Observability Standard
     */
    configureObservabilityForDatabase() {
        if (!this.database)
            return;
        // Get standardized observability configuration for databases
        const otelConfig = this.configureObservability(this.database, {
            customAttributes: {
                'database.engine': 'postgres',
                'database.version': '15.4',
                'database.name': this.config.dbName,
                'database.instance.class': this.config.instanceClass || 'db.t3.micro',
                'database.multi.az': (!!this.config.multiAz).toString(),
                'database.backup.retention': this.getBackupRetentionDays().toString(),
                'database.performance.insights': this.shouldEnableRdsPerformanceInsights().toString()
            }
        });
        // Enable Performance Insights based on compliance framework
        if (this.shouldEnableRdsPerformanceInsights()) {
            const cfnInstance = this.database.node.defaultChild;
            cfnInstance.enablePerformanceInsights = true;
            cfnInstance.performanceInsightsRetentionPeriod = this.getPerformanceInsightsRetentionDays();
            // Use customer-managed KMS key for Performance Insights in compliance environments
            if (this.kmsKey) {
                cfnInstance.performanceInsightsKmsKeyId = this.kmsKey.keyArn;
            }
        }
        // Configure enhanced monitoring for detailed system metrics
        const cfnInstance = this.database.node.defaultChild;
        cfnInstance.monitoringInterval = this.getDatabaseMonitoringInterval();
        // Enable CloudWatch Logs exports for PostgreSQL
        cfnInstance.enableCloudwatchLogsExports = ['postgresql'];
    }
    /**
     * Get Performance Insights retention period based on compliance framework
     */
    getPerformanceInsightsRetentionDays() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 2555; // 7 years for FedRAMP High
            case 'fedramp-moderate':
                return 1095; // 3 years for FedRAMP Moderate
            default:
                return 7; // Default minimum for commercial
        }
    }
    /**
     * Get enhanced monitoring interval based on compliance requirements
     */
    getDatabaseMonitoringInterval() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 1; // 1 second for high-frequency monitoring
            case 'fedramp-moderate':
                return 5; // 5 seconds for standard monitoring
            default:
                return 60; // 1 minute for cost-effective monitoring
        }
    }
    /**
     * Configure CloudWatch observability for RDS PostgreSQL
     */
    configureObservabilityForRds() {
        // Enable monitoring for compliance frameworks only
        if (this.context.complianceFramework === 'commercial') {
            return;
        }
        const dbIdentifier = this.database.instanceIdentifier;
        // 1. Database Connection Count Alarm
        new cloudwatch.Alarm(this, 'DatabaseConnectionsAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-db-connections`,
            alarmDescription: 'RDS PostgreSQL database connections alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/RDS',
                metricName: 'DatabaseConnections',
                dimensionsMap: {
                    DBInstanceIdentifier: dbIdentifier
                },
                statistic: 'Average',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 80,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // 2. CPU Utilization Alarm
        new cloudwatch.Alarm(this, 'DatabaseCPUAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-db-cpu`,
            alarmDescription: 'RDS PostgreSQL CPU utilization alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/RDS',
                metricName: 'CPUUtilization',
                dimensionsMap: {
                    DBInstanceIdentifier: dbIdentifier
                },
                statistic: 'Average',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 80,
            evaluationPeriods: 3,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // 3. Free Storage Space Alarm
        new cloudwatch.Alarm(this, 'DatabaseStorageAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-db-storage`,
            alarmDescription: 'RDS PostgreSQL free storage space alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/RDS',
                metricName: 'FreeStorageSpace',
                dimensionsMap: {
                    DBInstanceIdentifier: dbIdentifier
                },
                statistic: 'Average',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 2000000000, // 2GB in bytes
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to RDS PostgreSQL', {
            alarmsCreated: 3,
            dbIdentifier: dbIdentifier,
            monitoringEnabled: true
        });
    }
}
exports.RdsPostgresComponent = RdsPostgresComponent;
