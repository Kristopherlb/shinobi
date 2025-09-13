/**
 * Creator for McpServerComponent Component
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
import { McpServerComponentComponent } from './mcp-server.component';
import { McpServerConfig, MCP_SERVER_CONFIG_SCHEMA } from './mcp-server.builder';

/**
 * Creator class for McpServerComponent component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class McpServerComponentCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'mcp-server';
  
  /**
   * Component display name
   */
  public readonly displayName = 'Mcp Server Component';
  
  /**
   * Component description
   */
  public readonly description = 'MCP Server Component';
  
  /**
   * Component category for organization
   */
  public readonly category = 'integration';
  
  /**
   * AWS service this component manages
   */
  public readonly awsService = 'ECS';
  
  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'mcp-server',
    'integration',
    'aws',
    'ecs'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = MCP_SERVER_CONFIG_SCHEMA;
  
  /**
   * Factory method to create component instances
   */
  public createComponent(
    scope: Construct, 
    spec: ComponentSpec, 
    context: ComponentContext
  ): McpServerComponentComponent {
    return new McpServerComponentComponent(scope, spec, context);
  }
  
  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec, 
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as McpServerConfig;
    
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
      'api:rest',
      'container:ecs',
      'integration:mcp-server',
      'monitoring:mcp-server'
    ];
  }
  
  /**
   * Returns the capabilities this component requires from other components
   */
  public getRequiredCapabilities(): string[] {
    return [
      'vpc:network',
      'security:groups'
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
      'loadBalancer'
    ];
  }
}