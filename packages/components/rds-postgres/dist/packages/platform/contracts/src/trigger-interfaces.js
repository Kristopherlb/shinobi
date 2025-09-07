"use strict";
/**
 * Trigger System Interfaces
 * Implementation interfaces for the trigger system defined in the Platform Binding & Trigger Specification v1.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriggerValidator = exports.TriggerConfigurationBuilder = exports.ComponentTrigger = exports.TriggerRegistry = exports.TriggerStrategy = void 0;
/**
 * Abstract base class for trigger strategies
 */
class TriggerStrategy {
    generateSecureDescription(context) {
        return `${context.source.getType()}-${context.source.node.id} -> ${context.target.getType()}-${context.target.node.id} (${context.directive.eventType})`;
    }
    validateAccess(access) {
        return ['invoke', 'publish', 'subscribe'].includes(access);
    }
}
exports.TriggerStrategy = TriggerStrategy;
/**
 * Registry for managing trigger strategies
 */
class TriggerRegistry {
    strategies = [];
    register(strategy) {
        this.strategies.push(strategy);
    }
    findStrategy(sourceType, targetType, eventType) {
        return this.strategies.find(strategy => strategy.canHandle(sourceType, targetType, eventType)) || null;
    }
    getSupportedTriggers(sourceType) {
        const supportedTriggers = [];
        for (const strategy of this.strategies) {
            const matrix = strategy.getCompatibilityMatrix();
            supportedTriggers.push(...matrix.filter(entry => entry.sourceType === sourceType));
        }
        return supportedTriggers;
    }
    getAllCompatibilityEntries() {
        const allEntries = [];
        for (const strategy of this.strategies) {
            allEntries.push(...strategy.getCompatibilityMatrix());
        }
        return allEntries;
    }
}
exports.TriggerRegistry = TriggerRegistry;
/**
 * Component trigger executor that uses registered strategies
 */
class ComponentTrigger {
    triggerRegistry;
    constructor(triggerRegistry) {
        this.triggerRegistry = triggerRegistry;
    }
    trigger(context) {
        const strategy = this.triggerRegistry.findStrategy(context.source.getType(), context.target.getType(), context.directive.eventType);
        if (!strategy) {
            const supportedTriggers = this.triggerRegistry.getSupportedTriggers(context.source.getType());
            const suggestion = supportedTriggers.length > 0
                ? `Available triggers: ${supportedTriggers.map(t => `${t.targetType}:${t.eventType}`).join(', ')}`
                : 'No compatible triggers available';
            throw new Error(`No trigger strategy found for ${context.source.getType()} -> ${context.target.getType()} (${context.directive.eventType}). ${suggestion}`);
        }
        return strategy.trigger(context);
    }
}
exports.ComponentTrigger = ComponentTrigger;
/**
 * Trigger configuration builder for complex trigger setups
 */
class TriggerConfigurationBuilder {
    directive = {};
    eventType(eventType) {
        this.directive.eventType = eventType;
        return this;
    }
    target(target) {
        this.directive.target = target;
        return this;
    }
    access(access) {
        this.directive.access = access;
        return this;
    }
    filter(filter) {
        this.directive.filter = filter;
        return this;
    }
    transform(transform) {
        this.directive.transform = transform;
        return this;
    }
    options(options) {
        this.directive.options = options;
        return this;
    }
    metadata(metadata) {
        this.directive.metadata = metadata;
        return this;
    }
    build() {
        if (!this.directive.eventType) {
            throw new Error('Event type is required for trigger directive');
        }
        if (!this.directive.target) {
            throw new Error('Target is required for trigger directive');
        }
        if (!this.directive.access) {
            throw new Error('Access level is required for trigger directive');
        }
        return this.directive;
    }
}
exports.TriggerConfigurationBuilder = TriggerConfigurationBuilder;
/**
 * Trigger validator for runtime validation of trigger configurations
 */
class TriggerValidator {
    static validateTriggerContext(context) {
        const errors = [];
        if (!context.source) {
            errors.push('Source component is required');
        }
        if (!context.target) {
            errors.push('Target component is required');
        }
        if (!context.directive) {
            errors.push('Trigger directive is required');
        }
        if (context.directive && !['invoke', 'publish', 'subscribe'].includes(context.directive.access)) {
            errors.push('Invalid access level for trigger. Must be invoke, publish, or subscribe');
        }
        return { valid: errors.length === 0, errors };
    }
    static validateTriggerResult(result) {
        const errors = [];
        if (!result.triggerConfiguration) {
            errors.push('Trigger configuration is required in result');
        }
        if (result.triggerConfiguration && !result.triggerConfiguration.targetArn) {
            errors.push('Target ARN is required in trigger configuration');
        }
        return { valid: errors.length === 0, errors };
    }
}
exports.TriggerValidator = TriggerValidator;
//# sourceMappingURL=trigger-interfaces.js.map