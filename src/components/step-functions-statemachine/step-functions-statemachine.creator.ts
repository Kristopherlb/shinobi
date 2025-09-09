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
} from '../../platform/contracts/component-interfaces';
import { StepFunctionsStateMachineComponentComponent } from './step-functions-statemachine.component';
import { StepFunctionsStateMachineConfig, STEP_FUNCTIONS_STATEMACHINE_CONFIG_SCHEMA } from './step-functions-statemachine.builder';

/**
 * Creator class for StepFunctionsStateMachineComponent component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class StepFunctionsStateMachineComponentCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'step-functions-statemachine';
  
  /**
   * Component display name
   */
  public readonly displayName = 'Step Functions State Machine Component';
  
  /**
   * Component description
   */
  public readonly description = 'Step Functions State Machine Component';
  
  /**
   * Component category for organization
   */
  public readonly category = 'workflow';
  
  /**
   * AWS service this component manages
   */
  public readonly awsService = 'STEPFUNCTIONS';
  
  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'step-functions-statemachine',
    'workflow',
    'aws',
    'stepfunctions'
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
  ): StepFunctionsStateMachineComponentComponent {
    return new StepFunctionsStateMachineComponentComponent(scope, spec, context);
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
      'workflow:step-functions-statemachine',
      'monitoring:step-functions-statemachine'
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