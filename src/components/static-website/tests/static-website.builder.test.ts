/**
 * Unit tests for StaticWebsiteConfigBuilder
 * 
 * Tests the 5-layer configuration precedence chain and compliance framework defaults
 */

import { StaticWebsiteConfigBuilder, StaticWebsiteConfig } from '../static-website.builder';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces';

// Mock context helper
function createMockContext(complianceFramework: string = 'commercial'): ComponentContext {
  return {
    serviceName: 'test-service',
    environment: 'test',
    region: 'us-east-1',
    complianceFramework: complianceFramework as any,
    scope: {} as any
  };
}

// Mock spec helper
function createMockSpec(config: Partial<StaticWebsiteConfig> = {}): ComponentSpec {
  return {
    name: 'test-website',
    type: 'static-website',
    config
  };
}

describe('StaticWebsiteConfigBuilder', () => {
  describe('Compliance Framework Defaults', () => {
    it('should apply commercial defaults', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      const builder = new StaticWebsiteConfigBuilder({ context, spec });

      const config = builder.buildSync();

      expect(config.security?.blockPublicAccess).toBe(true);
      expect(config.security?.encryption).toBe(true);
      expect(config.security?.enforceHTTPS).toBe(true);
      expect(config.bucket?.versioning).toBe(false);
      expect(config.bucket?.accessLogging).toBe(false);
      expect(config.distribution?.enableLogging).toBe(false);
    });

    it('should apply fedramp-moderate defaults', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec();
      const builder = new StaticWebsiteConfigBuilder({ context, spec });

      const config = builder.buildSync();

      expect(config.security?.blockPublicAccess).toBe(true);
      expect(config.security?.encryption).toBe(true);
      expect(config.security?.enforceHTTPS).toBe(true);
      expect(config.bucket?.versioning).toBe(true); // Required for compliance
      expect(config.bucket?.accessLogging).toBe(true); // Mandatory logging
      expect(config.distribution?.enableLogging).toBe(true); // Required logging
    });

    it('should apply fedramp-high defaults', () => {
      const context = createMockContext('fedramp-high');
      const spec = createMockSpec();
      const builder = new StaticWebsiteConfigBuilder({ context, spec });

      const config = builder.buildSync();

      expect(config.security?.blockPublicAccess).toBe(true);
      expect(config.security?.encryption).toBe(true);
      expect(config.security?.enforceHTTPS).toBe(true);
      expect(config.bucket?.versioning).toBe(true); // Mandatory
      expect(config.bucket?.accessLogging).toBe(true); // Mandatory comprehensive logging
      expect(config.distribution?.enableLogging).toBe(true); // Mandatory
    });
  });

  describe('Configuration Precedence Chain', () => {
    it('should apply hardcoded fallbacks as baseline', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({});
      const builder = new StaticWebsiteConfigBuilder({ context, spec });

      const config = builder.buildSync();

      expect(config.bucket?.indexDocument).toBe('index.html');
      expect(config.bucket?.errorDocument).toBe('error.html');
      expect(config.distribution?.enabled).toBe(true);
      expect(config.distribution?.logFilePrefix).toBe('cloudfront/');
      expect(config.deployment?.enabled).toBe(false);
      expect(config.deployment?.retainOnDelete).toBe(false);
    });

    it('should allow component overrides to win over compliance defaults', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec({
        bucket: {
          indexDocument: 'custom-index.html',
          versioning: false // Override compliance requirement
        },
        distribution: {
          enableLogging: false // Override compliance requirement
        }
      });
      const builder = new StaticWebsiteConfigBuilder({ context, spec });

      const config = builder.buildSync();

      expect(config.bucket?.indexDocument).toBe('custom-index.html');
      expect(config.bucket?.versioning).toBe(false); // Component override wins
      expect(config.distribution?.enableLogging).toBe(false); // Component override wins
    });

    it('should merge nested configuration objects correctly', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        bucket: {
          indexDocument: 'app.html'
          // versioning not specified, should use default
        },
        security: {
          encryption: false
          // other security settings should use defaults
        }
      });
      const builder = new StaticWebsiteConfigBuilder({ context, spec });

      const config = builder.buildSync();

      expect(config.bucket?.indexDocument).toBe('app.html');
      expect(config.bucket?.versioning).toBe(false); // Default
      expect(config.security?.encryption).toBe(false); // Override
      expect(config.security?.blockPublicAccess).toBe(true); // Default
      expect(config.security?.enforceHTTPS).toBe(true); // Default
    });

    it('should handle complex nested overrides', () => {
      const context = createMockContext('fedramp-high');
      const spec = createMockSpec({
        websiteName: 'my-custom-site',
        domain: {
          domainName: 'example.com',
          alternativeDomainNames: ['www.example.com']
        },
        deployment: {
          enabled: true,
          sourcePath: './dist',
          retainOnDelete: true
        }
      });
      const builder = new StaticWebsiteConfigBuilder({ context, spec });

      const config = builder.buildSync();

      expect(config.websiteName).toBe('my-custom-site');
      expect(config.domain?.domainName).toBe('example.com');
      expect(config.domain?.alternativeDomainNames).toEqual(['www.example.com']);
      expect(config.deployment?.enabled).toBe(true);
      expect(config.deployment?.sourcePath).toBe('./dist');
      expect(config.deployment?.retainOnDelete).toBe(true);
      // Compliance defaults should still apply
      expect(config.bucket?.versioning).toBe(true);
      expect(config.bucket?.accessLogging).toBe(true);
      expect(config.distribution?.enableLogging).toBe(true);
    });
  });

  describe('Schema Validation', () => {
    it('should return the correct JSON schema', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      const builder = new StaticWebsiteConfigBuilder({ context, spec });

      const schema = builder.getSchema();

      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');
      expect(schema.title).toBe('Static Website Configuration');
      expect(schema.properties.websiteName).toBeDefined();
      expect(schema.properties.domain).toBeDefined();
      expect(schema.properties.bucket).toBeDefined();
      expect(schema.properties.distribution).toBeDefined();
      expect(schema.properties.deployment).toBeDefined();
      expect(schema.properties.security).toBeDefined();
      expect(schema.properties.tags).toBeDefined();
    });
  });
});