#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { registerInventoryCommand } from './inventory';
import { CompositionRoot } from './composition-root';

const program = new Command();

// Initialize composition root
const compositionRoot = new CompositionRoot();

program
  .name('svc')
  .description('Auditable FedRAMP-Aware CDK Platform CLI')
  .version('0.1.0')
  .option('--verbose, -v', 'Enable verbose logging')
  .option('--ci', 'Enable CI mode (structured JSON output)')
  .hook('preAction', (thisCommand) => {
    // Configure logger based on global options
    const opts = thisCommand.opts();
    const dependencies = compositionRoot.createDependencies({
      verbose: opts.verbose || false,
      ci: opts.ci || false
    });
    // Store dependencies on the command for access in actions
    (thisCommand as any).dependencies = dependencies;
  });

// svc init command
program
  .command('init')
  .description('Scaffold a new service from a template')
  .option('--name <name>', 'Service name')
  .option('--owner <owner>', 'Service owner/team')
  .option('--framework <framework>', 'Compliance framework', 'commercial')
  .option('--pattern <pattern>', 'Initial pattern', 'empty')
  .action(async (options, cmd) => {
    try {
      const dependencies = (cmd as any).dependencies;
      const initCommand = compositionRoot.createInitCommand(dependencies);
      await initCommand.execute(options);
      process.exit(0);
    } catch (error) {
      const dependencies = (cmd as any).dependencies;
      dependencies.logger.error('Failed to initialize service', error);
      process.exit(1);
    }
  });

// svc validate command
program
  .command('validate')
  .description('Parse and validate the service.yml without connecting to AWS')
  .option('--file, -f <file>', 'Path to service.yml file')
  .action(async (options, cmd) => {
    try {
      const dependencies = (cmd as any).dependencies;
      const validateCommand = compositionRoot.createValidateCommand(dependencies);
      await validateCommand.execute(options);
      process.exit(0);
    } catch (error) {
      const dependencies = (cmd as any).dependencies;
      dependencies.logger.error('Validation failed', error);
      process.exit(2);
    }
  });

// svc plan command
program
  .command('plan')
  .description('Perform full validation and output resolved configuration')
  .option('--file, -f <file>', 'Path to service.yml file')
  .option('--env <env>', 'Target environment', 'dev')
  .action(async (options, cmd) => {
    try {
      const dependencies = (cmd as any).dependencies;
      const planCommand = compositionRoot.createPlanCommand(dependencies);
      await planCommand.execute(options);
      process.exit(0);
    } catch (error) {
      const dependencies = (cmd as any).dependencies;
      dependencies.logger.error('Plan failed', error);
      process.exit(2);
    }
  });

// svc inventory command
registerInventoryCommand(program);

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