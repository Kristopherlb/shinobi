/**
 * Creator for EventBridgeRulePatternComponent Component
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
import { EventBridgeRulePatternComponentComponent } from './eventbridge-rule-pattern.component';
import { EventBridgeRulePatternConfig, EVENTBRIDGE_RULE_PATTERN_CONFIG_SCHEMA } from './eventbridge-rule-pattern.builder';

/**
 * Creator class for EventBridgeRulePatternComponent component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class EventBridgeRulePatternComponentCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'eventbridge-rule-pattern';
  
  /**
   * Component display name
   */
  public readonly displayName = 'Event Bridge Rule Pattern Component';
  
  /**
   * Component description
   */
  public readonly description = 'EventBridge Rule Pattern Component implementing Component API Contract v1.0';
  
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
    'eventbridge-rule-pattern',
    'events',
    'aws',
    'events'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = EVENTBRIDGE_RULE_PATTERN_CONFIG_SCHEMA;
  
  /**
   * Factory method to create component instances
   */
  public createComponent(
    scope: Construct, 
    spec: ComponentSpec, 
    context: ComponentContext
  ): EventBridgeRulePatternComponentComponent {
    return new EventBridgeRulePatternComponentComponent(scope, spec, context);
  }
  
  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec, 
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as EventBridgeRulePatternConfig;
    
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
      'events:eventbridge-rule-pattern',
      'monitoring:eventbridge-rule-pattern'
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