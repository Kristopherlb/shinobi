// src/platform/contracts/observability/observability-types.ts
// Compliance-aware observability types and contracts

import { ComplianceFramework } from '../bindings.ts';

export type ObservabilityTier = 'commercial' | 'fedramp-moderate' | 'fedramp-high';

export interface ObservabilityConfig {
  framework: ComplianceFramework;
  tier: ObservabilityTier;
  tracing: TracingConfig;
  logging: LoggingConfig;
  metrics: MetricsConfig;
  security: SecurityConfig;
}

export interface TracingConfig {
  enabled: boolean;
  provider: 'xray' | 'adot' | 'jaeger';
  samplingRate: number;
  maxTraceDuration: number; // seconds
  includeMetadata: boolean;
  customAttributes?: Record<string, string>;
}

export interface LoggingConfig {
  enabled: boolean;
  format: 'json' | 'text';
  level: 'debug' | 'info' | 'warn' | 'error';
  retentionDays: number;
  encryptionAtRest: boolean;
  auditLogging: boolean;
  performanceLogging: boolean;
  customFields?: Record<string, string>;
}

export interface MetricsConfig {
  enabled: boolean;
  collectionInterval: number; // seconds
  customMetrics: boolean;
  resourceMetrics: boolean;
  performanceMetrics: boolean;
  customDimensions?: Record<string, string>;
}

export interface SecurityConfig {
  fipsCompliant: boolean;
  stigHardened: boolean;
  encryptionInTransit: boolean;
  encryptionAtRest: boolean;
  auditTrail: boolean;
  accessLogging: boolean;
  allowedEndpoints?: string[];
  blockedEndpoints?: string[];
}

export interface ComponentObservabilityCapability {
  componentType: string;
  supportsTracing: boolean;
  supportsLogging: boolean;
  supportsMetrics: boolean;
  instrumentationType: 'lambda' | 'container' | 'vm' | 'api' | 'database';
  requiredLayers?: string[];
  requiredEnvVars?: Record<string, string>;
  requiredSidecars?: string[];
  requiredAgents?: string[];
}

export interface ObservabilityBindingResult {
  environmentVariables: Record<string, string>;
  iamPolicies: Array<{
    statement: any; // CDK PolicyStatement
    description: string;
    complianceRequirement: string;
  }>;
  cloudWatchLogGroups: Array<{
    logGroupName: string;
    retentionDays: number;
    encryptionKey?: string;
    tags?: Record<string, string>;
  }>;
  xrayConfigurations: Array<{
    serviceName: string;
    samplingRules: any[];
    customAnnotations?: Record<string, string>;
  }>;
  adotConfigurations?: Array<{
    layerArn: string;
    environmentVariables: Record<string, string>;
    configurationFile?: string;
  }>;
  sidecarConfigurations?: Array<{
    image: string;
    environmentVariables: Record<string, string>;
    volumeMounts?: Array<{ name: string; mountPath: string }>;
    resources?: any; // CDK ResourceRequirements
  }>;
  agentConfigurations?: Array<{
    agentType: string;
    installationScript: string;
    configurationFile?: string;
    systemdService?: string;
  }>;
  complianceActions: Array<{
    action: string;
    description: string;
    framework: ComplianceFramework;
    severity: 'info' | 'warning' | 'error';
  }>;
}

export interface ObservabilityEnforcementResult {
  violations: Array<{
    rule: string;
    description: string;
    severity: 'warning' | 'error';
    remediation: string;
  }>;
  recommendations: Array<{
    recommendation: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }>;
}
