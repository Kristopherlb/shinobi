"use strict";
/**
 * Creator for SnsTopicComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnsTopicComponentCreator = void 0;
const sns_topic_component_1 = require("./sns-topic.component");
const sns_topic_builder_1 = require("./sns-topic.builder");
/**
 * Creator class for SnsTopicComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class SnsTopicComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'sns-topic';
    /**
     * Component display name
     */
    displayName = 'Sns Topic Component';
    /**
     * Component description
     */
    description = 'SNS Topic Component';
    /**
     * Component category for organization
     */
    category = 'messaging';
    /**
     * AWS service this component manages
     */
    awsService = 'SNS';
    /**
     * Component tags for discovery
     */
    tags = [
        'sns-topic',
        'messaging',
        'aws',
        'sns'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = sns_topic_builder_1.SNS_TOPIC_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new sns_topic_component_1.SnsTopicComponentComponent(scope, spec, context);
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
            'messaging:sns-topic',
            'monitoring:sns-topic'
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
exports.SnsTopicComponentCreator = SnsTopicComponentCreator;
