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

// Export event source scanner and IAM policy post-processor
export { EventSourceScanner } from './event-source-scanner.js';
export { IamPolicyPostProcessor } from './iam-policy-post-processor.js';
export type { IamPolicyPostProcessorResult } from './iam-policy-post-processor.js';

// Concrete binders removed - all binders now use unified binder system in @shinobi/binders