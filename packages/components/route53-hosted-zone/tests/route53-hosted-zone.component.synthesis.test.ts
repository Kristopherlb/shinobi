import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import { Route53HostedZoneComponent } from '../route53-hosted-zone.component.js';
import { Route53HostedZoneConfig } from '../route53-hosted-zone.builder.js';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces.js';

const VPC_ID = 'vpc-0abc123def4567890';
const CONTEXT_KEY = `vpcProvider:account=123456789012:filter.vpcId=${VPC_ID}:region=us-east-1`;

const createContext = (framework: string = 'commercial', stack?: Stack): ComponentContext => {
  const app = stack?.node.root as App || new App();
  const testStack = stack || new Stack(app, 'TestStack', {
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
  const component = new Route53HostedZoneComponent(context.scope, spec.name, context, spec);
  component.synth();

  return {
    component,
    template: Template.fromStack(context.scope as Stack)
  };
};

describe('Route53HostedZoneComponent synthesis', () => {
  const originalContext = process.env.CDK_CONTEXT_JSON;

  beforeAll(() => {
    process.env.CDK_CONTEXT_JSON = JSON.stringify({
      [CONTEXT_KEY]: {
        vpcId: VPC_ID,
        availabilityZones: ['us-east-1a', 'us-east-1b'],
        publicSubnetIds: ['subnet-public-a', 'subnet-public-b'],
        privateSubnetIds: ['subnet-private-a', 'subnet-private-b'],
        isolatedSubnetIds: [],
        ownerAccountId: '123456789012'
      }
    });
  });

  afterAll(() => {
    if (originalContext === undefined) {
      delete process.env.CDK_CONTEXT_JSON;
    } else {
      process.env.CDK_CONTEXT_JSON = originalContext;
    }
  });

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
    const spec = createSpec({
      zoneName: 'internal.example.com',
      zoneType: 'private',
      vpcAssociations: [
        { vpcId: VPC_ID }
      ],
      dnssec: {
        enabled: true
      }
    });

    const { component, template } = synthesizeComponent(createContext('commercial'), spec);

    template.hasResourceProperties('AWS::Route53::HostedZone', Match.objectLike({
      VPCs: Match.arrayWith([
        Match.objectLike({ VPCId: VPC_ID })
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
