/**
 * VPC Observability Handler
 * 
 * Implements CloudWatch alarms for VPC components, focusing on NAT Gateway monitoring
 * for compliance frameworks that require enhanced network observability.
 */

import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { BaseComponent } from '@shinobi/core';
import { IObservabilityHandler, ObservabilityHandlerResult, ObservabilityConfig } from './observability-handler.interface';
import { ITaggingService, TaggingContext, defaultTaggingService } from '@shinobi/standards-tagging';
import { PlatformServiceContext } from '@shinobi/core/platform-services';

/**
 * Handler for VPC component observability
 */
export class VpcObservabilityHandler implements IObservabilityHandler {
  public readonly supportedComponentType = 'vpc';
  private context: PlatformServiceContext;
  private taggingService: ITaggingService;

  constructor(context: PlatformServiceContext, taggingService: ITaggingService = defaultTaggingService) {
    this.context = context;
    this.taggingService = taggingService;
  }

  /**
   * Apply standard tags to a resource
   */
  private applyStandardTags(resource: IConstruct, component: BaseComponent, additionalTags?: Record<string, string>): void {
    const taggingContext: TaggingContext = {
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
  public apply(component: BaseComponent, config: ObservabilityConfig): ObservabilityHandlerResult {
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

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.context.logger.error('Failed to apply VPC observability', {
        service: 'ObservabilityService',
        componentType: component.getType(),
        componentName: component.node.id,
        executionTimeMs: executionTime,
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      throw error;
    }
  }

  /**
   * Apply VPC-specific observability (NAT Gateway alarms)
   */
  private applyVpcObservability(component: BaseComponent, config: ObservabilityConfig): number {
    const vpc = component.getConstruct('vpc') as ec2.Vpc | undefined;
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
  private createNatGatewayAlarms(component: BaseComponent, natGatewayCount: number, config: ObservabilityConfig): number {
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
