"use strict";
/**
 * Creator for CognitoUserPoolComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitoUserPoolComponentCreator = void 0;
const cognito_user_pool_component_1 = require("./cognito-user-pool.component");
const cognito_user_pool_builder_1 = require("./cognito-user-pool.builder");
/**
 * Creator class for CognitoUserPoolComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class CognitoUserPoolComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'cognito-user-pool';
    /**
     * Component display name
     */
    displayName = 'Cognito User Pool Component';
    /**
     * Component description
     */
    description = 'Cognito User Pool Component implementing Component API Contract v1.0';
    /**
     * Component category for organization
     */
    category = 'security';
    /**
     * AWS service this component manages
     */
    awsService = 'COGNITO';
    /**
     * Component tags for discovery
     */
    tags = [
        'cognito-user-pool',
        'security',
        'aws',
        'cognito'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = cognito_user_pool_builder_1.COGNITO_USER_POOL_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new cognito_user_pool_component_1.CognitoUserPoolComponentComponent(scope, spec, context);
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
            'security:cognito-user-pool',
            'monitoring:cognito-user-pool'
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
exports.CognitoUserPoolComponentCreator = CognitoUserPoolComponentCreator;
