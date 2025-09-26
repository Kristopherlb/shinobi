/**
 * Creator for ApiGatewayRestComponent Component
 * 
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */

import { Construct } from 'constructs';
import {
  ComponentSpec,
  ComponentContext,
  IComponentCreator,
} from '@platform/contracts';
import { ApiGatewayRestComponent } from './api-gateway-rest.component';
import {
  ApiGatewayRestConfig,
  API_GATEWAY_REST_CONFIG_SCHEMA,
} from './api-gateway-rest.builder';

/**
 * Creator class for ApiGatewayRestComponent component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class ApiGatewayRestComponentCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'api-gateway-rest';
  
  /**
   * Component display name
   */
  public readonly displayName = 'Api Gateway Rest Component';
  
  /**
   * Component description
   */
  public readonly description = 'Enterprise REST API Gateway Component implementing Component API Contract v1.0';
  
  /**
   * Component category for organization
   */
  public readonly category = 'api';
  
  /**
   * AWS service this component manages
   */
  public readonly awsService = 'APIGATEWAY';
  
  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'api-gateway-rest',
    'api',
    'aws',
    'apigateway'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = API_GATEWAY_REST_CONFIG_SCHEMA;
  
  /**
   * Factory method to create component instances
   */
  public createComponent(
    scope: Construct,
    spec: ComponentSpec,
    context: ComponentContext,
  ): ApiGatewayRestComponent {
    return new ApiGatewayRestComponent(scope, spec.name, context, spec);
  }
  
  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec, 
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as ApiGatewayRestConfig;
    
    // Validate component name
    if (!spec.name || spec.name.length === 0) {
      errors.push('Component name is required');
    } else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
    }
    
    // TODO: Add component-specific validations here
    
    // Environment-specific validations
    if (context.environment === 'prod') {
      if (config?.monitoring?.detailedMetrics === false) {
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
      'api:rest'
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
      'stage',
      'accessLogGroup',
      'authorizer',
      'usagePlan'
    ];
  }
}
