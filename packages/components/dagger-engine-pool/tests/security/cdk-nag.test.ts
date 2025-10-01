import { App, Stack } from 'aws-cdk-lib';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { DaggerEnginePool } from '../../dagger-engine-pool.component.js';
import { ComponentContext, ComponentSpec } from '@platform/contracts';
import { DaggerConfig } from '../../types.js';

describe('CDK Nag Security Tests', () => {
  let app: App;
  let stack: Stack;
  let component: DaggerEnginePool;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack');

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

    component = new DaggerEnginePool(stack, 'TestDaggerPool', context, spec);
  });

  test('should pass CDK Nag security checks', () => {
    // Add CDK Nag checks
    AwsSolutionsChecks.check(stack);

    // Verify that the component has proper CDK Nag suppressions
    const suppressions = NagSuppressions.getSuppressions(stack);
    expect(suppressions).toBeDefined();
    expect(suppressions.length).toBeGreaterThan(0);

    // Verify specific suppressions are present
    const suppressionIds = suppressions.map(s => s.id);
    expect(suppressionIds).toContain('AwsSolutions-IAM4');
    expect(suppressionIds).toContain('AwsSolutions-IAM5');
    expect(suppressionIds).toContain('AwsSolutions-EC23');
    expect(suppressionIds).toContain('AwsSolutions-S10');
  });

  test('should have proper IAM policy suppressions', () => {
    const suppressions = NagSuppressions.getSuppressions(stack);
    const iam4Suppressions = suppressions.filter(s => s.id === 'AwsSolutions-IAM4');

    expect(iam4Suppressions).toHaveLength(1);
    expect(iam4Suppressions[0].reason).toContain('custom IAM policies instead of managed policies');
  });

  test('should have proper security group suppressions', () => {
    const suppressions = NagSuppressions.getSuppressions(stack);
    const ec23Suppressions = suppressions.filter(s => s.id === 'AwsSolutions-EC23');

    expect(ec23Suppressions).toHaveLength(1);
    expect(ec23Suppressions[0].reason).toContain('Outbound internet access required');
  });

  test('should have proper S3 bucket suppressions', () => {
    const suppressions = NagSuppressions.getSuppressions(stack);
    const s10Suppressions = suppressions.filter(s => s.id === 'AwsSolutions-S10');

    expect(s10Suppressions).toHaveLength(1);
    expect(s10Suppressions[0].reason).toContain('S3 bucket requires public access for CI/CD artifact sharing');
  });

  test('should have proper IAM wildcard suppressions', () => {
    const suppressions = NagSuppressions.getSuppressions(stack);
    const iam5Suppressions = suppressions.filter(s => s.id === 'AwsSolutions-IAM5');

    expect(iam5Suppressions).toHaveLength(1);
    expect(iam5Suppressions[0].reason).toContain('Wildcard resources required for SSM Session Manager');
  });
});
