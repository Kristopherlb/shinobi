import { DaggerConfig } from './types.ts';

/**
 * Builder merges configuration using the platform precedence chain:
 * platform defaults → compliance defaults → environment map → component overrides.
 */
export class DaggerConfigBuilder {
  private acc: Partial<DaggerConfig> = {};

  withPlatformDefaults(): this {
    this.merge({
      fipsMode: true,
      instanceType: 'c7i.large',
      storage: { cache: 'EBS', ebsGiB: 200 },
      endpoint: { nlbInternal: true },
      observability: { logRetentionDays: 365 },
      featureFlags: { sharedCacheEfs: false, enableEcrMirror: false },
      compliance: { forbidPublicExposure: true, forbidNonFipsAmi: true, forbidNoKms: true }
    });
    return this;
  }

  withComplianceDefaults(framework: 'commercial'|'fedramp-moderate'|'fedramp-high'): this {
    if (framework !== 'commercial') {
      this.merge({
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
