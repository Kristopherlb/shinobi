/**
 * CloudFront Distribution Component Synthesis Test Suite
 * Implements Platform Testing Standard v1.0 - Component Synthesis Testing
 */

jest.mock(
  '@platform/logger',
  () => ({
    Logger: {
      getLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
      setGlobalContext: jest.fn()
    }
  }),
  { virtual: true }
);

import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { CloudFrontDistributionComponent } from '../src/cloudfront-distribution.component.ts';
import { CloudFrontDistributionConfig } from '../src/cloudfront-distribution.builder.ts';
import { ComponentContext, ComponentSpec } from '../../../core/src/platform/contracts/component-interfaces.ts';

// Deterministic test fixtures
const DETERMINISTIC_TIMESTAMP = new Date('2025-01-08T12:00:00.000Z');

// Helper factories
const createMockContext = (framework: string): ComponentContext => ({
  serviceName: 'test-service',
  owner: 'platform-team',
  environment: 'dev',
  complianceFramework: framework,
  region: 'us-east-1',
  account: '123456789012',
  tags: {
    'service-name': 'test-service',
    environment: 'dev',
    'compliance-framework': framework
  }
});

const createMockSpec = (config: Partial<CloudFrontDistributionConfig> = {}): ComponentSpec => ({
  name: 'cdn',
  type: 'cloudfront-distribution',
  config
});

const synthesize = (context: ComponentContext, spec: ComponentSpec) => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  const component = new CloudFrontDistributionComponent(stack, spec.name, context, spec);
  component.synth();
  return { component, template: Template.fromStack(stack) };
};

describe('CloudFrontDistributionComponent', () => {
  // Freeze time for deterministic tests
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(DETERMINISTIC_TIMESTAMP);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('ComponentSynthesis__CommercialMode__CreatesBasicDistribution', () => {
    it('ComponentSynthesis__CommercialDefaults__CreatesCloudFrontDistribution', () => {
      // Test Metadata: {"id":"TP-cloudfront-distribution-synthesis-001","level":"unit","capability":"Component synthesis creates commercial distribution with baseline defaults","oracle":"contract","invariants":["CloudFront distribution created with correct price class","Default cache behavior uses redirect-to-https"],"fixtures":["createMockContext","createMockSpec","synthesize"],"inputs":{"shape":"Commercial context with minimal config","notes":"Tests basic synthesis path"},"risks":["Missing required resources"],"dependencies":["aws-cdk-lib"],"evidence":["AWS::CloudFront::Distribution present","PriceClass=PriceClass_100","ViewerProtocolPolicy=redirect-to-https"],"compliance_refs":["std://platform-tagging"],"ai_generated":true,"human_reviewed_by":"Platform Engineering Team"}
      const { template } = synthesize(createMockContext('commercial'), createMockSpec());

      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          PriceClass: 'PriceClass_100',
          DefaultCacheBehavior: Match.objectLike({
            ViewerProtocolPolicy: 'redirect-to-https'
          })
        })
      });
    });

    it('ComponentSynthesis__FedRampHighDefaults__AppliesHardenedConfiguration', () => {
      // Test Metadata: {"id":"TP-cloudfront-distribution-synthesis-002","level":"unit","capability":"Component synthesis applies FedRAMP High hardened settings","oracle":"contract","invariants":["CloudFront distribution uses PriceClass_All","Default cache behavior uses https-only","Logging configured with bucket and include cookies"],"fixtures":["createMockContext","createMockSpec","synthesize"],"inputs":{"shape":"FedRAMP High context","notes":"Tests compliance-specific synthesis"},"risks":["Missing compliance controls"],"dependencies":["config/fedramp-high.yml"],"evidence":["PriceClass=PriceClass_All","ViewerProtocolPolicy=https-only","Logging.Bucket present","Logging.IncludeCookies=true"],"compliance_refs":["std://platform-security"],"ai_generated":true,"human_reviewed_by":"Platform Engineering Team"}
      const { template } = synthesize(createMockContext('fedramp-high'), createMockSpec());

      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          PriceClass: 'PriceClass_All',
          DefaultCacheBehavior: Match.objectLike({
            ViewerProtocolPolicy: 'https-only'
          }),
          Logging: Match.objectLike({
            Bucket: Match.anyValue(),
            IncludeCookies: true
          })
        })
      });
    });
  });

  describe('ComponentSynthesis__ManifestOverrides__RespectsUserConfiguration', () => {
    it('ComponentSynthesis__CustomOriginAndBehavior__CreatesConfiguredDistribution', () => {
      // Test Metadata: {"id":"TP-cloudfront-distribution-synthesis-003","level":"unit","capability":"Component synthesis respects manifest overrides for origin and behaviors","oracle":"contract","invariants":["CloudFront distribution uses custom origin configuration","Default cache behavior configured with custom methods","Logging configured with custom bucket"],"fixtures":["createMockContext","createMockSpec","synthesize"],"inputs":{"shape":"Commercial context with custom origin and behavior","notes":"Tests manifest override synthesis"},"risks":["Incorrect configuration application"],"dependencies":["aws-cdk-lib"],"evidence":["DefaultCacheBehavior.ViewerProtocolPolicy=redirect-to-https","DefaultCacheBehavior.AllowedMethods includes POST","Logging present"],"compliance_refs":["std://platform-tagging"],"ai_generated":true,"human_reviewed_by":"Platform Engineering Team"}
      const { template } = synthesize(
        createMockContext('commercial'),
        createMockSpec({
          origin: {
            type: 'custom',
            customDomainName: 'internal-api.example.com'
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

      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          DefaultCacheBehavior: Match.objectLike({
            ViewerProtocolPolicy: 'redirect-to-https',
            AllowedMethods: [
              'GET',
              'HEAD',
              'OPTIONS',
              'PUT',
              'PATCH',
              'POST',
              'DELETE'
            ]
          }),
          Logging: Match.anyValue()
        })
      });
    });

    it('ComponentSynthesis__CapabilityRegistration__ProvidesCorrectCapabilities', () => {
      // Test Metadata: {"id":"TP-cloudfront-distribution-synthesis-004","level":"unit","capability":"Component synthesis provides correct capabilities after synthesis","oracle":"exact","invariants":["CloudFront distribution capability registered","Capability contains origin type and hardening profile","Telemetry includes metrics and logging configuration"],"fixtures":["createMockContext","createMockSpec","synthesize"],"inputs":{"shape":"Commercial context with custom configuration","notes":"Tests capability registration"},"risks":["Incorrect capability data"],"dependencies":["aws-cdk-lib"],"evidence":["capability.originType=custom","capability.hardeningProfile=baseline","telemetry.metrics contains 4xxErrorRate"],"compliance_refs":["std://platform-capability"],"ai_generated":true,"human_reviewed_by":"Platform Engineering Team"}
      const { component } = synthesize(
        createMockContext('commercial'),
        createMockSpec({
          origin: {
            type: 'custom',
            customDomainName: 'internal-api.example.com'
          },
          logging: {
            enabled: true,
            bucket: 'custom-logs'
          }
        })
      );

      const capability = component.getCapabilities()['cloudfront:distribution'];
      expect(capability.originType).toBe('custom');
      expect(capability.hardeningProfile).toBe('baseline');
      expect(capability.telemetry?.metrics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ metricName: '4xxErrorRate' }),
          expect.objectContaining({ metricName: 'OriginLatency' })
        ])
      );
      expect(capability.telemetry?.logging).toEqual(
        expect.objectContaining({ destination: 's3' })
      );
    });
  });
});
