/**
 * Creator for SecretsManagerComponent Component
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
import { SecretsManagerComponentComponent } from './secrets-manager.component.js';
import { SecretsManagerConfig, SECRETS_MANAGER_CONFIG_SCHEMA } from './secrets-manager.builder.js';

/**
 * Creator class for SecretsManagerComponent component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class SecretsManagerComponentCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'secrets-manager';
  
  /**
   * Component display name
   */
  public readonly displayName = 'Secrets Manager Component';
  
  /**
   * Component description
   */
  public readonly description = 'Secrets Manager Component';
  
  /**
   * Component category for organization
   */
  public readonly category = 'security';
  
  /**
   * AWS service this component manages
   */
  public readonly awsService = 'SECRETSMANAGER';
  
  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'secrets-manager',
    'security',
    'aws',
    'secretsmanager'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = SECRETS_MANAGER_CONFIG_SCHEMA;
  
  /**
   * Factory method to create component instances
   */
  public createComponent(
    scope: Construct, 
    spec: ComponentSpec, 
    context: ComponentContext
  ): SecretsManagerComponentComponent {
    return new SecretsManagerComponentComponent(scope, spec.name, context, spec);
  }
  
  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec, 
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as SecretsManagerConfig;
    
    // Validate component name
    if (!spec.name || spec.name.length === 0) {
      errors.push('Component name is required');
    } else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
    }
    
    // Validation: Check for conflicting secretValue options
    if (config?.secretValue) {
      const secretValue = config.secretValue;
      const optionsCount = [
        secretValue.secretArn,
        secretValue.generateSecret,
        secretValue.secretStringValue
      ].filter(Boolean).length;

      if (optionsCount > 1) {
        errors.push(
          'Conflicting secretValue options detected. ' +
          'Only one of secretArn, generateSecret, or secretStringValue (with allowUnsafePlainText) can be specified.'
        );
      }

      // Validate allowUnsafePlainText usage
      if (secretValue.secretStringValue && !secretValue.allowUnsafePlainText && !secretValue.secretArn && !secretValue.generateSecret) {
        errors.push(
          'Direct secret string values require allowUnsafePlainText: true for non-sensitive configuration values. ' +
          'For secrets, use secretArn to reference existing secrets or enable generateSecret.'
        );
      }
    }

    // Validation: Check for conflict between generateSecret and secretValue.generateSecret
    if (config?.generateSecret?.enabled && config?.secretValue?.generateSecret) {
      errors.push(
        'Conflicting generateSecret options detected. ' +
        'Cannot specify both generateSecret.enabled and secretValue.generateSecret. ' +
        'Use only one method for secret generation.'
      );
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
      'security:secrets-manager',
      'monitoring:secrets-manager'
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
      'secret',
      'kmsKey',
      'rotationLambda'
    ];
  }
}
