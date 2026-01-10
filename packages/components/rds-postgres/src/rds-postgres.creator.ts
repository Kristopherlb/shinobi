/**
 * Creator for RDS Postgres Component
 * 
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */

import { Construct } from 'constructs';
import { 
  ComponentSpec, 
  ComponentContext, 
  IComponentCreator 
} from '@shinobi/core';
import { RdsPostgresComponent } from './rds-postgres.component.js';
import { RdsPostgresConfig, RDS_POSTGRES_CONFIG_SCHEMA } from './rds-postgres.builder.js';

/**
 * Creator class for RDS Postgres component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class RdsPostgresCreator implements IComponentCreator {
  /**
   * Component type identifier
   */
  public readonly componentType = 'rds-postgres';
  
  /**
   * Component display name
   */
  public readonly displayName = 'RDS PostgreSQL Component';
  
  /**
   * Component description
   */
  public readonly description = 'Managed PostgreSQL relational database with compliance-driven defaults and comprehensive controls.';
  
  /**
   * Component category for organization
   */
  public readonly category = 'database';
  
  /**
   * AWS service this component manages
   */
  public readonly awsService = 'RDS';
  
  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'rds',
    'postgres',
    'postgresql',
    'database',
    'aws',
    'rds-postgres'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = RDS_POSTGRES_CONFIG_SCHEMA;

  /**
   * Factory method to create component instances
   */
  public createComponent(
    spec: ComponentSpec, 
    context: ComponentContext
  ): RdsPostgresComponent {
    return new RdsPostgresComponent(context.scope, spec.name, context, spec);
  }

  /**
   * Process component (same as create for this component)
   */
  public processComponent(
    spec: ComponentSpec,
    context: ComponentContext
  ): RdsPostgresComponent {
    return this.createComponent(spec, context);
  }

  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec, 
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as Partial<RdsPostgresConfig> | undefined;

    if (!spec.name || !/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, or underscores.');
    }

    const dbName = config?.dbName;
    if (dbName && !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(dbName)) {
      errors.push(`Invalid database name '${dbName}': must start with a letter and contain only alphanumeric characters and underscores`);
    }

    // Validate networking configuration
    if (config?.networking?.vpcId && !config.networking.availabilityZones?.length) {
      // Availability zones are optional but recommended when using explicit VPC ID
      // We'll use defaults if not provided, so this is just a warning, not an error
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get capabilities this component provides
   */
  public getProvidedCapabilities(): string[] {
    return ['db:postgres'];
  }
}
