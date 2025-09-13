/**
 * Jest setup file for deployment bundle pipeline tests
 */

// Export mocks as modules for moduleNameMapper
export const BaseComponent = class MockBaseComponent {
  context: any;
  spec: any;
  logger: any;

  constructor(scope: any, id: string, context: any, spec: any) {
    this.context = context;
    this.spec = spec;
    this.logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
  }

  getLogger() {
    return this.logger;
  }

  registerCapability(key: string, value: any) {
    // Mock capability registration
  }

  applyStandardTags(construct: any) {
    // Mock tag application
  }
};

export const IComponent = {};

export const ConfigBuilder = class MockConfigBuilder {
  builderContext: any;

  constructor(builderContext: any, schema: any) {
    this.builderContext = builderContext;
  }

  buildSync() {
    return {
      ...this.builderContext.spec,
      environment: this.builderContext.context.environment || 'dev',
      complianceFramework: this.builderContext.context.complianceFramework || 'commercial',
      signing: {
        keyless: true,
        fulcioUrl: 'https://fulcio.sigstore.dev',
        rekorUrl: 'https://rekor.sigstore.dev'
      },
      security: {
        enableVulnScanning: true,
        criticalVulnThreshold: 0,
        highVulnThreshold: 10
      },
      compliance: {
        enablePolicyChecks: true,
        enableAuditLogging: true
      },
      observability: {
        enableMetrics: true,
        enableTracing: true,
        enableLogging: true
      }
    };
  }

  getHardcodedFallbacks() {
    return {
      environment: 'dev',
      complianceFramework: 'commercial',
      signing: {
        keyless: true,
        fulcioUrl: 'https://fulcio.sigstore.dev',
        rekorUrl: 'https://rekor.sigstore.dev'
      }
    };
  }

  getComplianceFrameworkDefaults() {
    const framework = this.builderContext.context.complianceFramework || 'commercial';

    const frameworkDefaults: Record<string, any> = {
      'commercial': {
        signing: { keyless: true },
        security: { criticalVulnThreshold: 0 },
        compliance: { enableAuditLogging: false }
      },
      'fedramp-moderate': {
        signing: { keyless: false, kmsKeyId: 'kms://aws-kms/alias/platform-cosign-fedramp-moderate' },
        security: { criticalVulnThreshold: 0, highVulnThreshold: 5 },
        compliance: { enableAuditLogging: true, enablePolicyChecks: true }
      },
      'fedramp-high': {
        signing: { keyless: false, kmsKeyId: 'kms://aws-kms/alias/platform-cosign-fedramp-high' },
        security: { criticalVulnThreshold: 0, highVulnThreshold: 0 },
        compliance: { enableAuditLogging: true, enablePolicyChecks: true }
      },
      'iso27001': {
        signing: { keyless: false, kmsKeyId: 'kms://aws-kms/alias/platform-cosign-iso27001' },
        security: { criticalVulnThreshold: 0, highVulnThreshold: 3 },
        compliance: { enableAuditLogging: true, enablePolicyChecks: true }
      },
      'soc2': {
        signing: { keyless: false, kmsKeyId: 'kms://aws-kms/alias/platform-cosign-soc2' },
        security: { criticalVulnThreshold: 0, highVulnThreshold: 5 },
        compliance: { enableAuditLogging: true, enablePolicyChecks: true }
      }
    };

    return frameworkDefaults[framework] || frameworkDefaults['commercial'];
  }

  getEnvironmentDefaults() {
    const env = this.builderContext.context.environment || 'dev';

    const envDefaults: Record<string, any> = {
      dev: {
        environment: 'dev',
        signing: {
          keyless: true,
          fulcioUrl: 'https://fulcio.sigstore.dev',
          rekorUrl: 'https://rekor.sigstore.dev'
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

    return envDefaults[env] || envDefaults['dev'];
  }

  getJsonSchema() {
    return {
      type: 'object',
      properties: {
        service: { type: 'string' },
        versionTag: { type: 'string' },
        artifactoryHost: { type: 'string' },
        ociRepoBundles: { type: 'string' }
      },
      required: ['service', 'versionTag', 'artifactoryHost', 'ociRepoBundles']
    };
  }
};

// Mock the platform core modules
jest.mock('@platform/core', () => ({
  BaseComponent: class MockBaseComponent {
    context: any;
    spec: any;
    logger: any;

    constructor(scope: any, id: string, context: any, spec: any) {
      this.context = context;
      this.spec = spec;
      this.logger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      };
    }

    getLogger() {
      return this.logger;
    }

    registerCapability(key: string, value: any) {
      // Mock capability registration
    }

    applyStandardTags(construct: any) {
      // Mock tag application
    }
  },
  ConfigBuilder: class MockConfigBuilder {
    builderContext: any;

    constructor(builderContext: any, schema: any) {
      this.builderContext = builderContext;
    }

    buildSync() {
      return {
        ...this.builderContext.spec,
        environment: this.builderContext.context.environment || 'dev',
        complianceFramework: this.builderContext.context.complianceFramework || 'commercial',
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

    getHardcodedFallbacks() {
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

    getComplianceFrameworkDefaults() {
      return {
        commercial: {},
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

    getPlatformDefaults() {
      return {
        artifactoryHost: process.env.ARTIFACTORY_HOST || 'artifactory.company.com',
        ociRepoBundles: process.env.OCI_REPO_BUNDLES || 'artifactory.company.com/bundles',
        ociRepoImages: process.env.OCI_REPO_IMAGES || 'artifactory.company.com/images'
      };
    }

    getEnvironmentDefaults() {
      const env = this.builderContext.context.environment || 'dev';

      const envDefaults: Record<string, any> = {
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

    validateConfig(config: any) {
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

      if (!/^[a-z0-9-]+$/.test(config.service)) {
        throw new Error('Service name must contain only lowercase letters, numbers, and hyphens');
      }

      if (!/^[a-zA-Z0-9._-]+$/.test(config.versionTag)) {
        throw new Error('Version tag contains invalid characters');
      }

      try {
        new URL(`https://${config.artifactoryHost}`);
      } catch {
        throw new Error('Invalid Artifactory host URL');
      }

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

      const validFrameworks = ['commercial', 'fedramp-moderate', 'fedramp-high', 'iso27001', 'soc2'];
      if (config.complianceFramework && !validFrameworks.includes(config.complianceFramework)) {
        throw new Error(`Invalid compliance framework. Must be one of: ${validFrameworks.join(', ')}`);
      }

      const validEnvironments = ['dev', 'staging', 'prod'];
      if (config.environment && !validEnvironments.includes(config.environment)) {
        throw new Error(`Invalid environment. Must be one of: ${validEnvironments.join(', ')}`);
      }
    }
  },
  IComponent: {
    // Mock interface
  },
  IComponentCreator: {
    // Mock interface
  }
}));

// Mock AWS CDK
jest.mock('aws-cdk-lib/assertions', () => ({
  Template: {
    fromStack: jest.fn(() => ({
      // Mock template methods
    }))
  }
}));

jest.mock('aws-cdk-lib', () => ({
  Stack: jest.fn()
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
