"use strict";
/**
 * Platform OpenTelemetry Observability Service
 *
 * Implements the Platform OpenTelemetry Observability Standard v1.0 by automatically
 * configuring OpenTelemetry instrumentation, CloudWatch alarms, and compliance-aware
 * monitoring for all supported component types.
 *
 * This service ensures every component is observable by default with:
 * - OpenTelemetry instrumentation (traces, metrics, logs)
 * - Compliance-aware configuration (Commercial/FedRAMP Moderate/FedRAMP High)
 * - Automatic environment variable injection
 * - CloudWatch alarms for operational monitoring
 *
 * Architecture: Uses the Handler Pattern for scalable, maintainable component-specific logic.
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
exports.ObservabilityService = void 0;
const fs = __importStar(require("fs"));
const yaml = __importStar(require("js-yaml"));
const path = __importStar(require("path"));
const lambda_observability_handler_1 = require("./observability-handlers/lambda-observability.handler");
const vpc_observability_handler_1 = require("./observability-handlers/vpc-observability.handler");
const alb_observability_handler_1 = require("./observability-handlers/alb-observability.handler");
const rds_observability_handler_1 = require("./observability-handlers/rds-observability.handler");
const ec2_observability_handler_1 = require("./observability-handlers/ec2-observability.handler");
const sqs_observability_handler_1 = require("./observability-handlers/sqs-observability.handler");
const ecs_observability_handler_1 = require("./observability-handlers/ecs-observability.handler");
const tagging_service_1 = require("../../packages/tagging-service/tagging.service");
/**
 * Platform OpenTelemetry Observability Service
 *
 * Implements Platform OpenTelemetry Observability Standard v1.0 and
 * Platform Service Injector Standard v1.0 using the Handler Pattern
 */
class ObservabilityService {
    name = 'ObservabilityService';
    context;
    observabilityConfig;
    handlers;
    taggingService;
    constructor(context, taggingService = tagging_service_1.defaultTaggingService) {
        this.context = context;
        this.taggingService = taggingService;
        // Load centralized observability configuration from platform configuration
        this.observabilityConfig = this.loadObservabilityConfig();
        // Initialize the handler registry using the Handler Pattern
        this.handlers = this.initializeHandlers();
    }
    /**
     * Initialize the handler registry using the Handler Pattern
     * This replaces the monolithic switch statement with a scalable Map-based approach
     */
    initializeHandlers() {
        const handlerMap = new Map();
        // Register all component-specific handlers with tagging service injection
        handlerMap.set('lambda-api', new lambda_observability_handler_1.LambdaObservabilityHandler(this.context, this.taggingService));
        handlerMap.set('lambda-worker', new lambda_observability_handler_1.LambdaObservabilityHandler(this.context, this.taggingService));
        handlerMap.set('vpc', new vpc_observability_handler_1.VpcObservabilityHandler(this.context, this.taggingService));
        handlerMap.set('application-load-balancer', new alb_observability_handler_1.AlbObservabilityHandler(this.context, this.taggingService));
        handlerMap.set('rds-postgres', new rds_observability_handler_1.RdsObservabilityHandler(this.context, this.taggingService));
        handlerMap.set('ec2-instance', new ec2_observability_handler_1.Ec2ObservabilityHandler(this.context, this.taggingService));
        handlerMap.set('sqs-queue', new sqs_observability_handler_1.SqsObservabilityHandler(this.context, this.taggingService));
        handlerMap.set('ecs-cluster', new ecs_observability_handler_1.EcsObservabilityHandler(this.context, this.taggingService));
        handlerMap.set('ecs-fargate-service', new ecs_observability_handler_1.EcsObservabilityHandler(this.context, this.taggingService));
        handlerMap.set('ecs-ec2-service', new ecs_observability_handler_1.EcsObservabilityHandler(this.context, this.taggingService));
        return handlerMap;
    }
    /**
     * Load observability configuration from centralized platform configuration
     * Implements Platform Configuration Standard v1.0 Layer 2
     */
    loadObservabilityConfig() {
        const framework = this.context.complianceFramework;
        const configPath = this.getPlatformConfigPath(framework);
        try {
            if (!fs.existsSync(configPath)) {
                this.context.logger.warn(`Platform configuration file not found: ${configPath}, using fallback defaults`, {
                    service: this.name,
                    framework,
                    configPath
                });
                return this.getFallbackConfig();
            }
            const fileContents = fs.readFileSync(configPath, 'utf8');
            const platformConfig = yaml.load(fileContents);
            // Extract observability configuration for this compliance framework
            if (platformConfig?.defaults?.observability) {
                const config = platformConfig.defaults.observability;
                return {
                    traceSamplingRate: config.traceSamplingRate || 0.1,
                    metricsInterval: config.metricsInterval || 300,
                    logsRetentionDays: config.logsRetentionDays || 365,
                    alarmThresholds: config.alarmThresholds || this.getFallbackConfig().alarmThresholds,
                    otelEnvironmentTemplate: config.otelEnvironmentTemplate || this.getFallbackConfig().otelEnvironmentTemplate,
                    ec2OtelUserDataTemplate: config.ec2OtelUserDataTemplate || this.getFallbackConfig().ec2OtelUserDataTemplate
                };
            }
            this.context.logger.warn(`No observability configuration found in ${configPath}, using fallback defaults`, {
                service: this.name,
                framework,
                configPath
            });
            return this.getFallbackConfig();
        }
        catch (error) {
            this.context.logger.error(`Failed to load platform configuration for framework '${framework}': ${error.message}`, {
                service: this.name,
                framework,
                configPath,
                error: error.message
            });
            return this.getFallbackConfig();
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
     * Get fallback configuration when platform configuration is not available
     * These serve as the absolute final fallback (Layer 1 of Configuration Standard)
     */
    getFallbackConfig() {
        return {
            traceSamplingRate: 0.1,
            metricsInterval: 300,
            logsRetentionDays: 365,
            alarmThresholds: {
                ec2: {
                    cpuUtilization: 85,
                    statusCheckFailed: 1,
                    networkIn: 100000000
                },
                rds: {
                    freeStorageSpace: 10,
                    cpuUtilization: 85,
                    connectionCount: 80
                },
                lambda: {
                    errorRate: 5,
                    duration: 5000,
                    throttles: 10
                },
                alb: {
                    responseTime: 2,
                    http5xxErrors: 10,
                    unhealthyTargets: 1
                },
                sqs: {
                    messageAge: 300,
                    deadLetterMessages: 5
                },
                ecs: {
                    cpuUtilization: 80,
                    memoryUtilization: 80,
                    taskCount: 0
                },
                vpc: {
                    natGatewayPacketDropThreshold: 1000,
                    natGatewayPortAllocationErrors: 1
                }
            },
            otelEnvironmentTemplate: {
                'OTEL_EXPORTER_OTLP_ENDPOINT': 'https://otel-collector.{{ region }}.platform.local:4317',
                'OTEL_EXPORTER_OTLP_HEADERS': 'authorization=Bearer {{ authToken }}',
                'OTEL_SERVICE_NAME': '{{ componentName }}',
                'OTEL_SERVICE_VERSION': '{{ serviceVersion }}',
                'OTEL_RESOURCE_ATTRIBUTES': 'service.name={{ serviceName }},deployment.environment={{ environment }},cloud.provider={{ cloudProvider }}',
                'OTEL_TRACES_SAMPLER': 'traceidratio',
                'OTEL_TRACES_SAMPLER_ARG': '{{ traceSamplingRate }}',
                'OTEL_METRICS_EXPORTER': 'otlp',
                'OTEL_LOGS_EXPORTER': 'otlp',
                'OTEL_PROPAGATORS': 'tracecontext,baggage,xray',
                'OTEL_INSTRUMENTATION_COMMON_DEFAULT_ENABLED': 'true',
                'OTEL_BSP_MAX_EXPORT_BATCH_SIZE': '512',
                'OTEL_BSP_EXPORT_TIMEOUT': '30000',
                'OTEL_METRIC_EXPORT_INTERVAL': '{{ metricsInterval }}'
            },
            ec2OtelUserDataTemplate: '#!/bin/bash\nyum update -y\ncurl -L -o /tmp/otelcol-contrib.deb https://github.com/open-telemetry/opentelemetry-collector-releases/releases/latest/download/otelcol-contrib_linux_amd64.deb\ndpkg -i /tmp/otelcol-contrib.deb\ncat > /opt/aws/otel-collector/config.yaml << \'EOF\'\n{{ otelAgentConfigJson }}\nEOF\n{{ otelEnvironmentVars }}\nsystemctl enable otelcol-contrib\nsystemctl start otelcol-contrib'
        };
    }
    /**
     * The core method that applies OpenTelemetry observability to a component
     * after it has been fully synthesized.
     *
     * Implements Platform OpenTelemetry Observability Standard v1.0:
     * - Configures OpenTelemetry instrumentation
     * - Injects OTel environment variables
     * - Creates compliance-aware CloudWatch alarms
     * - Sets up proper retention and sampling
     *
     * Architecture: Uses the Handler Pattern for scalable, maintainable component-specific logic.
     */
    apply(component) {
        const startTime = Date.now();
        const componentType = component.getType();
        const componentName = component.node.id;
        // Find the appropriate handler for this component type
        const handler = this.handlers.get(componentType);
        if (!handler) {
            // Simply log and return for unsupported types - don't throw error
            this.context.logger.info(`No OpenTelemetry instrumentation for component type ${componentType}`, {
                service: this.name,
                componentType,
                componentName
            });
            return;
        }
        try {
            // Delegate to the appropriate handler using the Handler Pattern
            // Pass the centralized configuration to the handler
            const result = handler.apply(component, this.observabilityConfig);
            // Ensure result is valid before accessing properties
            if (result) {
                // Log successful application
                this.context.logger.info('OpenTelemetry observability applied successfully', {
                    service: this.name,
                    componentType,
                    componentName,
                    alarmsCreated: result.alarmsCreated,
                    instrumentationApplied: result.instrumentationApplied,
                    executionTimeMs: result.executionTimeMs
                });
            }
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.context.logger.error('Failed to apply observability', {
                service: this.name,
                componentType,
                componentName,
                executionTimeMs: executionTime,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    /**
     * Build OpenTelemetry environment variables from template
     * Performs string substitution on the template with actual values
     */
    buildOTelEnvironmentVariables(componentName) {
        const template = this.observabilityConfig.otelEnvironmentTemplate;
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
                .replace('{{ traceSamplingRate }}', this.observabilityConfig.traceSamplingRate.toString())
                .replace('{{ metricsInterval }}', this.observabilityConfig.metricsInterval.toString());
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
    /**
     * Get the centralized observability configuration
     * This allows handlers to access configuration without hardcoding values
     */
    getObservabilityConfig() {
        return this.observabilityConfig;
    }
    /**
     * Get the list of supported component types for this service
     * Useful for debugging and service discovery
     */
    getSupportedComponentTypes() {
        return Array.from(this.handlers.keys());
    }
    /**
     * Get handler information for debugging and monitoring
     */
    getHandlerInfo() {
        const info = {};
        this.handlers.forEach((handler, componentType) => {
            info[componentType] = handler.constructor.name;
        });
        return info;
    }
}
exports.ObservabilityService = ObservabilityService;
