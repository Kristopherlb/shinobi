/**
 * Creator for IamPolicyComponent Component
 * 
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */

import { Construct } from 'constructs';
import { 
  ComponentSpec, 
  ComponentContext, 
  IComponentCreator 
} from '@platform/contracts';
import { IamPolicyComponent } from './iam-policy.component.js';
import { IamPolicyConfig, IAM_POLICY_CONFIG_SCHEMA } from './iam-policy.builder.js';

/**
 * Creator class for IamPolicyComponent component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class IamPolicyComponentCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'iam-policy';
  
  /**
   * Component display name
   */
  public readonly displayName = 'Iam Policy Component';
  
  /**
   * Component description
   */
  public readonly description = 'IAM Policy Component';
  
  /**
   * Component category for organization
   */
  public readonly category = 'security';
  
  /**
   * AWS service this component manages
   */
  public readonly awsService = 'IAM';
  
  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'iam-policy',
    'security',
    'aws',
    'iam'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = IAM_POLICY_CONFIG_SCHEMA;
  
  /**
   * Factory method to create component instances
   */
  public createComponent(
    scope: Construct, 
    spec: ComponentSpec, 
    context: ComponentContext
  ): IamPolicyComponent {
    // Construct ID is the spec.name
    const id = spec.name;
    return new IamPolicyComponent(scope, id, context, spec);
  }
  
  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec, 
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as IamPolicyConfig;
    
    // Validate component name
    if (!spec.name || spec.name.length === 0) {
      errors.push('Component name is required');
    } else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
    }
    
    // Validate policyType is provided
    if (!config?.policyType) {
      errors.push('policyType is required (must be "managed" or "inline")');
    }
    
    // Validate either policyDocument or policyTemplate is provided
    if (!config?.policyDocument && !config?.policyTemplate) {
      errors.push('Must specify either policyDocument or policyTemplate');
    }
    
    // Validate both are not provided
    if (config?.policyDocument && config?.policyTemplate) {
      errors.push('Cannot specify both policyDocument and policyTemplate - choose one');
    }
    
    // Validate inline policies don't have attachments
    if (config?.policyType === 'inline') {
      if (config.groups?.length || config.roles?.length || config.users?.length) {
        errors.push('Inline policies cannot specify groups, roles, or users. Use patches.ts for attachment.');
      }
    }
    
    // Environment-specific validations
    if (context.environment === 'prod') {
      if (!config?.monitoring?.enabled) {
        errors.push('Monitoring must be enabled in production environment');
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
      'iam:policy'
    ];
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
    return [
      'main',
      'policy',
      'usageLogGroup',
      'complianceLogGroup',
      'auditLogGroup',
      'policyUsageAlarm'
    ];
  }
}