"use strict";
/**
 * Strategy Pattern Implementation for Component Binding
 * Handles different binding types between components cleanly
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentBinder = exports.BinderRegistry = exports.BinderStrategy = void 0;
/**
 * Strategy interface for different binding types
 */
class BinderStrategy {
    generateSecureDescription(context) {
        return `${context.source.getType()}-${context.source.getName()} -> ${context.target.getType()}-${context.target.getName()}`;
    }
}
exports.BinderStrategy = BinderStrategy;
/**
 * Registry for managing binder strategies
 */
class BinderRegistry {
    strategies = [];
    register(strategy) {
        this.strategies.push(strategy);
    }
    findStrategy(sourceType, targetCapability) {
        return this.strategies.find(strategy => strategy.canHandle(sourceType, targetCapability)) || null;
    }
    getCompatibleTargets(sourceType) {
        const compatibleTargets = [];
        // This would be populated based on registered strategies
        // For now, return empty array as concrete strategies will be in component packages
        return compatibleTargets;
    }
}
exports.BinderRegistry = BinderRegistry;
/**
 * Component binder that uses registered strategies
 */
class ComponentBinder {
    binderRegistry;
    constructor(binderRegistry) {
        this.binderRegistry = binderRegistry;
    }
    bind(context) {
        const targetCapabilities = Object.keys(context.target.getCapabilities());
        const primaryCapability = targetCapabilities[0];
        if (!primaryCapability) {
            throw new Error(`Target component ${context.target.getName()} has no capabilities`);
        }
        const strategy = this.binderRegistry.findStrategy(context.source.getType(), primaryCapability);
        if (!strategy) {
            const compatibleTargets = this.binderRegistry.getCompatibleTargets(context.source.getType());
            const suggestion = compatibleTargets.length > 0
                ? `Available bindings: ${compatibleTargets.map(t => t.capability).join(', ')}`
                : 'No compatible bindings available';
            throw new Error(`No binding strategy found for ${context.source.getType()} -> ${primaryCapability}. ${suggestion}`);
        }
        return strategy.bind(context);
    }
}
exports.ComponentBinder = ComponentBinder;
