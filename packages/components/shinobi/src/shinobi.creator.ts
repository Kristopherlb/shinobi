/**
 * Creator for ShinobiComponent Component
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
import { ShinobiComponent } from './shinobi.component';
import { ShinobiConfig, SHINOBI_CONFIG_SCHEMA } from './shinobi.component';

/**
 * Creator class for ShinobiComponent component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class ShinobiComponentCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'shinobi';
  
  /**
   * Component display name
   */
  public readonly displayName = 'Shinobi Platform Intelligence Brain';
  
  /**
   * Component description
   */
  public readonly description = 'Production-grade Ops MCP Server that becomes the brain for SRE/DevOps/DPE/Developers and leadership. Delivers exceptional DX/UX from day one, runs locally and in AWS, and provides a clean runway to a drag-and-drop GUI that outputs platform L3 construct manifests.';
  
  /**
   * Component category for organization
   */
  public readonly category = 'intelligence';
  
  /**
   * AWS service this component manages
   */
  public readonly awsService = 'ECS';
  
  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'shinobi',
    'intelligence',
    'mcp-server',
    'platform-brain',
    'ops',
    'sre',
    'devops',
    'dpe',
    'observability',
    'compliance',
    'security',
    'qa',
    'executive',
    'aws',
    'ecs',
    'dynamodb',
    'feature-flags'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = SHINOBI_CONFIG_SCHEMA;
  
  /**
   * Factory method to create component instances
   */
  public createComponent(
    scope: Construct, 
    spec: ComponentSpec, 
    context: ComponentContext
  ): ShinobiComponent {
    return new ShinobiComponent(scope, spec, context);
  }
  
  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec, 
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as ShinobiConfig;
    
    // Validate component name
    if (!spec.name || spec.name.length === 0) {
      errors.push('Component name is required');
    } else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
    }
    
    // Validate compute configuration
    if (config?.compute) {
      if (config.compute.cpu && (config.compute.cpu < 256 || config.compute.cpu > 4096)) {
        errors.push('CPU must be between 256 and 4096 units');
      }
      
      if (config.compute.memory && (config.compute.memory < 512 || config.compute.memory > 8192)) {
        errors.push('Memory must be between 512 and 8192 MB');
      }
      
      if (config.compute.taskCount && (config.compute.taskCount < 1 || config.compute.taskCount > 10)) {
        errors.push('Task count must be between 1 and 10');
      }
    }
    
    // Validate API configuration
    if (config?.api) {
      if (config.api.exposure === 'public' && context.complianceFramework === 'fedramp-high') {
        errors.push('Public API exposure is not allowed in FedRAMP High environments');
      }
      
      if (config.api.rateLimit) {
        if (config.api.rateLimit.requestsPerMinute && config.api.rateLimit.requestsPerMinute < 100) {
          errors.push('Rate limit must be at least 100 requests per minute');
        }
        
        if (config.api.rateLimit.burstCapacity && config.api.rateLimit.burstCapacity < config.api.rateLimit.requestsPerMinute) {
          errors.push('Burst capacity must be greater than or equal to requests per minute');
        }
      }
    }
    
    // Validate data sources configuration
    if (config?.dataSources) {
      const enabledSources = Object.values(config.dataSources).filter(Boolean).length;
      if (enabledSources === 0) {
        errors.push('At least one data source must be enabled');
      }
    }
    
    // Validate feature flags configuration
    if (config?.featureFlags?.enabled) {
      if (!config.featureFlags.provider) {
        errors.push('Feature flag provider must be specified when feature flags are enabled');
      }
    }
    
    // Environment-specific validations
    if (context.environment === 'prod') {
      if (!config?.observability?.alerts?.enabled) {
        errors.push('Observability alerts must be enabled in production environment');
      }
      
      if (config?.api?.exposure === 'public' && !config.api.loadBalancer?.certificateArn) {
        errors.push('SSL certificate must be provided for public API exposure in production');
      }
      
      if (config?.compliance?.auditLogging !== true) {
        errors.push('Audit logging must be enabled in production environment');
      }
    }
    
    // Compliance-specific validations
    if (context.complianceFramework === 'fedramp-moderate' || context.complianceFramework === 'fedramp-high') {
      if (config?.logging?.retentionDays && config.logging.retentionDays < 90) {
        errors.push('Log retention must be at least 90 days for FedRAMP compliance');
      }
      
      if (config?.compliance?.securityLevel === 'standard') {
        errors.push('Security level must be enhanced or maximum for FedRAMP compliance');
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
      'api:rest',
      'container:ecs',
      'intelligence:platform',
      'observability:comprehensive',
      'compliance:monitoring',
      'security:scanning',
      'cost:optimization',
      'performance:profiling',
      'dependency:analysis',
      'change:impact',
      'feature:flags'
    ];
  }
  
  /**
   * Returns the capabilities this component requires from other components
   */
  public getRequiredCapabilities(): string[] {
    return [
      'vpc:network',
      'security:groups',
      'feature:flags:provider'
    ];
  }
  
  /**
   * Returns construct handles that will be registered by this component
   */
  public getConstructHandles(): string[] {
    return [
      'main',
      'cluster',
      'service',
      'taskDefinition',
      'repository',
      'dataTable',
      'loadBalancer',
      'logGroup',
      'eventRule'
    ];
  }
}
