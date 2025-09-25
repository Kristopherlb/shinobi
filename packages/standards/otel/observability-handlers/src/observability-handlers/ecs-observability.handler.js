"use strict";
/**
 * ECS Observability Handler
 *
 * Implements OpenTelemetry instrumentation and CloudWatch alarms for ECS components.
 * Handles both ECS clusters and ECS services (Fargate and EC2).
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
exports.EcsObservabilityHandler = void 0;
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cdk = __importStar(require("aws-cdk-lib"));
const standards_tagging_1 = require("@shinobi/standards-tagging");
/**
 * Handler for ECS component observability
 */
class EcsObservabilityHandler {
    supportedComponentType = 'ecs';
    context;
    taggingService;
    constructor(context, taggingService = standards_tagging_1.defaultTaggingService) {
        this.context = context;
        this.taggingService = taggingService;
    }
    /**
     * Apply standard tags to a resource
     */
    applyStandardTags(resource, component, additionalTags) {
        const taggingContext = {
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
    }
    /**
     * Apply OpenTelemetry instrumentation and CloudWatch alarms to ECS components
     */
    apply(component, config) {
        const startTime = Date.now();
        let instrumentationApplied = false;
        let alarmsCreated = 0;
        try {
            const componentType = component.getType();
            // Apply component-specific observability
            if (componentType === 'ecs-cluster') {
                alarmsCreated = this.applyEcsClusterObservability(component, config);
            }
            else if (componentType === 'ecs-fargate-service' || componentType === 'ecs-ec2-service') {
                instrumentationApplied = this.applyEcsServiceOTelInstrumentation(component, config);
                alarmsCreated = this.applyEcsServiceObservability(component, config);
            }
            const executionTime = Date.now() - startTime;
            this.context.logger.info('ECS observability applied successfully', {
                service: 'ObservabilityService',
                componentType: component.getType(),
                componentName: component.node.id,
                alarmsCreated,
                instrumentationApplied,
                executionTimeMs: executionTime
            });
            return {
                instrumentationApplied,
                alarmsCreated,
                executionTimeMs: executionTime
            };
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
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
    }
    /**
     * Apply ECS Service OpenTelemetry instrumentation
     * Configures container-level OTel environment variables and monitoring
     */
    applyEcsServiceOTelInstrumentation(component, config) {
        const taskDefinition = component.getConstruct('taskDefinition');
        if (!taskDefinition) {
            this.context.logger.warn('ECS Service component has no taskDefinition construct registered', {
                service: 'ObservabilityService'
            });
            return false;
        }
        const otelEnvVars = this.buildOTelEnvironmentVariables(component.node.id, config);
        // ECS-specific OpenTelemetry environment variables
        const ecsOtelEnvVars = {
            ...otelEnvVars,
            // ECS-specific instrumentation
            'OTEL_INSTRUMENTATION_ECS_ENABLED': 'true',
            'OTEL_INSTRUMENTATION_AWS_ECS_ENABLED': 'true',
            'AWS_ECS_SERVICE_NAME': component.node.id,
            // Container-specific configuration
            'OTEL_INSTRUMENTATION_HTTP_ENABLED': 'true',
            'OTEL_INSTRUMENTATION_AWS_SDK_ENABLED': 'true',
            'OTEL_INSTRUMENTATION_CONTAINER_RESOURCE_ENABLED': 'true'
        };
        this.context.logger.info('ECS Service OpenTelemetry instrumentation configured', {
            componentType: component.getType(),
            componentName: component.node.id,
            environmentVariablesCount: Object.keys(ecsOtelEnvVars).length
        });
        return true;
    }
    /**
     * Apply ECS Cluster specific observability
     * Creates alarms for cluster capacity and resource utilization
     */
    applyEcsClusterObservability(component, config) {
        const cluster = component.getConstruct('cluster');
        if (!cluster) {
            this.context.logger.warn('ECS Cluster component has no cluster construct registered', {
                service: 'ObservabilityService'
            });
            return 0;
        }
        let alarmCount = 0;
        const ecsThresholds = config.alarmThresholds.ecs;
        // ECS Service Count alarm
        const serviceCountAlarm = new cloudwatch.Alarm(component, 'EcsClusterServiceCountAlarm', {
            alarmName: `${this.context.serviceName}-${component.node.id}-service-count`,
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
            const cpuReservationAlarm = new cloudwatch.Alarm(component, 'EcsClusterCpuReservationAlarm', {
                alarmName: `${this.context.serviceName}-${component.node.id}-cpu-reservation`,
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
            const memoryReservationAlarm = new cloudwatch.Alarm(component, 'EcsClusterMemoryReservationAlarm', {
                alarmName: `${this.context.serviceName}-${component.node.id}-memory-reservation`,
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
    }
    /**
     * Apply ECS Service specific observability
     * Creates alarms for service health, scaling, and performance
     */
    applyEcsServiceObservability(component, config) {
        const service = component.getConstruct('service');
        if (!service) {
            this.context.logger.warn('ECS Service component has no service construct registered', {
                service: 'ObservabilityService'
            });
            return 0;
        }
        let alarmCount = 0;
        const ecsThresholds = config.alarmThresholds.ecs;
        const serviceName = service.serviceName || component.node.id;
        // Running Task Count alarm
        const runningTasksAlarm = new cloudwatch.Alarm(component, 'EcsServiceRunningTasksAlarm', {
            alarmName: `${this.context.serviceName}-${component.node.id}-running-tasks`,
            alarmDescription: 'ECS service has insufficient running tasks',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ECS',
                metricName: 'RunningTaskCount',
                statistic: 'Average',
                period: cdk.Duration.minutes(5),
                dimensionsMap: {
                    ServiceName: serviceName,
                    ClusterName: service.cluster?.clusterName || 'unknown'
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
        const cpuUtilizationAlarm = new cloudwatch.Alarm(component, 'EcsServiceCpuUtilizationAlarm', {
            alarmName: `${this.context.serviceName}-${component.node.id}-cpu-utilization`,
            alarmDescription: 'ECS service CPU utilization is high',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ECS',
                metricName: 'CPUUtilization',
                statistic: 'Average',
                period: cdk.Duration.minutes(5),
                dimensionsMap: {
                    ServiceName: serviceName,
                    ClusterName: service.cluster?.clusterName || 'unknown'
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
        const memoryUtilizationAlarm = new cloudwatch.Alarm(component, 'EcsServiceMemoryUtilizationAlarm', {
            alarmName: `${this.context.serviceName}-${component.node.id}-memory-utilization`,
            alarmDescription: 'ECS service memory utilization is high',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ECS',
                metricName: 'MemoryUtilization',
                statistic: 'Average',
                period: cdk.Duration.minutes(5),
                dimensionsMap: {
                    ServiceName: serviceName,
                    ClusterName: service.cluster?.clusterName || 'unknown'
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
    }
    /**
     * Build standard OpenTelemetry environment variables
     */
    buildOTelEnvironmentVariables(componentName, config) {
        const template = config.otelEnvironmentTemplate;
        const envVars = {};
        const cloudProvider = 'aws';
        for (const [key, value] of Object.entries(template)) {
            envVars[key] = value
                .replace('{{ region }}', this.context.region)
                .replace('{{ authToken }}', this.getOtelAuthToken())
                .replace('{{ componentName }}', componentName)
                .replace('{{ serviceVersion }}', this.context.serviceLabels?.version || '1.0.0')
                .replace('{{ serviceName }}', this.context.serviceName)
                .replace('{{ environment }}', this.context.environment)
                .replace('{{ cloudProvider }}', cloudProvider)
                .replace('{{ complianceFramework }}', this.context.complianceFramework)
                .replace('{{ traceSamplingRate }}', config.traceSamplingRate.toString())
                .replace('{{ metricsInterval }}', config.metricsInterval.toString());
        }
        return envVars;
    }
    /**
     * Get OpenTelemetry authentication token for the compliance framework
     */
    getOtelAuthToken() {
        // In production, this would retrieve from AWS Secrets Manager or Parameter Store
        return `otel-token-${this.context.complianceFramework}-${this.context.environment}`;
    }
}
exports.EcsObservabilityHandler = EcsObservabilityHandler;
//# sourceMappingURL=ecs-observability.handler.js.map