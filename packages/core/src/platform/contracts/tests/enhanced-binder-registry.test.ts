/**
 * Enhanced Binder Registry Tests
 * Tests for the improved binder registry with async support and compliance
 */

import { EnhancedBinderRegistry } from '../enhanced-binder-registry';
import { DatabaseBinderStrategy } from '../binders/database-binder-strategy';
import { EnhancedBindingContext, Capability, ComplianceFramework, IComponent } from '../bindings';
import { BindingDirective } from '../platform-binding-trigger-spec';

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

describe('EnhancedBinderRegistry', () => {
  let registry: EnhancedBinderRegistry;

  beforeEach(() => {
    registry = new EnhancedBinderRegistry(mockLogger);
  });

  describe('Strategy Registration', () => {
    it('should register strategies correctly', () => {
      const strategy = new DatabaseBinderStrategy();
      registry.register(strategy);

      const stats = registry.getStats();
      expect(stats.strategiesCount).toBeGreaterThan(0);
    });

    it('should find appropriate strategy for binding', () => {
      const strategy = registry.findStrategy('lambda-api', 'db:postgres' as Capability);
      expect(strategy).toBeInstanceOf(DatabaseBinderStrategy);
    });

    it('should return null for unsupported binding', () => {
      const strategy = registry.findStrategy('unsupported-type', 'unsupported-capability' as Capability);
      expect(strategy).toBeNull();
    });
  });

  describe('Binding Execution', () => {
    it('should execute binding with compliance enforcement', async () => {
      const context: EnhancedBindingContext = {
        source: mockComponent,
        target: mockComponent,
        directive: {
          capability: 'db:postgres' as Capability,
          access: 'read'
        } as BindingDirective,
        environment: 'test',
        complianceFramework: 'commercial' as ComplianceFramework,
        targetCapabilityData: mockComponent.getCapabilityData()
      };

      const result = await registry.bind(context);

      expect(result).toBeDefined();
      expect(result.environmentVariables).toBeDefined();
      expect(result.iamPolicies).toBeDefined();
      expect(result.securityGroupRules).toBeDefined();
      expect(result.complianceActions).toBeDefined();
      expect(result.metadata?.bindingId).toBeDefined();
    });

    it('should report compliance actions for high framework', async () => {
      const context: EnhancedBindingContext = {
        source: mockComponent,
        target: mockComponent,
        directive: {
          capability: 'db:postgres' as Capability,
          access: 'read'
        } as BindingDirective,
        environment: 'test',
        complianceFramework: 'fedramp-high' as ComplianceFramework,
        targetCapabilityData: mockComponent.getCapabilityData()
      };

      const result = await registry.bind(context);
      expect(result).toBeDefined();
      expect(Array.isArray(result.complianceActions || [])).toBe(true);
      expect((result.complianceActions || []).length).toBeGreaterThan(0);
    });
  });

  describe('Cache Functionality', () => {
    it('should cache binding results', async () => {
      const context: EnhancedBindingContext = {
        source: mockComponent,
        target: mockComponent,
        directive: {
          capability: 'db:postgres' as Capability,
          access: 'read'
        } as BindingDirective,
        environment: 'test',
        complianceFramework: 'commercial' as ComplianceFramework,
        targetCapabilityData: mockComponent.getCapabilityData()
      };

      // First call
      const result1 = await registry.bind(context);

      // Second call should use cache
      const result2 = await registry.bind(context);

      expect(result1).toEqual(result2);

      const stats = registry.getStats();
      expect(stats.cacheStats.hits).toBeGreaterThan(0);
    });

    it('should clear cache', () => {
      registry.clearCache();

      const stats = registry.getStats();
      expect(stats.cacheStats.size).toBe(0);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide comprehensive statistics', () => {
      const stats = registry.getStats();

      expect(stats).toHaveProperty('strategiesCount');
      expect(stats).toHaveProperty('cacheStats');
      expect(stats).toHaveProperty('metricsStats');

      expect(stats.cacheStats).toHaveProperty('hits');
      expect(stats.cacheStats).toHaveProperty('misses');
      expect(stats.cacheStats).toHaveProperty('hitRate');
    });
  });
});
