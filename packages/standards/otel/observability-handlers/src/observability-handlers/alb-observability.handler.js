"use strict";
/**
 * Application Load Balancer Observability Handler
 *
 * Implements CloudWatch alarms for ALB components, providing comprehensive
 * monitoring for response time, unhealthy targets, and HTTP errors.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlbObservabilityHandler = void 0;
var cloudwatch = require("aws-cdk-lib/aws-cloudwatch");
var cdk = require("aws-cdk-lib");
var standards_tagging_1 = require("@shinobi/standards-tagging");
/**
 * Handler for Application Load Balancer component observability
 */
var AlbObservabilityHandler = /** @class */ (function () {
    function AlbObservabilityHandler(context, taggingService) {
        if (taggingService === void 0) { taggingService = standards_tagging_1.defaultTaggingService; }
        this.supportedComponentType = 'application-load-balancer';
        this.context = context;
        this.taggingService = taggingService;
    }
    /**
     * Apply standard tags to a resource
     */
    AlbObservabilityHandler.prototype.applyStandardTags = function (resource, component, additionalTags) {
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
     * Apply CloudWatch alarms to ALB components
     */
    AlbObservabilityHandler.prototype.apply = function (component, config) {
        var startTime = Date.now();
        var instrumentationApplied = false; // ALB doesn't need instrumentation
        var alarmsCreated = 0;
        try {
            // Create CloudWatch alarms for ALB monitoring
            alarmsCreated = this.applyAlbObservability(component, config);
            var executionTime = Date.now() - startTime;
            this.context.logger.info('ALB observability applied successfully', {
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
            this.context.logger.error('Failed to apply ALB observability', {
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
     * Apply Application Load Balancer specific observability
     * Creates alarms for response time, unhealthy targets, and HTTP errors
     */
    AlbObservabilityHandler.prototype.applyAlbObservability = function (component, config) {
        var _a, _b;
        var telemetry = this.getTelemetry(component);
        if (((_a = telemetry === null || telemetry === void 0 ? void 0 : telemetry.alarms) === null || _a === void 0 ? void 0 : _a.length) || ((_b = telemetry === null || telemetry === void 0 ? void 0 : telemetry.dashboards) === null || _b === void 0 ? void 0 : _b.length)) {
            this.context.logger.debug('Telemetry directives detected for ALB; skipping legacy alarm synthesis', {
                service: 'ObservabilityService',
                componentType: component.getType(),
                componentName: component.node.id
            });
            return 0;
        }
        var loadBalancer = component.getConstruct('loadBalancer');
        if (!loadBalancer) {
            this.context.logger.warn('ALB component has no loadBalancer construct registered', {
                service: 'ObservabilityService'
            });
            return 0;
        }
        var alarmCount = 0;
        var complianceFramework = this.context.complianceFramework;
        var loadBalancerName = loadBalancer.loadBalancerName || component.node.id;
        var albThresholds = config.alarmThresholds.alb;
        // Response time alarm
        var responseTimeAlarm = new cloudwatch.Alarm(component, 'AlbResponseTimeAlarm', {
            alarmName: "".concat(this.context.serviceName, "-").concat(component.node.id, "-response-time"),
            alarmDescription: 'ALB response time is high',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ApplicationELB',
                metricName: 'TargetResponseTime',
                statistic: 'Average',
                period: cdk.Duration.minutes(5),
                dimensionsMap: {
                    LoadBalancer: loadBalancerName
                }
            }),
            threshold: albThresholds.responseTime,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
        });
        // Apply standard tags to the alarm
        this.applyStandardTags(responseTimeAlarm, component);
        alarmCount++;
        // HTTP 5xx errors alarm
        var http5xxAlarm = new cloudwatch.Alarm(component, 'AlbHttp5xxErrorsAlarm', {
            alarmName: "".concat(this.context.serviceName, "-").concat(component.node.id, "-http-5xx-errors"),
            alarmDescription: 'ALB is generating HTTP 5xx errors',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ApplicationELB',
                metricName: 'HTTPCode_ELB_5XX_Count',
                statistic: 'Sum',
                period: cdk.Duration.minutes(5),
                dimensionsMap: {
                    LoadBalancer: loadBalancerName
                }
            }),
            threshold: albThresholds.http5xxErrors,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
        });
        // Apply standard tags to the alarm
        this.applyStandardTags(http5xxAlarm, component);
        alarmCount++;
        // Unhealthy target count alarm
        var unhealthyTargetsAlarm = new cloudwatch.Alarm(component, 'AlbUnhealthyTargetsAlarm', {
            alarmName: "".concat(this.context.serviceName, "-").concat(component.node.id, "-unhealthy-targets"),
            alarmDescription: 'ALB has unhealthy targets',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ApplicationELB',
                metricName: 'UnHealthyHostCount',
                statistic: 'Average',
                period: cdk.Duration.minutes(5),
                dimensionsMap: {
                    LoadBalancer: loadBalancerName
                }
            }),
            threshold: albThresholds.unhealthyTargets,
            evaluationPeriods: 3,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
        });
        // Apply standard tags to the alarm
        this.applyStandardTags(unhealthyTargetsAlarm, component);
        alarmCount++;
        // HTTP 4xx errors alarm for compliance frameworks
        if (complianceFramework === 'fedramp-moderate' || complianceFramework === 'fedramp-high') {
            var http4xxAlarm = new cloudwatch.Alarm(component, 'AlbHttp4xxErrorsAlarm', {
                alarmName: "".concat(this.context.serviceName, "-").concat(component.node.id, "-http-4xx-errors"),
                alarmDescription: 'ALB is generating excessive HTTP 4xx errors - potential security issue',
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/ApplicationELB',
                    metricName: 'HTTPCode_ELB_4XX_Count',
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5),
                    dimensionsMap: {
                        LoadBalancer: loadBalancerName
                    }
                }),
                threshold: complianceFramework === 'fedramp-high' ? 50 : 100,
                evaluationPeriods: 2,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
            });
            // Apply standard tags to the alarm
            this.applyStandardTags(http4xxAlarm, component);
            alarmCount++;
        }
        // Target response time alarm for compliance frameworks
        if (complianceFramework === 'fedramp-moderate' || complianceFramework === 'fedramp-high') {
            var targetResponseTimeAlarm = new cloudwatch.Alarm(component, 'AlbTargetResponseTimeAlarm', {
                alarmName: "".concat(this.context.serviceName, "-").concat(component.node.id, "-target-response-time"),
                alarmDescription: 'ALB target response time exceeds compliance threshold',
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/ApplicationELB',
                    metricName: 'TargetResponseTime',
                    statistic: 'Average',
                    period: cdk.Duration.minutes(5),
                    dimensionsMap: {
                        LoadBalancer: loadBalancerName
                    }
                }),
                threshold: complianceFramework === 'fedramp-high' ? 1 : 2, // 1s for high, 2s for moderate
                evaluationPeriods: 3,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
            });
            // Apply standard tags to the alarm
            this.applyStandardTags(targetResponseTimeAlarm, component);
            alarmCount++;
        }
        // Request count alarm for high compliance
        if (complianceFramework === 'fedramp-high') {
            var requestCountAlarm = new cloudwatch.Alarm(component, 'AlbRequestCountAlarm', {
                alarmName: "".concat(this.context.serviceName, "-").concat(component.node.id, "-request-count"),
                alarmDescription: 'ALB request count monitoring for high compliance',
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/ApplicationELB',
                    metricName: 'RequestCount',
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5),
                    dimensionsMap: {
                        LoadBalancer: loadBalancerName
                    }
                }),
                threshold: 10000, // Alert if more than 10k requests in 5 minutes
                evaluationPeriods: 2,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
            });
            // Apply standard tags to the alarm
            this.applyStandardTags(requestCountAlarm, component);
            alarmCount++;
        }
        return alarmCount;
    };
    AlbObservabilityHandler.prototype.getTelemetry = function (component) {
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
            this.context.logger.debug('Unable to inspect component telemetry for ALB handler', {
                service: 'ObservabilityService',
                componentType: component.getType(),
                componentName: component.node.id,
                error: error.message
            });
        }
        return undefined;
    };
    return AlbObservabilityHandler;
}());
exports.AlbObservabilityHandler = AlbObservabilityHandler;
//# sourceMappingURL=alb-observability.handler.js.map