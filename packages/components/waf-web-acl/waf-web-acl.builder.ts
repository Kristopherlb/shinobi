/**
 * Configuration Builder for WAF Web ACL Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import { ConfigBuilder, ConfigBuilderContext } from '../../../src/platform/contracts/config-builder';
import { ComponentContext, ComponentSpec } from '../../../src/platform/contracts/component-interfaces';

/**
 * Configuration interface for WAF Web ACL component
 */
export interface WafWebAclConfig {
  /** Web ACL name (optional, defaults to component name) */
  name?: string;

  /** Web ACL description */
  description?: string;

  /** Scope of the Web ACL */
  scope?: 'REGIONAL' | 'CLOUDFRONT';

  /** Default action for requests that don't match any rules */
  defaultAction?: 'allow' | 'block';

  /** AWS Managed Rule Groups */
  managedRuleGroups?: Array<{
    name: string;
    vendorName: string;
    priority: number;
    overrideAction?: 'none' | 'count';
    excludedRules?: string[];
  }>;

  /** Custom rules */
  customRules?: Array<{
    name: string;
    priority: number;
    action: 'allow' | 'block' | 'count';
    statement: {
      type: 'ip-set' | 'geo-match' | 'rate-based' | 'size-constraint' | 'sqli-match' | 'xss-match';
      ipSet?: string[];
      countries?: string[];
      rateLimit?: number;
      fieldToMatch?: {
        type: 'uri-path' | 'query-string' | 'header' | 'body';
        name?: string;
      };
      textTransformations?: Array<{
        priority: number;
        type: string;
      }>;
    };
  }>;

  /** Logging configuration */
  logging?: {
    enabled?: boolean;
    destinationArn?: string;
    logDestinationType?: 'kinesis-firehose' | 's3' | 'cloudwatch';
    redactedFields?: Array<{
      type: 'uri-path' | 'query-string' | 'header' | 'method';
      name?: string;
    }>;
  };

  /** Monitoring configuration */
  monitoring?: {
    enabled?: boolean;
    detailedMetrics?: boolean;
    alarms?: {
      blockedRequestsThreshold?: number;
      allowedRequestsThreshold?: number;
      sampledRequestsEnabled?: boolean;
    };
  };

  /** Tags for the Web ACL */
  tags?: Record<string, string>;
}

/**
 * JSON Schema for WAF Web ACL configuration validation
 */
export const WAF_WEB_ACL_CONFIG_SCHEMA = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'Web ACL name (optional, defaults to component name)',
      pattern: '^[a-zA-Z][a-zA-Z0-9-_]*$',
      maxLength: 128
    },
    description: {
      type: 'string',
      description: 'Web ACL description',
      maxLength: 1024
    },
    scope: {
      type: 'string',
      enum: ['REGIONAL', 'CLOUDFRONT'],
      default: 'REGIONAL',
      description: 'Scope of the Web ACL (REGIONAL for ALB/API Gateway, CLOUDFRONT for CloudFront)'
    },
    defaultAction: {
      type: 'string',
      enum: ['allow', 'block'],
      default: 'allow',
      description: 'Default action for requests that do not match any rules'
    },
    managedRuleGroups: {
      type: 'array',
      description: 'AWS Managed Rule Groups to include',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Rule group name' },
          vendorName: { type: 'string', description: 'Vendor name (usually AWS)' },
          priority: { type: 'number', description: 'Rule priority' },
          overrideAction: { type: 'string', enum: ['none', 'count'], description: 'Override action' },
          excludedRules: { type: 'array', items: { type: 'string' }, description: 'Rules to exclude' }
        },
        required: ['name', 'vendorName', 'priority'],
        additionalProperties: false
      }
    },
    customRules: {
      type: 'array',
      description: 'Custom WAF rules',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Rule name' },
          priority: { type: 'number', description: 'Rule priority' },
          action: { type: 'string', enum: ['allow', 'block', 'count'], description: 'Rule action' },
          statement: {
            type: 'object',
            description: 'Rule statement configuration',
            additionalProperties: true
          }
        },
        required: ['name', 'priority', 'action', 'statement'],
        additionalProperties: false
      }
    },
    logging: {
      type: 'object',
      description: 'WAF logging configuration',
      properties: {
        enabled: { type: 'boolean', default: true, description: 'Enable WAF logging' },
        destinationArn: { type: 'string', description: 'Log destination ARN' },
        logDestinationType: {
          type: 'string',
          enum: ['kinesis-firehose', 's3', 'cloudwatch'],
          default: 'cloudwatch',
          description: 'Type of log destination'
        },
        redactedFields: {
          type: 'array',
          description: 'Fields to redact from logs',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['uri-path', 'query-string', 'header', 'method'] },
              name: { type: 'string' }
            },
            required: ['type'],
            additionalProperties: false
          }
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
        },
        alarms: {
          type: 'object',
          description: 'CloudWatch alarm thresholds',
          properties: {
            blockedRequestsThreshold: { type: 'number', default: 1000, description: 'Blocked requests alarm threshold' },
            allowedRequestsThreshold: { type: 'number', default: 10000, description: 'Allowed requests alarm threshold' },
            sampledRequestsEnabled: { type: 'boolean', default: true, description: 'Enable sampled requests' }
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
 * ConfigBuilder for WAF Web ACL component
 * 
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config) 
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
export class WafWebAclConfigBuilder extends ConfigBuilder<WafWebAclConfig> {

  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = {
      context,
      spec
    };
    super(builderContext, WAF_WEB_ACL_CONFIG_SCHEMA);
  }

  /**
   * Layer 1: Hardcoded Fallbacks
   * Ultra-safe baseline configuration that works in any environment
   */
  protected getHardcodedFallbacks(): Partial<WafWebAclConfig> {
    const framework = this.builderContext.context.complianceFramework;

    // Base fallbacks that work for all environments
    const baseFallbacks: Partial<WafWebAclConfig> = {
      scope: 'REGIONAL',
      defaultAction: 'allow',
      managedRuleGroups: [
        {
          name: 'AWSManagedRulesCommonRuleSet',
          vendorName: 'AWS',
          priority: 1,
          overrideAction: 'none'
        },
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          vendorName: 'AWS',
          priority: 2,
          overrideAction: 'none'
        }
      ],
      customRules: [],
      logging: {
        enabled: true,
        logDestinationType: 'cloudwatch',
        redactedFields: []
      },
      monitoring: {
        enabled: true,
        detailedMetrics: false,
        alarms: {
          blockedRequestsThreshold: 1000,
          allowedRequestsThreshold: 10000,
          sampledRequestsEnabled: true
        }
      },
      tags: {}
    };

    // Apply compliance framework-specific enhancements
    if (framework === 'commercial') {
      return {
        ...baseFallbacks,
        monitoring: {
          ...baseFallbacks.monitoring,
          detailedMetrics: true,
          alarms: {
            ...baseFallbacks.monitoring!.alarms,
            blockedRequestsThreshold: 500
          }
        }
      };
    }

    if (framework === 'fedramp-moderate' || framework === 'fedramp-high') {
      return {
        ...baseFallbacks,
        defaultAction: 'block',
        managedRuleGroups: [
          ...baseFallbacks.managedRuleGroups!,
          {
            name: 'AWSManagedRulesLinuxRuleSet',
            vendorName: 'AWS',
            priority: 4,
            overrideAction: 'none'
          },
          {
            name: 'AWSManagedRulesUnixRuleSet',
            vendorName: 'AWS',
            priority: 5,
            overrideAction: 'none'
          }
        ],
        monitoring: {
          ...baseFallbacks.monitoring,
          detailedMetrics: true,
          alarms: {
            ...baseFallbacks.monitoring!.alarms,
            blockedRequestsThreshold: framework === 'fedramp-high' ? 100 : 250
          }
        }
      };
    }

    return baseFallbacks;
  }

  /**
   * Layer 2: Compliance Framework Defaults
   * Security and compliance-specific configurations
   */
  protected getComplianceFrameworkDefaults(): Partial<WafWebAclConfig> {
    const framework = this.builderContext.context.complianceFramework;

    // For commercial, we rely more on platform config, but add some enhancements
    const baseCompliance: Partial<WafWebAclConfig> = {
      monitoring: {
        enabled: true,
        detailedMetrics: true, // Enhanced for commercial
        alarms: {
          blockedRequestsThreshold: 500,
          allowedRequestsThreshold: 5000,
          sampledRequestsEnabled: true
        }
      }
    };

    if (framework === 'fedramp-moderate' || framework === 'fedramp-high') {
      return {
        ...baseCompliance,
        defaultAction: 'block', // More restrictive for FedRAMP
        logging: {
          ...baseCompliance.logging,
          enabled: true // Mandatory logging for compliance
        },
        managedRuleGroups: [
          ...baseCompliance.managedRuleGroups!,
          {
            name: 'AWSManagedRulesLinuxRuleSet',
            vendorName: 'AWS',
            priority: 4,
            overrideAction: 'none'
          },
          {
            name: 'AWSManagedRulesUnixRuleSet',
            vendorName: 'AWS',
            priority: 5,
            overrideAction: 'none'
          }
        ],
        monitoring: {
          ...baseCompliance.monitoring,
          detailedMetrics: true, // Mandatory for FedRAMP
          alarms: {
            blockedRequestsThreshold: framework === 'fedramp-high' ? 100 : 250,
            allowedRequestsThreshold: framework === 'fedramp-high' ? 2000 : 3000,
            sampledRequestsEnabled: true
          }
        }
      };
    }

    return baseCompliance;
  }

  /**
   * Get the JSON Schema for validation
   */
  public getSchema(): any {
    return WAF_WEB_ACL_CONFIG_SCHEMA;
  }
}