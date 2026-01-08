// Export platform contracts first (highest priority)
export * from './platform/contracts/index.js';

// Export platform services
export * from './platform/services/index.js';

// Export core services (avoiding conflicts with contracts)
// Note: Some services redefine ValidationError, ValidationResult, ValidationWarning
// The platform contracts versions take precedence
export { SchemaValidator } from './services/schema-validator.js';
export { ReferenceValidator } from './services/reference-validator.js';
export { ManifestParser } from './services/manifest-parser.js';
export { ContextHydrator } from './services/context-hydrator.js';
export { ValidationOrchestrator } from './services/validation-orchestrator.js';
export type { PlanResult } from './services/validation-orchestrator.js';
export { FileDiscovery } from './services/file-discovery.js';
export type { FileDiscoveryDependencies } from './services/file-discovery.js';
export { PlanOutputFormatter } from './services/plan-output-formatter.js';
export { SchemaManager } from './services/schema-manager.js';

// Export other core modules
export * from './resolver/index.js';

// Export platform logger
export { Logger as PlatformLogger } from './platform/logger/src/index.js';
export type { LoggerOptions, LogEvent, LogContext, LogData, Timer } from './platform/logger/src/index.js';
export type { LogLevel as PlatformLogLevel } from './platform/logger/src/index.js';

// Export platform utilities
export { resolveVpcForSubnetGroups, resolveVpcForSecurityGroups } from './platform/utils/vpc-resolver.js';
export type { VpcResolutionOptions } from './platform/utils/vpc-resolver.js';

// add other re-exports as needed
