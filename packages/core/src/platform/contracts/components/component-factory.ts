// src/platform/contracts/components/component-factory.ts
// Component Factory & Registry Structure for Shinobi Platform

import { IComponent } from '../bindings.ts';
import { ComponentConfigBuilder } from './component-config-builder.ts';
import { ComponentRegistry } from './component-registry.ts';
import { ComponentContext } from './component-context.ts';
import { ComponentSpec } from './component-spec.ts';

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
export class ComponentFactory implements IComponentFactory {
  private registry: ComponentRegistry;
  private configBuilder: ComponentConfigBuilder;

  constructor(registry: ComponentRegistry, configBuilder: ComponentConfigBuilder) {
    this.registry = registry;
    this.configBuilder = configBuilder;
  }

  /**
   * Create a component instance using the 5-layer configuration precedence
   */
  create(type: string, context: ComponentContext, spec: ComponentSpec): IComponent {
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
  isSupported(type: string): boolean {
    return this.registry.hasComponent(type);
  }

  /**
   * Get all supported component types from registry
   */
  getSupportedTypes(): string[] {
    return this.registry.getRegisteredTypes();
  }

  /**
   * Validate component implements IComponent interface
   */
  private isValidComponent(component: any): component is IComponent {
    if (!component) return false;

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
    } catch (error) {
      return false;
    }

    return true;
  }
}

/**
 * Factory for creating ComponentFactory instances
 */
export class ComponentFactoryBuilder {
  private registry: ComponentRegistry;
  private configBuilder: ComponentConfigBuilder;

  constructor() {
    this.registry = new ComponentRegistry();
    this.configBuilder = new ComponentConfigBuilder();
  }

  /**
   * Register a component type with its constructor
   */
  registerComponent(type: string, componentClass: new (config: any, context: ComponentContext) => IComponent): this {
    this.registry.register(type, componentClass);
    return this;
  }

  /**
   * Build the component factory
   */
  build(): ComponentFactory {
    return new ComponentFactory(this.registry, this.configBuilder);
  }
}
