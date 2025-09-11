"use strict";
/**
 * Creator for LambdaApiComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LambdaApiComponentCreator = void 0;
const lambda_api_component_1 = require("./lambda-api.component");
const lambda_api_builder_1 = require("./lambda-api.builder");
/**
 * Creator class for LambdaApiComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class LambdaApiComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'lambda-api';
    /**
     * Component display name
     */
    displayName = 'Lambda Api Component';
    /**
     * Component description
     */
    description = 'Lambda API Component';
    /**
     * Component category for organization
     */
    category = 'compute';
    /**
     * AWS service this component manages
     */
    awsService = 'LAMBDA';
    /**
     * Component tags for discovery
     */
    tags = [
        'lambda-api',
        'compute',
        'aws',
        'lambda'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = lambda_api_builder_1.LAMBDA_API_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new lambda_api_component_1.LambdaApiComponentComponent(scope, spec, context);
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
            'compute:lambda-api',
            'monitoring:lambda-api'
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
exports.LambdaApiComponentCreator = LambdaApiComponentCreator;
