/**
 * Unified Binder Registry Factory
 * 
 * Runtime discovery factory for automatically discovering and registering all binder strategies.
 * This eliminates the need for manual imports and enables zero-maintenance binder registration.
 * 
 * Adding a new binder strategy requires zero code changes outside its own file - the factory
 * will automatically discover it based on naming convention and prototype inspection.
 * 
 * Discovery Criteria:
 * - Constructor function (typeof value === 'function')
 * - Name ends with 'BinderStrategy'
 * - Has getStrategyName() method on prototype
 * - Not the base class UnifiedBinderStrategyBase
 * 
 * Usage:
 * ```typescript
 * import { createUnifiedBinderRegistry } from '@shinobi/core';
 * 
 * const registry = createUnifiedBinderRegistry();
 * // Registry now contains all discovered binder strategies
 * ```
 */

import * as AllBinders from '@shinobi/binders';
import { UnifiedBinderRegistry } from './unified-binder-registry.js';
import { UnifiedBinderStrategyBase } from '../../contracts/unified-binder-strategy-base.js';
import type { IUnifiedBinderStrategy } from '../../contracts/platform-binding-trigger-spec.js';

/**
 * Create a UnifiedBinderRegistry with all discovered binder strategies
 * 
 * This function performs runtime discovery of all binder strategies exported from
 * @shinobi/binders by inspecting the namespace and filtering based on naming convention
 * and prototype methods.
 * 
 * @returns UnifiedBinderRegistry instance with all discovered strategies registered
 */
export function createUnifiedBinderRegistry(): UnifiedBinderRegistry {
  const discoveredStrategies: IUnifiedBinderStrategy[] = [];
  
  // Iterate through all exports from @shinobi/binders namespace
  for (const [key, value] of Object.entries(AllBinders)) {
    // Skip if not a constructor function
    if (typeof value !== 'function') {
      continue;
    }
    
    // Skip if name doesn't end with 'BinderStrategy'
    if (!key.endsWith('BinderStrategy')) {
      continue;
    }
    
    // Skip the base class itself
    if (value === UnifiedBinderStrategyBase) {
      continue;
    }
    
    // Verify it has the required getStrategyName method on prototype
    if (!value.prototype || typeof value.prototype.getStrategyName !== 'function') {
      continue;
    }
    
    // Attempt to instantiate the strategy
    try {
      // TypeScript doesn't know these are concrete classes, not abstract
      // We've already filtered out the base class, so this is safe
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const strategy = new (value as any)() as IUnifiedBinderStrategy;
      
      // Verify it implements IUnifiedBinderStrategy interface
      // Check for required properties/methods
      if (!strategy.supportedCapabilities || !Array.isArray(strategy.supportedCapabilities)) {
        console.warn(
          `[BinderFactory] Skipping ${key}: missing or invalid supportedCapabilities property`
        );
        continue;
      }
      
      if (typeof strategy.canHandle !== 'function') {
        console.warn(
          `[BinderFactory] Skipping ${key}: missing canHandle method`
        );
        continue;
      }
      
      if (typeof strategy.getCompatibilityMatrix !== 'function') {
        console.warn(
          `[BinderFactory] Skipping ${key}: missing getCompatibilityMatrix method`
        );
        continue;
      }
      
      discoveredStrategies.push(strategy);
    } catch (error) {
      // Defensive error handling - log warning but continue discovery
      console.warn(
        `[BinderFactory] Failed to instantiate ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      continue;
    }
  }
  
  // Create and return registry with discovered strategies
  return new UnifiedBinderRegistry(discoveredStrategies);
}

