"use strict";
/**
 * Creator for Route53HostedZoneComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Route53HostedZoneComponentCreator = void 0;
const route53_hosted_zone_component_1 = require("./route53-hosted-zone.component");
const route53_hosted_zone_builder_1 = require("./route53-hosted-zone.builder");
/**
 * Creator class for Route53HostedZoneComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class Route53HostedZoneComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'route53-hosted-zone';
    /**
     * Component display name
     */
    displayName = 'Route53 Hosted Zone Component';
    /**
     * Component description
     */
    description = 'Route53 Hosted Zone Component';
    /**
     * Component category for organization
     */
    category = 'networking';
    /**
     * AWS service this component manages
     */
    awsService = 'ROUTE53';
    /**
     * Component tags for discovery
     */
    tags = [
        'route53-hosted-zone',
        'networking',
        'aws',
        'route53'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = route53_hosted_zone_builder_1.ROUTE53_HOSTED_ZONE_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new route53_hosted_zone_component_1.Route53HostedZoneComponentComponent(scope, spec, context);
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
            'networking:route53-hosted-zone',
            'monitoring:route53-hosted-zone'
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
exports.Route53HostedZoneComponentCreator = Route53HostedZoneComponentCreator;
