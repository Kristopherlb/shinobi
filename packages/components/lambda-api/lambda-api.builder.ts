/**
 * Configuration Builder for LambdaApiComponent Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import { ConfigBuilder, ConfigBuilderContext } from '../@shinobi/core/config-builder';

/**
 * Configuration interface for LambdaApiComponent component
 */
export interface LambdaApiConfig {
  /** Component name (optional, will be auto-generated) */
  name?: string;
  
  /** Component description */
  description?: string;
  
  /** Lambda function handler (required) */
  handler: string;
  
  /** Runtime environment */
  runtime?: string;
  
  /** Memory allocation in MB */
  memory?: number;
  
  /** Timeout in seconds */
  timeout?: number;
  
  /** Code path for Lambda function */
  codePath?: string;
  
  /** Environment variables */
  environmentVariables?: Record<string, string>;
  
  /** API Gateway configuration */
  api?: {
    /** API name */
    name?: string;
    /** CORS configuration */
    cors?: boolean;
    /** API key required */
    apiKeyRequired?: boolean;
  };
  
  /** VPC configuration for FedRAMP deployments */
  vpc?: {
    /** VPC ID */
    vpcId?: string;
    /** Subnet IDs */
    subnetIds?: string[];
    /** Security group IDs */
    securityGroupIds?: string[];
  };
  
  /** Encryption configuration */
  encryption?: {
    /** KMS key ARN for environment variables */
    kmsKeyArn?: string;
  };
  
  /** Security tooling configuration */
  security?: {
    tools?: {
      falco?: boolean;
    };
  };
  
  /** Enable detailed monitoring */
  monitoring?: {
    enabled?: boolean;
    detailedMetrics?: boolean;
    alarms?: {
      errorRateThreshold?: number;
      durationThreshold?: number;
      throttleThreshold?: number;
    };
  };
  
  /** Tagging configuration */
  tags?: Record<string, string>;
}

/**
 * JSON Schema for LambdaApiComponent configuration validation
 */
export const LAMBDA_API_CONFIG_SCHEMA = {
  type: 'object',
  title: 'Lambda API Configuration',
  description: 'Configuration for creating a Lambda function with API Gateway',
  required: ['handler'],
  properties: {
    name: {
      type: 'string',
      description: 'Component name (optional, will be auto-generated from component name)',
      pattern: '^[a-zA-Z][a-zA-Z0-9-_]*$',
      maxLength: 128
    },
    description: {
      type: 'string',
      description: 'Component description for documentation',
      maxLength: 1024
    },
    handler: {
      type: 'string',
      description: 'Lambda function handler (e.g., "index.handler")',
      pattern: '^[a-zA-Z0-9_.-]+\\.[a-zA-Z0-9_-]+$'
    },
    runtime: {
      type: 'string',
      description: 'Lambda runtime environment',
      enum: ['nodejs18.x', 'nodejs20.x', 'python3.9', 'python3.10', 'python3.11'],
      default: 'nodejs20.x'
    },
    memory: {
      type: 'number',
      description: 'Memory allocation in MB',
      minimum: 128,
      maximum: 10240,
      default: 512
    },
    timeout: {
      type: 'number',
      description: 'Function timeout in seconds',
      minimum: 1,
      maximum: 900,
      default: 30
    },
    codePath: {
      type: 'string',
      description: 'Path to Lambda function code',
      default: './src'
    },
    environmentVariables: {
      type: 'object',
      description: 'Environment variables for the Lambda function',
      additionalProperties: {
        type: 'string'
      },
      default: {}
    },
    api: {
      type: 'object',
      description: 'API Gateway configuration',
      properties: {
        name: {
          type: 'string',
          description: 'API Gateway name'
        },
        cors: {
          type: 'boolean',
          description: 'Enable CORS for API Gateway',
          default: false
        },
        apiKeyRequired: {
          type: 'boolean',
          description: 'Require API key for requests',
          default: false
        }
      },
      additionalProperties: false,
      default: {
        cors: false,
        apiKeyRequired: false
      }
    },
    vpc: {
      type: 'object',
      description: 'VPC configuration for FedRAMP deployments',
      properties: {
        vpcId: {
          type: 'string',
          description: 'VPC ID for Lambda deployment',
          pattern: '^vpc-[a-f0-9]{8,17}$'
        },
        subnetIds: {
          type: 'array',
          description: 'Subnet IDs for Lambda deployment',
          items: {
            type: 'string',
            pattern: '^subnet-[a-f0-9]{8,17}$'
          },
          maxItems: 16
        },
        securityGroupIds: {
          type: 'array',
          description: 'Security group IDs for Lambda',
          items: {
            type: 'string',
            pattern: '^sg-[a-f0-9]{8,17}$'
          },
          maxItems: 5
        }
      },
      additionalProperties: false
    },
    encryption: {
      type: 'object',
      description: 'Encryption configuration',
      properties: {
        kmsKeyArn: {
          type: 'string',
          description: 'KMS key ARN for environment variable encryption',
          pattern: '^arn:aws:kms:[a-z0-9-]+:[0-9]{12}:key/[a-f0-9-]{36}$'
        }
      },
      additionalProperties: false
    },
    security: {
      type: 'object',
      description: 'Security tooling configuration',
      properties: {
        tools: {
          type: 'object',
          description: 'Security tools configuration',
          properties: {
            falco: {
              type: 'boolean',
              description: 'Enable Falco security monitoring',
              default: false
            }
          },
          additionalProperties: false,
          default: {
            falco: false
          }
        }
      },
      additionalProperties: false,
      default: {
        tools: {
          falco: false
        }
      }
    },
    monitoring: {
      type: 'object',
      description: 'Monitoring and observability configuration',
      properties: {
        enabled: {
          type: 'boolean',
          default: true,
          description: 'Enable monitoring'
        },
        detailedMetrics: {
          type: 'boolean',
          default: false,
          description: 'Enable detailed CloudWatch metrics'
        },
        alarms: {
          type: 'object',
          description: 'CloudWatch alarm thresholds',
          properties: {
            errorRateThreshold: {
              type: 'number',
              description: 'Error rate threshold for alarms',
              default: 5
            },
            durationThreshold: {
              type: 'number',
              description: 'Duration threshold for alarms (percentage of timeout)',
              default: 80
            },
            throttleThreshold: {
              type: 'number',
              description: 'Throttle threshold for alarms',
              default: 1
            }
          },
          additionalProperties: false
        }
      },
      additionalProperties: false
    },
    tags: {
      type: 'object',
      description: 'Additional resource tags',
      additionalProperties: { type: 'string' }
    }
  },
  additionalProperties: false
};

/**
 * ConfigBuilder for LambdaApiComponent component
 * 
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config) 
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
export class LambdaApiComponentConfigBuilder extends ConfigBuilder<LambdaApiConfig> {
  
  constructor(context: ConfigBuilderContext) {
    super(context, LAMBDA_API_CONFIG_SCHEMA);
  }
  
  /**
   * Layer 1: Hardcoded Fallbacks
   * Ultra-safe baseline configuration that works in any environment
   */
  protected getHardcodedFallbacks(): Partial<LambdaApiConfig> {
    return {
      runtime: 'nodejs20.x',
      memory: 512,
      timeout: 30,
      codePath: './src',
      environmentVariables: {},
      api: {
        cors: false,
        apiKeyRequired: false
      },
      security: {
        tools: {
          falco: false
        }
      },
      monitoring: {
        enabled: true,
        detailedMetrics: false,
        alarms: {
          errorRateThreshold: 5,
          durationThreshold: 80,
          throttleThreshold: 1
        }
      },
      tags: {}
    };
  }
  
  /**
   * Layer 2: Compliance Framework Defaults
   * Security and compliance-specific configurations loaded from platform config
   */
  protected getComplianceFrameworkDefaults(): Partial<LambdaApiConfig> {
    // This will be loaded from /config/{framework}.yml files
    // For now, return empty object to be overridden by platform config
    return {};
  }
  
  /**
   * Get the JSON Schema for validation
   */
  public getSchema(): any {
    return LAMBDA_API_CONFIG_SCHEMA;
  }
}