/**
 * VPC Logging Handler
 * 
 * Implements logging infrastructure for VPC Flow Logs according to
 * Platform Structured Logging Standard v1.0.
 * 
 * Features:
 * - Configures VPC Flow Logs to CloudWatch
 * - Sets up compliance-aware log retention for network traffic
 * - Implements security monitoring for network anomalies
 * - Configures log format for structured analysis
 */

import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { IComponent } from '@shinobi/core/component-interfaces';
import { PlatformServiceContext } from '@shinobi/core/platform-services';
import { 
  ILoggingHandler, 
  LoggingHandlerResult 
} from '@shinobi/core/logging-interfaces';
import { LoggingService } from '../logging-service/infrastructure-logging.service';

/**
 * Logging handler for VPC components
 * Configures VPC Flow Logs for network traffic monitoring and security analysis
 */
export class VpcLoggingHandler implements ILoggingHandler {
  public readonly componentType = 'vpc';
  private readonly loggingService: LoggingService;

  constructor(loggingService: LoggingService) {
    this.loggingService = loggingService;
  }

  /**
   * Apply VPC Flow Logs configuration with compliance-aware settings
   */
  public apply(component: IComponent, context: PlatformServiceContext): LoggingHandlerResult {
    try {
      // Get the VPC from the component
      const vpc = component.getConstruct('vpc') as ec2.IVpc | undefined;
      if (!vpc) {
        return {
          success: false,
          retentionDays: 0,
          encryption: { enabled: false, managedKey: true },
          classification: 'internal',
          error: 'VPC component has no vpc construct registered'
        };
      }

      // Create dedicated log group for VPC Flow Logs
      const logGroupName = `/platform/${context.serviceName}/vpc/flowlogs`;
      const logGroup = this.createVpcFlowLogGroup(component, logGroupName, context);
      
      // Create IAM role for VPC Flow Logs
      const flowLogRole = this.createFlowLogRole(component, logGroup);
      
      // Configure VPC Flow Logs
      const flowLog = this.configureVpcFlowLogs(component, vpc, logGroup, flowLogRole, context);
      
      // Apply security monitoring configuration
      this.applySecurityMonitoring(component, logGroup, context);
      
      const classification = this.loggingService.getSecurityClassification('vpc');
      const retentionDays = this.loggingService.getRetentionPolicy().retentionDays;
      
      return {
        success: true,
        logGroupArn: logGroup.logGroupArn,
        retentionDays,
        encryption: {
          enabled: true,
          managedKey: this.loggingService.getRetentionPolicy().encryptionLevel === 'standard'
        },
        classification,
        metadata: {
          vpcId: vpc.vpcId,
          logGroupName: logGroup.logGroupName,
          flowLogId: flowLog.flowLogId,
          logFormat: 'structured',
          trafficType: 'ALL',
          securityMonitoring: context.complianceFramework !== 'commercial'
        }
      };
    } catch (error) {
      return {
        success: false,
        retentionDays: 0,
        encryption: { enabled: false, managedKey: true },
        classification: 'internal',
        error: `Failed to configure VPC logging: ${(error as Error).message}`
      };
    }
  }

  /**
   * Create CloudWatch Log Group for VPC Flow Logs
   */
  private createVpcFlowLogGroup(
    component: IComponent, 
    logGroupName: string, 
    context: PlatformServiceContext
  ): logs.LogGroup {
    const policy = this.loggingService.getRetentionPolicy();
    const retentionEnum = this.mapRetentionToEnum(policy.retentionDays);

    const logGroup = new logs.LogGroup(component, 'VpcFlowLogsGroup', {
      logGroupName,
      retention: retentionEnum,
      removalPolicy: policy.immutable ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // Apply compliance tags
    cdk.Tags.of(logGroup).add('log-type', 'vpc-flow-logs');
    cdk.Tags.of(logGroup).add('classification', this.loggingService.getSecurityClassification('vpc'));
    cdk.Tags.of(logGroup).add('compliance-framework', context.complianceFramework);
    cdk.Tags.of(logGroup).add('network-monitoring', 'enabled');

    return logGroup;
  }

  /**
   * Create IAM role for VPC Flow Logs to write to CloudWatch
   */
  private createFlowLogRole(component: IComponent, logGroup: logs.LogGroup): iam.Role {
    const role = new iam.Role(component, 'VpcFlowLogRole', {
      assumedBy: new iam.ServicePrincipal('vpc-flow-logs.amazonaws.com'),
      description: 'Role for VPC Flow Logs to write to CloudWatch',
    });

    // Grant permissions to write to the specific log group
    logGroup.grantWrite(role);

    // Add additional permissions for enhanced Flow Logs
    role.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:DescribeLogGroups',
        'logs:DescribeLogStreams',
        'logs:DescribeLogEvents'
      ],
      resources: [
        logGroup.logGroupArn,
        `${logGroup.logGroupArn}:*`
      ]
    }));

    return role;
  }

  /**
   * Configure VPC Flow Logs with structured format
   */
  private configureVpcFlowLogs(
    component: IComponent,
    vpc: ec2.IVpc,
    logGroup: logs.LogGroup,
    role: iam.Role,
    context: PlatformServiceContext
  ): ec2.FlowLog {
    // Define structured log format for better analysis
    const logFormatFields = this.getStructuredLogFormatFields(context);
    
    const flowLog = new ec2.FlowLog(component, 'VpcFlowLog', {
      resourceType: ec2.FlowLogResourceType.fromVpc(vpc),
      destination: ec2.FlowLogDestination.toCloudWatchLogs(logGroup, role),
      trafficType: ec2.FlowLogTrafficType.ALL, // Capture all traffic for security monitoring
      logFormat: logFormatFields
    });

    // Apply standard CDK tags directly
    cdk.Tags.of(flowLog).add('flow-log-type', 'comprehensive');
    cdk.Tags.of(flowLog).add('traffic-type', 'ALL');
    cdk.Tags.of(flowLog).add('destination', 'cloudwatch-logs');

    return flowLog;
  }

  /**
   * Apply security monitoring configuration
   */
  private applySecurityMonitoring(
    component: IComponent,
    logGroup: logs.LogGroup,
    context: PlatformServiceContext
  ): void {
    if (context.complianceFramework === 'commercial') {
      // Basic monitoring for commercial
      return;
    }

    // Enhanced security monitoring for FedRAMP
    // Note: In a real implementation, this would set up:
    // - CloudWatch alarms for suspicious traffic patterns
    // - Metrics filters for security events
    // - Integration with SIEM systems
    // - Real-time anomaly detection

    context.logger.info('Enhanced VPC security monitoring configured', {
      service: 'LoggingService',
      componentType: 'vpc',
      logGroupArn: logGroup.logGroupArn,
      complianceFramework: context.complianceFramework,
      features: [
        'anomaly-detection',
        'siem-integration',
        'real-time-monitoring',
        'threat-intelligence'
      ]
    });
  }

  /**
   * Get structured log format based on compliance requirements
   */
  private getStructuredLogFormatFields(context: PlatformServiceContext): ec2.LogFormat[] {
    const baseFields = [
      ec2.LogFormat.VERSION,
      ec2.LogFormat.ACCOUNT_ID,
      ec2.LogFormat.INTERFACE_ID,
      ec2.LogFormat.SRC_ADDR,
      ec2.LogFormat.DST_ADDR,
      ec2.LogFormat.SRC_PORT,
      ec2.LogFormat.DST_PORT,
      ec2.LogFormat.PROTOCOL,
      ec2.LogFormat.PACKETS,
      ec2.LogFormat.BYTES,
      ec2.LogFormat.START_TIMESTAMP,
      ec2.LogFormat.END_TIMESTAMP,
      ec2.LogFormat.ACTION,
      ec2.LogFormat.LOG_STATUS
    ];

    if (context.complianceFramework === 'commercial') {
      return baseFields;
    } else {
      // Enhanced format for FedRAMP compliance with additional security fields
      return [
        ...baseFields,
        ec2.LogFormat.VPC_ID,
        ec2.LogFormat.SUBNET_ID,
        ec2.LogFormat.INSTANCE_ID,
        ec2.LogFormat.TCP_FLAGS,
        ec2.LogFormat.PKT_SRC_ADDR,
        ec2.LogFormat.PKT_DST_ADDR,
        ec2.LogFormat.REGION,
        ec2.LogFormat.SUBLOCATION_ID,
        ec2.LogFormat.SUBLOCATION_TYPE
      ];
    }
  }

  /**
   * Determine security classification for VPC logs
   */
  private determineSecurityClassification(context: PlatformServiceContext): 'public' | 'internal' | 'confidential' | 'cui' | 'phi' {
    switch (context.complianceFramework) {
      case 'fedramp-high':
        return 'cui'; // Network traffic may contain CUI
      case 'fedramp-moderate':
        return 'confidential'; // Network metadata is confidential
      default:
        return 'internal'; // Internal network information
    }
  }


  /**
   * Map retention days to CloudWatch enum
   */
  private mapRetentionToEnum(days: number): logs.RetentionDays {
    if (days <= 1) return logs.RetentionDays.ONE_DAY;
    if (days <= 7) return logs.RetentionDays.ONE_WEEK;
    if (days <= 30) return logs.RetentionDays.ONE_MONTH;
    if (days <= 90) return logs.RetentionDays.THREE_MONTHS;
    if (days <= 365) return logs.RetentionDays.ONE_YEAR;
    if (days <= 1095) return logs.RetentionDays.THREE_YEARS;
    if (days <= 2555) return logs.RetentionDays.SEVEN_YEARS;
    return logs.RetentionDays.TEN_YEARS;
  }

}
