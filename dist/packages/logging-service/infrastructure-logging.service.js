"use strict";
/**
 * Platform Logging Service
 *
 * Implements the Platform Structured Logging Standard v1.0 using the Service Injector Pattern.
 * Automatically provisions logging infrastructure and instruments components with standardized loggers.
 *
 * Features:
 * - Compliance-aware log retention (1yr commercial, 3yr FedRAMP Moderate, 7yr FedRAMP High)
 * - Automatic encryption and security classification
 * - PII detection and redaction based on compliance framework
 * - Structured JSON logging with automatic correlation
 * - CloudWatch Log Groups provisioning and configuration
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
exports.LoggingService = void 0;
const fs = __importStar(require("fs"));
const yaml = __importStar(require("js-yaml"));
const path = __importStar(require("path"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
const cdk = __importStar(require("aws-cdk-lib"));
// Import concrete handlers
const lambda_logging_handler_1 = require("../logging-handlers/lambda-logging.handler");
const vpc_logging_handler_1 = require("../logging-handlers/vpc-logging.handler");
const ecs_logging_handler_1 = require("../logging-handlers/ecs-logging.handler");
const s3_logging_handler_1 = require("../logging-handlers/s3-logging.handler");
const rds_logging_handler_1 = require("../logging-handlers/rds-logging.handler");
const sqs_logging_handler_1 = require("../logging-handlers/sqs-logging.handler");
/**
 * Platform Logging Service implementing Platform Service Injector Standard v1.0
 * Uses the Handler Pattern for extensible, component-specific logging logic
 */
class LoggingService {
    name = 'LoggingService';
    handlers = new Map();
    context;
    loggingConfig;
    constructor(context) {
        this.context = context;
        // Load centralized logging configuration from platform configuration
        this.loggingConfig = this.loadLoggingConfig();
        // Register all available logging handlers
        this.registerHandlers();
    }
    /**
     * Apply logging infrastructure to a component using the appropriate handler
     */
    apply(component) {
        const componentType = component.getType();
        const handler = this.handlers.get(componentType);
        if (!handler) {
            // Safely ignore components that don't have specific logging requirements
            this.context.logger.debug(`No specific logging handler for component type: ${componentType}`, {
                service: this.name,
                componentType,
                componentName: component.node.id
            });
            return;
        }
        try {
            const startTime = Date.now();
            this.context.logger.info(`Applying logging infrastructure for ${componentType}`, {
                service: this.name,
                componentType,
                componentName: component.node.id,
                handler: handler.constructor.name
            });
            const result = handler.apply(component, this.context);
            const executionTime = Date.now() - startTime;
            if (result.success) {
                this.context.logger.info('Logging infrastructure applied successfully', {
                    service: this.name,
                    componentType,
                    componentName: component.node.id,
                    logGroupArn: result.logGroupArn,
                    retentionDays: result.retentionDays,
                    encryption: result.encryption,
                    classification: result.classification,
                    executionTimeMs: executionTime
                });
            }
            else {
                this.context.logger.error('Failed to apply logging infrastructure', {
                    service: this.name,
                    componentType,
                    componentName: component.node.id,
                    error: result.error,
                    executionTimeMs: executionTime
                });
            }
        }
        catch (error) {
            this.context.logger.error('Logging service encountered an error', {
                service: this.name,
                componentType,
                componentName: component.node.id,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    /**
     * Register all available logging handlers
     */
    registerHandlers() {
        const handlers = [
            new lambda_logging_handler_1.LambdaLoggingHandler(this),
            new vpc_logging_handler_1.VpcLoggingHandler(this),
            new ecs_logging_handler_1.EcsLoggingHandler(this),
            new s3_logging_handler_1.S3LoggingHandler(this),
            new rds_logging_handler_1.RdsLoggingHandler(this),
            new sqs_logging_handler_1.SqsLoggingHandler(this)
        ];
        handlers.forEach(handler => {
            this.handlers.set(handler.componentType, handler);
            this.context.logger.debug(`Registered logging handler for ${handler.componentType}`, {
                service: this.name,
                handlerType: handler.componentType,
                handlerClass: handler.constructor.name
            });
        });
        this.context.logger.info(`Initialized LoggingService with ${handlers.length} handlers`, {
            service: this.name,
            handlersCount: handlers.length,
            supportedTypes: Array.from(this.handlers.keys())
        });
    }
    /**
     * Load logging configuration from centralized platform configuration
     * Implements Platform Configuration Standard v1.0 Layer 2
     */
    loadLoggingConfig() {
        const framework = this.context.complianceFramework;
        const configPath = this.getPlatformConfigPath(framework);
        try {
            if (!fs.existsSync(configPath)) {
                this.context.logger.warn(`Platform configuration file not found: ${configPath}, using fallback defaults`, {
                    service: this.name,
                    framework,
                    configPath
                });
                return this.getFallbackLoggingConfig();
            }
            const fileContents = fs.readFileSync(configPath, 'utf8');
            const platformConfig = yaml.load(fileContents);
            // Extract logging configuration for this compliance framework
            if (platformConfig?.defaults?.logging) {
                const config = platformConfig.defaults.logging;
                return {
                    retentionPolicies: config.retentionPolicies || this.getFallbackLoggingConfig().retentionPolicies,
                    securityClassifications: config.securityClassifications || this.getFallbackLoggingConfig().securityClassifications,
                    samplingRates: config.samplingRates || this.getFallbackLoggingConfig().samplingRates,
                    logLevels: config.logLevels || this.getFallbackLoggingConfig().logLevels,
                    redactionRules: config.redactionRules || this.getFallbackLoggingConfig().redactionRules,
                    correlationFields: config.correlationFields || this.getFallbackLoggingConfig().correlationFields
                };
            }
            this.context.logger.warn(`No logging configuration found in ${configPath}, using fallback defaults`, {
                service: this.name,
                framework,
                configPath
            });
            return this.getFallbackLoggingConfig();
        }
        catch (error) {
            this.context.logger.error(`Failed to load platform configuration for framework '${framework}': ${error.message}`, {
                service: this.name,
                framework,
                configPath,
                error: error.message
            });
            return this.getFallbackLoggingConfig();
        }
    }
    /**
     * Get the file path for platform configuration based on compliance framework
     */
    getPlatformConfigPath(framework) {
        const configDir = path.join(process.cwd(), 'config');
        return path.join(configDir, `${framework}.yml`);
    }
    /**
     * Get fallback logging configuration when platform configuration is not available
     */
    getFallbackLoggingConfig() {
        return {
            retentionPolicies: {
                default: {
                    retentionDays: 365,
                    immutable: false,
                    encryptionLevel: 'standard',
                    auditRequired: false,
                    maxSamplingRate: 0.1
                }
            },
            securityClassifications: {
                default: 'internal',
                lambda: 'internal',
                ecs: 'internal',
                rds: 'internal',
                s3: 'internal',
                sqs: 'internal',
                vpc: 'internal'
            },
            samplingRates: {
                ERROR: 1.0,
                WARN: 1.0,
                INFO: 0.1,
                DEBUG: 0.01,
                TRACE: 0.001
            },
            logLevels: {
                default: 'INFO',
                lambda: 'INFO',
                ecs: 'INFO',
                rds: 'INFO',
                s3: 'INFO',
                sqs: 'INFO',
                vpc: 'INFO'
            },
            redactionRules: {
                base: ['email', 'ssn', 'creditCard', 'phoneNumber'],
                phi: ['medicalRecordNumber', 'insuranceId', 'prescriptionData', 'diagnosticData'],
                cui: ['governmentId', 'securityClearance', 'contractorInfo']
            },
            correlationFields: ['traceId', 'spanId', 'requestId', 'userId', 'sessionId', 'operationId']
        };
    }
    /**
     * Get retention policy for the current compliance framework
     */
    getRetentionPolicy(policyName = 'default') {
        const policy = this.loggingConfig.retentionPolicies[policyName];
        if (!policy) {
            throw new Error(`Unknown retention policy: ${policyName}`);
        }
        return policy;
    }
    /**
     * Create a standardized CloudWatch Log Group with compliance-appropriate configuration
     */
    createLogGroup(scope, logGroupName, classification = 'internal') {
        const policy = this.getRetentionPolicy();
        // Create KMS key for encryption if required
        let encryptionKey;
        let managedKey = true;
        if (policy.encryptionLevel === 'customer-managed') {
            encryptionKey = new kms.Key(scope, `${logGroupName}EncryptionKey`, {
                description: `Encryption key for log group ${logGroupName}`,
                enableKeyRotation: true,
                alias: `alias/logs/${this.context.serviceName}/${logGroupName}`
            });
            managedKey = false;
        }
        // Create log group with compliance configuration
        const logGroup = new logs.LogGroup(scope, `${logGroupName}LogGroup`, {
            logGroupName: `/platform/${this.context.serviceName}/${logGroupName}`,
            retention: this.mapRetentionDays(policy.retentionDays),
            encryptionKey: encryptionKey,
            removalPolicy: policy.immutable ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
        });
        // Apply standard platform tags
        cdk.Tags.of(logGroup).add('log-classification', classification);
        cdk.Tags.of(logGroup).add('compliance-framework', this.context.complianceFramework);
        cdk.Tags.of(logGroup).add('retention-days', policy.retentionDays.toString());
        cdk.Tags.of(logGroup).add('encryption-level', policy.encryptionLevel);
        const result = {
            success: true,
            logGroupArn: logGroup.logGroupArn,
            retentionDays: policy.retentionDays,
            encryption: {
                enabled: true,
                kmsKeyId: encryptionKey?.keyArn,
                managedKey
            },
            classification,
            metadata: {
                logGroupName: logGroup.logGroupName,
                immutableStorage: policy.immutable,
                auditRequired: policy.auditRequired
            }
        };
        return { logGroup, result };
    }
    /**
     * Generate platform logger configuration for component instrumentation
     */
    generateLoggerConfig(componentName, componentType, logGroupName, classification = 'internal') {
        const policy = this.getRetentionPolicy();
        // Get component-specific log level from configuration
        const logLevel = this.loggingConfig.logLevels[componentType] ||
            this.loggingConfig.logLevels.default;
        return {
            name: `${this.context.serviceName}.${componentName}`,
            level: logLevel,
            logGroup: logGroupName,
            streamPrefix: `${componentType}/${componentName}`,
            sampling: this.loggingConfig.samplingRates,
            security: {
                classification,
                piiRedactionRequired: policy.auditRequired,
                securityMonitoring: policy.auditRequired,
                redactionRules: this.getRedactionRules(classification),
                securityAlertsEnabled: policy.auditRequired
            },
            asyncBatching: true,
            correlationFields: this.loggingConfig.correlationFields
        };
    }
    /**
     * Get PII redaction rules based on classification level
     */
    getRedactionRules(classification) {
        const baseRules = this.loggingConfig.redactionRules.base;
        switch (classification) {
            case 'phi':
                return [
                    ...baseRules,
                    ...this.loggingConfig.redactionRules.phi
                ];
            case 'cui':
                return [
                    ...baseRules,
                    ...this.loggingConfig.redactionRules.cui
                ];
            default:
                return baseRules;
        }
    }
    /**
     * Map retention days to CloudWatch LogGroup retention enum
     */
    mapRetentionDays(days) {
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
        if (days <= 1095)
            return logs.RetentionDays.THREE_YEARS;
        if (days <= 1827)
            return logs.RetentionDays.FIVE_YEARS;
        if (days <= 2192)
            return logs.RetentionDays.SIX_YEARS;
        if (days <= 2555)
            return logs.RetentionDays.SEVEN_YEARS;
        if (days <= 2922)
            return logs.RetentionDays.EIGHT_YEARS;
        if (days <= 3287)
            return logs.RetentionDays.NINE_YEARS;
        return logs.RetentionDays.TEN_YEARS;
    }
    /**
     * Get supported component types
     */
    getSupportedTypes() {
        return Array.from(this.handlers.keys());
    }
    /**
     * Check if a component type is supported
     */
    isSupported(componentType) {
        return this.handlers.has(componentType);
    }
    /**
     * Get security classification for a component type
     */
    getSecurityClassification(componentType) {
        return this.loggingConfig.securityClassifications[componentType] ||
            this.loggingConfig.securityClassifications.default;
    }
    /**
     * Get the current logging configuration
     */
    getLoggingConfig() {
        return this.loggingConfig;
    }
}
exports.LoggingService = LoggingService;
