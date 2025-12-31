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
import { createUpCommand } from './commands/up.js';
import { createCatalogCommand } from './catalog.js';
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

const resolveDependencies = (command: Command) => {
  const optsWithGlobals =
    (command as any).optsWithGlobals?.() ??
    (command.parent as any)?.optsWithGlobals?.() ??
    command.parent?.opts?.() ??
    command.opts?.() ??
    {};
  const globalOpts = optsWithGlobals as GlobalCliOptions;
  const dependencies = compositionRoot.createDependencies({
    verbose: !!globalOpts.verbose,
    ci: !!globalOpts.ci
  });
  return { dependencies, globalOpts };
};

const emitCliResult = (result: CliResult, globalOpts: GlobalCliOptions, loggerName: string) => {
  if (result.success) {
    if (globalOpts.ci && result.data !== undefined) {
      console.log(
        JSON.stringify({
          level: 'result',
          logger: loggerName,
          data: result.data,
          timestamp: new Date().toISOString()
        })
      );
    }
    return;
  }

  const message = result.error ?? 'Command execution failed';
  if (globalOpts.ci) {
    console.error(
      JSON.stringify({
        level: 'error',
        logger: loggerName,
        message,
        exitCode: result.exitCode,
        timestamp: new Date().toISOString()
      })
    );
  }
  process.exit(result.exitCode);
};

// shinobi validate command
program
  .command('validate')
  .description('Parse and validate the service.yml without connecting to AWS')
  .option('--file, -f <file>', 'Path to service.yml file')
  .action(async (options, command) => {
    const { dependencies, globalOpts } = resolveDependencies(command);
    const validateCommand = compositionRoot.createValidateCommand(dependencies);
    const result = await validateCommand.execute(options);
    emitCliResult(result, globalOpts, 'shinobi.cli.validate');
  });

// shinobi plan command
program
  .command('plan')
  .description('Perform full validation and output resolved configuration')
  .option('--file, -f <file>', 'Path to service.yml file')
  .option('--env <env>', 'Target environment', 'dev')
  .action(async (options, command) => {
    const { dependencies, globalOpts } = resolveDependencies(command);
    const planCommand = compositionRoot.createPlanCommand(dependencies);
    const result = await planCommand.execute(options);
    emitCliResult(result, globalOpts, 'shinobi.cli.plan');
  });

// shinobi inventory command
registerInventoryCommand(program);

// shinobi catalog command
program.addCommand(createCatalogCommand());

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
