/**
 * @platform/contracts - Shared Interfaces and Types
 * Common contracts used across all platform packages
 */

// Export component contracts
export * from './component';
export { 
  ComponentSpec, 
  ComponentContext, 
  ComponentCapabilities,
  IComponent,
  IComponentCreator,
  IComponentRegistry,
  IComponentFactory
} from './component-interfaces';

// Export configuration builder contracts
export * from './config-builder';

// export binding and trigger specification types
export * from './bindings';
export * from './platform-binding-trigger-spec';
// re-export BindingContext, BindingResult and IBinderStrategy from the spec to avoid duplicate definitions
export { BindingContext, BindingResult, IBinderStrategy } from './platform-binding-trigger-spec';

// Export trigger system interfaces
export * from './trigger-interfaces';

// Export binder matrix implementation
export * from './binder-matrix';

// Export OpenFeature standard interfaces
export * from './openfeature-interfaces';

// Export platform services interfaces
export * from './platform-services';
export * from './logging-interfaces';

// Export artifact contracts
export * from './artifacts';