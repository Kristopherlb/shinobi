"use strict";
/**
 * Creator for McpServerComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpServerComponentCreator = void 0;
const mcp_server_component_1 = require("./mcp-server.component");
const mcp_server_builder_1 = require("./mcp-server.builder");
/**
 * Creator class for McpServerComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class McpServerComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'mcp-server';
    /**
     * Component display name
     */
    displayName = 'Mcp Server Component';
    /**
     * Component description
     */
    description = 'MCP Server Component';
    /**
     * Component category for organization
     */
    category = 'integration';
    /**
     * AWS service this component manages
     */
    awsService = 'ECS';
    /**
     * Component tags for discovery
     */
    tags = [
        'mcp-server',
        'integration',
        'aws',
        'ecs'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = mcp_server_builder_1.MCP_SERVER_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new mcp_server_component_1.McpServerComponentComponent(scope, spec, context);
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
            'integration:mcp-server',
            'monitoring:mcp-server'
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
exports.McpServerComponentCreator = McpServerComponentCreator;
