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
  protected readonly constructs: Map<string, any> = new Map();
  protected capabilities: ComponentCapabilities = {};
  private synthesized: boolean = false;

  constructor(
    protected spec: ComponentSpec,
    protected context: ComponentContext
  ) {}

  abstract synth(): void;
  abstract getCapabilities(): ComponentCapabilities;
  abstract getType(): string;

  /**
   * Protected helper to set capabilities with type safety
   */
  protected setCapabilities(capabilities: ComponentCapabilities): void {
    this.capabilities = capabilities;
    this.synthesized = true;
  }

  /**
   * Ensure synth() has been called before accessing capabilities
   */
  protected ensureSynthesized(): void {
    if (!this.synthesized) {
      throw new Error(`Component '${this.spec.name}' must be synthesized before accessing capabilities. Call synth() first.`);
    }
  }

  /**
   * Get a specific CDK construct by handle
   */
  public getConstruct(handle: string): any | undefined {
    return this.constructs.get(handle);
  }

  /**
   * Get all registered constructs
   */
  public getAllConstructs(): Map<string, any> {
    return new Map(this.constructs);
  }

  /**
   * Check if a construct handle exists
   */
  public hasConstruct(handle: string): boolean {
    return this.constructs.has(handle);
  }
}

export interface ComponentContext {
  serviceName: string;
  environment: string;
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
  scope: any; // CDK Construct scope
  vpc?: any; // VPC construct for components that need it
  region?: string;
  accountId?: string;
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