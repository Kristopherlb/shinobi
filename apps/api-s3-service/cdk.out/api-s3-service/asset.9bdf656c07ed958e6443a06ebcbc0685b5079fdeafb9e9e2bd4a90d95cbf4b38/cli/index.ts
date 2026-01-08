/**
 * CLI Module Exports
 *
 * Main export file for the Shinobi Platform CLI module. Re-exports all
 * public APIs including:
 *
 * - Main CLI application (cli.ts)
 * - Composition Root for dependency injection
 * - Individual command implementations
 *
 * This module serves as the public API surface for programmatic access to
 * CLI functionality.
 */

// Export main CLI application
export * from './cli.js';
export * from './composition-root.js';

// Export individual commands
export * from './validate-command.js';
export * from './plan-command.js';
