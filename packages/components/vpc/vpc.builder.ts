import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';
import { ComponentContext, ComponentSpec } from '@platform/contracts';

export type VpcRemovalPolicy = 'retain' | 'destroy';

export interface VpcFlowLogsConfig {
  enabled: boolean;
  retentionInDays: number;
  removalPolicy: VpcRemovalPolicy;
}

export interface VpcSubnetConfig {
  cidrMask: number;
  name: string;
}

export interface VpcSubnetsConfig {
  public: VpcSubnetConfig;
  private: VpcSubnetConfig;
  database: VpcSubnetConfig;
}

export interface VpcEndpointConfig {
  s3: boolean;
  dynamodb: boolean;
  secretsManager: boolean;
  kms: boolean;
  lambda: boolean;
}

export interface VpcDnsConfig {
  enableDnsHostnames: boolean;
  enableDnsSupport: boolean;
}

export interface VpcMonitoringConfig {
  enabled: boolean;
  detailedMetrics: boolean;
  alarms: {
    natGatewayPacketDropThreshold: number;
    vpcFlowLogDeliveryFailures: number;
  };
}

export interface VpcSecurityConfig {
  createDefaultSecurityGroups: boolean;
  complianceNacls: {
    enabled: boolean;
    mode: 'standard' | 'high';
  };
  restrictDefaultSecurityGroup: boolean;
}

export interface VpcConfig {
  cidr: string;
  maxAzs: number;
  natGateways: number;
  flowLogs: VpcFlowLogsConfig;
  subnets: VpcSubnetsConfig;
  vpcEndpoints: VpcEndpointConfig;
  dns: VpcDnsConfig;
  monitoring: VpcMonitoringConfig;
  security: VpcSecurityConfig;
  tags: Record<string, string>;
}

const FLOW_LOGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean', default: true },
    retentionInDays: {
      type: 'number',
      enum: [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 2555, 3653],
      default: 365
    },
    removalPolicy: { type: 'string', enum: ['retain', 'destroy'], default: 'retain' }
  }
};

const SUBNET_GROUP_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    cidrMask: { type: 'number', minimum: 16, maximum: 28 },
    name: { type: 'string' }
  }
};

const ENDPOINTS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    s3: { type: 'boolean', default: false },
    dynamodb: { type: 'boolean', default: false },
    secretsManager: { type: 'boolean', default: false },
    kms: { type: 'boolean', default: false },
    lambda: { type: 'boolean', default: false }
  }
};

const DNS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enableDnsHostnames: { type: 'boolean', default: true },
    enableDnsSupport: { type: 'boolean', default: true }
  }
};

const MONITORING_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean', default: true },
    detailedMetrics: { type: 'boolean', default: false },
    alarms: {
      type: 'object',
      additionalProperties: false,
      properties: {
        natGatewayPacketDropThreshold: { type: 'number', default: 1000 },
        vpcFlowLogDeliveryFailures: { type: 'number', default: 10 }
      }
    }
  }
};

const SECURITY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    createDefaultSecurityGroups: { type: 'boolean', default: true },
    complianceNacls: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: false },
        mode: { type: 'string', enum: ['standard', 'high'], default: 'standard' }
      }
    },
    restrictDefaultSecurityGroup: { type: 'boolean', default: false }
  }
};

export const VPC_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    cidr: {
      type: 'string',
      pattern: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$'
    },
    maxAzs: { type: 'number', minimum: 1, maximum: 6 },
    natGateways: { type: 'number', minimum: 0, maximum: 6 },
    flowLogs: FLOW_LOGS_SCHEMA,
    subnets: {
      type: 'object',
      additionalProperties: false,
      properties: {
        public: SUBNET_GROUP_SCHEMA,
        private: SUBNET_GROUP_SCHEMA,
        database: SUBNET_GROUP_SCHEMA
      }
    },
    vpcEndpoints: ENDPOINTS_SCHEMA,
    dns: DNS_SCHEMA,
    monitoring: MONITORING_SCHEMA,
    security: SECURITY_SCHEMA,
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  }
};

export class VpcConfigBuilder extends ConfigBuilder<VpcConfig> {
  constructor(builderContext: ConfigBuilderContext) {
    super(builderContext, VPC_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<VpcConfig> {
    return {
      cidr: '10.0.0.0/16',
      maxAzs: 2,
      natGateways: 1,
      flowLogs: {
        enabled: true,
        retentionInDays: 365,
        removalPolicy: 'retain'
      },
      subnets: {
        public: { cidrMask: 24, name: 'Public' },
        private: { cidrMask: 24, name: 'Private' },
        database: { cidrMask: 28, name: 'Database' }
      },
      vpcEndpoints: {
        s3: false,
        dynamodb: false,
        secretsManager: false,
        kms: false,
        lambda: false
      },
      dns: {
        enableDnsHostnames: true,
        enableDnsSupport: true
      },
      monitoring: {
        enabled: true,
        detailedMetrics: false,
        alarms: {
          natGatewayPacketDropThreshold: 1000,
          vpcFlowLogDeliveryFailures: 10
        }
      },
      security: {
        createDefaultSecurityGroups: true,
        complianceNacls: {
          enabled: false,
          mode: 'standard'
        },
        restrictDefaultSecurityGroup: false
      },
      tags: {}
    };
  }

  public buildSync(): VpcConfig {
    const resolved = super.buildSync() as Partial<VpcConfig>;
    return this.normaliseConfig(resolved);
  }

  private normaliseConfig(config: Partial<VpcConfig>): VpcConfig {
    return {
      cidr: config.cidr ?? '10.0.0.0/16',
      maxAzs: this.normaliseNumber(config.maxAzs, 2),
      natGateways: this.normaliseNumber(config.natGateways, 1),
      flowLogs: this.normaliseFlowLogs(config.flowLogs),
      subnets: this.normaliseSubnets(config.subnets),
      vpcEndpoints: this.normaliseEndpoints(config.vpcEndpoints),
      dns: this.normaliseDns(config.dns),
      monitoring: this.normaliseMonitoring(config.monitoring),
      security: this.normaliseSecurity(config.security),
      tags: config.tags ?? {}
    };
  }

  private normaliseNumber(value: number | undefined, fallback: number): number {
    return typeof value === 'number' && !Number.isNaN(value) ? value : fallback;
  }

  private normaliseFlowLogs(flowLogs?: Partial<VpcFlowLogsConfig>): VpcFlowLogsConfig {
    return {
      enabled: flowLogs?.enabled ?? true,
      retentionInDays: flowLogs?.retentionInDays ?? 365,
      removalPolicy: flowLogs?.removalPolicy === 'destroy' ? 'destroy' : 'retain'
    };
  }

  private normaliseSubnets(subnets?: Partial<VpcSubnetsConfig>): VpcSubnetsConfig {
    const fallback = this.getHardcodedFallbacks().subnets!;
    return {
      public: {
        cidrMask: subnets?.public?.cidrMask ?? fallback.public.cidrMask,
        name: subnets?.public?.name ?? fallback.public.name
      },
      private: {
        cidrMask: subnets?.private?.cidrMask ?? fallback.private.cidrMask,
        name: subnets?.private?.name ?? fallback.private.name
      },
      database: {
        cidrMask: subnets?.database?.cidrMask ?? fallback.database.cidrMask,
        name: subnets?.database?.name ?? fallback.database.name
      }
    };
  }

  private normaliseEndpoints(endpoints?: Partial<VpcEndpointConfig>): VpcEndpointConfig {
    return {
      s3: endpoints?.s3 ?? false,
      dynamodb: endpoints?.dynamodb ?? false,
      secretsManager: endpoints?.secretsManager ?? false,
      kms: endpoints?.kms ?? false,
      lambda: endpoints?.lambda ?? false
    };
  }

  private normaliseDns(dns?: Partial<VpcDnsConfig>): VpcDnsConfig {
    return {
      enableDnsHostnames: dns?.enableDnsHostnames ?? true,
      enableDnsSupport: dns?.enableDnsSupport ?? true
    };
  }

  private normaliseMonitoring(monitoring?: Partial<VpcMonitoringConfig>): VpcMonitoringConfig {
    return {
      enabled: monitoring?.enabled ?? true,
      detailedMetrics: monitoring?.detailedMetrics ?? false,
      alarms: {
        natGatewayPacketDropThreshold: monitoring?.alarms?.natGatewayPacketDropThreshold ?? 1000,
        vpcFlowLogDeliveryFailures: monitoring?.alarms?.vpcFlowLogDeliveryFailures ?? 10
      }
    };
  }

  private normaliseSecurity(security?: Partial<VpcSecurityConfig>): VpcSecurityConfig {
    return {
      createDefaultSecurityGroups: security?.createDefaultSecurityGroups ?? true,
      complianceNacls: {
        enabled: security?.complianceNacls?.enabled ?? false,
        mode: security?.complianceNacls?.mode === 'high' ? 'high' : 'standard'
      },
      restrictDefaultSecurityGroup: security?.restrictDefaultSecurityGroup ?? false
    };
  }
}

export const createVpcConfigBuilder = (context: ComponentContext, spec: ComponentSpec): VpcConfigBuilder => {
  const builderContext: ConfigBuilderContext = { context, spec };
  return new VpcConfigBuilder(builderContext);
};
