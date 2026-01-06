/**
 * RDS Postgres Creator - Factory Method implementation
 * Implements Template Method pattern for enterprise governance
 */

import { Construct } from 'constructs';
import { 
  ComponentSpec, 
  ComponentContext, 
  IComponent, 
  IComponentCreator 
} from '@shinobi/core';
import { RdsPostgresComponent } from './rds-postgres.component.js';

/**
 * Creator for RDS Postgres components with Template Method governance
 */
export class RdsPostgresCreator implements IComponentCreator {
  public readonly componentType = 'rds-postgres';

  /**
   * Factory Method - creates the specific component
   */
  createComponent(spec: ComponentSpec, context: ComponentContext): IComponent {
    const scope = context.scope as Construct | undefined;
    if (!scope) {
      throw new Error('ComponentContext.scope is required to create rds-postgres components');
    }
    return new RdsPostgresComponent(scope, spec.name, context, spec);
  }

  /**
   * Template Method - fixed algorithm with governance steps
   */
  processComponent(spec: ComponentSpec, context: ComponentContext): IComponent {
    const component = this.createComponent(spec, context);
    
    // Fixed steps that cannot be overridden by subclasses
    this.validateSpec(spec);
    this.applyCommonPolicies(component, context);
    
    return component;
  }

  /**
   * Validation step - part of Template Method
   */
  protected validateSpec(spec: ComponentSpec): void {
    if (!spec.name || !spec.type) {
      throw new Error(`Invalid RDS Postgres spec: missing name or type`);
    }

    const dbName = spec.config?.dbName;
    if (dbName && !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(dbName)) {
      throw new Error(`Invalid database name '${dbName}': must start with a letter and contain only alphanumeric characters and underscores`);
    }
  }

  /**
   * Policy application step - part of Template Method
   */
  protected applyCommonPolicies(component: IComponent, context: ComponentContext): void {
    // Apply mandatory tagging
    this.applyMandatoryTags(component, context);
    
    // Apply environment-specific policies
    this.applyEnvironmentPolicies(component, context);
  }

  private applyMandatoryTags(component: IComponent, context: ComponentContext): void {
    // Mandatory tags are applied at the CDK construct level during synthesis
    // This ensures every RDS instance gets consistent tagging
  }
  private applyEnvironmentPolicies(component: IComponent, context: ComponentContext): void {
    // Environment-specific policies like:
    // - Production deletion protection
    // - Development cost optimization
    // - Staging performance configuration
  }

  public getProvidedCapabilities(): string[] {
    return ['db:postgres'];
  }
}
