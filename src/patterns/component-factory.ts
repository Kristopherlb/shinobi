/**
 * Factory Method Pattern Implementation
 * Enables extensible plugin architecture for component creation
 */

export interface ComponentSpec {
  name: string;
  type: string;
  config: Record<string, any>;
  binds?: Array<any>;
  labels?: Record<string, string>;
  overrides?: Record<string, any>;
  policy?: Record<string, any>;
}

export interface ComponentCapabilities {
  [key: string]: {
    [field: string]: any;
  };
}

/**
 * Abstract base class for all platform components
 * Implements the Factory Method pattern's Product interface
 */
export abstract class Component {
  constructor(
    protected spec: ComponentSpec,
    protected context: ComponentContext
  ) {}

  abstract synth(): any;
  abstract getCapabilities(): ComponentCapabilities;
  abstract getType(): string;
}

export interface ComponentContext {
  serviceName: string;
  environment: string;
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
  scope: any; // CDK Construct scope
}

/**
 * Abstract Creator class defining the factory method
 */
export abstract class ComponentCreator {
  /**
   * Factory method - subclasses implement this to create specific components
   */
  abstract createComponent(spec: ComponentSpec, context: ComponentContext): Component;

  /**
   * Template method that uses the factory method
   */
  public processComponent(spec: ComponentSpec, context: ComponentContext): Component {
    const component = this.createComponent(spec, context);
    
    // Common processing logic that applies to all components
    this.validateSpec(spec);
    this.applyCommonPolicies(component, context);
    
    return component;
  }

  protected validateSpec(spec: ComponentSpec): void {
    if (!spec.name || !spec.type) {
      throw new Error(`Invalid component spec: missing name or type`);
    }
  }

  protected applyCommonPolicies(component: Component, context: ComponentContext): void {
    // Apply framework-specific policies, tagging, etc.
    // This is where compliance framework differences are enforced
  }
}

/**
 * Registry of component creators - enables plugin architecture
 */
export class ComponentRegistry {
  private creators = new Map<string, ComponentCreator>();

  register(type: string, creator: ComponentCreator): void {
    this.creators.set(type, creator);
  }

  unregister(type: string): void {
    this.creators.delete(type);
  }

  hasType(type: string): boolean {
    return this.creators.has(type);
  }

  createComponent(spec: ComponentSpec, context: ComponentContext): Component {
    const creator = this.creators.get(spec.type);
    if (!creator) {
      throw new Error(`Unknown component type: ${spec.type}. Available types: ${Array.from(this.creators.keys()).join(', ')}`);
    }

    return creator.processComponent(spec, context);
  }

  getAvailableTypes(): string[] {
    return Array.from(this.creators.keys());
  }
}