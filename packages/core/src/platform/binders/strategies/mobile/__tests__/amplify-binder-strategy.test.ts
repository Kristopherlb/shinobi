/**
 * Path: packages/core/src/platform/binders/strategies/mobile/__tests__/amplify-binder-strategy.test.ts
 */

import { AmplifyBinderStrategy } from '../amplify-binder-strategy';
import type { BindingContext } from '../../../binding-context';
import type { ComponentBinding } from '../../../component-binding';

class MockComponent {
  public env: Record<string, string> = {};
  public policies: any[] = [];
  addEnvironment(k: string, v: string) { this.env[k] = v; }
  addToRolePolicy(stmt: any) { this.policies.push(stmt); }
}

describe('AmplifyBinderStrategy config-driven behavior', () => {
  test('AmplifyApp__RequireSecureAccess__AppliesSecurityEnvsAndPolicies', async () => {
    const metadata = {
      id: 'TP-binders-amplify-001',
      level: 'unit',
      capability: 'amplify:app',
      oracle: 'exact',
      invariants: ['envs set for security; policies for logs/waf when present'],
      fixtures: ['MockComponent', 'MockAmplifyApp'],
      inputs: { shape: 'ComponentBinding', notes: 'requireSecureAccess true; waf and vpc config provided' },
      risks: [], dependencies: [], evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: false, human_reviewed_by: ''
    };

    const strategy = new AmplifyBinderStrategy();
    const source = new MockComponent();
    const target = {
      appArn: 'arn:aws:amplify:us-east-1:123456789012:apps/d1',
      appId: 'd1',
      name: 'webapp',
      defaultDomain: 'amplifyapp.com',
      repository: 'github/org/repo',
      platform: 'WEB',
      customHeaders: 'x-test: 1',
      wafWebAclArn: 'arn:aws:wafv2:us-east-1:123456789012:regional/webacl/waf',
      enableVpc: true,
      vpcConfig: { subnets: ['subnet-1'], securityGroups: ['sg-1'] }
    } as any;

    const binding: ComponentBinding = {
      from: 'frontend', to: 'app', capability: 'amplify:app', access: ['read', 'write'], env: {},
      options: { requireSecureAccess: true }
    } as any;
    const context: BindingContext = { region: 'us-east-1', accountId: '123456789012', environment: 'test' } as any;

    await strategy.bind(source as any, target as any, binding, context);

    expect(source.env.AMPLIFY_SECURITY_ENABLED).toBe('true');
    expect(source.env.AMPLIFY_HTTPS_REDIRECT_ENABLED).toBe('true');
    expect(source.env.AMPLIFY_ACCESS_LOGGING_ENABLED).toBe('true');
    expect(source.env.AMPLIFY_VPC_ENABLED).toBe('true');
    expect(source.env.AMPLIFY_WAF_WEB_ACL_ARN).toBe('arn:aws:wafv2:us-east-1:123456789012:regional/webacl/waf');
    expect(source.env.AMPLIFY_AUDIT_LOGGING_ENABLED).toBe('true');
    expect(source.policies.length).toBeGreaterThan(0);
  });
});


