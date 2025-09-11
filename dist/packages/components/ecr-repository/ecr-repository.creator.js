"use strict";
/**
 * Creator for EcrRepositoryComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EcrRepositoryComponentCreator = void 0;
const ecr_repository_component_1 = require("./ecr-repository.component");
const ecr_repository_builder_1 = require("./ecr-repository.builder");
/**
 * Creator class for EcrRepositoryComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class EcrRepositoryComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'ecr-repository';
    /**
     * Component display name
     */
    displayName = 'Ecr Repository Component';
    /**
     * Component description
     */
    description = 'ECR Repository Component';
    /**
     * Component category for organization
     */
    category = 'containers';
    /**
     * AWS service this component manages
     */
    awsService = 'ECR';
    /**
     * Component tags for discovery
     */
    tags = [
        'ecr-repository',
        'containers',
        'aws',
        'ecr'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = ecr_repository_builder_1.ECR_REPOSITORY_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new ecr_repository_component_1.EcrRepositoryComponentComponent(scope, spec, context);
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
            'containers:ecr-repository',
            'monitoring:ecr-repository'
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
exports.EcrRepositoryComponentCreator = EcrRepositoryComponentCreator;
