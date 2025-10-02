import {
  CloudFrontDistributionComponentConfigBuilder,
  CloudFrontDistributionConfig
} from '../src/cloudfront-distribution.builder.js';
import { ComponentContext, ComponentSpec } from '../../../core/src/platform/contracts/component-interfaces.js';

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
  it('merges commercial defaults with hardcoded fallbacks', () => {
    const builder = new CloudFrontDistributionComponentConfigBuilder(createMockContext('commercial'), createMockSpec());
    const config = builder.buildSync();

    expect(config.origin.type).toBe('s3');
    expect(config.defaultBehavior?.viewerProtocolPolicy).toBe('redirect-to-https');
    expect(config.priceClass).toBe('PriceClass_100');
    expect(config.logging?.enabled).toBe(true);
    expect(config.monitoring?.enabled).toBe(true);
    expect(config.hardeningProfile).toBe('baseline');
  });

  it('applies FedRAMP High defaults from platform configuration', () => {
    const builder = new CloudFrontDistributionComponentConfigBuilder(createMockContext('fedramp-high'), createMockSpec());
    const config = builder.buildSync();

    expect(config.defaultBehavior?.viewerProtocolPolicy).toBe('https-only');
    expect(config.priceClass).toBe('PriceClass_All');
    expect(config.logging?.enabled).toBe(true);
    expect(config.monitoring?.enabled).toBe(true);
    expect(config.monitoring?.alarms?.error5xx?.enabled).toBe(true);
    expect(config.hardeningProfile).toBe('stig');
  });

  it('honours manifest overrides above platform defaults', () => {
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

  it('normalises optional structures with safe defaults', () => {
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
