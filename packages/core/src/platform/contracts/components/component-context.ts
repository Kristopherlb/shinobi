// src/platform/contracts/components/component-context.ts
// Component context for factory instantiation

import { ComplianceFramework } from '../bindings.ts';

/**
 * Component context containing environment and configuration data
 */
export interface ComponentContext {
  /**
   * Service name from manifest
   */
  serviceName: string;

  /**
   * Environment name (dev, staging, prod, etc.)
   */
  environment: string;

  /**
   * Compliance framework being used
   */
  complianceFramework: ComplianceFramework;

  /**
   * AWS region for deployment
   */
  region: string;

  /**
   * AWS account ID
   */
  accountId: string;

  /**
   * Service owner
   */
  owner?: string;

  /**
   * Component-specific metadata
   */
  metadata?: Record<string, any>;

  /**
   * Tags to apply to all resources
   */
  tags?: Record<string, string>;

  /**
   * Platform configuration overrides
   */
  platformConfig?: Record<string, any>;

  /**
   * OTEL collector endpoint for observability
   */
  otelCollectorEndpoint?: string;
}

/**
 * Builder for creating ComponentContext instances
 */
export class ComponentContextBuilder {
  private context: Partial<ComponentContext> = {};

  /**
   * Set service name
   */
  serviceName(name: string): this {
    this.context.serviceName = name;
    return this;
  }

  /**
   * Set environment
   */
  environment(env: string): this {
    this.context.environment = env;
    return this;
  }

  /**
   * Set compliance framework
   */
  complianceFramework(framework: ComplianceFramework): this {
    this.context.complianceFramework = framework;
    return this;
  }

  /**
   * Set AWS region
   */
  region(region: string): this {
    this.context.region = region;
    return this;
  }

  /**
   * Set AWS account ID
   */
  accountId(accountId: string): this {
    this.context.accountId = accountId;
    return this;
  }

  /**
   * Set service owner
   */
  owner(owner: string): this {
    this.context.owner = owner;
    return this;
  }

  /**
   * Set metadata
   */
  metadata(metadata: Record<string, any>): this {
    this.context.metadata = metadata;
    return this;
  }

  /**
   * Set tags
   */
  tags(tags: Record<string, string>): this {
    this.context.tags = tags;
    return this;
  }

  /**
   * Set platform configuration
   */
  platformConfig(config: Record<string, any>): this {
    this.context.platformConfig = config;
    return this;
  }

  /**
   * Build the component context
   */
  build(): ComponentContext {
    // Validate required fields
    if (!this.context.serviceName) {
      throw new Error('Service name is required');
    }
    if (!this.context.environment) {
      throw new Error('Environment is required');
    }
    if (!this.context.complianceFramework) {
      throw new Error('Compliance framework is required');
    }
    if (!this.context.region) {
      throw new Error('Region is required');
    }
    if (!this.context.accountId) {
      throw new Error('Account ID is required');
    }

    return this.context as ComponentContext;
  }
}
