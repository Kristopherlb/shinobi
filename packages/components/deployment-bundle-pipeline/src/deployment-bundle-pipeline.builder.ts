/**
 * Configuration Builder for Deployment Bundle Pipeline Component
 * 
 * Handles configuration merging with 5-layer precedence and compliance defaults
 */

import { ConfigBuilder, ComponentConfigSchema, ComponentContext, ComponentSpec } from '@shinobi/core';
import configSchema from '../Config.schema.json' with { type: 'json' };
import { DeploymentBundleConfig } from './types.js';

const SUPPORTED_ENVIRONMENTS = ['dev', 'staging', 'prod'] as const;

export const DEPLOYMENT_BUNDLE_PIPELINE_CONFIG_SCHEMA = configSchema as ComponentConfigSchema;

export class DeploymentBundlePipelineBuilder extends ConfigBuilder<DeploymentBundleConfig> {

  constructor(context: ComponentContext, spec: ComponentSpec) {
    super({ context, spec }, DEPLOYMENT_BUNDLE_PIPELINE_CONFIG_SCHEMA);
  }

  buildSync(): DeploymentBundleConfig {
    const resolved = super.buildSync();
    const specConfig = (this.builderContext.spec as any)?.config ?? {};
    resolved.environment = specConfig.environment
      ?? this.builderContext.context.environment
      ?? resolved.environment;
    resolved.complianceFramework = specConfig.complianceFramework
      ?? this.builderContext.context.complianceFramework
      ?? resolved.complianceFramework;
    this.applyEnvironmentDefaults(resolved);
    this.applyComplianceFrameworkDefaults(resolved);
    this.validateConfig(resolved);
    this.validateSigningConfiguration(resolved);
    return resolved;
  }

  getHardcodedFallbacks(): Partial<DeploymentBundleConfig> {
    return {
      environment: 'dev',
      complianceFramework: 'commercial',
      artifactoryHost: 'artifactory.company.com',
      ociRepoBundles: 'artifactory.company.com/bundles',
      ociRepoImages: 'artifactory.company.com/images',
      signing: {
        keyless: true,
        fulcioUrl: 'https://fulcio.sigstore.dev',
        rekorUrl: 'https://rekor.sigstore.dev'
      },
      security: {
        failOnCritical: true,
        onlyFixed: false,
        addCpesIfNone: true
      },
      bundle: {
        includeCdkOutput: true,
        includeTestReports: true,
        includeCoverage: true,
        includePolicyReports: true
      },
      runner: {
        image: 'registry/org/platform-runner:1.5.0',
        nodeVersion: '20.12.2',
        fipsMode: false
      }
      // buildMetadata is optional - should be provided via environment/platform defaults (CI/CD)
      // Component handles undefined with 'unknown' fallback
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
  protected getComplianceFrameworkDefaults(): Partial<DeploymentBundleConfig> {
    // Check if highRiskEnvironment flag is set in component config or platform config
    const componentConfig = this.builderContext.spec.config as Partial<DeploymentBundleConfig> | undefined;
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
      // KMS key ID can be overridden per framework if needed
      return {
        signing: {
          keyless: false,
          kmsKeyId: 'kms://aws-kms/alias/platform-cosign-high-risk' // Can be overridden per framework
        },
        security: {
          failOnCritical: true,
          onlyFixed: true,
          addCpesIfNone: true
        },
        runner: {
          fipsMode: true
        }
      };
    }
    
    return {}; // Standard/default environment - use hardcoded fallbacks
  }

  /**
   * @deprecated Use getComplianceFrameworkDefaults() instead. This method is kept for backward compatibility.
   */
  getComplianceFrameworkDefaultsLegacy(): Record<string, Partial<DeploymentBundleConfig>> {
    // Legacy method for backward compatibility - delegates to risk-based method
    const defaults = this.getComplianceFrameworkDefaults();
    return {
      commercial: {},
      'fedramp-moderate': defaults,
      'fedramp-high': defaults,
      'iso27001': defaults,
      'soc2': defaults
    };
  }


  getEnvironmentDefaults(): Record<string, Partial<DeploymentBundleConfig>> {
    return {
      dev: {
        environment: 'dev',
        signing: {
          keyless: true
        }
      },
      staging: {
        environment: 'staging',
        signing: {
          keyless: false,
          kmsKeyId: 'kms://aws-kms/alias/platform-cosign-staging'
        }
      },
      prod: {
        environment: 'prod',
        signing: {
          keyless: false,
          kmsKeyId: 'kms://aws-kms/alias/platform-cosign-prod'
        }
      }
    };
  }

  private applyEnvironmentDefaults(config: DeploymentBundleConfig): void {
    const envDefaults = this.getEnvironmentDefaults();
    const specEnvironment = (this.builderContext.spec as any)?.config?.environment;
    const specSigning = (this.builderContext.spec as any)?.config?.signing;
    const envKey = specEnvironment
      ?? this.builderContext.context.environment
      ?? config.environment
      ?? 'dev';

    config.environment = specEnvironment ?? envKey;
    const defaultsForEnv = envDefaults[envKey];

    if (!defaultsForEnv) {
      return;
    }

    config.environment = specEnvironment ?? defaultsForEnv.environment ?? envKey;

    if (!specSigning && defaultsForEnv.signing) {
      config.signing = {
        ...(config.signing ?? {}),
        ...defaultsForEnv.signing
      };
    }
  }

  private applyComplianceFrameworkDefaults(config: DeploymentBundleConfig): void {
    const specFramework = (this.builderContext.spec as any)?.config?.complianceFramework;
    const specSigning = (this.builderContext.spec as any)?.config?.signing;
    const specRunner = (this.builderContext.spec as any)?.config?.runner;
    const framework = specFramework
      ?? this.builderContext.context.complianceFramework
      ?? config.complianceFramework
      ?? 'commercial';

    config.complianceFramework = framework;

    // Use risk-based defaults instead of framework-specific defaults
    const frameworkDefaults = this.getComplianceFrameworkDefaults();
    if (!frameworkDefaults || Object.keys(frameworkDefaults).length === 0) {
      return;
    }

    if (!specSigning && frameworkDefaults.signing) {
      config.signing = {
        ...(config.signing ?? {}),
        ...frameworkDefaults.signing
      };
    }

    if (!specRunner && frameworkDefaults.runner) {
      config.runner = {
        ...(config.runner ?? {}),
        ...frameworkDefaults.runner
      };
    }

    if (frameworkDefaults.security) {
      config.security = {
        ...frameworkDefaults.security,
        ...(config.security ?? {})
      };
    }
  }

  validateConfig(config: DeploymentBundleConfig): void {
    // Required fields validation
    if (!config.service) {
      throw new Error('Service name is required');
    }

    if (!config.versionTag) {
      throw new Error('Version tag is required');
    }

    if (!config.artifactoryHost) {
      throw new Error('Artifactory host is required');
    }

    if (!config.ociRepoBundles) {
      throw new Error('OCI repository for bundles is required');
    }

    if (config.environment && !SUPPORTED_ENVIRONMENTS.includes(config.environment as any)) {
      throw new Error(`Invalid environment. Must be one of: ${SUPPORTED_ENVIRONMENTS.join(', ')}`);
    }

    // Compliance framework validation is handled by JSON Schema validation
    // in Config.schema.json - no hardcoded framework list needed for extensibility

    // Service name validation
    if (!/^[a-z0-9-]+$/.test(config.service)) {
      throw new Error('Service name must contain only lowercase letters, numbers, and hyphens');
    }

    // Version tag validation
    if (!/^[a-zA-Z0-9._-]+$/.test(config.versionTag)) {
      throw new Error('Version tag contains invalid characters');
    }

    // URL validation
    try {
      new URL(`https://${config.artifactoryHost}`);
    } catch {
      throw new Error('Invalid Artifactory host URL');
    }

    // Security configuration validation
    if (config.security) {
      if (typeof config.security.failOnCritical !== 'boolean') {
        throw new Error('failOnCritical must be a boolean');
      }

      if (typeof config.security.onlyFixed !== 'boolean') {
        throw new Error('onlyFixed must be a boolean');
      }

      if (typeof config.security.addCpesIfNone !== 'boolean') {
        throw new Error('addCpesIfNone must be a boolean');
      }
    }

  }

  private validateSigningConfiguration(config: DeploymentBundleConfig): void {
    if (!config.signing) {
      throw new Error('Signing configuration must be provided');
    }

    if (config.signing.keyless && config.signing.kmsKeyId) {
      throw new Error('Cannot use both keyless and KMS-based signing');
    }

    if (!config.signing.keyless && !config.signing.kmsKeyId) {
      throw new Error('Must specify either keyless or KMS-based signing');
    }

    if (config.signing.kmsKeyId && !config.signing.kmsKeyId.startsWith('kms://')) {
      throw new Error('KMS key ID must start with kms://');
    }

    if (config.signing.fulcioUrl) {
      new URL(config.signing.fulcioUrl);
    }

    if (config.signing.rekorUrl) {
      new URL(config.signing.rekorUrl);
    }
  }
}
