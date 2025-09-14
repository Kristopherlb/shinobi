/**
 * Simple test to verify Jest configuration is working
 */

import { BackstagePortalComponent } from '../src/backstage-portal.component';
import { BackstagePortalConfigBuilder } from '../src/backstage-portal.builder';

describe('Jest Configuration Test', () => {
  it('should run basic tests', () => {
    expect(true).toBe(true);
  });

  it('should handle TypeScript', () => {
    const message: string = "Hello TypeScript";
    expect(message).toBe("Hello TypeScript");
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve("async done");
    expect(result).toBe("async done");
  });
});

describe('Backstage Portal Component - Basic Tests', () => {
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
        instanceClass: 'db.t3.micro',
        allocatedStorage: 20,
        maxAllocatedStorage: 100,
        backupRetentionDays: 7,
        multiAz: false,
        deletionProtection: true
      },
      backend: {
        desiredCount: 2,
        cpu: 512,
        memory: 1024,
        healthCheckPath: '/health',
        healthCheckInterval: 30
      },
      frontend: {
        desiredCount: 2,
        cpu: 256,
        memory: 512,
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
  });

  it('should have correct component type', () => {
    const component = new BackstagePortalComponent({}, 'test-component', context, spec);
    expect(component.getType()).toBe('backstage-portal');
  });

  it('should handle configuration objects', () => {
    const builderContext = { context, spec };
    const schema = { type: 'object', properties: {}, required: [] };
    const builder = new BackstagePortalConfigBuilder(builderContext, schema);
    const config = builder.buildSync();
    expect(config.portal.name).toBe('Test Portal');
    expect(config.environment).toBe('dev');
  });

  it('should handle compliance frameworks', () => {
    const fedrampContext = { ...context, complianceFramework: 'fedramp-moderate' };
    const builderContext = { context: fedrampContext, spec };
    const schema = { type: 'object', properties: {}, required: [] };
    const builder = new BackstagePortalConfigBuilder(builderContext, schema);
    const config = builder.buildSync();
    expect(config.complianceFramework).toBe('fedramp-moderate');
    expect(config.database.multiAz).toBe(true);
  });

  it('should handle environment configurations', () => {
    const prodContext = { ...context, environment: 'prod' };
    const builderContext = { context: prodContext, spec };
    const schema = { type: 'object', properties: {}, required: [] };
    const builder = new BackstagePortalConfigBuilder(builderContext, schema);
    const config = builder.buildSync();
    expect(config.environment).toBe('prod');
    expect(config.backend.desiredCount).toBe(3);
  });
});
