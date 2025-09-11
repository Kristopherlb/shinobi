/**
 * Creator for SageMakerNotebookInstanceComponent Component
 * 
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */

import { Construct } from 'constructs';
import { 
  ComponentSpec, 
  ComponentContext, 
  IComponentCreator 
} from '../../../../src/platform/contracts/component-interfaces';
import { SageMakerNotebookInstanceComponent } from './sagemaker-notebook-instance.component';
import { SageMakerNotebookInstanceConfig, SAGEMAKER_NOTEBOOK_INSTANCE_CONFIG_SCHEMA } from './sagemaker-notebook-instance.builder';

/**
 * Creator class for SageMakerNotebookInstanceComponent component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class SageMakerNotebookInstanceComponentCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'sagemaker-notebook-instance';
  
  /**
   * Component display name
   */
  public readonly displayName = 'SageMaker Notebook Instance Component';
  
  /**
   * Component description
   */
  public readonly description = 'AWS SageMaker Notebook Instance for machine learning development and experimentation';
  
  /**
   * Component category for organization
   */
  public readonly category = 'ml';
  
  /**
   * AWS service this component manages
   */
  public readonly awsService = 'SAGEMAKER';
  
  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'sagemaker-notebook-instance',
    'ml',
    'aws',
    'sagemaker',
    'notebook',
    'jupyter'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = SAGEMAKER_NOTEBOOK_INSTANCE_CONFIG_SCHEMA;
  
  /**
   * Factory method to create component instances
   */
  public createComponent(
    scope: Construct, 
    spec: ComponentSpec, 
    context: ComponentContext
  ): SageMakerNotebookInstanceComponent {
    return new SageMakerNotebookInstanceComponent(scope, spec, context);
  }
  
  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec, 
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as SageMakerNotebookInstanceConfig;
    
    // Validate component name
    if (!spec.name || spec.name.length === 0) {
      errors.push('Component name is required');
    } else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
    }
    
    // Validate notebook instance name if provided
    if (config?.notebookInstanceName) {
      if (!/^[a-zA-Z0-9\-]{1,63}$/.test(config.notebookInstanceName)) {
        errors.push('Notebook instance name must be 1-63 characters long and contain only alphanumeric characters and hyphens');
      }
    }
    
    // Validate instance type if provided
    if (config?.instanceType) {
      const validInstanceTypes = [
        'ml.t2.medium', 'ml.t2.large', 'ml.t2.xlarge', 'ml.t2.2xlarge',
        'ml.t3.medium', 'ml.t3.large', 'ml.t3.xlarge', 'ml.t3.2xlarge',
        'ml.m4.xlarge', 'ml.m4.2xlarge', 'ml.m4.4xlarge', 'ml.m4.10xlarge', 'ml.m4.16xlarge',
        'ml.m5.large', 'ml.m5.xlarge', 'ml.m5.2xlarge', 'ml.m5.4xlarge', 'ml.m5.12xlarge', 'ml.m5.24xlarge',
        'ml.c4.large', 'ml.c4.xlarge', 'ml.c4.2xlarge', 'ml.c4.4xlarge', 'ml.c4.8xlarge',
        'ml.c5.large', 'ml.c5.xlarge', 'ml.c5.2xlarge', 'ml.c5.4xlarge', 'ml.c5.9xlarge', 'ml.c5.18xlarge',
        'ml.p2.xlarge', 'ml.p2.8xlarge', 'ml.p2.16xlarge',
        'ml.p3.2xlarge', 'ml.p3.8xlarge', 'ml.p3.16xlarge',
        'ml.g4dn.xlarge', 'ml.g4dn.2xlarge', 'ml.g4dn.4xlarge', 'ml.g4dn.8xlarge', 'ml.g4dn.12xlarge', 'ml.g4dn.16xlarge'
      ];
      
      if (!validInstanceTypes.includes(config.instanceType)) {
        errors.push(`Invalid instance type: ${config.instanceType}. Must be one of: ${validInstanceTypes.join(', ')}`);
      }
    }
    
    // Validate volume size if provided
    if (config?.volumeSizeInGB !== undefined) {
      if (config.volumeSizeInGB < 5 || config.volumeSizeInGB > 16384) {
        errors.push('Volume size must be between 5 and 16384 GB');
      }
    }
    
    // Validate security group IDs if provided
    if (config?.securityGroupIds && config.securityGroupIds.length > 5) {
      errors.push('Maximum of 5 security group IDs allowed');
    }
    
    // Validate additional code repositories if provided
    if (config?.additionalCodeRepositories && config.additionalCodeRepositories.length > 3) {
      errors.push('Maximum of 3 additional code repositories allowed');
    }
    
    // Validate accelerator types if provided
    if (config?.acceleratorTypes && config.acceleratorTypes.length > 1) {
      errors.push('Maximum of 1 accelerator type allowed');
    }
    
    // Environment-specific validations should be handled by platform configuration
    // No hardcoded environment checks allowed per platform standards
    
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
      'ml:sagemaker-notebook-instance',
      'ml:notebook',
      'monitoring:sagemaker-notebook-instance'
    ];
  }
  
  /**
   * Returns the capabilities this component requires from other components
   */
  public getRequiredCapabilities(): string[] {
    return [
      // No required capabilities - component is self-contained
    ];
  }
  
  /**
   * Returns construct handles that will be registered by this component
   */
  public getConstructHandles(): string[] {
    return [
      'notebookInstance',
      'executionRole',
      'kmsKey',
      'securityGroup'
    ];
  }
}