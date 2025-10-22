/**
 * CloudFront Distribution Component ConfigBuilder Test Suite
 * Implements Platform Testing Standard v1.0 - ConfigBuilder Testing
 */

import {
  CloudFrontDistributionComponentConfigBuilder,
  CloudFrontDistributionConfig
} from '../src/cloudfront-distribution.builder.ts';
import { ComponentContext, ComponentSpec } from '../../../core/src/platform/contracts/component-interfaces.ts';

// Deterministic test fixtures
const DETERMINISTIC_TIMESTAMP = new Date('2025-01-08T12:00:00.000Z');

// Helper factories
const createMockContext = (framework: string = 'commercial'): ComponentContext => ({
  serviceName: 'test-service',
  owner: 'platform-team',
  environment: 'dev',
  complianceFramework: framework,
  region: 'us-east-1',
  account: '123456789012',
  tags: {
    'service-name': 'test-service',
    'environment': 'dev',
    'compliance-framework': framework
  }
});

const createMockSpec = (config: Partial<CloudFrontDistributionConfig> = {}): ComponentSpec => ({
  name: 'test-cloudfront',
  type: 'cloudfront-distribution',
  config
});

describe('CloudFrontDistributionComponentConfigBuilder', () => {
  // Freeze time for deterministic tests
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(DETERMINISTIC_TIMESTAMP);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('ConfigurationBuilder__CommercialFramework__AppliesPlatformDefaults', () => {
    it('ConfigurationBuilder__CommercialDefaults__AppliesPlatformDefaults', () => {
      // Test Metadata: {"id":"TP-cloudfront-distribution-config-001","level":"unit","capability":"Configuration builder applies commercial platform defaults","oracle":"exact","invariants":["Origin type defaults to S3","Viewer protocol policy defaults to redirect-to-https","Price class defaults to PriceClass_100","Logging enabled by default","Monitoring enabled by default","Hardening profile defaults to baseline"],"fixtures":["createMockContext","createMockSpec"],"inputs":{"shape":"ComponentSpec without overrides","notes":"Commercial framework context"},"risks":["Incorrect default values"],"dependencies":["config/commercial.yml"],"evidence":["origin.type=s3","viewerProtocolPolicy=redirect-to-https","priceClass=PriceClass_100","logging.enabled=true"],"compliance_refs":["std://platform-configuration"],"ai_generated":true,"human_reviewed_by":"Platform Engineering Team"}
      const builder = new CloudFrontDistributionComponentConfigBuilder(createMockContext('commercial'), createMockSpec());
      const config = builder.buildSync();

      expect(config.origin.type).toBe('s3');
      expect(config.defaultBehavior?.viewerProtocolPolicy).toBe('redirect-to-https');
      expect(config.priceClass).toBe('PriceClass_100');
      expect(config.logging?.enabled).toBe(true);
      expect(config.monitoring?.enabled).toBe(true);
      expect(config.hardeningProfile).toBe('baseline');
    });

    it('ConfigurationBuilder__FedRampHighDefaults__AppliesComplianceDefaults', () => {
      // Test Metadata: {"id":"TP-cloudfront-distribution-config-002","level":"unit","capability":"Configuration builder applies FedRAMP High compliance defaults","oracle":"exact","invariants":["Viewer protocol policy upgraded to https-only","Price class upgraded to PriceClass_All","Logging enabled with enhanced monitoring","Error 5xx alarms enabled","Hardening profile upgraded to STIG"],"fixtures":["createMockContext","createMockSpec"],"inputs":{"shape":"ComponentSpec with FedRAMP High framework","notes":"Compliance framework overrides platform defaults"},"risks":["Non-compliant default values"],"dependencies":["config/fedramp-high.yml"],"evidence":["viewerProtocolPolicy=https-only","priceClass=PriceClass_All","monitoring.alarms.error5xx.enabled=true","hardeningProfile=stig"],"compliance_refs":["std://platform-configuration","std://platform-security"],"ai_generated":true,"human_reviewed_by":"Platform Engineering Team"}
      const builder = new CloudFrontDistributionComponentConfigBuilder(createMockContext('fedramp-high'), createMockSpec());
      const config = builder.buildSync();

      expect(config.defaultBehavior?.viewerProtocolPolicy).toBe('https-only');
      expect(config.priceClass).toBe('PriceClass_All');
      expect(config.logging?.enabled).toBe(true);
      expect(config.monitoring?.enabled).toBe(true);
      expect(config.monitoring?.alarms?.error5xx?.enabled).toBe(true);
      expect(config.hardeningProfile).toBe('stig');
    });

    it('ConfigurationBuilder__UserOverrides__MergesWithPlatformDefaults', () => {
      // Test Metadata: {"id":"TP-cloudfront-distribution-config-003","level":"unit","capability":"Configuration builder merges user overrides with platform defaults","oracle":"exact","invariants":["User values override platform defaults","Unspecified values use platform defaults"],"fixtures":["createMockContext","createMockSpec"],"inputs":{"shape":"ComponentSpec with user overrides","notes":"Tests configuration precedence chain"},"risks":["Incorrect precedence order"],"dependencies":["config/commercial.yml"],"evidence":["origin.type=custom (user override)","origin.customDomainName=api.internal.example.com (user override)","logging.bucket=custom-logs (user override)"],"compliance_refs":["std://platform-configuration"],"ai_generated":true,"human_reviewed_by":"Platform Engineering Team"}
      const builder = new CloudFrontDistributionComponentConfigBuilder(
        createMockContext('commercial'),
        createMockSpec({
          origin: {
            type: 'custom',
            customDomainName: 'api.internal.example.com'
          },
          defaultBehavior: {
            viewerProtocolPolicy: 'redirect-to-https',
            allowedMethods: ['GET', 'HEAD', 'POST']
          },
          logging: {
            enabled: true,
            bucket: 'custom-logs'
          }
        })
      );

      const config = builder.buildSync();

      expect(config.origin.type).toBe('custom');
      expect(config.origin.customDomainName).toBe('api.internal.example.com');
      expect(config.defaultBehavior?.viewerProtocolPolicy).toBe('redirect-to-https');
      expect(config.defaultBehavior?.allowedMethods).toContain('POST');
      expect(config.logging?.bucket).toBe('custom-logs');
    });

    it('ConfigurationBuilder__MonitoringDefaults__NormalizesPartialAlarmConfiguration', () => {
      // Test Metadata: {"id":"TP-cloudfront-distribution-config-004","level":"unit","capability":"Configuration builder normalizes monitoring alarms when partially specified","oracle":"exact","invariants":["Monitoring enabled when specified","Partial alarm config gets default values","Error 4xx alarm enabled with default threshold","Origin latency alarm configured with custom threshold"],"fixtures":["createMockContext","createMockSpec"],"inputs":{"shape":"ComponentSpec with partial monitoring config","notes":"Tests alarm configuration normalization"},"risks":["Incomplete alarm configuration"],"dependencies":["config/commercial.yml"],"evidence":["monitoring.alarms.error4xx.enabled=true","monitoring.alarms.error4xx.threshold>0","monitoring.alarms.originLatencyMs.threshold=7500"],"compliance_refs":["std://platform-configuration","std://platform-observability"],"ai_generated":true,"human_reviewed_by":"Platform Engineering Team"}
      const builder = new CloudFrontDistributionComponentConfigBuilder(
        createMockContext('commercial'),
        createMockSpec({
          monitoring: {
            enabled: true,
            alarms: {
              error4xx: { enabled: true },
              originLatencyMs: { enabled: true, threshold: 7500 }
            }
          }
        })
      );

      const config = builder.buildSync();

      expect(config.monitoring?.alarms?.error4xx?.enabled).toBe(true);
      expect(config.monitoring?.alarms?.error4xx?.threshold).toBeGreaterThan(0);
      expect(config.monitoring?.alarms?.originLatencyMs?.threshold).toBe(7500);
      expect(config.additionalBehaviors).toEqual([]);
    });
  });
});
