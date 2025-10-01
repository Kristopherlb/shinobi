import { IComponent } from '../bindings.js';
import { ComponentContext } from './component-context.js';
/**
 * Component constructor type
 */
export type ComponentConstructor = new (config: any, context: ComponentContext) => IComponent;
/**
 * Interface for component registry operations
 */
export interface IComponentRegistry {
    /**
     * Register a component type with its constructor
     */
    register(type: string, componentClass: ComponentConstructor): void;
    /**
     * Get component constructor by type
     */
    getComponentClass(type: string): ComponentConstructor | undefined;
    /**
     * Check if component type is registered
     */
    hasComponent(type: string): boolean;
    /**
     * Get all registered component types
     */
    getRegisteredTypes(): string[];
    /**
     * Unregister a component type
     */
    unregister(type: string): boolean;
    /**
     * Clear all registered components
     */
    clear(): void;
}
/**
 * Component Registry implementation
 * Maps component types to their constructors
 */
export declare class ComponentRegistry implements IComponentRegistry {
    private components;
    /**
     * Register a component type with its constructor
     */
    register(type: string, componentClass: ComponentConstructor): void;
    /**
     * Get component constructor by type
     */
    getComponentClass(type: string): ComponentConstructor | undefined;
    /**
     * Check if component type is registered
     */
    hasComponent(type: string): boolean;
    /**
     * Get all registered component types
     */
    getRegisteredTypes(): string[];
    /**
     * Unregister a component type
     */
    unregister(type: string): boolean;
    /**
     * Clear all registered components
     */
    clear(): void;
    /**
     * Validate component class has required methods
     */
    private validateComponentClass;
}
/**
 * Default component registry with common AWS components
 */
export declare class DefaultComponentRegistry extends ComponentRegistry {
    constructor();
    /**
     * Register default AWS components
     */
    private registerDefaultComponents;
}
//# sourceMappingURL=component-registry.d.ts.map