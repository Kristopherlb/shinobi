/**
 * Creator for EcsClusterComponent Component
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
import { EcsClusterComponent } from './ecs-cluster.component.js';
import { EcsClusterConfig, ECS_CLUSTER_CONFIG_SCHEMA } from './ecs-cluster.builder.js';

/**
 * Creator class for EcsClusterComponent component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class EcsClusterComponentCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'ecs-cluster';
  
  /**
   * Component display name
   */
  public readonly displayName = 'Ecs Cluster Component';
  
  /**
   * Component description
   */
  public readonly description = 'ECS Cluster Component';
  
  /**
   * Component category for organization
   */
  public readonly category = 'compute';
  
  /**
   * AWS service this component manages
   */
  public readonly awsService = 'ECS';
  
  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'ecs-cluster',
    'compute',
    'aws',
    'ecs'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = ECS_CLUSTER_CONFIG_SCHEMA;
  
  /**
   * Factory method to create component instances
   */
  public createComponent(
    spec: ComponentSpec,
    context: ComponentContext
  ): EcsClusterComponent {
    const scope = context.scope as Construct | undefined;
    if (!scope) {
      throw new Error('ComponentContext.scope is required to create ecs-cluster components');
    }
    return new EcsClusterComponent(scope, spec.name, context, spec);
  }
  
  /**
   * Process component (same as create for this component)
   */
  public processComponent(
    spec: ComponentSpec,
    context: ComponentContext
  ): EcsClusterComponent {
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
    const config = spec.config as EcsClusterConfig;
    
    // Validate component name
    if (!spec.name || spec.name.length === 0) {
      errors.push('Component name is required');
    } else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
    }
    
    // TODO: Add component-specific validations here
    
    // Environment-specific validations
    if (context.environment === 'prod') {
      if (!config?.monitoring?.enabled) {
        errors.push('Monitoring must be enabled in production environment');
      }
      
      // TODO: Add production-specific validations
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Returns the capabilities this component provides when synthesized
   */
  public getProvidedCapabilities(): string[] {
    return ['ecs:cluster', 'observability:ecs-cluster', 'otel:environment'];
  }
  
  /**
   * Returns the capabilities this component requires from other components
   */
  public getRequiredCapabilities(): string[] {
    return ['network:vpc'];
  }
  
  /**
   * Returns construct handles that will be registered by this component
   */
  public getConstructHandles(): string[] {
    return ['cluster', 'namespace', 'autoScalingGroup', 'capacitySecurityGroup'];
  }
}
