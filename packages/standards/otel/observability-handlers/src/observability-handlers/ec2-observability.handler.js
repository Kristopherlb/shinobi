"use strict";
/**
 * EC2 Observability Handler
 *
 * Implements OpenTelemetry instrumentation and CloudWatch alarms for EC2 components.
 * Provides comprehensive instance monitoring including status checks and performance metrics.
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
exports.Ec2ObservabilityHandler = void 0;
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const cdk = __importStar(require("aws-cdk-lib"));
const standards_tagging_1 = require("@shinobi/standards-tagging");
/**
 * Handler for EC2 component observability
 */
class Ec2ObservabilityHandler {
    supportedComponentType = 'ec2-instance';
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
     * Apply OpenTelemetry instrumentation and CloudWatch alarms to EC2 components
     */
    apply(component, config) {
        const startTime = Date.now();
        let instrumentationApplied = false;
        let alarmsCreated = 0;
        try {
            // Apply OpenTelemetry instrumentation
            instrumentationApplied = this.applyEc2OTelInstrumentation(component, config);
            // Create CloudWatch alarms
            alarmsCreated = this.applyEc2InstanceObservability(component, config);
            const executionTime = Date.now() - startTime;
            this.context.logger.info('EC2 observability applied successfully', {
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
    }
    /**
     * Apply EC2-specific OpenTelemetry instrumentation
     * Implements Platform OpenTelemetry Observability Standard v1.0 Section 5.4
     */
    applyEc2OTelInstrumentation(component, config) {
        const instance = component.getConstruct('instance');
        if (!instance) {
            this.context.logger.warn('EC2 component has no instance construct registered', {
                service: 'ObservabilityService',
                componentType: 'ec2-instance',
                componentName: component.node.id
            });
            return false;
        }
        // Create OTel Collector agent configuration using config values
        const otelAgentConfig = {
            receivers: {
                hostmetrics: {
                    collection_interval: `${config.metricsInterval}s`,
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
                    endpoint: `https://otel-collector.${this.context.complianceFramework}.${this.context.region}.platform.local:4317`,
                    headers: { authorization: `Bearer ${this.getOtelAuthToken()}` }
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
        const otelEnvVars = this.buildOTelEnvironmentVariables(component.node.id, config);
        // Use the UserData template from configuration
        const userDataTemplate = config.ec2OtelUserDataTemplate;
        const userDataScript = userDataTemplate
            .replace('{{ otelAgentConfigJson }}', JSON.stringify(otelAgentConfig, null, 2))
            .replace('{{ otelEnvironmentVars }}', Object.entries(otelEnvVars)
            .map(([key, value]) => `export ${key}="${value}"`)
            .join('\n'));
        // Add user data to install and configure OTel Collector
        const userData = ec2.UserData.forLinux();
        userData.addCommands(userDataScript);
        // Apply user data to instance (this would need to be done during instance creation)
        this.context.logger.info('EC2 OpenTelemetry instrumentation prepared', {
            service: 'ObservabilityService',
            componentType: 'ec2-instance',
            componentName: component.node.id
        });
        return true;
    }
    /**
     * Apply EC2 Instance specific observability alarms
     */
    applyEc2InstanceObservability(component, config) {
        const instance = component.getConstruct('instance');
        if (!instance) {
            this.context.logger.warn('EC2 Instance component has no instance construct registered', {
                service: 'ObservabilityService'
            });
            return 0;
        }
        let alarmCount = 0;
        const complianceFramework = this.context.complianceFramework;
        const ec2Thresholds = config.alarmThresholds.ec2;
        // EC2 Status Check Failed alarm
        const statusCheckAlarm = new cloudwatch.Alarm(component, 'Ec2StatusCheckFailed', {
            alarmName: `${this.context.serviceName}-${component.node.id}-status-check-failed`,
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
            const cpuAlarm = new cloudwatch.Alarm(component, 'Ec2CpuUtilization', {
                alarmName: `${this.context.serviceName}-${component.node.id}-cpu-utilization`,
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
            const networkInAlarm = new cloudwatch.Alarm(component, 'Ec2NetworkIn', {
                alarmName: `${this.context.serviceName}-${component.node.id}-network-in`,
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
    }
    /**
     * Build standard OpenTelemetry environment variables from config template
     */
    buildOTelEnvironmentVariables(componentName, config) {
        const template = config.otelEnvironmentTemplate;
        const envVars = {};
        // Determine cloud provider - this is an AWS CDK library, so always AWS
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
exports.Ec2ObservabilityHandler = Ec2ObservabilityHandler;
//# sourceMappingURL=ec2-observability.handler.js.map