"use strict";
/**
 * Creator for AutoScalingGroupComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoScalingGroupComponentCreator = void 0;
const auto_scaling_group_component_1 = require("./auto-scaling-group.component");
const auto_scaling_group_builder_1 = require("./auto-scaling-group.builder");
/**
 * Creator class for AutoScalingGroupComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class AutoScalingGroupComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'auto-scaling-group';
    /**
     * Component display name
     */
    displayName = 'Auto Scaling Group Component';
    /**
     * Component description
     */
    description = 'Auto Scaling Group Component';
    /**
     * Component category for organization
     */
    category = 'compute';
    /**
     * AWS service this component manages
     */
    awsService = 'AUTOSCALING';
    /**
     * Component tags for discovery
     */
    tags = [
        'auto-scaling-group',
        'compute',
        'aws',
        'autoscaling'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = auto_scaling_group_builder_1.AUTO_SCALING_GROUP_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new auto_scaling_group_component_1.AutoScalingGroupComponentComponent(scope, spec, context);
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
            'compute:auto-scaling-group',
            'monitoring:auto-scaling-group'
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
exports.AutoScalingGroupComponentCreator = AutoScalingGroupComponentCreator;
