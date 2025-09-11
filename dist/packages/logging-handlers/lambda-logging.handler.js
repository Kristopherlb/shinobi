"use strict";
/**
 * Lambda Logging Handler
 *
 * Implements logging infrastructure for Lambda functions according to
 * Platform Structured Logging Standard v1.0.
 *
 * Features:
 * - Creates dedicated CloudWatch Log Groups for Lambda functions
 * - Configures compliance-aware log retention
 * - Sets up structured logging environment variables
 * - Implements automatic PII redaction based on compliance framework
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
exports.LambdaLoggingHandler = void 0;
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const cdk = __importStar(require("aws-cdk-lib"));
/**
 * Logging handler for Lambda functions
 * Supports: lambda-api, lambda-worker, lambda-scheduled
 */
class LambdaLoggingHandler {
    componentType = 'lambda-api';
    loggingService;
    constructor(loggingService) {
        this.loggingService = loggingService;
    }
    /**
     * Apply comprehensive logging infrastructure to a Lambda function
     */
    apply(component, context) {
        try {
            // Get the Lambda function from the component
            const lambdaFunction = component.getConstruct('function');
            if (!lambdaFunction) {
                return {
                    success: false,
                    retentionDays: 0,
                    encryption: { enabled: false, managedKey: true },
                    classification: 'internal',
                    error: 'Lambda component has no function construct registered'
                };
            }
            // Create dedicated log group with compliance configuration
            const logGroupName = `/aws/lambda/${lambdaFunction.functionName}`;
            const logGroup = this.createLambdaLogGroup(component, logGroupName, context);
            // Configure Lambda logging permissions
            this.configureLambdaLogPermissions(lambdaFunction, logGroup);
            // Set up structured logging environment variables
            const loggerConfig = this.generateLambdaLoggerConfig(component.node.id, logGroupName, context);
            this.injectLoggingEnvironment(lambdaFunction, loggerConfig, context);
            // Apply security classification tags
            const classification = this.loggingService.getSecurityClassification('lambda');
            return {
                success: true,
                logGroupArn: logGroup.logGroupArn,
                retentionDays: this.loggingService.getRetentionPolicy().retentionDays,
                encryption: {
                    enabled: true,
                    managedKey: this.loggingService.getRetentionPolicy().encryptionLevel === 'standard'
                },
                classification,
                metadata: {
                    functionName: lambdaFunction.functionName,
                    functionArn: lambdaFunction.functionArn,
                    logGroupName: logGroup.logGroupName,
                    runtime: lambdaFunction.runtime?.name,
                    structured: true,
                    piiRedaction: context.complianceFramework !== 'commercial'
                }
            };
        }
        catch (error) {
            return {
                success: false,
                retentionDays: 0,
                encryption: { enabled: false, managedKey: true },
                classification: 'internal',
                error: `Failed to configure Lambda logging: ${error.message}`
            };
        }
    }
    /**
     * Create CloudWatch Log Group for Lambda function
     */
    createLambdaLogGroup(component, logGroupName, context) {
        const policy = this.loggingService.getRetentionPolicy();
        const retentionEnum = this.mapRetentionToEnum(policy.retentionDays);
        return new logs.LogGroup(component, 'LambdaLogGroup', {
            logGroupName,
            retention: retentionEnum,
            removalPolicy: policy.immutable ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
        });
    }
    /**
     * Configure IAM permissions for Lambda to write to CloudWatch Logs
     */
    configureLambdaLogPermissions(lambdaFunction, logGroup) {
        // Grant Lambda function permission to create log streams and put log events
        logGroup.grantWrite(lambdaFunction);
        // Add explicit permissions for structured logging
        lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams'
            ],
            resources: [
                logGroup.logGroupArn,
                `${logGroup.logGroupArn}:*`
            ]
        }));
    }
    /**
     * Generate platform logger configuration for Lambda
     */
    generateLambdaLoggerConfig(componentName, logGroupName, context) {
        return this.loggingService.generateLoggerConfig(componentName, 'lambda', logGroupName, this.loggingService.getSecurityClassification('lambda'));
    }
    /**
     * Inject structured logging environment variables into Lambda
     */
    injectLoggingEnvironment(lambdaFunction, loggerConfig, context) {
        const loggingEnvVars = {
            // Platform Logger Configuration
            'PLATFORM_LOGGER_NAME': loggerConfig.name,
            'PLATFORM_LOGGER_LEVEL': loggerConfig.level,
            'PLATFORM_LOG_GROUP': loggerConfig.logGroup,
            'PLATFORM_LOG_STREAM_PREFIX': loggerConfig.streamPrefix,
            // Service Context
            'PLATFORM_SERVICE_NAME': context.serviceName,
            'PLATFORM_ENVIRONMENT': context.environment,
            'PLATFORM_REGION': context.region,
            'PLATFORM_COMPLIANCE_FRAMEWORK': context.complianceFramework,
            // Security Configuration
            'PLATFORM_LOG_CLASSIFICATION': loggerConfig.security.classification,
            'PLATFORM_PII_REDACTION_ENABLED': loggerConfig.security.piiRedactionRequired.toString(),
            'PLATFORM_SECURITY_MONITORING': loggerConfig.security.securityMonitoring.toString(),
            // Sampling Configuration
            'PLATFORM_LOG_SAMPLING_ERROR': loggerConfig.sampling.ERROR?.toString() || '1.0',
            'PLATFORM_LOG_SAMPLING_WARN': loggerConfig.sampling.WARN?.toString() || '1.0',
            'PLATFORM_LOG_SAMPLING_INFO': loggerConfig.sampling.INFO?.toString() || '0.1',
            'PLATFORM_LOG_SAMPLING_DEBUG': loggerConfig.sampling.DEBUG?.toString() || '0.01',
            // Performance Configuration
            'PLATFORM_LOG_ASYNC_BATCHING': loggerConfig.asyncBatching.toString(),
            'PLATFORM_LOG_BATCH_SIZE': '100',
            'PLATFORM_LOG_BATCH_TIMEOUT': '5000',
            // Correlation Configuration
            'PLATFORM_CORRELATION_FIELDS': loggerConfig.correlationFields.join(','),
            // JSON Schema Validation
            'PLATFORM_LOG_SCHEMA_VALIDATION': 'true',
            'PLATFORM_LOG_FORMAT': 'json'
        };
        // Add environment variables to Lambda function
        Object.entries(loggingEnvVars).forEach(([key, value]) => {
            lambdaFunction.addEnvironment(key, value);
        });
    }
    /**
     * Map retention days to CloudWatch enum
     */
    mapRetentionToEnum(days) {
        if (days <= 1)
            return logs.RetentionDays.ONE_DAY;
        if (days <= 7)
            return logs.RetentionDays.ONE_WEEK;
        if (days <= 30)
            return logs.RetentionDays.ONE_MONTH;
        if (days <= 90)
            return logs.RetentionDays.THREE_MONTHS;
        if (days <= 365)
            return logs.RetentionDays.ONE_YEAR;
        if (days <= 1095)
            return logs.RetentionDays.THREE_YEARS;
        if (days <= 2555)
            return logs.RetentionDays.SEVEN_YEARS;
        return logs.RetentionDays.TEN_YEARS;
    }
}
exports.LambdaLoggingHandler = LambdaLoggingHandler;
