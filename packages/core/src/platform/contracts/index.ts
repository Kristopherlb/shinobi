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
export type { BindingContext, BindingResult, IBinderStrategy } from './platform-binding-trigger-spec.js';

// Export trigger system interfaces
export * from './trigger-interfaces.js';

// Export binder matrix implementation
export * from './binder-matrix.js';

// Export OpenFeature standard interfaces
export * from './openfeature-interfaces.js';

// Export platform services interfaces
export * from './platform-services.js';
export * from './logging-interfaces.js';

// Export artifact contracts
export * from './artifacts.js';
