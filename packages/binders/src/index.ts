// Re-export all concrete binder implementations by category
export * from './strategies/analytics/index.js';
export * from './strategies/api/index.js';
export * from './strategies/cdn/index.js';
export * from './strategies/compute/index.js';
export * from './strategies/database/index.js';
export * from './strategies/iot/index.js';
export * from './strategies/messaging/index.js';
export * from './strategies/ml/index.js';
export * from './strategies/mobile/index.js';
export * from './strategies/networking/index.js';
export * from './strategies/security/index.js';
export * from './strategies/storage/index.js';

export * from './strategies/governance/index.js';
export * from './strategies/compliance/index.js';
export * from './strategies/ops/index.js';
export * from './strategies/monitoring/index.js';
// Re-export core contracts – consumers never reference @shinobi/core directly
export {
  UnifiedBinderStrategyBase,
  type BindingContext,
  type EnhancedBindingResult,
  type IamPolicy,
  type CompatibilityEntry,
  type IUnifiedBinderStrategy,
} from '@shinobi/core';

