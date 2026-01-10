import type { IVpc } from 'aws-cdk-lib/aws-ec2';
import { createMockBinderRegistry, createMockBinderStrategy, createOutputsMap, createTestResolverEngine, createTestStack, MockComponent } from './test-helpers.js';

describe('ResolverEngine__ContextInjectionTiming', () => {
  it('ContextInjection__VpcBindingBeforeSynthesis__ContextAvailable', async () => {
    const stack = createTestStack();
    const vpcStub = {} as IVpc;
    const component = new MockComponent(stack, 'Db', {
      name: 'rds',
      type: 'rds-postgres',
      contextOverrides: { vpc: vpcStub },
      onSynth: () => {
        expect(component.context.vpc).toBe(vpcStub);
      }
    });

    const registry = createMockBinderRegistry([createMockBinderStrategy({
      supportedCapabilities: ['networking:vpc'],
      bind: async () => ({
        environmentVariables: {},
        iamPolicies: [],
        securityGroupRules: [],
        compliance: { status: 'compliant', framework: 'commercial', actionsTaken: [] }
      })
    })]);

    const resolver = createTestResolverEngine({ binderRegistry: registry });

    await (resolver as any).synthesizeComponents([component]);
  });

  it('ContextInjection__VpcBindingAfterSynthesis__FailsGracefully', async () => {
    const stack = createTestStack();
    const component = new MockComponent(stack, 'Db', {
      name: 'rds',
      type: 'rds-postgres',
      onSynth: () => {
        if (!component.context.vpc) {
          throw new Error('VPC context not available');
        }
      }
    });

    const resolver = createTestResolverEngine({
      binderRegistry: createMockBinderRegistry([])
    });

    await expect((resolver as any).synthesizeComponents([component]))
      .rejects
      .toThrow("Failed to synthesize component 'rds': VPC context not available");
  });

  it('ContextInjection__LazyResolution__DeferredAccess', async () => {
    const stack = createTestStack();
    const component = new MockComponent(stack, 'Db', {
      name: 'rds',
      type: 'rds-postgres'
    });

    const resolver = createTestResolverEngine({
      binderRegistry: createMockBinderRegistry([])
    });

    const outputsMap = await (resolver as any).synthesizeComponents([component]);
    expect(outputsMap.get('rds')).toBeDefined();

    const vpcStub = {} as IVpc;
    component.context.vpc = vpcStub;
    expect(component.context.vpc).toBe(vpcStub);
  });
});
