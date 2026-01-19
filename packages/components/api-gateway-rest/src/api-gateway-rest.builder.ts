import {
  ComponentContext,
  ComponentSpec,
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';
import schemaJson from '../Config.schema.json' with { type: 'json' };

export interface ApiGatewayRestCorsConfig {
  allowOrigins?: string[];
  allowMethods?: string[];
  allowHeaders?: string[];
  allowCredentials?: boolean;
  maxAge?: number;
}

export interface ApiGatewayRestDomainConfig {
  domainName?: string;
  certificateArn?: string;
  basePath?: string;
}

export interface ApiGatewayRestCognitoAuthConfig {
  userPoolArn?: string;
  scopes?: string[];
}

export interface ApiGatewayRestApiKeyConfig {
  required?: boolean;
  keyName?: string;
  usagePlanName?: string;
  throttle?: {
    rateLimit?: number;
    burstLimit?: number;
  };
  quota?: {
    limit?: number;
    period?: 'DAY' | 'WEEK' | 'MONTH';
  };
}

export interface ApiGatewayRestAuthenticationConfig {
  cognito?: ApiGatewayRestCognitoAuthConfig;
  apiKey?: ApiGatewayRestApiKeyConfig;
}

export interface ApiGatewayRestLoggingConfig {
  accessLoggingEnabled?: boolean;
  retentionInDays?: number;
  executionLoggingLevel?: 'OFF' | 'ERROR' | 'INFO';
  dataTraceEnabled?: boolean;
  metricsEnabled?: boolean;
  logGroupArn?: string;
}

export interface ApiGatewayRestMonitoringThresholds {
  errorRate4xxPercent?: number;
  errorRate5xxPercent?: number;
  highLatencyMs?: number;
  lowThroughput?: number;
}

export interface ApiGatewayRestCustomMetricsConfig {
  name: string;
  namespace: string;
  dimensions?: Record<string, string>;
  statistic: 'Average' | 'Sum' | 'Maximum' | 'Minimum' | 'SampleCount';
  period: number;
  unit?: string;
}

export interface ApiGatewayRestMonitoringConfig {
  detailedMetrics?: boolean;
  tracingEnabled?: boolean;
  thresholds?: ApiGatewayRestMonitoringThresholds;
  customMetrics?: ApiGatewayRestCustomMetricsConfig[];
  businessMetrics?: {
    transactionVolume?: boolean;
    userActivity?: boolean;
    featureUsage?: boolean;
    performanceMetrics?: boolean;
  };
}

export interface ApiGatewayRestThrottlingConfig {
  burstLimit?: number;
  rateLimit?: number;
}

export interface ApiGatewayRestUsagePlanConfig {
  name?: string;
  description?: string;
  throttle?: ApiGatewayRestThrottlingConfig;
  quota?: {
    limit: number;
    period: 'DAY' | 'WEEK' | 'MONTH';
  };
}

export interface ApiGatewayRestWafConfig {
  webAclArn?: string;
}

export interface ApiGatewayRestResourcePolicyConfig {
  document?: string;
  allowFromVpcs?: string[];
  allowFromIpRanges?: string[];
  denyFromIpRanges?: string[];
  allowFromAwsAccounts?: string[];
  allowFromRegions?: string[];
  denyFromRegions?: string[];
}

export interface ApiGatewayRestRequestValidationConfig {
  validateRequestBody?: boolean;
  validateRequestParameters?: boolean;
  validateHeaders?: boolean;
  requiredHeaders?: string[];
  bodySchema?: Record<string, any>;
}

export interface ApiGatewayRestAdvancedThrottlingConfig {
  perMethodThrottling?: boolean;
  burstLimit?: number;
  rateLimit?: number;
  quotaLimit?: number;
  quotaPeriod?: 'DAY' | 'WEEK' | 'MONTH';
  customThrottlingRules?: Array<{
    path: string;
    method: string;
    burstLimit: number;
    rateLimit: number;
  }>;
}

export interface ApiGatewayRestConfig {
  apiName?: string;
  description?: string;
  deploymentStage?: string;
  disableExecuteApiEndpoint?: boolean;
  domain?: ApiGatewayRestDomainConfig;
  cors?: ApiGatewayRestCorsConfig;
  authentication?: ApiGatewayRestAuthenticationConfig;
  throttling?: ApiGatewayRestThrottlingConfig;
  advancedThrottling?: ApiGatewayRestAdvancedThrottlingConfig;
  logging?: ApiGatewayRestLoggingConfig;
  monitoring?: ApiGatewayRestMonitoringConfig;
  tracing?: {
    xrayEnabled?: boolean;
  };
  usagePlan?: ApiGatewayRestUsagePlanConfig;
  waf?: ApiGatewayRestWafConfig;
  resourcePolicy?: ApiGatewayRestResourcePolicyConfig;
  requestValidation?: ApiGatewayRestRequestValidationConfig;
  tags?: Record<string, string>;
}

/**
 * Schema is imported from Config.schema.json file per component standards.
 */
export const API_GATEWAY_REST_CONFIG_SCHEMA: ComponentConfigSchema = schemaJson as ComponentConfigSchema;

export class ApiGatewayRestConfigBuilder extends ConfigBuilder<ApiGatewayRestConfig> {
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, API_GATEWAY_REST_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): ApiGatewayRestConfig {
    const { context, spec } = this.builderContext;
    const env = context.environment ?? 'prod';
    const componentName = spec.name;

    return {
      apiName: `${context.serviceName}-${componentName}`,
      description: `Enterprise REST API Gateway for ${componentName}`,
      deploymentStage: env,
      disableExecuteApiEndpoint: false,
      cors: {
        allowOrigins: [],
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        allowCredentials: false,
      },
      throttling: {
        burstLimit: 100,
        rateLimit: 50,
      },
      logging: {
        accessLoggingEnabled: true,
        retentionInDays: 90,
        executionLoggingLevel: 'ERROR',
        dataTraceEnabled: false,
        metricsEnabled: true,
      },
      monitoring: {
        detailedMetrics: true,
        tracingEnabled: false,
        thresholds: {
          errorRate4xxPercent: 5,
          errorRate5xxPercent: 1,
          highLatencyMs: 2000,
          lowThroughput: 10,
        },
      },
      tracing: {
        xrayEnabled: false,
      },
      usagePlan: undefined,
      waf: {},
      tags: {},
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
  protected getComplianceFrameworkDefaults(): Partial<ApiGatewayRestConfig> {
    // Check if highRiskEnvironment flag is set in component config or platform config
    const componentConfig = this.builderContext.spec.config as Partial<ApiGatewayRestConfig> | undefined;
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
        logging: {
          accessLoggingEnabled: true,
          retentionInDays: 1095, // 3 years for high-risk environments
          executionLoggingLevel: 'INFO',
          dataTraceEnabled: true,
          metricsEnabled: true
        },
        monitoring: {
          detailedMetrics: true,
          tracingEnabled: true,
          thresholds: {
            errorRate4xxPercent: 3,
            errorRate5xxPercent: 0.5,
            highLatencyMs: 1500,
            lowThroughput: 5
          }
        },
        tracing: {
          xrayEnabled: true
        }
      };
    }
    
    return {}; // Standard/default environment - use hardcoded fallbacks
  }

  public build(): ApiGatewayRestConfig {
    return super.buildSync();
  }

}
