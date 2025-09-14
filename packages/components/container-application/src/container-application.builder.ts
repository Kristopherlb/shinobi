/**
 * Container Application Component Configuration Builder
 * 
 * Implements the 5-layer configuration precedence system:
 * Component override > Environment > Platform > Compliance > Hardcoded defaults
 */

import { ConfigBuilder } from '@platform/core';
import { ComponentContext, ComponentSpec } from '@platform/contracts';

/**
 * Configuration interface for Container Application Component
 */
export interface ContainerApplicationConfig {
  // Application configuration
  application: {
    name: string;
    port: number;
    environment: { [key: string]: string };
    secrets?: { [key: string]: string };
  };
  
  // Service configuration
  service: {
    desiredCount: number;
    cpu: number;
    memory: number;
    healthCheck: {
      command: string[];
      path: string;
      interval: number;
      timeout: number;
      retries: number;
      startPeriod: number;
      healthyHttpCodes: string;
      healthyThresholdCount: number;
      unhealthyThresholdCount: number;
    };
  };
  
  // Load balancer configuration
  loadBalancer: {
    port: number;
    sslCertificateArn?: string;
  };
  
  // ECR configuration
  ecr: {
    maxImageCount: number;
    imageScanOnPush: boolean;
  };
  
  // Observability configuration
  observability: {
    logRetentionDays: number;
    cpuThreshold: number;
    memoryThreshold: number;
    enableTracing: boolean;
    enableMetrics: boolean;
  };
  
  // Security configuration
  security: {
    enableEncryption: boolean;
    enableVpcFlowLogs: boolean;
    enableWaf: boolean;
  };
}

/**
 * JSON Schema for Container Application Component configuration validation
 */
export const CONTAINER_APPLICATION_CONFIG_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  title: 'Container Application Component Configuration',
  description: 'Configuration schema for the Container Application component',
  properties: {
    application: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the containerized application',
          pattern: '^[a-z0-9-]+$'
        },
        port: {
          type: 'number',
          description: 'Port the application listens on',
          minimum: 1,
          maximum: 65535,
          default: 3000
        },
        environment: {
          type: 'object',
          description: 'Environment variables for the application',
          additionalProperties: { type: 'string' },
          default: {}
        },
        secrets: {
          type: 'object',
          description: 'Secrets to inject from AWS Secrets Manager',
          additionalProperties: { type: 'string' },
          default: {}
        }
      },
      required: ['name', 'port'],
      additionalProperties: false
    },
    service: {
      type: 'object',
      properties: {
        desiredCount: {
          type: 'number',
          description: 'Desired number of service tasks',
          minimum: 1,
          maximum: 10,
          default: 2
        },
        cpu: {
          type: 'number',
          description: 'CPU units (256 = 0.25 vCPU)',
          enum: [256, 512, 1024, 2048, 4096],
          default: 512
        },
        memory: {
          type: 'number',
          description: 'Memory in MiB',
          enum: [512, 1024, 2048, 4096, 8192],
          default: 1024
        },
        healthCheck: {
          type: 'object',
          properties: {
            command: {
              type: 'array',
              items: { type: 'string' },
              description: 'Health check command',
              default: ['CMD-SHELL', 'curl -f http://localhost:3000 || exit 1']
            },
            path: {
              type: 'string',
              description: 'Health check path',
              default: '/health'
            },
            interval: {
              type: 'number',
              description: 'Health check interval in seconds',
              minimum: 5,
              maximum: 300,
              default: 30
            },
            timeout: {
              type: 'number',
              description: 'Health check timeout in seconds',
              minimum: 1,
              maximum: 60,
              default: 5
            },
            retries: {
              type: 'number',
              description: 'Number of health check retries',
              minimum: 1,
              maximum: 10,
              default: 3
            },
            startPeriod: {
              type: 'number',
              description: 'Health check start period in seconds',
              minimum: 0,
              maximum: 300,
              default: 60
            },
            healthyHttpCodes: {
              type: 'string',
              description: 'HTTP codes considered healthy',
              default: '200'
            },
            healthyThresholdCount: {
              type: 'number',
              description: 'Number of consecutive successful health checks',
              minimum: 1,
              maximum: 10,
              default: 2
            },
            unhealthyThresholdCount: {
              type: 'number',
              description: 'Number of consecutive failed health checks',
              minimum: 1,
              maximum: 10,
              default: 3
            }
          },
          additionalProperties: false
        }
      },
      additionalProperties: false
    },
    loadBalancer: {
      type: 'object',
      properties: {
        port: {
          type: 'number',
          description: 'Load balancer port',
          minimum: 1,
          maximum: 65535,
          default: 80
        },
        sslCertificateArn: {
          type: 'string',
          description: 'SSL certificate ARN for HTTPS listener',
          pattern: '^arn:aws:acm:.*'
        }
      },
      additionalProperties: false
    },
    ecr: {
      type: 'object',
      properties: {
        maxImageCount: {
          type: 'number',
          description: 'Maximum number of images to retain',
          minimum: 1,
          maximum: 1000,
          default: 10
        },
        imageScanOnPush: {
          type: 'boolean',
          description: 'Enable image scanning on push',
          default: true
        }
      },
      additionalProperties: false
    },
    observability: {
      type: 'object',
      properties: {
        logRetentionDays: {
          type: 'number',
          description: 'CloudWatch log retention in days',
          enum: [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 3653],
          default: 30
        },
        cpuThreshold: {
          type: 'number',
          description: 'CPU utilization alarm threshold percentage',
          minimum: 1,
          maximum: 100,
          default: 80
        },
        memoryThreshold: {
          type: 'number',
          description: 'Memory utilization alarm threshold percentage',
          minimum: 1,
          maximum: 100,
          default: 85
        },
        enableTracing: {
          type: 'boolean',
          description: 'Enable X-Ray tracing',
          default: true
        },
        enableMetrics: {
          type: 'boolean',
          description: 'Enable custom metrics',
          default: true
        }
      },
      additionalProperties: false
    },
    security: {
      type: 'object',
      properties: {
        enableEncryption: {
          type: 'boolean',
          description: 'Enable encryption at rest and in transit',
          default: true
        },
        enableVpcFlowLogs: {
          type: 'boolean',
          description: 'Enable VPC Flow Logs',
          default: true
        },
        enableWaf: {
          type: 'boolean',
          description: 'Enable AWS WAF',
          default: false
        }
      },
      additionalProperties: false
    }
  },
  required: ['application', 'service', 'loadBalancer', 'ecr', 'observability', 'security'],
  additionalProperties: false
};

/**
 * Configuration builder for Container Application Component
 */
export class ContainerApplicationConfigBuilder extends ConfigBuilder<ContainerApplicationConfig> {
  
  constructor(builderContext: any, schema: any) {
    super(builderContext, schema);
  }

  /**
   * Get hardcoded fallback defaults (Layer 5)
   */
  protected getHardcodedFallbacks(): Partial<ContainerApplicationConfig> {
    return {
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
        healthCheck: {
          command: ['CMD-SHELL', 'curl -f http://localhost:3000 || exit 1'],
          path: '/health',
          interval: 30,
          timeout: 5,
          retries: 3,
          startPeriod: 60,
          healthyHttpCodes: '200',
          healthyThresholdCount: 2,
          unhealthyThresholdCount: 3
        }
      },
      loadBalancer: {
        port: 80
      },
      ecr: {
        maxImageCount: 10,
        imageScanOnPush: true
      },
      observability: {
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
      }
    };
  }

  /**
   * Get compliance framework defaults (Layer 4)
   */
  protected getComplianceFrameworkDefaults(): Record<string, Partial<ContainerApplicationConfig>> {
    const framework = this.builderContext.context.complianceFramework || 'commercial';
    
    const frameworkDefaults: Record<string, Partial<ContainerApplicationConfig>> = {
      'commercial': {
        security: {
          enableEncryption: true,
          enableVpcFlowLogs: true,
          enableWaf: false
        },
        observability: {
          logRetentionDays: 30,
          cpuThreshold: 80,
          memoryThreshold: 85,
          enableTracing: true,
          enableMetrics: true
        }
      },
      'fedramp-moderate': {
        security: {
          enableEncryption: true,
          enableVpcFlowLogs: true,
          enableWaf: true
        },
        observability: {
          logRetentionDays: 90,
          cpuThreshold: 70,
          memoryThreshold: 80,
          enableTracing: true,
          enableMetrics: true
        }
      },
      'fedramp-high': {
        security: {
          enableEncryption: true,
          enableVpcFlowLogs: true,
          enableWaf: true
        },
        observability: {
          logRetentionDays: 180,
          cpuThreshold: 60,
          memoryThreshold: 75,
          enableTracing: true,
          enableMetrics: true
        }
      },
      'iso27001': {
        security: {
          enableEncryption: true,
          enableVpcFlowLogs: true,
          enableWaf: true
        },
        observability: {
          logRetentionDays: 120,
          cpuThreshold: 75,
          memoryThreshold: 80,
          enableTracing: true,
          enableMetrics: true
        }
      },
      'soc2': {
        security: {
          enableEncryption: true,
          enableVpcFlowLogs: true,
          enableWaf: true
        },
        observability: {
          logRetentionDays: 90,
          cpuThreshold: 75,
          memoryThreshold: 80,
          enableTracing: true,
          enableMetrics: true
        }
      }
    };

    return frameworkDefaults[framework] || frameworkDefaults['commercial'];
  }

  /**
   * Get environment-specific defaults (Layer 3)
   */
  protected getEnvironmentDefaults(): Record<string, Partial<ContainerApplicationConfig>> {
    const env = this.builderContext.context.environment || 'dev';
    
    const envDefaults: Record<string, Partial<ContainerApplicationConfig>> = {
      dev: {
        service: {
          desiredCount: 1,
          cpu: 256,
          memory: 512
        },
        observability: {
          logRetentionDays: 7,
          cpuThreshold: 90,
          memoryThreshold: 90
        }
      },
      staging: {
        service: {
          desiredCount: 2,
          cpu: 512,
          memory: 1024
        },
        observability: {
          logRetentionDays: 14,
          cpuThreshold: 80,
          memoryThreshold: 85
        }
      },
      prod: {
        service: {
          desiredCount: 3,
          cpu: 1024,
          memory: 2048
        },
        observability: {
          logRetentionDays: 30,
          cpuThreshold: 70,
          memoryThreshold: 80
        }
      }
    };

    return envDefaults[env] || envDefaults['dev'];
  }

  /**
   * Get platform defaults (Layer 2)
   */
  protected getPlatformDefaults(): Partial<ContainerApplicationConfig> {
    return {
      security: {
        enableEncryption: true,
        enableVpcFlowLogs: true,
        enableWaf: false
      },
      observability: {
        enableTracing: true,
        enableMetrics: true
      }
    };
  }
}
