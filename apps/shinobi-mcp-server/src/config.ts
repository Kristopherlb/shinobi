/**
 * Configuration surface for the Shinobi MCP application.
 *
 * These types were previously provided by the infrastructure component
 * that lived under @platform/shinobi. Now that the MCP ships purely as
 * an application, we keep the contract local so both the CLI and
 * runtime have a shared definition of the configuration shape.
 */

export type ShinobiComputeMode = 'ecs';

export interface ShinobiComputeConfig {
  mode?: ShinobiComputeMode;
  cpu?: number | string;
  memory?: number | string;
  taskCount?: number | string;
  containerPort?: number | string;
}

export type ShinobiDataStoreType = 'dynamodb';

export interface ShinobiDynamoDbConfig {
  billingMode?: 'PAY_PER_REQUEST' | 'PROVISIONED';
  readCapacity?: number | string;
  writeCapacity?: number | string;
}

export interface ShinobiDataStoreConfig {
  type?: ShinobiDataStoreType;
  dynamodb?: ShinobiDynamoDbConfig;
}

export type ShinobiApiExposure = 'internal' | 'public';

export interface ShinobiApiRateLimitConfig {
  requestsPerMinute?: number | string;
  burstCapacity?: number | string;
}

export interface ShinobiApiLoadBalancerConfig {
  enabled?: boolean;
  certificateArn?: string;
  domainName?: string;
}

export interface ShinobiApiConfig {
  exposure?: ShinobiApiExposure;
  version?: string;
  loadBalancer?: ShinobiApiLoadBalancerConfig;
  rateLimit?: ShinobiApiRateLimitConfig;
}

export interface ShinobiFeatureFlagConfig {
  enabled?: boolean;
  provider?: string;
  defaults?: Record<string, boolean>;
}

export interface ShinobiDataSourcesConfig {
  components?: boolean;
  services?: boolean;
  dependencies?: boolean;
  compliance?: boolean;
  cost?: boolean;
  security?: boolean;
  performance?: boolean;
}

export interface ShinobiObservabilityThresholdsConfig {
  cpuUtilization?: number | string;
  memoryUtilization?: number | string;
  responseTime?: number | string;
}

export interface ShinobiObservabilityAlertsConfig {
  enabled?: boolean;
  thresholds?: ShinobiObservabilityThresholdsConfig;
}

export interface ShinobiObservabilityConfig {
  provider?: string;
  dashboards?: string[];
  alerts?: ShinobiObservabilityAlertsConfig;
}

export type ShinobiSecurityLevel = 'standard' | 'enhanced' | 'maximum';

export interface ShinobiComplianceConfig {
  securityLevel?: ShinobiSecurityLevel;
  auditLogging?: boolean;
  framework?: string;
}

export interface ShinobiLocalDevSeedDataConfig {
  sampleComponents?: boolean;
  sampleServices?: boolean;
  sampleMetrics?: boolean;
}

export interface ShinobiLocalDevConfig {
  enabled?: boolean;
  seedData?: ShinobiLocalDevSeedDataConfig;
  mockServices?: boolean;
}

export type ShinobiLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ShinobiLoggingConfig {
  retentionDays?: number | string;
  logLevel?: ShinobiLogLevel;
  structuredLogging?: boolean;
}

export interface ShinobiVpcConfig {
  vpcId?: string;
  subnetIds?: string[];
  securityGroupIds?: string[];
}

export interface ShinobiConfig {
  compute?: ShinobiComputeConfig;
  dataStore?: ShinobiDataStoreConfig;
  api?: ShinobiApiConfig;
  featureFlags?: ShinobiFeatureFlagConfig;
  dataSources?: ShinobiDataSourcesConfig;
  observability?: ShinobiObservabilityConfig;
  compliance?: ShinobiComplianceConfig;
  localDev?: ShinobiLocalDevConfig;
  vpc?: ShinobiVpcConfig;
  logging?: ShinobiLoggingConfig;
  tags?: Record<string, string>;
}
