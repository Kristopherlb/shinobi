"use strict";
/**
 * Creator for S3BucketComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3BucketComponentCreator = void 0;
const s3_bucket_component_1 = require("./s3-bucket.component");
const s3_bucket_builder_1 = require("./s3-bucket.builder");
/**
 * Creator class for S3BucketComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class S3BucketComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 's3-bucket';
    /**
     * Component display name
     */
    displayName = 'S3 Bucket Component';
    /**
     * Component description
     */
    description = 'S3 Bucket Component';
    /**
     * Component category for organization
     */
    category = 'storage';
    /**
     * Component tags for discovery
     */
    tags = [
        's3-bucket',
        'storage',
        'aws'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = s3_bucket_builder_1.S3_BUCKET_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new s3_bucket_component_1.S3BucketComponentComponent(scope, spec, context);
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
        // Add component-specific validations here
        // Environment-specific validations
        if (context.environment === 'prod') {
            if (!config?.monitoring?.enabled) {
                errors.push('Monitoring must be enabled in production environment');
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
            'storage:s3-bucket',
            'monitoring:s3-bucket'
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
            'main'
        ];
    }
}
exports.S3BucketComponentCreator = S3BucketComponentCreator;
