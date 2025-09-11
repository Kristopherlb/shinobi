"use strict";
/**
 * Creator for DynamoDbTableComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoDbTableComponentCreator = void 0;
const dynamodb_table_component_1 = require("./dynamodb-table.component");
const dynamodb_table_builder_1 = require("./dynamodb-table.builder");
/**
 * Creator class for DynamoDbTableComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class DynamoDbTableComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'dynamodb-table';
    /**
     * Component display name
     */
    displayName = 'Dynamo Db Table Component';
    /**
     * Component description
     */
    description = 'DynamoDB Table Component implementing Component API Contract v1.0';
    /**
     * Component category for organization
     */
    category = 'storage';
    /**
     * AWS service this component manages
     */
    awsService = 'DYNAMODB';
    /**
     * Component tags for discovery
     */
    tags = [
        'dynamodb-table',
        'storage',
        'aws',
        'dynamodb'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = dynamodb_table_builder_1.DYNAMODB_TABLE_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new dynamodb_table_component_1.DynamoDbTableComponentComponent(scope, spec, context);
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
            'storage:dynamodb-table',
            'monitoring:dynamodb-table'
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
exports.DynamoDbTableComponentCreator = DynamoDbTableComponentCreator;
