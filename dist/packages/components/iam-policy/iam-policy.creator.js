"use strict";
/**
 * Creator for IamPolicyComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IamPolicyComponentCreator = void 0;
const iam_policy_component_1 = require("./iam-policy.component");
const iam_policy_builder_1 = require("./iam-policy.builder");
/**
 * Creator class for IamPolicyComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class IamPolicyComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'iam-policy';
    /**
     * Component display name
     */
    displayName = 'Iam Policy Component';
    /**
     * Component description
     */
    description = 'IAM Policy Component';
    /**
     * Component category for organization
     */
    category = 'security';
    /**
     * AWS service this component manages
     */
    awsService = 'IAM';
    /**
     * Component tags for discovery
     */
    tags = [
        'iam-policy',
        'security',
        'aws',
        'iam'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = iam_policy_builder_1.IAM_POLICY_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new iam_policy_component_1.IamPolicyComponentComponent(scope, spec, context);
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
            'security:iam-policy',
            'monitoring:iam-policy'
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
exports.IamPolicyComponentCreator = IamPolicyComponentCreator;
