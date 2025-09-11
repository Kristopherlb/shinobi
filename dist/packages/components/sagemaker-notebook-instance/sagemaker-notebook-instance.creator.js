"use strict";
/**
 * Creator for SageMakerNotebookInstanceComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SageMakerNotebookInstanceComponentCreator = void 0;
const sagemaker_notebook_instance_component_1 = require("./sagemaker-notebook-instance.component");
const sagemaker_notebook_instance_builder_1 = require("./sagemaker-notebook-instance.builder");
/**
 * Creator class for SageMakerNotebookInstanceComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class SageMakerNotebookInstanceComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'sagemaker-notebook-instance';
    /**
     * Component display name
     */
    displayName = 'Sage Maker Notebook Instance Component';
    /**
     * Component description
     */
    description = 'SageMaker Notebook Instance Component';
    /**
     * Component category for organization
     */
    category = 'ml';
    /**
     * AWS service this component manages
     */
    awsService = 'SAGEMAKER';
    /**
     * Component tags for discovery
     */
    tags = [
        'sagemaker-notebook-instance',
        'ml',
        'aws',
        'sagemaker'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = sagemaker_notebook_instance_builder_1.SAGEMAKER_NOTEBOOK_INSTANCE_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new sagemaker_notebook_instance_component_1.SageMakerNotebookInstanceComponentComponent(scope, spec, context);
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
            'ml:sagemaker-notebook-instance',
            'monitoring:sagemaker-notebook-instance'
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
exports.SageMakerNotebookInstanceComponentCreator = SageMakerNotebookInstanceComponentCreator;
