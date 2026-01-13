// src/platform/contracts/components/component-factory.ts
// Component Factory & Registry Structure for Shinobi Platform
import { ComponentConfigBuilder } from './component-config-builder.js';
import { ComponentRegistry } from './component-registry.js';
/**
 * Component Factory implementation
 * Handles component instantiation using the registry and config builder
 */
export class ComponentFactory {
    registry;
    configBuilder;
    constructor(registry, configBuilder) {
        this.registry = registry;
        this.configBuilder = configBuilder;
    }
    /**
     * Create a component instance using the 5-layer configuration precedence
     */
    create(type, context, spec) {
        // Validate component type is supported
        if (!this.isSupported(type)) {
            throw new Error(`Unsupported component type: ${type}`);
        }
        // Get component constructor from registry
        const ComponentClass = this.registry.getComponentClass(type);
        if (!ComponentClass) {
            throw new Error(`Component class not found for type: ${type}`);
        }
        // Build configuration using 5-layer precedence chain
        const config = this.configBuilder.buildConfig(type, context, spec);
        // Create component instance with built configuration
        const component = new ComponentClass(config, context);
        // Validate component implements required interface
        if (!this.isValidComponent(component)) {
            throw new Error(`Component ${type} does not implement IComponent interface`);
        }
        return component;
    }
    /**
     * Check if component type is supported by registry
     */
    isSupported(type) {
        return this.registry.hasComponent(type);
    }
    /**
     * Get all supported component types from registry
     */
    getSupportedTypes() {
        return this.registry.getRegisteredTypes();
    }
    /**
     * Validate component implements IComponent interface
     */
    isValidComponent(component) {
        if (!component)
            return false;
        // Check all required methods exist
        const requiredMethods = ['getName', 'getId', 'getType', 'getCapabilityData', 'getServiceName', 'synth'];
        for (const method of requiredMethods) {
            if (typeof component[method] !== 'function') {
                return false;
            }
        }
        // Check that getCapabilityData returns a valid CapabilityData object
        try {
            const capabilityData = component.getCapabilityData();
            if (!capabilityData || typeof capabilityData !== 'object') {
                return false;
            }
            // Basic validation that it has required properties
            if (!capabilityData.type || !capabilityData.resources) {
                return false;
            }
        }
        catch (error) {
            return false;
        }
        return true;
    }
}
/**
 * Factory for creating ComponentFactory instances
 */
export class ComponentFactoryBuilder {
    registry;
    configBuilder;
    constructor() {
        this.registry = new ComponentRegistry();
        this.configBuilder = new ComponentConfigBuilder();
    }
    /**
     * Register a component type with its constructor
     */
    registerComponent(type, componentClass) {
        this.registry.register(type, componentClass);
        return this;
    }
    /**
     * Build the component factory
     */
    build() {
        return new ComponentFactory(this.registry, this.configBuilder);
    }
}
//# sourceMappingURL=component-factory.js.map