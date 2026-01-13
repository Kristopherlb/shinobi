/**
 * Unit tests for Deployment Bundle Pipeline Builder with the new ConfigBuilder integration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DeploymentBundlePipelineBuilder } from '../../src/deployment-bundle-pipeline.builder';
import { DeploymentBundleConfig } from '../../src/types.js';

const baseContext = {
  account: '123456789012',
  region: 'us-east-1',
  environment: 'dev',
  complianceFramework: 'commercial'
};

const baseSpec = {
  type: 'deployment-bundle-pipeline',
  name: 'deployment-bundle',
  config: {
    service: 'test-service',
    versionTag: '1.0.0',
    artifactoryHost: 'artifactory.test.com',
    ociRepoBundles: 'artifactory.test.com/bundles'
  }
};

const createBuilder = (ctx = baseContext, spec = baseSpec) => {
  return new DeploymentBundlePipelineBuilder(ctx, spec as any);
};

describe('DeploymentBundlePipelineBuilder', () => {
  let builder: DeploymentBundlePipelineBuilder;
  let platformConfigSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    platformConfigSpy = vi
      .spyOn(DeploymentBundlePipelineBuilder.prototype as any, '_loadPlatformConfiguration')
      .mockReturnValue({ defaults: { 'deployment-bundle-pipeline': {} } });

    builder = createBuilder();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Configuration precedence', () => {
    it('merges component overrides with defaults', () => {
      const config = builder.buildSync();

      expect(config.service).toBe('test-service');
      expect(config.environment).toBe('dev');
      expect(config.versionTag).toBe('1.0.0');
      expect(config.artifactoryHost).toBe('artifactory.test.com');
      expect(config.complianceFramework).toBe('commercial');
      expect(config.signing?.keyless).toBe(true);
    });

    it('applies compliance-specific overrides', () => {
      const fedrampBuilder = createBuilder({ ...baseContext, complianceFramework: 'fedramp-high' });
      const config = fedrampBuilder.buildSync();

      expect(config.complianceFramework).toBe('fedramp-high');
      expect(config.signing?.keyless).toBe(false);
      expect(config.signing?.kmsKeyId).toBe('kms://aws-kms/alias/platform-cosign-fedramp-high');
      expect(config.runner?.fipsMode).toBe(true);
    });

    it('respects component overrides for signing configuration', () => {
      const spec = {
        ...baseSpec,
        config: {
          ...baseSpec.config,
          signing: {
            keyless: false,
            kmsKeyId: 'kms://aws-kms/alias/custom'
          }
        }
      };

      const overrideBuilder = createBuilder(baseContext, spec);
      const config = overrideBuilder.buildSync();

      expect(config.signing?.keyless).toBe(false);
      expect(config.signing?.kmsKeyId).toBe('kms://aws-kms/alias/custom');
    });
  });

  describe('Environment defaults', () => {
    it('exposes defaults for all supported environments', () => {
      const envDefaults = builder.getEnvironmentDefaults();

      expect(envDefaults.dev).toBeDefined();
      expect(envDefaults.staging).toBeDefined();
      expect(envDefaults.prod).toBeDefined();
    });

    it('applies production defaults when environment is prod', () => {
      const prodBuilder = createBuilder({ ...baseContext, environment: 'prod' });
      const config = prodBuilder.buildSync();

      expect(config.environment).toBe('prod');
      expect(config.signing?.keyless).toBe(false);
      expect(config.signing?.kmsKeyId).toBe('kms://aws-kms/alias/platform-cosign-prod');
    });
  });

  describe('Validation', () => {
    it('throws if required fields are missing', () => {
      const invalidSpec = {
        type: 'deployment-bundle-pipeline',
        name: 'invalid-bundle',
        config: {
          versionTag: '1.0.0',
          artifactoryHost: 'artifactory.test.com',
          ociRepoBundles: 'artifactory.test.com/bundles'
        }
      };

      const invalidBuilder = createBuilder(baseContext, invalidSpec);
      expect(() => invalidBuilder.buildSync()).toThrow('Service name is required');
    });

    it('throws when signing configuration is inconsistent', () => {
      const invalidSpec = {
        ...baseSpec,
        config: {
          ...baseSpec.config,
          signing: {
            keyless: true,
            kmsKeyId: 'kms://aws-kms/alias/should-not-exist'
          }
        }
      };

      const invalidBuilder = createBuilder(baseContext, invalidSpec);
      expect(() => invalidBuilder.buildSync()).toThrow('Cannot use both keyless and KMS-based signing');
    });

    it('throws when environment value is invalid', () => {
      const invalidBuilder = createBuilder({ ...baseContext, environment: 'qa' });
      expect(() => invalidBuilder.buildSync()).toThrow('Invalid environment');
    });

    it('throws when compliance framework is unknown', () => {
      const invalidContext = { ...baseContext, complianceFramework: 'unknown' };
      const invalidBuilder = createBuilder(invalidContext);
      expect(() => invalidBuilder.buildSync()).toThrow('Invalid compliance framework');
    });
  });

  describe('Hardcoded fallbacks', () => {
    it('provide secure defaults', () => {
      const fallbacks = builder.getHardcodedFallbacks();

      expect(fallbacks.environment).toBe('dev');
      expect(fallbacks.complianceFramework).toBe('commercial');
      expect(fallbacks.security?.failOnCritical).toBe(true);
      expect(fallbacks.bundle?.includeCdkOutput).toBe(true);
    });
  });
});
