// Re-export all concrete binder implementations by category
export * from './strategies/analytics';
export * from './strategies/api';
export * from './strategies/cdn';
export * from './strategies/compute';
export * from './strategies/database';
export * from './strategies/iot';
export * from './strategies/messaging';
export * from './strategies/ml';
export * from './strategies/mobile';
export * from './strategies/networking';
export * from './strategies/security';
export * from './strategies/storage';

export * from './strategies/governance';
export * from './strategies/compliance';
export * from './strategies/ops';
export * from './strategies/monitoring';
// Re-export core contracts – consumers never reference @shinobi/core directly
export {
  UnifiedBinderStrategyBase,
  type BindingContext,
  type EnhancedBindingResult,
  type IamPolicy,
  type CompatibilityEntry,
  type IUnifiedBinderStrategy,
} from '@shinobi/core';

