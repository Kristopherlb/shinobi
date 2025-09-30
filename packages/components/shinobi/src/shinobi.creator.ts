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
  IComponent,
  IComponentCreator
} from '@shinobi/core';
import { ShinobiComponent } from './shinobi.component';
import {
  ShinobiComponentConfigBuilder,
  ShinobiConfig,
  SHINOBI_CONFIG_SCHEMA
} from './shinobi.builder';

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
  ): IComponent {
    return new ShinobiComponent(scope, spec.name, context, spec);
  }
  
  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec,
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as Partial<ShinobiConfig> | undefined;

    const toNumber = (value: number | string | undefined): number | undefined => {
      if (value === undefined || value === null) {
        return undefined;
      }
      const numeric = typeof value === 'string' ? Number(value) : value;
      return Number.isFinite(numeric) ? numeric : undefined;
    };

    let resolvedConfig: ShinobiConfig | undefined;
    try {
      const builder = new ShinobiComponentConfigBuilder({ context, spec });
      resolvedConfig = builder.buildSync();
    } catch (error) {
      errors.push(`Unable to resolve Shinobi configuration: ${(error as Error).message}`);
    }

    // Validate component name
    if (!spec.name || spec.name.length === 0) {
      errors.push('Component name is required');
    } else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
    }

    const computeConfig = resolvedConfig?.compute ?? config?.compute;
    if (computeConfig) {
      const cpu = toNumber(computeConfig.cpu);
      if (cpu !== undefined && (cpu < 256 || cpu > 4096)) {
        errors.push('CPU must be between 256 and 4096 units');
      }

      const memory = toNumber(computeConfig.memory);
      if (memory !== undefined && (memory < 512 || memory > 8192)) {
        errors.push('Memory must be between 512 and 8192 MB');
      }

      const taskCount = toNumber(computeConfig.taskCount);
      if (taskCount !== undefined && (taskCount < 1 || taskCount > 10)) {
        errors.push('Task count must be between 1 and 10');
      }
    }

    const apiConfig = resolvedConfig?.api ?? config?.api;
    if (apiConfig?.rateLimit) {
      const requestsPerMinute = toNumber(apiConfig.rateLimit.requestsPerMinute);
      if (requestsPerMinute !== undefined && requestsPerMinute < 100) {
        errors.push('Rate limit must be at least 100 requests per minute');
      }

      const burstCapacity = toNumber(apiConfig.rateLimit.burstCapacity);
      if (burstCapacity !== undefined && requestsPerMinute !== undefined && burstCapacity < requestsPerMinute) {
        errors.push('Burst capacity must be greater than or equal to requests per minute');
      }
    }

    const dataSourcesConfig = resolvedConfig?.dataSources ?? config?.dataSources;
    if (dataSourcesConfig) {
      const enabledSources = Object.values(dataSourcesConfig).filter(Boolean).length;
      if (enabledSources === 0) {
        errors.push('At least one data source must be enabled');
      }
    }

    const featureFlagsConfig = resolvedConfig?.featureFlags ?? config?.featureFlags;
    if (featureFlagsConfig?.enabled && !featureFlagsConfig.provider) {
      errors.push('Feature flag provider must be specified when feature flags are enabled');
    }

    if (context.environment === 'prod') {
      if (!resolvedConfig?.observability?.alerts?.enabled && !config?.observability?.alerts?.enabled) {
        errors.push('Observability alerts must be enabled in production environment');
      }

      if (apiConfig?.exposure === 'public' && !apiConfig.loadBalancer?.certificateArn) {
        errors.push('SSL certificate must be provided for public API exposure in production');
      }

      const auditLogging = resolvedConfig?.compliance?.auditLogging ?? config?.compliance?.auditLogging;
      if (auditLogging !== true) {
        errors.push('Audit logging must be enabled in production environment');
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
