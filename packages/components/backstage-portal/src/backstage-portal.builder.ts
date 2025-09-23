/**
 * Backstage Portal Component Configuration Builder
 * 
 * Implements the 5-layer configuration precedence system:
 * Component override > Environment > Platform > Compliance > Hardcoded defaults
 */

import { ConfigBuilder, ComponentContext, ComponentSpec } from '@platform/core';

/**
 * Configuration interface for Backstage Portal Component
 */
export interface BackstagePortalConfig {
  // Portal configuration
  portal: {
    name: string;
    organization: string;
    description: string;
    baseUrl: string;
  };

  // Database configuration
  database: {
    instanceClass: string;
    allocatedStorage: number;
    maxAllocatedStorage: number;
    backupRetentionDays: number;
    multiAz: boolean;
    deletionProtection: boolean;
  };

  // Backend service configuration
  backend: {
    desiredCount: number;
    cpu: number;
    memory: number;
    healthCheckPath: string;
    healthCheckInterval: number;
  };

  // Frontend service configuration
  frontend: {
    desiredCount: number;
    cpu: number;
    memory: number;
    healthCheckPath: string;
    healthCheckInterval: number;
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

  // Authentication configuration
  auth: {
    provider: 'github' | 'google' | 'microsoft';
    github?: {
      clientId: string;
      clientSecret: string;
      organization: string;
    };
  };

  // Catalog configuration
  catalog: {
    providers: Array<{
      type: 'github' | 'gitlab' | 'bitbucket';
      id: string;
      org: string;
      catalogPath: string;
    }>;
  };
}

/**
 * JSON Schema for Backstage Portal Component configuration validation
 */
export const BACKSTAGE_PORTAL_CONFIG_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  title: 'Backstage Portal Component Configuration',
  description: 'Configuration schema for the Backstage Portal component',
  properties: {
    portal: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the Backstage portal',
          default: 'Shinobi Developer Portal'
        },
        organization: {
          type: 'string',
          description: 'Organization name',
          default: 'Shinobi Platform'
        },
        description: {
          type: 'string',
          description: 'Portal description',
          default: 'Developer portal for Shinobi platform components and services'
        },
        baseUrl: {
          type: 'string',
          description: 'Base URL for the portal',
          pattern: '^https?://.*'
        }
      },
      required: ['name', 'organization'],
      additionalProperties: false
    },
    database: {
      type: 'object',
      properties: {
        instanceClass: {
          type: 'string',
          description: 'RDS instance class',
          enum: ['db.t3.micro', 'db.t3.small', 'db.t3.medium', 'db.t3.large', 'db.r5.large', 'db.r5.xlarge'],
          default: 'db.t3.micro'
        },
        allocatedStorage: {
          type: 'number',
          description: 'Initial allocated storage in GB',
          minimum: 20,
          maximum: 1000,
          default: 20
        },
        maxAllocatedStorage: {
          type: 'number',
          description: 'Maximum allocated storage in GB',
          minimum: 20,
          maximum: 10000,
          default: 100
        },
        backupRetentionDays: {
          type: 'number',
          description: 'Backup retention period in days',
          minimum: 0,
          maximum: 35,
          default: 7
        },
        multiAz: {
          type: 'boolean',
          description: 'Enable Multi-AZ deployment',
          default: false
        },
        deletionProtection: {
          type: 'boolean',
          description: 'Enable deletion protection',
          default: true
        }
      },
      additionalProperties: false
    },
    backend: {
      type: 'object',
      properties: {
        desiredCount: {
          type: 'number',
          description: 'Desired number of backend tasks',
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
        healthCheckPath: {
          type: 'string',
          description: 'Health check path',
          default: '/health'
        },
        healthCheckInterval: {
          type: 'number',
          description: 'Health check interval in seconds',
          minimum: 5,
          maximum: 300,
          default: 30
        }
      },
      additionalProperties: false
    },
    frontend: {
      type: 'object',
      properties: {
        desiredCount: {
          type: 'number',
          description: 'Desired number of frontend tasks',
          minimum: 1,
          maximum: 10,
          default: 2
        },
        cpu: {
          type: 'number',
          description: 'CPU units (256 = 0.25 vCPU)',
          enum: [256, 512, 1024, 2048, 4096],
          default: 256
        },
        memory: {
          type: 'number',
          description: 'Memory in MiB',
          enum: [512, 1024, 2048, 4096, 8192],
          default: 512
        },
        healthCheckPath: {
          type: 'string',
          description: 'Health check path',
          default: '/'
        },
        healthCheckInterval: {
          type: 'number',
          description: 'Health check interval in seconds',
          minimum: 5,
          maximum: 300,
          default: 30
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
    },
    auth: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          description: 'Authentication provider',
          enum: ['github', 'google', 'microsoft'],
          default: 'github'
        },
        github: {
          type: 'object',
          properties: {
            clientId: {
              type: 'string',
              description: 'GitHub OAuth client ID'
            },
            clientSecret: {
              type: 'string',
              description: 'GitHub OAuth client secret'
            },
            organization: {
              type: 'string',
              description: 'GitHub organization name'
            }
          },
          required: ['clientId', 'clientSecret'],
          additionalProperties: false
        }
      },
      required: ['provider'],
      additionalProperties: false
    },
    catalog: {
      type: 'object',
      properties: {
        providers: {
          type: 'array',
          description: 'Catalog providers configuration',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['github', 'gitlab', 'bitbucket']
              },
              id: {
                type: 'string',
                description: 'Provider identifier'
              },
              org: {
                type: 'string',
                description: 'Organization name'
              },
              catalogPath: {
                type: 'string',
                description: 'Path to catalog-info.yaml file'
              }
            },
            required: ['type', 'id', 'org', 'catalogPath'],
            additionalProperties: false
          },
          default: []
        }
      },
      additionalProperties: false
    }
  },
  required: ['portal', 'database', 'backend', 'frontend', 'ecr', 'observability', 'security', 'auth', 'catalog'],
  additionalProperties: false
};

/**
 * Configuration builder for Backstage Portal Component
 */
export class BackstagePortalConfigBuilder extends ConfigBuilder<BackstagePortalConfig> {

  constructor(context: ComponentContext, spec: ComponentSpec) {
    super(context, spec);
  }

  /**
   * Get hardcoded fallback defaults (Layer 5)
   */
  protected getHardcodedFallbacks(): Partial<BackstagePortalConfig> {
    return {
      portal: {
        name: 'Shinobi Developer Portal',
        organization: 'Shinobi Platform',
        description: 'Developer portal for Shinobi platform components and services',
        baseUrl: 'https://backstage.shinobi.local'
      },
      database: {
        instanceClass: 'db.t3.micro',
        allocatedStorage: 20,
        maxAllocatedStorage: 100,
        backupRetentionDays: 7,
        multiAz: false,
        deletionProtection: true
      },
      backend: {
        desiredCount: 2,
        cpu: 512,
        memory: 1024,
        healthCheckPath: '/health',
        healthCheckInterval: 30
      },
      frontend: {
        desiredCount: 2,
        cpu: 256,
        memory: 512,
        healthCheckPath: '/',
        healthCheckInterval: 30
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
      },
      auth: {
        provider: 'github',
        github: {
          clientId: '',
          clientSecret: '',
          organization: 'shinobi-platform'
        }
      },
      catalog: {
        providers: [{
          type: 'github',
          id: 'shinobi-platform',
          org: 'shinobi-platform',
          catalogPath: '/catalog-info.yaml'
        }]
      }
    };
  }

  /**
   * Get compliance framework defaults (Layer 4)
   */
  protected getComplianceFrameworkDefaults(): Record<string, Partial<BackstagePortalConfig>> {
    const framework = this.builderContext.context.complianceFramework || 'commercial';

    const frameworkDefaults: Record<string, Partial<BackstagePortalConfig>> = {
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
        database: {
          multiAz: true,
          deletionProtection: true,
          backupRetentionDays: 14
        },
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
        database: {
          multiAz: true,
          deletionProtection: true,
          backupRetentionDays: 30
        },
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
        database: {
          multiAz: true,
          deletionProtection: true,
          backupRetentionDays: 21
        },
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
        database: {
          multiAz: true,
          deletionProtection: true,
          backupRetentionDays: 14
        },
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
  protected getEnvironmentDefaults(): Record<string, Partial<BackstagePortalConfig>> {
    const env = this.context.environment || 'dev';

    const envDefaults: Record<string, Partial<BackstagePortalConfig>> = {
      dev: {
        backend: {
          desiredCount: 1,
          cpu: 256,
          memory: 512
        },
        frontend: {
          desiredCount: 1,
          cpu: 256,
          memory: 512
        },
        database: {
          instanceClass: 'db.t3.micro',
          allocatedStorage: 20
        },
        observability: {
          logRetentionDays: 7,
          cpuThreshold: 90,
          memoryThreshold: 90
        }
      },
      staging: {
        backend: {
          desiredCount: 2,
          cpu: 512,
          memory: 1024
        },
        frontend: {
          desiredCount: 2,
          cpu: 256,
          memory: 512
        },
        database: {
          instanceClass: 'db.t3.small',
          allocatedStorage: 50
        },
        observability: {
          logRetentionDays: 14,
          cpuThreshold: 80,
          memoryThreshold: 85
        }
      },
      prod: {
        backend: {
          desiredCount: 3,
          cpu: 1024,
          memory: 2048
        },
        frontend: {
          desiredCount: 3,
          cpu: 512,
          memory: 1024
        },
        database: {
          instanceClass: 'db.t3.medium',
          allocatedStorage: 100
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
  protected getPlatformDefaults(): Partial<BackstagePortalConfig> {
    return {
      portal: {
        name: 'Shinobi Developer Portal',
        organization: 'Shinobi Platform',
        description: 'Developer portal for Shinobi platform components and services',
        baseUrl: 'https://backstage.shinobi.local'
      },
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
