import * as route53 from 'aws-cdk-lib/aws-route53';
import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { CertificateManagerComponent } from '../src/certificate-manager.component.js';
import { CertificateManagerConfig } from '../src/certificate-manager.builder.js';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

const createSpec = (config: Partial<CertificateManagerConfig>): ComponentSpec => ({
  name: 'cert-test',
  type: 'certificate-manager',
  config
});

describe('CertificateManagerComponent synthesis', () => {
  const synthesize = (
    framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high',
    overrides: Partial<CertificateManagerConfig> = {}
  ) => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    const hostedZone = new route53.PublicHostedZone(stack, 'HostedZone', { zoneName: 'example.com' });

    const context: ComponentContext = {
      serviceName: 'test-service',
      owner: 'platform-team',
      environment: framework === 'fedramp-high' ? 'prod' : 'dev',
      complianceFramework: framework,
      region: 'us-east-1',
      account: '123456789012',
      scope: stack,
      tags: {
        'service-name': 'test-service',
        environment: framework === 'fedramp-high' ? 'prod' : 'dev',
        'compliance-framework': framework
      }
    };

    const spec = createSpec({
      domainName: 'example.com',
      validation: {
        method: 'DNS',
        hostedZoneId: hostedZone.hostedZoneId,
        hostedZoneName: hostedZone.zoneName
      },
      ...overrides
    });

    const component = new CertificateManagerComponent(stack, 'CertificateManager', context, spec);
    component.synth();

    return {
      template: Template.fromStack(stack),
      component
    };
  };

  it('creates an ACM certificate with DNS validation for commercial defaults', () => {
    const { template } = synthesize('commercial');

    template.hasResourceProperties('AWS::CertificateManager::Certificate', {
      DomainName: 'example.com',
      ValidationMethod: 'DNS'
    });
  });

  it('enables hardened settings for fedramp-high', () => {
    const { template } = synthesize('fedramp-high');

    template.hasResourceProperties('AWS::CertificateManager::Certificate', {
      DomainName: 'example.com',
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'key-algorithm', Value: 'EC_secp384r1' })
      ])
    });

    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: Match.anyValue()
    });

    template.resourceCountIs('AWS::CloudWatch::Alarm', 2);
  });
});
