/**
 * @platform/contracts - Shared Interfaces and Types
 * Common contracts used across all platform packages
 */

// Export component contracts
export * from './component.js';
export type {
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities,
  IComponent,
  IComponentCreator,
  IComponentRegistry,
  IComponentFactory
} from './component-interfaces.js';

// Export configuration builder contracts
export * from './config-builder.js';

// export binding and trigger specification types
export * from './bindings.js';
export * from './platform-binding-trigger-spec.js';
// re-export BindingContext, BindingResult and IBinderStrategy from the spec to avoid duplicate definitions
export type { BindingContext, BindingResult, IBinderStrategy, EnhancedBindingResult, IUnifiedBinderStrategy, CompatibilityEntry } from './platform-binding-trigger-spec.js';

// Export unified binder strategy base class
export { UnifiedBinderStrategyBase } from './unified-binder-strategy-base.js';

// Export binder utilities
export { resolveActions } from '../binders/action-resolver.js';
export { loadActionProfiles, resolveActionProfile, type ActionProfilesConfig } from '../binders/action-profiles.js';

// Export directive schema validator
export { DirectiveSchemaValidator, DirectiveValidationError } from './directive-schema-validator.js';

// Export trigger system interfaces
export * from './trigger-interfaces.js';

// Export OpenFeature standard interfaces
export * from './openfeature-interfaces.js';

// Export platform services interfaces
export * from './platform-services.js';
export * from './logging-interfaces.js';

// Export artifact contracts
export * from './artifacts.js';

// Export networking utilities
export { applySecurityGroupTags, validateSecurityGroupTags } from '../networking/security-group-tagging.js';
export { CrossStackRuleManager, type CrossStackRuleSpec } from '../networking/cross-stack-rule-manager.js';
