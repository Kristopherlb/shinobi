#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const init_1 = require("./cli/init");
const validate_1 = require("./cli/validate");
const plan_1 = require("./cli/plan");
const logger_1 = require("./utils/logger");
const program = new commander_1.Command();
program
    .name('svc')
    .description('Auditable FedRAMP-Aware CDK Platform CLI')
    .version('0.1.0')
    .option('--verbose, -v', 'Enable verbose logging')
    .option('--ci', 'Enable CI mode (structured JSON output)')
    .hook('preAction', (thisCommand) => {
    // Configure logger based on global options
    const opts = thisCommand.opts();
    logger_1.logger.configure({
        verbose: opts.verbose || false,
        ci: opts.ci || false
    });
});
// svc init command
program
    .command('init')
    .description('Scaffold a new service from a template')
    .option('--name <name>', 'Service name')
    .option('--owner <owner>', 'Service owner/team')
    .option('--framework <framework>', 'Compliance framework', 'commercial')
    .option('--pattern <pattern>', 'Initial pattern', 'empty')
    .action(async (options) => {
    try {
        const initCommand = new init_1.InitCommand();
        await initCommand.execute(options);
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize service', error);
        process.exit(1);
    }
});
// svc validate command
program
    .command('validate')
    .description('Parse and validate the service.yml without connecting to AWS')
    .option('--file, -f <file>', 'Path to service.yml file')
    .action(async (options) => {
    try {
        const validateCommand = new validate_1.ValidateCommand();
        await validateCommand.execute(options);
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error('Validation failed', error);
        process.exit(2);
    }
});
// svc plan command
program
    .command('plan')
    .description('Perform full validation and output resolved configuration')
    .option('--file, -f <file>', 'Path to service.yml file')
    .option('--env <env>', 'Target environment', 'dev')
    .action(async (options) => {
    try {
        const planCommand = new plan_1.PlanCommand();
        await planCommand.execute(options);
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error('Plan failed', error);
        process.exit(2);
    }
});
// Global error handler
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught exception', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error('Unhandled rejection', reason);
    process.exit(1);
});
program.parse();
