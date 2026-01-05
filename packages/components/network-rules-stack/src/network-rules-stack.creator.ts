/**
 * Creator for NetworkRulesStackComponent Component
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
import { NetworkRulesStackComponent } from './network-rules-stack.component.js';
import { NetworkRulesStackConfig, NETWORK_RULES_STACK_CONFIG_SCHEMA } from './network-rules-stack.builder.js';

/**
 * Creator class for NetworkRulesStackComponent component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class NetworkRulesStackComponentCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'network-rules-stack';
  
  /**
   * Component display name
   */
  public readonly displayName = 'Network Rules Stack Component';
  
  /**
   * Component description
   */
  public readonly description = 'Network Rules Stack Component - applies cross-stack security group rules from SSM Parameter Store';
  
  /**
   * Component category for organization
   */
  public readonly category = 'networking';
  
  /**
   * AWS service this component manages
   */
  public readonly awsService = 'EC2';
  
  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'network-rules-stack',
    'networking',
    'security-groups',
    'cross-stack',
    'aws',
    'ec2'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = NETWORK_RULES_STACK_CONFIG_SCHEMA;
  
  /**
   * Factory method to create component instances
   */
  public createComponent(
    scope: Construct,
    spec: ComponentSpec,
    context: ComponentContext
  ): NetworkRulesStackComponent {
    return new NetworkRulesStackComponent(scope, spec.name, context, spec);
  }

  /**
   * Process component (alias for createComponent)
   */
  public processComponent(
    scope: Construct,
    spec: ComponentSpec,
    context: ComponentContext
  ): NetworkRulesStackComponent {
    return this.createComponent(scope, spec, context);
  }
  
  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec, 
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as NetworkRulesStackConfig;
    
    // Validate component name
    if (!spec.name || spec.name.length === 0) {
      errors.push('Component name is required');
    } else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
    }
    
    // Validate SSM path prefix if provided
    if (config?.ssmPathPrefix) {
      if (!config.ssmPathPrefix.startsWith('/')) {
        errors.push('SSM path prefix must start with /');
      }
      if (config.ssmPathPrefix.length > 2048) {
        errors.push('SSM path prefix exceeds maximum length of 2048 characters');
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
    return []; // Infrastructure-only component, no capabilities
  }
  
  /**
   * Returns the capabilities this component requires from other components
   */
  public getRequiredCapabilities(): string[] {
    return []; // No dependencies on other components
  }
  
  /**
   * Returns construct handles that will be registered by this component
   */
  public getConstructHandles(): string[] {
    return ['ssmQueryLambda', 'ssmQueryResource', 'ruleApplicationLambda', 'ruleApplicationResource'];
  }
}

