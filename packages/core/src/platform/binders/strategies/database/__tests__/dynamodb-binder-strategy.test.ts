/**
 * Path: packages/core/src/platform/binders/strategies/database/__tests__/dynamodb-binder-strategy.test.ts
 */

import { DynamoDbBinderStrategy } from '../dynamodb-binder-strategy.js';
import type { BindingContext } from '../../../binding-context.js';
import type { ComponentBinding } from '../../../component-binding.js';

// Minimal mock component capturing env vars and IAM policies
class MockComponent {
  public env: Record<string, string> = {};
  public policies: any[] = [];
  addEnvironment(key: string, value: string) {
    this.env[key] = value;
  }
  addToRolePolicy(statement: any) {
    this.policies.push(statement);
  }
}

describe('DynamoDbBinderStrategy config-driven behavior', () => {
  test('DynamoDbBinderStrategy__RequireSecureAccessEnabled__AppliesSecureAccessEnvsAndPolicies', async () => {
    // Test Metadata
    const metadata = {
      id: 'TP-binders-dynamodb-001',
      level: 'unit',
      capability: 'dynamodb:table',
      oracle: 'exact',
      invariants: [
        'secure access enabled applies SSE/PITR/VPC env where present',
        'least-privilege IAM statements are appended'
      ],
      fixtures: ['MockComponent', 'MockTargetTable'],
      inputs: { shape: 'ComponentBinding', notes: 'requireSecureAccess true; retentionDays 30; VPC endpoint enabled' },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: false,
      human_reviewed_by: ''
    };

    const strategy = new DynamoDbBinderStrategy();
    const source = new MockComponent();
    const target = {
      tableArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/app-table',
      tableName: 'app-table',
      sseSpecification: { sseEnabled: true, sseType: 'KMS', kmsMasterKeyId: 'arn:aws:kms:us-east-1:123456789012:key/abc' },
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      globalTableVersion: undefined
    } as any;

    const binding: ComponentBinding = {
      from: 'api',
      to: 'db',
      capability: 'dynamodb:table',
      access: ['read', 'write', 'backup'],
      env: {},
      options: { requireSecureAccess: true, backupRetentionDays: 30, enableVpcEndpoint: true }
    } as any;

    const context: BindingContext = {
      region: 'us-east-1',
      accountId: '123456789012',
      environment: 'test'
    } as any;

    await strategy.bind(source as any, target as any, binding, context);

    // Env expectations (config-driven)
    expect(source.env.DYNAMODB_TABLE_NAME).toBe('app-table');
    expect(source.env.DYNAMODB_TABLE_ARN).toBe(target.tableArn);
    expect(source.env.DYNAMODB_REGION).toBe('us-east-1');
    expect(source.env.DYNAMODB_SSE_ENABLED).toBe('true');
    expect(source.env.DYNAMODB_SSE_TYPE).toBe('KMS');
    expect(source.env.DYNAMODB_KMS_KEY_ID).toBe('arn:aws:kms:us-east-1:123456789012:key/abc');
    expect(source.env.DYNAMODB_PITR_ENABLED).toBe('true');
    expect(source.env.DYNAMODB_BACKUP_RETENTION_DAYS).toBe('30');
    expect(source.env.DYNAMODB_VPC_ENDPOINT_ENABLED).toBe('true');

    // IAM expectations: non-empty and least-privilege style (no Resource: '*')
    expect(source.policies.length).toBeGreaterThan(0);
    for (const pol of source.policies) {
      // Allow wildcard only where service requires; DynamoDB statements here should target resource ARNs
      const resources = Array.isArray(pol.Resource) ? pol.Resource : [pol.Resource];
      expect(resources.every((r: string) => typeof r === 'string' && r.includes('arn:aws'))).toBe(true);
    }
  });

  test('DynamoDbBinderStrategy__RequireSecureAccessDisabled__DoesNotApplySecureEnvs', async () => {
    // Test Metadata
    const metadata = {
      id: 'TP-binders-dynamodb-002',
      level: 'unit',
      capability: 'dynamodb:table',
      oracle: 'exact',
      invariants: [
        'core envs are always set for table name/arn',
        'secure-only envs remain unset when requireSecureAccess=false'
      ],
      fixtures: ['MockComponent', 'MockTargetTableMinimal'],
      inputs: { shape: 'ComponentBinding', notes: 'requireSecureAccess false; minimal target; no secure flags' },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-testing-standard.md'],
      ai_generated: false,
      human_reviewed_by: ''
    };
    const strategy = new DynamoDbBinderStrategy();
    const source = new MockComponent();
    const target = {
      tableArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/basic-table',
      tableName: 'basic-table'
    } as any;

    const binding: ComponentBinding = {
      from: 'api',
      to: 'db',
      capability: 'dynamodb:table',
      access: ['read'],
      env: {},
      options: { requireSecureAccess: false }
    } as any;

    const context: BindingContext = {
      region: 'us-east-1',
      accountId: '123456789012',
      environment: 'test'
    } as any;

    await strategy.bind(source as any, target as any, binding, context);

    // Core env set
    expect(source.env.DYNAMODB_TABLE_NAME).toBe('basic-table');
    expect(source.env.DYNAMODB_TABLE_ARN).toBe(target.tableArn);

    // Secure-only envs absent
    expect(source.env.DYNAMODB_SSE_ENABLED).toBeUndefined();
    expect(source.env.DYNAMODB_PITR_ENABLED).toBeUndefined();
    expect(source.env.DYNAMODB_VPC_ENDPOINT_ENABLED).toBeUndefined();
  });
});


