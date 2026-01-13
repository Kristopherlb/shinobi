/**
 * Lambda Powertools Extension Handler
 *
 * Extends the existing OTEL observability handlers to add AWS Lambda Powertools
 * capabilities while maintaining compatibility with existing OTEL + X-Ray setup.
 *
 * This handler is designed to be used by all Lambda components (lambda-api, lambda-worker, etc.)
 * and provides enhanced observability capabilities without replacing existing infrastructure.
 */
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
/**
 * Default Powertools configuration
 */
export const DEFAULT_POWERTOOLS_CONFIG = {
    enabled: false,
    layerArn: '',
    enableLogger: true,
    enableTracer: true,
    enableMetrics: true,
    enableParameters: false,
    enableIdempotency: false,
    logLevel: 'INFO',
    serviceName: '',
    metricsNamespace: 'Shinobi',
    businessMetrics: false,
    parameterStore: false,
    auditLogging: false,
    logEvent: false
};
/**
 * Lambda Powertools Extension Handler
 *
 * Provides enhanced observability capabilities for Lambda functions while maintaining
 * compatibility with existing OTEL + X-Ray infrastructure.
 */
export class LambdaPowertoolsExtensionHandler {
    config;
    context;
    constructor(context, config = {}) {
        this.context = context;
        this.config = {
            ...DEFAULT_POWERTOOLS_CONFIG,
            ...config,
            serviceName: config.serviceName || context.serviceName
        };
    }
    /**
     * Factory method to create a handler instance
     */
    static create(context, config) {
        return new LambdaPowertoolsExtensionHandler(context, config);
    }
    /**
     * Get current Powertools configuration
     */
    getPowertoolsConfig() {
        return { ...this.config };
    }
    /**
     * Update Powertools configuration
     */
    updatePowertoolsConfig(config) {
        this.config = {
            ...this.config,
            ...config
        };
    }
    /**
     * Apply Powertools enhancements to a Lambda component
     */
    applyPowertoolsEnhancements(component, observabilityConfig) {
        const startTime = Date.now();
        try {
            this.context.logger.info('Applying Lambda Powertools enhancements', {
                service: 'ObservabilityService',
                componentType: component.getType(),
                componentName: component.node.id,
                powertoolsEnabled: this.config.enabled
            });
            if (!this.config.enabled) {
                this.context.logger.debug('Lambda Powertools not enabled for this component', {
                    service: 'ObservabilityService',
                    componentName: component.node.id
                });
                return {
                    instrumentationApplied: false,
                    alarmsCreated: 0,
                    executionTimeMs: Date.now() - startTime
                };
            }
            const lambdaFunction = component.getConstruct('function');
            if (!lambdaFunction) {
                this.context.logger.warn('Lambda component has no function construct registered, cannot apply Powertools enhancements', {
                    service: 'ObservabilityService',
                    componentType: component.getType(),
                    componentName: component.node.id
                });
                return {
                    instrumentationApplied: false,
                    alarmsCreated: 0,
                    executionTimeMs: Date.now() - startTime
                };
            }
            // Apply Powertools layer
            this.applyPowertoolsLayer(lambdaFunction);
            // Apply environment variables
            this.applyEnvironmentVariables(lambdaFunction, observabilityConfig);
            // Apply IAM permissions
            this.applyIamPermissions(lambdaFunction);
            const executionTime = Date.now() - startTime;
            this.context.logger.info('Lambda Powertools enhancements applied successfully', {
                service: 'ObservabilityService',
                componentType: component.getType(),
                componentName: component.node.id,
                enhancementsApplied: 4, // Layer, env vars, IAM, integration
                executionTimeMs: executionTime
            });
            return {
                instrumentationApplied: true,
                alarmsCreated: 0, // Powertools doesn't create alarms directly
                executionTimeMs: executionTime
            };
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.context.logger.error('Failed to apply Lambda Powertools enhancements', {
                service: 'ObservabilityService',
                componentType: component.getType(),
                componentName: component.node.id,
                error: errorMessage,
                executionTimeMs: executionTime
            });
            return {
                instrumentationApplied: false,
                alarmsCreated: 0,
                executionTimeMs: executionTime,
                error: errorMessage
            };
        }
    }
    /**
     * Apply Powertools layer to Lambda function
     */
    applyPowertoolsLayer(lambdaFunction) {
        const layerArn = this.config.layerArn || this.getPowertoolsLayerArn(lambdaFunction.runtime);
        if (layerArn) {
            lambdaFunction.addLayers(lambda.LayerVersion.fromLayerVersionArn(lambdaFunction, 'PowertoolsLayer', layerArn));
            this.context.logger.info('Powertools layer applied', {
                service: 'ObservabilityService',
                componentName: lambdaFunction.node.id,
                layerArn,
                runtime: lambdaFunction.runtime.name
            });
        }
        else {
            this.context.logger.warn('No Powertools layer available for runtime', {
                service: 'ObservabilityService',
                componentName: lambdaFunction.node.id,
                runtime: lambdaFunction.runtime.name
            });
        }
    }
    /**
     * Apply Powertools environment variables
     */
    applyEnvironmentVariables(lambdaFunction, observabilityConfig) {
        const envVars = {
            'POWERTOOLS_SERVICE_NAME': this.config.serviceName,
            'POWERTOOLS_LOGGER_LOG_LEVEL': this.config.logLevel,
            'POWERTOOLS_LOGGER_SAMPLE_RATE': observabilityConfig.tracesSampling?.toString() || '0',
            'POWERTOOLS_METRICS_NAMESPACE': this.config.metricsNamespace
        };
        // Configure enabled features
        if (this.config.enableLogger) {
            envVars['POWERTOOLS_LOGGER_ENABLED'] = 'true';
        }
        if (this.config.enableTracer) {
            envVars['POWERTOOLS_TRACER_ENABLED'] = 'true';
            envVars['POWERTOOLS_TRACER_CAPTURE_RESPONSE'] = 'true';
            envVars['POWERTOOLS_TRACER_CAPTURE_ERROR'] = 'true';
        }
        if (this.config.enableMetrics) {
            envVars['POWERTOOLS_METRICS_ENABLED'] = 'true';
        }
        // Business metrics configuration
        if (this.config.businessMetrics) {
            envVars['POWERTOOLS_BUSINESS_METRICS_ENABLED'] = 'true';
        }
        // Parameter store configuration
        if (this.config.parameterStore) {
            envVars['POWERTOOLS_PARAMETERS_ENABLED'] = 'true';
        }
        // Audit logging configuration
        if (this.config.auditLogging) {
            envVars['POWERTOOLS_AUDIT_LOGGING_ENABLED'] = 'true';
        }
        // Log event configuration
        if (this.config.logEvent) {
            envVars['POWERTOOLS_LOG_EVENT_ENABLED'] = 'true';
        }
        // OTEL correlation environment variables
        envVars['OTEL_CORRELATION_ENABLED'] = 'true';
        envVars['OTEL_LAMBDA_HANDLER'] = 'index.handler'; // Default handler name
        // Apply environment variables
        Object.entries(envVars).forEach(([key, value]) => {
            lambdaFunction.addEnvironment(key, value);
        });
        this.context.logger.info('Powertools environment variables applied', {
            service: 'ObservabilityService',
            componentName: lambdaFunction.node.id,
            variablesCount: Object.keys(envVars).length
        });
    }
    /**
     * Apply IAM permissions for Powertools utilities
     */
    applyIamPermissions(lambdaFunction) {
        const permissions = [];
        // Basic CloudWatch permissions for metrics and logs
        permissions.push(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
            ],
            resources: ['*']
        }));
        // Business metrics permissions
        if (this.config.businessMetrics) {
            permissions.push(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'cloudwatch:PutMetricData'
                ],
                resources: ['*']
            }));
        }
        // Parameter store permissions
        if (this.config.parameterStore) {
            permissions.push(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'ssm:GetParameter',
                    'ssm:GetParameters',
                    'ssm:GetParametersByPath',
                    'secretsmanager:GetSecretValue',
                    'appconfig:StartConfigurationSession',
                    'appconfig:GetLatestConfiguration'
                ],
                resources: ['*']
            }));
        }
        // Idempotency permissions (requires DynamoDB table)
        if (this.config.enableIdempotency) {
            permissions.push(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'dynamodb:GetItem',
                    'dynamodb:PutItem',
                    'dynamodb:UpdateItem',
                    'dynamodb:DeleteItem'
                ],
                resources: ['*'] // Should be scoped to specific table in production
            }));
            this.context.logger.warn('Powertools Idempotency enabled. Ensure DynamoDB table permissions are properly scoped.', {
                service: 'ObservabilityService',
                componentName: lambdaFunction.node.id
            });
        }
        // Apply permissions
        permissions.forEach(permission => {
            lambdaFunction.addToRolePolicy(permission);
        });
        this.context.logger.info('Powertools IAM permissions applied', {
            service: 'ObservabilityService',
            componentName: lambdaFunction.node.id,
            permissionsCount: permissions.length
        });
    }
    /**
     * Get Powertools layer ARN based on runtime
     */
    getPowertoolsLayerArn(runtime) {
        const region = this.context.region;
        // Layer ARNs for different runtimes (these should be managed by the platform)
        const layerMap = {
            'nodejs18.x': `arn:aws:lambda:${region}:094274105915:layer:AWSLambdaPowertoolsTypeScript:12`,
            'nodejs20.x': `arn:aws:lambda:${region}:094274105915:layer:AWSLambdaPowertoolsTypeScript:12`,
            'python3.9': `arn:aws:lambda:${region}:017000801446:layer:AWSLambdaPowertoolsPythonV2:59`,
            'python3.10': `arn:aws:lambda:${region}:017000801446:layer:AWSLambdaPowertoolsPythonV2:59`,
            'python3.11': `arn:aws:lambda:${region}:017000801446:layer:AWSLambdaPowertoolsPythonV2:59`,
            'python3.12': `arn:aws:lambda:${region}:017000801446:layer:AWSLambdaPowertoolsPythonV2:59`,
            'java11': `arn:aws:lambda:${region}:017000801446:layer:AWSLambdaPowertoolsJava:15`,
            'java17': `arn:aws:lambda:${region}:017000801446:layer:AWSLambdaPowertoolsJava:15`,
            'java21': `arn:aws:lambda:${region}:017000801446:layer:AWSLambdaPowertoolsJava:15`
        };
        return layerMap[runtime.name];
    }
}
//# sourceMappingURL=lambda-powertools-extension.handler.js.map