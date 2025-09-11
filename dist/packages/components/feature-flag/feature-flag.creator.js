"use strict";
/**
 * Creator for FeatureFlagComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureFlagComponentCreator = void 0;
const feature_flag_component_1 = require("./feature-flag.component");
const feature_flag_builder_1 = require("./feature-flag.builder");
/**
 * Creator class for FeatureFlagComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class FeatureFlagComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'feature-flag';
    /**
     * Component display name
     */
    displayName = 'Feature Flag Component';
    /**
     * Component description
     */
    description = 'Feature Flag Component';
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
        'feature-flag',
        'feature-flags',
        'aws',
        'appconfig'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = feature_flag_builder_1.FEATURE_FLAG_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new feature_flag_component_1.FeatureFlagComponentComponent(scope, spec, context);
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
            'feature-flags:feature-flag',
            'monitoring:feature-flag'
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
exports.FeatureFlagComponentCreator = FeatureFlagComponentCreator;
