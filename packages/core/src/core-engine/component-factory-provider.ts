/**
 * Abstract Factory Provider for Component Factories
 * Enables compliance-aware component creation
 */

import {
  IComponentFactory,
  IComponentRegistry,
  ComponentSpec,
  ComponentContext,
  IComponent,
  IComponentCreator
} from '../platform/contracts';

/**
 * Abstract Factory Provider - creates the appropriate factory for compliance framework
 */
export class ComponentFactoryProvider {
  static createFactory(complianceFramework: string): IComponentFactory {
    switch (complianceFramework) {
      case 'commercial':
        return new CommercialComponentFactory();
      case 'fedramp-moderate':
        return new FedRAMPModerateComponentFactory();
      case 'fedramp-high':
        return new FedRAMPHighComponentFactory();
      default:
        throw new Error(`Unsupported compliance framework: ${complianceFramework}`);
    }
  }
}

/**
 * Base component registry with plugin-based component discovery
 */
export class ComponentRegistry implements IComponentRegistry {
  private creators: Map<string, IComponentCreator> = new Map();

  constructor(private complianceFramework: string) { }

  register(type: string, creator: IComponentCreator): void {
    this.creators.set(type, creator);
  }

  createComponent(spec: ComponentSpec, context: ComponentContext): IComponent {
    const creator = this.creators.get(spec.type);
    if (!creator) {
      const availableTypes = Array.from(this.creators.keys());
      throw new Error(
        `No creator registered for component type '${spec.type}'. Available types: ${availableTypes.join(', ')}`
      );
    }

    return creator.processComponent(spec, context);
  }

  getSupportedTypes(): string[] {
    return Array.from(this.creators.keys());
  }

  /**
   * Auto-discover and register component packages
   * This would scan for @platform/* component packages and register them
   */
  async discoverAndRegisterComponents(): Promise<void> {
    // In a real implementation, this would:
    // 1. Scan node_modules for @platform/component-* packages
    // 2. Load each package and register its component creators
    // 3. Handle version compatibility checking

    // For now, this is a placeholder that component packages would extend
    console.log(`Discovering component packages for ${this.complianceFramework} compliance...`);
  }
}

/**
 * Commercial compliance factory
 */
class CommercialComponentFactory implements IComponentFactory {
  createRegistry(): IComponentRegistry {
    const registry = new ComponentRegistry('commercial');

    // Component packages would register themselves here
    // registry.register('lambda-api', new LambdaApiCreator());
    // registry.register('rds-postgres', new RdsPostgresCreator());
    // registry.register('sqs-queue', new SqsQueueCreator());

    return registry;
  }

  getSupportedComponents(): string[] {
    return ['lambda-api', 'lambda-worker', 'rds-postgres', 'sqs-queue', 's3-bucket'];
  }

  getComplianceFramework(): string {
    return 'commercial';
  }
}

/**
 * FedRAMP Moderate compliance factory
 */
class FedRAMPModerateComponentFactory implements IComponentFactory {
  createRegistry(): IComponentRegistry {
    const registry = new ComponentRegistry('fedramp-moderate');

    // FedRAMP Moderate versions of components with additional compliance logic
    // registry.register('lambda-api', new FedRAMPLambdaApiCreator());
    // registry.register('rds-postgres', new FedRAMPRdsPostgresCreator());

    return registry;
  }

  getSupportedComponents(): string[] {
    return ['lambda-api', 'lambda-worker', 'rds-postgres', 'sqs-queue'];
  }

  getComplianceFramework(): string {
    return 'fedramp-moderate';
  }
}

/**
 * FedRAMP High compliance factory
 */
class FedRAMPHighComponentFactory implements IComponentFactory {
  createRegistry(): IComponentRegistry {
    const registry = new ComponentRegistry('fedramp-high');

    // FedRAMP High versions with strictest compliance requirements
    // registry.register('lambda-api', new FedRAMPHighLambdaApiCreator());
    // registry.register('rds-postgres', new FedRAMPHighRdsPostgresCreator());

    return registry;
  }

  getSupportedComponents(): string[] {
    return ['lambda-api', 'lambda-worker', 'rds-postgres']; // Restricted set for FedRAMP High
  }

  getComplianceFramework(): string {
    return 'fedramp-high';
  }
}