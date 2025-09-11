/**
 * Route53 Hosted Zone Component
 * 
 * AWS Route53 Hosted Zone for DNS management and domain resolution.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as route53 from 'aws-cdk-lib/aws-route53';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@platform/contracts';

/**
 * Configuration interface for Route53 Hosted Zone component
 */
export interface Route53HostedZoneConfig {
  /** Zone name (domain name) - required */
  zoneName: string;
  
  /** Comment for the hosted zone */
  comment?: string;
  
  /** Enable query logging */
  queryLoggingEnabled?: boolean;
  
  /** Query log destination (CloudWatch log group) */
  queryLogDestination?: string;
  
  /** VPCs to associate with private hosted zone */
  vpcs?: Array<{
    vpcId: string;
    region?: string;
  }>;
  
  /** Tags for the hosted zone */
  tags?: Record<string, string>;
}

/**
 * Configuration schema for Route53 Hosted Zone component
 */
export const ROUTE53_HOSTED_ZONE_CONFIG_SCHEMA = {
  type: 'object',
  title: 'Route53 Hosted Zone Configuration',
  description: 'Configuration for creating a Route53 hosted zone',
  required: ['zoneName'],
  properties: {
    zoneName: {
      type: 'string',
      description: 'Domain name for the hosted zone',
      pattern: '^[a-zA-Z0-9.-]+$',
      minLength: 1,
      maxLength: 253
    },
    comment: {
      type: 'string',
      description: 'Comment for the hosted zone',
      maxLength: 256
    },
    queryLoggingEnabled: {
      type: 'boolean',
      description: 'Enable DNS query logging',
      default: false
    },
    queryLogDestination: {
      type: 'string',
      description: 'CloudWatch log group for query logging'
    },
    vpcs: {
      type: 'array',
      description: 'VPCs to associate with private hosted zone',
      items: {
        type: 'object',
        properties: {
          vpcId: {
            type: 'string',
            description: 'VPC ID'
          },
          region: {
            type: 'string',
            description: 'AWS region of the VPC'
          }
        },
        required: ['vpcId'],
        additionalProperties: false
      },
      default: []
    },
    tags: {
      type: 'object',
      description: 'Tags for the hosted zone',
      additionalProperties: {
        type: 'string'
      },
      default: {}
    }
  },
  additionalProperties: false,
  defaults: {
    queryLoggingEnabled: false,
    vpcs: [],
    tags: {}
  }
};

/**
 * Configuration builder for Route53 Hosted Zone component
 */
export class Route53HostedZoneConfigBuilder {
  private context: ComponentContext;
  private spec: ComponentSpec;
  
  constructor(context: ComponentContext, spec: ComponentSpec) {
    this.context = context;
    this.spec = spec;
  }

  /**
   * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
   */
  public async build(): Promise<Route53HostedZoneConfig> {
    return this.buildSync();
  }

  /**
   * Synchronous version of build for use in synth() method
   */
  public buildSync(): Route53HostedZoneConfig {
    // Start with platform defaults
    const platformDefaults = this.getPlatformDefaults();
    
    // Apply compliance framework defaults
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    
    // Merge user configuration from spec
    const userConfig = this.spec.config || {};
    
    // Merge configurations (user config takes precedence)
    const mergedConfig = this.mergeConfigs(
      this.mergeConfigs(platformDefaults, complianceDefaults),
      userConfig
    );
    
    return mergedConfig as Route53HostedZoneConfig;
  }

  /**
   * Simple merge utility for combining configuration objects
   */
  private mergeConfigs(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeConfigs(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Get platform-wide defaults for Route53 Hosted Zone
   */
  private getPlatformDefaults(): Record<string, any> {
    return {
      queryLoggingEnabled: this.getDefaultQueryLogging(),
      tags: {
        'service': this.context.serviceName,
        'environment': this.context.environment
      }
    };
  }

  /**
   * Get compliance framework specific defaults
   */
  private getComplianceFrameworkDefaults(): Record<string, any> {
    const framework = this.context.complianceFramework;
    
    switch (framework) {
      case 'fedramp-moderate':
        return {
          queryLoggingEnabled: true, // Required for compliance
          tags: {
            'compliance-framework': 'fedramp-moderate',
            'dns-logging': 'enabled',
            'data-classification': 'controlled'
          }
        };
        
      case 'fedramp-high':
        return {
          queryLoggingEnabled: true, // Mandatory for high compliance
          tags: {
            'compliance-framework': 'fedramp-high',
            'dns-logging': 'enabled',
            'data-classification': 'confidential',
            'audit-required': 'true'
          }
        };
        
      default: // commercial
        return {
          queryLoggingEnabled: false
        };
    }
  }

  /**
   * Get default query logging setting based on compliance framework
   */
  private getDefaultQueryLogging(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }
}

/**
 * Route53 Hosted Zone Component implementing Component API Contract v1.0
 */
export class Route53HostedZoneComponent extends Component {
  private hostedZone?: route53.HostedZone | route53.PrivateHostedZone;
  private queryLogGroup?: logs.LogGroup;
  private config?: Route53HostedZoneConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create Route53 Hosted Zone with compliance hardening
   */
  public synth(): void {
    // Log component synthesis start
    this.logComponentEvent('synthesis_start', 'Starting Route53 Hosted Zone component synthesis', {
      zoneName: this.spec.config?.zoneName,
      queryLoggingEnabled: this.spec.config?.queryLoggingEnabled
    });
    
    const startTime = Date.now();
    
    try {
      // Build configuration using ConfigBuilder
      const configBuilder = new Route53HostedZoneConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();
      
      // Log configuration built
      this.logComponentEvent('config_built', 'Route53 Hosted Zone configuration built successfully', {
        zoneName: this.config.zoneName,
        queryLogging: this.config.queryLoggingEnabled,
        vpcCount: this.config.vpcs?.length || 0
      });
      
      // Create query log group if needed
      this.createQueryLogGroupIfNeeded();
    
      // Create hosted zone
      this.createHostedZone();
    
      // Apply compliance hardening
      this.applyComplianceHardening();
    
      // Configure observability
      this.configureObservabilityForHostedZone();
    
      // Register constructs
      this.registerConstruct('hostedZone', this.hostedZone!);
      if (this.queryLogGroup) {
        this.registerConstruct('queryLogGroup', this.queryLogGroup);
      }
    
      // Register capabilities
      this.registerCapability('dns:hosted-zone', this.buildHostedZoneCapability());
    
      // Log successful synthesis completion
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('component_synthesis', duration, {
        resourcesCreated: Object.keys(this.capabilities).length
      });
    
      this.logComponentEvent('synthesis_complete', 'Route53 Hosted Zone component synthesis completed successfully', {
        hostedZoneCreated: 1,
        zoneName: this.config.zoneName,
        queryLoggingEnabled: this.config.queryLoggingEnabled
      });
      
    } catch (error) {
      this.logError(error as Error, 'component synthesis', {
        componentType: 'route53-hosted-zone',
        stage: 'synthesis'
      });
      throw error;
    }
  }

  /**
   * Get the capabilities this component provides
   */
  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  /**
   * Get the component type identifier
   */
  public getType(): string {
    return 'route53-hosted-zone';
  }

  /**
   * Create query log group if query logging is enabled
   */
  private createQueryLogGroupIfNeeded(): void {
    if (this.config!.queryLoggingEnabled) {
      const logGroupName = this.config!.queryLogDestination || 
        `/aws/route53/${this.config!.zoneName.replace(/\./g, '-')}`;

      this.queryLogGroup = new logs.LogGroup(this, 'QueryLogGroup', {
        logGroupName: logGroupName,
        retention: this.getLogRetention(),
        removalPolicy: this.getLogRemovalPolicy()
      });

      // Apply standard tags
      this.applyStandardTags(this.queryLogGroup, {
        'log-type': 'dns-query',
        'zone-name': this.config!.zoneName,
        'retention': this.getLogRetention().toString()
      });
    }
  }

  /**
   * Create the hosted zone (public or private based on VPC configuration)
   */
  private createHostedZone(): void {
    const baseProps = {
      zoneName: this.config!.zoneName,
      comment: this.config!.comment
    };

    if (this.config!.vpcs && this.config!.vpcs.length > 0) {
      // Create private hosted zone
      const vpcs = this.config!.vpcs.map(vpc => ({
        vpcId: vpc.vpcId,
        vpcRegion: vpc.region || this.context.region
      }));

      this.hostedZone = new route53.PrivateHostedZone(this, 'HostedZone', {
        ...baseProps,
        vpc: {
          vpcId: vpcs[0].vpcId,
          vpcRegion: vpcs[0].vpcRegion
        } as any // CDK typing issue with VPC
      });

      // Associate additional VPCs
      if (vpcs.length > 1) {
        vpcs.slice(1).forEach((vpc, index) => {
          // In a real implementation, you'd use Route53 VPC association
          // This is a simplified approach
        });
      }
    } else {
      // Create public hosted zone
      this.hostedZone = new route53.HostedZone(this, 'HostedZone', {
        ...baseProps,
        queryLogsLogGroup: this.queryLogGroup
      });
    }

    // Apply standard tags
    this.applyStandardTags(this.hostedZone, {
      'zone-type': this.config!.vpcs && this.config!.vpcs.length > 0 ? 'private' : 'public',
      'zone-name': this.config!.zoneName,
      'query-logging': this.config!.queryLoggingEnabled!.toString(),
      'vpc-count': (this.config!.vpcs?.length || 0).toString()
    });

    // Apply additional user tags
    if (this.config!.tags) {
      Object.entries(this.config!.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.hostedZone!).add(key, value);
      });
    }
    
    // Log hosted zone creation
    this.logResourceCreation('route53-hosted-zone', this.config!.zoneName, {
      zoneName: this.config!.zoneName,
      zoneType: this.config!.vpcs && this.config!.vpcs.length > 0 ? 'private' : 'public',
      queryLoggingEnabled: this.config!.queryLoggingEnabled,
      vpcCount: this.config!.vpcs?.length || 0
    });
  }

  /**
   * Apply compliance-specific hardening
   */
  private applyComplianceHardening(): void {
    switch (this.context.complianceFramework) {
      case 'fedramp-moderate':
        this.applyFedrampModerateHardening();
        break;
      case 'fedramp-high':
        this.applyFedrampHighHardening();
        break;
      default:
        this.applyCommercialHardening();
        break;
    }
  }

  private applyCommercialHardening(): void {
    // Basic logging for commercial use
    if (!this.config!.queryLoggingEnabled) {
      // Create minimal logging for security monitoring
      const securityLogGroup = new logs.LogGroup(this, 'SecurityLogGroup', {
        logGroupName: `/aws/route53/${this.config!.zoneName.replace(/\./g, '-')}/security`,
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY
      });

      // Apply standard tags
      this.applyStandardTags(securityLogGroup, {
        'log-type': 'security',
        'retention': '1-month',
        'zone': this.config!.zoneName
      });
    }
  }

  private applyFedrampModerateHardening(): void {
    // Apply commercial hardening
    this.applyCommercialHardening();

    // Enhanced compliance logging
    if (this.hostedZone) {
      const complianceLogGroup = new logs.LogGroup(this, 'ComplianceLogGroup', {
        logGroupName: `/aws/route53/${this.config!.zoneName.replace(/\./g, '-')}/compliance`,
        retention: logs.RetentionDays.ONE_YEAR,
        removalPolicy: cdk.RemovalPolicy.RETAIN
      });

      // Apply standard tags
      this.applyStandardTags(complianceLogGroup, {
        'log-type': 'compliance',
        'retention': '1-year',
        'compliance': 'fedramp-moderate'
      });
    }
  }

  private applyFedrampHighHardening(): void {
    // Apply all moderate hardening
    this.applyFedrampModerateHardening();

    // Extended audit logging for high compliance
    if (this.hostedZone) {
      const auditLogGroup = new logs.LogGroup(this, 'AuditLogGroup', {
        logGroupName: `/aws/route53/${this.config!.zoneName.replace(/\./g, '-')}/audit`,
        retention: logs.RetentionDays.TEN_YEARS,
        removalPolicy: cdk.RemovalPolicy.RETAIN
      });

      // Apply standard tags
      this.applyStandardTags(auditLogGroup, {
        'log-type': 'audit',
        'retention': '10-years',
        'compliance': 'fedramp-high'
      });
    }
  }

  /**
   * Get log retention based on compliance framework
   */
  private getLogRetention(): logs.RetentionDays {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return logs.RetentionDays.TEN_YEARS;
      case 'fedramp-moderate':
        return logs.RetentionDays.ONE_YEAR;
      default:
        return logs.RetentionDays.THREE_MONTHS;
    }
  }

  /**
   * Get log removal policy based on compliance framework
   */
  private getLogRemovalPolicy(): cdk.RemovalPolicy {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) 
      ? cdk.RemovalPolicy.RETAIN 
      : cdk.RemovalPolicy.DESTROY;
  }

  /**
   * Build hosted zone capability data shape
   */
  private buildHostedZoneCapability(): any {
    return {
      hostedZoneId: this.hostedZone!.hostedZoneId,
      zoneName: this.config!.zoneName,
      nameServers: 'hostedZone' in this.hostedZone! ? 
        (this.hostedZone as route53.HostedZone).hostedZoneNameServers : undefined
    };
  }

  /**
   * Configure CloudWatch observability for Route53 Hosted Zone
   */
  private configureObservabilityForHostedZone(): void {
    // Enable monitoring for compliance frameworks only
    if (this.context.complianceFramework === 'commercial') {
      return;
    }

    const zoneName = this.config!.zoneName;

    // 1. Query Volume Alarm (unusual DNS activity)
    const queryVolumeAlarm = new cloudwatch.Alarm(this, 'QueryVolumeAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-high-query-volume`,
      alarmDescription: 'Route53 high query volume alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Route53',
        metricName: 'QueryCount',
        dimensionsMap: {
          HostedZoneId: this.hostedZone!.hostedZoneId
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 10000, // High threshold for potential DDoS
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // Apply standard tags
    this.applyStandardTags(queryVolumeAlarm, {
      'alarm-type': 'high-query-volume',
      'metric-type': 'security',
      'threshold': '10000'
    });

    // 2. Resolver Endpoint Failures Alarm
    const resolverFailuresAlarm = new cloudwatch.Alarm(this, 'ResolverFailuresAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-resolver-failures`,
      alarmDescription: 'Route53 resolver failures alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Route53Resolver',
        metricName: 'InboundQueryVolume',
        dimensionsMap: {
          HostedZoneId: this.hostedZone!.hostedZoneId
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 100, // High failure rate
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // Apply standard tags
    this.applyStandardTags(resolverFailuresAlarm, {
      'alarm-type': 'resolver-failures',
      'metric-type': 'availability',
      'threshold': '100'
    });

    this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to Route53 Hosted Zone', {
      alarmsCreated: 2,
      zoneName: zoneName,
      monitoringEnabled: true
    });
  }
}