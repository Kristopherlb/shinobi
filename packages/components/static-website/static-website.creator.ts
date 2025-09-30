/**
 * Creator for Static Website Component
 * 
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */

import { Construct } from 'constructs';
import { 
  ComponentSpec, 
  ComponentContext, 
  IComponentCreator 
} from '../@shinobi/core/component-interfaces';
import { StaticWebsiteComponent } from './static-website.component';
import { StaticWebsiteConfig, STATIC_WEBSITE_CONFIG_SCHEMA } from './static-website.builder';

/**
 * Creator class for Static Website component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class StaticWebsiteCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'static-website';
  
  /**
   * Component display name
   */
  public readonly displayName = 'Static Website';
  
  /**
   * Component description
   */
  public readonly description = 'Static website hosting with S3 and CloudFront CDN for global performance with compliance-aware configuration';
  
  /**
   * Component category for organization
   */
  public readonly category = 'hosting';
  
  /**
   * AWS service this component manages
   */
  public readonly awsService = 'S3, CloudFront';
  
  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'static-website',
    'hosting',
    's3',
    'cloudfront',
    'cdn'
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
  ): StaticWebsiteComponent {
    return new StaticWebsiteComponent(scope, spec.name, context, spec);
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
    
    // Validate domain configuration
    if (config?.domain && !config.domain.domainName) {
      errors.push('Domain name is required when domain configuration is provided');
    }
    
    // Validate deployment configuration
    if (config?.deployment?.enabled && !config.deployment.sourcePath) {
      errors.push('Source path is required when deployment is enabled');
    }
    
    // Production environment validations
    if (context.environment === 'prod') {
      if (config?.security?.enforceHTTPS === false) {
        errors.push('HTTPS must be enforced in production environment');
      }
      
      if (config?.security?.encryption === false) {
        errors.push('Encryption must be enabled in production environment');
      }
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
      'hosting:static',
      'web:static'
    ];
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
    return [
      'main',
      'bucket',
      'distribution',
      'deployment'
    ];
  }
}
