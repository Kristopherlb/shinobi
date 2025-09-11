"use strict";
/**
 * Creator for EcsClusterComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EcsClusterComponentCreator = void 0;
const ecs_cluster_component_1 = require("./ecs-cluster.component");
const ecs_cluster_builder_1 = require("./ecs-cluster.builder");
/**
 * Creator class for EcsClusterComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class EcsClusterComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'ecs-cluster';
    /**
     * Component display name
     */
    displayName = 'Ecs Cluster Component';
    /**
     * Component description
     */
    description = 'ECS Cluster Component';
    /**
     * Component category for organization
     */
    category = 'compute';
    /**
     * AWS service this component manages
     */
    awsService = 'ECS';
    /**
     * Component tags for discovery
     */
    tags = [
        'ecs-cluster',
        'compute',
        'aws',
        'ecs'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = ecs_cluster_builder_1.ECS_CLUSTER_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new ecs_cluster_component_1.EcsClusterComponentComponent(scope, spec, context);
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
            'compute:ecs-cluster',
            'monitoring:ecs-cluster'
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
exports.EcsClusterComponentCreator = EcsClusterComponentCreator;
