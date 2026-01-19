/**
 * Configuration builder for Route53 Hosted Zone components
 *
 * The builder leverages the shared ConfigBuilder precedence chain. Component
 * logic consumes the resolved configuration without referencing compliance
 * frameworks directly – all defaults live in /config/<framework>.yml.
 */

import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import configSchema from './Config.schema.json' with { type: 'json' };

export type HostedZoneType = 'public' | 'private';
export type RemovalPolicyOption = 'retain' | 'destroy';
export type AlarmComparisonOperator = 'gt' | 'gte' | 'lt' | 'lte';
export type AlarmTreatMissingData = 'breaching' | 'not-breaching' | 'ignore' | 'missing';

export interface VpcAssociationConfig {
  /** VPC ID for fromLookup(). Optional when using injected VPC via context.vpc */
  vpcId?: string;
  region?: string;
}

export interface QueryLoggingConfig {
  enabled: boolean;
  logGroupArn?: string;
  logGroupName?: string;
  retentionDays: number;
  removalPolicy: RemovalPolicyOption;
}

export interface DnsSecConfig {
  enabled: boolean;
}

export interface HostedZoneAlarmConfig {
  enabled?: boolean;
  threshold?: number;
  evaluationPeriods?: number;
  periodMinutes?: number;
  comparisonOperator?: AlarmComparisonOperator;
  treatMissingData?: AlarmTreatMissingData;
  statistic?: string;
  tags?: Record<string, string>;
}

export interface MonitoringConfig {
  enabled?: boolean;
  alarms?: {
    queryVolume?: HostedZoneAlarmConfig;
    healthCheckFailures?: HostedZoneAlarmConfig;
  };
}

export interface Route53HostedZoneConfig {
  zoneName: string;
  comment?: string;
  zoneType: HostedZoneType;
  vpcAssociations: VpcAssociationConfig[];
  queryLogging: QueryLoggingConfig;
  dnssec: DnsSecConfig;
  monitoring: {
    enabled: boolean;
    alarms: {
      queryVolume: HostedZoneAlarmConfig;
      healthCheckFailures: HostedZoneAlarmConfig;
    };
  };
  hardeningProfile: string;
  removalPolicy: RemovalPolicyOption;
  tags: Record<string, string>;
  /** High-risk environment flag (set via platform config or service.yml) */
  highRiskEnvironment?: boolean;
}

export const ROUTE53_HOSTED_ZONE_CONFIG_SCHEMA: ComponentConfigSchema = configSchema as ComponentConfigSchema;

const DEFAULT_ALARM_BASELINE: Required<Omit<HostedZoneAlarmConfig, 'tags'>> = {
  enabled: false,
  threshold: 10000,
  evaluationPeriods: 1,
  periodMinutes: 5,
  comparisonOperator: 'gt',
  treatMissingData: 'not-breaching',
  statistic: 'Sum'
};

export class Route53HostedZoneComponentConfigBuilder extends ConfigBuilder<Route53HostedZoneConfig> {
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, ROUTE53_HOSTED_ZONE_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<Route53HostedZoneConfig> {
    return {
      zoneType: 'public',
      vpcAssociations: [],
      queryLogging: {
        enabled: false,
        retentionDays: 90,
        removalPolicy: 'destroy'
      },
      dnssec: {
        enabled: false
      },
      monitoring: {
        enabled: false,
        alarms: {
          queryVolume: { ...DEFAULT_ALARM_BASELINE },
          healthCheckFailures: {
            ...DEFAULT_ALARM_BASELINE,
            threshold: 10,
            statistic: 'Sum'
          }
        }
      },
      hardeningProfile: 'baseline',
      removalPolicy: 'retain',
      tags: {}
    };
  }

  /**
   * Layer 2: Compliance Framework Defaults
   * 
   * Provides sensible defaults based on risk assessment flags rather than framework checks.
   * High-risk environment defaults can be set via:
   * - Platform config files (`/config/{framework}.yml`) setting `highRiskEnvironment: true`
   * - Service-level configuration in `service.yml`
   * - Environment defaults
   * 
   * This ensures configuration is data-driven and risk-based, not framework-dependent.
   */
  protected getComplianceFrameworkDefaults(): Partial<Route53HostedZoneConfig> {
    // Check if highRiskEnvironment flag is set in component config or platform config
    const componentConfig = this.builderContext.spec.config as Partial<Route53HostedZoneConfig> | undefined;
    let isHighRisk = componentConfig?.highRiskEnvironment ?? false;
    
    // Also check platform config if available (loaded by base class)
    try {
      const platformConfig = (this as any)._loadPlatformConfiguration();
      if (platformConfig?.highRiskEnvironment) {
        isHighRisk = true;
      }
    } catch {
      // Platform config might not be available in tests, ignore
    }
    
    if (isHighRisk) {
      // Apply enhanced security defaults for high-risk environments
      // These defaults align with FedRAMP Moderate/High requirements when highRiskEnvironment is set
      return {
        queryLogging: {
          enabled: true,
          retentionDays: 365, // Can be overridden to 1095 for higher risk
          removalPolicy: 'retain'
        },
        dnssec: {
          enabled: true
        },
        monitoring: {
          enabled: true,
          alarms: {
            queryVolume: { ...DEFAULT_ALARM_BASELINE },
            healthCheckFailures: {
              ...DEFAULT_ALARM_BASELINE,
              threshold: 10,
              statistic: 'Sum'
            }
          }
        }
      };
    }
    
    return {}; // Standard/default environment - use hardcoded fallbacks
  }

  public buildSync(): Route53HostedZoneConfig {
    const resolved = super.buildSync() as Partial<Route53HostedZoneConfig>;

    if (!resolved.zoneName) {
      throw new Error('Route53 hosted zone requires a zoneName (e.g., "example.com").');
    }

    return this.normaliseConfig(resolved);
  }

  private normaliseConfig(config: Partial<Route53HostedZoneConfig>): Route53HostedZoneConfig {
    const zoneName = this.sanitiseZoneName(config.zoneName!);
    const zoneType: HostedZoneType = (config.zoneType ?? 'public') as HostedZoneType;

    return {
      zoneName,
      comment: config.comment,
      zoneType,
      vpcAssociations: this.normaliseVpcAssociations(config.vpcAssociations, zoneType),
      queryLogging: this.normaliseQueryLogging(config.queryLogging),
      dnssec: {
        enabled: config.dnssec?.enabled ?? false
      },
      monitoring: this.normaliseMonitoring(config.monitoring),
      hardeningProfile: config.hardeningProfile ?? 'baseline',
      removalPolicy: config.removalPolicy === 'destroy' ? 'destroy' : 'retain',
      tags: config.tags ?? {}
    };
  }

  private normaliseVpcAssociations(
    vpcs: VpcAssociationConfig[] | undefined,
    zoneType: HostedZoneType
  ): VpcAssociationConfig[] {
    if (!vpcs || vpcs.length === 0) {
      return zoneType === 'private' ? [] : [];
    }

    return vpcs.map(vpc => ({
      vpcId: vpc.vpcId,
      region: vpc.region
    }));
  }

  private normaliseQueryLogging(logging?: QueryLoggingConfig): QueryLoggingConfig {
    return {
      enabled: logging?.enabled ?? false,
      logGroupArn: logging?.logGroupArn,
      logGroupName: logging?.logGroupName,
      retentionDays: logging?.retentionDays ?? 90,
      removalPolicy: logging?.removalPolicy === 'retain' ? 'retain' : 'destroy'
    };
  }

  private normaliseMonitoring(monitoring?: MonitoringConfig): Route53HostedZoneConfig['monitoring'] {
    const enabled = monitoring?.enabled ?? false;

    return {
      enabled,
      alarms: {
        queryVolume: this.normaliseAlarmConfig(monitoring?.alarms?.queryVolume, {
          ...DEFAULT_ALARM_BASELINE,
          enabled,
          threshold: monitoring?.alarms?.queryVolume?.threshold ?? 10000
        }),
        healthCheckFailures: this.normaliseAlarmConfig(monitoring?.alarms?.healthCheckFailures, {
          ...DEFAULT_ALARM_BASELINE,
          enabled,
          threshold: monitoring?.alarms?.healthCheckFailures?.threshold ?? 10
        })
      }
    };
  }

  private normaliseAlarmConfig(
    alarm: HostedZoneAlarmConfig | undefined,
    defaults: Required<Omit<HostedZoneAlarmConfig, 'tags'>>
  ): HostedZoneAlarmConfig {
    return {
      enabled: alarm?.enabled ?? defaults.enabled,
      threshold: alarm?.threshold ?? defaults.threshold,
      evaluationPeriods: alarm?.evaluationPeriods ?? defaults.evaluationPeriods,
      periodMinutes: alarm?.periodMinutes ?? defaults.periodMinutes,
      comparisonOperator: alarm?.comparisonOperator ?? defaults.comparisonOperator,
      treatMissingData: alarm?.treatMissingData ?? defaults.treatMissingData,
      statistic: alarm?.statistic ?? defaults.statistic,
      tags: alarm?.tags ?? {}
    };
  }

  private sanitiseZoneName(zoneName: string): string {
    const original = zoneName.trim();
    const sanitised = original.replace(/\.$/, '').toLowerCase();
    
    // Log if trailing dot was stripped (for audit trail)
    if (original.endsWith('.') && original !== sanitised) {
      // Note: Builder doesn't have access to logger, so we'll log in component during config resolution
      // This is a validation note that will be checked in the component
    }
    
    return sanitised;
  }
}
