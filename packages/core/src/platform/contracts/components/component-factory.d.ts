import { IComponent } from '../bindings.js';
import { ComponentConfigBuilder } from './component-config-builder.js';
import { ComponentRegistry } from './component-registry.js';
import { ComponentContext } from './component-context.js';
import { ComponentSpec } from './component-spec.js';
/**
 * Interface for component factory operations
 */
export interface IComponentFactory {
    /**
     * Create a component instance based on type, context, and specification
     */
    create(type: string, context: ComponentContext, spec: ComponentSpec): IComponent;
    /**
     * Check if a component type is supported
     */
    isSupported(type: string): boolean;
    /**
     * Get all supported component types
     */
    getSupportedTypes(): string[];
}
/**
 * Component Factory implementation
 * Handles component instantiation using the registry and config builder
 */
export declare class ComponentFactory implements IComponentFactory {
    private registry;
    private configBuilder;
    constructor(registry: ComponentRegistry, configBuilder: ComponentConfigBuilder);
    /**
     * Create a component instance using the 5-layer configuration precedence
     */
    create(type: string, context: ComponentContext, spec: ComponentSpec): IComponent;
    /**
     * Check if component type is supported by registry
     */
    isSupported(type: string): boolean;
    /**
     * Get all supported component types from registry
     */
    getSupportedTypes(): string[];
    /**
     * Validate component implements IComponent interface
     */
    private isValidComponent;
}
/**
 * Factory for creating ComponentFactory instances
 */
export declare class ComponentFactoryBuilder {
    private registry;
    private configBuilder;
    constructor();
    /**
     * Register a component type with its constructor
     */
    registerComponent(type: string, componentClass: new (config: any, context: ComponentContext) => IComponent): this;
    /**
     * Build the component factory
     */
    build(): ComponentFactory;
}
//# sourceMappingURL=component-factory.d.ts.map