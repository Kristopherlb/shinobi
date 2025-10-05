import * as route53 from 'aws-cdk-lib/aws-route53';
import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { CertificateManagerComponent } from '../src/certificate-manager.component.ts';
import { CertificateManagerConfig } from '../src/certificate-manager.builder.ts';
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

  /*
   * Test Metadata: TP-certificate-manager-component-001
   * {
   *   "id": "TP-certificate-manager-component-001",
   *   "level": "integration",
   *   "capability": "Commercial synthesis provisions ACM certificate with DNS validation",
   *   "oracle": "exact",
   *   "invariants": ["DNS validation required", "Domain name matches manifest"],
   *   "fixtures": ["CDK App", "Hosted zone fixture", "Component context"],
   *   "inputs": { "shape": "Commercial context without overrides", "notes": "Defaults only" },
   *   "risks": ["Certificate created with wrong validation method"],
   *   "dependencies": ["aws-cdk-lib/assertions"],
   *   "evidence": ["AWS::CertificateManager::Certificate"],
   *   "compliance_refs": ["std://platform-testing-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('CommercialSynthesis__DnsValidation__CreatesBaselineCertificate', () => {
    const { template } = synthesize('commercial');

    template.hasResourceProperties('AWS::CertificateManager::Certificate', {
      DomainName: 'example.com',
      ValidationMethod: 'DNS'
    });
  });

  /*
   * Test Metadata: TP-certificate-manager-component-002
   * {
   *   "id": "TP-certificate-manager-component-002",
   *   "level": "integration",
   *   "capability": "FedRAMP High synthesis applies hardened key algorithm, logging, and alarms",
   *   "oracle": "exact",
   *   "invariants": ["Key algorithm tag present", "Monitoring alarms provisioned"],
   *   "fixtures": ["CDK App", "Hosted zone fixture", "Component context"],
   *   "inputs": { "shape": "FedRAMP High context without overrides", "notes": "Prod environment" },
   *   "risks": ["Missing hardened key algorithm", "Monitoring misconfigured"],
   *   "dependencies": ["aws-cdk-lib/assertions"],
   *   "evidence": ["AWS::CertificateManager::Certificate", "AWS::CloudWatch::Alarm"],
   *   "compliance_refs": ["std://platform-testing-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('FedrampHighSynthesis__PlatformBaseline__EnablesHardenedSettings', () => {
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
