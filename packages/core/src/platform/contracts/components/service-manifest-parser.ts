// src/platform/contracts/components/service-manifest-parser.ts
// Service manifest parser for component factory integration

import { ComponentFactory } from './component-factory';
import { ComponentContext } from './component-context';
import { ComponentSpec } from './component-spec';
import { ComponentContextBuilder } from './component-context';
import { ComponentSpecBuilder } from './component-spec';
import { ComplianceFramework } from '../bindings';

/**
 * Service manifest structure
 */
export interface ServiceManifest {
  manifestVersion: string;
  service: {
    name: string;
    owner: string;
    description: string;
    tags?: Record<string, string>;
  };
  environments: Record<string, {
    complianceFramework: ComplianceFramework;
    region: string;
    accountId: string;
    overrides?: Record<string, any>;
  }>;
  components: Array<{
    name: string;
    type: string;
    config: Record<string, any>;
    properties?: Record<string, any>;
    dependencies?: string[];
    metadata?: Record<string, any>;
  }>;
  binds?: Array<{
    from: string;
    to: string;
    capability: string;
    access: string;
  }>;
  governance?: {
    suppressions?: Array<{
      ruleId: string;
      targetRef: string;
      owner: string;
      justification: string;
      expiry: string;
    }>;
  };
}

/**
 * Service manifest parser
 * Parses manifest and creates components using the factory
 */
export class ServiceManifestParser {
  private factory: ComponentFactory;

  constructor(factory: ComponentFactory) {
    this.factory = factory;
  }

  /**
   * Parse service manifest and create components for a specific environment
   */
  parseManifest(manifest: ServiceManifest, environment: string): {
    components: Map<string, any>;
    context: ComponentContext;
    dependencies: Map<string, string[]>;
  } {
    // Validate manifest
    this.validateManifest(manifest);

    // Get environment configuration
    const envConfig = manifest.environments[environment];
    if (!envConfig) {
      throw new Error(`Environment '${environment}' not found in manifest`);
    }

    // Create component context
    const context = new ComponentContextBuilder()
      .serviceName(manifest.service.name)
      .environment(environment)
      .complianceFramework(envConfig.complianceFramework)
      .region(envConfig.region)
      .accountId(envConfig.accountId)
      .tags(manifest.service.tags || {})
      .platformConfig({
        environments: manifest.environments
      })
      .build();

    // Create components
    const components = new Map<string, any>();
    const dependencies = new Map<string, string[]>();

    for (const componentDef of manifest.components) {
      // Create component specification
      const specBuilder = new ComponentSpecBuilder()
        .name(componentDef.name)
        .type(componentDef.type)
        .config(componentDef.config)
        .dependencies(componentDef.dependencies || []);

      if (componentDef.properties) {
        specBuilder.properties(componentDef.properties);
      }

      if (componentDef.metadata) {
        specBuilder.metadata(componentDef.metadata);
      }

      const spec = specBuilder.build();

      // Apply environment overrides if they exist
      if (envConfig.overrides?.components?.[componentDef.name]) {
        spec.config = { ...spec.config, ...envConfig.overrides.components[componentDef.name] };
      }

      // Create component using factory
      const component = this.factory.create(componentDef.type, context, spec);
      components.set(componentDef.name, component);

      // Track dependencies
      if (componentDef.dependencies) {
        dependencies.set(componentDef.name, componentDef.dependencies);
      }
    }

    return {
      components,
      context,
      dependencies
    };
  }

  /**
   * Validate service manifest structure
   */
  private validateManifest(manifest: ServiceManifest): void {
    if (!manifest.manifestVersion) {
      throw new Error('Manifest version is required');
    }

    if (!manifest.service?.name) {
      throw new Error('Service name is required');
    }

    if (!manifest.service?.owner) {
      throw new Error('Service owner is required');
    }

    if (!manifest.service?.description) {
      throw new Error('Service description is required');
    }

    if (!manifest.environments || Object.keys(manifest.environments).length === 0) {
      throw new Error('At least one environment must be defined');
    }

    if (!manifest.components || manifest.components.length === 0) {
      throw new Error('At least one component must be defined');
    }

    // Validate environments
    for (const [envName, envConfig] of Object.entries(manifest.environments)) {
      if (!envConfig.complianceFramework) {
        throw new Error(`Compliance framework is required for environment '${envName}'`);
      }

      if (!envConfig.region) {
        throw new Error(`Region is required for environment '${envName}'`);
      }

      if (!envConfig.accountId) {
        throw new Error(`Account ID is required for environment '${envName}'`);
      }
    }

    // Validate components
    for (const component of manifest.components) {
      if (!component.name) {
        throw new Error('Component name is required');
      }

      if (!component.type) {
        throw new Error('Component type is required');
      }

      if (!this.factory.isSupported(component.type)) {
        throw new Error(`Unsupported component type: ${component.type}`);
      }
    }

    // Validate binds
    if (manifest.binds) {
      for (const bind of manifest.binds) {
        if (!bind.from) {
          throw new Error('Bind source component is required');
        }

        if (!bind.to) {
          throw new Error('Bind target component is required');
        }

        if (!bind.capability) {
          throw new Error('Bind capability is required');
        }

        if (!bind.access) {
          throw new Error('Bind access level is required');
        }
      }
    }
  }

  /**
   * Get component dependency graph
   */
  getDependencyGraph(components: Map<string, any>, dependencies: Map<string, string[]>): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    // Initialize graph with all components
    for (const componentName of components.keys()) {
      graph.set(componentName, []);
    }

    // Add dependencies
    for (const [componentName, deps] of dependencies.entries()) {
      graph.set(componentName, deps);
    }

    return graph;
  }

  /**
   * Validate dependency graph for cycles
   */
  validateDependencyGraph(graph: Map<string, string[]>): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
      if (recursionStack.has(node)) {
        return true; // Cycle detected
      }

      if (visited.has(node)) {
        return false; // Already processed
      }

      visited.add(node);
      recursionStack.add(node);

      const dependencies = graph.get(node) || [];
      for (const dep of dependencies) {
        if (hasCycle(dep)) {
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const componentName of graph.keys()) {
      if (hasCycle(componentName)) {
        throw new Error(`Circular dependency detected involving component: ${componentName}`);
      }
    }
  }
}
