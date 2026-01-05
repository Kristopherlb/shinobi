/**
 * @platform/resolver - Component Resolution and Orchestration Engine
 * Orchestrates component synthesis and binding
 */

// Export main resolver engine
export * from './resolver-engine.js';

// Export unified binder registry
export { UnifiedBinderRegistry } from '../platform/binders/registry/unified-binder-registry.js';
// Factory is now in binders - do NOT re-export from core to avoid pulling in binders source
// Import directly from @shinobi/binders instead:
// import { createUnifiedBinderRegistry } from '@shinobi/binders';

// Export concrete binders
export * from './binders/concrete-binders.js';