"use strict";
/**
 * Platform-Level Endpoints (The "Developer's Toolbox")
 * These endpoints provide read-only context for understanding the platform.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformEndpointsService = void 0;
/**
 * Platform Endpoints Service
 */
class PlatformEndpointsService {
    /**
     * GET /platform/components
     * Lists all available, versioned components.
     */
    async getComponents() {
        // Implementation would scan packages/components directory
        // and build component registry dynamically
        return [
            {
                name: 'lambda-api',
                type: 'lambda-api',
                version: '1.2.0',
                description: 'Serverless HTTP API component with API Gateway integration',
                author: 'Platform Team',
                keywords: ['lambda', 'api', 'serverless', 'http'],
                supportedFrameworks: ['commercial', 'fedramp-moderate', 'fedramp-high'],
                configSchema: 'lambda-api-config-schema',
                capabilities: ['api:rest', 'lambda:function'],
                bindings: ['lambda-to-rds', 'lambda-to-s3', 'lambda-to-sns'],
                triggers: []
            },
            {
                name: 'rds-postgres',
                type: 'rds-postgres',
                version: '1.1.0',
                description: 'Managed PostgreSQL database with compliance hardening',
                author: 'Platform Team',
                keywords: ['rds', 'postgres', 'database', 'sql'],
                supportedFrameworks: ['commercial', 'fedramp-moderate', 'fedramp-high'],
                configSchema: 'rds-postgres-config-schema',
                capabilities: ['db:postgres'],
                bindings: [],
                triggers: []
            },
            {
                name: 'mcp-server',
                type: 'mcp-server',
                version: '1.0.0',
                description: 'Model Context Protocol Server for platform ecosystem intelligence',
                author: 'Platform Team',
                keywords: ['mcp', 'api', 'platform', 'context'],
                supportedFrameworks: ['commercial', 'fedramp-moderate', 'fedramp-high'],
                configSchema: 'mcp-server-config-schema',
                capabilities: ['api:rest', 'container:ecs'],
                bindings: [],
                triggers: []
            }
        ];
    }
    /**
     * GET /platform/components/{type}/schema
     * Returns the Config.schema.json for a component.
     */
    async getComponentSchema(componentType) {
        const schemas = {
            'lambda-api': {
                type: 'object',
                title: 'Lambda API Configuration',
                description: 'Configuration for creating a Lambda function with API Gateway',
                properties: {
                    handler: {
                        type: 'string',
                        description: 'Lambda function handler',
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
                    }
                },
                required: ['handler'],
                defaults: {
                    runtime: 'nodejs20.x',
                    memory: 512,
                    timeout: 30
                }
            },
            'rds-postgres': {
                type: 'object',
                title: 'RDS PostgreSQL Configuration',
                description: 'Configuration for creating an RDS PostgreSQL database instance',
                properties: {
                    dbName: {
                        type: 'string',
                        description: 'The name of the database to create',
                        pattern: '^[a-zA-Z][a-zA-Z0-9_]*$'
                    },
                    instanceClass: {
                        type: 'string',
                        description: 'The EC2 instance class for the database',
                        enum: ['db.t3.micro', 'db.t3.small', 'db.t3.medium', 'db.r5.large'],
                        default: 'db.t3.micro'
                    },
                    encryptionEnabled: {
                        type: 'boolean',
                        description: 'Enable encryption at rest',
                        default: true
                    }
                },
                required: ['dbName'],
                defaults: {
                    instanceClass: 'db.t3.micro',
                    encryptionEnabled: true,
                    backupRetentionDays: 7
                }
            },
            'mcp-server': {
                type: 'object',
                title: 'MCP Server Configuration',
                description: 'Configuration for Model Context Protocol Server',
                properties: {
                    cpu: {
                        type: 'number',
                        description: 'Task CPU units',
                        enum: [256, 512, 1024, 2048],
                        default: 512
                    },
                    memory: {
                        type: 'number',
                        description: 'Task memory in MB',
                        enum: [512, 1024, 2048, 4096],
                        default: 1024
                    },
                    taskCount: {
                        type: 'number',
                        description: 'Desired number of tasks',
                        minimum: 1,
                        maximum: 10,
                        default: 2
                    }
                },
                required: [],
                defaults: {
                    cpu: 512,
                    memory: 1024,
                    taskCount: 2
                }
            }
        };
        const schema = schemas[componentType];
        if (!schema) {
            throw new Error(`Component type '${componentType}' not found`);
        }
        return schema;
    }
    /**
     * GET /platform/capabilities
     * Returns the official Capability Naming Standard.
     */
    async getCapabilities() {
        return [
            {
                name: 'api:rest',
                description: 'RESTful API endpoint capability',
                type: 'api',
                fields: {
                    endpoint: {
                        type: 'string',
                        description: 'API endpoint URL',
                        required: true
                    },
                    protocol: {
                        type: 'string',
                        description: 'Protocol (HTTP/HTTPS)',
                        required: true
                    },
                    apiType: {
                        type: 'string',
                        description: 'API type (REST/GraphQL)',
                        required: true
                    },
                    paths: {
                        type: 'object',
                        description: 'Available API paths',
                        required: false
                    }
                },
                examples: [
                    {
                        endpoint: 'https://api.example.com/v1',
                        protocol: 'HTTPS',
                        apiType: 'REST',
                        paths: {
                            '/users': 'User management',
                            '/orders': 'Order processing'
                        }
                    }
                ]
            },
            {
                name: 'db:postgres',
                description: 'PostgreSQL database capability',
                type: 'database',
                fields: {
                    host: {
                        type: 'string',
                        description: 'Database host',
                        required: true
                    },
                    port: {
                        type: 'number',
                        description: 'Database port',
                        required: true
                    },
                    databaseName: {
                        type: 'string',
                        description: 'Database name',
                        required: true
                    },
                    secretArn: {
                        type: 'string',
                        description: 'Secrets Manager ARN for credentials',
                        required: true
                    }
                },
                examples: [
                    {
                        host: 'myapp-db.region.rds.amazonaws.com',
                        port: 5432,
                        databaseName: 'myapp',
                        secretArn: 'arn:aws:secretsmanager:region:account:secret:myapp-db'
                    }
                ]
            },
            {
                name: 'storage:s3',
                description: 'S3 bucket storage capability',
                type: 'storage',
                fields: {
                    bucketName: {
                        type: 'string',
                        description: 'S3 bucket name',
                        required: true
                    },
                    bucketArn: {
                        type: 'string',
                        description: 'S3 bucket ARN',
                        required: true
                    },
                    region: {
                        type: 'string',
                        description: 'AWS region',
                        required: true
                    }
                },
                examples: [
                    {
                        bucketName: 'myapp-storage-bucket',
                        bucketArn: 'arn:aws:s3:::myapp-storage-bucket',
                        region: 'us-east-1'
                    }
                ]
            },
            {
                name: 'lambda:function',
                description: 'AWS Lambda function capability',
                type: 'compute',
                fields: {
                    functionArn: {
                        type: 'string',
                        description: 'Lambda function ARN',
                        required: true
                    },
                    functionName: {
                        type: 'string',
                        description: 'Lambda function name',
                        required: true
                    },
                    runtime: {
                        type: 'string',
                        description: 'Runtime environment',
                        required: true
                    }
                },
                examples: [
                    {
                        functionArn: 'arn:aws:lambda:region:account:function:myapp-api',
                        functionName: 'myapp-api',
                        runtime: 'nodejs20.x'
                    }
                ]
            },
            {
                name: 'container:ecs',
                description: 'ECS container service capability',
                type: 'compute',
                fields: {
                    clusterArn: {
                        type: 'string',
                        description: 'ECS cluster ARN',
                        required: true
                    },
                    serviceArn: {
                        type: 'string',
                        description: 'ECS service ARN',
                        required: true
                    },
                    taskDefinitionArn: {
                        type: 'string',
                        description: 'ECS task definition ARN',
                        required: true
                    }
                },
                examples: [
                    {
                        clusterArn: 'arn:aws:ecs:region:account:cluster/myapp-cluster',
                        serviceArn: 'arn:aws:ecs:region:account:service/myapp-cluster/myapp-service',
                        taskDefinitionArn: 'arn:aws:ecs:region:account:task-definition/myapp:1'
                    }
                ]
            }
        ];
    }
    /**
     * GET /platform/bindings
     * Returns the BindingMatrix from the BinderRegistry.
     */
    async getBindings() {
        return [
            {
                sourceType: 'lambda-api',
                targetType: 'rds-postgres',
                capability: 'db:postgres',
                supportedAccess: ['read', 'write'],
                description: 'Lambda function connecting to PostgreSQL database',
                strategy: 'LambdaToRdsBinder',
                constraints: {
                    vpc: 'required',
                    securityGroup: 'shared'
                }
            },
            {
                sourceType: 'lambda-api',
                targetType: 's3-bucket',
                capability: 'storage:s3',
                supportedAccess: ['read', 'write', 'admin'],
                description: 'Lambda function accessing S3 bucket',
                strategy: 'LambdaToS3Binder',
                constraints: {
                    encryption: 'required_for_fedramp'
                }
            },
            {
                sourceType: 'lambda-worker',
                targetType: 'sns-topic',
                capability: 'messaging:sns',
                supportedAccess: ['publish'],
                description: 'Lambda function publishing to SNS topic',
                strategy: 'LambdaToSnsBinder',
                constraints: {}
            },
            {
                sourceType: 'ecs-service',
                targetType: 'rds-postgres',
                capability: 'db:postgres',
                supportedAccess: ['read', 'write'],
                description: 'ECS service connecting to PostgreSQL database',
                strategy: 'EcsToRdsBinder',
                constraints: {
                    vpc: 'required',
                    securityGroup: 'shared'
                }
            }
        ];
    }
    /**
     * POST /platform/validate
     * Validates a provided service.yml manifest.
     */
    async validateManifest(manifest) {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        // Basic structure validation
        if (!manifest.service) {
            errors.push({
                path: 'service',
                message: 'Service name is required',
                code: 'MISSING_SERVICE_NAME',
                severity: 'error'
            });
        }
        if (!manifest.owner) {
            errors.push({
                path: 'owner',
                message: 'Service owner is required',
                code: 'MISSING_OWNER',
                severity: 'error'
            });
        }
        if (!manifest.components || !Array.isArray(manifest.components)) {
            errors.push({
                path: 'components',
                message: 'Components array is required',
                code: 'MISSING_COMPONENTS',
                severity: 'error'
            });
        }
        else {
            // Validate each component
            manifest.components.forEach((component, index) => {
                if (!component.name) {
                    errors.push({
                        path: `components[${index}].name`,
                        message: 'Component name is required',
                        code: 'MISSING_COMPONENT_NAME',
                        severity: 'error'
                    });
                }
                if (!component.type) {
                    errors.push({
                        path: `components[${index}].type`,
                        message: 'Component type is required',
                        code: 'MISSING_COMPONENT_TYPE',
                        severity: 'error'
                    });
                }
                // Check for known component types
                const knownTypes = ['lambda-api', 'lambda-worker', 'rds-postgres', 's3-bucket', 'sns-topic', 'sqs-queue', 'mcp-server'];
                if (component.type && !knownTypes.includes(component.type)) {
                    warnings.push({
                        path: `components[${index}].type`,
                        message: `Unknown component type '${component.type}'`,
                        code: 'UNKNOWN_COMPONENT_TYPE',
                        suggestion: 'Verify component type is spelled correctly and exists in the platform'
                    });
                }
            });
        }
        // Compliance framework validation
        const validFrameworks = ['commercial', 'fedramp-moderate', 'fedramp-high'];
        if (manifest.complianceFramework && !validFrameworks.includes(manifest.complianceFramework)) {
            errors.push({
                path: 'complianceFramework',
                message: `Invalid compliance framework '${manifest.complianceFramework}'`,
                code: 'INVALID_COMPLIANCE_FRAMEWORK',
                severity: 'error'
            });
        }
        // Binding validation
        if (manifest.components) {
            manifest.components.forEach((component, index) => {
                if (component.binds && Array.isArray(component.binds)) {
                    component.binds.forEach((binding, bindingIndex) => {
                        if (!binding.to) {
                            errors.push({
                                path: `components[${index}].binds[${bindingIndex}].to`,
                                message: 'Binding target is required',
                                code: 'MISSING_BINDING_TARGET',
                                severity: 'error'
                            });
                        }
                        if (!binding.capability) {
                            errors.push({
                                path: `components[${index}].binds[${bindingIndex}].capability`,
                                message: 'Binding capability is required',
                                code: 'MISSING_BINDING_CAPABILITY',
                                severity: 'error'
                            });
                        }
                    });
                }
            });
        }
        // Generate suggestions
        if (manifest.components && manifest.components.length > 0) {
            const hasDatabase = manifest.components.some((c) => c.type === 'rds-postgres');
            const hasApi = manifest.components.some((c) => c.type === 'lambda-api');
            if (hasApi && !hasDatabase) {
                suggestions.push('Consider adding a database component for data persistence');
            }
            if (manifest.complianceFramework === 'fedramp-high') {
                suggestions.push('Ensure all components have encryption enabled for FedRAMP High compliance');
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            suggestions
        };
    }
}
exports.PlatformEndpointsService = PlatformEndpointsService;
