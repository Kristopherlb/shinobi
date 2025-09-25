/**
 * @platform/core-engine - Core platform orchestration engine
 * Exports main engine classes and interfaces
 */

export { ResolverEngine, ResolverEngineDependencies, SynthesisResult } from './resolver-engine';
export { ComponentFactoryBuilder } from '../platform/contracts/components/component-factory';
export { ComponentRegistry } from '../platform/contracts/components/component-registry';
export { Logger, LogLevel, LogEntry } from './logger';

// Re-export contracts for convenience
export * from '../platform/contracts';