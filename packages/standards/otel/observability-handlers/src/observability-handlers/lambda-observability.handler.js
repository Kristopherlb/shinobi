"use strict";
/**
 * Lambda Observability Handler
 *
 * Implements OpenTelemetry instrumentation and CloudWatch alarms for Lambda components.
 * Handles both lambda-api and lambda-worker component types.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LambdaObservabilityHandler = void 0;
var cloudwatch = require("aws-cdk-lib/aws-cloudwatch");
var lambda = require("aws-cdk-lib/aws-lambda");
var iam = require("aws-cdk-lib/aws-iam");
var cdk = require("aws-cdk-lib");
var standards_tagging_1 = require("@shinobi/standards-tagging");
/**
 * Handler for Lambda component observability
 */
var LambdaObservabilityHandler = /** @class */ (function () {
    function LambdaObservabilityHandler(context, taggingService) {
        if (taggingService === void 0) { taggingService = standards_tagging_1.defaultTaggingService; }
        this.supportedComponentType = 'lambda';
        this.context = context;
        this.taggingService = taggingService;
    }
    /**
     * Apply standard tags to a resource
     */
    LambdaObservabilityHandler.prototype.applyStandardTags = function (resource, component, additionalTags) {
        var taggingContext = {
            serviceName: this.context.serviceName,
            serviceLabels: this.context.serviceLabels,
            componentName: component.node.id,
            componentType: 'lambda',
            environment: this.context.environment,
            complianceFramework: this.context.complianceFramework,
            region: this.context.region,
            accountId: undefined
        };
        this.taggingService.applyStandardTags(resource, taggingContext, additionalTags);
    };
    /**
     * Apply OpenTelemetry instrumentation and CloudWatch alarms to Lambda components
     */
    LambdaObservabilityHandler.prototype.apply = function (component, config) {
        var _a;
        var startTime = Date.now();
        var instrumentationApplied = false;
        var alarmsCreated = 0;
        var telemetry = this.getTelemetry(component);
        try {
            // Apply OpenTelemetry instrumentation
            instrumentationApplied = this.applyLambdaOTelInstrumentation(component, config);
            // Create CloudWatch alarms
            if (!((_a = telemetry === null || telemetry === void 0 ? void 0 : telemetry.alarms) === null || _a === void 0 ? void 0 : _a.length)) {
                alarmsCreated = this.applyLambdaObservability(component, config);
            }
            else {
                this.context.logger.debug('Telemetry directives detected for Lambda component; skipping legacy alarm synthesis', {
                    service: 'ObservabilityService',
                    componentType: component.getType(),
                    componentName: component.node.id
                });
            }
            var executionTime = Date.now() - startTime;
            this.context.logger.info('Lambda observability applied successfully', {
                service: 'ObservabilityService',
                componentType: component.getType(),
                componentName: component.node.id,
                alarmsCreated: alarmsCreated,
                instrumentationApplied: instrumentationApplied,
                executionTimeMs: executionTime
            });
            return {
                instrumentationApplied: instrumentationApplied,
                alarmsCreated: alarmsCreated,
                executionTimeMs: executionTime
            };
        }
        catch (error) {
            var executionTime = Date.now() - startTime;
            this.context.logger.error('Failed to apply Lambda observability', {
                service: 'ObservabilityService',
                componentType: component.getType(),
                componentName: component.node.id,
                executionTimeMs: executionTime,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    };
    /**
     * Apply Lambda-specific OpenTelemetry instrumentation
     * Implements Platform OpenTelemetry Observability Standard v1.0 Section 5.1
     */
    LambdaObservabilityHandler.prototype.applyLambdaOTelInstrumentation = function (component, config) {
        var lambdaFunction = component.getConstruct('function');
        if (!lambdaFunction) {
            this.context.logger.warn('Lambda component has no function construct registered', {
                service: 'ObservabilityService',
                componentType: 'lambda',
                componentName: component.node.id
            });
            return false;
        }
        // Build OTel environment variables from config template
        var otelEnvVars = this.buildOTelEnvironmentVariables(component.node.id, config);
        // Add Lambda-specific OTel environment variables
        var lambdaOtelEnvVars = __assign(__assign({}, otelEnvVars), { 
            // Lambda-specific instrumentation
            'OTEL_INSTRUMENTATION_AWS_LAMBDA_ENABLED': 'true', 'OTEL_INSTRUMENTATION_AWS_LAMBDA_FLUSH_TIMEOUT': '30000', 'AWS_LAMBDA_EXEC_WRAPPER': '/opt/otel-instrument', '_X_AMZN_TRACE_ID': 'Root=1-00000000-000000000000000000000000', 
            // Runtime-specific configuration
            'OTEL_INSTRUMENTATION_HTTP_ENABLED': 'true', 'OTEL_INSTRUMENTATION_AWS_SDK_ENABLED': 'true' });
        // Apply environment variables to Lambda function
        Object.entries(lambdaOtelEnvVars).forEach(function (_a) {
            var key = _a[0], value = _a[1];
            lambdaFunction.addEnvironment(key, value);
        });
        // Add OpenTelemetry Lambda layer based on runtime
        var otelLayerArn = this.getOTelLambdaLayerArn(lambdaFunction.runtime);
        if (otelLayerArn) {
            lambdaFunction.addLayers(lambda.LayerVersion.fromLayerVersionArn(component, 'OTelLayer', otelLayerArn));
        }
        // Enable X-Ray tracing for distributed trace collection
        lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
            resources: ['*']
        }));
        return true;
    };
    /**
     * Apply Lambda specific observability alarms
     */
    LambdaObservabilityHandler.prototype.applyLambdaObservability = function (component, config) {
        var lambdaFunction = component.getConstruct('function');
        if (!lambdaFunction) {
            this.context.logger.warn('Lambda component has no function construct registered', {
                service: 'ObservabilityService'
            });
            return 0;
        }
        var alarmCount = 0;
        var lambdaThresholds = config.alarmThresholds.lambda;
        // Lambda Error Rate alarm
        var errorRateAlarm = new cloudwatch.Alarm(component, 'LambdaErrorRate', {
            alarmName: "".concat(this.context.serviceName, "-").concat(component.node.id, "-error-rate"),
            alarmDescription: 'Lambda function error rate exceeds threshold',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/Lambda',
                metricName: 'Errors',
                statistic: 'Sum',
                period: cdk.Duration.minutes(5),
                dimensionsMap: {
                    FunctionName: lambdaFunction.functionName || 'unknown'
                }
            }),
            threshold: lambdaThresholds.errorRate,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
        });
        // Apply standard tags to the alarm
        this.applyStandardTags(errorRateAlarm, component);
        alarmCount++;
        // Lambda Duration alarm for compliance frameworks
        if (this.context.complianceFramework === 'fedramp-moderate' || this.context.complianceFramework === 'fedramp-high') {
            var durationAlarm = new cloudwatch.Alarm(component, 'LambdaDuration', {
                alarmName: "".concat(this.context.serviceName, "-").concat(component.node.id, "-duration"),
                alarmDescription: 'Lambda function duration exceeds threshold',
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/Lambda',
                    metricName: 'Duration',
                    statistic: 'Average',
                    period: cdk.Duration.minutes(5),
                    dimensionsMap: {
                        FunctionName: lambdaFunction.functionName || 'unknown'
                    }
                }),
                threshold: lambdaThresholds.duration,
                evaluationPeriods: 2,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
            });
            // Apply standard tags to the alarm
            this.applyStandardTags(durationAlarm, component);
            alarmCount++;
        }
        return alarmCount;
    };
    /**
     * Build standard OpenTelemetry environment variables from config template
     */
    LambdaObservabilityHandler.prototype.buildOTelEnvironmentVariables = function (componentName, config) {
        var _a;
        var template = config.otelEnvironmentTemplate;
        var envVars = {};
        // Determine cloud provider - this is an AWS CDK library, so always AWS
        var cloudProvider = 'aws';
        for (var _i = 0, _b = Object.entries(template); _i < _b.length; _i++) {
            var _c = _b[_i], key = _c[0], value = _c[1];
            envVars[key] = value
                .replace('{{ region }}', this.context.region)
                .replace('{{ authToken }}', this.getOtelAuthToken())
                .replace('{{ componentName }}', componentName)
                .replace('{{ serviceVersion }}', ((_a = this.context.serviceLabels) === null || _a === void 0 ? void 0 : _a.version) || '1.0.0')
                .replace('{{ serviceName }}', this.context.serviceName)
                .replace('{{ environment }}', this.context.environment)
                .replace('{{ cloudProvider }}', cloudProvider)
                .replace('{{ complianceFramework }}', this.context.complianceFramework)
                .replace('{{ traceSamplingRate }}', config.traceSamplingRate.toString())
                .replace('{{ metricsInterval }}', config.metricsInterval.toString());
        }
        return envVars;
    };
    /**
     * Get OpenTelemetry authentication token for the compliance framework
     */
    LambdaObservabilityHandler.prototype.getOtelAuthToken = function () {
        // In production, this would retrieve from AWS Secrets Manager or Parameter Store
        return "otel-token-".concat(this.context.complianceFramework, "-").concat(this.context.environment);
    };
    /**
     * Get OpenTelemetry Lambda layer ARN based on runtime
     */
    LambdaObservabilityHandler.prototype.getOTelLambdaLayerArn = function (runtime) {
        var region = this.context.region;
        // OpenTelemetry Lambda layers (these ARNs would be managed in configuration)
        var layerMap = {
            'nodejs18.x': "arn:aws:lambda:".concat(region, ":901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:1"),
            'nodejs20.x': "arn:aws:lambda:".concat(region, ":901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:1"),
            'python3.9': "arn:aws:lambda:".concat(region, ":901920570463:layer:aws-otel-python-amd64-ver-1-20-0:1"),
            'python3.10': "arn:aws:lambda:".concat(region, ":901920570463:layer:aws-otel-python-amd64-ver-1-20-0:1"),
            'python3.11': "arn:aws:lambda:".concat(region, ":901920570463:layer:aws-otel-python-amd64-ver-1-20-0:1"),
            'java11': "arn:aws:lambda:".concat(region, ":901920570463:layer:aws-otel-java-wrapper-amd64-ver-1-31-0:1"),
            'java17': "arn:aws:lambda:".concat(region, ":901920570463:layer:aws-otel-java-wrapper-amd64-ver-1-31-0:1")
        };
        return layerMap[runtime.name];
    };
    LambdaObservabilityHandler.prototype.getTelemetry = function (component) {
        try {
            var capabilities = component.getCapabilities();
            for (var _i = 0, _a = Object.entries(capabilities); _i < _a.length; _i++) {
                var _b = _a[_i], key = _b[0], value = _b[1];
                if (key.startsWith('observability:') && value && typeof value === 'object' && 'telemetry' in value) {
                    return value.telemetry;
                }
            }
        }
        catch (error) {
            this.context.logger.debug('Unable to inspect component telemetry for Lambda handler', {
                service: 'ObservabilityService',
                componentType: component.getType(),
                componentName: component.node.id,
                error: error.message
            });
        }
        return undefined;
    };
    return LambdaObservabilityHandler;
}());
exports.LambdaObservabilityHandler = LambdaObservabilityHandler;
//# sourceMappingURL=lambda-observability.handler.js.map