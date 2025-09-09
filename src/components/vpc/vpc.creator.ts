/**
 * Creator for VPC Component
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
import { VpcComponent } from './vpc.component';
import { VpcConfig, VPC_CONFIG_SCHEMA } from './vpc.builder';

/**
 * Creator class for VPC component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class VpcCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'vpc';
  
  /**
   * Component display name
   */
  public readonly displayName = 'VPC';
  
  /**
   * Component description
   */
  public readonly description = 'AWS Virtual Private Cloud (VPC) component for network isolation with compliance-aware configurations.';
  
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
    'vpc',
    'networking',
    'aws',
    'ec2',
    'virtual-private-cloud',
    'subnets',
    'nat-gateways',
    'flow-logs'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = VPC_CONFIG_SCHEMA;
  
  /**
   * Factory method to create component instances
   */
  public createComponent(
    scope: Construct, 
    spec: ComponentSpec, 
    context: ComponentContext
  ): VpcComponent {
    return new VpcComponent(scope, spec.name, context, spec);
  }
  
  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec, 
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as VpcConfig;
    
    // Validate component name
    if (!spec.name || spec.name.length === 0) {
      errors.push('Component name is required');
    } else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
    }
    
    // VPC-specific validations
    if (config?.cidr && !this.isValidCidr(config.cidr)) {
      errors.push('Invalid CIDR block format');
    }
    
    if (config?.maxAzs && (config.maxAzs < 2 || config.maxAzs > 6)) {
      errors.push('maxAzs must be between 2 and 6');
    }
    
    if (config?.natGateways && config.natGateways < 0) {
      errors.push('natGateways cannot be negative');
    }
    
    if (config?.flowLogRetentionDays && !this.isValidLogRetention(config.flowLogRetentionDays)) {
      errors.push('Invalid flow log retention period');
    }
    
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
      'net:vpc',
      'networking:vpc',
      'security:network-isolation'
    ];
  }
  
  /**
   * Returns the capabilities this component requires from other components
   */
  public getRequiredCapabilities(): string[] {
    return [
      // VPC component has no required capabilities - it provides fundamental networking
    ];
  }
  
  /**
   * Returns construct handles that will be registered by this component
   */
  public getConstructHandles(): string[] {
    return [
      'main',
      'vpc',
      'flowLogGroup',
      'flowLogRole'
    ];
  }

  /**
   * Validates CIDR block format
   */
  private isValidCidr(cidr: string): boolean {
    const cidrRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}\/[0-9]{1,2}$/;
    if (!cidrRegex.test(cidr)) return false;
    
    const [ip, prefix] = cidr.split('/');
    const prefixNum = parseInt(prefix, 10);
    
    // Validate prefix length
    if (prefixNum < 16 || prefixNum > 28) return false;
    
    // Validate IP octets
    const octets = ip.split('.').map(Number);
    return octets.every(octet => octet >= 0 && octet <= 255);
  }

  /**
   * Validates log retention days
   */
  private isValidLogRetention(days: number): boolean {
    const validRetentionDays = [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653];
    return validRetentionDays.includes(days);
  }
}