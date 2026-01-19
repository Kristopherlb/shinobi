import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { createTestApp, createMockedServices } from '../../../core/src/platform/contracts/__tests__/test-helpers.js';
import { Route53HostedZoneComponent } from '../route53-hosted-zone.component';
import { Route53HostedZoneConfig } from '../route53-hosted-zone.builder';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

const createContext = (framework: string = 'commercial', stack?: Stack, app?: App): ComponentContext => {
  const testApp = app || createTestApp();
  const testStack = stack || new Stack(testApp, 'TestStack', {
    env: { account: '123456789012', region: 'us-east-1' }
  });

  return {
    serviceName: 'dns-service',
    owner: 'platform-team',
    environment: 'dev',
    complianceFramework: framework as 'commercial' | 'fedramp-moderate' | 'fedramp-high',
    region: 'us-east-1',
    accountId: '123456789012',
    scope: testStack,
    serviceLabels: {
      'service-name': 'dns-service',
      owner: 'platform-team',
      environment: 'dev',
      'compliance-framework': framework
    },
    tags: {
      'service-name': 'dns-service',
      environment: 'dev',
      'compliance-framework': framework
    }
  };
};

const createSpec = (config: Partial<Route53HostedZoneConfig>): ComponentSpec => ({
  name: 'public-zone',
  type: 'route53-hosted-zone',
  config
});

const synthesizeComponent = (context: ComponentContext, spec: ComponentSpec) => {
  const mockedServices = createMockedServices();
  const component = new Route53HostedZoneComponent(context.scope, spec.name, context, spec, mockedServices);
  component.synth();

  return {
    component,
    template: Template.fromStack(context.scope as Stack)
  };
};

describe('Route53HostedZoneComponent synthesis', () => {

  it('creates a public hosted zone with query logging disabled', () => {
    const spec = createSpec({
      zoneName: 'example.com',
      zoneType: 'public',
      queryLogging: {
        enabled: false,
        retentionDays: 90,
        removalPolicy: 'destroy'
      }
    });

    const { component, template } = synthesizeComponent(createContext('commercial'), spec);

    template.hasResourceProperties('AWS::Route53::HostedZone', Match.objectLike({
      Name: 'example.com.'
    }));

    const capability = component.getCapabilities()['dns:hosted-zone'];
    expect(capability).toBeDefined();
    expect(capability.queryLoggingEnabled).toBe(false);
    expect(capability.queryLogGroupArn).toBeUndefined();
  });

  it('creates a public hosted zone with query logging enabled', () => {
    const spec = createSpec({
      zoneName: 'example.com',
      zoneType: 'public',
      queryLogging: {
        enabled: true,
        retentionDays: 90,
        removalPolicy: 'destroy'
      }
    });

    const { component, template } = synthesizeComponent(createContext('commercial'), spec);

    template.hasResourceProperties('AWS::Route53::HostedZone', Match.objectLike({
      Name: 'example.com.'
    }));

    // Verify query logging resource is created
    template.hasResource('AWS::Route53::QueryLoggingConfig', Match.anyValue());

    // Verify capability includes query logging info
    const capability = component.getCapabilities()['dns:hosted-zone'];
    expect(capability).toBeDefined();
    expect(capability.queryLoggingEnabled).toBe(true);
    expect(capability.queryLogGroupArn).toBeDefined();
  });

  it('creates a private hosted zone with VPC association and DNSSEC', () => {
    // Create VPC construct and inject via context (avoids Vpc.fromLookup() in unit tests)
    const app = createTestApp();
    const stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });
    const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });
    const context = createContext('commercial', stack, app);
    context.vpc = vpc; // Inject VPC via context (avoids Vpc.fromLookup() in unit tests)

    const spec = createSpec({
      zoneName: 'internal.example.com',
      zoneType: 'private',
      // Use injected VPC via context.vpc instead of vpcId (avoids Vpc.fromLookup() in unit tests)
      // vpcId is optional when context.vpc is provided - component will use context.vpc for single VPC association
      vpcAssociations: [
        {} // vpcId not required when using injected VPC via context.vpc
      ],
      dnssec: {
        enabled: true
      }
    });

    const { component, template } = synthesizeComponent(context, spec);

    // Verify private hosted zone is created with VPC association
    // When using injected VPC, VPCId will be a CDK token, so we just verify the structure exists
    template.hasResourceProperties('AWS::Route53::HostedZone', Match.objectLike({
      VPCs: Match.arrayWith([
        Match.objectLike({ 
          VPCId: Match.anyValue(), // VPC ID will be a token when using injected VPC
          VPCRegion: 'us-east-1'
        })
      ])
    }));

    template.hasResourceProperties('AWS::Route53::DNSSEC', Match.objectLike({
      HostedZoneId: Match.anyValue()
    }));

    // Verify capability includes DNSSEC status
    const capability = component.getCapabilities()['dns:hosted-zone'];
    expect(capability.dnssecEnabled).toBe(true);
  });

  it('enables monitoring alarms when requested', () => {
    const spec = createSpec({
      zoneName: 'example.org',
      monitoring: {
        enabled: true,
        alarms: {
          queryVolume: {
            enabled: true,
            threshold: 20000
          },
          healthCheckFailures: {
            enabled: true,
            threshold: 5
          }
        }
      }
    });

    const { template } = synthesizeComponent(createContext('commercial'), spec);

    // Verify alarm is created with consistent naming pattern
    template.hasResource('AWS::CloudWatch::Alarm', Match.objectLike({
      Properties: Match.objectLike({
        AlarmName: Match.stringLikeRegexp('dns-service-public-zone-query-volume-alarm')
      })
    }));

    // Verify health check failures alarm
    template.hasResource('AWS::CloudWatch::Alarm', Match.objectLike({
      Properties: Match.objectLike({
        AlarmName: Match.stringLikeRegexp('dns-service-public-zone-health-check-failures-alarm')
      })
    }));
  });
});
