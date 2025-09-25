"use strict";
/**
 * VPC Observability Handler
 *
 * Implements CloudWatch alarms for VPC components, focusing on NAT Gateway monitoring
 * for compliance frameworks that require enhanced network observability.
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
exports.VpcObservabilityHandler = void 0;
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cdk = __importStar(require("aws-cdk-lib"));
const standards_tagging_1 = require("@shinobi/standards-tagging");
/**
 * Handler for VPC component observability
 */
class VpcObservabilityHandler {
    supportedComponentType = 'vpc';
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
     * Apply CloudWatch alarms to VPC components
     */
    apply(component, config) {
        const startTime = Date.now();
        let instrumentationApplied = false; // VPC doesn't need instrumentation
        let alarmsCreated = 0;
        try {
            // Create CloudWatch alarms for VPC monitoring
            alarmsCreated = this.applyVpcObservability(component, config);
            const executionTime = Date.now() - startTime;
            this.context.logger.info('VPC observability applied successfully', {
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
            this.context.logger.error('Failed to apply VPC observability', {
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
     * Apply VPC-specific observability (NAT Gateway alarms)
     */
    applyVpcObservability(component, config) {
        const vpc = component.getConstruct('vpc');
        if (!vpc) {
            this.context.logger.warn('VPC component has no vpc construct registered', {
                service: 'ObservabilityService'
            });
            return 0;
        }
        let alarmCount = 0;
        const complianceFramework = this.context.complianceFramework;
        // Create NAT Gateway alarms for compliance frameworks
        if (complianceFramework === 'fedramp-moderate' || complianceFramework === 'fedramp-high') {
            // Get NAT gateways from the VPC private subnets
            const natGateways = vpc.privateSubnets.length;
            if (natGateways > 0) {
                // Create NAT Gateway monitoring alarms
                alarmCount += this.createNatGatewayAlarms(component, natGateways, config);
            }
        }
        return alarmCount;
    }
    /**
     * Create NAT Gateway specific alarms
     */
    createNatGatewayAlarms(component, natGatewayCount, config) {
        let alarmCount = 0;
        const vpcThresholds = config.alarmThresholds.vpc;
        // NAT Gateway Error Port Allocation alarm
        const errorPortAllocationAlarm = new cloudwatch.Alarm(component, 'NatGatewayErrorPortAllocation', {
            alarmName: `${this.context.serviceName}-nat-gateway-port-allocation-errors`,
            alarmDescription: 'NAT Gateway port allocation errors - indicates potential exhaustion',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/NATGateway',
                metricName: 'ErrorPortAllocation',
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: vpcThresholds.natGatewayPortAllocationErrors,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // Apply standard tags to the alarm
        this.applyStandardTags(errorPortAllocationAlarm, component);
        alarmCount++;
        // NAT Gateway Packets Drop Count alarm for high compliance
        if (this.context.complianceFramework === 'fedramp-high') {
            const packetsDropAlarm = new cloudwatch.Alarm(component, 'NatGatewayPacketsDropCount', {
                alarmName: `${this.context.serviceName}-nat-gateway-packets-dropped`,
                alarmDescription: 'NAT Gateway packets dropped - indicates performance issues',
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/NATGateway',
                    metricName: 'PacketsDropCount',
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5)
                }),
                threshold: vpcThresholds.natGatewayPacketDropThreshold,
                evaluationPeriods: 3,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
            });
            // Apply standard tags to the alarm
            this.applyStandardTags(packetsDropAlarm, component);
            alarmCount++;
        }
        // NAT Gateway Bytes Out alarm for compliance frameworks
        if (this.context.complianceFramework === 'fedramp-moderate' || this.context.complianceFramework === 'fedramp-high') {
            const bytesOutAlarm = new cloudwatch.Alarm(component, 'NatGatewayBytesOut', {
                alarmName: `${this.context.serviceName}-nat-gateway-bytes-out`,
                alarmDescription: 'NAT Gateway bytes out monitoring for compliance',
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/NATGateway',
                    metricName: 'BytesOutToDestination',
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5)
                }),
                threshold: this.context.complianceFramework === 'fedramp-high' ? 1000000000 : 5000000000, // 1GB for high, 5GB for moderate
                evaluationPeriods: 2,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
            });
            // Apply standard tags to the alarm
            this.applyStandardTags(bytesOutAlarm, component);
            alarmCount++;
        }
        return alarmCount;
    }
}
exports.VpcObservabilityHandler = VpcObservabilityHandler;
//# sourceMappingURL=vpc-observability.handler.js.map