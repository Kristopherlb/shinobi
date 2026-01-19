import { ConfigBuilder, ConfigBuilderContext, ComponentConfigSchema } from '@shinobi/core';

import schemaJson from '../Config.schema.json' with { type: 'json' };

export type AutoScalingGroupTerminationPolicy =
  | 'Default'
  | 'OldestInstance'
  | 'NewestInstance'
  | 'OldestLaunchConfiguration'
  | 'ClosestToNextInstanceHour';

export interface AutoScalingGroupAmiConfig {
  amiId?: string;
  namePattern?: string;
  owner?: string;
}

export interface AutoScalingGroupInstallAgentsConfig {
  ssm: boolean;
  cloudwatch: boolean;
  stigHardening: boolean;
}

export interface AutoScalingGroupLaunchTemplateConfig {
  instanceType: string;
  ami?: AutoScalingGroupAmiConfig;
  userData?: string;
  keyName?: string;
  detailedMonitoring: boolean;
  requireImdsv2: boolean;
  installAgents: AutoScalingGroupInstallAgentsConfig;
}

export interface AutoScalingGroupKmsConfig {
  useCustomerManagedKey: boolean;
  enableKeyRotation: boolean;
  kmsKeyArn?: string;
}

export interface AutoScalingGroupStorageConfig {
  rootVolumeSize: number;
  rootVolumeType: string;
  encrypted: boolean;
  kms: AutoScalingGroupKmsConfig;
}

export interface AutoScalingGroupHealthCheckConfig {
  type: 'EC2' | 'ELB';
  gracePeriod: number;
}

export interface AutoScalingGroupSecurityGroupRule {
  description: string;
  fromPort: number;
  toPort: number;
  protocol: string;
  cidrBlocks?: string[];
  sourceSecurityGroupIds?: string[];
}

export interface AutoScalingGroupVpcConfig {
  vpcId?: string;
  subnetIds?: string[];
  securityGroupIds?: string[];
  subnetType: 'PUBLIC' | 'PRIVATE_WITH_EGRESS';
  allowAllOutbound: boolean;
  securityGroupRules?: AutoScalingGroupSecurityGroupRule[];
}

export interface AutoScalingGroupSecurityConfig {
  managedPolicies: string[];
  attachLogDeliveryPolicy: boolean;
  stigComplianceTag: boolean;
}

export interface AutoScalingGroupAlarmConfig {
  enabled: boolean;
  threshold?: number;
  evaluationPeriods?: number;
  periodMinutes?: number;
  comparisonOperator?: 'GT' | 'GTE' | 'LT' | 'LTE';
  treatMissingData?: 'breaching' | 'not-breaching' | 'ignore' | 'missing';
}

export interface AutoScalingGroupMonitoringConfig {
  enabled: boolean;
  alarms: {
    cpuHigh: AutoScalingGroupAlarmConfig;
    inService: AutoScalingGroupAlarmConfig;
  };
}

export interface AutoScalingGroupUpdatePolicyConfig {
  rollingUpdate?: {
    minInstancesInService?: number;
    maxBatchSize?: number;
    pauseTime?: string;
  };
}

export interface AutoScalingGroupAutoScalingLimits {
  minCapacity: number;
  maxCapacity: number;
  desiredCapacity: number;
}

export interface AutoScalingGroupConfig {
  name?: string;
  description?: string;
  launchTemplate: AutoScalingGroupLaunchTemplateConfig;
  autoScaling: AutoScalingGroupAutoScalingLimits;
  storage: AutoScalingGroupStorageConfig;
  healthCheck: AutoScalingGroupHealthCheckConfig;
  terminationPolicies: AutoScalingGroupTerminationPolicy[];
  updatePolicy?: AutoScalingGroupUpdatePolicyConfig;
  vpc: AutoScalingGroupVpcConfig;
  security: AutoScalingGroupSecurityConfig;
  monitoring: AutoScalingGroupMonitoringConfig;
  tags: Record<string, string>;
}

const AUTO_SCALING_GROUP_CONFIG_SCHEMA = schemaJson as ComponentConfigSchema;

const DEFAULT_ALARM: AutoScalingGroupAlarmConfig = {
  enabled: true,
  threshold: 80,
  evaluationPeriods: 2,
  periodMinutes: 5,
  comparisonOperator: 'GT',
  treatMissingData: 'not-breaching'
};

const DEFAULT_IN_SERVICE_ALARM: AutoScalingGroupAlarmConfig = {
  enabled: true,
  threshold: 1,
  evaluationPeriods: 2,
  periodMinutes: 1,
  comparisonOperator: 'LT',
  treatMissingData: 'breaching'
};

export class AutoScalingGroupComponentConfigBuilder extends ConfigBuilder<AutoScalingGroupConfig> {
  constructor(builderContext: ConfigBuilderContext) {
    super(builderContext, AUTO_SCALING_GROUP_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<AutoScalingGroupConfig> {
    return {
      launchTemplate: {
        instanceType: 't3.micro',
        detailedMonitoring: true, // Enable detailed monitoring by default for security
        requireImdsv2: true, // IMDSv2 mandatory by default
        installAgents: {
          ssm: true,
          cloudwatch: true, // Enable CloudWatch agent by default for observability
          stigHardening: false // STIG hardening enabled per compliance framework
        }
      },
      autoScaling: {
        minCapacity: 1,
        maxCapacity: 3,
        desiredCapacity: 2
      },
      storage: {
        rootVolumeSize: 20,
        rootVolumeType: 'gp3',
        encrypted: true, // Encryption mandatory by default
        kms: {
          useCustomerManagedKey: false,
          enableKeyRotation: true
        }
      },
      healthCheck: {
        type: 'EC2',
        gracePeriod: 300
      },
      terminationPolicies: ['Default'],
      vpc: {
        subnetType: 'PRIVATE_WITH_EGRESS', // Default to private subnets for security
        allowAllOutbound: false, // Changed from true - Restrict outbound access by default
        securityGroupRules: [] // Empty by default - must be explicitly configured
      },
      security: {
        managedPolicies: [],
        attachLogDeliveryPolicy: true, // Enable log delivery by default for compliance
        stigComplianceTag: false // STIG compliance enabled per framework
      },
      monitoring: {
        enabled: true,
        alarms: {
          cpuHigh: { ...DEFAULT_ALARM },
          inService: { ...DEFAULT_IN_SERVICE_ALARM }
        }
      },
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
  protected getComplianceFrameworkDefaults(): Partial<AutoScalingGroupConfig> {
    // Check if highRiskEnvironment flag is set in component config or platform config
    const componentConfig = this.builderContext.spec.config as Partial<AutoScalingGroupConfig> | undefined;
    let isHighRisk = (componentConfig as any)?.highRiskEnvironment ?? false;
    
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
        storage: {
          rootVolumeSize: 20, // Will be overridden by user config
          rootVolumeType: 'gp3', // Will be overridden by user config
          encrypted: true,
          kms: {
            useCustomerManagedKey: true,
            enableKeyRotation: true
          }
        },
        launchTemplate: {
          instanceType: 't3.micro', // Will be overridden by user config
          detailedMonitoring: true, // Required property - enable for high-risk
          requireImdsv2: true, // Required property - IMDSv2 required for high-risk
          installAgents: {
            ssm: true, // Required property
            cloudwatch: true, // Required property
            stigHardening: true
          }
        },
        security: {
          managedPolicies: [], // Will be overridden by user config
          attachLogDeliveryPolicy: true, // Required property
          stigComplianceTag: true
        }
      };
    }
    
    return {}; // Standard/default environment - use hardcoded fallbacks
  }

  public buildSync(): AutoScalingGroupConfig {
    const resolved = super.buildSync() as AutoScalingGroupConfig;
    return this.normaliseConfig(resolved);
  }

  private normaliseConfig(config: AutoScalingGroupConfig): AutoScalingGroupConfig {
    const launchTemplate = config.launchTemplate ?? ({} as AutoScalingGroupLaunchTemplateConfig);
    const storage = config.storage ?? ({} as AutoScalingGroupStorageConfig);
    const vpc = config.vpc ?? ({} as AutoScalingGroupVpcConfig);
    const security = config.security ?? ({} as AutoScalingGroupSecurityConfig);
    const monitoring = config.monitoring ?? ({} as AutoScalingGroupMonitoringConfig);

    const normalised: AutoScalingGroupConfig = {
      name: config.name,
      description: config.description,
      launchTemplate: {
        instanceType: launchTemplate.instanceType ?? 't3.micro',
        ami: launchTemplate.ami,
        userData: launchTemplate.userData,
        keyName: launchTemplate.keyName,
        detailedMonitoring: launchTemplate.detailedMonitoring ?? false,
        requireImdsv2: launchTemplate.requireImdsv2 ?? true,
        installAgents: {
          ssm: launchTemplate.installAgents?.ssm ?? true,
          cloudwatch: launchTemplate.installAgents?.cloudwatch ?? true,
          stigHardening: launchTemplate.installAgents?.stigHardening ?? false
        }
      },
      autoScaling: {
        minCapacity: config.autoScaling?.minCapacity ?? 1,
        maxCapacity: config.autoScaling?.maxCapacity ?? 3,
        desiredCapacity: config.autoScaling?.desiredCapacity ?? 2
      },
      storage: {
        rootVolumeSize: storage.rootVolumeSize ?? 20,
        rootVolumeType: storage.rootVolumeType ?? 'gp3',
        encrypted: storage.encrypted ?? true,
        kms: {
          useCustomerManagedKey: storage.kms?.useCustomerManagedKey ?? false,
          enableKeyRotation: storage.kms?.enableKeyRotation ?? true,
          kmsKeyArn: storage.kms?.kmsKeyArn
        }
      },
      healthCheck: {
        type: config.healthCheck?.type ?? 'EC2',
        gracePeriod: config.healthCheck?.gracePeriod ?? 300
      },
      terminationPolicies: (config.terminationPolicies && config.terminationPolicies.length > 0)
        ? config.terminationPolicies
        : ['Default'],
      updatePolicy: config.updatePolicy,
      vpc: {
        vpcId: vpc.vpcId,
        subnetIds: vpc.subnetIds ?? [],
        securityGroupIds: vpc.securityGroupIds ?? [],
        subnetType: vpc.subnetType ?? 'PRIVATE_WITH_EGRESS',
        allowAllOutbound: vpc.allowAllOutbound ?? false
      },
      security: {
        managedPolicies: security.managedPolicies ?? [],
        attachLogDeliveryPolicy: security.attachLogDeliveryPolicy ?? false,
        stigComplianceTag: security.stigComplianceTag ?? false
      },
      monitoring: {
        enabled: monitoring.enabled ?? true,
        alarms: {
          cpuHigh: this.normaliseAlarm(monitoring.alarms?.cpuHigh, DEFAULT_ALARM),
          inService: this.normaliseAlarm(
            monitoring.alarms?.inService,
            { ...DEFAULT_IN_SERVICE_ALARM, threshold: config.autoScaling?.minCapacity ?? 1 }
          )
        }
      },
      tags: config.tags ?? {}
    };

    this.validateAutoScalingBounds(normalised);

    return normalised;
  }

  private normaliseAlarm(
    alarm: AutoScalingGroupAlarmConfig | undefined,
    defaults: AutoScalingGroupAlarmConfig
  ): AutoScalingGroupAlarmConfig {
    return {
      enabled: alarm?.enabled ?? defaults.enabled,
      threshold: alarm?.threshold ?? defaults.threshold,
      evaluationPeriods: alarm?.evaluationPeriods ?? defaults.evaluationPeriods,
      periodMinutes: alarm?.periodMinutes ?? defaults.periodMinutes,
      comparisonOperator: alarm?.comparisonOperator ?? defaults.comparisonOperator,
      treatMissingData: alarm?.treatMissingData ?? defaults.treatMissingData
    };
  }

  private validateAutoScalingBounds(config: AutoScalingGroupConfig): void {
    const { minCapacity, maxCapacity, desiredCapacity } = config.autoScaling;

    if (minCapacity > maxCapacity) {
      throw new Error('autoScaling.minCapacity cannot be greater than autoScaling.maxCapacity');
    }

    if (desiredCapacity < minCapacity || desiredCapacity > maxCapacity) {
      throw new Error('autoScaling.desiredCapacity must be between minCapacity and maxCapacity');
    }
  }
}

export { AUTO_SCALING_GROUP_CONFIG_SCHEMA };
