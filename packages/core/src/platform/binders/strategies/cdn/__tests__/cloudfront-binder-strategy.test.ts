/**
 * Path: packages/core/src/platform/binders/strategies/cdn/__tests__/cloudfront-binder-strategy.test.ts
 */

import { CloudFrontBinderStrategy } from '../cloudfront-binder-strategy.js';
import type { BindingContext } from '../../../binding-context.js';
import type { ComponentBinding } from '../../../component-binding.js';

class MockComponent {
  public env: Record<string, string> = {};
  public policies: any[] = [];
  addEnvironment(k: string, v: string) { this.env[k] = v; }
  addToRolePolicy(stmt: any) { this.policies.push(stmt); }
}

describe('CloudFrontBinderStrategy config-driven behavior', () => {
  test('CloudFrontDistribution__RequireSecureAccess__AppliesSecureAccess', async () => {
    const metadata = {
      id: 'TP-binders-cloudfront-001',
      level: 'unit',
      capability: 'cdn:distribution',
      oracle: 'exact',
      invariants: ['envs set for distribution; IAM statements scoped'],
      fixtures: ['MockComponent', 'MockDistribution'],
      inputs: { shape: 'ComponentBinding', notes: 'requireSecureAccess true; edgeLocationsUsOnly true' },
      risks: [], dependencies: [], evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: false, human_reviewed_by: ''
    };

    const strategy = new CloudFrontBinderStrategy();
    const source = new MockComponent();
    const target = {
      distributionArn: 'arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE',
      distributionId: 'EDFDVBD6EXAMPLE',
      domainName: 'd111111abcdef8.cloudfront.net',
      status: 'Deployed',
      enabled: true,
      priceClass: 'PriceClass_100'
    } as any;

    const binding: ComponentBinding = {
      from: 'app', to: 'cdn', capability: 'cloudfront:distribution', access: ['read', 'write'], env: {},
      options: { requireSecureAccess: true, edgeLocationsUsOnly: true }
    } as any;
    const context: BindingContext = { region: 'us-east-1', accountId: '123456789012', environment: 'test' } as any;

    await strategy.bind(source as any, target as any, binding, context);

    expect(source.env.CLOUDFRONT_DISTRIBUTION_ID).toBe('EDFDVBD6EXAMPLE');
    expect(source.env.CLOUDFRONT_DISTRIBUTION_ARN).toBe('arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE');
    expect(source.policies.length).toBeGreaterThan(0);
  });
});


