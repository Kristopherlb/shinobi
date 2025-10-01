// Export platform contracts first (highest priority)
export * from './platform/contracts/index.js';

// Export platform services
export * from './platform/services.js';

// Export core services (avoiding conflicts with contracts)
export * from './services/schema-validator.js';
export * from './services/reference-validator.js';
export * from './services/manifest-parser.js';
export * from './services/context-hydrator.js';
export * from './services/validation-orchestrator.js';
export * from './services/config-loader.js';
export * from './services/file-discovery.js';
export * from './services/plan-output-formatter.js';
export * from './services/schema-manager.js';

// Export other core modules
export * from './resolver/index.js';

// Export core engine (including Logger) - avoid conflicts with resolver
export { Logger, LogLevel } from './core-engine/logger.js';
export type { LogEntry } from './core-engine/logger.js';

// Export migration (avoiding conflicts with contracts)
export * from './migration/migration-engine.js';
export * from './migration/cloudformation-analyzer.js';
export * from './migration/resource-mapper.js';
export * from './migration/migration-reporter.js';
// add other re-exports as needed
