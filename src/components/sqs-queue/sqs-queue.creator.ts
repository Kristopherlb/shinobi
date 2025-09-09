/**
 * Creator for SqsQueueNew Component
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
} from '../../platform/contracts/component-interfaces';
import { SqsQueueNewComponent } from './sqs-queue-new.component';
import { SqsQueueNewConfig, SQS_QUEUE_NEW_CONFIG_SCHEMA } from './sqs-queue-new.builder';

/**
 * Creator class for SqsQueueNew component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class SqsQueueNewCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'sqs-queue-new';
  
  /**
   * Component display name
   */
  public readonly displayName = 'Sqs Queue New';
  
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
    'sqs-queue-new',
    'messaging',
    'aws',
    'sqs'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = SQS_QUEUE_NEW_CONFIG_SCHEMA;
  
  /**
   * Factory method to create component instances
   */
  public createComponent(
    scope: Construct, 
    spec: ComponentSpec, 
    context: ComponentContext
  ): SqsQueueNewComponent {
    return new SqsQueueNewComponent(scope, spec, context);
  }
  
  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec, 
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as SqsQueueNewConfig;
    
    // Validate component name
    if (!spec.name || spec.name.length === 0) {
      errors.push('Component name is required');
    } else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
    }
    
    // TODO: Add component-specific validations here
    // Example:
    // if (config.someProperty && config.someProperty < 1) {
    //   errors.push('someProperty must be greater than 0');
    // }
    
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
      'messaging:sqs-queue-new',
      'monitoring:sqs-queue-new',
      'messaging:sqs-queue-new',
      'queue:sqs-queue-new',
      'streaming:sqs-queue-new',
      'events:sqs-queue-new'
    ];
  }
  
  /**
   * Returns the capabilities this component requires from other components
   */
  public getRequiredCapabilities(): string[] {
    return [
      // TODO: Define required capabilities
      // Example: 'networking:vpc' if this component needs a VPC
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