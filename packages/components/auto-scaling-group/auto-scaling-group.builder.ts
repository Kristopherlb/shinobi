import { ConfigBuilder, ConfigBuilderContext, ComponentConfigSchema } from '@shinobi/core';

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

export interface AutoScalingGroupVpcConfig {
  vpcId?: string;
  subnetIds?: string[];
  securityGroupIds?: string[];
  subnetType: 'PUBLIC' | 'PRIVATE_WITH_EGRESS';
  allowAllOutbound: boolean;
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

const AUTO_SCALING_GROUP_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    launchTemplate: {
      type: 'object',
      additionalProperties: false,
      properties: {
        instanceType: { type: 'string' },
        ami: {
          type: 'object',
          additionalProperties: false,
          properties: {
            amiId: { type: 'string' },
            namePattern: { type: 'string' },
            owner: { type: 'string' }
          }
        },
        userData: { type: 'string' },
        keyName: { type: 'string' },
        detailedMonitoring: { type: 'boolean' },
        requireImdsv2: { type: 'boolean' },
        installAgents: {
          type: 'object',
          additionalProperties: false,
          properties: {
            ssm: { type: 'boolean' },
            cloudwatch: { type: 'boolean' },
            stigHardening: { type: 'boolean' }
          }
        }
      }
    },
    autoScaling: {
      type: 'object',
      additionalProperties: false,
      properties: {
        minCapacity: { type: 'number' },
        maxCapacity: { type: 'number' },
        desiredCapacity: { type: 'number' }
      }
    },
    storage: {
      type: 'object',
      additionalProperties: false,
      properties: {
        rootVolumeSize: { type: 'number' },
        rootVolumeType: { type: 'string' },
        encrypted: { type: 'boolean' },
        kms: {
          type: 'object',
          additionalProperties: false,
          properties: {
            useCustomerManagedKey: { type: 'boolean' },
            enableKeyRotation: { type: 'boolean' },
            kmsKeyArn: { type: 'string' }
          }
        }
      }
    },
    healthCheck: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { type: 'string', enum: ['EC2', 'ELB'] },
        gracePeriod: { type: 'number' }
      }
    },
    terminationPolicies: {
      type: 'array',
      items: { type: 'string' }
    },
    updatePolicy: {
      type: 'object',
      additionalProperties: false,
      properties: {
        rollingUpdate: {
          type: 'object',
          additionalProperties: false,
          properties: {
            minInstancesInService: { type: 'number' },
            maxBatchSize: { type: 'number' },
            pauseTime: { type: 'string' }
          }
        }
      }
    },
    vpc: {
      type: 'object',
      additionalProperties: false,
      properties: {
        vpcId: { type: 'string' },
        subnetIds: {
          type: 'array',
          items: { type: 'string' }
        },
        securityGroupIds: {
          type: 'array',
          items: { type: 'string' }
        },
        subnetType: { type: 'string', enum: ['PUBLIC', 'PRIVATE_WITH_EGRESS'] },
        allowAllOutbound: { type: 'boolean' }
      }
    },
    security: {
      type: 'object',
      additionalProperties: false,
      properties: {
        managedPolicies: {
          type: 'array',
          items: { type: 'string' }
        },
        attachLogDeliveryPolicy: { type: 'boolean' },
        stigComplianceTag: { type: 'boolean' }
      }
    },
    monitoring: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean' },
        alarms: {
          type: 'object',
          additionalProperties: false,
          properties: {
            cpuHigh: { type: 'object' },
            inService: { type: 'object' }
          }
        }
      }
    },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  }
};

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
        detailedMonitoring: false,
        requireImdsv2: false,
        installAgents: {
          ssm: false,
          cloudwatch: false,
          stigHardening: false
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
        encrypted: false,
        kms: {
          useCustomerManagedKey: false,
          enableKeyRotation: false
        }
      },
      healthCheck: {
        type: 'EC2',
        gracePeriod: 300
      },
      terminationPolicies: ['Default'],
      vpc: {
        subnetType: 'PUBLIC',
        allowAllOutbound: true
      },
      security: {
        managedPolicies: [],
        attachLogDeliveryPolicy: false,
        stigComplianceTag: false
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
        requireImdsv2: launchTemplate.requireImdsv2 ?? false,
        installAgents: {
          ssm: launchTemplate.installAgents?.ssm ?? false,
          cloudwatch: launchTemplate.installAgents?.cloudwatch ?? false,
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
        encrypted: storage.encrypted ?? false,
        kms: {
          useCustomerManagedKey: storage.kms?.useCustomerManagedKey ?? false,
          enableKeyRotation: storage.kms?.enableKeyRotation ?? false,
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
        subnetType: vpc.subnetType ?? 'PUBLIC',
        allowAllOutbound: vpc.allowAllOutbound ?? true
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
}

export { AUTO_SCALING_GROUP_CONFIG_SCHEMA };
