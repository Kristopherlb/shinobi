import {
  ConfigBuilder,
  ConfigBuilderContext
} from '@shinobi/core';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import CONTAINER_APPLICATION_CONFIG_SCHEMA from '../Config.schema.json' assert { type: 'json' };

export interface ApplicationSecretsConfig {
  [environmentVariable: string]: string;
}

export interface ApplicationEnvironmentConfig {
  [environmentVariable: string]: string;
}

export interface ApplicationConfig {
  name: string;
  port: number;
  environment: ApplicationEnvironmentConfig;
  secrets: ApplicationSecretsConfig;
}

export interface HealthCheckConfig {
  command: string[];
  path: string;
  interval: number;
  timeout: number;
  retries: number;
  startPeriod: number;
  healthyHttpCodes: string;
  healthyThresholdCount: number;
  unhealthyThresholdCount: number;
}

export interface AutoScalingConfig {
  enabled: boolean;
  maxCapacity: number;
  cpuTarget: number;
  memoryTarget: number;
}

export interface ServiceConfig {
  desiredCount: number;
  cpu: number;
  memory: number;
  healthCheck: HealthCheckConfig;
  autoScaling: AutoScalingConfig;
}

export interface NetworkConfig {
  vpcId?: string;
  subnetIds?: string[];
  securityGroupIds?: string[];
  assignPublicIp: boolean;
  loadBalancerScheme: 'internet-facing' | 'internal';
  natGateways: number;
}

export interface LoadBalancerConfig {
  port: number;
  sslCertificateArn?: string;
}

export interface EcrConfig {
  createRepository: boolean;
  repositoryArn?: string;
  maxImageCount: number;
  imageScanOnPush: boolean;
}

export interface ObservabilityConfig {
  enabled: boolean;
  logRetentionDays: number;
  cpuThreshold: number;
  memoryThreshold: number;
  enableTracing: boolean;
  enableMetrics: boolean;
}

export interface SecurityConfig {
  enableEncryption: boolean;
  enableVpcFlowLogs: boolean;
  enableWaf: boolean;
  webAclArn?: string;
}

export interface ContainerApplicationConfig {
  application: ApplicationConfig;
  service: ServiceConfig;
  network: NetworkConfig;
  loadBalancer: LoadBalancerConfig;
  ecr: EcrConfig;
  observability: ObservabilityConfig;
  security: SecurityConfig;
  tags: Record<string, string>;
}

const DEFAULT_HEALTH_CHECK: HealthCheckConfig = {
  command: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1'],
  path: '/health',
  interval: 30,
  timeout: 5,
  retries: 3,
  startPeriod: 60,
  healthyHttpCodes: '200',
  healthyThresholdCount: 2,
  unhealthyThresholdCount: 3
};

const DEFAULT_CONFIG: ContainerApplicationConfig = {
  application: {
    name: 'container-app',
    port: 3000,
    environment: {
      NODE_ENV: 'production'
    },
    secrets: {}
  },
  service: {
    desiredCount: 2,
    cpu: 512,
    memory: 1024,
    healthCheck: DEFAULT_HEALTH_CHECK,
    autoScaling: {
      enabled: true,
      maxCapacity: 4,
      cpuTarget: 75,
      memoryTarget: 80
    }
  },
  network: {
    assignPublicIp: true,
    loadBalancerScheme: 'internet-facing',
    natGateways: 0
  },
  loadBalancer: {
    port: 80
  },
  ecr: {
    createRepository: true,
    maxImageCount: 10,
    imageScanOnPush: true
  },
  observability: {
    enabled: true,
    logRetentionDays: 30,
    cpuThreshold: 80,
    memoryThreshold: 85,
    enableTracing: true,
    enableMetrics: true
  },
  security: {
    enableEncryption: true,
    enableVpcFlowLogs: true,
    enableWaf: false
  },
  tags: {}
};

export class ContainerApplicationComponentConfigBuilder extends ConfigBuilder<ContainerApplicationConfig> {
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, CONTAINER_APPLICATION_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<ContainerApplicationConfig> {
    return DEFAULT_CONFIG;
  }

  public buildSync(): ContainerApplicationConfig {
    const resolved = super.buildSync() as Partial<ContainerApplicationConfig>;
    return this.normaliseConfig(resolved);
  }

  private normaliseConfig(config: Partial<ContainerApplicationConfig>): ContainerApplicationConfig {
    const application: ApplicationConfig = {
      name: config.application?.name ?? DEFAULT_CONFIG.application.name,
      port: config.application?.port ?? DEFAULT_CONFIG.application.port,
      environment: {
        ...DEFAULT_CONFIG.application.environment,
        ...(config.application?.environment ?? {})
      },
      secrets: { ...(config.application?.secrets ?? {}) }
    };

    const service: ServiceConfig = {
      desiredCount: config.service?.desiredCount ?? DEFAULT_CONFIG.service.desiredCount,
      cpu: config.service?.cpu ?? DEFAULT_CONFIG.service.cpu,
      memory: config.service?.memory ?? DEFAULT_CONFIG.service.memory,
      healthCheck: {
        ...DEFAULT_HEALTH_CHECK,
        ...(config.service?.healthCheck ?? {})
      },
      autoScaling: {
        enabled: config.service?.autoScaling?.enabled ?? DEFAULT_CONFIG.service.autoScaling.enabled,
        maxCapacity: config.service?.autoScaling?.maxCapacity ?? DEFAULT_CONFIG.service.autoScaling.maxCapacity,
        cpuTarget: config.service?.autoScaling?.cpuTarget ?? DEFAULT_CONFIG.service.autoScaling.cpuTarget,
        memoryTarget: config.service?.autoScaling?.memoryTarget ?? DEFAULT_CONFIG.service.autoScaling.memoryTarget
      }
    };

    const network: NetworkConfig = {
      vpcId: config.network?.vpcId,
      subnetIds: config.network?.subnetIds,
      securityGroupIds: config.network?.securityGroupIds,
      assignPublicIp: config.network?.assignPublicIp ?? DEFAULT_CONFIG.network.assignPublicIp,
      loadBalancerScheme: config.network?.loadBalancerScheme ?? DEFAULT_CONFIG.network.loadBalancerScheme,
      natGateways: config.network?.natGateways ?? DEFAULT_CONFIG.network.natGateways
    };

    const loadBalancer: LoadBalancerConfig = {
      port: config.loadBalancer?.port ?? DEFAULT_CONFIG.loadBalancer.port,
      sslCertificateArn: config.loadBalancer?.sslCertificateArn
    };

    const ecr: EcrConfig = {
      createRepository: config.ecr?.createRepository ?? DEFAULT_CONFIG.ecr.createRepository,
      repositoryArn: config.ecr?.repositoryArn,
      maxImageCount: config.ecr?.maxImageCount ?? DEFAULT_CONFIG.ecr.maxImageCount,
      imageScanOnPush: config.ecr?.imageScanOnPush ?? DEFAULT_CONFIG.ecr.imageScanOnPush
    };

    const observability: ObservabilityConfig = {
      enabled: config.observability?.enabled ?? DEFAULT_CONFIG.observability.enabled,
      logRetentionDays: config.observability?.logRetentionDays ?? DEFAULT_CONFIG.observability.logRetentionDays,
      cpuThreshold: config.observability?.cpuThreshold ?? DEFAULT_CONFIG.observability.cpuThreshold,
      memoryThreshold: config.observability?.memoryThreshold ?? DEFAULT_CONFIG.observability.memoryThreshold,
      enableTracing: config.observability?.enableTracing ?? DEFAULT_CONFIG.observability.enableTracing,
      enableMetrics: config.observability?.enableMetrics ?? DEFAULT_CONFIG.observability.enableMetrics
    };

    const security: SecurityConfig = {
      enableEncryption: config.security?.enableEncryption ?? DEFAULT_CONFIG.security.enableEncryption,
      enableVpcFlowLogs: config.security?.enableVpcFlowLogs ?? DEFAULT_CONFIG.security.enableVpcFlowLogs,
      enableWaf: config.security?.enableWaf ?? DEFAULT_CONFIG.security.enableWaf,
      webAclArn: config.security?.webAclArn
    };

    const tags = {
      ...DEFAULT_CONFIG.tags,
      ...(config.tags ?? {})
    };

    return {
      application,
      service,
      network,
      loadBalancer,
      ecr,
      observability,
      security,
      tags
    };
  }
}

export { CONTAINER_APPLICATION_CONFIG_SCHEMA };
