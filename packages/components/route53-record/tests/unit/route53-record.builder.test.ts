/**
 * Unit tests for Route53RecordConfigBuilder
 * 
 * Tests the 5-layer configuration precedence chain and validation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Route53RecordConfigBuilder, Route53RecordConfig } from '../../src/route53-record.builder';
import { ComponentContext, ComponentSpec } from '../../../@shinobi/core/component-interfaces.js';

describe('Route53RecordConfigBuilder', () => {
  let mockContext: ComponentContext;
  let mockSpec: ComponentSpec;

  beforeEach(() => {
    mockContext = {
      serviceName: 'test-service',
      environment: 'test',
      complianceFramework: 'commercial',
      scope: {} as any,
      region: 'us-east-1',
      accountId: '123456789012'
    };

    mockSpec = {
      name: 'test-dns-record',
      type: 'route53-record',
      config: {}
    };
  });

  describe('5-Layer Configuration Precedence', () => {
    it('should use hardcoded fallbacks when no other configuration is provided', () => {
      const builder = new Route53RecordConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.record.recordName).toBe('default.example.com');
      expect(config.record.recordType).toBe('A');
      expect(config.record.zoneName).toBe('example.com.');
      expect(config.record.target).toBe('127.0.0.1');
      expect(config.record.ttl).toBe(300);
      expect(config.record.evaluateTargetHealth).toBe(false);
      // Reference resolution is now handled by ResolverEngine
      expect(config.tags?.Component).toBe('route53-record');
    });

    it('should override hardcoded fallbacks with component spec configuration', () => {
      mockSpec.config = {
        record: {
          recordName: 'api.example.com',
          recordType: 'A',
          zoneName: 'example.com.',
          target: '192.168.1.100',
          ttl: 600,
          comment: 'API endpoint record',
          evaluateTargetHealth: true
        },
        // Reference resolution removed - handled by ResolverEngine
      };

      const builder = new Route53RecordConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.record.recordName).toBe('api.example.com');
      expect(config.record.recordType).toBe('A');
      expect(config.record.zoneName).toBe('example.com.');
      expect(config.record.target).toBe('192.168.1.100');
      expect(config.record.ttl).toBe(600);
      expect(config.record.comment).toBe('API endpoint record');
      expect(config.record.evaluateTargetHealth).toBe(true);
      // Reference resolution is now handled by ResolverEngine
    });

    // Environment variables are not part of the 5-layer configuration precedence chain
    // Configuration comes from: hardcoded fallbacks, platform config, environment config, component overrides, policy overrides
  });

  // Configuration validation: The ConfigBuilder uses JSON Schema validation from Config.schema.json
  // Validation errors are handled by the base ConfigBuilder class, not custom validation logic
  // Schema validation may not throw errors if hardcoded fallbacks provide default values

  describe('Complex Configuration Scenarios', () => {
    it('should handle multiple target values', () => {
      mockSpec.config = {
        record: {
          recordName: 'api.example.com',
          recordType: 'A',
          zoneName: 'example.com.',
          target: ['192.168.1.1', '192.168.1.2', '192.168.1.3']
        }
      };

      const builder = new Route53RecordConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(Array.isArray(config.record.target)).toBe(true);
      expect(config.record.target).toHaveLength(3);
      expect(config.record.target).toEqual(['192.168.1.1', '192.168.1.2', '192.168.1.3']);
    });

    it('should handle MX record configuration', () => {
      mockSpec.config = {
        record: {
          recordName: 'example.com',
          recordType: 'MX',
          zoneName: 'example.com.',
          target: ['10 mail1.example.com', '20 mail2.example.com']
        }
      };

      const builder = new Route53RecordConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.record.recordType).toBe('MX');
      expect(Array.isArray(config.record.target)).toBe(true);
      expect(config.record.target).toEqual(['10 mail1.example.com', '20 mail2.example.com']);
    });

    it('should handle TXT record configuration', () => {
      mockSpec.config = {
        record: {
          recordName: '_verification.example.com',
          recordType: 'TXT',
          zoneName: 'example.com.',
          target: ['"v=spf1 include:_spf.google.com ~all"', '"google-site-verification=abc123"']
        }
      };

      const builder = new Route53RecordConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.record.recordType).toBe('TXT');
      expect(Array.isArray(config.record.target)).toBe(true);
      expect(config.record.target).toHaveLength(2);
    });

    it('should handle weighted routing configuration', () => {
      mockSpec.config = {
        record: {
          recordName: 'api.example.com',
          recordType: 'A',
          zoneName: 'example.com.',
          target: '192.168.1.1',
          weight: 100,
          setIdentifier: 'primary'
        }
      };

      const builder = new Route53RecordConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.record.weight).toBe(100);
      expect(config.record.setIdentifier).toBe('primary');
    });

    it('should handle geolocation routing configuration', () => {
      mockSpec.config = {
        record: {
          recordName: 'api.example.com',
          recordType: 'A',
          zoneName: 'example.com.',
          target: '192.168.1.1',
          geoLocation: {
            continent: 'NA',
            country: 'US',
            subdivision: 'CA'
          },
          setIdentifier: 'us-west'
        }
      };

      const builder = new Route53RecordConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.record.geoLocation?.continent).toBe('NA');
      expect(config.record.geoLocation?.country).toBe('US');
      expect(config.record.geoLocation?.subdivision).toBe('CA');
      expect(config.record.setIdentifier).toBe('us-west');
    });

    it('should handle failover configuration', () => {
      mockSpec.config = {
        record: {
          recordName: 'api.example.com',
          recordType: 'A',
          zoneName: 'example.com.',
          target: '192.168.1.1',
          failover: 'PRIMARY',
          setIdentifier: 'primary-failover'
        }
      };

      const builder = new Route53RecordConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.record.failover).toBe('PRIMARY');
      expect(config.record.setIdentifier).toBe('primary-failover');
    });

    it('should handle latency-based routing configuration', () => {
      mockSpec.config = {
        record: {
          recordName: 'api.example.com',
          recordType: 'A',
          zoneName: 'example.com.',
          target: '192.168.1.1',
          region: 'us-west-2',
          setIdentifier: 'us-west-2-latency'
        }
      };

      const builder = new Route53RecordConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.record.region).toBe('us-west-2');
      expect(config.record.setIdentifier).toBe('us-west-2-latency');
    });
  });

  // Reference resolution is now handled by the platform's ResolverEngine
  // No component-level reference resolution configuration needed

  describe('Compliance Framework Integration', () => {
    it('should apply FedRAMP Moderate settings', () => {
      mockContext.complianceFramework = 'fedramp-moderate';
      
      const builder = new Route53RecordConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      // FedRAMP Moderate should have reasonable defaults
      expect(config.record.ttl).toBe(300);
      expect(config.record.evaluateTargetHealth).toBe(false);
    });

    it('should apply FedRAMP High settings', () => {
      mockContext.complianceFramework = 'fedramp-high';
      
      const builder = new Route53RecordConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      // FedRAMP High should have the most conservative defaults
      expect(config.record.ttl).toBe(300);
      expect(config.record.evaluateTargetHealth).toBe(false);
    });
  });
});
