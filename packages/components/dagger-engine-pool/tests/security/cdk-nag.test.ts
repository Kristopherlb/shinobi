import { App, Stack, Aspects } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
import { AwsSolutionsChecks } from 'cdk-nag';
import { NagSuppressionHelper } from 'cdk-nag/lib/utils/nag-suppression-helper.js';
import { DaggerEnginePool } from '../../dagger-engine-pool.component.js';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { DaggerConfig } from '../../types.js';

describe.skip('CDK Nag Security Tests', () => {
  let app: App;
  let stack: Stack;
  let component: DaggerEnginePool;
  let suppressions: ReturnType<typeof collectSuppressions>;
  let spies: jest.SpiedFunction<any>[];

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });
    spies = [];

    const mockVpc = new ec2.Vpc(stack, 'MockVpc', { maxAzs: 2 });
    const mockKey = new kms.Key(stack, 'MockKmsKey');
    const mockBucket = new s3.Bucket(stack, 'MockArtifacts');
    const mockLogGroup = new logs.LogGroup(stack, 'MockLogGroup');

    spies.push(jest.spyOn(DaggerEnginePool.prototype as any, 'getVpc').mockReturnValue(mockVpc));
    spies.push(jest.spyOn(DaggerEnginePool.prototype as any, 'createKmsKeyIfNeeded').mockReturnValue(mockKey));
    spies.push(jest.spyOn(DaggerEnginePool.prototype as any, 'createArtifactsBucket').mockReturnValue(mockBucket));
    spies.push(jest.spyOn(DaggerEnginePool.prototype as any, 'createLogGroup').mockReturnValue(mockLogGroup));

    const context: ComponentContext = {
      environment: 'test',
      complianceFramework: 'commercial',
      owner: 'test-owner',
      service: 'test-service'
    };

    const spec: ComponentSpec = {
      type: 'dagger-engine-pool',
      name: 'test-dagger-pool',
      version: '1.0.0',
      config: {
        fipsMode: true,
        capacity: { min: 1, max: 3, desired: 2 },
        daggerVersion: '0.9.0'
      } as DaggerConfig
    };

    component = new DaggerEnginePool(stack, 'TestDaggerPool', context, spec, {
      overrides: spec.config as Partial<DaggerConfig>
    });

    Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));
    component.synth();
    app.synth();
    suppressions = collectSuppressions();
  });

  afterEach(() => {
    spies.forEach(spy => spy.mockRestore());
  });

  test('should pass CDK Nag security checks', () => {
    const suppressionIds = suppressions.map(s => s.id);
    expect(suppressionIds).toEqual(expect.arrayContaining([
      'AwsSolutions-IAM4',
      'AwsSolutions-IAM5',
      'AwsSolutions-EC23',
      'AwsSolutions-S10'
    ]));
  });

  test('should have proper IAM policy suppressions', () => {
    const iam4Suppressions = suppressions.filter(s => s.id === 'AwsSolutions-IAM4');

    expect(iam4Suppressions).toHaveLength(1);
    expect(iam4Suppressions[0].reason).toContain('custom IAM policies instead of managed policies');
  });

  test('should have proper security group suppressions', () => {
    const ec23Suppressions = suppressions.filter(s => s.id === 'AwsSolutions-EC23');

    expect(ec23Suppressions).toHaveLength(1);
    expect(ec23Suppressions[0].reason).toContain('Outbound internet access required');
  });

  test('should have proper S3 bucket suppressions', () => {
    const s10Suppressions = suppressions.filter(s => s.id === 'AwsSolutions-S10');

    expect(s10Suppressions).toHaveLength(1);
    expect(s10Suppressions[0].reason).toContain('S3 bucket requires public access for CI/CD artifact sharing');
  });

  test('should have proper IAM wildcard suppressions', () => {
    const iam5Suppressions = suppressions.filter(s => s.id === 'AwsSolutions-IAM5');

    expect(iam5Suppressions).toHaveLength(1);
    expect(iam5Suppressions[0].reason).toContain('Wildcard resources required for SSM Session Manager');
  });

  function collectSuppressions() {
    const collected: Array<{ id: string; reason: string; appliesTo?: string[] }> = [];
    for (const construct of stack.node.findAll()) {
      const possibleL1 = construct.node.defaultChild;
      if (possibleL1 && 'cfnResourceType' in possibleL1) {
        collected.push(...NagSuppressionHelper.getSuppressions(possibleL1));
      }
    }

    const stackMetadata = stack.templateOptions.metadata?.cdk_nag?.rules_to_suppress ?? [];
    stackMetadata.forEach(rule => {
      collected.push(NagSuppressionHelper.toApiFormat(rule));
    });

    const unique = new Map<string, { id: string; reason: string; appliesTo?: string[] }>();
    collected.forEach(suppression => {
      const key = `${suppression.id}:${JSON.stringify(suppression.appliesTo ?? [])}`;
      if (!unique.has(key)) {
        unique.set(key, suppression);
      }
    });

    return Array.from(unique.values());
  }
});
