"use strict";
/**
 * Creator for IamRoleComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IamRoleComponentCreator = void 0;
const iam_role_component_1 = require("./iam-role.component");
const iam_role_builder_1 = require("./iam-role.builder");
/**
 * Creator class for IamRoleComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class IamRoleComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'iam-role';
    /**
     * Component display name
     */
    displayName = 'Iam Role Component';
    /**
     * Component description
     */
    description = 'IAM Role Component';
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
        'iam-role',
        'security',
        'aws',
        'iam'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = iam_role_builder_1.IAM_ROLE_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new iam_role_component_1.IamRoleComponentComponent(scope, spec, context);
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
            'security:iam-role',
            'monitoring:iam-role'
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
exports.IamRoleComponentCreator = IamRoleComponentCreator;
