#!/usr/bin/env node

/**
 * Shinobi Platform CLI
 *
 * Main entry point for the Shinobi Platform command-line interface. This module
 * sets up the Commander.js program, registers all CLI commands, and handles
 * global options and error handling.
 *
 * Commands:
 * - validate: Parse and validate service manifests
 * - plan: Generate deployment plans with resolved configuration
 * - synth: Synthesize manifests to CloudFormation templates
 * - up: Deploy infrastructure using AWS CDK CLI
 * - diff: Compare synthesized templates against deployed stacks
 * - destroy: Tear down deployed infrastructure
 * - inventory: Analyze component usage and patterns
 * - catalog: List available platform components
 *
 * Global Options:
 * - --verbose, -v: Enable verbose logging
 * - --ci: Enable CI mode with structured JSON output
 */

import { Command } from 'commander';
import { registerInventoryCommand } from './inventory.js';
import { CompositionRoot } from './composition-root.js';
import { createValidateCommand } from './commands/validate.js';
import { createPlanCommand } from './commands/plan.js';
import { createUpCommand } from './commands/up.js';
import { createCatalogCommand } from './catalog.js';
import { createBindersCatalogCommand } from './binders-catalog-command.js';
import { createSynthCommand } from './commands/synth.js';
import { createDiffCommand } from './commands/diff.js';
import { createDestroyCommand } from './commands/destroy.js';

interface GlobalCliOptions {
  verbose?: boolean;
  ci?: boolean;
}

interface CliResult<TData = unknown> {
  success: boolean;
  exitCode: number;
  error?: string;
  data?: TData;
}

const program = new Command();

// Initialize composition root
const compositionRoot = new CompositionRoot();

program
  .name('shinobi')
  .description('Shinobi Platform CLI')
  .version('0.1.0')
  .option('--verbose, -v', 'Enable verbose logging')
  .option('--ci', 'Enable CI mode (structured JSON output)');

// Helper to resolve dependencies from command context
const resolveDependencies = async (command: Command) => {
  const optsWithGlobals =
    (command as any).optsWithGlobals?.() ??
    (command.parent as any)?.optsWithGlobals?.() ??
    command.parent?.opts?.() ??
    command.opts?.() ??
    {};
  const globalOpts = optsWithGlobals as GlobalCliOptions;
  const dependencies = await compositionRoot.createDependencies({
    verbose: !!globalOpts.verbose,
    ci: !!globalOpts.ci
  });
  return { dependencies, globalOpts };
};

// shinobi validate command
program.addCommand(createValidateCommand());

// shinobi plan command
program.addCommand(createPlanCommand());

// shinobi inventory command
(async () => {
  const { dependencies: inventoryDeps } = await resolveDependencies(program);
  registerInventoryCommand(program, inventoryDeps.logger);
})();

// shinobi catalog command
program.addCommand(createCatalogCommand());

// shinobi binders command (subcommand for binder catalog)
const bindersCommand = new Command('binders')
  .description('Manage and explore binder strategies');
bindersCommand.addCommand(createBindersCatalogCommand());
program.addCommand(bindersCommand);

// shinobi synth command
program.addCommand(createSynthCommand());

// shinobi diff command
program.addCommand(createDiffCommand());

// shinobi destroy command
program.addCommand(createDestroyCommand());

// shinobi up command (uses dedicated command factory)
program.addCommand(createUpCommand());

// Global error handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

program.parse();
