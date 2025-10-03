/**
 * Path: packages/core/src/platform/binders/strategies/ml/__tests__/sagemaker-binder-strategy.test.ts
 */

import { SageMakerBinderStrategy } from '../sagemaker-binder-strategy.ts';
import type { BindingContext } from '../../../binding-context.ts';
import type { ComponentBinding } from '../../../component-binding.ts';

class MockComponent {
  public env: Record<string, string> = {};
  public policies: any[] = [];
  addEnvironment(k: string, v: string) { this.env[k] = v; }
  addToRolePolicy(stmt: any) { this.policies.push(stmt); }
}

describe('SageMakerBinderStrategy config-driven behavior', () => {
  test('SageMakerNotebook__RequireSecureAccess__AppliesVpcKmsAndLogging', async () => {
    const metadata = {
      id: 'TP-binders-sagemaker-001',
      level: 'unit',
      capability: 'sagemaker:notebook',
      oracle: 'exact',
      invariants: ['envs set for subnet/sg/kms/logging'],
      fixtures: ['MockComponent', 'MockNotebook'],
      inputs: { shape: 'ComponentBinding', notes: 'requireSecureAccess true; kmsKeyId set' },
      risks: [], dependencies: [], evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: false, human_reviewed_by: ''
    };

    const strategy = new SageMakerBinderStrategy();
    const source = new MockComponent();
    const target = {
      notebookInstanceArn: 'arn:aws:sagemaker:us-east-1:123456789012:notebook-instance/nb1',
      notebookInstanceName: 'nb1',
      instanceType: 'ml.t3.medium',
      notebookInstanceStatus: 'InService',
      defaultCodeRepository: 's3://nb-code',
      subnetId: 'subnet-1',
      securityGroupIds: ['sg-1', 'sg-2'],
      kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/abc',
      lifecycleConfigName: 'shutdown-policy',
      disableRootAccess: true
    } as any;

    const binding: ComponentBinding = {
      from: 'ml', to: 'nb1', capability: 'sagemaker:notebook', access: ['read', 'write'], env: {},
      options: { requireSecureAccess: true }
    } as any;
    const context: BindingContext = { region: 'us-east-1', accountId: '123456789012', environment: 'test' } as any;

    await strategy.bind(source as any, target as any, binding, context);

    expect(source.env.SAGEMAKER_SUBNET_ID).toBe('subnet-1');
    expect(source.env.SAGEMAKER_SECURITY_GROUP_IDS).toBe('sg-1,sg-2');
    expect(source.env.SAGEMAKER_KMS_KEY_ID).toBe(target.kmsKeyId);
    expect(source.env.SAGEMAKER_ROOT_ACCESS_ENABLED).toBe('false');
    expect(source.env.SAGEMAKER_LIFECYCLE_CONFIG).toBe('shutdown-policy');
    expect(source.policies.length).toBeGreaterThan(0);
  });
});


