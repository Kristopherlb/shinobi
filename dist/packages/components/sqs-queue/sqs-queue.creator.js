"use strict";
/**
 * Creator for SqsQueueNew Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 *
 * @author Platform Team
 * @category messaging
 * @service SQS
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqsQueueNewCreator = void 0;
const sqs_queue_new_component_1 = require("./sqs-queue-new.component");
const sqs_queue_new_builder_1 = require("./sqs-queue-new.builder");
/**
 * Creator class for SqsQueueNew component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class SqsQueueNewCreator {
    /**
     * Component type identifier
     */
    componentType = 'sqs-queue-new';
    /**
     * Component display name
     */
    displayName = 'Sqs Queue New';
    /**
     * Component description
     */
    description = 'SQS message queue with compliance hardening and DLQ support';
    /**
     * Component category for organization
     */
    category = 'messaging';
    /**
     * AWS service this component manages
     */
    awsService = 'SQS';
    /**
     * Component tags for discovery
     */
    tags = [
        'sqs-queue-new',
        'messaging',
        'aws',
        'sqs'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = sqs_queue_new_builder_1.SQS_QUEUE_NEW_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new sqs_queue_new_component_1.SqsQueueNewComponent(scope, spec, context);
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
        // Example:
        // if (config.someProperty && config.someProperty < 1) {
        //   errors.push('someProperty must be greater than 0');
        // }
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
            'messaging:sqs-queue-new',
            'monitoring:sqs-queue-new',
            'messaging:sqs-queue-new',
            'queue:sqs-queue-new',
            'streaming:sqs-queue-new',
            'events:sqs-queue-new'
        ];
    }
    /**
     * Returns the capabilities this component requires from other components
     */
    getRequiredCapabilities() {
        return [
        // TODO: Define required capabilities
        // Example: 'networking:vpc' if this component needs a VPC
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
exports.SqsQueueNewCreator = SqsQueueNewCreator;
