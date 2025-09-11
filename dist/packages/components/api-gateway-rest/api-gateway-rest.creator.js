"use strict";
/**
 * Creator for ApiGatewayRestComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiGatewayRestComponentCreator = void 0;
const api_gateway_rest_component_1 = require("./api-gateway-rest.component");
const api_gateway_rest_builder_1 = require("./api-gateway-rest.builder");
/**
 * Creator class for ApiGatewayRestComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class ApiGatewayRestComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'api-gateway-rest';
    /**
     * Component display name
     */
    displayName = 'Api Gateway Rest Component';
    /**
     * Component description
     */
    description = 'Enterprise REST API Gateway Component implementing Component API Contract v1.0';
    /**
     * Component category for organization
     */
    category = 'api';
    /**
     * AWS service this component manages
     */
    awsService = 'APIGATEWAY';
    /**
     * Component tags for discovery
     */
    tags = [
        'api-gateway-rest',
        'api',
        'aws',
        'apigateway'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = api_gateway_rest_builder_1.API_GATEWAY_REST_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new api_gateway_rest_component_1.ApiGatewayRestComponentComponent(scope, spec, context);
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
            'api:api-gateway-rest',
            'monitoring:api-gateway-rest'
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
exports.ApiGatewayRestComponentCreator = ApiGatewayRestComponentCreator;
