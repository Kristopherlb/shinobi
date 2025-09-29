/**
 * Creator for Route53HostedZoneComponent Component
 * 
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */

import { Construct } from 'constructs';
import { 
  ComponentSpec, 
  ComponentContext, 
  IComponentCreator 
} from '../../platform/contracts/component-interfaces';
import { Route53HostedZoneComponent } from './route53-hosted-zone.component';
import { Route53HostedZoneConfig, ROUTE53_HOSTED_ZONE_CONFIG_SCHEMA } from './route53-hosted-zone.builder';

/**
 * Creator class for Route53HostedZoneComponent component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class Route53HostedZoneComponentCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'route53-hosted-zone';
  
  /**
   * Component display name
   */
  public readonly displayName = 'Route53 Hosted Zone Component';
  
  /**
   * Component description
   */
  public readonly description = 'Route53 Hosted Zone Component';
  
  /**
   * Component category for organization
   */
  public readonly category = 'networking';
  
  /**
   * AWS service this component manages
   */
  public readonly awsService = 'ROUTE53';
  
  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'route53-hosted-zone',
    'networking',
    'aws',
    'route53'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = ROUTE53_HOSTED_ZONE_CONFIG_SCHEMA;
  
  /**
   * Factory method to create component instances
   */
  public createComponent(
    scope: Construct, 
    spec: ComponentSpec, 
    context: ComponentContext
  ): Route53HostedZoneComponent {
    return new Route53HostedZoneComponent(scope, spec.name, context, spec);
  }
  
  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec, 
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as Route53HostedZoneConfig;
    
    // Validate component name
    if (!spec.name || spec.name.length === 0) {
      errors.push('Component name is required');
    } else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
    }
    
    if (!config?.zoneName) {
      errors.push('Hosted zone config requires a zoneName');
    }

    if ((config?.zoneType === 'private' || config?.zoneType === 'PRIVATE') && (!config?.vpcAssociations || config.vpcAssociations.length === 0)) {
      errors.push('Private hosted zones must include at least one VPC association');
    }
    
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
      'dns:hosted-zone'
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
      'hostedZone'
    ];
  }
}
