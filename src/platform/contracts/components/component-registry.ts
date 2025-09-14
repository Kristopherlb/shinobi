// src/platform/contracts/components/component-registry.ts
// Component Registry for managing component type mappings

import { IComponent } from '../bindings';
import { ComponentContext } from './component-context';

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
export class ComponentRegistry implements IComponentRegistry {
  private components: Map<string, ComponentConstructor> = new Map();

  /**
   * Register a component type with its constructor
   */
  register(type: string, componentClass: ComponentConstructor): void {
    if (!type || typeof type !== 'string') {
      throw new Error('Component type must be a non-empty string');
    }

    if (!componentClass || typeof componentClass !== 'function') {
      throw new Error('Component class must be a constructor function');
    }

    // Validate component class has required methods
    this.validateComponentClass(componentClass);

    this.components.set(type, componentClass);
  }

  /**
   * Get component constructor by type
   */
  getComponentClass(type: string): ComponentConstructor | undefined {
    return this.components.get(type);
  }

  /**
   * Check if component type is registered
   */
  hasComponent(type: string): boolean {
    return this.components.has(type);
  }

  /**
   * Get all registered component types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.components.keys());
  }

  /**
   * Unregister a component type
   */
  unregister(type: string): boolean {
    return this.components.delete(type);
  }

  /**
   * Clear all registered components
   */
  clear(): void {
    this.components.clear();
  }

  /**
   * Validate component class has required methods
   */
  private validateComponentClass(componentClass: ComponentConstructor): void {
    const prototype = componentClass.prototype;

    // Check for required methods
    const requiredMethods = ['getName', 'getId', 'getType', 'getCapabilityData', 'getServiceName', 'synth'];

    for (const method of requiredMethods) {
      if (typeof prototype[method] !== 'function') {
        throw new Error(`Component class must implement ${method} method`);
      }
    }
  }
}

/**
 * Default component registry with common AWS components
 */
export class DefaultComponentRegistry extends ComponentRegistry {
  constructor() {
    super();
    this.registerDefaultComponents();
  }

  /**
   * Register default AWS components
   */
  private registerDefaultComponents(): void {
    // This will be populated with actual component classes
    // when they are implemented in packages/components/

    // Example registrations (commented out until components exist):
    // this.register('s3-bucket', S3BucketComponent);
    // this.register('lambda-api', LambdaApiComponent);
    // this.register('rds-postgres', RdsPostgresComponent);
    // this.register('ecs-cluster', EcsClusterComponent);
    // this.register('ecr-repository', EcrRepositoryComponent);
  }
}
