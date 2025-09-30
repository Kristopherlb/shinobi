/**
 * MCP Server configuration builder using the shared ConfigBuilder precedence chain.
 */

import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';

const numberOrString = (minimum?: number, maximum?: number) => ({
  oneOf: [
    {
      type: 'integer',
      ...(minimum !== undefined ? { minimum } : {}),
      ...(maximum !== undefined ? { maximum } : {})
    },
    { type: 'string' }
  ]
});

export interface McpServerContainerConfig {
  imageTag?: string;
  cpu?: number | string;
  memory?: number | string;
  taskCount?: number | string;
  containerPort?: number | string;
}

export interface McpServerLoadBalancerConfig {
  enabled?: boolean;
  certificateArn?: string;
  domainName?: string;
  internetFacing?: boolean;
}

export interface McpServerAuthenticationConfig {
  jwtSecretArn?: string;
  tokenExpiration?: string;
}

export interface McpServerGitDataSourceConfig {
  repositoryUrls?: string[];
  accessTokenArn?: string;
}

export interface McpServerAwsDataSourceConfig {
  crossAccountRoles?: string[];
  regions?: string[];
}

export interface McpServerTemplatesConfig {
  repositoryUrl?: string;
  branch?: string;
}

export interface McpServerDataSourcesConfig {
  git?: McpServerGitDataSourceConfig;
  aws?: McpServerAwsDataSourceConfig;
  templates?: McpServerTemplatesConfig;
}

export interface McpServerVpcConfig {
  vpcId?: string;
  subnetIds?: string[];
  securityGroupIds?: string[];
}

export type McpServerLogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface McpServerLoggingConfig {
  retentionDays?: number | string;
  logLevel?: McpServerLogLevel;
}

export interface McpServerMonitoringAlarmsConfig {
  cpuUtilization?: number | string;
  memoryUtilization?: number | string;
  responseTime?: number | string;
}

export interface McpServerMonitoringConfig {
  enabled?: boolean;
  detailedMetrics?: boolean;
  alarms?: McpServerMonitoringAlarmsConfig;
}

export interface McpServerConfig {
  ecrRepository?: string;
  container?: McpServerContainerConfig;
  loadBalancer?: McpServerLoadBalancerConfig;
  authentication?: McpServerAuthenticationConfig;
  dataSources?: McpServerDataSourcesConfig;
  vpc?: McpServerVpcConfig;
  logging?: McpServerLoggingConfig;
  monitoring?: McpServerMonitoringConfig;
  enableExecuteCommand?: boolean;
  tags?: Record<string, string>;
}

export const MCP_SERVER_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ecrRepository: {
      type: 'string',
      description: 'ECR repository name for the MCP server image',
      pattern: '^[a-z0-9][a-z0-9-/]*[a-z0-9]$'
    },
    container: {
      type: 'object',
      additionalProperties: false,
      properties: {
        imageTag: {
          type: 'string',
          description: 'Container image tag to deploy',
          default: 'latest'
        },
        cpu: {
          ...numberOrString(256),
          description: 'CPU units allocated to the task'
        },
        memory: {
          ...numberOrString(512),
          description: 'Memory (MiB) allocated to the task'
        },
        taskCount: {
          ...numberOrString(1, 10),
          description: 'Desired task count'
        },
        containerPort: {
          ...numberOrString(1, 65535),
          description: 'Container port exposed by the service'
        }
      }
    },
    loadBalancer: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Provision an Application Load Balancer'
        },
        certificateArn: {
          type: 'string',
          description: 'ACM certificate ARN for HTTPS listeners',
          pattern: '^arn:aws:acm:[a-z0-9-]+:[0-9]{12}:certificate/[a-f0-9-]{36}$'
        },
        domainName: {
          type: 'string',
          description: 'Custom domain name for the MCP server',
          pattern: '^[a-z0-9.-]+$'
        },
        internetFacing: {
          type: 'boolean',
          description: 'Expose the load balancer to the internet'
        }
      }
    },
    authentication: {
      type: 'object',
      additionalProperties: false,
      properties: {
        jwtSecretArn: {
          type: 'string',
          description: 'Secrets Manager ARN containing the JWT signing secret',
          pattern: '^arn:aws:secretsmanager:[a-z0-9-]+:[0-9]{12}:secret:[A-Za-z0-9/_+=.@-]+$'
        },
        tokenExpiration: {
          type: 'string',
          description: 'Default token expiration duration (e.g. 1h, 30m)'
        }
      }
    },
    dataSources: {
      type: 'object',
      additionalProperties: false,
      properties: {
        git: {
          type: 'object',
          additionalProperties: false,
          properties: {
            repositoryUrls: {
              type: 'array',
              items: { type: 'string' },
              description: 'Git repositories containing manifests or templates'
            },
            accessTokenArn: {
              type: 'string',
              description: 'Secrets Manager ARN containing a Git access token'
            }
          }
        },
        aws: {
          type: 'object',
          additionalProperties: false,
          properties: {
            crossAccountRoles: {
              type: 'array',
              items: { type: 'string' },
              description: 'IAM role ARNs MCP can assume for discovery'
            },
            regions: {
              type: 'array',
              items: { type: 'string' },
              description: 'AWS regions scanned for platform intelligence'
            }
          }
        },
        templates: {
          type: 'object',
          additionalProperties: false,
          properties: {
            repositoryUrl: {
              type: 'string',
              description: 'Template repository URL used for scaffolding'
            },
            branch: {
              type: 'string',
              description: 'Template branch or ref',
              default: 'main'
            }
          }
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
        },
        subnetIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Subnet identifiers used for the service'
        },
        securityGroupIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Security group identifiers attached to the service ENIs'
        }
      }
    },
    logging: {
      type: 'object',
      additionalProperties: false,
      properties: {
        retentionDays: {
          ...numberOrString(1),
          description: 'Log retention period in days'
        },
        logLevel: {
          type: 'string',
          enum: ['DEBUG', 'INFO', 'WARN', 'ERROR'],
          description: 'Runtime log level'
        }
      }
    },
    monitoring: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable CloudWatch alarms and metrics'
        },
        detailedMetrics: {
          type: 'boolean',
          description: 'Enable ECS detailed CloudWatch metrics'
        },
        alarms: {
          type: 'object',
          additionalProperties: false,
          properties: {
            cpuUtilization: {
              ...numberOrString(1),
              description: 'Threshold for CPU utilization alarm (percent)'
            },
            memoryUtilization: {
              ...numberOrString(1),
              description: 'Threshold for memory utilization alarm (percent)'
            },
            responseTime: {
              ...numberOrString(0),
              description: 'Threshold for target response time alarm (seconds)'
            }
          }
        }
      }
    },
    enableExecuteCommand: {
      type: 'boolean',
      description: 'Enable ECS Exec for interactive diagnostics'
    },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' },
      description: 'Additional tags applied to MCP server resources'
    }
  }
};

export class McpServerComponentConfigBuilder extends ConfigBuilder<McpServerConfig> {
  constructor(builderContext: ConfigBuilderContext) {
    super(builderContext, MCP_SERVER_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<McpServerConfig> {
    return {
      ecrRepository: 'platform/mcp-server',
      container: {
        imageTag: 'latest',
        cpu: 256,
        memory: 512,
        taskCount: 1,
        containerPort: 8080
      },
      loadBalancer: {
        enabled: true,
        internetFacing: false
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
        retentionDays: 30,
        logLevel: 'INFO'
      },
      monitoring: {
        enabled: true,
        detailedMetrics: false,
        alarms: {
          cpuUtilization: 80,
          memoryUtilization: 80,
          responseTime: 2
        }
      },
      enableExecuteCommand: true,
      tags: {}
    };
  }

  protected getComplianceFrameworkDefaults(): Partial<McpServerConfig> {
    // Compliance-specific defaults are supplied via /config/<framework>.yml files.
    return {};
  }
}
