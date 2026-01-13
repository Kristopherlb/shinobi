import { DaggerConfig } from './types.js';
import { ConfigBuilder } from '@shinobi/core';

/**
 * Builder merges configuration using the platform precedence chain:
 * platform defaults → compliance defaults → environment map → component overrides.
 */
export class DaggerConfigBuilder extends ConfigBuilder<DaggerConfig> {
  private acc: Partial<DaggerConfig> = {};

  withPlatformDefaults(): this {
    this.merge({
      fipsMode: true,
      instanceType: 'c7i.large',
      daggerVersion: '0.9.0',
      storage: { cache: 'EBS', ebsGiB: 200 },
      endpoint: { nlbInternal: true },
      observability: { logRetentionDays: 365 },
      featureFlags: { sharedCacheEfs: false, enableEcrMirror: false },
      compliance: { forbidPublicExposure: true, forbidNonFipsAmi: true, forbidNoKms: true }
    });
    return this;
  }

  withComplianceDefaults(framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high'): this {
    // Deprecated: Use highRiskEnvironment flag instead
    // This method is kept for backward compatibility but should use risk flags
    const isHighRisk = framework !== 'commercial';
    if (isHighRisk) {
      this.merge({
        highRiskEnvironment: true,
        fipsMode: true,
        compliance: { forbidPublicExposure: true, forbidNoKms: true, forbidNonFipsAmi: true }
      });
    }
    return this;
  }

  withEnvironment(env: { vpcId?: string; otlpEndpoint?: string; kmsKeyRef?: string }): this {
    this.merge({
      observability: { ...(this.acc.observability ?? {}), otlpEndpoint: env.otlpEndpoint }
    });
    return this;
  }

  withOverrides(overrides?: Partial<DaggerConfig>): this {
    if (overrides) this.merge(overrides);
    return this;
  }

  build(): DaggerConfig {
    // Minimal validation here; deep compliance is enforced by policy in the component.
    const cfg = this.acc as DaggerConfig;
    if (!cfg.capacity) throw new Error('capacity is required');
    if (!cfg.fipsMode && cfg.compliance?.forbidNonFipsAmi) {
      throw new Error('FIPS mode is required when forbidNonFipsAmi is enabled');
    }
    return cfg;
  }

  // Required ConfigBuilder methods
  getHardcodedFallbacks(): Partial<DaggerConfig> {
    return {
      fipsMode: true,
      instanceType: 'c7i.large',
      daggerVersion: '0.9.0',
      storage: { cache: 'EBS', ebsGiB: 200 },
      endpoint: { nlbInternal: true },
      observability: { logRetentionDays: 365 },
      featureFlags: { sharedCacheEfs: false, enableEcrMirror: false },
      compliance: { forbidPublicExposure: true, forbidNonFipsAmi: true, forbidNoKms: true }
    };
  }

  /**
   * Layer 2: Compliance Framework Defaults
   * 
   * Provides sensible defaults based on risk assessment flags rather than framework checks.
   * High-risk environment defaults can be set via:
   * - Platform config files (`/config/{framework}.yml`) setting `highRiskEnvironment: true`
   * - Service-level configuration in `service.yml`
   * - Environment defaults
   * 
   * This ensures configuration is data-driven and risk-based, not framework-dependent.
   */
  protected getComplianceFrameworkDefaults(): Partial<DaggerConfig> {
    // Check if highRiskEnvironment flag is set in component config or platform config
    const componentConfig = this.builderContext.spec.config as Partial<DaggerConfig> | undefined;
    let isHighRisk = componentConfig?.highRiskEnvironment ?? false;
    
    // Also check platform config if available (loaded by base class)
    try {
      const platformConfig = (this as any)._loadPlatformConfiguration();
      if (platformConfig?.highRiskEnvironment) {
        isHighRisk = true;
      }
    } catch {
      // Platform config might not be available in tests, ignore
    }
    
    if (isHighRisk) {
      // Apply enhanced security defaults for high-risk environments
      // These defaults align with FedRAMP Moderate/High requirements when highRiskEnvironment is set
      return {
        fipsMode: true,
        compliance: { forbidPublicExposure: true, forbidNoKms: true, forbidNonFipsAmi: true }
      };
    }
    
    return {
      compliance: { forbidPublicExposure: true, forbidNoKms: true }
    };
  }

  private merge(partial: Partial<DaggerConfig>) {
    this.acc = deepMerge(this.acc, partial);
  }
}

function deepMerge<T>(base: Partial<T>, patch: Partial<T>): Partial<T> {
  const out: any = { ...(base ?? {}) };
  for (const [k, v] of Object.entries(patch ?? {})) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = deepMerge((out[k] as any) ?? {}, v as any);
    } else {
      out[k] = v;
    }
  }
  return out;
}
