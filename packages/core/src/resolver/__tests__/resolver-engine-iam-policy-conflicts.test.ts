import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { createMockBinderRegistry, createMockBinderStrategy, createOutputsMap, createTestLogger, createTestResolverEngine, createTestStack, MockComponent } from './test-helpers.js';

describe('ResolverEngine__IamPolicyConflicts', () => {
  const createIamStrategy = () => createMockBinderStrategy({
    supportedCapabilities: ['storage:s3'],
    bind: async (context) => {
      const options = context.directive.options ?? {};
      const statement = new PolicyStatement({
        effect: options.effect ?? Effect.ALLOW,
        actions: options.actions ?? [],
        resources: options.resources ?? []
      });

      return {
        environmentVariables: {},
        iamPolicies: [{
          statement,
          description: 'test-policy',
          complianceRequirement: 'unit-test'
        }],
        securityGroupRules: [],
        compliance: { status: 'compliant', framework: 'commercial', actionsTaken: [] }
      };
    }
  });

  it('IamPolicyConflicts__ConflictingPolicies__Detected', async () => {
    const stack = createTestStack();
    const source = new MockComponent(stack, 'Lambda', { name: 'lambda', type: 'lambda-api' });
    const targetA = new MockComponent(stack, 'BucketA', { name: 'bucket-a', type: 's3-bucket' });
    const targetB = new MockComponent(stack, 'BucketB', { name: 'bucket-b', type: 's3-bucket' });
    source.spec.binds = [
      { to: 'bucket-a', capability: 'storage:s3', access: 'read', options: { actions: ['s3:GetObject'], resources: ['arn:aws:s3:::bucket'], effect: Effect.ALLOW } },
      { to: 'bucket-b', capability: 'storage:s3', access: 'read', options: { actions: ['s3:GetObject'], resources: ['arn:aws:s3:::bucket'], effect: Effect.DENY } }
    ];

    const resolver = createTestResolverEngine({
      binderRegistry: createMockBinderRegistry([createIamStrategy()])
    });

    await expect((resolver as any).bindComponents([source, targetA, targetB], createOutputsMap([source, targetA, targetB]), {}))
      .rejects
      .toThrow('Conflicting IAM policy effects');
  });

  it('IamPolicyConflicts__PolicyMerging__CorrectResult', async () => {
    const stack = createTestStack();
    const source = new MockComponent(stack, 'Lambda', { name: 'lambda', type: 'lambda-api' });
    const targetA = new MockComponent(stack, 'BucketA', { name: 'bucket-a', type: 's3-bucket' });
    const targetB = new MockComponent(stack, 'BucketB', { name: 'bucket-b', type: 's3-bucket' });
    source.spec.binds = [
      { to: 'bucket-a', capability: 'storage:s3', access: 'read', options: { actions: ['s3:GetObject'], resources: ['arn:aws:s3:::bucket'], effect: Effect.ALLOW } },
      { to: 'bucket-b', capability: 'storage:s3', access: 'read', options: { actions: ['s3:PutObject'], resources: ['arn:aws:s3:::bucket'], effect: Effect.ALLOW } }
    ];

    const logger = createTestLogger();
    const resolver = createTestResolverEngine({
      binderRegistry: createMockBinderRegistry([createIamStrategy()]),
      logger
    });

    await (resolver as any).bindComponents([source, targetA, targetB], createOutputsMap([source, targetA, targetB]), {});

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Merged IAM actions'));
  });

  it('IamPolicyConflicts__OverPrivileging__Detected', async () => {
    const stack = createTestStack();
    const source = new MockComponent(stack, 'Lambda', { name: 'lambda', type: 'lambda-api' });
    const target = new MockComponent(stack, 'BucketA', { name: 'bucket-a', type: 's3-bucket' });
    source.spec.binds = [
      { to: 'bucket-a', capability: 'storage:s3', access: 'read', options: { actions: ['s3:*'], resources: ['arn:aws:s3:::bucket'], effect: Effect.ALLOW } }
    ];

    const logger = createTestLogger();
    const resolver = createTestResolverEngine({
      binderRegistry: createMockBinderRegistry([createIamStrategy()]),
      logger
    });

    await (resolver as any).bindComponents([source, target], createOutputsMap([source, target]), {});

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Over-privileging detected'));
  });
});
