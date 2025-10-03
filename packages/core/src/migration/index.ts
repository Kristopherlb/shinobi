/**
 * @platform/migration - CDK Migration Engine
 * Tools for migrating existing CDK projects to platform format
 */

// Export main migration engine
export * from './migration-engine.ts';

// Export migration components
export * from './cloudformation-analyzer.ts';
export * from './resource-mapper.ts';
export * from './logical-id-preserver.ts';
export * from './migration-validator.ts';
export * from './migration-reporter.ts';