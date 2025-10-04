/**
 * Creator for CognitoUserPoolComponent Component
 * 
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */

import { Construct } from 'constructs';
import { 
  ComponentSpec, 
  ComponentContext, 
  IComponentCreator 
} from '../../platform/contracts/component-interfaces.js';
import { CognitoUserPoolComponent } from './cognito-user-pool.component.js';
import { CognitoUserPoolConfig, COGNITO_USER_POOL_CONFIG_SCHEMA } from './cognito-user-pool.builder.js';

/**
 * Creator class for CognitoUserPoolComponent component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class CognitoUserPoolComponentCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'cognito-user-pool';
  
  /**
   * Component display name
   */
  public readonly displayName = 'Cognito User Pool Component';
  
  /**
   * Component description
   */
  public readonly description = 'Configuration-driven Cognito User Pool component';
  
  /**
   * Component category for organization
   */
  public readonly category = 'security';
  
  /**
   * AWS service this component manages
   */
  public readonly awsService = 'COGNITO';
  
  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'cognito-user-pool',
    'security',
    'aws',
    'cognito'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = COGNITO_USER_POOL_CONFIG_SCHEMA;
  
  /**
   * Factory method to create component instances
   */
  public createComponent(
    scope: Construct,
    spec: ComponentSpec,
    context: ComponentContext
  ): CognitoUserPoolComponent {
    return new CognitoUserPoolComponent(scope, spec.name, context, spec);
  }
  
  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec, 
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as CognitoUserPoolConfig;
    
    // Validate component name
    if (!spec.name || spec.name.length === 0) {
      errors.push('Component name is required');
    } else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
    }
    
    // Environment-specific validations
    const environmentName = context.environment?.toLowerCase();
    const isProductionLike = environmentName === 'prod' || environmentName === 'production' || environmentName?.startsWith('prod-');
    if (isProductionLike && !config?.monitoring?.enabled) {
      errors.push('Monitoring must be enabled in production environments');
    }

    if (config?.signIn) {
      const hasAlias = Object.values(config.signIn).some(value => value === true);
      if (!hasAlias) {
        errors.push('At least one sign-in alias must be enabled.');
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
      'auth:user-pool',
      'auth:identity-provider'
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
      'userPool',
      'domain'
    ];
  }
}
