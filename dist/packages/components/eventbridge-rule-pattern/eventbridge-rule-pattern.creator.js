"use strict";
/**
 * Creator for EventBridgeRulePatternComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBridgeRulePatternComponentCreator = void 0;
const eventbridge_rule_pattern_component_1 = require("./eventbridge-rule-pattern.component");
const eventbridge_rule_pattern_builder_1 = require("./eventbridge-rule-pattern.builder");
/**
 * Creator class for EventBridgeRulePatternComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class EventBridgeRulePatternComponentCreator {
    /**
     * Component type identifier
     */
    componentType = 'eventbridge-rule-pattern';
    /**
     * Component display name
     */
    displayName = 'Event Bridge Rule Pattern Component';
    /**
     * Component description
     */
    description = 'EventBridge Rule Pattern Component implementing Component API Contract v1.0';
    /**
     * Component category for organization
     */
    category = 'events';
    /**
     * AWS service this component manages
     */
    awsService = 'EVENTS';
    /**
     * Component tags for discovery
     */
    tags = [
        'eventbridge-rule-pattern',
        'events',
        'aws',
        'events'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = eventbridge_rule_pattern_builder_1.EVENTBRIDGE_RULE_PATTERN_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new eventbridge_rule_pattern_component_1.EventBridgeRulePatternComponentComponent(scope, spec, context);
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
            'events:eventbridge-rule-pattern',
            'monitoring:eventbridge-rule-pattern'
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
exports.EventBridgeRulePatternComponentCreator = EventBridgeRulePatternComponentCreator;
