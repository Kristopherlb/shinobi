/**
 * Simple Registry Test
 * Basic test to verify the enhanced binder registry works
 */

import { EnhancedBinderRegistry } from '../enhanced-binder-registry.ts';
import { DatabaseBinderStrategy } from '../binders/database-binder-strategy.ts';
import { EnhancedBindingContext, Capability, ComplianceFramework, IComponent, PostgresCapabilityData } from '../bindings.ts';
import { BindingDirective } from '../platform-binding-trigger-spec.ts';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Minimal IComponent mock
const mockComponent: IComponent = {
  getName: () => 'test-component',
  getId: () => 'test-component-id',
  getType: () => 'lambda-api',
  getServiceName: () => 'test-service',
  getCapabilities: () => ({} as any),
  getConstruct: () => ({} as any),
  synth: () => undefined as any,
  _getSecurityGroupHandle: () => undefined as any,
  node: {} as any,
  context: {} as any,
  spec: { name: 'test', type: 'lambda-api', config: {} } as any,
  getCapabilityData: () => ({
    type: 'db:postgres' as const,
    endpoints: { host: 'localhost', port: 5432, database: 'testdb' },
    resources: { arn: 'arn:aws:rds:us-east-1:123456789012:db:testdb' },
    secrets: { masterSecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret' },
    securityGroups: ['sg-12345'],
    subnetGroup: 'test-subnet-group'
  })
};

describe('Simple Registry Test', () => {
  let registry: EnhancedBinderRegistry;

  beforeEach(() => {
    registry = new EnhancedBinderRegistry(mockLogger);
  });

  test('should register and find database strategy', () => {
    const strategy = new DatabaseBinderStrategy();
    registry.register(strategy);

    const foundStrategy = registry.findStrategy('lambda-api', 'db:postgres' as Capability);
    expect(foundStrategy).toBeInstanceOf(DatabaseBinderStrategy);
  });

  test('should execute binding with commercial framework', async () => {
    const context: EnhancedBindingContext = {
      source: mockComponent,
      target: mockComponent,
      directive: {
        capability: 'db:postgres' as Capability,
        access: 'read',
        env: {}
      } as BindingDirective,
      environment: 'test',
      complianceFramework: 'commercial' as ComplianceFramework,
      targetCapabilityData: mockComponent.getCapabilityData() as PostgresCapabilityData
    };

    const result = await registry.bind(context);

    expect(result).toBeDefined();
    expect(result.environmentVariables).toBeDefined();
    expect(result.iamPolicies).toBeDefined();
    expect(result.securityGroupRules).toBeDefined();
    expect(result.complianceActions).toBeDefined();
    expect(result.metadata?.bindingId).toBeDefined();
  });

  test('should provide statistics', () => {
    const stats = registry.getStats();

    expect(stats).toHaveProperty('strategiesCount');
    expect(stats).toHaveProperty('cacheStats');
    expect(stats).toHaveProperty('metricsStats');
  });
});
