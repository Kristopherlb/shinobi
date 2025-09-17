// Core platform exports - minimal working version
export * from './platform/contracts/component-interfaces';
export * from './platform/contracts/config-builder';
export * from './platform/contracts/platform-services';

// Platform Logger
export * from './platform/logger/src';

// Core services - only the working ones
export * from './services/config-loader';
export * from './services/file-discovery';
export * from './services/manifest-parser';
export * from './services/schema-validator';
export * from './services/validation-orchestrator';

// Tagging service
export * from './platform/services/tagging-service/tagging.service';

// Binding contracts and types - only essential ones
export type { IComponent, ComponentContext, ComponentSpec } from './platform/contracts/component-interfaces';
export type { ComplianceFramework, ComponentType, BindingContext, BindingResult } from './platform/contracts/bindings';

// Missing exports that other files need
export type { CompatibilityEntry, TriggerCompatibilityEntry } from './platform/contracts/platform-binding-trigger-spec';
export { Logger } from './platform/logger/src';
export { Logger as StructuredLogger } from './platform/logger/src'; // Alias for compatibility
