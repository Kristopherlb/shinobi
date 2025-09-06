import { logger } from '../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

export class SchemaManager {
  /**
   * Get the master schema for manifest validation (AC-P2.2)
   * Loads the authoritative JSON schema with $ref support for distributed environments
   */
  async getMasterSchema(): Promise<any> {
    logger.debug('Loading authoritative service manifest schema');

    // Load the authoritative JSON schema
    const schemaPath = path.resolve(__dirname, 'service-manifest.schema.json');
    const schemaContent = await fs.readFile(schemaPath, 'utf8');
    const masterSchema = JSON.parse(schemaContent);

    logger.debug('Authoritative schema loaded successfully with $ref support');
    return masterSchema;
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use getMasterSchema() instead
   */
  async getLegacySchema(): Promise<any> {
    logger.debug('Building legacy schema (deprecated)');

    // Legacy base schema for top-level manifest structure
    const baseSchema = {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          pattern: '^[a-z0-9-]+$',
          description: 'Service name (lowercase, alphanumeric with hyphens)'
        },
        owner: {
          type: 'string',
          description: 'Service owner or team name'
        },
        runtime: {
          type: 'string',
          enum: ['nodejs18', 'nodejs20', 'python39', 'python311'],
          description: 'Runtime environment'
        },
        complianceFramework: {
          type: 'string',
          enum: ['commercial', 'fedramp-moderate', 'fedramp-high'],
          description: 'Compliance framework to apply'
        },
        labels: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Service labels for discovery and organization'
        },
        environments: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              defaults: {
                type: 'object',
                description: 'Default values for this environment'
              }
            }
          },
          description: 'Environment-specific configuration'
        },
        components: {
          type: 'array',
          items: {
            $ref: '#/definitions/Component'
          },
          description: 'Service components'
        },
        governance: {
          type: 'object',
          properties: {
            cdkNag: {
              type: 'object',
              properties: {
                suppress: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      justification: { type: 'string' },
                      owner: { type: 'string' },
                      expiresOn: { type: 'string', format: 'date' },
                      appliesTo: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            component: { type: 'string' },
                            path: { type: 'string' }
                          }
                        }
                      }
                    },
                    required: ['id', 'justification', 'owner', 'expiresOn']
                  }
                }
              }
            }
          },
          description: 'Governance and compliance configuration'
        },
        extensions: {
          type: 'object',
          properties: {
            patches: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  justification: { type: 'string' },
                  owner: { type: 'string' },
                  expiresOn: { type: 'string', format: 'date' }
                },
                required: ['name', 'justification', 'owner', 'expiresOn']
              }
            }
          },
          description: 'Platform extensions and patches'
        }
      },
      required: ['service', 'owner'],
      definitions: {
        Component: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              pattern: '^[a-z0-9-]+$',
              description: 'Component name (unique within service)'
            },
            type: {
              type: 'string',
              description: 'Component type from registry'
            },
            config: {
              type: 'object',
              description: 'Component-specific configuration'
            },
            binds: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  to: { type: 'string' },
                  select: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      withLabels: {
                        type: 'object',
                        additionalProperties: { type: 'string' }
                      }
                    }
                  },
                  capability: { type: 'string' },
                  access: {
                    type: 'string',
                    enum: ['read', 'write', 'admin']
                  },
                  env: {
                    type: 'object',
                    additionalProperties: { type: 'string' }
                  },
                  options: {
                    type: 'object',
                    properties: {
                      iamAuth: { type: 'boolean' },
                      tlsRequired: { type: 'boolean' }
                    }
                  }
                },
                oneOf: [
                  { required: ['to', 'capability', 'access'] },
                  { required: ['select', 'capability', 'access'] }
                ]
              },
              description: 'Component bindings'
            },
            labels: {
              type: 'object',
              additionalProperties: { type: 'string' },
              description: 'Component labels'
            },
            overrides: {
              type: 'object',
              description: 'Component override configuration'
            },
            policy: {
              type: 'object',
              description: 'Component-specific policy configuration'
            }
          },
          required: ['name', 'type']
        }
      }
    };

    // In a full implementation, this would merge with component-specific schemas
    // loaded from the registry. For Phase 1, we use the base schema.
    
    logger.debug('Legacy schema built successfully');
    return baseSchema;
  }
}