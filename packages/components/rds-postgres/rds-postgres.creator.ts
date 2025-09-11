/**
 * RDS Postgres Creator - Factory Method implementation
 * Implements Template Method pattern for enterprise governance
 */

import { 
  ComponentSpec, 
  ComponentContext, 
  IComponent, 
  IComponentCreator 
} from '@platform/contracts';
import { RdsPostgresComponent } from './rds-postgres.component';

/**
 * Creator for RDS Postgres components with Template Method governance
 */
export class RdsPostgresCreator implements IComponentCreator {
  /**
   * Factory Method - creates the specific component
   */
  createComponent(spec: ComponentSpec, context: ComponentContext): IComponent {
    return new RdsPostgresComponent(spec, context);
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

    if (!spec.config.dbName) {
      throw new Error(`Invalid RDS Postgres spec: missing required config.dbName`);
    }

    // Validate database name format
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(spec.config.dbName)) {
      throw new Error(`Invalid database name '${spec.config.dbName}': must start with letter and contain only alphanumeric characters and underscores`);
    }

    // FedRAMP-specific validations
    if (spec.policy?.complianceFramework?.startsWith('fedramp')) {
      if (!spec.config.encrypted) {
        throw new Error('FedRAMP compliance requires database encryption to be enabled');
      }
      
      if (spec.config.backupRetention && spec.config.backupRetention < 30) {
        throw new Error('FedRAMP compliance requires minimum 30 days backup retention');
      }
    }
  }

  /**
   * Policy application step - part of Template Method
   */
  protected applyCommonPolicies(component: IComponent, context: ComponentContext): void {
    // Apply mandatory tagging
    this.applyMandatoryTags(component, context);
    
    // Apply compliance-specific policies
    if (context.complianceFramework.startsWith('fedramp')) {
      this.applyFedRAMPPolicies(component, context);
    }
    
    // Apply environment-specific policies
    this.applyEnvironmentPolicies(component, context);
  }

  private applyMandatoryTags(component: IComponent, context: ComponentContext): void {
    // Mandatory tags are applied at the CDK construct level during synthesis
    // This ensures every RDS instance gets consistent tagging
  }

  private applyFedRAMPPolicies(component: IComponent, context: ComponentContext): void {
    // FedRAMP-specific policies like:
    // - Mandatory encryption
    // - Enhanced monitoring
    // - Backup retention requirements
    // - Network isolation requirements
  }

  private applyEnvironmentPolicies(component: IComponent, context: ComponentContext): void {
    // Environment-specific policies like:
    // - Production deletion protection
    // - Development cost optimization
    // - Staging performance configuration
  }
}