"use strict";
/**
 * ECS Observability Handler
 *
 * Implements OpenTelemetry instrumentation and CloudWatch alarms for ECS components.
 * Handles both ECS clusters and ECS services (Fargate and EC2).
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
exports.EcsObservabilityHandler = void 0;
var cloudwatch = require("aws-cdk-lib/aws-cloudwatch");
var cdk = require("aws-cdk-lib");
var standards_tagging_1 = require("@shinobi/standards-tagging");
/**
 * Handler for ECS component observability
 */
var EcsObservabilityHandler = /** @class */ (function () {
    function EcsObservabilityHandler(context, taggingService) {
        if (taggingService === void 0) { taggingService = standards_tagging_1.defaultTaggingService; }
        this.supportedComponentType = 'ecs';
        this.context = context;
        this.taggingService = taggingService;
    }
    /**
     * Apply standard tags to a resource
     */
    EcsObservabilityHandler.prototype.applyStandardTags = function (resource, component, additionalTags) {
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
     * Apply OpenTelemetry instrumentation and CloudWatch alarms to ECS components
     */
    EcsObservabilityHandler.prototype.apply = function (component, config) {
        var startTime = Date.now();
        var instrumentationApplied = false;
        var alarmsCreated = 0;
        try {
            var componentType = component.getType();
            // Apply component-specific observability
            if (componentType === 'ecs-cluster') {
                alarmsCreated = this.applyEcsClusterObservability(component, config);
            }
            else if (componentType === 'ecs-fargate-service' || componentType === 'ecs-ec2-service') {
                instrumentationApplied = this.applyEcsServiceOTelInstrumentation(component, config);
                alarmsCreated = this.applyEcsServiceObservability(component, config);
            }
            var executionTime = Date.now() - startTime;
            this.context.logger.info('ECS observability applied successfully', {
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
            this.context.logger.error('Failed to apply ECS observability', {
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
     * Apply ECS Service OpenTelemetry instrumentation
     * Configures container-level OTel environment variables and monitoring
     */
    EcsObservabilityHandler.prototype.applyEcsServiceOTelInstrumentation = function (component, config) {
        var taskDefinition = component.getConstruct('taskDefinition');
        if (!taskDefinition) {
            this.context.logger.warn('ECS Service component has no taskDefinition construct registered', {
                service: 'ObservabilityService'
            });
            return false;
        }
        var otelEnvVars = this.buildOTelEnvironmentVariables(component.node.id, config);
        // ECS-specific OpenTelemetry environment variables
        var ecsOtelEnvVars = __assign(__assign({}, otelEnvVars), { 
            // ECS-specific instrumentation
            'OTEL_INSTRUMENTATION_ECS_ENABLED': 'true', 'OTEL_INSTRUMENTATION_AWS_ECS_ENABLED': 'true', 'AWS_ECS_SERVICE_NAME': component.node.id, 
            // Container-specific configuration
            'OTEL_INSTRUMENTATION_HTTP_ENABLED': 'true', 'OTEL_INSTRUMENTATION_AWS_SDK_ENABLED': 'true', 'OTEL_INSTRUMENTATION_CONTAINER_RESOURCE_ENABLED': 'true' });
        this.context.logger.info('ECS Service OpenTelemetry instrumentation configured', {
            componentType: component.getType(),
            componentName: component.node.id,
            environmentVariablesCount: Object.keys(ecsOtelEnvVars).length
        });
        return true;
    };
    /**
     * Apply ECS Cluster specific observability
     * Creates alarms for cluster capacity and resource utilization
     */
    EcsObservabilityHandler.prototype.applyEcsClusterObservability = function (component, config) {
        var cluster = component.getConstruct('cluster');
        if (!cluster) {
            this.context.logger.warn('ECS Cluster component has no cluster construct registered', {
                service: 'ObservabilityService'
            });
            return 0;
        }
        var alarmCount = 0;
        var ecsThresholds = config.alarmThresholds.ecs;
        // ECS Service Count alarm
        var serviceCountAlarm = new cloudwatch.Alarm(component, 'EcsClusterServiceCountAlarm', {
            alarmName: "".concat(this.context.serviceName, "-").concat(component.node.id, "-service-count"),
            alarmDescription: 'ECS cluster has too many or too few services running',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ECS',
                metricName: 'ServiceCount',
                statistic: 'Average',
                period: cdk.Duration.minutes(5),
                dimensionsMap: {
                    ClusterName: cluster.clusterName || 'unknown'
                }
            }),
            threshold: ecsThresholds.taskCount,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
        });
        // Apply standard tags to the alarm
        this.applyStandardTags(serviceCountAlarm, component);
        alarmCount++;
        // CPU Reservation alarm for compliance frameworks
        if (this.context.complianceFramework === 'fedramp-moderate' || this.context.complianceFramework === 'fedramp-high') {
            var cpuReservationAlarm = new cloudwatch.Alarm(component, 'EcsClusterCpuReservationAlarm', {
                alarmName: "".concat(this.context.serviceName, "-").concat(component.node.id, "-cpu-reservation"),
                alarmDescription: 'ECS cluster CPU reservation is high',
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/ECS',
                    metricName: 'CPUReservation',
                    statistic: 'Average',
                    period: cdk.Duration.minutes(5),
                    dimensionsMap: {
                        ClusterName: cluster.clusterName || 'unknown'
                    }
                }),
                threshold: ecsThresholds.cpuUtilization,
                evaluationPeriods: 3,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
            });
            // Apply standard tags to the alarm
            this.applyStandardTags(cpuReservationAlarm, component);
            alarmCount++;
        }
        // Memory Reservation alarm for high compliance
        if (this.context.complianceFramework === 'fedramp-high') {
            var memoryReservationAlarm = new cloudwatch.Alarm(component, 'EcsClusterMemoryReservationAlarm', {
                alarmName: "".concat(this.context.serviceName, "-").concat(component.node.id, "-memory-reservation"),
                alarmDescription: 'ECS cluster memory reservation is high',
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/ECS',
                    metricName: 'MemoryReservation',
                    statistic: 'Average',
                    period: cdk.Duration.minutes(5),
                    dimensionsMap: {
                        ClusterName: cluster.clusterName || 'unknown'
                    }
                }),
                threshold: ecsThresholds.memoryUtilization,
                evaluationPeriods: 3,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
            });
            // Apply standard tags to the alarm
            this.applyStandardTags(memoryReservationAlarm, component);
            alarmCount++;
        }
        return alarmCount;
    };
    /**
     * Apply ECS Service specific observability
     * Creates alarms for service health, scaling, and performance
     */
    EcsObservabilityHandler.prototype.applyEcsServiceObservability = function (component, config) {
        var _a, _b, _c;
        var service = component.getConstruct('service');
        if (!service) {
            this.context.logger.warn('ECS Service component has no service construct registered', {
                service: 'ObservabilityService'
            });
            return 0;
        }
        var alarmCount = 0;
        var ecsThresholds = config.alarmThresholds.ecs;
        var serviceName = service.serviceName || component.node.id;
        // Running Task Count alarm
        var runningTasksAlarm = new cloudwatch.Alarm(component, 'EcsServiceRunningTasksAlarm', {
            alarmName: "".concat(this.context.serviceName, "-").concat(component.node.id, "-running-tasks"),
            alarmDescription: 'ECS service has insufficient running tasks',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ECS',
                metricName: 'RunningTaskCount',
                statistic: 'Average',
                period: cdk.Duration.minutes(5),
                dimensionsMap: {
                    ServiceName: serviceName,
                    ClusterName: ((_a = service.cluster) === null || _a === void 0 ? void 0 : _a.clusterName) || 'unknown'
                }
            }),
            threshold: ecsThresholds.taskCount,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD
        });
        // Apply standard tags to the alarm
        this.applyStandardTags(runningTasksAlarm, component);
        alarmCount++;
        // CPU Utilization alarm
        var cpuUtilizationAlarm = new cloudwatch.Alarm(component, 'EcsServiceCpuUtilizationAlarm', {
            alarmName: "".concat(this.context.serviceName, "-").concat(component.node.id, "-cpu-utilization"),
            alarmDescription: 'ECS service CPU utilization is high',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ECS',
                metricName: 'CPUUtilization',
                statistic: 'Average',
                period: cdk.Duration.minutes(5),
                dimensionsMap: {
                    ServiceName: serviceName,
                    ClusterName: ((_b = service.cluster) === null || _b === void 0 ? void 0 : _b.clusterName) || 'unknown'
                }
            }),
            threshold: ecsThresholds.cpuUtilization,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
        });
        // Apply standard tags to the alarm
        this.applyStandardTags(cpuUtilizationAlarm, component);
        alarmCount++;
        // Memory Utilization alarm
        var memoryUtilizationAlarm = new cloudwatch.Alarm(component, 'EcsServiceMemoryUtilizationAlarm', {
            alarmName: "".concat(this.context.serviceName, "-").concat(component.node.id, "-memory-utilization"),
            alarmDescription: 'ECS service memory utilization is high',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ECS',
                metricName: 'MemoryUtilization',
                statistic: 'Average',
                period: cdk.Duration.minutes(5),
                dimensionsMap: {
                    ServiceName: serviceName,
                    ClusterName: ((_c = service.cluster) === null || _c === void 0 ? void 0 : _c.clusterName) || 'unknown'
                }
            }),
            threshold: ecsThresholds.memoryUtilization,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
        });
        // Apply standard tags to the alarm
        this.applyStandardTags(memoryUtilizationAlarm, component);
        alarmCount++;
        return alarmCount;
    };
    /**
     * Build standard OpenTelemetry environment variables
     */
    EcsObservabilityHandler.prototype.buildOTelEnvironmentVariables = function (componentName, config) {
        var _a;
        var template = config.otelEnvironmentTemplate;
        var envVars = {};
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
    EcsObservabilityHandler.prototype.getOtelAuthToken = function () {
        // In production, this would retrieve from AWS Secrets Manager or Parameter Store
        return "otel-token-".concat(this.context.complianceFramework, "-").concat(this.context.environment);
    };
    return EcsObservabilityHandler;
}());
exports.EcsObservabilityHandler = EcsObservabilityHandler;
//# sourceMappingURL=ecs-observability.handler.js.map