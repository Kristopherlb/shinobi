// tests/unit/observability/observability-config-factory.test.ts
// Unit tests for ObservabilityConfigFactory

import { ObservabilityConfigFactory } from '../../../src/platform/contracts/observability/observability-config-factory';
import { ObservabilityConfig } from '../../../src/platform/contracts/observability/observability-types';

describe('ObservabilityConfigFactory', () => {
  describe('createConfig', () => {
    it('should create commercial configuration', () => {
      const config = ObservabilityConfigFactory.createConfig('commercial');

      expect(config.framework).toBe('commercial');
      expect(config.tier).toBe('commercial');
      expect(config.tracing.enabled).toBe(true);
      expect(config.tracing.samplingRate).toBe(0.1);
      expect(config.tracing.maxTraceDuration).toBe(300);
      expect(config.logging.enabled).toBe(true);
      expect(config.logging.retentionDays).toBe(30);
      expect(config.logging.auditLogging).toBe(false);
      expect(config.metrics.enabled).toBe(true);
      expect(config.metrics.collectionInterval).toBe(60);
      expect(config.security.fipsCompliant).toBe(false);
      expect(config.security.stigHardened).toBe(false);
    });

    it('should create FedRAMP Moderate configuration', () => {
      const config = ObservabilityConfigFactory.createConfig('fedramp-moderate');

      expect(config.framework).toBe('fedramp-moderate');
      expect(config.tier).toBe('fedramp-moderate');
      expect(config.tracing.samplingRate).toBe(0.2);
      expect(config.tracing.maxTraceDuration).toBe(600);
      expect(config.logging.retentionDays).toBe(90);
      expect(config.logging.auditLogging).toBe(true);
      expect(config.logging.performanceLogging).toBe(true);
      expect(config.metrics.collectionInterval).toBe(30);
      expect(config.security.auditTrail).toBe(true);
      expect(config.security.accessLogging).toBe(true);
    });

    it('should create FedRAMP High configuration', () => {
      const config = ObservabilityConfigFactory.createConfig('fedramp-high');

      expect(config.framework).toBe('fedramp-high');
      expect(config.tier).toBe('fedramp-high');
      expect(config.tracing.samplingRate).toBe(0.5);
      expect(config.tracing.maxTraceDuration).toBe(900);
      expect(config.logging.retentionDays).toBe(2555); // 7 years
      expect(config.logging.auditLogging).toBe(true);
      expect(config.logging.performanceLogging).toBe(true);
      expect(config.metrics.collectionInterval).toBe(15);
      expect(config.security.fipsCompliant).toBe(true);
      expect(config.security.stigHardened).toBe(true);
      expect(config.security.auditTrail).toBe(true);
      expect(config.security.accessLogging).toBe(true);
    });

    it('should include custom attributes in tracing config', () => {
      const commercialConfig = ObservabilityConfigFactory.createConfig('commercial');
      const fedrampModerateConfig = ObservabilityConfigFactory.createConfig('fedramp-moderate');
      const fedrampHighConfig = ObservabilityConfigFactory.createConfig('fedramp-high');

      expect(commercialConfig.tracing.customAttributes).toEqual({
        'environment': 'commercial',
        'tier': 'standard'
      });

      expect(fedrampModerateConfig.tracing.customAttributes).toEqual({
        'environment': 'fedramp-moderate',
        'tier': 'enhanced',
        'compliance': 'moderate'
      });

      expect(fedrampHighConfig.tracing.customAttributes).toEqual({
        'environment': 'fedramp-high',
        'tier': 'maximum',
        'compliance': 'high',
        'classification': 'confidential'
      });
    });

    it('should include custom fields in logging config', () => {
      const commercialConfig = ObservabilityConfigFactory.createConfig('commercial');
      const fedrampModerateConfig = ObservabilityConfigFactory.createConfig('fedramp-moderate');
      const fedrampHighConfig = ObservabilityConfigFactory.createConfig('fedramp-high');

      expect(commercialConfig.logging.customFields).toEqual({
        'service': 'shinobi',
        'tier': 'commercial'
      });

      expect(fedrampModerateConfig.logging.customFields).toEqual({
        'service': 'shinobi',
        'tier': 'fedramp-moderate',
        'compliance': 'moderate',
        'audit': 'enabled'
      });

      expect(fedrampHighConfig.logging.customFields).toEqual({
        'service': 'shinobi',
        'tier': 'fedramp-high',
        'compliance': 'high',
        'classification': 'confidential',
        'audit': 'enabled',
        'stig': 'hardened'
      });
    });

    it('should throw error for unsupported framework', () => {
      expect(() => {
        ObservabilityConfigFactory.createConfig('unsupported' as any);
      }).toThrow('Unsupported compliance framework: unsupported');
    });
  });

  describe('getAdotLayerArn', () => {
    it('should return ADOT layer ARN for supported regions', () => {
      const usEast1Arn = ObservabilityConfigFactory.getAdotLayerArn('us-east-1', 'commercial');
      const usWest2Arn = ObservabilityConfigFactory.getAdotLayerArn('us-west-2', 'commercial');
      const euWest1Arn = ObservabilityConfigFactory.getAdotLayerArn('eu-west-1', 'commercial');

      expect(usEast1Arn).toContain('arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1');
      expect(usWest2Arn).toContain('arn:aws:lambda:us-west-2:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1');
      expect(euWest1Arn).toContain('arn:aws:lambda:eu-west-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1');
    });

    it('should throw error for unsupported region', () => {
      expect(() => {
        ObservabilityConfigFactory.getAdotLayerArn('unsupported-region', 'commercial');
      }).toThrow('ADOT layer not available in region: unsupported-region');
    });

    it('should warn about FIPS compliance for FedRAMP High', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      ObservabilityConfigFactory.getAdotLayerArn('us-east-1', 'fedramp-high');

      expect(consoleSpy).toHaveBeenCalledWith(
        'FIPS-compliant ADOT layers not yet available, using standard layer'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getComplianceEndpoints', () => {
    it('should return empty array for commercial tier', () => {
      const endpoints = ObservabilityConfigFactory.getComplianceEndpoints('commercial');
      expect(endpoints).toEqual([]);
    });

    it('should return FedRAMP Moderate endpoints', () => {
      const endpoints = ObservabilityConfigFactory.getComplianceEndpoints('fedramp-moderate');
      expect(endpoints).toEqual([
        'https://logs.us-east-1.amazonaws.com',
        'https://xray.us-east-1.amazonaws.com',
        'https://monitoring.us-east-1.amazonaws.com'
      ]);
    });

    it('should return FedRAMP High endpoints', () => {
      const endpoints = ObservabilityConfigFactory.getComplianceEndpoints('fedramp-high');
      expect(endpoints).toEqual([
        'https://logs.us-gov-east-1.amazonaws.com',
        'https://xray.us-gov-east-1.amazonaws.com',
        'https://monitoring.us-gov-east-1.amazonaws.com'
      ]);
    });
  });

  describe('isFipsRequired', () => {
    it('should return false for commercial and FedRAMP Moderate', () => {
      expect(ObservabilityConfigFactory.isFipsRequired('commercial')).toBe(false);
      expect(ObservabilityConfigFactory.isFipsRequired('fedramp-moderate')).toBe(false);
    });

    it('should return true for FedRAMP High', () => {
      expect(ObservabilityConfigFactory.isFipsRequired('fedramp-high')).toBe(true);
    });
  });

  describe('isStigRequired', () => {
    it('should return false for commercial and FedRAMP Moderate', () => {
      expect(ObservabilityConfigFactory.isStigRequired('commercial')).toBe(false);
      expect(ObservabilityConfigFactory.isStigRequired('fedramp-moderate')).toBe(false);
    });

    it('should return true for FedRAMP High', () => {
      expect(ObservabilityConfigFactory.isStigRequired('fedramp-high')).toBe(true);
    });
  });

  describe('configuration validation', () => {
    it('should have consistent configuration across all tiers', () => {
      const tiers: Array<'commercial' | 'fedramp-moderate' | 'fedramp-high'> = [
        'commercial', 'fedramp-moderate', 'fedramp-high'
      ];

      tiers.forEach(tier => {
        const config = ObservabilityConfigFactory.createConfig(tier);

        // All tiers should have these enabled
        expect(config.tracing.enabled).toBe(true);
        expect(config.logging.enabled).toBe(true);
        expect(config.metrics.enabled).toBe(true);
        expect(config.security.encryptionInTransit).toBe(true);
        expect(config.security.encryptionAtRest).toBe(true);

        // Logging format should always be JSON
        expect(config.logging.format).toBe('json');

        // Tracing provider should always be X-Ray
        expect(config.tracing.provider).toBe('xray');

        // Metrics should always include custom and resource metrics
        expect(config.metrics.customMetrics).toBe(true);
        expect(config.metrics.resourceMetrics).toBe(true);
        expect(config.metrics.performanceMetrics).toBe(true);
      });
    });

    it('should have increasing security requirements across tiers', () => {
      const commercial = ObservabilityConfigFactory.createConfig('commercial');
      const moderate = ObservabilityConfigFactory.createConfig('fedramp-moderate');
      const high = ObservabilityConfigFactory.createConfig('fedramp-high');

      // Sampling rates should increase (more detailed monitoring)
      expect(commercial.tracing.samplingRate).toBeLessThan(moderate.tracing.samplingRate);
      expect(moderate.tracing.samplingRate).toBeLessThan(high.tracing.samplingRate);

      // Trace duration should increase (longer traces for compliance)
      expect(commercial.tracing.maxTraceDuration).toBeLessThan(moderate.tracing.maxTraceDuration);
      expect(moderate.tracing.maxTraceDuration).toBeLessThan(high.tracing.maxTraceDuration);

      // Log retention should increase
      expect(commercial.logging.retentionDays).toBeLessThan(moderate.logging.retentionDays);
      expect(moderate.logging.retentionDays).toBeLessThan(high.logging.retentionDays);

      // Metrics collection should be more frequent
      expect(commercial.metrics.collectionInterval).toBeGreaterThan(moderate.metrics.collectionInterval);
      expect(moderate.metrics.collectionInterval).toBeGreaterThan(high.metrics.collectionInterval);

      // Security requirements should increase
      expect(commercial.security.fipsCompliant).toBe(false);
      expect(moderate.security.fipsCompliant).toBe(false);
      expect(high.security.fipsCompliant).toBe(true);

      expect(commercial.security.stigHardened).toBe(false);
      expect(moderate.security.stigHardened).toBe(false);
      expect(high.security.stigHardened).toBe(true);

      expect(commercial.security.auditTrail).toBe(false);
      expect(moderate.security.auditTrail).toBe(true);
      expect(high.security.auditTrail).toBe(true);
    });
  });
});
