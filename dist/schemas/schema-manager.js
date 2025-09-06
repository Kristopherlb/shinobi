"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaManager = void 0;
const logger_1 = require("../utils/logger");
class SchemaManager {
    /**
     * Get the master schema for manifest validation (AC-P2.2)
     * Dynamically composed from base schema and component schemas
     */
    async getMasterSchema() {
        logger_1.logger.debug('Building master schema');
        // Base schema for top-level manifest structure
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
        logger_1.logger.debug('Master schema built successfully');
        return baseSchema;
    }
}
exports.SchemaManager = SchemaManager;
