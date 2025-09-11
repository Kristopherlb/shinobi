"use strict";
/**
 * Creator for SSM Parameter Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SsmParameterCreator = void 0;
const ssm_parameter_component_1 = require("./ssm-parameter.component");
const ssm_parameter_builder_1 = require("./ssm-parameter.builder");
/**
 * Creator class for SSM Parameter component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class SsmParameterCreator {
    /**
     * Component type identifier
     */
    componentType = 'ssm-parameter';
    /**
     * Component display name
     */
    displayName = 'SSM Parameter';
    /**
     * Component description
     */
    description = 'AWS Systems Manager Parameter Store for configuration management and application parameters with compliance-aware encryption';
    /**
     * Component category for organization
     */
    category = 'configuration';
    /**
     * AWS service this component manages
     */
    awsService = 'SSM';
    /**
     * Component tags for discovery
     */
    tags = [
        'ssm-parameter',
        'configuration',
        'parameter-store',
        'secrets-management'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = ssm_parameter_builder_1.SSM_PARAMETER_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new ssm_parameter_component_1.SsmParameterComponent(scope, spec.name, context, spec);
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
        // Validate parameter name
        if (!config?.parameterName) {
            errors.push('Parameter name is required');
        }
        else if (!config.parameterName.startsWith('/')) {
            errors.push('Parameter name must start with /');
        }
        else if (config.parameterName.length > 2048) {
            errors.push('Parameter name cannot exceed 2048 characters');
        }
        // Validate parameter value length
        if (config?.value && config.value.length > 4096) {
            errors.push('Parameter value cannot exceed 4096 characters for Standard tier (platform will auto-upgrade to Advanced if needed)');
        }
        // Validate parameter type and sensitivity alignment
        if (config?.parameterType === 'secret' && config?.sensitivityLevel === 'public') {
            errors.push('Secret parameter type cannot have public sensitivity level');
        }
        // Validate custom validation pattern
        if (config?.validationPattern === 'custom' && !config?.customValidationPattern) {
            errors.push('Custom validation pattern is required when validationPattern is custom');
        }
        // Production environment validations
        if (context.environment === 'prod') {
            if (config?.sensitivityLevel === 'public' && context.complianceFramework !== 'commercial') {
                errors.push('Public sensitivity level is not recommended for production in compliance environments');
            }
        }
        // FedRAMP compliance validations - these should now come from platform config but validate consistency
        if (context.complianceFramework === 'fedramp-moderate' || context.complianceFramework === 'fedramp-high') {
            if (config?.sensitivityLevel === 'public') {
                errors.push('Public sensitivity level is not allowed in FedRAMP compliance environments');
            }
            if (config?.parameterType === 'configuration' && config?.sensitivityLevel !== 'confidential') {
                errors.push('Configuration parameters in FedRAMP environments should use confidential sensitivity level');
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
            'configuration:parameter',
            'secrets:parameter'
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
            'parameter',
            'kmsKey'
        ];
    }
}
exports.SsmParameterCreator = SsmParameterCreator;
