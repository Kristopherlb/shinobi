"use strict";
/**
 * Creator for Ec2InstanceComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ec2InstanceComponentCreator = void 0;
const ec2_instance_component_1 = require("./ec2-instance.component");
const ec2_instance_builder_1 = require("./ec2-instance.builder");
/**
 * Creator class for Ec2InstanceComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class Ec2InstanceComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'ec2-instance';
    /**
     * Component display name
     */
    displayName = 'Ec2 Instance Component';
    /**
     * Component description
     */
    description = 'EC2 Instance Component';
    /**
     * Component category for organization
     */
    category = 'compute';
    /**
     * AWS service this component manages
     */
    awsService = 'EC2';
    /**
     * Component tags for discovery
     */
    tags = [
        'ec2-instance',
        'compute',
        'aws',
        'ec2'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = ec2_instance_builder_1.EC2_INSTANCE_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new ec2_instance_component_1.Ec2InstanceComponentComponent(scope, spec, context);
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
            'compute:ec2-instance',
            'monitoring:ec2-instance'
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
exports.Ec2InstanceComponentCreator = Ec2InstanceComponentCreator;
