/**
 * Creator for EventBridgeRuleCronComponent Component
 * 
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */

import { Construct } from 'constructs';
import { 
  ComponentSpec, 
  ComponentContext, 
  IComponentCreator 
} from '../../platform/contracts/component-interfaces';
import { EventBridgeRuleCronComponentComponent } from './eventbridge-rule-cron.component';
import { EventBridgeRuleCronConfig, EVENTBRIDGE_RULE_CRON_CONFIG_SCHEMA } from './eventbridge-rule-cron.builder';

/**
 * Creator class for EventBridgeRuleCronComponent component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class EventBridgeRuleCronComponentCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'eventbridge-rule-cron';
  
  /**
   * Component display name
   */
  public readonly displayName = 'Event Bridge Rule Cron Component';
  
  /**
   * Component description
   */
  public readonly description = 'EventBridge Rule Cron Component implementing Component API Contract v1.0';
  
  /**
   * Component category for organization
   */
  public readonly category = 'events';
  
  /**
   * AWS service this component manages
   */
  public readonly awsService = 'EVENTS';
  
  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'eventbridge-rule-cron',
    'events',
    'aws',
    'events'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = EVENTBRIDGE_RULE_CRON_CONFIG_SCHEMA;
  
  /**
   * Factory method to create component instances
   */
  public createComponent(
    scope: Construct, 
    spec: ComponentSpec, 
    context: ComponentContext
  ): EventBridgeRuleCronComponentComponent {
    return new EventBridgeRuleCronComponentComponent(scope, spec, context);
  }
  
  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec, 
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as EventBridgeRuleCronConfig;
    
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
      'events:eventbridge-rule-cron',
      'monitoring:eventbridge-rule-cron'
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