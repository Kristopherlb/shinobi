import {
  ComponentContext,
  ComponentSpec,
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';

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

const CREDENTIALS_FALSE = {
  allowOrigins: {
    type: 'array',
    description:
      'Explicit list of allowed origins. Defaults to []. Must never contain *.',
    items: { type: 'string' },
    default: [],
  },
  allowMethods: {
    type: 'array',
    description: 'Allowed HTTP methods. Defaults to security-first [GET, POST, OPTIONS].',
    items: { type: 'string' },
    default: ['GET', 'POST', 'OPTIONS'],
  },
  allowHeaders: {
    type: 'array',
    description:
      'Allowed headers. Defaults to security-first headers [Content-Type, Authorization].',
    items: { type: 'string' },
    default: ['Content-Type', 'Authorization'],
  },
  allowCredentials: {
    type: 'boolean',
    description: 'Whether credentials are allowed. Defaults to false for safety.',
    default: false,
  },
  maxAge: {
    type: 'integer',
    description: 'Optional CORS max-age in seconds.',
  },
};

export const API_GATEWAY_REST_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    apiName: {
      type: 'string',
      description: 'Friendly name for the API Gateway REST API.',
      pattern: '^[A-Za-z0-9._-]+$',
      maxLength: 128,
    },
    description: {
      type: 'string',
      description: 'Human-readable description used for AWS tagging and documentation.',
      maxLength: 1024,
    },
    deploymentStage: {
      type: 'string',
      description: 'Deployment stage name. Defaults to the current environment.',
      pattern: '^[A-Za-z0-9._-]+$',
      maxLength: 64,
    },
    disableExecuteApiEndpoint: {
      type: 'boolean',
      description:
        'When true, disables the default execute-api endpoint. FedRAMP requires this to be true.',
    },
    domain: {
      type: 'object',
      description: 'Optional custom domain configuration.',
      additionalProperties: false,
      properties: {
        domainName: {
          type: 'string',
          description: 'Fully qualified domain name to associate with the REST API.',
        },
        certificateArn: {
          type: 'string',
          description: 'ARN of an ACM certificate in the same region.',
        },
        basePath: {
          type: 'string',
          description: 'Base path mapping for the custom domain.',
        },
      },
    },
    cors: {
      type: 'object',
      description:
        'CORS configuration. Defaults align with Platform Configuration Standard security guidance.',
      additionalProperties: false,
      properties: CREDENTIALS_FALSE,
    },
    authentication: {
      type: 'object',
      additionalProperties: false,
      description: 'Authentication configuration supporting Cognito and API keys.',
      properties: {
        cognito: {
          type: 'object',
          additionalProperties: false,
          properties: {
            userPoolArn: {
              type: 'string',
              description: 'ARN of the Cognito User Pool to authorize requests.',
            },
            scopes: {
              type: 'array',
              description: 'Optional list of OAuth scopes required for authorization.',
              items: { type: 'string' },
            },
          },
        },
        apiKey: {
          type: 'object',
          additionalProperties: false,
          properties: {
            required: {
              type: 'boolean',
              description: 'Whether an API key is required for any method.',
            },
            keyName: {
              type: 'string',
              description: 'Friendly name for the generated API key.',
            },
            usagePlanName: {
              type: 'string',
              description: 'Optional usage plan name when provisioning API keys.',
            },
            throttle: {
              type: 'object',
              additionalProperties: false,
              properties: {
                rateLimit: {
                  type: 'number',
                  description: 'Rate limit requests per second for the usage plan.',
                },
                burstLimit: {
                  type: 'number',
                  description: 'Burst limit for the usage plan.',
                },
              },
            },
            quota: {
              type: 'object',
              additionalProperties: false,
              required: ['limit', 'period'],
              properties: {
                limit: {
                  type: 'number',
                  description: 'Absolute request limit for the usage plan quota.',
                },
                period: {
                  type: 'string',
                  enum: ['DAY', 'WEEK', 'MONTH'],
                  description: 'Quota reset period.',
                },
              },
            },
          },
        },
      },
    },
    throttling: {
      type: 'object',
      additionalProperties: false,
      description: 'Global stage-level throttling configuration.',
      properties: {
        burstLimit: {
          type: 'number',
          description: 'Maximum API Gateway burst limit for the stage.',
        },
        rateLimit: {
          type: 'number',
          description: 'Requests per second permitted for the stage.',
        },
      },
    },
    logging: {
      type: 'object',
      additionalProperties: false,
      description: 'Access and execution logging configuration.',
      properties: {
        accessLoggingEnabled: {
          type: 'boolean',
          description: 'Enable access logs for API Gateway stages.',
          default: true,
        },
        retentionInDays: {
          type: 'number',
          description: 'Log retention period in days.',
        },
        executionLoggingLevel: {
          type: 'string',
          enum: ['OFF', 'ERROR', 'INFO'],
          description: 'Execution logging level for stage methods.',
        },
        dataTraceEnabled: {
          type: 'boolean',
          description: 'Enable detailed request/response logging. Must remain false in FedRAMP.',
        },
        metricsEnabled: {
          type: 'boolean',
          description: 'Enable CloudWatch execution metrics.',
        },
        logGroupArn: {
          type: 'string',
          description: 'Optional existing log group ARN. When omitted a group is created automatically.',
        },
      },
    },
    monitoring: {
      type: 'object',
      additionalProperties: false,
      description: 'Monitoring configuration including detailed metrics and alert thresholds.',
      properties: {
        detailedMetrics: {
          type: 'boolean',
          description: 'Enable detailed metrics collection.',
        },
        tracingEnabled: {
          type: 'boolean',
          description: 'Enable X-Ray tracing for the API.',
        },
        thresholds: {
          type: 'object',
          additionalProperties: false,
          properties: {
            errorRate4xxPercent: {
              type: 'number',
              description: '4XX error-rate alarm threshold (percentage).',
            },
            errorRate5xxPercent: {
              type: 'number',
              description: '5XX error-rate alarm threshold (percentage).',
            },
            highLatencyMs: {
              type: 'number',
              description: 'Latency alarm threshold in milliseconds.',
            },
            lowThroughput: {
              type: 'number',
              description: 'Alarm threshold for low throughput (requests per minute).',
            },
          },
        },
        customMetrics: {
          type: 'array',
          description: 'Custom CloudWatch metrics configuration.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'namespace', 'statistic', 'period'],
            properties: {
              name: {
                type: 'string',
                description: 'Metric name.',
              },
              namespace: {
                type: 'string',
                description: 'CloudWatch namespace for the metric.',
              },
              dimensions: {
                type: 'object',
                description: 'Metric dimensions.',
                additionalProperties: { type: 'string' },
              },
              statistic: {
                type: 'string',
                enum: ['Average', 'Sum', 'Maximum', 'Minimum', 'SampleCount'],
                description: 'Metric statistic type.',
              },
              period: {
                type: 'number',
                description: 'Metric period in seconds.',
              },
              unit: {
                type: 'string',
                description: 'Metric unit (e.g., Count, Seconds, Bytes).',
              },
            },
          },
        },
        businessMetrics: {
          type: 'object',
          additionalProperties: false,
          description: 'Business metrics configuration for enhanced monitoring.',
          properties: {
            transactionVolume: {
              type: 'boolean',
              description: 'Enable transaction volume tracking.',
              default: false,
            },
            userActivity: {
              type: 'boolean',
              description: 'Enable user activity monitoring.',
              default: false,
            },
            featureUsage: {
              type: 'boolean',
              description: 'Enable feature usage tracking.',
              default: false,
            },
            performanceMetrics: {
              type: 'boolean',
              description: 'Enable advanced performance metrics.',
              default: false,
            },
          },
        },
      },
    },
    tracing: {
      type: 'object',
      additionalProperties: false,
      description: 'Explicit tracing configuration. Kept for backward compatibility.',
      properties: {
        xrayEnabled: {
          type: 'boolean',
          description: 'Enable AWS X-Ray tracing.',
        },
      },
    },
    usagePlan: {
      type: 'object',
      additionalProperties: false,
      description: 'Optional usage plan that can be attached to API keys.',
      properties: {
        name: {
          type: 'string',
          description: 'Usage plan name.',
        },
        description: {
          type: 'string',
          description: 'Usage plan description.',
        },
        throttle: {
          type: 'object',
          additionalProperties: false,
          properties: {
            rateLimit: {
              type: 'number',
              description: 'Usage-plan level rate limit.',
            },
            burstLimit: {
              type: 'number',
              description: 'Usage-plan level burst limit.',
            },
          },
        },
        quota: {
          type: 'object',
          additionalProperties: false,
          required: ['limit', 'period'],
          properties: {
            limit: {
              type: 'number',
              description: 'Usage-plan quota limit.',
            },
            period: {
              type: 'string',
              enum: ['DAY', 'WEEK', 'MONTH'],
              description: 'Usage-plan quota period.',
            },
          },
        },
      },
    },
    waf: {
      type: 'object',
      additionalProperties: false,
      description: 'Optional AWS WAF web ACL association.',
      properties: {
        webAclArn: {
          type: 'string',
          description: 'ARN of the WAF WebACL to associate with the API stage.',
        },
      },
    },
    resourcePolicy: {
      type: 'object',
      additionalProperties: false,
      description: 'API Gateway resource policy for access control.',
      properties: {
        document: {
          type: 'string',
          description: 'Custom resource policy document in JSON format.',
        },
        allowFromVpcs: {
          type: 'array',
          description: 'List of VPC IDs allowed to access the API.',
          items: { type: 'string' },
        },
        allowFromIpRanges: {
          type: 'array',
          description: 'List of IP ranges allowed to access the API.',
          items: { type: 'string' },
        },
        denyFromIpRanges: {
          type: 'array',
          description: 'List of IP ranges denied access to the API.',
          items: { type: 'string' },
        },
        allowFromAwsAccounts: {
          type: 'array',
          description: 'List of AWS account IDs allowed to access the API.',
          items: { type: 'string' },
        },
        allowFromRegions: {
          type: 'array',
          description: 'List of AWS regions allowed to access the API.',
          items: { type: 'string' },
        },
        denyFromRegions: {
          type: 'array',
          description: 'List of AWS regions denied access to the API.',
          items: { type: 'string' },
        },
      },
    },
    requestValidation: {
      type: 'object',
      additionalProperties: false,
      description: 'Request validation configuration for enhanced security.',
      properties: {
        validateRequestBody: {
          type: 'boolean',
          description: 'Enable request body validation.',
          default: false,
        },
        validateRequestParameters: {
          type: 'boolean',
          description: 'Enable request parameter validation.',
          default: false,
        },
        validateHeaders: {
          type: 'boolean',
          description: 'Enable request header validation.',
          default: false,
        },
        requiredHeaders: {
          type: 'array',
          description: 'List of required headers for all requests.',
          items: { type: 'string' },
        },
        bodySchema: {
          type: 'object',
          description: 'JSON schema for request body validation.',
          additionalProperties: true,
        },
      },
    },
    advancedThrottling: {
      type: 'object',
      additionalProperties: false,
      description: 'Advanced throttling configuration with per-method controls.',
      properties: {
        perMethodThrottling: {
          type: 'boolean',
          description: 'Enable per-method throttling configuration.',
          default: false,
        },
        burstLimit: {
          type: 'number',
          description: 'Global burst limit for all methods.',
        },
        rateLimit: {
          type: 'number',
          description: 'Global rate limit for all methods.',
        },
        quotaLimit: {
          type: 'number',
          description: 'Global quota limit for all methods.',
        },
        quotaPeriod: {
          type: 'string',
          enum: ['DAY', 'WEEK', 'MONTH'],
          description: 'Global quota period for all methods.',
        },
        customThrottlingRules: {
          type: 'array',
          description: 'Custom throttling rules for specific paths and methods.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['path', 'method', 'burstLimit', 'rateLimit'],
            properties: {
              path: {
                type: 'string',
                description: 'API path pattern (e.g., /users/{id}).',
              },
              method: {
                type: 'string',
                description: 'HTTP method (GET, POST, PUT, DELETE, etc.).',
              },
              burstLimit: {
                type: 'number',
                description: 'Burst limit for this specific path/method.',
              },
              rateLimit: {
                type: 'number',
                description: 'Rate limit for this specific path/method.',
              },
            },
          },
        },
      },
    },
    tags: {
      type: 'object',
      description: 'Additional resource tags applied in addition to the platform baseline.',
      additionalProperties: { type: 'string' },
    },
  },
};

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

  public build(): ApiGatewayRestConfig {
    return super.buildSync();
  }

}
