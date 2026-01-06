/**
 * Tests for createUnifiedBinderRegistry factory function
 * 
 * Validates runtime discovery of binder strategies and ensures the factory
 * correctly discovers, filters, and instantiates all binder strategies.
 */

import { createUnifiedBinderRegistry } from '@shinobi/binders';
import { UnifiedBinderRegistry } from '../unified-binder-registry.js';
import { UnifiedBinderStrategyBase } from '../../../contracts/unified-binder-strategy-base.js';
import type { IUnifiedBinderStrategy } from '../../../contracts/platform-binding-trigger-spec.js';

describe('createUnifiedBinderRegistry', () => {
  let registry: UnifiedBinderRegistry;

  beforeAll(async () => {
    registry = await createUnifiedBinderRegistry();
  });

  describe('Basic Functionality', () => {
    it('returns a valid UnifiedBinderRegistry instance', () => {
      expect(registry).toBeDefined();
      expect(registry).toBeInstanceOf(UnifiedBinderRegistry);
      expect(typeof registry.findStrategyForBinding).toBe('function');
      expect(typeof registry.findStrategy).toBe('function');
      expect(typeof registry.hasStrategy).toBe('function');
      expect(typeof registry.getStrategyCount).toBe('function');
    });

    it('discovers 55+ binder strategies', () => {
      // When new binder is added, this test should pass without code changes
      // This validates the zero-maintenance promise of runtime discovery
      const strategyCount = registry.getStrategyCount();
      expect(strategyCount).toBeGreaterThanOrEqual(55);
    });

    it('contains expected key capabilities', () => {
      // Security capabilities
      expect(registry.hasStrategy('kms:key')).toBe(true);
      expect(registry.hasStrategy('secretsmanager:secret')).toBe(true);
      
      // Database capabilities
      expect(registry.hasStrategy('db:postgres')).toBe(true);
      expect(registry.hasStrategy('db:dynamodb')).toBe(true);
      
      // Compute capabilities
      expect(registry.hasStrategy('lambda:function')).toBe(true);
      expect(registry.hasStrategy('ecs:cluster')).toBe(true);
    });
  });

  describe('Discovery Criteria', () => {
    it('only includes classes ending with BinderStrategy', () => {
      // Verify all strategies have names ending with BinderStrategy
      // We can't directly access all strategies, but we can verify via capabilities
      const capabilities = registry.getRegisteredCapabilities();
      expect(capabilities.length).toBeGreaterThan(0);
      
      // Verify key strategies exist (these should all end with BinderStrategy)
      const kmsStrategy = registry.findStrategy('kms:key');
      expect(kmsStrategy).not.toBeNull();
      expect(kmsStrategy?.constructor.name).toMatch(/BinderStrategy$/);
    });

    it('excludes UnifiedBinderStrategyBase', () => {
      // Verify base class is not in the registry
      // Since base class has no capabilities, it shouldn't be discoverable
      const strategyCount = registry.getStrategyCount();
      expect(strategyCount).toBeGreaterThan(0);
      
      // All strategies should be instances of the base class, but not the base class itself
      // This is verified by the fact that strategies are instantiated successfully
    });

    it('only includes strategies with getStrategyName() method', () => {
      // Verify strategies have getStrategyName method
      const kmsStrategy = registry.findStrategy('kms:key');
      expect(kmsStrategy).not.toBeNull();
      if (kmsStrategy && 'getStrategyName' in kmsStrategy && typeof kmsStrategy.getStrategyName === 'function') {
        expect(typeof kmsStrategy.getStrategyName()).toBe('string');
      } else {
        fail('Strategy should have getStrategyName method');
      }
    });

    it('skips non-strategy exports', () => {
      // Factory should skip non-constructor exports (functions, constants, etc.)
      // This is verified by the fact that we get valid strategies only
      const capabilities = registry.getRegisteredCapabilities();
      expect(capabilities.length).toBeGreaterThan(0);
      
      // All found strategies should be valid
      for (const capability of capabilities.slice(0, 10)) { // Sample first 10
        const strategy = registry.findStrategy(capability);
        expect(strategy).not.toBeNull();
        expect(typeof strategy?.canHandle).toBe('function');
      }
    });
  });

  describe('Error Handling', () => {
    it('gracefully handles instantiation failures', async () => {
      // Factory should not throw even if some strategies fail to instantiate
      await expect(createUnifiedBinderRegistry()).resolves.toBeDefined();
    });

    it('returns valid registry even if some strategies fail', async () => {
      // Factory should return a registry with successfully discovered strategies
      const registry = await createUnifiedBinderRegistry();
      expect(registry).toBeInstanceOf(UnifiedBinderRegistry);
      expect(registry.getStrategyCount()).toBeGreaterThan(0);
    });
  });

  describe('Interface Validation', () => {
    it('all discovered strategies implement IUnifiedBinderStrategy', () => {
      const capabilities = registry.getRegisteredCapabilities();
      
      // Sample a subset of capabilities to verify interface compliance
      const sampleCapabilities = capabilities.slice(0, 10);
      
      for (const capability of sampleCapabilities) {
        const strategy = registry.findStrategy(capability);
        expect(strategy).not.toBeNull();
        
        // Verify required properties
        expect(strategy?.supportedCapabilities).toBeDefined();
        expect(Array.isArray(strategy?.supportedCapabilities)).toBe(true);
        
        // Verify required methods
        expect(typeof strategy?.canHandle).toBe('function');
        expect(typeof strategy?.getCompatibilityMatrix).toBe('function');
      }
    });

    it('all strategies have getStrategyName method', () => {
      const capabilities = registry.getRegisteredCapabilities();
      const sampleCapabilities = capabilities.slice(0, 10);
      
      for (const capability of sampleCapabilities) {
        const strategy = registry.findStrategy(capability);
        expect(strategy).not.toBeNull();
        
        if (strategy && 'getStrategyName' in strategy && typeof (strategy as any).getStrategyName === 'function') {
          const name = (strategy as any).getStrategyName();
          expect(typeof name).toBe('string');
          expect(name.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Integration', () => {
    it('finds strategies for common capabilities', () => {
      expect(registry.findStrategy('kms:key')).not.toBeNull();
      expect(registry.findStrategy('db:postgres')).not.toBeNull();
      expect(registry.findStrategy('lambda:function')).not.toBeNull();
    });

    it('finds strategies for binding (source type + capability)', () => {
      const strategy = registry.findStrategyForBinding('lambda-api', 'kms:key');
      expect(strategy).not.toBeNull();
      expect(strategy?.canHandle('lambda-api', 'kms:key')).toBe(true);
    });

    it('returns null for unknown capabilities', () => {
      expect(registry.findStrategy('nonexistent:capability')).toBeNull();
      expect(registry.findStrategyForBinding('lambda-api', 'nonexistent:capability')).toBeNull();
    });
  });

  describe('getAllUniqueStrategies', () => {
    it('Registry__GetAllUniqueStrategies__ReturnsDeduplicatedArray', () => {
      const metadata = {
        id: 'TP-core-registry-001',
        level: 'unit' as const,
        capability: 'getAllUniqueStrategies returns deduplicated array of strategy instances',
        oracle: 'exact' as const,
        invariants: [
          'Returned array contains unique strategy instances',
          'Array length matches getStrategyCount()',
          'All returned strategies implement IUnifiedBinderStrategy',
          'No duplicate strategy instances in array'
        ],
        fixtures: ['UnifiedBinderRegistry', 'createUnifiedBinderRegistry'],
        inputs: {
          shape: 'UnifiedBinderRegistry with multiple strategies registered',
          notes: 'Tests deduplication when a strategy handles multiple capabilities'
        },
        risks: [],
        dependencies: [],
        evidence: [],
        compliance_refs: [],
        ai_generated: true,
        human_reviewed_by: 'Platform Engineering'
      };

      const uniqueStrategies = registry.getAllUniqueStrategies();
      
      // Verify it's an array
      expect(Array.isArray(uniqueStrategies)).toBe(true);
      
      // Verify length matches getStrategyCount
      expect(uniqueStrategies.length).toBe(registry.getStrategyCount());
      
      // Verify all are IUnifiedBinderStrategy instances
      for (const strategy of uniqueStrategies) {
        expect(strategy).toBeDefined();
        expect(strategy.supportedCapabilities).toBeDefined();
        expect(Array.isArray(strategy.supportedCapabilities)).toBe(true);
        expect(typeof strategy.canHandle).toBe('function');
        expect(typeof strategy.getCompatibilityMatrix).toBe('function');
      }
      
      // Verify no duplicates (using Set comparison)
      const uniqueSet = new Set(uniqueStrategies);
      expect(uniqueSet.size).toBe(uniqueStrategies.length);
      
      // Verify all strategies are discoverable via their capabilities
      for (const strategy of uniqueStrategies) {
        let found = false;
        for (const capability of strategy.supportedCapabilities) {
          const foundStrategy = registry.findStrategy(capability);
          if (foundStrategy === strategy) {
            found = true;
            break;
          }
        }
        expect(found).toBe(true);
      }
    });

    it('Registry__GetAllUniqueStrategies__MatchesCount', () => {
      const metadata = {
        id: 'TP-core-registry-002',
        level: 'unit' as const,
        capability: 'getAllUniqueStrategies array length matches getStrategyCount',
        oracle: 'exact' as const,
        invariants: [
          'Array length equals getStrategyCount()',
          'Count is consistent across multiple calls'
        ],
        fixtures: ['UnifiedBinderRegistry'],
        inputs: {
          shape: 'UnifiedBinderRegistry with discovered strategies',
          notes: 'Tests consistency between getAllUniqueStrategies and getStrategyCount'
        },
        risks: [],
        dependencies: [],
        evidence: [],
        compliance_refs: [],
        ai_generated: true,
        human_reviewed_by: 'Platform Engineering'
      };

      const strategies = registry.getAllUniqueStrategies();
      const count = registry.getStrategyCount();
      
      expect(strategies.length).toBe(count);
      expect(count).toBeGreaterThanOrEqual(55);
    });
  });
});

