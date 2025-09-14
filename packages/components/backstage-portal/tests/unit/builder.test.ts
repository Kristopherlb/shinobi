/**
 * Unit tests for BackstagePortalConfigBuilder
 */

import { BackstagePortalConfigBuilder, BackstagePortalConfig } from '../../src/backstage-portal.builder';

describe('BackstagePortalConfigBuilder', () => {
  let builder: BackstagePortalConfigBuilder;
  let context: any;
  let spec: any;

  beforeEach(() => {
    context = {
      serviceName: 'test-backstage-portal',
      account: '123456789012',
      region: 'us-east-1',
      environment: 'dev',
      complianceFramework: 'commercial'
    };

    spec = {
      portal: {
        name: 'Test Portal',
        organization: 'Test Organization',
        description: 'Test portal description',
        baseUrl: 'https://backstage.test.com'
      },
      database: {
        instanceClass: 'db.t3.small',
        allocatedStorage: 50,
        maxAllocatedStorage: 200,
        backupRetentionDays: 14,
        multiAz: true,
        deletionProtection: true
      },
      backend: {
        desiredCount: 3,
        cpu: 1024,
        memory: 2048,
        healthCheckPath: '/health',
        healthCheckInterval: 30
      },
      frontend: {
        desiredCount: 2,
        cpu: 512,
        memory: 1024,
        healthCheckPath: '/',
        healthCheckInterval: 30
      },
      auth: {
        provider: 'github',
        github: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          organization: 'test-org'
        }
      },
      catalog: {
        providers: [{
          type: 'github',
          id: 'test-provider',
          org: 'test-org',
          catalogPath: '/catalog-info.yaml'
        }]
      }
    };

    const builderContext = { context, spec };
    const schema = { type: 'object', properties: {}, required: [] };
    builder = new BackstagePortalConfigBuilder(builderContext, schema);
  });

  describe('Constructor', () => {
    it('should initialize with builder context and schema', () => {
      expect(builder['builderContext']).toEqual({ context, spec });
      expect(builder['schema']).toEqual({ type: 'object', properties: {}, required: [] });
    });
  });

  describe('buildSync', () => {
    it('should build configuration successfully', () => {
      const config = builder.buildSync();
      expect(config).toBeDefined();
      expect(config.portal.name).toBe('Test Portal');
      expect(config.portal.organization).toBe('Test Organization');
      expect(config.database.instanceClass).toBe('db.t3.small');
      expect(config.backend.desiredCount).toBe(3);
      expect(config.frontend.desiredCount).toBe(2);
    });

    it('should merge spec overrides with defaults', () => {
      const config = builder.buildSync();
      expect(config.portal.name).toBe('Test Portal'); // From spec
      expect(config.database.instanceClass).toBe('db.t3.small'); // From spec
      expect(config.backend.cpu).toBe(1024); // From spec
    });

    it('should apply environment defaults', () => {
      const config = builder.buildSync();
      expect(config.environment).toBe('dev');
    });

    it('should apply compliance framework defaults', () => {
      const config = builder.buildSync();
      expect(config.complianceFramework).toBe('commercial');
    });
  });

  describe('getHardcodedFallbacks', () => {
    it('should return hardcoded fallback defaults', () => {
      const fallbacks = builder.getHardcodedFallbacks();
      expect(fallbacks).toBeDefined();
      expect(fallbacks.portal?.name).toBe('Shinobi Developer Portal');
      expect(fallbacks.portal?.organization).toBe('Shinobi Platform');
      expect(fallbacks.database?.instanceClass).toBe('db.t3.micro');
      expect(fallbacks.backend?.desiredCount).toBe(2);
      expect(fallbacks.frontend?.desiredCount).toBe(2);
      expect(fallbacks.ecr?.maxImageCount).toBe(10);
      expect(fallbacks.observability?.logRetentionDays).toBe(30);
      expect(fallbacks.security?.enableEncryption).toBe(true);
      expect(fallbacks.auth?.provider).toBe('github');
    });
  });

  describe('getComplianceFrameworkDefaults', () => {
    it('should return commercial defaults for commercial framework', () => {
      const commercialContext = { ...context, complianceFramework: 'commercial' };
      const commercialBuilder = new BackstagePortalConfigBuilder({ context: commercialContext, spec }, {});
      const defaults = commercialBuilder.getComplianceFrameworkDefaults();
      
      expect(defaults.security?.enableEncryption).toBe(true);
      expect(defaults.security?.enableVpcFlowLogs).toBe(true);
      expect(defaults.security?.enableWaf).toBe(false);
      expect(defaults.observability?.logRetentionDays).toBe(30);
      expect(defaults.observability?.cpuThreshold).toBe(80);
      expect(defaults.observability?.memoryThreshold).toBe(85);
    });

    it('should return FedRAMP Moderate defaults for fedramp-moderate framework', () => {
      const fedrampContext = { ...context, complianceFramework: 'fedramp-moderate' };
      const fedrampBuilder = new BackstagePortalConfigBuilder({ context: fedrampContext, spec }, {});
      const defaults = fedrampBuilder.getComplianceFrameworkDefaults();
      
      expect(defaults.database?.multiAz).toBe(true);
      expect(defaults.database?.deletionProtection).toBe(true);
      expect(defaults.database?.backupRetentionDays).toBe(14);
      expect(defaults.security?.enableWaf).toBe(true);
      expect(defaults.observability?.logRetentionDays).toBe(90);
      expect(defaults.observability?.cpuThreshold).toBe(70);
      expect(defaults.observability?.memoryThreshold).toBe(80);
    });

    it('should return FedRAMP High defaults for fedramp-high framework', () => {
      const fedrampHighContext = { ...context, complianceFramework: 'fedramp-high' };
      const fedrampHighBuilder = new BackstagePortalConfigBuilder({ context: fedrampHighContext, spec }, {});
      const defaults = fedrampHighBuilder.getComplianceFrameworkDefaults();
      
      expect(defaults.database?.multiAz).toBe(true);
      expect(defaults.database?.deletionProtection).toBe(true);
      expect(defaults.database?.backupRetentionDays).toBe(30);
      expect(defaults.security?.enableWaf).toBe(true);
      expect(defaults.observability?.logRetentionDays).toBe(180);
      expect(defaults.observability?.cpuThreshold).toBe(60);
      expect(defaults.observability?.memoryThreshold).toBe(75);
    });

    it('should return ISO27001 defaults for iso27001 framework', () => {
      const isoContext = { ...context, complianceFramework: 'iso27001' };
      const isoBuilder = new BackstagePortalConfigBuilder({ context: isoContext, spec }, {});
      const defaults = isoBuilder.getComplianceFrameworkDefaults();
      
      expect(defaults.database?.multiAz).toBe(true);
      expect(defaults.database?.deletionProtection).toBe(true);
      expect(defaults.database?.backupRetentionDays).toBe(21);
      expect(defaults.security?.enableWaf).toBe(true);
      expect(defaults.observability?.logRetentionDays).toBe(120);
      expect(defaults.observability?.cpuThreshold).toBe(75);
      expect(defaults.observability?.memoryThreshold).toBe(80);
    });

    it('should return SOC2 defaults for soc2 framework', () => {
      const soc2Context = { ...context, complianceFramework: 'soc2' };
      const soc2Builder = new BackstagePortalConfigBuilder({ context: soc2Context, spec }, {});
      const defaults = soc2Builder.getComplianceFrameworkDefaults();
      
      expect(defaults.database?.multiAz).toBe(true);
      expect(defaults.database?.deletionProtection).toBe(true);
      expect(defaults.database?.backupRetentionDays).toBe(14);
      expect(defaults.security?.enableWaf).toBe(true);
      expect(defaults.observability?.logRetentionDays).toBe(90);
      expect(defaults.observability?.cpuThreshold).toBe(75);
      expect(defaults.observability?.memoryThreshold).toBe(80);
    });

    it('should fallback to commercial for unknown framework', () => {
      const unknownContext = { ...context, complianceFramework: 'unknown' };
      const unknownBuilder = new BackstagePortalConfigBuilder({ context: unknownContext, spec }, {});
      const defaults = unknownBuilder.getComplianceFrameworkDefaults();
      
      expect(defaults.security?.enableEncryption).toBe(true);
      expect(defaults.security?.enableVpcFlowLogs).toBe(true);
      expect(defaults.security?.enableWaf).toBe(false);
    });
  });

  describe('getEnvironmentDefaults', () => {
    it('should return dev defaults for dev environment', () => {
      const devContext = { ...context, environment: 'dev' };
      const devBuilder = new BackstagePortalConfigBuilder({ context: devContext, spec }, {});
      const defaults = devBuilder.getEnvironmentDefaults();
      
      expect(defaults.environment).toBe('dev');
      expect(defaults.backend?.desiredCount).toBe(1);
      expect(defaults.backend?.cpu).toBe(256);
      expect(defaults.backend?.memory).toBe(512);
      expect(defaults.frontend?.desiredCount).toBe(1);
      expect(defaults.database?.instanceClass).toBe('db.t3.micro');
      expect(defaults.observability?.logRetentionDays).toBe(7);
      expect(defaults.observability?.cpuThreshold).toBe(90);
      expect(defaults.observability?.memoryThreshold).toBe(90);
    });

    it('should return staging defaults for staging environment', () => {
      const stagingContext = { ...context, environment: 'staging' };
      const stagingBuilder = new BackstagePortalConfigBuilder({ context: stagingContext, spec }, {});
      const defaults = stagingBuilder.getEnvironmentDefaults();
      
      expect(defaults.environment).toBe('staging');
      expect(defaults.backend?.desiredCount).toBe(2);
      expect(defaults.backend?.cpu).toBe(512);
      expect(defaults.backend?.memory).toBe(1024);
      expect(defaults.frontend?.desiredCount).toBe(2);
      expect(defaults.database?.instanceClass).toBe('db.t3.small');
      expect(defaults.observability?.logRetentionDays).toBe(14);
      expect(defaults.observability?.cpuThreshold).toBe(80);
      expect(defaults.observability?.memoryThreshold).toBe(85);
    });

    it('should return prod defaults for prod environment', () => {
      const prodContext = { ...context, environment: 'prod' };
      const prodBuilder = new BackstagePortalConfigBuilder({ context: prodContext, spec }, {});
      const defaults = prodBuilder.getEnvironmentDefaults();
      
      expect(defaults.environment).toBe('prod');
      expect(defaults.backend?.desiredCount).toBe(3);
      expect(defaults.backend?.cpu).toBe(1024);
      expect(defaults.backend?.memory).toBe(2048);
      expect(defaults.frontend?.desiredCount).toBe(3);
      expect(defaults.database?.instanceClass).toBe('db.t3.medium');
      expect(defaults.observability?.logRetentionDays).toBe(30);
      expect(defaults.observability?.cpuThreshold).toBe(70);
      expect(defaults.observability?.memoryThreshold).toBe(80);
    });

    it('should fallback to dev for unknown environment', () => {
      const unknownContext = { ...context, environment: 'unknown' };
      const unknownBuilder = new BackstagePortalConfigBuilder({ context: unknownContext, spec }, {});
      const defaults = unknownBuilder.getEnvironmentDefaults();
      
      expect(defaults.environment).toBe('dev');
      expect(defaults.backend?.desiredCount).toBe(1);
    });
  });

  describe('getPlatformDefaults', () => {
    it('should return platform defaults', () => {
      const defaults = builder.getPlatformDefaults();
      
      expect(defaults.portal?.name).toBe('Shinobi Developer Portal');
      expect(defaults.portal?.organization).toBe('Shinobi Platform');
      expect(defaults.portal?.description).toBe('Developer portal for Shinobi platform components and services');
      expect(defaults.portal?.baseUrl).toBe('https://backstage.shinobi.local');
      expect(defaults.security?.enableEncryption).toBe(true);
      expect(defaults.security?.enableVpcFlowLogs).toBe(true);
      expect(defaults.security?.enableWaf).toBe(false);
      expect(defaults.observability?.enableTracing).toBe(true);
      expect(defaults.observability?.enableMetrics).toBe(true);
    });
  });

  describe('Configuration Precedence', () => {
    it('should prioritize spec overrides over all defaults', () => {
      const config = builder.buildSync();
      expect(config.portal.name).toBe('Test Portal'); // From spec
      expect(config.database.instanceClass).toBe('db.t3.small'); // From spec
      expect(config.backend.desiredCount).toBe(3); // From spec
    });

    it('should apply environment defaults when spec values are missing', () => {
      const minimalSpec = {
        portal: {
          name: 'Minimal Portal',
          organization: 'Minimal Org'
        }
      };
      
      const minimalBuilder = new BackstagePortalConfigBuilder({ context, spec: minimalSpec }, {});
      const config = minimalBuilder.buildSync();
      
      expect(config.portal.name).toBe('Minimal Portal'); // From spec
      expect(config.backend.desiredCount).toBe(1); // From dev environment default
      expect(config.database.instanceClass).toBe('db.t3.micro'); // From hardcoded default
    });

    it('should apply compliance framework defaults when spec values are missing', () => {
      const fedrampContext = { ...context, complianceFramework: 'fedramp-moderate' };
      const fedrampBuilder = new BackstagePortalConfigBuilder({ context: fedrampContext, spec }, {});
      const config = fedrampBuilder.buildSync();
      
      expect(config.database.multiAz).toBe(true); // From FedRAMP Moderate default
      expect(config.security.enableWaf).toBe(true); // From FedRAMP Moderate default
      expect(config.observability.logRetentionDays).toBe(90); // From FedRAMP Moderate default
    });
  });
});
