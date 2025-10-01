/**
 * Unit tests for Deployment Bundle Pipeline Builder
 */

import { DeploymentBundlePipelineBuilder } from '../../src/deployment-bundle-pipeline.builder.js';
import { DeploymentBundleConfig } from '../../src/types.js';

describe('DeploymentBundlePipelineBuilder', () => {
  let builder: DeploymentBundlePipelineBuilder;
  let context: any;
  let spec: any;

  // Helper function to create builder with proper constructor signature
  const createBuilder = (ctx: any, spc: any) => {
    const builderContext = { context: ctx, spec: spc };
    const schema = {
      type: 'object',
      properties: {},
      required: []
    };
    return new DeploymentBundlePipelineBuilder(builderContext, schema);
  };

  beforeEach(() => {
    context = {
      account: '123456789012',
      region: 'us-east-1',
      environment: 'dev',
      complianceFramework: 'commercial'
    };

    spec = {
      service: 'test-service',
      versionTag: '1.0.0',
      artifactoryHost: 'artifactory.test.com',
      ociRepoBundles: 'artifactory.test.com/bundles'
    };

    builder = createBuilder(context, spec);
  });

  describe('Configuration Precedence', () => {
    it('should merge configurations in correct precedence order', () => {
      const config = builder.buildSync();

      // Component override should take precedence
      expect(config.service).toBe('test-service');
      expect(config.versionTag).toBe('1.0.0');

      // Environment defaults should be applied
      expect(config.environment).toBe('dev');

      // Platform defaults should be applied
      expect(config.artifactoryHost).toBe('artifactory.test.com');
    });

    it('should use component override over environment defaults', () => {
      const specWithOverride = {
        ...spec,
        environment: 'prod',
        signing: {
          keyless: false,
          kmsKeyId: 'kms://aws-kms/alias/test-key'
        }
      };

      const builderWithOverride = createBuilder(context, specWithOverride);
      const config = builderWithOverride.buildSync();

      expect(config.environment).toBe('prod');
      expect(config.signing?.keyless).toBe(false);
      expect(config.signing?.kmsKeyId).toBe('kms://aws-kms/alias/test-key');
    });

    it('should use environment defaults when no override provided', () => {
      const config = builder.buildSync();

      expect(config.environment).toBe('dev');
      expect(config.signing?.keyless).toBe(true);
    });

    it('should use platform defaults when no environment override', () => {
      const config = builder.buildSync();

      expect(config.artifactoryHost).toBe('artifactory.test.com');
      expect(config.ociRepoBundles).toBe('artifactory.test.com/bundles');
    });

    it('should use hardcoded fallbacks when no other defaults', () => {
      const config = builder.buildSync();

      expect(config.complianceFramework).toBe('commercial');
      expect(config.security?.failOnCritical).toBe(true);
      expect(config.bundle?.includeCdkOutput).toBe(true);
    });
  });

  describe('Compliance Framework Defaults', () => {
    it('should apply commercial defaults', () => {
      const config = builder.buildSync();

      expect(config.complianceFramework).toBe('commercial');
      expect(config.signing?.keyless).toBe(true);
      expect(config.runner?.fipsMode).toBe(false);
    });

    it('should apply FedRAMP Moderate defaults', () => {
      const fedrampContext = {
        ...context,
        complianceFramework: 'fedramp-moderate'
      };

      const fedrampBuilder = createBuilder(fedrampContext, spec);
      const config = fedrampBuilder.buildSync();

      expect(config.complianceFramework).toBe('fedramp-moderate');
      expect(config.signing?.keyless).toBe(false);
      expect(config.signing?.kmsKeyId).toBe('kms://aws-kms/alias/platform-cosign-fedramp-moderate');
      expect(config.runner?.fipsMode).toBe(true);
    });

    it('should apply FedRAMP High defaults', () => {
      const fedrampHighContext = {
        ...context,
        complianceFramework: 'fedramp-high'
      };

      const fedrampHighBuilder = createBuilder(fedrampHighContext, spec);
      const config = fedrampHighBuilder.buildSync();

      expect(config.complianceFramework).toBe('fedramp-high');
      expect(config.signing?.keyless).toBe(false);
      expect(config.signing?.kmsKeyId).toBe('kms://aws-kms/alias/platform-cosign-fedramp-high');
      expect(config.runner?.fipsMode).toBe(true);
    });

    it('should apply ISO 27001 defaults', () => {
      const isoContext = {
        ...context,
        complianceFramework: 'iso27001'
      };

      const isoBuilder = createBuilder(isoContext, spec);
      const config = isoBuilder.buildSync();

      expect(config.complianceFramework).toBe('iso27001');
      expect(config.signing?.keyless).toBe(false);
      expect(config.signing?.kmsKeyId).toBe('kms://aws-kms/alias/platform-cosign-iso27001');
    });

    it('should apply SOC 2 defaults', () => {
      const soc2Context = {
        ...context,
        complianceFramework: 'soc2'
      };

      const soc2Builder = createBuilder(soc2Context, spec);
      const config = soc2Builder.buildSync();

      expect(config.complianceFramework).toBe('soc2');
      expect(config.signing?.keyless).toBe(false);
      expect(config.signing?.kmsKeyId).toBe('kms://aws-kms/alias/platform-cosign-soc2');
    });
  });

  describe('Environment Defaults', () => {
    it('should apply dev environment defaults', () => {
      const devContext = { ...context, environment: 'dev' };
      const devBuilder = createBuilder(devContext, spec);
      const config = devBuilder.buildSync();

      expect(config.environment).toBe('dev');
      expect(config.signing?.keyless).toBe(true);
    });

    it('should apply staging environment defaults', () => {
      const stagingContext = { ...context, environment: 'staging' };
      const stagingBuilder = createBuilder(stagingContext, spec);
      const config = stagingBuilder.buildSync();

      expect(config.environment).toBe('staging');
      expect(config.signing?.keyless).toBe(false);
      expect(config.signing?.kmsKeyId).toBe('kms://aws-kms/alias/platform-cosign-staging');
    });

    it('should apply prod environment defaults', () => {
      const prodContext = { ...context, environment: 'prod' };
      const prodBuilder = createBuilder(prodContext, spec);
      const config = prodBuilder.buildSync();

      expect(config.environment).toBe('prod');
      expect(config.signing?.keyless).toBe(false);
      expect(config.signing?.kmsKeyId).toBe('kms://aws-kms/alias/platform-cosign-prod');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required fields', () => {
      const invalidSpec = {
        service: 'test-service'
        // missing versionTag and artifactoryHost
      };

      const invalidBuilder = createBuilder(context, invalidSpec);

      expect(() => {
        invalidBuilder.buildSync();
      }).toThrow();
    });

    it('should validate service name format', () => {
      const invalidSpec = {
        ...spec,
        service: 'Invalid Service Name!'
      };

      const invalidBuilder = createBuilder(context, invalidSpec);

      expect(() => {
        invalidBuilder.buildSync();
      }).toThrow('Service name must contain only lowercase letters, numbers, and hyphens');
    });

    it('should validate version tag format', () => {
      const invalidSpec = {
        ...spec,
        versionTag: 'invalid@version#tag'
      };

      const invalidBuilder = createBuilder(context, invalidSpec);

      expect(() => {
        invalidBuilder.buildSync();
      }).toThrow('Version tag contains invalid characters');
    });

    it('should validate Artifactory host URL', () => {
      const invalidSpec = {
        ...spec,
        artifactoryHost: 'invalid-url'
      };

      const invalidBuilder = createBuilder(context, invalidSpec);

      expect(() => {
        invalidBuilder.buildSync();
      }).toThrow('Invalid Artifactory host URL');
    });

    it('should validate signing configuration', () => {
      const invalidSpec = {
        ...spec,
        signing: {
          keyless: true,
          kmsKeyId: 'kms://aws-kms/alias/test-key'
        }
      };

      const invalidBuilder = createBuilder(context, invalidSpec);

      expect(() => {
        invalidBuilder.buildSync();
      }).toThrow('Cannot use both keyless and KMS-based signing');
    });

    it('should validate KMS key ID format', () => {
      const invalidSpec = {
        ...spec,
        signing: {
          keyless: false,
          kmsKeyId: 'invalid-key-id'
        }
      };

      const invalidBuilder = createBuilder(context, invalidSpec);

      expect(() => {
        invalidBuilder.buildSync();
      }).toThrow('KMS key ID must start with kms://');
    });

    it('should validate compliance framework', () => {
      const invalidSpec = {
        ...spec,
        complianceFramework: 'invalid-framework'
      };

      const invalidBuilder = createBuilder(context, invalidSpec);

      expect(() => {
        invalidBuilder.buildSync();
      }).toThrow('Invalid compliance framework');
    });

    it('should validate environment', () => {
      const invalidContext = {
        ...context,
        environment: 'invalid-env'
      };

      const invalidBuilder = createBuilder(invalidContext, spec);

      expect(() => {
        invalidBuilder.buildSync();
      }).toThrow('Invalid environment');
    });

    it('should validate security configuration types', () => {
      const invalidSpec = {
        ...spec,
        security: {
          failOnCritical: 'true', // should be boolean
          onlyFixed: 'false',     // should be boolean
          addCpesIfNone: 'true'   // should be boolean
        }
      };

      const invalidBuilder = createBuilder(context, invalidSpec);

      expect(() => {
        invalidBuilder.buildSync();
      }).toThrow();
    });

    it('should validate bundle configuration types', () => {
      const invalidSpec = {
        ...spec,
        bundle: {
          includeCdkOutput: 'true',    // should be boolean
          includeTestReports: 'false', // should be boolean
          includeCoverage: 'true',     // should be boolean
          includePolicyReports: 'false' // should be boolean
        }
      };

      const invalidBuilder = createBuilder(context, invalidSpec);

      expect(() => {
        invalidBuilder.buildSync();
      }).toThrow();
    });

    it('should validate runner configuration types', () => {
      const invalidSpec = {
        ...spec,
        runner: {
          image: 123,           // should be string
          nodeVersion: 456,     // should be string
          fipsMode: 'true'      // should be boolean
        }
      };

      const invalidBuilder = createBuilder(context, invalidSpec);

      expect(() => {
        invalidBuilder.buildSync();
      }).toThrow();
    });
  });

  describe('Hardcoded Fallbacks', () => {
    it('should provide secure defaults for all critical settings', () => {
      const fallbacks = builder.getHardcodedFallbacks();

      expect(fallbacks.environment).toBe('dev');
      expect(fallbacks.complianceFramework).toBe('commercial');
      expect(fallbacks.signing?.keyless).toBe(true);
      expect(fallbacks.security?.failOnCritical).toBe(true);
      expect(fallbacks.bundle?.includeCdkOutput).toBe(true);
      expect(fallbacks.runner?.fipsMode).toBe(false);
    });
  });

  describe('Compliance Framework Defaults', () => {
    it('should provide framework-specific defaults', () => {
      const frameworkDefaults = builder.getComplianceFrameworkDefaults();

      expect(frameworkDefaults).toHaveProperty('commercial');
      expect(frameworkDefaults).toHaveProperty('fedramp-moderate');
      expect(frameworkDefaults).toHaveProperty('fedramp-high');
      expect(frameworkDefaults).toHaveProperty('iso27001');
      expect(frameworkDefaults).toHaveProperty('soc2');
    });

    it('should have stricter defaults for regulated frameworks', () => {
      const frameworkDefaults = builder.getComplianceFrameworkDefaults();

      // FedRAMP should use KMS signing
      expect(frameworkDefaults['fedramp-moderate'].signing?.keyless).toBe(false);
      expect(frameworkDefaults['fedramp-high'].signing?.keyless).toBe(false);

      // FedRAMP should enable FIPS mode
      expect(frameworkDefaults['fedramp-moderate'].runner?.fipsMode).toBe(true);
      expect(frameworkDefaults['fedramp-high'].runner?.fipsMode).toBe(true);
    });
  });

  describe('Platform Defaults', () => {
    it('should use environment variables when available', () => {
      const originalEnv = process.env.ARTIFACTORY_HOST;
      process.env.ARTIFACTORY_HOST = 'env.artifactory.test.com';

      const platformDefaults = builder.getPlatformDefaults();

      expect(platformDefaults.artifactoryHost).toBe('env.artifactory.test.com');

      // Restore original value
      if (originalEnv) {
        process.env.ARTIFACTORY_HOST = originalEnv;
      } else {
        delete process.env.ARTIFACTORY_HOST;
      }
    });
  });

  describe('Environment Defaults', () => {
    it('should provide environment-specific defaults', () => {
      const envDefaults = builder.getEnvironmentDefaults();

      expect(envDefaults).toHaveProperty('dev');
      expect(envDefaults).toHaveProperty('staging');
      expect(envDefaults).toHaveProperty('prod');
    });

    it('should use more secure defaults for production', () => {
      const prodContext = { ...context, environment: 'prod' };
      const prodBuilder = createBuilder(prodContext, spec);
      const envDefaults = prodBuilder.getEnvironmentDefaults();

      expect(envDefaults.environment).toBe('prod');
      expect(envDefaults.signing?.keyless).toBe(false);
    });
  });
});
