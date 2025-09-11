"use strict";
/**
 * Creator for KinesisStreamComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KinesisStreamComponentCreator = void 0;
const kinesis_stream_component_1 = require("./kinesis-stream.component");
const kinesis_stream_builder_1 = require("./kinesis-stream.builder");
/**
 * Creator class for KinesisStreamComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class KinesisStreamComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'kinesis-stream';
    /**
     * Component display name
     */
    displayName = 'Kinesis Stream Component';
    /**
     * Component description
     */
    description = 'Kinesis Stream Component implementing Component API Contract v1.0';
    /**
     * Component category for organization
     */
    category = 'messaging';
    /**
     * AWS service this component manages
     */
    awsService = 'KINESIS';
    /**
     * Component tags for discovery
     */
    tags = [
        'kinesis-stream',
        'messaging',
        'aws',
        'kinesis'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = kinesis_stream_builder_1.KINESIS_STREAM_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new kinesis_stream_component_1.KinesisStreamComponentComponent(scope, spec, context);
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
            'messaging:kinesis-stream',
            'monitoring:kinesis-stream'
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
exports.KinesisStreamComponentCreator = KinesisStreamComponentCreator;
