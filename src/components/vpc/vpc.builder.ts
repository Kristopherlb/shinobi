/**
 * Configuration Builder for VPC Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import { ConfigBuilder, ConfigBuilderContext, ComponentConfigSchema } from '../../platform/contracts/config-builder';

/**
 * Configuration interface for VPC component
 */
export interface VpcConfig {
  /** Component name (optional, will be auto-generated) */
  name?: string;
  
  /** Component description */
  description?: string;
  
  /** CIDR block for the VPC */
  cidr?: string;
  
  /** Maximum number of Availability Zones */
  maxAzs?: number;
  
  /** Enable NAT gateways for private subnets */
  natGateways?: number;
  
  /** Enable VPC Flow Logs */
  flowLogsEnabled?: boolean;
  
  /** VPC Flow Logs retention period in days */
  flowLogRetentionDays?: number;
  
  /** Subnet configuration */
  subnets?: {
    /** Public subnet configuration */
    public?: {
      cidrMask?: number;
      name?: string;
    };
    /** Private subnet configuration */
    private?: {
      cidrMask?: number;
      name?: string;
    };
    /** Database subnet configuration */
    database?: {
      cidrMask?: number;
      name?: string;
    };
  };
  
  /** VPC Endpoints configuration */
  vpcEndpoints?: {
    s3?: boolean;
    dynamodb?: boolean;
    secretsManager?: boolean;
    kms?: boolean;
  };
  
  /** DNS configuration */
  dns?: {
    enableDnsHostnames?: boolean;
    enableDnsSupport?: boolean;
  };
  
  /** Enable detailed monitoring */
  monitoring?: {
    enabled?: boolean;
    detailedMetrics?: boolean;
    alarms?: {
      natGatewayPacketDropThreshold?: number;
      vpcFlowLogDeliveryFailures?: number;
    };
  };
  
  /** Tagging configuration */
  tags?: Record<string, string>;
}

/**
 * JSON Schema for VPC configuration validation
 */
export const VPC_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'VPC name (optional, defaults to component name)',
      pattern: '^[a-zA-Z][a-zA-Z0-9-_]*$',
      maxLength: 128
    },
    description: {
      type: 'string',
      description: 'VPC description for documentation',
      maxLength: 1024
    },
    cidr: {
      type: 'string',
      description: 'CIDR block for the VPC',
      pattern: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$',
      default: '10.0.0.0/16'
    },
    maxAzs: {
      type: 'number',
      description: 'Maximum number of Availability Zones',
      minimum: 2,
      maximum: 6,
      default: 2
    },
    natGateways: {
      type: 'number',
      description: 'Number of NAT gateways',
      minimum: 0,
      maximum: 6,
      default: 1
    },
    flowLogsEnabled: {
      type: 'boolean',
      description: 'Enable VPC Flow Logs',
      default: true
    },
    flowLogRetentionDays: {
      type: 'number',
      description: 'VPC Flow Logs retention period in days',
      enum: [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653],
      default: 365
    },
    subnets: {
      type: 'object',
      description: 'Subnet configuration',
      properties: {
        public: {
          type: 'object',
          properties: {
            cidrMask: { type: 'number', minimum: 16, maximum: 28, default: 24 },
            name: { type: 'string', default: 'Public' }
          },
          additionalProperties: false
        },
        private: {
          type: 'object',
          properties: {
            cidrMask: { type: 'number', minimum: 16, maximum: 28, default: 24 },
            name: { type: 'string', default: 'Private' }
          },
          additionalProperties: false
        },
        database: {
          type: 'object',
          properties: {
            cidrMask: { type: 'number', minimum: 16, maximum: 28, default: 28 },
            name: { type: 'string', default: 'Database' }
          },
          additionalProperties: false
        }
      },
      additionalProperties: false
    },
    vpcEndpoints: {
      type: 'object',
      description: 'VPC Endpoints configuration',
      properties: {
        s3: { type: 'boolean', default: false },
        dynamodb: { type: 'boolean', default: false },
        secretsManager: { type: 'boolean', default: false },
        kms: { type: 'boolean', default: false }
      },
      additionalProperties: false
    },
    dns: {
      type: 'object',
      description: 'DNS configuration',
      properties: {
        enableDnsHostnames: { type: 'boolean', default: true },
        enableDnsSupport: { type: 'boolean', default: true }
      },
      additionalProperties: false
    },
    monitoring: {
      type: 'object',
      description: 'Monitoring configuration',
      properties: {
        enabled: { type: 'boolean', description: 'Enable monitoring', default: true },
        detailedMetrics: { type: 'boolean', description: 'Enable detailed CloudWatch metrics', default: false },
        alarms: {
          type: 'object',
          properties: {
            natGatewayPacketDropThreshold: { type: 'number', default: 1000 },
            vpcFlowLogDeliveryFailures: { type: 'number', default: 10 }
          },
          additionalProperties: false
        }
      },
      additionalProperties: false
    },
    tags: {
      type: 'object',
      description: 'Custom tags for the VPC',
      additionalProperties: { type: 'string' }
    }
  },
  required: [],
  additionalProperties: false
};

/**
 * ConfigBuilder implementation for VPC component
 */
export class VpcConfigBuilder extends ConfigBuilder<VpcConfig> {
  
  constructor(builderContext: ConfigBuilderContext, schema: ComponentConfigSchema) {
    super(builderContext, schema);
  }
  
  /**
   * Provides ultra-safe baseline configuration that works in any environment
   */
  protected getHardcodedFallbacks(): Partial<VpcConfig> {
    return {
      cidr: '10.0.0.0/16',
      maxAzs: 2,
      natGateways: 1,
      flowLogsEnabled: true,
      flowLogRetentionDays: 365, // 1 year baseline
      subnets: {
        public: {
          cidrMask: 24,
          name: 'Public'
        },
        private: {
          cidrMask: 24,
          name: 'Private'
        },
        database: {
          cidrMask: 28,
          name: 'Database'
        }
      },
      vpcEndpoints: {
        s3: false,
        dynamodb: false,
        secretsManager: false,
        kms: false
      },
      dns: {
        enableDnsHostnames: true,
        enableDnsSupport: true
      },
      monitoring: {
        enabled: true,
        detailedMetrics: false,
        alarms: {
          natGatewayPacketDropThreshold: 1000,
          vpcFlowLogDeliveryFailures: 10
        }
      }
    };
  }
  
  /**
   * Security and compliance-specific configurations
   */
  protected getComplianceFrameworkDefaults(): Partial<VpcConfig> {
    const framework = this.builderContext.context.complianceFramework;
    
    // Commercial baseline
    const baseCompliance: Partial<VpcConfig> = {
      flowLogsEnabled: true,
      flowLogRetentionDays: 365,
      monitoring: {
        enabled: true,
        detailedMetrics: false,
        alarms: {
          natGatewayPacketDropThreshold: 1000,
          vpcFlowLogDeliveryFailures: 10
        }
      }
    };
    
    if (framework === 'fedramp-moderate' || framework === 'fedramp-high') {
      return {
        ...baseCompliance,
        flowLogRetentionDays: framework === 'fedramp-high' ? 2555 : 1827, // 7 years for high, 5 years for moderate
        natGateways: 2, // Redundancy for compliance
        vpcEndpoints: {
          s3: true, // Required for secure data access
          dynamodb: true,
          secretsManager: true,
          kms: true
        },
        monitoring: {
          enabled: true,
          detailedMetrics: true, // Required for compliance
          alarms: {
            natGatewayPacketDropThreshold: 500, // More sensitive
            vpcFlowLogDeliveryFailures: 5 // More sensitive
          }
        }
      };
    }
    
    return baseCompliance;
  }
}