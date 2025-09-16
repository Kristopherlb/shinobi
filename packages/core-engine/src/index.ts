import { ComponentSpec, ComponentConfig, ComponentBinding } from '@platform/contracts';

export class ComponentRegistry {
  private components: ComponentSpec[] = [];

  register(component: ComponentSpec) {
    this.components.push(component);
    // Placeholder: add component to registry
  }

  getComponents(): ComponentSpec[] {
    return [...this.components];
  }

  findComponent(name: string): ComponentSpec | undefined {
    return this.components.find(comp => comp.name === name);
  }
}

export class ManifestResolver {
  private registry: ComponentRegistry;

  constructor(registry: ComponentRegistry) {
    this.registry = registry;
  }

  resolveManifest(manifest: any): any {
    // Placeholder: resolve manifest using registered components
    return manifest;
  }
}

export class ComponentValidator {
  validate(component: ComponentSpec, config: ComponentConfig): boolean {
    // Placeholder: validate component configuration
    return true;
  }
}

export class BinderRegistry {
  private bindings: ComponentBinding[] = [];

  addBinding(binding: ComponentBinding) {
    this.bindings.push(binding);
  }

  getBindings(): ComponentBinding[] {
    return [...this.bindings];
  }
}

export class ConfigBuilder<T> {
  protected context: ComponentContext;
  protected spec: ComponentSpec;

  constructor(context: ComponentContext, spec: ComponentSpec) {
    this.context = context;
    this.spec = spec;
  }

  buildSync(): T {
    // Default implementation - should be overridden by subclasses
    throw new Error('buildSync method must be implemented by subclass');
  }

  getComplianceFrameworkDefaults(framework: string): Partial<T> {
    // Default implementation - should be overridden by subclasses
    return {};
  }
}

// Re-export ComponentContext and ComponentSpec from contracts for convenience
export { ComponentContext, ComponentSpec } from '@platform/contracts';
