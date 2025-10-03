/**
 * @platform/contracts - Shared Interfaces and Types
 * Common contracts used across all platform packages
 */

// Export component contracts
export * from './component.ts';
export type {
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities,
  IComponent,
  IComponentCreator,
  IComponentRegistry,
  IComponentFactory
} from './component-interfaces.ts';

// Export configuration builder contracts
export * from './config-builder.ts';

// export binding and trigger specification types
export * from './bindings.ts';
export * from './platform-binding-trigger-spec.ts';
// re-export BindingContext, BindingResult and IBinderStrategy from the spec to avoid duplicate definitions
export type { BindingContext, BindingResult, IBinderStrategy } from './platform-binding-trigger-spec.ts';

// Export trigger system interfaces
export * from './trigger-interfaces.ts';

// Export binder matrix implementation
export * from './binder-matrix.ts';

// Export OpenFeature standard interfaces
export * from './openfeature-interfaces.ts';

// Export platform services interfaces
export * from './platform-services.ts';
export * from './logging-interfaces.ts';

// Export artifact contracts
export * from './artifacts.ts';
