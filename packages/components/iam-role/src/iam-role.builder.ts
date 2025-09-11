/**
 * Configuration Builder for IamRoleComponent Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import { ConfigBuilder, ConfigBuilderContext } from '../../../../src/platform/contracts/config-builder';

/**
 * Configuration interface for IamRoleComponent component
 */
export interface IamRoleConfig {
  /** Component name (optional, will be auto-generated) */
  name?: string;
  
  /** Component description */
  description?: string;
  
  /** IAM Role configuration */
  role: {
    /** Principal that can assume this role */
    assumedBy: {
      /** AWS service principal (e.g., 'ec2.amazonaws.com') */
      service?: string;
      /** AWS account ID for cross-account access */
      account?: string;
      /** External ID for cross-account access */
      externalId?: string;
      /** ARN pattern for custom principals */
      arn?: string;
    };
    
    /** Inline policies attached to the role */
    inlinePolicies?: Record<string, {
      /** Policy document with statements */
      statements: Array<{
        /** Effect: Allow or Deny */
        effect: 'Allow' | 'Deny';
        /** Actions this policy applies to */
        actions: string[];
        /** Resources this policy applies to */
        resources: string[];
        /** Conditions for policy application */
        conditions?: Record<string, any>;
      }>;
    }>;
    
    /** Managed policy ARNs to attach */
    managedPolicies?: string[];
    
    /** Maximum session duration in seconds (1-43200) */
    maxSessionDuration?: number;
    
    /** Path for the role */
    path?: string;
  };
  
  /** Compliance and security settings */
  compliance?: {
    /** Enable permissions boundary for FedRAMP compliance */
    permissionsBoundary?: boolean;
    /** Custom permissions boundary ARN */
    permissionsBoundaryArn?: string;
    /** Enable least privilege enforcement */
    leastPrivilege?: boolean;
    /** Require MFA for role assumption */
    requireMfa?: boolean;
  };
  
  /** Tagging configuration */
  tags?: Record<string, string>;
}

/**
 * JSON Schema for IamRoleComponent configuration validation
 */
export const IAM_ROLE_CONFIG_SCHEMA = {
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
      maxLength: 500
    },
    role: {
      type: 'object',
      description: 'IAM Role configuration',
      properties: {
        assumedBy: {
          type: 'object',
          description: 'Principal that can assume this role',
          properties: {
            service: {
              type: 'string',
              description: 'AWS service principal (e.g., ec2.amazonaws.com)',
              pattern: '^[a-zA-Z0-9.-]+\\.amazonaws\\.com$'
            },
            account: {
              type: 'string',
              description: 'AWS account ID for cross-account access',
              pattern: '^[0-9]{12}$'
            },
            externalId: {
              type: 'string',
              description: 'External ID for cross-account access',
              minLength: 2,
              maxLength: 1224
            },
            arn: {
              type: 'string',
              description: 'ARN pattern for custom principals',
              pattern: '^arn:aws:[a-z0-9-]+:[a-z0-9-]*:[0-9]{12}:[a-zA-Z0-9-_/]+$'
            }
          },
          required: ['service']
        },
        inlinePolicies: {
          type: 'object',
          description: 'Inline policies attached to the role',
          additionalProperties: {
            type: 'object',
            properties: {
              statements: {
                type: 'array',
                description: 'Policy statements',
                items: {
                  type: 'object',
                  properties: {
                    effect: {
                      type: 'string',
                      enum: ['Allow', 'Deny'],
                      description: 'Effect of the policy statement'
                    },
                    actions: {
                      type: 'array',
                      description: 'Actions this policy applies to',
                      items: {
                        type: 'string',
                        pattern: '^[a-zA-Z0-9-]+:[a-zA-Z0-9*]+$'
                      },
                      minItems: 1
                    },
                    resources: {
                      type: 'array',
                      description: 'Resources this policy applies to',
                      items: {
                        type: 'string'
                      },
                      minItems: 1
                    },
                    conditions: {
                      type: 'object',
                      description: 'Conditions for policy application',
                      additionalProperties: true
                    }
                  },
                  required: ['effect', 'actions', 'resources']
                },
                minItems: 1
              }
            },
            required: ['statements']
          }
        },
        managedPolicies: {
          type: 'array',
          description: 'Managed policy ARNs to attach',
          items: {
            type: 'string',
            pattern: '^arn:aws:iam::[0-9]{12}:policy/[a-zA-Z0-9-_/]+$'
          }
        },
        maxSessionDuration: {
          type: 'integer',
          description: 'Maximum session duration in seconds',
          minimum: 3600,
          maximum: 43200,
          default: 3600
        },
        path: {
          type: 'string',
          description: 'Path for the role',
          pattern: '^/[a-zA-Z0-9/_-]*/$',
          default: '/'
        }
      },
      required: ['assumedBy']
    },
    compliance: {
      type: 'object',
      description: 'Compliance and security settings',
      properties: {
        permissionsBoundary: {
          type: 'boolean',
          description: 'Enable permissions boundary for FedRAMP compliance',
          default: false
        },
        permissionsBoundaryArn: {
          type: 'string',
          description: 'Custom permissions boundary ARN',
          pattern: '^arn:aws:iam::[0-9]{12}:policy/[a-zA-Z0-9-_/]+$'
        },
        leastPrivilege: {
          type: 'boolean',
          description: 'Enable least privilege enforcement',
          default: true
        },
        requireMfa: {
          type: 'boolean',
          description: 'Require MFA for role assumption',
          default: false
        }
      }
    },
    tags: {
      type: 'object',
      description: 'Tagging configuration',
      additionalProperties: {
        type: 'string',
        maxLength: 256
      }
    }
  },
  required: ['role'],
  additionalProperties: false
};

/**
 * Configuration Builder for IamRoleComponent
 * 
 * Extends the abstract ConfigBuilder to provide IAM role-specific configuration
 * with 5-layer precedence chain and compliance-aware defaults.
 */
export class IamRoleConfigBuilder extends ConfigBuilder<IamRoleConfig> {
  
  constructor(context: ConfigBuilderContext) {
    super(context, IAM_ROLE_CONFIG_SCHEMA);
  }

  /**
   * Provide component-specific hardcoded fallbacks.
   * These are the absolute, safest, most minimal defaults possible.
   * 
   * Layer 1 (Priority 5 - Lowest): Hardcoded Fallbacks
   */
  protected getHardcodedFallbacks(): Record<string, any> {
    return {
      role: {
        assumedBy: {
          service: 'ec2.amazonaws.com' // Safest default for EC2 instances
        },
        inlinePolicies: {},
        managedPolicies: [],
        maxSessionDuration: 3600, // 1 hour - minimal session duration
        path: '/'
      },
      compliance: {
        permissionsBoundary: false, // Disabled by default for commercial
        leastPrivilege: true, // Always enforce least privilege
        requireMfa: false // Disabled by default for service roles
      },
      tags: {
        'Component': 'iam-role',
        'ManagedBy': 'platform'
      }
    };
  }
}