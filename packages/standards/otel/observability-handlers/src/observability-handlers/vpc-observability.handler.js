"use strict";
/**
 * VPC Observability Handler
 *
 * Implements CloudWatch alarms for VPC components, focusing on NAT Gateway monitoring
 * for compliance frameworks that require enhanced network observability.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VpcObservabilityHandler = void 0;
var cloudwatch = require("aws-cdk-lib/aws-cloudwatch");
var cdk = require("aws-cdk-lib");
var standards_tagging_1 = require("@shinobi/standards-tagging");
/**
 * Handler for VPC component observability
 */
var VpcObservabilityHandler = /** @class */ (function () {
    function VpcObservabilityHandler(context, taggingService) {
        if (taggingService === void 0) { taggingService = standards_tagging_1.defaultTaggingService; }
        this.supportedComponentType = 'vpc';
        this.context = context;
        this.taggingService = taggingService;
    }
    /**
     * Apply standard tags to a resource
     */
    VpcObservabilityHandler.prototype.applyStandardTags = function (resource, component, additionalTags) {
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
     * Apply CloudWatch alarms to VPC components
     */
    VpcObservabilityHandler.prototype.apply = function (component, config) {
        var startTime = Date.now();
        var instrumentationApplied = false; // VPC doesn't need instrumentation
        var alarmsCreated = 0;
        try {
            // Create CloudWatch alarms for VPC monitoring
            alarmsCreated = this.applyVpcObservability(component, config);
            var executionTime = Date.now() - startTime;
            this.context.logger.info('VPC observability applied successfully', {
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
    };
    /**
     * Apply VPC-specific observability (NAT Gateway alarms)
     */
    VpcObservabilityHandler.prototype.applyVpcObservability = function (component, config) {
        var vpc = component.getConstruct('vpc');
        if (!vpc) {
            this.context.logger.warn('VPC component has no vpc construct registered', {
                service: 'ObservabilityService'
            });
            return 0;
        }
        var alarmCount = 0;
        var complianceFramework = this.context.complianceFramework;
        // Create NAT Gateway alarms for compliance frameworks
        if (complianceFramework === 'fedramp-moderate' || complianceFramework === 'fedramp-high') {
            // Get NAT gateways from the VPC private subnets
            var natGateways = vpc.privateSubnets.length;
            if (natGateways > 0) {
                // Create NAT Gateway monitoring alarms
                alarmCount += this.createNatGatewayAlarms(component, natGateways, config);
            }
        }
        return alarmCount;
    };
    /**
     * Create NAT Gateway specific alarms
     */
    VpcObservabilityHandler.prototype.createNatGatewayAlarms = function (component, natGatewayCount, config) {
        var alarmCount = 0;
        var vpcThresholds = config.alarmThresholds.vpc;
        // NAT Gateway Error Port Allocation alarm
        var errorPortAllocationAlarm = new cloudwatch.Alarm(component, 'NatGatewayErrorPortAllocation', {
            alarmName: "".concat(this.context.serviceName, "-nat-gateway-port-allocation-errors"),
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
            var packetsDropAlarm = new cloudwatch.Alarm(component, 'NatGatewayPacketsDropCount', {
                alarmName: "".concat(this.context.serviceName, "-nat-gateway-packets-dropped"),
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
            var bytesOutAlarm = new cloudwatch.Alarm(component, 'NatGatewayBytesOut', {
                alarmName: "".concat(this.context.serviceName, "-nat-gateway-bytes-out"),
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
    };
    return VpcObservabilityHandler;
}());
exports.VpcObservabilityHandler = VpcObservabilityHandler;
//# sourceMappingURL=vpc-observability.handler.js.map