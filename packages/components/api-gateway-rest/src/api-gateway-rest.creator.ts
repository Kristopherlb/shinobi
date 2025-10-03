/**
 * Creator for ApiGatewayRestComponent Component
 * 
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */

import { Construct } from 'constructs';
import { ComponentContext, ComponentSpec, IComponentCreator } from '@shinobi/core';
import { ApiGatewayRestComponent } from './api-gateway-rest.component.ts';
import {
  ApiGatewayRestConfig,
  API_GATEWAY_REST_CONFIG_SCHEMA,
} from './api-gateway-rest.builder.ts';

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
  public createComponent(spec: ComponentSpec, context: ComponentContext): ApiGatewayRestComponent {
    if (!context.scope) {
      throw new Error('ComponentContext.scope is required to create components');
    }

    this.assertValidSpec(spec, context);

    return new ApiGatewayRestComponent(context.scope as Construct, spec.name, context, spec);
  }

  public processComponent(spec: ComponentSpec, context: ComponentContext): ApiGatewayRestComponent {
    return this.createComponent(spec, context);
  }
  
  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec, 
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors = this.collectValidationErrors(spec, context);
    return {
      valid: errors.length === 0,
      errors,
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
    return [];
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

  private assertValidSpec(spec: ComponentSpec, context: ComponentContext): void {
    const errors = this.collectValidationErrors(spec, context);
    if (errors.length > 0) {
      throw new Error(`Invalid api-gateway-rest specification: ${errors.join('; ')}`);
    }
  }

  private collectValidationErrors(spec: ComponentSpec, context: ComponentContext): string[] {
    const errors: string[] = [];
    const config = (spec.config ?? {}) as ApiGatewayRestConfig;

    if (!spec.name || !/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
    }

    if (context.environment === 'prod' && config.monitoring?.detailedMetrics === false) {
      errors.push('Monitoring must be enabled in production environment');
    }

    return errors;
  }
}
