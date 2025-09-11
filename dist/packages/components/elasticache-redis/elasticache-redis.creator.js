"use strict";
/**
 * Creator for ElastiCacheRedisComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElastiCacheRedisComponentCreator = void 0;
const elasticache_redis_component_1 = require("./elasticache-redis.component");
const elasticache_redis_builder_1 = require("./elasticache-redis.builder");
/**
 * Creator class for ElastiCacheRedisComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class ElastiCacheRedisComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'elasticache-redis';
    /**
     * Component display name
     */
    displayName = 'Elasti Cache Redis Component';
    /**
     * Component description
     */
    description = 'ElastiCache Redis Component implementing Component API Contract v1.0';
    /**
     * Component category for organization
     */
    category = 'cache';
    /**
     * AWS service this component manages
     */
    awsService = 'ELASTICACHE';
    /**
     * Component tags for discovery
     */
    tags = [
        'elasticache-redis',
        'cache',
        'aws',
        'elasticache'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = elasticache_redis_builder_1.ELASTICACHE_REDIS_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new elasticache_redis_component_1.ElastiCacheRedisComponentComponent(scope, spec, context);
    }
    /**
     * Validates component specification beyond JSON Schema validation
     */
    validateSpec(spec, context) {
        const errors = [];
        const config = spec.config;
        // Validate component name
        if (!spec.name || spec.name.length === 0) {
            errors.push('Component name is required');
        }
        else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
            errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
        }
        // TODO: Add component-specific validations here
        // Environment-specific validations
        if (context.environment === 'prod') {
            if (!config?.monitoring?.enabled) {
                errors.push('Monitoring must be enabled in production environment');
            }
            // TODO: Add production-specific validations
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
    /**
     * Returns the capabilities this component provides when synthesized
     */
    getProvidedCapabilities() {
        return [
            'cache:elasticache-redis',
            'monitoring:elasticache-redis'
        ];
    }
    /**
     * Returns the capabilities this component requires from other components
     */
    getRequiredCapabilities() {
        return [
        // TODO: Define required capabilities
        ];
    }
    /**
     * Returns construct handles that will be registered by this component
     */
    getConstructHandles() {
        return [
            'main'
            // TODO: Add additional construct handles if needed
        ];
    }
}
exports.ElastiCacheRedisComponentCreator = ElastiCacheRedisComponentCreator;
