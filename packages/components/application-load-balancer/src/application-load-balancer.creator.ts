/**
 * Creator for ApplicationLoadBalancerComponent Component
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
import { ApplicationLoadBalancerComponent } from './application-load-balancer.component.ts';
import { ApplicationLoadBalancerConfig, APPLICATION_LOAD_BALANCER_CONFIG_SCHEMA } from './application-load-balancer.builder.ts';

/**
 * Creator class for ApplicationLoadBalancerComponent component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class ApplicationLoadBalancerComponentCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'application-load-balancer';
  
  /**
   * Component display name
   */
  public readonly displayName = 'Application Load Balancer Component';
  
  /**
   * Component description
   */
  public readonly description = 'Application Load Balancer Component implementing Component API Contract v1.0';
  
  /**
   * Component category for organization
   */
  public readonly category = 'networking';
  
  /**
   * AWS service this component manages
   */
  public readonly awsService = 'ELASTICLOADBALANCINGV2';
  
  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'application-load-balancer',
    'networking',
    'aws',
    'elasticloadbalancingv2'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = APPLICATION_LOAD_BALANCER_CONFIG_SCHEMA;
  
  /**
   * Factory method to create component instances
   */
  public createComponent(
    scope: Construct,
    spec: ComponentSpec,
    context: ComponentContext
  ): ApplicationLoadBalancerComponent {
    return new ApplicationLoadBalancerComponent(scope, spec.name, context, spec);
  }
  
  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec, 
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as ApplicationLoadBalancerConfig;
    
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
    return [
      'net:load-balancer',
      'net:load-balancer-target',
      'observability:application-load-balancer'
    ];
  }
  
  /**
   * Returns the capabilities this component requires from other components
   */
  public getRequiredCapabilities(): string[] {
    return [
      // TODO: Define required capabilities
    ];
  }
  
  /**
   * Returns construct handles that will be registered by this component
   */
  public getConstructHandles(): string[] {
    return [
      'main',
      'loadBalancer',
      'securityGroup',
      'accessLogsBucket'
    ];
  }
}
