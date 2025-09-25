/**
 * Security Group Import Component Creator Factory
 * 
 * Factory class for creating SecurityGroupImportComponent instances.
 * Implements the Platform Component Creator pattern.
 */

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IComponentCreator, IComponent, ComponentContext, ComponentSpec } from '../../@shinobi/core/component-interfaces';
import { SecurityGroupImportComponent } from './security-group-import.component';

/**
 * Factory for creating SecurityGroupImportComponent instances
 */
export class SecurityGroupImportCreator implements IComponentCreator {
  
  /**
   * Create a new SecurityGroupImportComponent instance
   */
  public createComponent(spec: ComponentSpec, context: ComponentContext): IComponent {
    return new SecurityGroupImportComponent(context.scope, spec.name, context, spec);
  }

  /**
   * Process component (alias for createComponent)
   */
  public processComponent(spec: ComponentSpec, context: ComponentContext): IComponent {
    return this.createComponent(spec, context);
  }

  /**
   * Get the component type this creator handles
   */
  public getComponentType(): string {
    return 'security-group-import';
  }

  /**
   * Validate that the component spec is compatible with this creator
   */
  public validateSpec(spec: ComponentSpec): boolean {
    return spec.type === 'security-group-import' && 
           spec.config && 
           typeof spec.config === 'object' &&
           spec.config.securityGroup &&
           typeof spec.config.securityGroup === 'object' &&
           spec.config.securityGroup.ssmParameterName &&
           typeof spec.config.securityGroup.ssmParameterName === 'string';
  }

  public getProvidedCapabilities(): string[] {
    return ['security-group:import'];
  }
}
