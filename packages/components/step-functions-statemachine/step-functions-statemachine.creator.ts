/**
 * Creator for StepFunctionsStateMachineComponent Component
 * 
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */

import { Construct } from 'constructs';
import { 
  ComponentSpec, 
  ComponentContext, 
  IComponentCreator 
} from '../@shinobi/core/component-interfaces';
import { StepFunctionsStateMachineComponent } from './step-functions-statemachine.component';
import { StepFunctionsStateMachineConfig, STEP_FUNCTIONS_STATEMACHINE_CONFIG_SCHEMA } from './step-functions-statemachine.builder';

/**
 * Creator class for Step Functions State Machine component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class StepFunctionsStateMachineCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'step-functions-statemachine';
  
  /**
   * Component display name
   */
  public readonly displayName = 'Step Functions State Machine';
  
  /**
   * Component description
   */
  public readonly description = 'AWS Step Functions State Machine for serverless workflow orchestration with compliance-aware configuration';
  
  /**
   * Component category for organization
   */
  public readonly category = 'workflow';
  
  /**
   * AWS service this component manages
   */
  public readonly awsService = 'Step Functions';
  
  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'step-functions',
    'workflow',
    'orchestration',
    'serverless'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = STEP_FUNCTIONS_STATEMACHINE_CONFIG_SCHEMA;
  
  /**
   * Factory method to create component instances
   */
  public createComponent(
    scope: Construct, 
    spec: ComponentSpec, 
    context: ComponentContext
  ): StepFunctionsStateMachineComponent {
    return new StepFunctionsStateMachineComponent(scope, spec.name, context, spec);
  }
  
  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec, 
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as StepFunctionsStateMachineConfig;
    
    // Validate component name
    if (!spec.name || spec.name.length === 0) {
      errors.push('Component name is required');
    } else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
    }
    
    // Validate state machine definition is provided
    if (!config?.definition) {
      errors.push('State machine definition is required');
    } else {
      if (!config.definition.definition && !config.definition.definitionString) {
        errors.push('State machine definition must provide either definition object or definitionString');
      }
    }
    
    // Validate timeout if provided
    if (config?.timeout?.seconds && (config.timeout.seconds < 1 || config.timeout.seconds > 31536000)) {
      errors.push('Timeout must be between 1 second and 1 year (31536000 seconds)');
    }
    
    // Production environment validations
    if (context.environment === 'prod') {
      if (context.complianceFramework === 'fedramp-moderate' || context.complianceFramework === 'fedramp-high') {
        if (config?.loggingConfiguration?.enabled === false) {
          errors.push('Logging must be enabled in FedRAMP environments');
        }
        if (config?.tracingConfiguration?.enabled === false) {
          errors.push('X-Ray tracing must be enabled in FedRAMP environments');
        }
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
      'workflow:step-functions'
    ];
  }
  
  /**
   * Returns the capabilities this component requires from other components
   */
  public getRequiredCapabilities(): string[] {
    return [
      // Step Functions components are typically self-contained
      // but may require IAM roles or logging resources
    ];
  }
  
  /**
   * Returns construct handles that will be registered by this component
   */
  public getConstructHandles(): string[] {
    return [
      'main',
      'stateMachine'
    ];
  }
}