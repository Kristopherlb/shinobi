/**
 * @platform/migration - CDK Migration Engine
 * Tools for migrating existing CDK projects to platform format
 */

// Export main migration engine
export * from './migration-engine.js';

// Export migration components
export * from './cloudformation-analyzer.js';
export * from './resource-mapper.js';
export * from './logical-id-preserver.js';
export * from './migration-validator.js';
export * from './migration-reporter.js';