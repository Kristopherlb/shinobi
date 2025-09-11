"use strict";
/**
 * Creator for OpenSearchDomainComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenSearchDomainComponentCreator = void 0;
const opensearch_domain_component_1 = require("./opensearch-domain.component");
const opensearch_domain_builder_1 = require("./opensearch-domain.builder");
/**
 * Creator class for OpenSearchDomainComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class OpenSearchDomainComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'opensearch-domain';
    /**
     * Component display name
     */
    displayName = 'Open Search Domain Component';
    /**
     * Component description
     */
    description = 'OpenSearch Domain Component';
    /**
     * Component category for organization
     */
    category = 'database';
    /**
     * AWS service this component manages
     */
    awsService = 'OPENSEARCHSERVICE';
    /**
     * Component tags for discovery
     */
    tags = [
        'opensearch-domain',
        'database',
        'aws',
        'opensearchservice'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = opensearch_domain_builder_1.OPENSEARCH_DOMAIN_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new opensearch_domain_component_1.OpenSearchDomainComponentComponent(scope, spec, context);
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
            'database:opensearch-domain',
            'monitoring:opensearch-domain'
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
exports.OpenSearchDomainComponentCreator = OpenSearchDomainComponentCreator;
