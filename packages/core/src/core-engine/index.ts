/**
 * @platform/core-engine - Core platform orchestration engine
 * Exports main engine classes and interfaces
 */

export { ResolverEngine } from './resolver-engine.js';
export type { ResolverEngineDependencies, SynthesisResult } from './resolver-engine.js';
export { ComponentFactoryBuilder } from '../platform/contracts/components/component-factory.js';
export { ComponentRegistry } from '../platform/contracts/components/component-registry.js';
export { Logger, LogLevel } from './logger.js';
export type { LogEntry } from './logger.js';

// Re-export contracts for convenience
export * from '../platform/contracts/index.js';
