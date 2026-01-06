/**
 * Creator for EfsFilesystemComponent Component
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
import { EfsFilesystemComponent } from './efs-filesystem.component.js';
import { EfsFilesystemConfig, EFS_FILESYSTEM_CONFIG_SCHEMA } from './efs-filesystem.builder.js';

/**
 * Creator class for EfsFilesystemComponent component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class EfsFilesystemComponentCreator implements IComponentCreator {

  /**
   * Component type identifier
   */
  public readonly componentType = 'efs-filesystem';

  /**
   * Component version (semantic versioning)
   */
  public readonly version = '1.0.0';

  /**
   * Component stability level
   */
  public readonly stability = 'stable' as const;

  /**
   * Component display name
   */
  public readonly displayName = 'Amazon EFS Filesystem';

  /**
   * Component description
   */
  public readonly description = 'Amazon EFS filesystem with encryption at rest and in transit, lifecycle management, CloudWatch monitoring, and automatic backups';

  /**
   * Component category for organization
   */
  public readonly category = 'storage';

  /**
   * AWS service this component manages
   */
  public readonly awsService = 'EFS';

  /**
   * Supported compliance frameworks
   */
  public readonly complianceFrameworks = [
    'commercial',
    'fedramp-moderate',
    'fedramp-high'
  ];

  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'efs',
    'filesystem',
    'storage',
    'nfs',
    'encryption',
    'lifecycle',
    'aws',
    'shared-storage',
    'monitoring'
  ];

  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = EFS_FILESYSTEM_CONFIG_SCHEMA;

  /**
   * Factory method to create component instances
   */
  public createComponent(
    spec: ComponentSpec,
    context: ComponentContext
  ): EfsFilesystemComponent {
    return new EfsFilesystemComponent(context.scope, spec.name, context, spec);
  }

  public processComponent(
    spec: ComponentSpec,
    context: ComponentContext
  ): EfsFilesystemComponent {
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
    const config = spec.config as EfsFilesystemConfig;

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
      'storage:efs'
    ];
  }

  /**
   * Returns the capabilities this component requires from other components
   */
  public getRequiredCapabilities(): string[] {
    return [
      'network:vpc' // EFS requires a VPC for mount targets
    ];
  }

  /**
   * Returns construct handles that will be registered by this component
   */
  public getConstructHandles(): string[] {
    return [
      'main',
      'filesystem',
      'securityGroup'
    ];
  }
}
