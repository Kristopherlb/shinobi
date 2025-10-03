/**
 * @platform/core-engine - Core platform orchestration engine
 * Exports main engine classes and interfaces
 */

export { ResolverEngine } from './resolver-engine.ts';
export type { ResolverEngineDependencies, SynthesisResult } from './resolver-engine.ts';
export { ComponentFactoryBuilder } from '../platform/contracts/components/component-factory.ts';
export { ComponentRegistry } from '../platform/contracts/components/component-registry.ts';
export { Logger, LogLevel } from './logger.ts';
export type { LogEntry } from './logger.ts';

// Re-export contracts for convenience
export * from '../platform/contracts/index.ts';
