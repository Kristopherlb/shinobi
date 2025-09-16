// src/platform/contracts/components/component-spec.ts
// Component specification for factory instantiation

/**
 * Component specification containing configuration and metadata
 */
export interface ComponentSpec {
  /**
   * Component name from manifest
   */
  name: string;

  /**
   * Component type from manifest
   */
  type: string;

  /**
   * Component configuration from manifest
   */
  config: Record<string, any>;

  /**
   * Component-specific properties
   */
  properties?: Record<string, any>;

  /**
   * Dependencies on other components
   */
  dependencies?: string[];

  /**
   * Component-specific metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Builder for creating ComponentSpec instances
 */
export class ComponentSpecBuilder {
  private spec: Partial<ComponentSpec> = {};

  /**
   * Set component name
   */
  name(name: string): this {
    this.spec.name = name;
    return this;
  }

  /**
   * Set component type
   */
  type(type: string): this {
    this.spec.type = type;
    return this;
  }

  /**
   * Set component configuration
   */
  config(config: Record<string, any>): this {
    this.spec.config = config;
    return this;
  }

  /**
   * Set component properties
   */
  properties(properties: Record<string, any>): this {
    this.spec.properties = properties;
    return this;
  }

  /**
   * Set component dependencies
   */
  dependencies(dependencies: string[]): this {
    this.spec.dependencies = dependencies;
    return this;
  }

  /**
   * Set component metadata
   */
  metadata(metadata: Record<string, any>): this {
    this.spec.metadata = metadata;
    return this;
  }

  /**
   * Build the component specification
   */
  build(): ComponentSpec {
    // Validate required fields
    if (!this.spec.name) {
      throw new Error('Component name is required');
    }
    if (!this.spec.type) {
      throw new Error('Component type is required');
    }
    if (!this.spec.config) {
      this.spec.config = {};
    }

    return this.spec as ComponentSpec;
  }
}
