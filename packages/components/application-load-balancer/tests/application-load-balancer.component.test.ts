import { jest } from '@jest/globals';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

import { ApplicationLoadBalancerComponent } from '../src/application-load-balancer.component.ts';
import { ApplicationLoadBalancerComponentConfigBuilder } from '../src/application-load-balancer.builder.ts';

const VPC_CONTEXT_KEY = 'vpcProvider:account=123456789012:filter.vpcId=vpc-0000:region=us-east-1';

const createContext = (framework = 'commercial', scope?: Stack) => ({
  serviceName: 'checkout-service',
  environment: framework === 'fedramp-high' ? 'prod' : 'dev',
  complianceFramework: framework,
  scope,
  region: 'us-east-1',
  accountId: '123456789012'
});

const createSpec = (config = {}) => ({
  name: 'checkout-alb',
  type: 'application-load-balancer',
  config
});

describe('ApplicationLoadBalancerComponent__Synthesis__ResourceValidation', () => {
  let app: App;
  let stack: Stack;
  let context;
  let loadPlatformConfigSpy: jest.SpiedFunction<ApplicationLoadBalancerComponentConfigBuilder['_loadPlatformConfiguration']>;
  const originalContextJson = process.env.CDK_CONTEXT_JSON;

  beforeAll(() => {
    process.env.CDK_CONTEXT_JSON = JSON.stringify({
      [VPC_CONTEXT_KEY]: {
        vpcId: 'vpc-0000',
        ownerAccountId: '123456789012',
        availabilityZones: ['us-east-1a', 'us-east-1b'],
        publicSubnetIds: ['subnet-public-a', 'subnet-public-b'],
        privateSubnetIds: ['subnet-private-a', 'subnet-private-b'],
        publicSubnetRouteTableIds: ['rtb-public-a', 'rtb-public-b'],
        privateSubnetRouteTableIds: ['rtb-private-a', 'rtb-private-b']
      }
    });
  });

  afterAll(() => {
    if (originalContextJson === undefined) {
      delete process.env.CDK_CONTEXT_JSON;
    } else {
      process.env.CDK_CONTEXT_JSON = originalContextJson;
    }
  });

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'AlbTestStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });
    context = createContext('commercial', stack);

    loadPlatformConfigSpy = jest
      .spyOn(ApplicationLoadBalancerComponentConfigBuilder.prototype, '_loadPlatformConfiguration')
      .mockImplementation(function () {
        const framework = this.builderContext.context.complianceFramework;
        if (framework === 'fedramp-high') {
          return {
            scheme: 'internal',
            deletionProtection: true,
            accessLogs: { enabled: true, retentionDays: 365, removalPolicy: 'retain' },
            listeners: [{ port: 443, protocol: 'HTTPS' }],
            monitoring: { enabled: true }
          };
        }

        return {
          scheme: 'internet-facing',
          deletionProtection: false,
          ipAddressType: 'ipv4',
          accessLogs: { enabled: true, retentionDays: 90 },
          listeners: [{ port: 80, protocol: 'HTTP' }],
          monitoring: { enabled: true }
        };
      });
  });

  afterEach(() => {
    loadPlatformConfigSpy.mockRestore();
  });

  const synthesize = (specOverrides = {}, contextOverrides = {}) => {
    const ctx = { ...context, ...contextOverrides };
    const spec = createSpec({ vpc: { vpcId: 'vpc-0000' }, ...specOverrides });
    const component = new ApplicationLoadBalancerComponent(stack, spec.name, ctx, spec);
    component.synth();
    return { component, template: Template.fromStack(stack) };
  };

  /*
   * Test Metadata: TP-ALB-COMPONENT-001
   * {
   *   "id": "TP-ALB-COMPONENT-001",
   *   "level": "unit",
   *   "capability": "Commercial synthesis creates internet-facing ALB",
   *   "oracle": "contract",
   *   "invariants": ["Scheme is internet-facing", "Type application"],
   *   "fixtures": ["cdk.Stack", "ApplicationLoadBalancerComponent"],
   *   "inputs": { "shape": "Commercial framework", "notes": "VPC resolved via context provider" },
   *   "risks": ["Incorrect load balancer scheme"],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["Scheme=internet-facing"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('LoadBalancerResource__CommercialDefaults__CreatesInternetFacingAlb', () => {
    const { template } = synthesize();

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Scheme: 'internet-facing',
      Type: 'application'
    });
  });

  /*
   * Test Metadata: TP-ALB-COMPONENT-002
   * {
   *   "id": "TP-ALB-COMPONENT-002",
   *   "level": "unit",
   *   "capability": "Commercial synthesis provisions managed security group",
   *   "oracle": "contract",
   *   "invariants": ["Security group allowAllOutbound true"],
   *   "fixtures": ["cdk.Stack", "ApplicationLoadBalancerComponent"],
   *   "inputs": { "shape": "Commercial framework", "notes": "Default security group" },
   *   "risks": ["Missing managed security group"],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["SecurityGroupIngress array defined"],
   *   "compliance_refs": ["std://security"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('SecurityGroupResource__CommercialDefaults__CreatesManagedGroup', () => {
    const { template } = synthesize();

    template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: Match.stringLikeRegexp('Security group for')
    });
  });

  /*
   * Test Metadata: TP-ALB-COMPONENT-003
   * {
   *   "id": "TP-ALB-COMPONENT-003",
   *   "level": "unit",
   *   "capability": "FedRAMP high enables deletion protection",
   *   "oracle": "contract",
   *   "invariants": ["deletion_protection.enabled true"],
   *   "fixtures": ["cdk.Stack", "ApplicationLoadBalancerComponent"],
   *   "inputs": { "shape": "FedRAMP high framework", "notes": "HTTPS listener" },
   *   "risks": ["Accidental deletion"],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["LoadBalancerAttributes includes deletion_protection"],
   *   "compliance_refs": ["std://security"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('LoadBalancerAttributes__FedrampHigh__EnablesDeletionProtection', () => {
    const { template } = synthesize(
      {
        listeners: [
          {
            port: 443,
            protocol: 'HTTPS',
            certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/abcd'
          }
        ]
      },
      { complianceFramework: 'fedramp-high', environment: 'prod' }
    );

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      LoadBalancerAttributes: Match.arrayWith([
        Match.objectLike({ Key: 'deletion_protection.enabled', Value: 'true' })
      ])
    });
  });

  /*
   * Test Metadata: TP-ALB-COMPONENT-004
   * {
   *   "id": "TP-ALB-COMPONENT-004",
   *   "level": "unit",
   *   "capability": "FedRAMP high access logs bucket retains data per policy",
   *   "oracle": "contract",
   *   "invariants": ["Retention >= 365"],
   *   "fixtures": ["cdk.Stack", "ApplicationLoadBalancerComponent"],
   *   "inputs": { "shape": "FedRAMP high framework", "notes": "Access logs enabled" },
   *   "risks": ["Insufficient log retention"],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["Lifecycle rule expiration >= retention"],
   *   "compliance_refs": ["std://logging"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('AccessLogsBucket__FedrampHigh__ConfiguresRetentionPolicy', () => {
    const { template } = synthesize(
      {
        listeners: [
          {
            port: 443,
            protocol: 'HTTPS',
            certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/abcd'
          }
        ]
      },
      { complianceFramework: 'fedramp-high', environment: 'prod' }
    );

    const buckets = template.findResources('AWS::S3::Bucket');
    const bucket = Object.values(buckets)[0];
    const rules = bucket.Properties?.LifecycleConfiguration?.Rules ?? [];
    const retentionRule = rules.find((rule: any) => typeof rule.ExpirationInDays === 'number');
    expect(retentionRule?.ExpirationInDays).toBeGreaterThanOrEqual(365);
  });

  /*
   * Test Metadata: TP-ALB-COMPONENT-005
   * {
   *   "id": "TP-ALB-COMPONENT-005",
   *   "level": "unit",
   *   "capability": "Capabilities expose ALB DNS and ARN",
   *   "oracle": "exact",
   *   "invariants": ["Capability contains dnsName", "Capability contains arn"],
   *   "fixtures": ["cdk.Stack", "ApplicationLoadBalancerComponent"],
   *   "inputs": { "shape": "Commercial framework", "notes": "Default configuration" },
   *   "risks": ["Capability registry drift"],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["capabilities['net:load-balancer'] includes dnsName"],
   *   "compliance_refs": ["std://capabilities"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('Capabilities__CommercialDefaults__PublishesLoadBalancerMetadata', () => {
    const { component } = synthesize();

    const capability = component.getCapabilities()['net:load-balancer'];
    expect(capability).toEqual(
      expect.objectContaining({
        arn: expect.any(String),
        dnsName: expect.any(String),
        scheme: 'internet-facing'
      })
    );
  });

  /*
   * Test Metadata: TP-ALB-COMPONENT-006
   * {
   *   "id": "TP-ALB-COMPONENT-006",
   *   "level": "unit",
   *   "capability": "Synthesis fails when VPC configuration missing",
   *   "oracle": "exact",
   *   "invariants": ["resolveVpc throws"],
   *   "fixtures": ["cdk.Stack", "ApplicationLoadBalancerComponent"],
   *   "inputs": { "shape": "Commercial framework without vpc.vpcId", "notes": "Negative coverage" },
   *   "risks": ["Implicit default VPC lookup"],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["Error message mentions context.vpc"],
   *   "compliance_refs": ["std://testing"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('Validation__MissingVpc__ThrowsExplicitError', () => {
    const component = new ApplicationLoadBalancerComponent(
      stack,
      'InvalidAlb',
      context,
      createSpec({})
    );

    expect(() => component.synth()).toThrow('requires `config.vpc.vpcId`');
  });
});
