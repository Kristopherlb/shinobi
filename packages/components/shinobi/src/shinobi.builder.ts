import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';

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
  logging?: ShinobiLoggingConfig;
  vpc?: ShinobiVpcConfig;
  tags?: Record<string, string>;
}

const numberOrString = (minimum?: number, maximum?: number) => ({
  oneOf: [
    {
      type: 'integer',
      ...(minimum !== undefined ? { minimum } : {}),
      ...(maximum !== undefined ? { maximum } : {})
    },
    {
      type: 'string'
    }
  ]
});

export const SHINOBI_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    compute: {
      type: 'object',
      additionalProperties: false,
      properties: {
        mode: {
          type: 'string',
          enum: ['ecs'],
          description: 'Execution mode for the Shinobi service'
        },
        cpu: {
          ...numberOrString(256),
          description: 'CPU units allocated to the Shinobi task'
        },
        memory: {
          ...numberOrString(512),
          description: 'Memory (MiB) allocated to the Shinobi task'
        },
        taskCount: {
          ...numberOrString(1),
          description: 'Desired number of tasks to run'
        },
        containerPort: {
          ...numberOrString(1, 65535),
          description: 'Container port exposed by the Shinobi service'
        }
      }
    },
    dataStore: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: {
          type: 'string',
          enum: ['dynamodb'],
          description: 'Primary data store type'
        },
        dynamodb: {
          type: 'object',
          additionalProperties: false,
          properties: {
            billingMode: {
              type: 'string',
              enum: ['PAY_PER_REQUEST', 'PROVISIONED'],
              description: 'Billing mode for the DynamoDB table'
            },
            readCapacity: {
              ...numberOrString(1),
              description: 'Read capacity units when using PROVISIONED mode'
            },
            writeCapacity: {
              ...numberOrString(1),
              description: 'Write capacity units when using PROVISIONED mode'
            }
          }
        }
      }
    },
    api: {
      type: 'object',
      additionalProperties: false,
      properties: {
        exposure: {
          type: 'string',
          enum: ['internal', 'public'],
          description: 'Network exposure level for the Shinobi API'
        },
        version: {
          type: 'string',
          description: 'Semantic version of the Shinobi API'
        },
        loadBalancer: {
          type: 'object',
          additionalProperties: false,
          properties: {
            enabled: {
              type: 'boolean',
              description: 'Whether to provision an Application Load Balancer'
            },
            certificateArn: {
              type: 'string',
              description: 'ACM certificate ARN for HTTPS listeners',
              pattern: '^arn:aws:acm:[a-z0-9-]+:[0-9]{12}:certificate\/[a-f0-9-]{36}$'
            },
            domainName: {
              type: 'string',
              description: 'Custom domain name for the Shinobi API',
              pattern: '^[a-z0-9.-]+$'
            }
          }
        },
        rateLimit: {
          type: 'object',
          additionalProperties: false,
          properties: {
            requestsPerMinute: {
              ...numberOrString(1),
              description: 'Allowed requests per minute'
            },
            burstCapacity: {
              ...numberOrString(1),
              description: 'Allowed burst capacity for throttling'
            }
          }
        }
      }
    },
    featureFlags: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable platform feature flag integration'
        },
        provider: {
          type: 'string',
          description: 'Feature flag provider identifier'
        },
        defaults: {
          type: 'object',
          additionalProperties: {
            type: 'boolean'
          },
          description: 'Default values for Shinobi feature flags'
        }
      }
    },
    dataSources: {
      type: 'object',
      additionalProperties: false,
      properties: {
        components: { type: 'boolean' },
        services: { type: 'boolean' },
        dependencies: { type: 'boolean' },
        compliance: { type: 'boolean' },
        cost: { type: 'boolean' },
        security: { type: 'boolean' },
        performance: { type: 'boolean' }
      }
    },
    observability: {
      type: 'object',
      additionalProperties: false,
      properties: {
        provider: {
          type: 'string',
          description: 'Observability provider (e.g., cloudwatch)'
        },
        dashboards: {
          type: 'array',
          items: { type: 'string' },
          description: 'Dashboards to provision for Shinobi'
        },
        alerts: {
          type: 'object',
          additionalProperties: false,
          properties: {
            enabled: {
              type: 'boolean',
              description: 'Enable CloudWatch alarms for Shinobi'
            },
            thresholds: {
              type: 'object',
              additionalProperties: false,
              properties: {
                cpuUtilization: { ...numberOrString(1) },
                memoryUtilization: { ...numberOrString(1) },
                responseTime: { ...numberOrString(0) }
              }
            }
          }
        }
      }
    },
    compliance: {
      type: 'object',
      additionalProperties: false,
      properties: {
        securityLevel: {
          type: 'string',
          enum: ['standard', 'enhanced', 'maximum'],
          description: 'Security baseline applied to Shinobi'
        },
        auditLogging: {
          type: 'boolean',
          description: 'Enable audit logging for Shinobi operations'
        },
        framework: {
          type: 'string',
          description: 'Compliance framework identifier sourced from platform config'
        }
      }
    },
    localDev: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable local developer experience features'
        },
        seedData: {
          type: 'object',
          additionalProperties: false,
          properties: {
            sampleComponents: { type: 'boolean' },
            sampleServices: { type: 'boolean' },
            sampleMetrics: { type: 'boolean' }
          }
        },
        mockServices: {
          type: 'boolean',
          description: 'Enable mock services for local development'
        }
      }
    },
    logging: {
      type: 'object',
      additionalProperties: false,
      properties: {
        retentionDays: {
          ...numberOrString(1),
          description: 'Retention period (days) for application logs'
        },
        logLevel: {
          type: 'string',
          enum: ['debug', 'info', 'warn', 'error'],
          description: 'Default log level for Shinobi runtime'
        },
        structuredLogging: {
          type: 'boolean',
          description: 'Emit logs in structured JSON format'
        }
      }
    },
    vpc: {
      type: 'object',
      additionalProperties: false,
      properties: {
        vpcId: {
          type: 'string',
          description: 'Existing VPC identifier to deploy into',
          pattern: '^vpc-[0-9a-f]{8,}$'
        }
      }
    },
    tags: {
      type: 'object',
      additionalProperties: {
        type: 'string'
      },
      description: 'Additional tags applied to Shinobi resources'
    }
  }
};

export class ShinobiComponentConfigBuilder extends ConfigBuilder<ShinobiConfig> {
  constructor(builderContext: ConfigBuilderContext) {
    super(builderContext, SHINOBI_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<ShinobiConfig> {
    return {
      compute: {
        mode: 'ecs',
        cpu: 256,
        memory: 512,
        taskCount: 1,
        containerPort: 3000
      },
      dataStore: {
        type: 'dynamodb',
        dynamodb: {
          billingMode: 'PAY_PER_REQUEST'
        }
      }
    };
  }

  protected getComplianceFrameworkDefaults(): Partial<ShinobiConfig> {
    return {};
  }
}
