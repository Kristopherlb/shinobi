"use strict";
/**
 * Creator for Static Website Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticWebsiteCreator = void 0;
const static_website_component_1 = require("./static-website.component");
const static_website_builder_1 = require("./static-website.builder");
/**
 * Creator class for Static Website component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class StaticWebsiteCreator {
    /**
     * Component type identifier
     */
    componentType = 'static-website';
    /**
     * Component display name
     */
    displayName = 'Static Website';
    /**
     * Component description
     */
    description = 'Static website hosting with S3 and CloudFront CDN for global performance with compliance-aware configuration';
    /**
     * Component category for organization
     */
    category = 'hosting';
    /**
     * AWS service this component manages
     */
    awsService = 'S3, CloudFront';
    /**
     * Component tags for discovery
     */
    tags = [
        'static-website',
        'hosting',
        's3',
        'cloudfront',
        'cdn'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = static_website_builder_1.STATIC_WEBSITE_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new static_website_component_1.StaticWebsiteComponent(scope, spec.name, context, spec);
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
        // Validate domain configuration
        if (config?.domain && !config.domain.domainName) {
            errors.push('Domain name is required when domain configuration is provided');
        }
        // Validate deployment configuration
        if (config?.deployment?.enabled && !config.deployment.sourcePath) {
            errors.push('Source path is required when deployment is enabled');
        }
        // Production environment validations
        if (context.environment === 'prod') {
            if (config?.security?.enforceHTTPS === false) {
                errors.push('HTTPS must be enforced in production environment');
            }
            if (config?.security?.encryption === false) {
                errors.push('Encryption must be enabled in production environment');
            }
        }
        // FedRAMP compliance validations
        if (context.complianceFramework === 'fedramp-moderate' || context.complianceFramework === 'fedramp-high') {
            if (config?.bucket?.versioning === false) {
                errors.push('S3 versioning is mandatory for FedRAMP compliance');
            }
            if (config?.bucket?.accessLogging === false) {
                errors.push('S3 access logging is mandatory for FedRAMP compliance');
            }
            if (config?.distribution?.enableLogging === false) {
                errors.push('CloudFront logging is mandatory for FedRAMP compliance');
            }
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
            'hosting:static',
            'web:static'
        ];
    }
    /**
     * Returns the capabilities this component requires from other components
     */
    getRequiredCapabilities() {
        return [];
    }
    /**
     * Returns construct handles that will be registered by this component
     */
    getConstructHandles() {
        return [
            'main',
            'bucket',
            'distribution',
            'deployment'
        ];
    }
}
exports.StaticWebsiteCreator = StaticWebsiteCreator;
