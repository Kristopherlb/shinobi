"use strict";
/**
 * Creator for OpenFeatureProviderComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenFeatureProviderComponentCreator = void 0;
const openfeature_provider_component_1 = require("./openfeature-provider.component");
const openfeature_provider_builder_1 = require("./openfeature-provider.builder");
/**
 * Creator class for OpenFeatureProviderComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class OpenFeatureProviderComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'openfeature-provider';
    /**
     * Component display name
     */
    displayName = 'Open Feature Provider Component';
    /**
     * Component description
     */
    description = 'OpenFeature Provider Component';
    /**
     * Component category for organization
     */
    category = 'feature-flags';
    /**
     * AWS service this component manages
     */
    awsService = 'APPCONFIG';
    /**
     * Component tags for discovery
     */
    tags = [
        'openfeature-provider',
        'feature-flags',
        'aws',
        'appconfig'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = openfeature_provider_builder_1.OPENFEATURE_PROVIDER_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new openfeature_provider_component_1.OpenFeatureProviderComponentComponent(scope, spec, context);
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
            'feature-flags:openfeature-provider',
            'monitoring:openfeature-provider'
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
exports.OpenFeatureProviderComponentCreator = OpenFeatureProviderComponentCreator;
