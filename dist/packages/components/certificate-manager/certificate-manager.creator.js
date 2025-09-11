"use strict";
/**
 * Creator for CertificateManagerComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificateManagerComponentCreator = void 0;
const certificate_manager_component_1 = require("./certificate-manager.component");
const certificate_manager_builder_1 = require("./certificate-manager.builder");
/**
 * Creator class for CertificateManagerComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class CertificateManagerComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'certificate-manager';
    /**
     * Component display name
     */
    displayName = 'Certificate Manager Component';
    /**
     * Component description
     */
    description = 'Certificate Manager Component';
    /**
     * Component category for organization
     */
    category = 'security';
    /**
     * AWS service this component manages
     */
    awsService = 'CERTIFICATEMANAGER';
    /**
     * Component tags for discovery
     */
    tags = [
        'certificate-manager',
        'security',
        'aws',
        'certificatemanager'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = certificate_manager_builder_1.CERTIFICATE_MANAGER_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new certificate_manager_component_1.CertificateManagerComponentComponent(scope, spec, context);
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
            'security:certificate-manager',
            'monitoring:certificate-manager'
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
exports.CertificateManagerComponentCreator = CertificateManagerComponentCreator;
