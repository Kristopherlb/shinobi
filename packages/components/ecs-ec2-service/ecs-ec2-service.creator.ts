/**
 * Creator for EcsEc2ServiceComponent Component
 * 
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */

import { Construct } from 'constructs';
import { ComponentSpec, ComponentContext, IComponentCreator } from '@platform/contracts';
import { EcsEc2ServiceComponent } from './ecs-ec2-service.component';
import { EcsEc2ServiceConfig, ECS_EC2_SERVICE_CONFIG_SCHEMA } from './ecs-ec2-service.builder';

/**
 * Creator class for EcsEc2ServiceComponent component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class EcsEc2ServiceComponentCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'ecs-ec2-service';
  
  /**
   * Component display name
   */
  public readonly displayName = 'Ecs Ec2 Service Component';
  
  /**
   * Component description
   */
  public readonly description = 'ECS EC2 Service Component';
  
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
    'ecs-ec2-service',
    'compute',
    'aws',
    'ecs'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = ECS_EC2_SERVICE_CONFIG_SCHEMA;
  
  /**
   * Factory method to create component instances
   */
  public createComponent(
    scope: Construct,
    spec: ComponentSpec,
    context: ComponentContext
  ): EcsEc2ServiceComponent {
    return new EcsEc2ServiceComponent(scope, spec.name, context, spec);
  }
  
  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec, 
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as EcsEc2ServiceConfig;
    
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
    return ['service:connect', 'otel:environment'];
  }
  
  /**
   * Returns the capabilities this component requires from other components
   */
  public getRequiredCapabilities(): string[] {
    return [];
  }
  
  /**
   * Returns construct handles that will be registered by this component
   */
  public getConstructHandles(): string[] {
    return ['main', 'service', 'taskDefinition', 'securityGroup', 'logGroup'];
  }
}
