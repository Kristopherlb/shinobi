"use strict";
/**
 * LocalStack Environment Component
 *
 * A special, non-deployable component that configures ephemeral local development environments.
 * This component is only used to configure the 'svc local up' command and does not create
 * any AWS resources during deployment.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStackEnvironmentComponent = exports.LocalStackEnvironmentConfigBuilder = exports.LOCALSTACK_ENVIRONMENT_CONFIG_SCHEMA = void 0;
const contracts_1 = require("@platform/contracts");
/**
 * Configuration schema for LocalStack environment
 */
exports.LOCALSTACK_ENVIRONMENT_CONFIG_SCHEMA = {
    type: 'object',
    required: ['services'],
    properties: {
        services: {
            type: 'array',
            description: 'AWS services to emulate in LocalStack',
            items: {
                type: 'string',
                enum: [
                    's3', 'dynamodb', 'sqs', 'lambda', 'rds', 'ec2', 'ecs', 'ecr',
                    'apigateway', 'cloudformation', 'cloudwatch', 'iam', 'sns',
                    'kinesis', 'elasticsearch', 'secretsmanager', 'ssm', 'route53'
                ]
            },
            minItems: 1,
            uniqueItems: true
        },
        localstack: {
            type: 'object',
            description: 'LocalStack configuration options',
            properties: {
                pro: {
                    type: 'boolean',
                    description: 'Use LocalStack Pro features',
                    default: false
                },
                tag: {
                    type: 'string',
                    description: 'LocalStack Docker image tag',
                    pattern: '^[a-zA-Z0-9._-]+$',
                    default: 'latest'
                },
                environment: {
                    type: 'object',
                    description: 'Additional environment variables',
                    additionalProperties: {
                        type: 'string'
                    }
                },
                ports: {
                    type: 'object',
                    description: 'Custom port mappings',
                    additionalProperties: {
                        type: 'number',
                        minimum: 1024,
                        maximum: 65535
                    }
                }
            },
            additionalProperties: false,
            default: {
                pro: false,
                tag: 'latest'
            }
        },
        docker: {
            type: 'object',
            description: 'Docker Compose configuration',
            properties: {
                network: {
                    type: 'string',
                    description: 'Custom network name',
                    pattern: '^[a-zA-Z0-9_-]+$',
                    default: 'localstack-network'
                },
                containerName: {
                    type: 'string',
                    description: 'Custom container name',
                    pattern: '^[a-zA-Z0-9_-]+$',
                    default: 'localstack-main'
                },
                resources: {
                    type: 'object',
                    description: 'Resource limits',
                    properties: {
                        memory: {
                            type: 'string',
                            description: 'Memory limit (e.g., 512m, 2g)',
                            pattern: '^[0-9]+[kmg]?$',
                            default: '2g'
                        },
                        cpus: {
                            type: 'string',
                            description: 'CPU limit (e.g., 0.5, 2.0)',
                            pattern: '^[0-9]+(\\.[0-9]+)?$',
                            default: '2.0'
                        }
                    },
                    additionalProperties: false
                }
            },
            additionalProperties: false,
            default: {
                network: 'localstack-network',
                containerName: 'localstack-main',
                resources: {
                    memory: '2g',
                    cpus: '2.0'
                }
            }
        }
    },
    additionalProperties: false
};
/**
 * Configuration builder for LocalStack environment
 */
class LocalStackEnvironmentConfigBuilder extends contracts_1.ConfigBuilder {
    constructor(context, spec) {
        const builderContext = { context, spec };
        super(builderContext, exports.LOCALSTACK_ENVIRONMENT_CONFIG_SCHEMA);
    }
    /**
     * Builds the final configuration using the centralized 5-layer precedence engine
     */
    async build() {
        return this.buildSync();
    }
    /**
     * Provide component-specific hardcoded fallbacks (Layer 1: Lowest Priority)
     */
    getHardcodedFallbacks() {
        return {
            services: ['s3', 'dynamodb', 'sqs', 'lambda'], // Basic AWS services
            localstack: {
                pro: false,
                tag: 'latest',
                environment: {
                    DEBUG: '0',
                    PERSISTENCE: '1',
                    LAMBDA_EXECUTOR: 'docker-reuse'
                },
                ports: {
                    edge: 4566
                }
            },
            docker: {
                network: 'localstack-network',
                containerName: 'localstack-main',
                resources: {
                    memory: '2g',
                    cpus: '2.0'
                }
            }
        };
    }
}
exports.LocalStackEnvironmentConfigBuilder = LocalStackEnvironmentConfigBuilder;
/**
 * LocalStack Environment Component
 *
 * This is a special component that does not create AWS resources.
 * Instead, it provides configuration for the local development environment.
 */
class LocalStackEnvironmentComponent extends contracts_1.BaseComponent {
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    /**
     * Synthesis phase - This component does not create resources
     */
    synth() {
        const logger = this.getLogger();
        const timer = logger.startTimer();
        logger.info('Starting LocalStack environment configuration', {
            context: {
                action: 'component_synthesis',
                resource: 'localstack_environment',
                component: 'localstack-environment'
            },
            data: {
                componentName: this.spec.name,
                isLocalOnly: true,
                environment: this.context.environment,
                complianceFramework: this.context.complianceFramework
            },
            security: {
                classification: 'internal',
                piiPresent: false,
                auditRequired: false
            }
        });
        try {
            // Build configuration using ConfigBuilder
            const configBuilder = new LocalStackEnvironmentConfigBuilder(this.context, this.spec);
            this.config = configBuilder.buildSync();
            // Perform LocalStack-specific validation and warnings
            this.validateLocalStackConfiguration();
            logger.debug('LocalStack environment configuration built', {
                context: {
                    action: 'config_built',
                    resource: 'localstack_environment',
                    component: 'localstack-environment'
                },
                data: {
                    services: this.config.services,
                    serviceCount: this.config.services.length,
                    proEnabled: this.config.localstack?.pro || false,
                    containerName: this.config.docker?.containerName,
                    memoryLimit: this.config.docker?.resources?.memory,
                    cpuLimit: this.config.docker?.resources?.cpus
                },
                security: {
                    classification: 'internal',
                    piiPresent: false,
                    auditRequired: false
                }
            });
            // Apply platform standards (documented as not applicable for non-deployable components)
            this.applyStandardTags();
            this.configureLocalStackObservability();
            this.configureFeatureFlags();
            // Register capabilities for CLI access
            this.registerCapability('local:development', this.buildLocalDevCapability());
            timer.finish('LocalStack environment configuration completed', {
                context: {
                    action: 'synthesis_success',
                    resource: 'localstack_environment',
                    component: 'localstack-environment'
                },
                data: {
                    serviceCount: this.config.services.length,
                    services: this.config.services,
                    isDeployable: false,
                    configurationValid: true,
                    capabilitiesRegistered: 1
                },
                security: {
                    classification: 'internal',
                    piiPresent: false,
                    auditRequired: false
                }
            });
        }
        catch (error) {
            logger.error('LocalStack environment configuration failed', error, {
                context: {
                    action: 'synthesis_error',
                    resource: 'localstack_environment',
                    component: 'localstack-environment'
                },
                data: {
                    componentName: this.spec.name,
                    configBuilt: !!this.config,
                    environment: this.context.environment,
                    complianceFramework: this.context.complianceFramework
                },
                security: {
                    classification: 'internal',
                    piiPresent: false,
                    auditRequired: true // Error events require audit
                }
            });
            throw error;
        }
    }
    /**
     * Get the capabilities this component provides
     */
    getCapabilities() {
        this.validateSynthesized();
        return this.capabilities;
    }
    /**
     * Get the component type identifier
     */
    getType() {
        return 'localstack-environment';
    }
    /**
     * Get the LocalStack configuration for CLI use
     */
    getLocalStackConfig() {
        if (!this.config) {
            throw new Error('Component must be synthesized before accessing configuration');
        }
        return this.config;
    }
    /**
     * Check if this component should be deployed (it shouldn't)
     */
    isDeployable() {
        return false;
    }
    /**
     * Apply standard platform tags (Not applicable for non-deployable components)
     * This method is provided for consistency with Platform Tagging Standard
     */
    applyStandardTags() {
        const logger = this.getLogger();
        logger.debug('Tagging not applicable for non-deployable LocalStack environment component', {
            context: {
                action: 'tagging_skipped',
                resource: 'localstack_environment',
                component: 'localstack-environment'
            },
            data: {
                componentName: this.spec.name,
                isDeployable: false,
                reason: 'LocalStack environment components do not create AWS resources'
            },
            security: {
                classification: 'internal',
                piiPresent: false,
                auditRequired: false
            }
        });
    }
    /**
     * Configure observability (Not applicable for non-deployable components)
     * This method is provided for consistency with Platform Observability Standard
     */
    configureLocalStackObservability() {
        const logger = this.getLogger();
        logger.debug('Observability configuration not applicable for non-deployable LocalStack environment component', {
            context: {
                action: 'observability_skipped',
                resource: 'localstack_environment',
                component: 'localstack-environment'
            },
            data: {
                componentName: this.spec.name,
                isDeployable: false,
                reason: 'LocalStack environment components are development tools, not production workloads',
                localObservability: {
                    dockerLogsAvailable: true,
                    localstackDashboard: 'http://localhost:4566/_localstack/health',
                    developmentOnly: true
                }
            },
            security: {
                classification: 'internal',
                piiPresent: false,
                auditRequired: false
            }
        });
        // Note: LocalStack provides its own observability endpoints:
        // - Health endpoint: http://localhost:4566/_localstack/health
        // - Service status: http://localhost:4566/_localstack/init
        // - Container logs accessible via: docker logs <container-name>
    }
    /**
     * Configure feature flags and deployment strategies (Limited applicability for development tools)
     * This method provides development-specific configuration options
     */
    configureFeatureFlags() {
        const logger = this.getLogger();
        logger.debug('Feature flagging configuration for LocalStack development environment', {
            context: {
                action: 'feature_flags_configured',
                resource: 'localstack_environment',
                component: 'localstack-environment'
            },
            data: {
                componentName: this.spec.name,
                isDeployable: false,
                developmentFeatures: {
                    persistenceEnabled: this.config?.localstack?.environment?.['PERSISTENCE'] === '1',
                    debugEnabled: this.config?.localstack?.environment?.['DEBUG'] === '1',
                    iamEnforced: this.config?.localstack?.environment?.['ENFORCE_IAM'] === '1',
                    proFeaturesEnabled: this.config?.localstack?.pro || false
                },
                canaryDeployment: {
                    applicable: false,
                    reason: 'LocalStack is a development tool, not a production service'
                }
            },
            security: {
                classification: 'internal',
                piiPresent: false,
                auditRequired: false
            }
        });
        // Note: While traditional feature flags don't apply to LocalStack,
        // LocalStack itself has various feature toggles via environment variables:
        // - PERSISTENCE: Enable/disable data persistence between restarts
        // - DEBUG: Control debug logging level
        // - ENFORCE_IAM: Enable/disable IAM policy enforcement
        // - LAMBDA_EXECUTOR: Control Lambda execution strategy (docker, docker-reuse, local)
        // These act as "infrastructure feature flags" for development environments
    }
    /**
     * Validate LocalStack configuration and log warnings using structured logging
     */
    validateLocalStackConfiguration() {
        const logger = this.getLogger();
        // Check for LocalStack Pro services
        const proServices = ['rds', 'elasticsearch'];
        const usesProServices = this.config.services.some((service) => proServices.includes(service.toLowerCase()));
        if (usesProServices && !this.config.localstack?.pro) {
            const proServicesUsed = this.config.services.filter((s) => proServices.includes(s.toLowerCase()));
            logger.warn('LocalStack Pro services detected without Pro license', {
                context: {
                    action: 'configuration_validation',
                    resource: 'localstack_environment',
                    component: 'localstack-environment'
                },
                data: {
                    componentName: this.spec.name,
                    proServicesUsed: proServicesUsed,
                    proEnabled: this.config.localstack?.pro || false,
                    recommendation: 'Consider setting config.localstack.pro: true'
                },
                security: {
                    classification: 'internal',
                    piiPresent: false,
                    auditRequired: false
                }
            });
        }
        // Check for production environment usage
        if (this.context.environment === 'prod' || this.context.environment === 'production') {
            logger.warn('LocalStack environment detected for production deployment', {
                context: {
                    action: 'environment_validation',
                    resource: 'localstack_environment',
                    component: 'localstack-environment'
                },
                data: {
                    componentName: this.spec.name,
                    environment: this.context.environment,
                    warning: 'LocalStack is intended for local development only',
                    recommendation: 'Use real AWS services for production deployments'
                },
                security: {
                    classification: 'internal',
                    piiPresent: false,
                    auditRequired: true // Production warnings require audit
                }
            });
        }
        // Log compliance considerations
        logger.info('LocalStack compliance framework configuration', {
            context: {
                action: 'compliance_validation',
                resource: 'localstack_environment',
                component: 'localstack-environment'
            },
            data: {
                componentName: this.spec.name,
                complianceFramework: this.context.complianceFramework,
                environment: this.context.environment,
                note: 'LocalStack environments should not process real sensitive data',
                dataHandling: 'Development and testing data only'
            },
            security: {
                classification: 'internal',
                piiPresent: false,
                auditRequired: this.context.complianceFramework.startsWith('fedramp')
            }
        });
    }
    /**
     * Build local development capability
     */
    buildLocalDevCapability() {
        return {
            services: this.config.services,
            localstackConfig: this.config.localstack,
            dockerConfig: this.config.docker,
            endpoint: 'http://localhost:4566'
        };
    }
}
exports.LocalStackEnvironmentComponent = LocalStackEnvironmentComponent;
