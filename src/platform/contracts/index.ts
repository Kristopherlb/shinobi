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

// Export Platform Binding & Trigger Specification v1.0 (canonical binding interfaces)
export * from './platform-binding-trigger-spec';

// Export trigger system interfaces
export * from './trigger-interfaces';

// Export binder matrix implementation
export * from './binder-matrix';

// Export OpenFeature standard interfaces
export * from './openfeature-interfaces';