// Export platform contracts first (highest priority)
export * from './platform/contracts';

// Export platform services
export * from './platform/services';

// Export core services (avoiding conflicts with contracts)
export * from './services/schema-validator';
export * from './services/reference-validator';
export * from './services/manifest-parser';
export * from './services/context-hydrator';
export * from './services/validation-orchestrator';
export * from './services/config-loader';
export * from './services/file-discovery';
export * from './services/plan-output-formatter';
export * from './services/schema-manager';

// Export other core modules
export * from './resolver';

// Export core engine (including Logger) - avoid conflicts with resolver
export { Logger, LogLevel, LogEntry } from './core-engine/logger';

// Export migration (avoiding conflicts with contracts)
export * from './migration/migration-engine';
export * from './migration/cloudformation-analyzer';
export * from './migration/resource-mapper';
export * from './migration/migration-reporter';
// add other re-exports as needed
