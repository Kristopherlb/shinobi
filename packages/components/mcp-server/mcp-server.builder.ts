/**
 * Configuration Builder for McpServerComponent Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import { ConfigBuilder, ConfigBuilderContext } from '../../platform/contracts/config-builder';

/**
 * Configuration interface for McpServerComponent component
 */
export interface McpServerConfig {
  /** Component name (optional, will be auto-generated) */
  name?: string;
  
  /** Component description */
  description?: string;
  
  /** Container configuration */
  container?: {
    imageTag?: string;
    cpu?: number;
    memory?: number;
    taskCount?: number;
    containerPort?: number;
  };
  
  /** Load balancer configuration */
  loadBalancer?: {
    enabled?: boolean;
    certificateArn?: string;
    domainName?: string;
  };
  
  /** Authentication configuration */
  authentication?: {
    jwtSecret?: string;
    tokenExpiration?: string;
  };
  
  /** Data sources configuration */
  dataSources?: {
    git?: {
      repositoryUrls?: string[];
      accessTokenArn?: string;
    };
    aws?: {
      crossAccountRoles?: string[];
      regions?: string[];
    };
    templates?: {
      repositoryUrl?: string;
      branch?: string;
    };
  };
  
  /** VPC configuration */
  vpc?: {
    vpcId?: string;
    subnetIds?: string[];
    securityGroupIds?: string[];
  };
  
  /** Logging configuration */
  logging?: {
    retentionDays?: number;
  };
  
  /** Enable detailed monitoring */
  monitoring?: {
    enabled?: boolean;
    detailedMetrics?: boolean;
  };
  
  /** Tagging configuration */
  tags?: Record<string, string>;
}

/**
 * JSON Schema for McpServerComponent configuration validation
 */
export const MCP_SERVER_CONFIG_SCHEMA = {
  type: 'object',
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
    container: {
      type: 'object',
      description: 'Container configuration',
      properties: {
        imageTag: {
          type: 'string',
          default: 'latest',
          description: 'Container image tag'
        },
        cpu: {
          type: 'number',
          default: 256,
          description: 'Task CPU units'
        },
        memory: {
          type: 'number',
          default: 512,
          description: 'Task memory in MB'
        },
        taskCount: {
          type: 'number',
          default: 1,
          description: 'Desired task count'
        },
        containerPort: {
          type: 'number',
          default: 3000,
          description: 'Container port'
        }
      },
      additionalProperties: false
    },
    loadBalancer: {
      type: 'object',
      description: 'Load balancer configuration',
      properties: {
        enabled: {
          type: 'boolean',
          default: true,
          description: 'Enable load balancer'
        },
        certificateArn: {
          type: 'string',
          description: 'SSL certificate ARN'
        },
        domainName: {
          type: 'string',
          description: 'Custom domain name'
        }
      },
      additionalProperties: false
    },
    authentication: {
      type: 'object',
      description: 'Authentication configuration',
      properties: {
        jwtSecret: {
          type: 'string',
          description: 'JWT secret for token validation'
        },
        tokenExpiration: {
          type: 'string',
          default: '1h',
          description: 'Token expiration time'
        }
      },
      additionalProperties: false
    },
    dataSources: {
      type: 'object',
      description: 'Data sources configuration',
      properties: {
        git: {
          type: 'object',
          properties: {
            repositoryUrls: {
              type: 'array',
              items: { type: 'string' },
              description: 'Git repository URLs'
            },
            accessTokenArn: {
              type: 'string',
              description: 'Access token secret ARN'
            }
          },
          additionalProperties: false
        },
        aws: {
          type: 'object',
          properties: {
            crossAccountRoles: {
              type: 'array',
              items: { type: 'string' },
              description: 'Cross-account role ARNs'
            },
            regions: {
              type: 'array',
              items: { type: 'string' },
              description: 'AWS regions to scan'
            }
          },
          additionalProperties: false
        },
        templates: {
          type: 'object',
          properties: {
            repositoryUrl: {
              type: 'string',
              description: 'Template repository URL'
            },
            branch: {
              type: 'string',
              default: 'main',
              description: 'Template branch'
            }
          },
          additionalProperties: false
        }
      },
      additionalProperties: false
    },
    vpc: {
      type: 'object',
      description: 'VPC configuration',
      properties: {
        vpcId: {
          type: 'string',
          description: 'VPC ID'
        },
        subnetIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Subnet IDs'
        },
        securityGroupIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Security group IDs'
        }
      },
      additionalProperties: false
    },
    logging: {
      type: 'object',
      description: 'Logging configuration',
      properties: {
        retentionDays: {
          type: 'number',
          default: 30,
          description: 'Log retention period in days'
        }
      },
      additionalProperties: false
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
 * ConfigBuilder for McpServerComponent component
 * 
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config) 
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
export class McpServerComponentConfigBuilder extends ConfigBuilder<McpServerConfig> {
  
  /**
   * Layer 1: Hardcoded Fallbacks
   * Ultra-safe baseline configuration that works in any environment
   */
  protected getHardcodedFallbacks(): Partial<McpServerConfig> {
    return {
      container: {
        imageTag: 'latest',
        cpu: 256,
        memory: 512,
        taskCount: 1,
        containerPort: 3000
      },
      loadBalancer: {
        enabled: true
      },
      authentication: {
        tokenExpiration: '1h'
      },
      dataSources: {
        aws: {
          regions: ['us-east-1']
        },
        templates: {
          branch: 'main'
        }
      },
      logging: {
        retentionDays: 30
      },
      monitoring: {
        enabled: true,
        detailedMetrics: false
      },
      tags: {}
    };
  }
  
  /**
   * Layer 2: Compliance Framework Defaults
   * Security and compliance-specific configurations
   */
  protected getComplianceFrameworkDefaults(): Partial<McpServerConfig> {
    const framework = this.context.complianceFramework;
    
    const baseCompliance: Partial<McpServerConfig> = {
      monitoring: {
        enabled: true,
        detailedMetrics: true
      }
    };
    
    if (framework === 'fedramp-moderate') {
      return {
        ...baseCompliance,
        container: {
          cpu: 512,
          memory: 1024,
          taskCount: 2
        },
        authentication: {
          tokenExpiration: '30m'
        },
        logging: {
          retentionDays: 90
        },
        monitoring: {
          enabled: true,
          detailedMetrics: true
        }
      };
    }
    
    if (framework === 'fedramp-high') {
      return {
        ...baseCompliance,
        container: {
          cpu: 1024,
          memory: 2048,
          taskCount: 3
        },
        authentication: {
          tokenExpiration: '15m'
        },
        logging: {
          retentionDays: 2555 // 7 years
        },
        monitoring: {
          enabled: true,
          detailedMetrics: true
        }
      };
    }
    
    return baseCompliance;
  }
  
  /**
   * Get the JSON Schema for validation
   */
  public getSchema(): any {
    return MCP_SERVER_CONFIG_SCHEMA;
  }
}