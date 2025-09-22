/**
 * Creator for LambdaApiComponent Component
 * 
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */

import { Construct } from 'constructs';
// Minimal interfaces to avoid circular dependencies
export interface ComponentSpec {
  name: string;
  type: string;
  config: any;
}

export interface ComponentContext {
  serviceName: string;
  environment: string;
  complianceFramework?: string;
  otelCollectorEndpoint?: string;
  owner?: string;
}

export interface IComponentCreator {
  createComponent(spec: ComponentSpec, context: ComponentContext): any;
}
import { LambdaApiComponent } from './lambda-api.component';
import { LambdaApiConfig, LAMBDA_API_CONFIG_SCHEMA } from './lambda-api.builder';

/**
 * Creator class for LambdaApiComponent component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class LambdaApiComponentCreator implements IComponentCreator {

  /**
   * Component type identifier
   */
  public readonly componentType = 'lambda-api';

  /**
   * Component display name
   */
  public readonly displayName = 'Lambda Api Component';

  /**
   * Component description
   */
  public readonly description = 'Lambda API Component';

  /**
   * Component category for organization
   */
  public readonly category = 'compute';

  /**
   * AWS service this component manages
   */
  public readonly awsService = 'LAMBDA';

  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'lambda-api',
    'compute',
    'aws',
    'lambda'
  ];

  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = LAMBDA_API_CONFIG_SCHEMA;

  /**
   * Factory method to create component instances
   */
  public createComponent(spec: ComponentSpec, context: ComponentContext): LambdaApiComponent {
    return new LambdaApiComponent(context as any, spec.name, context, spec.config);
  }

  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec,
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as LambdaApiConfig;

    // Validate component name
    if (!spec.name || spec.name.length === 0) {
      errors.push('Component name is required');
    } else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
    }

    // TODO: Add component-specific validations here

    // Environment-specific validations
    if (context.environment === 'prod') {
      // TODO: Add production-specific validations
      // Note: monitoring validation removed as it's not part of LambdaApiSpec
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
      'compute:lambda-api',
      'monitoring:lambda-api'
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