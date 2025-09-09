/**
 * Creator for StaticWebsiteComponent Component
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
import { StaticWebsiteComponentComponent } from './static-website.component';
import { StaticWebsiteConfig, STATIC_WEBSITE_CONFIG_SCHEMA } from './static-website.builder';

/**
 * Creator class for StaticWebsiteComponent component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class StaticWebsiteComponentCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'static-website';
  
  /**
   * Component display name
   */
  public readonly displayName = 'Static Website Component';
  
  /**
   * Component description
   */
  public readonly description = 'Static Website Component';
  
  /**
   * Component category for organization
   */
  public readonly category = 'development';
  
  /**
   * AWS service this component manages
   */
  public readonly awsService = 'S3';
  
  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'static-website',
    'development',
    'aws',
    's3'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = STATIC_WEBSITE_CONFIG_SCHEMA;
  
  /**
   * Factory method to create component instances
   */
  public createComponent(
    scope: Construct, 
    spec: ComponentSpec, 
    context: ComponentContext
  ): StaticWebsiteComponentComponent {
    return new StaticWebsiteComponentComponent(scope, spec, context);
  }
  
  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec, 
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as StaticWebsiteConfig;
    
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
      'development:static-website',
      'monitoring:static-website'
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
      'main'
      // TODO: Add additional construct handles if needed
    ];
  }
}