// src/platform/contracts/components/base-component.ts
// Abstract base component class for all Shinobi components

import type { IComponent, CapabilityData } from '../bindings.ts';
import type { ComponentContext } from '../component-interfaces.ts';
import { ComponentConfigBuilder } from './component-config-builder.ts';

/**
 * Abstract base component class
 * All Shinobi components must extend this class
 */

export type { ComponentContext, IComponent };
export abstract class BaseComponent {
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
  getComplianceFramework(): string | undefined {
    return this.context.complianceFramework as unknown as string | undefined;
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
    return this.context.region || '';
  }

  /**
   * Get AWS account ID
   */
  getAccountId(): string {
    return this.context.accountId || '';
  }

  /**
   * Get component tags (manifest/config-driven, no framework branching)
   */
  getTags(): Record<string, string> {
    const tags: Record<string, string> = {
      Service: this.context.serviceName,
      Environment: this.context.environment
    };
    if (this.context.owner) tags.Owner = this.context.owner;
    // Merge any custom tags from context
    if (this.context.tags) {
      Object.assign(tags, this.context.tags);
    }
    return tags;
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
    // No requirement for specific compliance framework
  }

  /**
   * Apply configuration provided by manifest/spec (no framework switching)
   */
  protected applyConfig(configOverrides?: Record<string, any>): void {
    if (!configOverrides) return;
    this.config = { ...this.config, ...configOverrides };
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

  // All compliance enforcement removed; components are configured purely via manifest/config
}
