/**
 * @platform/core-engine - Core platform orchestration engine
 * Exports main engine classes and interfaces
 */
export { ResolverEngine, ResolverEngineDependencies, SynthesisResult } from './resolver-engine';
export { BinderStrategy, BinderRegistry, ComponentBinder } from './binding-strategies';
export { ComponentFactoryProvider, ComponentRegistry } from './component-factory-provider';
export { Logger, LogLevel, LogEntry } from './logger';
export * from '@platform/contracts';
