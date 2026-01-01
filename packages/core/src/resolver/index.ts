/**
 * @platform/resolver - Component Resolution and Orchestration Engine
 * Orchestrates component synthesis and binding
 */

// Export main resolver engine
export * from './resolver-engine.js';

// Export unified binder registry and factory
export { UnifiedBinderRegistry } from '../platform/binders/registry/unified-binder-registry.js';
export { createUnifiedBinderRegistry } from '../platform/binders/registry/create-unified-registry.js';

// Export concrete binders
export * from './binders/concrete-binders.js';