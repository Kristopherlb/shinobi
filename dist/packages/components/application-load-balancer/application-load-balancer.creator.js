"use strict";
/**
 * Creator for ApplicationLoadBalancerComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationLoadBalancerComponentCreator = void 0;
const application_load_balancer_builder_1 = require("./application-load-balancer.builder");
/**
 * Creator class for ApplicationLoadBalancerComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class ApplicationLoadBalancerComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'application-load-balancer';
    /**
     * Component display name
     */
    displayName = 'Application Load Balancer Component';
    /**
     * Component description
     */
    description = 'Application Load Balancer Component implementing Component API Contract v1.0';
    /**
     * Component category for organization
     */
    category = 'networking';
    /**
     * AWS service this component manages
     */
    awsService = 'ELASTICLOADBALANCINGV2';
    /**
     * Component tags for discovery
     */
    tags = [
        'application-load-balancer',
        'networking',
        'aws',
        'elasticloadbalancingv2'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = application_load_balancer_builder_1.APPLICATION_LOAD_BALANCER_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new ApplicationLoadBalancerComponentComponent(scope, spec, context);
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
            'networking:application-load-balancer',
            'monitoring:application-load-balancer'
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
exports.ApplicationLoadBalancerComponentCreator = ApplicationLoadBalancerComponentCreator;
