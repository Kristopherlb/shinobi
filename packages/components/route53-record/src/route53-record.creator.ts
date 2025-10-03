/**
 * Route 53 Record Component Creator Factory
 * 
 * Factory class for creating Route53RecordComponent instances.
 * Implements the Platform Component Creator pattern.
 */

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IComponentCreator, IComponent, ComponentContext, ComponentSpec } from '../../@shinobi/core/component-interfaces.js';
import { Route53RecordComponent } from './route53-record.component.js';

/**
 * Factory for creating Route53RecordComponent instances
 */
export class Route53RecordCreator implements IComponentCreator {
  
  /**
   * Create a new Route53RecordComponent instance
   */
  public createComponent(spec: ComponentSpec, context: ComponentContext): IComponent {
    return new Route53RecordComponent(context.scope, spec.name, context, spec);
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
    return 'route53-record';
  }

  /**
   * Validate that the component spec is compatible with this creator
   */
  public validateSpec(spec: ComponentSpec): boolean {
    return spec.type === 'route53-record' && 
           spec.config && 
           typeof spec.config === 'object' &&
           spec.config.record &&
           typeof spec.config.record === 'object' &&
           spec.config.record.recordName &&
           typeof spec.config.record.recordName === 'string' &&
           spec.config.record.recordType &&
           typeof spec.config.record.recordType === 'string' &&
           spec.config.record.zoneName &&
           typeof spec.config.record.zoneName === 'string' &&
           spec.config.record.target &&
           (typeof spec.config.record.target === 'string' || Array.isArray(spec.config.record.target));
  }

  public getProvidedCapabilities(): string[] {
    return ['dns:record'];
  }
}
