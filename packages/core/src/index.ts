// Export platform contracts first (highest priority)
export * from './platform/contracts/index.ts';

// Export platform services
export * from './platform/services.ts';

// Export core services (avoiding conflicts with contracts)
export * from './services/schema-validator.ts';
export * from './services/reference-validator.ts';
export * from './services/manifest-parser.ts';
export * from './services/context-hydrator.ts';
export * from './services/validation-orchestrator.ts';
export * from './services/config-loader.ts';
export * from './services/file-discovery.ts';
export * from './services/plan-output-formatter.ts';
export * from './services/schema-manager.ts';

// Export other core modules
export * from './resolver/index.ts';

// Export core engine (including Logger) - avoid conflicts with resolver
export { Logger, LogLevel } from './core-engine/logger.ts';
export type { LogEntry } from './core-engine/logger.ts';

// Export migration (avoiding conflicts with contracts)
export * from './migration/migration-engine.ts';
export * from './migration/cloudformation-analyzer.ts';
export * from './migration/resource-mapper.ts';
export * from './migration/migration-reporter.ts';
// add other re-exports as needed
