"use strict";
/**
 * Creator for GlueJobComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlueJobComponentCreator = void 0;
const glue_job_component_1 = require("./glue-job.component");
const glue_job_builder_1 = require("./glue-job.builder");
/**
 * Creator class for GlueJobComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class GlueJobComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'glue-job';
    /**
     * Component display name
     */
    displayName = 'Glue Job Component';
    /**
     * Component description
     */
    description = 'Glue Job Component';
    /**
     * Component category for organization
     */
    category = 'analytics';
    /**
     * AWS service this component manages
     */
    awsService = 'GLUE';
    /**
     * Component tags for discovery
     */
    tags = [
        'glue-job',
        'analytics',
        'aws',
        'glue'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = glue_job_builder_1.GLUE_JOB_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new glue_job_component_1.GlueJobComponentComponent(scope, spec, context);
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
            'analytics:glue-job',
            'monitoring:glue-job'
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
exports.GlueJobComponentCreator = GlueJobComponentCreator;
