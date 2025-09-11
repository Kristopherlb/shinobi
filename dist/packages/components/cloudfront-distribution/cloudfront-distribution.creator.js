"use strict";
/**
 * Creator for CloudFrontDistributionComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudFrontDistributionComponentCreator = void 0;
const cloudfront_distribution_component_1 = require("./cloudfront-distribution.component");
const cloudfront_distribution_builder_1 = require("./cloudfront-distribution.builder");
/**
 * Creator class for CloudFrontDistributionComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class CloudFrontDistributionComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'cloudfront-distribution';
    /**
     * Component display name
     */
    displayName = 'Cloud Front Distribution Component';
    /**
     * Component description
     */
    description = 'CloudFront Distribution Component implementing Component API Contract v1.0';
    /**
     * Component category for organization
     */
    category = 'networking';
    /**
     * AWS service this component manages
     */
    awsService = 'CLOUDFRONT';
    /**
     * Component tags for discovery
     */
    tags = [
        'cloudfront-distribution',
        'networking',
        'aws',
        'cloudfront'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = cloudfront_distribution_builder_1.CLOUDFRONT_DISTRIBUTION_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new cloudfront_distribution_component_1.CloudFrontDistributionComponentComponent(scope, spec, context);
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
            'networking:cloudfront-distribution',
            'monitoring:cloudfront-distribution'
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
exports.CloudFrontDistributionComponentCreator = CloudFrontDistributionComponentCreator;
