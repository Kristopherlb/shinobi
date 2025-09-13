/**
 * Configuration Builder for Deployment Bundle Pipeline Component
 * 
 * Handles configuration merging with 5-layer precedence and compliance defaults
 */

import { ConfigBuilder } from '@platform/core';
import { DeploymentBundleConfig } from './types';

export class DeploymentBundlePipelineBuilder extends ConfigBuilder<DeploymentBundleConfig> {

  buildSync(): DeploymentBundleConfig {
    return super.buildSync();
  }

  getHardcodedFallbacks(): Partial<DeploymentBundleConfig> {
    return {
      environment: 'dev',
      complianceFramework: 'commercial',
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
    };
  }

  getComplianceFrameworkDefaults(): Record<string, Partial<DeploymentBundleConfig>> {
    return {
      commercial: {
        // Standard commercial defaults - already set in hardcoded
      },

      'fedramp-moderate': {
        signing: {
          keyless: false,
          kmsKeyId: 'kms://aws-kms/alias/platform-cosign-fedramp-moderate'
        },
        security: {
          failOnCritical: true,
          onlyFixed: true,
          addCpesIfNone: true
        },
        runner: {
          fipsMode: true
        }
      },

      'fedramp-high': {
        signing: {
          keyless: false,
          kmsKeyId: 'kms://aws-kms/alias/platform-cosign-fedramp-high'
        },
        security: {
          failOnCritical: true,
          onlyFixed: true,
          addCpesIfNone: true
        },
        runner: {
          fipsMode: true
        }
      },

      'iso27001': {
        signing: {
          keyless: false,
          kmsKeyId: 'kms://aws-kms/alias/platform-cosign-iso27001'
        },
        security: {
          failOnCritical: true,
          onlyFixed: false,
          addCpesIfNone: true
        }
      },

      'soc2': {
        signing: {
          keyless: false,
          kmsKeyId: 'kms://aws-kms/alias/platform-cosign-soc2'
        },
        security: {
          failOnCritical: true,
          onlyFixed: false,
          addCpesIfNone: true
        }
      }
    };
  }

  getPlatformDefaults(): Partial<DeploymentBundleConfig> {
    return {
      artifactoryHost: process.env.ARTIFACTORY_HOST || 'artifactory.company.com',
      ociRepoBundles: process.env.OCI_REPO_BUNDLES || 'artifactory.company.com/bundles',
      ociRepoImages: process.env.OCI_REPO_IMAGES || 'artifactory.company.com/images',
      signing: {
        keyless: process.env.COSIGN_KEYLESS === 'true',
        kmsKeyId: process.env.COSIGN_KMS_KEY_ID,
        fulcioUrl: process.env.FULCIO_URL || 'https://fulcio.sigstore.dev',
        rekorUrl: process.env.REKOR_URL || 'https://rekor.sigstore.dev'
      },
      security: {
        failOnCritical: process.env.SECURITY_FAIL_ON_CRITICAL !== 'false',
        onlyFixed: process.env.SECURITY_ONLY_FIXED === 'true',
        addCpesIfNone: process.env.SECURITY_ADD_CPES !== 'false'
      }
    };
  }

  getEnvironmentDefaults(): Partial<DeploymentBundleConfig> {
    const env = this.context.environment || 'dev';

    const envDefaults: Record<string, Partial<DeploymentBundleConfig>> = {
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

    return envDefaults[env] || {};
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

    // Signing configuration validation
    if (config.signing) {
      if (config.signing.keyless && config.signing.kmsKeyId) {
        throw new Error('Cannot use both keyless and KMS-based signing');
      }

      if (!config.signing.keyless && !config.signing.kmsKeyId) {
        throw new Error('Must specify either keyless or KMS-based signing');
      }

      if (config.signing.kmsKeyId && !config.signing.kmsKeyId.startsWith('kms://')) {
        throw new Error('KMS key ID must start with kms://');
      }
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

    // Compliance framework validation
    const validFrameworks = ['commercial', 'fedramp-moderate', 'fedramp-high', 'iso27001', 'soc2'];
    if (config.complianceFramework && !validFrameworks.includes(config.complianceFramework)) {
      throw new Error(`Invalid compliance framework. Must be one of: ${validFrameworks.join(', ')}`);
    }

    // Environment validation
    const validEnvironments = ['dev', 'staging', 'prod'];
    if (config.environment && !validEnvironments.includes(config.environment)) {
      throw new Error(`Invalid environment. Must be one of: ${validEnvironments.join(', ')}`);
    }
  }
}
