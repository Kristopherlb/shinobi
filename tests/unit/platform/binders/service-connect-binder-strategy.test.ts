import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { ServiceConnectBinderStrategy } from '../../../../packages/core/src/platform/binders/strategies/networking/service-connect-binder-strategy';

type CapabilityMap = Record<string, any>;

class MockComponent extends Construct {
  private readonly constructs = new Map<string, any>();
  private readonly capabilities: CapabilityMap = {};
  public readonly addEnvironment = jest.fn();

  constructor(scope: Construct, id: string) {
    super(scope, id);
  }

  registerConstruct(handle: string, construct: any): void {
    this.constructs.set(handle, construct);
  }

  setCapability(key: string, value: any): void {
    this.capabilities[key] = value;
  }

  getConstruct(handle: string): any {
    return this.constructs.get(handle);
  }

  getCapabilities(): CapabilityMap {
    return this.capabilities;
  }
}

describe('ServiceConnectBinderStrategy', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;
  let strategy: ServiceConnectBinderStrategy;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'ServiceConnectBinderTestStack');
    vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });
    strategy = new ServiceConnectBinderStrategy();
  });

  /*
   * Test Metadata: TP-service-connect-binder-001
   * {
   *   "id": "TP-service-connect-binder-001",
   *   "level": "unit",
   *   "capability": "Binder applies least-privilege security group rules",
   *   "oracle": "contract",
   *   "invariants": ["Ingress port equals advertised port"],
   *   "fixtures": ["ServiceConnectBinderStrategy", "MockComponent", "SecurityGroup"],
   *   "inputs": { "shape": "Capability metadata with sgId and port", "notes": "Source and target security groups registered" },
   *   "risks": ["Overly permissive service connectivity"],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["strategy.bind"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-networking-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('BinderStrategy__LeastPrivilegeRules__ConfiguresIngressAndEgress', async () => {
    const sourceComponent = new MockComponent(stack, 'SourceComponent');
    const targetComponent = new MockComponent(stack, 'TargetComponent');

    const sourceSecurityGroup = new ec2.SecurityGroup(stack, 'SourceSecurityGroup', { vpc });
    const targetSecurityGroup = new ec2.SecurityGroup(stack, 'TargetSecurityGroup', { vpc });

    sourceComponent.registerConstruct('securityGroup', sourceSecurityGroup);
    targetComponent.registerConstruct('securityGroup', targetSecurityGroup);

    targetComponent.setCapability('service:connect', {
      serviceName: 'orders-api',
      serviceArn: 'arn:aws:ecs:us-east-1:123456789012:service/orders-api',
      dnsName: 'orders.internal',
      port: 8080,
      sgId: targetSecurityGroup.securityGroupId,
      internalEndpoint: 'http://orders.internal:8080'
    });

    await strategy.bind(
      sourceComponent,
      targetComponent,
      {
        from: 'frontend',
        to: 'orders',
        capability: 'service:connect',
        access: ['write'],
        env: {
          SERVICE_CONNECT_ENDPOINT: 'internalEndpoint',
          SERVICE_CONNECT_PORT: 'port'
        }
      },
      {
        region: 'us-east-1',
        accountId: '123456789012',
        complianceFramework: 'commercial'
      }
    );

    const ingress = targetSecurityGroup.node.children.find(
      child => child instanceof ec2.CfnSecurityGroupIngress
    ) as ec2.CfnSecurityGroupIngress | undefined;
    expect(ingress).toBeDefined();
    expect(cdk.Stack.of(targetSecurityGroup).resolve(ingress!.fromPort)).toBe(8080);
    expect(cdk.Stack.of(targetSecurityGroup).resolve(ingress!.toPort)).toBe(8080);

    expect(sourceComponent.addEnvironment).toHaveBeenCalledWith(
      'SERVICE_CONNECT_ENDPOINT',
      'http://orders.internal:8080'
    );
    expect(sourceComponent.addEnvironment).toHaveBeenCalledWith(
      'SERVICE_CONNECT_PORT',
      '8080'
    );
  });

  /*
   * Test Metadata: TP-service-connect-binder-002
   * {
   *   "id": "TP-service-connect-binder-002",
   *   "level": "unit",
   *   "capability": "Binder rejects missing source security group",
   *   "oracle": "contract",
   *   "invariants": ["Error message mentions missing security group"],
   *   "fixtures": ["ServiceConnectBinderStrategy", "MockComponent"],
   *   "inputs": { "shape": "Capability without registered source SG", "notes": "sgId provided only for target" },
   *   "risks": ["Silent binding without security controls"],
   *   "dependencies": [],
   *   "evidence": ["strategy.bind"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-networking-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('BinderStrategy__MissingSourceSecurityGroup__Throws', async () => {
    const sourceComponent = new MockComponent(stack, 'SourceNoSg');
    const targetComponent = new MockComponent(stack, 'TargetNoSg');

    targetComponent.setCapability('service:connect', {
      serviceName: 'payments',
      port: 443,
      sgId: 'sg-1234'
    });

    await expect(
      strategy.bind(
        sourceComponent,
        targetComponent,
        {
          from: 'client',
          to: 'payments',
          capability: 'service:connect',
          access: ['read']
        },
        {
          region: 'us-east-1',
          accountId: '123456789012',
          complianceFramework: 'commercial'
        }
      )
    ).rejects.toThrow('Source component must expose a security group for service:connect bindings');
  });
});
