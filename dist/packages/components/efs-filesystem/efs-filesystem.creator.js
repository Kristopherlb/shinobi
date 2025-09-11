"use strict";
/**
 * Creator for EfsFilesystemComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EfsFilesystemComponentCreator = void 0;
const efs_filesystem_component_1 = require("./efs-filesystem.component");
const efs_filesystem_builder_1 = require("./efs-filesystem.builder");
/**
 * Creator class for EfsFilesystemComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class EfsFilesystemComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'efs-filesystem';
    /**
     * Component display name
     */
    displayName = 'Efs Filesystem Component';
    /**
     * Component description
     */
    description = 'EFS Filesystem Component';
    /**
     * Component category for organization
     */
    category = 'storage';
    /**
     * AWS service this component manages
     */
    awsService = 'EFS';
    /**
     * Component tags for discovery
     */
    tags = [
        'efs-filesystem',
        'storage',
        'aws',
        'efs'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = efs_filesystem_builder_1.EFS_FILESYSTEM_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new efs_filesystem_component_1.EfsFilesystemComponentComponent(scope, spec, context);
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
            'storage:efs-filesystem',
            'monitoring:efs-filesystem'
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
exports.EfsFilesystemComponentCreator = EfsFilesystemComponentCreator;
