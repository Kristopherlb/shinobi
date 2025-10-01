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
import { CloudFrontDistributionComponent } from '../cloudfront-distribution.component.js';
import { CloudFrontDistributionConfig } from '../cloudfront-distribution.builder.js';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces.js';

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

describe('CloudFrontDistributionComponent synthesis', () => {
  it('creates commercial distribution with baseline defaults', () => {
    const { template } = synthesize(createMockContext('commercial'), createMockSpec());

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        PriceClass: 'PriceClass_100',
        DefaultCacheBehavior: Match.objectLike({
          ViewerProtocolPolicy: 'allow-all'
        })
      })
    });
  });

  it('applies FedRAMP High hardened defaults', () => {
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

  it('respects manifest overrides for origin and behaviors', () => {
    const { template, component } = synthesize(
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

    const capability = component.getCapabilities()['cdn:cloudfront'];
    expect(capability.originType).toBe('custom');
    expect(capability.hardeningProfile).toBe('baseline');
  });
});
