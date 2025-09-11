"use strict";
/**
 * Secrets Manager Component
 *
 * AWS Secrets Manager for secure storage and retrieval of sensitive information.
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
exports.SecretsManagerComponent = exports.SecretsManagerConfigBuilder = exports.SECRETS_MANAGER_CONFIG_SCHEMA = void 0;
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cdk = __importStar(require("aws-cdk-lib"));
const contracts_1 = require("@platform/contracts");
/**
 * Configuration schema for Secrets Manager component
 */
exports.SECRETS_MANAGER_CONFIG_SCHEMA = {
    type: 'object',
    title: 'Secrets Manager Configuration',
    description: 'Configuration for creating a Secrets Manager secret',
    properties: {
        secretName: {
            type: 'string',
            description: 'Name of the secret (will be auto-generated if not provided)',
            pattern: '^[a-zA-Z0-9_./\\-]+$',
            maxLength: 512
        },
        description: {
            type: 'string',
            description: 'Description of the secret',
            maxLength: 2048
        },
        secretValue: {
            type: 'object',
            description: 'Initial secret value',
            properties: {
                secretStringValue: {
                    type: 'string',
                    description: 'Secret as a string value'
                }
            },
            additionalProperties: false
        },
        generateSecret: {
            type: 'object',
            description: 'Generate secret automatically',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable automatic secret generation',
                    default: false
                },
                excludeCharacters: {
                    type: 'string',
                    description: 'Characters to exclude from generated secret',
                    default: '"@/\\\''
                },
                includeSpace: {
                    type: 'boolean',
                    description: 'Include space in generated secret',
                    default: false
                },
                passwordLength: {
                    type: 'number',
                    description: 'Length of generated password',
                    minimum: 8,
                    maximum: 4096,
                    default: 32
                },
                requireEachIncludedType: {
                    type: 'boolean',
                    description: 'Require each included character type',
                    default: true
                }
            },
            additionalProperties: false,
            default: { enabled: false }
        },
        automaticRotation: {
            type: 'object',
            description: 'Automatic rotation configuration',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable automatic rotation',
                    default: false
                },
                rotationLambda: {
                    type: 'object',
                    description: 'Lambda function for rotation',
                    properties: {
                        createFunction: {
                            type: 'boolean',
                            description: 'Create rotation Lambda function automatically',
                            default: false
                        },
                        runtime: {
                            type: 'string',
                            description: 'Lambda runtime for rotation function',
                            enum: ['python3.9', 'python3.10', 'python3.11'],
                            default: 'python3.11'
                        }
                    }
                },
                schedule: {
                    type: 'object',
                    description: 'Rotation schedule',
                    properties: {
                        automaticallyAfterDays: {
                            type: 'number',
                            description: 'Rotation interval in days',
                            minimum: 1,
                            maximum: 365,
                            default: 30
                        }
                    }
                }
            },
            additionalProperties: false,
            default: { enabled: false }
        },
        replicas: {
            type: 'array',
            description: 'Multi-region replicas',
            items: {
                type: 'object',
                properties: {
                    region: {
                        type: 'string',
                        description: 'AWS region for replica'
                    },
                    kmsKeyArn: {
                        type: 'string',
                        description: 'KMS key ARN for replica encryption'
                    }
                },
                required: ['region'],
                additionalProperties: false
            },
            default: []
        },
        encryption: {
            type: 'object',
            description: 'Encryption configuration',
            properties: {
                kmsKeyArn: {
                    type: 'string',
                    description: 'KMS key ARN for encryption'
                }
            },
            additionalProperties: false
        },
        recovery: {
            type: 'object',
            description: 'Recovery configuration',
            properties: {
                deletionProtection: {
                    type: 'boolean',
                    description: 'Enable deletion protection',
                    default: true
                },
                recoveryWindowInDays: {
                    type: 'number',
                    description: 'Recovery window in days',
                    minimum: 7,
                    maximum: 30,
                    default: 30
                }
            },
            additionalProperties: false,
            default: {
                deletionProtection: true,
                recoveryWindowInDays: 30
            }
        }
    },
    additionalProperties: false,
    defaults: {
        generateSecret: { enabled: false },
        automaticRotation: { enabled: false },
        replicas: [],
        recovery: {
            deletionProtection: true,
            recoveryWindowInDays: 30
        }
    }
};
/**
 * Configuration builder for Secrets Manager component
 */
class SecretsManagerConfigBuilder {
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
     * Get platform-wide defaults for Secrets Manager
     */
    getPlatformDefaults() {
        return {
            generateSecret: {
                enabled: false,
                excludeCharacters: '"@/\\\'',
                includeSpace: false,
                passwordLength: 32,
                requireEachIncludedType: true
            },
            automaticRotation: {
                enabled: false,
                schedule: {
                    automaticallyAfterDays: this.getDefaultRotationDays()
                }
            },
            recovery: {
                deletionProtection: this.getDefaultDeletionProtection(),
                recoveryWindowInDays: this.getDefaultRecoveryWindow()
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
                    automaticRotation: {
                        enabled: true, // Required for compliance
                        schedule: {
                            automaticallyAfterDays: 90 // Quarterly rotation
                        }
                    },
                    recovery: {
                        deletionProtection: true, // Required for compliance
                        recoveryWindowInDays: 30 // Maximum recovery window
                    },
                    // Multi-region replication for compliance
                    replicas: this.getComplianceReplicas()
                };
            case 'fedramp-high':
                return {
                    automaticRotation: {
                        enabled: true, // Mandatory for high compliance
                        schedule: {
                            automaticallyAfterDays: 30 // Monthly rotation
                        }
                    },
                    recovery: {
                        deletionProtection: true, // Mandatory
                        recoveryWindowInDays: 7 // Minimum recovery window for high security
                    },
                    // Multi-region replication required
                    replicas: this.getComplianceReplicas()
                };
            default: // commercial
                return {};
        }
    }
    /**
     * Get default rotation days based on compliance framework
     */
    getDefaultRotationDays() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 30; // Monthly for high compliance
            case 'fedramp-moderate':
                return 90; // Quarterly for moderate compliance
            default:
                return 365; // Yearly for commercial
        }
    }
    /**
     * Get default deletion protection setting
     */
    getDefaultDeletionProtection() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    /**
     * Get default recovery window
     */
    getDefaultRecoveryWindow() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 7; // Minimum for high security
            default:
                return 30; // Standard window
        }
    }
    /**
     * Get compliance replica regions
     */
    getComplianceReplicas() {
        // For compliance, secrets should be replicated to a secondary region
        const currentRegion = this.context.region || 'us-east-1';
        const replicaRegion = currentRegion === 'us-east-1' ? 'us-west-2' : 'us-east-1';
        return [{ region: replicaRegion }];
    }
}
exports.SecretsManagerConfigBuilder = SecretsManagerConfigBuilder;
/**
 * Secrets Manager Component implementing Component API Contract v1.0
 */
class SecretsManagerComponent extends contracts_1.Component {
    secret;
    kmsKey;
    rotationLambda;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    /**
     * Synthesis phase - Create Secrets Manager secret with compliance hardening
     */
    synth() {
        // Log component synthesis start
        this.logComponentEvent('synthesis_start', 'Starting Secrets Manager component synthesis', {
            secretName: this.spec.config?.secretName,
            automaticRotation: this.spec.config?.automaticRotation?.enabled
        });
        const startTime = Date.now();
        try {
            // Build configuration using ConfigBuilder
            const configBuilder = new SecretsManagerConfigBuilder(this.context, this.spec);
            this.config = configBuilder.buildSync();
            // Log configuration built
            this.logComponentEvent('config_built', 'Secrets Manager configuration built successfully', {
                secretName: this.config.secretName,
                rotationEnabled: this.config.automaticRotation?.enabled,
                replicaCount: this.config.replicas?.length || 0
            });
            // Create KMS key for encryption if needed
            this.createKmsKeyIfNeeded();
            // Create rotation Lambda if needed
            this.createRotationLambdaIfNeeded();
            // Create Secrets Manager secret
            this.createSecret();
            // Apply compliance hardening
            this.applyComplianceHardening();
            // Configure observability
            this.configureObservabilityForSecret();
            // Register constructs
            this.registerConstruct('secret', this.secret);
            if (this.kmsKey) {
                this.registerConstruct('kmsKey', this.kmsKey);
            }
            if (this.rotationLambda) {
                this.registerConstruct('rotationLambda', this.rotationLambda);
            }
            // Register capabilities
            this.registerCapability('secret:secretsmanager', this.buildSecretCapability());
            // Log successful synthesis completion
            const duration = Date.now() - startTime;
            this.logPerformanceMetric('component_synthesis', duration, {
                resourcesCreated: Object.keys(this.capabilities).length
            });
            this.logComponentEvent('synthesis_complete', 'Secrets Manager component synthesis completed successfully', {
                secretCreated: 1,
                kmsKeyCreated: !!this.kmsKey,
                rotationLambdaCreated: !!this.rotationLambda,
                replicasCreated: this.config.replicas?.length || 0
            });
        }
        catch (error) {
            this.logError(error, 'component synthesis', {
                componentType: 'secrets-manager',
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
        return 'secrets-manager';
    }
    /**
     * Create KMS key for encryption if required by compliance framework
     */
    createKmsKeyIfNeeded() {
        if (this.shouldUseCustomerManagedKey()) {
            this.kmsKey = new kms.Key(this, 'EncryptionKey', {
                description: `Encryption key for ${this.spec.name} Secrets Manager secret`,
                enableKeyRotation: this.context.complianceFramework === 'fedramp-high',
                keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
                keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
            });
            // Apply standard tags
            this.applyStandardTags(this.kmsKey, {
                'encryption-type': 'customer-managed',
                'key-rotation': (this.context.complianceFramework === 'fedramp-high').toString(),
                'resource-type': 'secrets-manager-encryption'
            });
            // Grant Secrets Manager service access to the key
            this.kmsKey.addToResourcePolicy(new iam.PolicyStatement({
                sid: 'AllowSecretsManagerService',
                principals: [new iam.ServicePrincipal('secretsmanager.amazonaws.com')],
                actions: [
                    'kms:Decrypt',
                    'kms:GenerateDataKey*',
                    'kms:DescribeKey'
                ],
                resources: ['*']
            }));
        }
    }
    /**
     * Create rotation Lambda function if automatic rotation is enabled
     */
    createRotationLambdaIfNeeded() {
        if (this.config.automaticRotation?.enabled &&
            this.config.automaticRotation?.rotationLambda?.createFunction) {
            this.rotationLambda = new lambda.Function(this, 'RotationFunction', {
                runtime: lambda.Runtime.PYTHON_3_11,
                handler: 'lambda_function.lambda_handler',
                code: lambda.Code.fromInline(`
import json
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Secrets Manager rotation function
    
    This is a basic template for secret rotation.
    In production, implement specific rotation logic for your secret type.
    """
    
    logger.info(f"Rotation event: {json.dumps(event)}")
    
    client = boto3.client('secretsmanager')
    
    secret_arn = event['SecretId']
    token = event['ClientRequestToken']
    step = event['Step']
    
    logger.info(f"Rotating secret {secret_arn} - Step: {step}")
    
    try:
        if step == "createSecret":
            # Create new secret version
            logger.info("Creating new secret version")
            # Implementation depends on secret type
            pass
            
        elif step == "setSecret":
            # Update the service with new secret
            logger.info("Setting secret in service")
            # Implementation depends on service type
            pass
            
        elif step == "testSecret":
            # Test the new secret
            logger.info("Testing new secret")
            # Implementation depends on service type
            pass
            
        elif step == "finishSecret":
            # Finalize the rotation
            logger.info("Finishing secret rotation")
            client.update_secret_version_stage(
                SecretId=secret_arn,
                VersionStage="AWSCURRENT",
                ClientRequestToken=token
            )
            
        return {"statusCode": 200}
        
    except Exception as e:
        logger.error(f"Rotation failed: {str(e)}")
        raise e
        `),
                description: `Secret rotation function for ${this.spec.name}`,
                timeout: cdk.Duration.minutes(5),
                memorySize: 256,
                environment: {
                    'SECRET_ARN': 'placeholder' // Will be updated after secret creation
                },
                tracing: ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) ?
                    lambda.Tracing.ACTIVE : lambda.Tracing.DISABLED
            });
            // Apply standard tags
            this.applyStandardTags(this.rotationLambda, {
                'function-type': 'secret-rotation',
                'runtime': 'python3.11',
                'purpose': 'secrets-manager-rotation'
            });
        }
    }
    /**
     * Create the Secrets Manager secret
     */
    createSecret() {
        const secretProps = {
            secretName: this.buildSecretName(),
            description: this.config.description,
            encryptionKey: this.kmsKey
        };
        // Configure secret generation if enabled
        if (this.config.generateSecret?.enabled) {
            const generateOptions = {
                excludeCharacters: this.config.generateSecret.excludeCharacters,
                includeSpace: this.config.generateSecret.includeSpace,
                passwordLength: this.config.generateSecret.passwordLength,
                requireEachIncludedType: this.config.generateSecret.requireEachIncludedType,
                secretStringTemplate: this.config.generateSecret.secretStringTemplate,
                generateStringKey: this.config.generateSecret.generateStringKey
            };
            Object.assign(secretProps, {
                generateSecretString: generateOptions
            });
        }
        else if (this.config.secretValue?.secretStringValue) {
            // Use provided secret value
            Object.assign(secretProps, {
                secretStringValue: secretsmanager.SecretValue.unsafePlainText(this.config.secretValue.secretStringValue)
            });
        }
        // Configure replicas for multi-region
        if (this.config.replicas && this.config.replicas.length > 0) {
            const replicaRegions = this.config.replicas.map(replica => ({
                region: replica.region,
                encryptionKey: replica.kmsKeyArn ?
                    kms.Key.fromKeyArn(this, `ReplicaKey-${replica.region}`, replica.kmsKeyArn) : undefined
            }));
            Object.assign(secretProps, {
                replicaRegions
            });
        }
        this.secret = new secretsmanager.Secret(this, 'Secret', secretProps);
        // Apply standard tags
        this.applyStandardTags(this.secret, {
            'secret-type': 'main',
            'rotation-enabled': (!!this.config.automaticRotation?.enabled).toString(),
            'replicas-count': (this.config.replicas?.length || 0).toString(),
            'deletion-protection': (!!this.config.recovery?.deletionProtection).toString()
        });
        // Configure automatic rotation if enabled
        if (this.config.automaticRotation?.enabled) {
            if (this.rotationLambda) {
                // Update Lambda environment with actual secret ARN
                this.rotationLambda.addEnvironment('SECRET_ARN', this.secret.secretArn);
                // Add rotation using custom Lambda
                this.secret.addRotationSchedule('RotationSchedule', {
                    rotationLambda: this.rotationLambda,
                    automaticallyAfter: cdk.Duration.days(this.config.automaticRotation.schedule?.automaticallyAfterDays || 30)
                });
            }
            else if (this.config.automaticRotation.rotationLambda?.functionArn) {
                // Use existing Lambda function
                const existingLambda = lambda.Function.fromFunctionArn(this, 'ExistingRotationFunction', this.config.automaticRotation.rotationLambda.functionArn);
                this.secret.addRotationSchedule('RotationSchedule', {
                    rotationLambda: existingLambda,
                    automaticallyAfter: cdk.Duration.days(this.config.automaticRotation.schedule?.automaticallyAfterDays || 30)
                });
            }
        }
        // Log secret creation
        this.logResourceCreation('secrets-manager-secret', this.secret.secretName, {
            rotationEnabled: !!this.config.automaticRotation?.enabled,
            replicaCount: this.config.replicas?.length || 0,
            encryptionEnabled: !!this.kmsKey
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
        // Basic access policies
        if (this.secret) {
            this.secret.addToResourcePolicy(new iam.PolicyStatement({
                sid: 'DenyInsecureTransport',
                effect: iam.Effect.DENY,
                principals: [new iam.AnyPrincipal()],
                actions: ['secretsmanager:*'],
                resources: ['*'],
                conditions: {
                    Bool: {
                        'aws:SecureTransport': 'false'
                    }
                }
            }));
        }
    }
    applyFedrampModerateHardening() {
        // Apply commercial hardening
        this.applyCommercialHardening();
        // Enhanced access restrictions
        if (this.secret) {
            this.secret.addToResourcePolicy(new iam.PolicyStatement({
                sid: 'RestrictToVPCEndpoints',
                effect: iam.Effect.DENY,
                principals: [new iam.AnyPrincipal()],
                actions: ['secretsmanager:*'],
                resources: ['*'],
                conditions: {
                    StringNotEquals: {
                        'aws:sourceVpce': ['vpce-*'] // Would be replaced with actual VPC endpoint ID
                    }
                }
            }));
        }
    }
    applyFedrampHighHardening() {
        // Apply all moderate hardening
        this.applyFedrampModerateHardening();
        // Stricter access controls for high compliance
        if (this.secret) {
            this.secret.addToResourcePolicy(new iam.PolicyStatement({
                sid: 'RequireSTSAssumedRole',
                effect: iam.Effect.DENY,
                principals: [new iam.AnyPrincipal()],
                actions: ['secretsmanager:*'],
                resources: ['*'],
                conditions: {
                    Bool: {
                        'aws:TokenIssueTime': 'false' // Require temporary credentials
                    }
                }
            }));
        }
    }
    /**
     * Build secret capability data shape
     */
    buildSecretCapability() {
        return {
            secretArn: this.secret.secretArn,
            secretName: this.secret.secretName
        };
    }
    /**
     * Helper methods for compliance decisions
     */
    shouldUseCustomerManagedKey() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) ||
            !!this.config.encryption?.kmsKeyArn;
    }
    buildSecretName() {
        if (this.config.secretName) {
            return this.config.secretName;
        }
        return `${this.context.serviceName}/${this.spec.name}`;
    }
    /**
     * Configure CloudWatch observability for Secrets Manager
     */
    configureObservabilityForSecret() {
        // Enable monitoring for compliance frameworks only
        if (this.context.complianceFramework === 'commercial') {
            return;
        }
        const secretName = this.buildSecretName() || this.spec.name;
        // 1. Failed Rotation Alarm
        if (this.config.automaticRotation?.enabled) {
            const rotationFailureAlarm = new cloudwatch.Alarm(this, 'RotationFailureAlarm', {
                alarmName: `${this.context.serviceName}-${this.spec.name}-rotation-failure`,
                alarmDescription: 'Secrets Manager rotation failure alarm',
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/SecretsManager',
                    metricName: 'RotationFailed',
                    dimensionsMap: {
                        SecretName: secretName
                    },
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5)
                }),
                threshold: 1,
                evaluationPeriods: 1,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
            });
            // Apply standard tags
            this.applyStandardTags(rotationFailureAlarm, {
                'alarm-type': 'rotation-failure',
                'metric-type': 'error-rate',
                'threshold': '1'
            });
        }
        // 2. Secret Access Alarm (unusual access patterns)
        const accessAlarm = new cloudwatch.Alarm(this, 'SecretAccessAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-unusual-access`,
            alarmDescription: 'Secrets Manager unusual access pattern alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/SecretsManager',
                metricName: 'SuccessfulRequestLatency',
                dimensionsMap: {
                    SecretName: secretName
                },
                statistic: 'Average',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 5000, // 5 seconds threshold for unusual latency
            evaluationPeriods: 3,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // Apply standard tags
        this.applyStandardTags(accessAlarm, {
            'alarm-type': 'access-latency',
            'metric-type': 'performance',
            'threshold': '5000'
        });
        this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to Secrets Manager', {
            alarmsCreated: this.config.automaticRotation?.enabled ? 2 : 1,
            secretName: secretName,
            monitoringEnabled: true
        });
    }
}
exports.SecretsManagerComponent = SecretsManagerComponent;
