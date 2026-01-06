/**
 * Creator for EcrRepositoryComponent Component
 * 
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */

import {
  ComponentSpec,
  ComponentContext,
  IComponentCreator
} from '@shinobi/core';
import { Construct } from 'constructs';
import { EcrRepositoryComponent } from './ecr-repository.component.js';
import { EcrRepositoryConfig } from './ecr-repository.builder.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ECR_REPOSITORY_CONFIG_SCHEMA = JSON.parse(
  readFileSync(join(__dirname, 'Config.schema.json'), 'utf-8')
);

/**
 * Creator class for EcrRepositoryComponent component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class EcrRepositoryComponentCreator implements IComponentCreator {

  /**
   * Component type identifier
   */
  public readonly componentType = 'ecr-repository';

  /**
   * Component display name
   */
  public readonly displayName = 'ECR Repository Component';

  /**
   * Component description
   */
  public readonly description = 'ECR Repository Component';

  /**
   * Component category for organization
   */
  public readonly category = 'containers';

  /**
   * AWS service this component manages
   */
  public readonly awsService = 'ECR';

  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'ecr-repository',
    'containers',
    'aws',
    'ecr'
  ];

  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = ECR_REPOSITORY_CONFIG_SCHEMA;

  /**
   * Factory method to create component instances
   */
  public createComponent(
    spec: ComponentSpec,
    context: ComponentContext
  ): EcrRepositoryComponent {
    return new EcrRepositoryComponent(context.scope, spec.name, context, spec);
  }

  public processComponent(
    spec: ComponentSpec,
    context: ComponentContext
  ): EcrRepositoryComponent {
    return this.createComponent(spec, context);
  }

  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec,
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as EcrRepositoryConfig;

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
    return ['container:ecr', 'observability:ecr-repository'];
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
    return ['repository', 'accessLogGroup', 'pushRateAlarm', 'repositorySizeAlarm'];
  }
}
