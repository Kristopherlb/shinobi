/**
 * Component Registry
 * Central registry for all platform components including import components
 * Implements the Registry pattern for component discovery and instantiation
 */

import { Construct } from 'constructs';
import { BaseComponent, ComponentContext } from '../base/base-component';
import { Logger } from '../../utils/logger';

// Import component types
import { RdsPostgresImportComponent, RdsPostgresImportConfig, RdsPostgresImportDependencies } from '../import/rds-postgres-import.component';
import { SnsTopicImportComponent, SnsTopicImportConfig, SnsTopicImportDependencies } from '../import/sns-topic-import.component';

export interface ComponentFactoryFunction {
  (scope: Construct, id: string, config: any, dependencies: any): BaseComponent;
}

export interface ComponentRegistryEntry {
  factory: ComponentFactoryFunction;
  configSchema?: any; // JSON Schema for validation
  isImportComponent: boolean;
  description: string;
  supportedCapabilities: string[];
}

export interface ComponentRegistryDependencies {
  logger: Logger;
}

/**
 * Central registry for all platform components
 * Manages component discovery, validation, and instantiation
 */
export class ComponentRegistry {
  private components: Map<string, ComponentRegistryEntry> = new Map();

  constructor(private dependencies: ComponentRegistryDependencies) {
    this.registerBuiltinComponents();
  }

  /**
   * Register a component type in the registry
   */
  register(
    componentType: string, 
    entry: ComponentRegistryEntry
  ): void {
    if (this.components.has(componentType)) {
      throw new Error(`Component type '${componentType}' is already registered`);
    }

    this.components.set(componentType, entry);
    this.dependencies.logger.debug(`Registered component type: ${componentType}`);
  }

  /**
   * Create a component instance by type
   */
  create(
    componentType: string,
    scope: Construct,
    id: string,
    config: any
  ): BaseComponent {
    const entry = this.components.get(componentType);
    if (!entry) {
      throw new Error(`Unknown component type: ${componentType}. Available types: ${Array.from(this.components.keys()).join(', ')}`);
    }

    this.dependencies.logger.debug(`Creating component instance: ${componentType} (${id})`);

    // Create appropriate dependencies based on component type
    const componentDependencies = this.createComponentDependencies(componentType);
    
    try {
      return entry.factory(scope, id, config, componentDependencies);
    } catch (error: any) {
      throw new Error(`Failed to create component '${id}' of type '${componentType}': ${error.message}`);
    }
  }

  /**
   * Get information about a registered component type
   */
  getComponentInfo(componentType: string): ComponentRegistryEntry | undefined {
    return this.components.get(componentType);
  }

  /**
   * List all registered component types
   */
  getAvailableComponents(): string[] {
    return Array.from(this.components.keys());
  }

  /**
   * Get all import components (useful for documentation/discovery)
   */
  getImportComponents(): string[] {
    return Array.from(this.components.entries())
      .filter(([_, entry]) => entry.isImportComponent)
      .map(([type, _]) => type);
  }

  /**
   * Check if a component type is an import component
   */
  isImportComponent(componentType: string): boolean {
    const entry = this.components.get(componentType);
    return entry?.isImportComponent || false;
  }

  /**
   * Register all built-in platform components
   */
  private registerBuiltinComponents(): void {
    this.dependencies.logger.debug('Registering built-in components');

    // Register RDS PostgreSQL Import Component
    this.register('rds-postgres-import', {
      factory: (scope, id, config, deps) => new RdsPostgresImportComponent(scope, id, config as RdsPostgresImportConfig, deps),
      isImportComponent: true,
      description: 'Import an existing RDS PostgreSQL database instance for binding',
      supportedCapabilities: ['db:postgres'],
      configSchema: {
        type: 'object',
        required: ['instanceArn', 'securityGroupId', 'secretArn'],
        properties: {
          instanceArn: {
            type: 'string',
            pattern: '^arn:aws:rds:',
            description: 'ARN of the existing RDS instance'
          },
          securityGroupId: {
            type: 'string',
            pattern: '^sg-',
            description: 'Security group ID of the RDS instance'
          },
          secretArn: {
            type: 'string',
            pattern: '^arn:aws:secretsmanager:',
            description: 'ARN of the secret containing database credentials'
          },
          engine: {
            type: 'string',
            default: 'postgres',
            description: 'Database engine type'
          }
        }
      }
    });

    // Register SNS Topic Import Component
    this.register('sns-topic-import', {
      factory: (scope, id, config, deps) => new SnsTopicImportComponent(scope, id, config as SnsTopicImportConfig, deps),
      isImportComponent: true,
      description: 'Import an existing SNS topic for messaging',
      supportedCapabilities: ['topic:sns'],
      configSchema: {
        type: 'object',
        required: ['topicArn'],
        properties: {
          topicArn: {
            type: 'string',
            pattern: '^arn:aws:sns:',
            description: 'ARN of the existing SNS topic'
          },
          topicName: {
            type: 'string',
            description: 'Optional friendly name for the topic'
          }
        }
      }
    });

    this.dependencies.logger.debug('Built-in components registered successfully');
  }

  /**
   * Create appropriate dependencies for each component type
   */
  private createComponentDependencies(componentType: string): any {
    // All components currently need logger dependency
    const baseDependencies = {
      logger: this.dependencies.logger
    };

    // Component-specific dependency creation could be added here
    switch (componentType) {
      case 'rds-postgres-import':
        return baseDependencies as RdsPostgresImportDependencies;
      
      case 'sns-topic-import':
        return baseDependencies as SnsTopicImportDependencies;
      
      default:
        return baseDependencies;
    }
  }

  /**
   * Validate component configuration against its schema
   */
  validateComponentConfig(componentType: string, config: any): void {
    const entry = this.components.get(componentType);
    if (!entry) {
      throw new Error(`Unknown component type: ${componentType}`);
    }

    if (!entry.configSchema) {
      // No schema validation available for this component
      return;
    }

    // In a full implementation, this would use Ajv or similar for JSON Schema validation
    // For now, we'll do basic validation
    const schema = entry.configSchema;
    if (schema.required) {
      for (const requiredField of schema.required) {
        if (config[requiredField] === undefined) {
          throw new Error(`Missing required field '${requiredField}' in ${componentType} configuration`);
        }
      }
    }
  }
}