// src/platform/contracts/components/base-component.ts
// Abstract base component class for all Shinobi components

import { IComponent, CapabilityData, ComplianceFramework } from '../bindings';
import { ComponentContext } from './component-context';
import { ComponentConfigBuilder } from './component-config-builder';

/**
 * Abstract base component class
 * All Shinobi components must extend this class
 */
export abstract class BaseComponent implements IComponent {
  protected config: Record<string, any>;
  protected context: ComponentContext;
  protected configBuilder: ComponentConfigBuilder;

  constructor(config: Record<string, any>, context: ComponentContext) {
    this.config = config;
    this.context = context;
    this.configBuilder = new ComponentConfigBuilder();
  }

  /**
   * Get component name (must be implemented by subclasses)
   */
  abstract getName(): string;

  /**
   * Get component ID (must be implemented by subclasses)
   */
  abstract getId(): string;

  /**
   * Get component type (must be implemented by subclasses)
   */
  abstract getType(): string;

  /**
   * Get component capability data (must be implemented by subclasses)
   */
  abstract getCapabilityData(): CapabilityData;

  /**
   * Get service name from context
   */
  getServiceName(): string {
    return this.context.serviceName;
  }

  /**
   * Synthesize CDK constructs (must be implemented by subclasses)
   */
  abstract synth(): void;

  /**
   * Get component configuration
   */
  getConfig(): Record<string, any> {
    return { ...this.config };
  }

  /**
   * Get component context
   */
  getContext(): ComponentContext {
    return { ...this.context };
  }

  /**
   * Get compliance framework
   */
  getComplianceFramework(): ComplianceFramework {
    return this.context.complianceFramework;
  }

  /**
   * Get environment name
   */
  getEnvironment(): string {
    return this.context.environment;
  }

  /**
   * Get AWS region
   */
  getRegion(): string {
    return this.context.region;
  }

  /**
   * Get AWS account ID
   */
  getAccountId(): string {
    return this.context.accountId;
  }

  /**
   * Get component tags
   */
  getTags(): Record<string, string> {
    const baseTags = {
      Service: this.context.serviceName,
      Environment: this.context.environment,
      ManagedBy: 'Shinobi',
      Component: this.getType()
    };

    // Merge with context tags
    return { ...baseTags, ...this.context.tags };
  }

  /**
   * Get component metadata
   */
  getMetadata(): Record<string, any> {
    return {
      type: this.getType(),
      serviceName: this.getServiceName(),
      environment: this.getEnvironment(),
      complianceFramework: this.getComplianceFramework(),
      region: this.getRegion(),
      accountId: this.getAccountId(),
      config: this.getConfig(),
      tags: this.getTags()
    };
  }

  /**
   * Validate component configuration
   */
  public validateConfig(): void {
    // Basic validation - can be overridden by subclasses
    if (!this.config) {
      throw new Error('Component configuration is required');
    }
    if (!this.context) {
      throw new Error('Component context is required');
    }
    if (!this.context.serviceName) {
      throw new Error('Service name is required in context');
    }
    if (!this.context.environment) {
      throw new Error('Environment is required in context');
    }
    if (!this.context.complianceFramework) {
      throw new Error('Compliance framework is required in context');
    }
  }

  /**
   * Apply compliance-specific configuration
   */
  protected applyComplianceConfig(): void {
    const framework = this.getComplianceFramework();

    switch (framework) {
      case 'commercial':
        this.applyCommercialConfig();
        break;
      case 'fedramp-moderate':
        this.applyFedrampModerateConfig();
        break;
      case 'fedramp-high':
        this.applyFedrampHighConfig();
        break;
      default:
        throw new Error(`Unsupported compliance framework: ${framework}`);
    }
  }

  /**
   * Apply commercial compliance configuration
   * Can be overridden by subclasses
   */
  protected applyCommercialConfig(): void {
    // Default commercial configuration
    // Subclasses can override for specific requirements
  }

  /**
   * Apply FedRAMP Moderate compliance configuration
   * Can be overridden by subclasses
   */
  protected applyFedrampModerateConfig(): void {
    // Default FedRAMP Moderate configuration
    // Subclasses can override for specific requirements
  }

  /**
   * Apply FedRAMP High compliance configuration
   * Can be overridden by subclasses
   */
  protected applyFedrampHighConfig(): void {
    // Default FedRAMP High configuration
    // Subclasses can override for specific requirements
  }

  /**
   * Get configuration value with fallback
   */
  protected getConfigValue<T>(key: string, defaultValue: T): T {
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }

  /**
   * Get nested configuration value with fallback
   */
  protected getNestedConfigValue<T>(path: string, defaultValue: T): T {
    const keys = path.split('.');
    let value: any = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value !== undefined ? value : defaultValue;
  }

  /**
   * Check if configuration key exists
   */
  protected hasConfigKey(key: string): boolean {
    return key in this.config;
  }

  /**
   * Check if nested configuration key exists
   */
  protected hasNestedConfigKey(path: string): boolean {
    const keys = path.split('.');
    let value: any = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return false;
      }
    }

    return true;
  }
}
