/**
 * Creator for SqsQueue Component
 * 
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 * 
 * @author Platform Team
 * @category messaging
 * @service SQS
 */

import { Construct } from 'constructs';
import { 
  ComponentSpec, 
  ComponentContext, 
  IComponentCreator 
} from '@shinobi/core';
import { SqsQueueComponent } from './sqs-queue.component.js';
import { SqsQueueConfig, SQS_QUEUE_CONFIG_SCHEMA } from './sqs-queue.builder.js';

/**
 * Creator class for SqsQueue component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class SqsQueueCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'sqs-queue';
  
  /**
   * Component display name
   */
  public readonly displayName = 'SQS Queue';
  
  /**
   * Component description
   */
  public readonly description = 'SQS message queue with compliance hardening and DLQ support';
  
  /**
   * Component category for organization
   */
  public readonly category = 'messaging';
  
  /**
   * AWS service this component manages
   */
  public readonly awsService = 'SQS';
  
  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'sqs-queue',
    'messaging',
    'aws',
    'sqs'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = SQS_QUEUE_CONFIG_SCHEMA;
  
  /**
   * Factory method to create component instances
   */
  public createComponent(
    spec: ComponentSpec, 
    context: ComponentContext
  ): SqsQueueComponent {
    return new SqsQueueComponent(context.scope, spec.name, context, spec);
  }

  /**
   * Process component (alias for createComponent for compatibility)
   */
  public processComponent(
    spec: ComponentSpec,
    context: ComponentContext
  ): SqsQueueComponent {
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
    const config = spec.config as SqsQueueConfig;
    
    // Validate component name
    if (!spec.name || spec.name.length === 0) {
      errors.push('Component name is required');
    } else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
    }
    
    // Validate queue name pattern if explicitly provided
    if (config?.queueName) {
      // SQS queue name validation: alphanumeric, hyphens, underscores, 1-80 chars
      if (!/^[a-zA-Z0-9-_]+$/.test(config.queueName)) {
        errors.push('queueName must contain only alphanumeric characters, hyphens, and underscores');
      }
      if (config.queueName.length > 80) {
        errors.push('queueName must be 80 characters or less');
      }
      if (config.queueName.length === 0) {
        errors.push('queueName cannot be empty if provided');
      }
    }
    
    // Component-specific validations (configuration-driven, not environment-driven)
    // Note: Environment-specific requirements should be handled via configuration layers
    // (environment defaults in service.yml, platform defaults, etc.), not code conditionals
    
    // Validate monitoring configuration if explicitly provided
    if (config?.monitoring?.enabled === false && config?.monitoring?.detailedMetrics === true) {
      errors.push('detailedMetrics cannot be enabled when monitoring is disabled');
    }
    
    // Validate encryption configuration
    if (config?.encryption?.enabled && !config?.encryption?.kmsKeyId) {
      // Note: KMS key will be auto-created if encryption is enabled and kmsKeyId is not provided
      // This is valid, so we don't error here
    }
    
    // Validate DLQ configuration
    if (config?.deadLetterQueue?.enabled) {
      if (!config.deadLetterQueue.maxReceiveCount || config.deadLetterQueue.maxReceiveCount < 1) {
        errors.push('maxReceiveCount must be at least 1 when deadLetterQueue is enabled');
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
      'messaging:sqs',
      'messaging:sqs:dlq'
    ];
  }
  
  /**
   * Returns the capabilities this component requires from other components
   * 
   * SQS Queue component does not require any capabilities from other components.
   * It is a standalone messaging resource.
   */
  public getRequiredCapabilities(): string[] {
    return [];
  }
  
  /**
   * Returns construct handles that will be registered by this component
   * 
   * These handles can be used in patches.ts for escape-hatch modifications.
   */
  public getConstructHandles(): string[] {
    return [
      'main', // Main SQS queue
      'deadLetterQueue', // Dead letter queue (if enabled)
      'kmsKey', // KMS encryption key (if customer-managed)
      'kmsKeyAlias' // KMS key alias (if customer-managed)
    ];
  }
}