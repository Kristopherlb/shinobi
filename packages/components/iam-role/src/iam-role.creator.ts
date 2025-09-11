/**
 * IAM Role Component Creator Factory
 * 
 * Factory class for creating IamRoleComponent instances.
 * Implements the Platform Component Creator pattern.
 */

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IComponentCreator, IComponent, ComponentContext, ComponentSpec } from '../../../../src/platform/contracts/component-interfaces';
import { IamRoleComponent } from './iam-role.component';

/**
 * Factory for creating IamRoleComponent instances
 */
export class IamRoleCreator implements IComponentCreator {
  
  /**
   * Create a new IamRoleComponent instance
   */
  public createComponent(spec: ComponentSpec, context: ComponentContext): IComponent {
    return new IamRoleComponent(context.scope, spec.name, context, spec);
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
    return 'iam-role';
  }

  /**
   * Validate that the component spec is compatible with this creator
   */
  public validateSpec(spec: ComponentSpec): boolean {
    return spec.type === 'iam-role' && 
           spec.config && 
           typeof spec.config === 'object' &&
           spec.config.role &&
           typeof spec.config.role === 'object';
  }
}
