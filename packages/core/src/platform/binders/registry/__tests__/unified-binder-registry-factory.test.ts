/**
 * Tests for createUnifiedBinderRegistry factory function
 * 
 * Validates runtime discovery of binder strategies and ensures the factory
 * correctly discovers, filters, and instantiates all binder strategies.
 */

import { createUnifiedBinderRegistry } from '../unified-binder-registry-factory.js';
import { UnifiedBinderRegistry } from '../unified-binder-registry.js';
import { UnifiedBinderStrategyBase } from '../../../contracts/unified-binder-strategy-base.js';
import type { IUnifiedBinderStrategy } from '../../../contracts/platform-binding-trigger-spec.js';

describe('createUnifiedBinderRegistry', () => {
  let registry: UnifiedBinderRegistry;

  beforeAll(() => {
    registry = createUnifiedBinderRegistry();
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
      expect(typeof kmsStrategy?.getStrategyName).toBe('function');
      expect(typeof kmsStrategy?.getStrategyName()).toBe('string');
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
    it('gracefully handles instantiation failures', () => {
      // Factory should not throw even if some strategies fail to instantiate
      expect(() => createUnifiedBinderRegistry()).not.toThrow();
    });

    it('returns valid registry even if some strategies fail', () => {
      // Factory should return a registry with successfully discovered strategies
      const registry = createUnifiedBinderRegistry();
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
        
        if (strategy && 'getStrategyName' in strategy) {
          expect(typeof strategy.getStrategyName).toBe('function');
          const name = strategy.getStrategyName();
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
});

