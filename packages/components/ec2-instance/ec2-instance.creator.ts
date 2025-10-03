/**
 * Creator for Ec2InstanceComponent Component
 * 
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */

import { Construct } from 'constructs';
import {
  ComponentSpec,
  ComponentContext,
  IComponentCreator
} from '../@shinobi/core/component-interfaces.ts';
import { Ec2InstanceComponent } from './ec2-instance.component.ts';
import { Ec2InstanceConfig, EC2_INSTANCE_CONFIG_SCHEMA } from './ec2-instance.builder.ts';

/**
 * Creator class for Ec2InstanceComponent component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class Ec2InstanceComponentCreator implements IComponentCreator {

  /**
   * Component type identifier
   */
  public readonly componentType = 'ec2-instance';

  /**
   * Component display name
   */
  public readonly displayName = 'Ec2 Instance Component';

  /**
   * Component description
   */
  public readonly description = 'EC2 Instance Component';

  /**
   * Component category for organization
   */
  public readonly category = 'compute';

  /**
   * AWS service this component manages
   */
  public readonly awsService = 'EC2';

  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'ec2-instance',
    'compute',
    'aws',
    'ec2'
  ];

  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = EC2_INSTANCE_CONFIG_SCHEMA;

  /**
   * Factory method to create component instances
   */
  public createComponent(
    scope: Construct,
    spec: ComponentSpec,
    context: ComponentContext
  ): Ec2InstanceComponent {
    return new Ec2InstanceComponent(scope, spec, context);
  }

  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec,
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as Ec2InstanceConfig;

    // Validate component name
    if (!spec.name || spec.name.length === 0) {
      errors.push('Component name is required');
    } else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
    }

    // Validate instance type
    if (config?.instanceType) {
      const validInstanceTypes = [
        't3.micro', 't3.small', 't3.medium', 't3.large', 't3.xlarge', 't3.2xlarge',
        'm5.large', 'm5.xlarge', 'm5.2xlarge', 'm5.4xlarge', 'm5.8xlarge',
        'c5.large', 'c5.xlarge', 'c5.2xlarge', 'c5.4xlarge',
        'r5.large', 'r5.xlarge', 'r5.2xlarge'
      ];

      if (!validInstanceTypes.includes(config.instanceType)) {
        errors.push(`Invalid instance type: ${config.instanceType}. Must be one of: ${validInstanceTypes.join(', ')}`);
      }
    }

    // Validate AMI configuration
    if (config?.ami?.amiId && !/^ami-[a-f0-9]{8,17}$/.test(config.ami.amiId)) {
      errors.push('AMI ID must be in format ami-xxxxxxxxxxxxxxxxx');
    }

    // Validate VPC configuration
    if (config?.vpc?.vpcId && !/^vpc-[a-f0-9]{8,17}$/.test(config.vpc.vpcId)) {
      errors.push('VPC ID must be in format vpc-xxxxxxxxxxxxxxxxx');
    }

    if (config?.vpc?.subnetId && !/^subnet-[a-f0-9]{8,17}$/.test(config.vpc.subnetId)) {
      errors.push('Subnet ID must be in format subnet-xxxxxxxxxxxxxxxxx');
    }

    // Validate storage configuration
    if (config?.storage?.rootVolumeSize) {
      if (config.storage.rootVolumeSize < 8 || config.storage.rootVolumeSize > 16384) {
        errors.push('Root volume size must be between 8 GB and 16384 GB');
      }
    }

    if (config?.storage?.rootVolumeType) {
      const validVolumeTypes = ['gp2', 'gp3', 'io1', 'io2'];
      if (!validVolumeTypes.includes(config.storage.rootVolumeType)) {
        errors.push(`Invalid volume type: ${config.storage.rootVolumeType}. Must be one of: ${validVolumeTypes.join(', ')}`);
      }
    }

    // Validate security configuration
    if (config?.security?.httpTokens && !['optional', 'required'].includes(config.security.httpTokens)) {
      errors.push('httpTokens must be either "optional" or "required"');
    }

    // Environment-specific validations
    if (context.environment === 'prod') {
      if (!config?.monitoring?.detailed) {
        errors.push('Detailed monitoring must be enabled in production environment');
      }

      if (context.complianceFramework === 'fedramp-moderate' || context.complianceFramework === 'fedramp-high') {
        if (!config?.storage?.encrypted) {
          errors.push('EBS encryption must be enabled for FedRAMP compliance');
        }

        if (!config?.security?.requireImdsv2) {
          errors.push('IMDSv2 must be required for FedRAMP compliance');
        }
      }
    }

    // Compliance framework validations
    if (context.complianceFramework === 'fedramp-high') {
      if (!config?.security?.nitroEnclaves) {
        errors.push('Nitro Enclaves must be enabled for FedRAMP High compliance');
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
      'compute:ec2-instance',
      'monitoring:ec2-instance'
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