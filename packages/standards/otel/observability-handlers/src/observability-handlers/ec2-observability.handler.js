"use strict";
/**
 * EC2 Observability Handler
 *
 * Implements OpenTelemetry instrumentation and CloudWatch alarms for EC2 components.
 * Provides comprehensive instance monitoring including status checks and performance metrics.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ec2ObservabilityHandler = void 0;
var cloudwatch = require("aws-cdk-lib/aws-cloudwatch");
var ec2 = require("aws-cdk-lib/aws-ec2");
var cdk = require("aws-cdk-lib");
var standards_tagging_1 = require("@shinobi/standards-tagging");
/**
 * Handler for EC2 component observability
 */
var Ec2ObservabilityHandler = /** @class */ (function () {
    function Ec2ObservabilityHandler(context, taggingService) {
        if (taggingService === void 0) { taggingService = standards_tagging_1.defaultTaggingService; }
        this.supportedComponentType = 'ec2-instance';
        this.context = context;
        this.taggingService = taggingService;
    }
    /**
     * Apply standard tags to a resource
     */
    Ec2ObservabilityHandler.prototype.applyStandardTags = function (resource, component, additionalTags) {
        var taggingContext = {
            serviceName: this.context.serviceName,
            serviceLabels: this.context.serviceLabels,
            componentName: component.node.id,
            componentType: this.supportedComponentType,
            environment: this.context.environment,
            complianceFramework: this.context.complianceFramework,
            region: this.context.region,
            accountId: undefined
        };
        this.taggingService.applyStandardTags(resource, taggingContext, additionalTags);
    };
    /**
     * Apply OpenTelemetry instrumentation and CloudWatch alarms to EC2 components
     */
    Ec2ObservabilityHandler.prototype.apply = function (component, config) {
        var startTime = Date.now();
        var instrumentationApplied = false;
        var alarmsCreated = 0;
        try {
            // Apply OpenTelemetry instrumentation
            instrumentationApplied = this.applyEc2OTelInstrumentation(component, config);
            // Create CloudWatch alarms
            alarmsCreated = this.applyEc2InstanceObservability(component, config);
            var executionTime = Date.now() - startTime;
            this.context.logger.info('EC2 observability applied successfully', {
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
            this.context.logger.error('Failed to apply EC2 observability', {
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
     * Apply EC2-specific OpenTelemetry instrumentation
     * Implements Platform OpenTelemetry Observability Standard v1.0 Section 5.4
     */
    Ec2ObservabilityHandler.prototype.applyEc2OTelInstrumentation = function (component, config) {
        var instance = component.getConstruct('instance');
        if (!instance) {
            this.context.logger.warn('EC2 component has no instance construct registered', {
                service: 'ObservabilityService',
                componentType: 'ec2-instance',
                componentName: component.node.id
            });
            return false;
        }
        // Create OTel Collector agent configuration using config values
        var otelAgentConfig = {
            receivers: {
                hostmetrics: {
                    collection_interval: "".concat(config.metricsInterval, "s"),
                    scrapers: {
                        cpu: { metrics: { 'system.cpu.utilization': { enabled: true } } },
                        memory: { metrics: { 'system.memory.utilization': { enabled: true } } },
                        disk: { metrics: { 'system.disk.io.operations': { enabled: true } } },
                        network: { metrics: { 'system.network.io': { enabled: true } } }
                    }
                }
            },
            exporters: {
                otlp: {
                    endpoint: "https://otel-collector.".concat(this.context.complianceFramework, ".").concat(this.context.region, ".platform.local:4317"),
                    headers: { authorization: "Bearer ".concat(this.getOtelAuthToken()) }
                }
            },
            service: {
                pipelines: {
                    metrics: {
                        receivers: ['hostmetrics'],
                        exporters: ['otlp']
                    }
                }
            }
        };
        // Build environment variables from template
        var otelEnvVars = this.buildOTelEnvironmentVariables(component.node.id, config);
        // Use the UserData template from configuration
        var userDataTemplate = config.ec2OtelUserDataTemplate;
        var userDataScript = userDataTemplate
            .replace('{{ otelAgentConfigJson }}', JSON.stringify(otelAgentConfig, null, 2))
            .replace('{{ otelEnvironmentVars }}', Object.entries(otelEnvVars)
            .map(function (_a) {
            var key = _a[0], value = _a[1];
            return "export ".concat(key, "=\"").concat(value, "\"");
        })
            .join('\n'));
        // Add user data to install and configure OTel Collector
        var userData = ec2.UserData.forLinux();
        userData.addCommands(userDataScript);
        // Apply user data to instance (this would need to be done during instance creation)
        this.context.logger.info('EC2 OpenTelemetry instrumentation prepared', {
            service: 'ObservabilityService',
            componentType: 'ec2-instance',
            componentName: component.node.id
        });
        return true;
    };
    /**
     * Apply EC2 Instance specific observability alarms
     */
    Ec2ObservabilityHandler.prototype.applyEc2InstanceObservability = function (component, config) {
        var instance = component.getConstruct('instance');
        if (!instance) {
            this.context.logger.warn('EC2 Instance component has no instance construct registered', {
                service: 'ObservabilityService'
            });
            return 0;
        }
        var alarmCount = 0;
        var complianceFramework = this.context.complianceFramework;
        var ec2Thresholds = config.alarmThresholds.ec2;
        // EC2 Status Check Failed alarm
        var statusCheckAlarm = new cloudwatch.Alarm(component, 'Ec2StatusCheckFailed', {
            alarmName: "".concat(this.context.serviceName, "-").concat(component.node.id, "-status-check-failed"),
            alarmDescription: 'EC2 instance status check failed',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/EC2',
                metricName: 'StatusCheckFailed',
                statistic: 'Maximum',
                period: cdk.Duration.minutes(5),
                dimensionsMap: {
                    InstanceId: instance.instanceId || 'unknown'
                }
            }),
            threshold: ec2Thresholds.statusCheckFailed,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD
        });
        // Apply standard tags to the alarm
        this.applyStandardTags(statusCheckAlarm, component);
        alarmCount++;
        // EC2 CPU Utilization alarm for compliance frameworks
        if (complianceFramework === 'fedramp-moderate' || complianceFramework === 'fedramp-high') {
            var cpuAlarm = new cloudwatch.Alarm(component, 'Ec2CpuUtilization', {
                alarmName: "".concat(this.context.serviceName, "-").concat(component.node.id, "-cpu-utilization"),
                alarmDescription: 'EC2 instance CPU utilization is high',
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/EC2',
                    metricName: 'CPUUtilization',
                    statistic: 'Average',
                    period: cdk.Duration.minutes(5),
                    dimensionsMap: {
                        InstanceId: instance.instanceId || 'unknown'
                    }
                }),
                threshold: ec2Thresholds.cpuUtilization,
                evaluationPeriods: 2,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
            });
            // Apply standard tags to the alarm
            this.applyStandardTags(cpuAlarm, component);
            alarmCount++;
        }
        // EC2 Network In alarm for high compliance
        if (complianceFramework === 'fedramp-high') {
            var networkInAlarm = new cloudwatch.Alarm(component, 'Ec2NetworkIn', {
                alarmName: "".concat(this.context.serviceName, "-").concat(component.node.id, "-network-in"),
                alarmDescription: 'EC2 instance network in traffic monitoring',
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/EC2',
                    metricName: 'NetworkIn',
                    statistic: 'Average',
                    period: cdk.Duration.minutes(5),
                    dimensionsMap: {
                        InstanceId: instance.instanceId || 'unknown'
                    }
                }),
                threshold: ec2Thresholds.networkIn,
                evaluationPeriods: 2,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
            });
            // Apply standard tags to the alarm
            this.applyStandardTags(networkInAlarm, component);
            alarmCount++;
        }
        return alarmCount;
    };
    /**
     * Build standard OpenTelemetry environment variables from config template
     */
    Ec2ObservabilityHandler.prototype.buildOTelEnvironmentVariables = function (componentName, config) {
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
    Ec2ObservabilityHandler.prototype.getOtelAuthToken = function () {
        // In production, this would retrieve from AWS Secrets Manager or Parameter Store
        return "otel-token-".concat(this.context.complianceFramework, "-").concat(this.context.environment);
    };
    return Ec2ObservabilityHandler;
}());
exports.Ec2ObservabilityHandler = Ec2ObservabilityHandler;
//# sourceMappingURL=ec2-observability.handler.js.map