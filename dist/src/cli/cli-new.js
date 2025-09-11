#!/usr/bin/env node
"use strict";
/**
 * Refactored CLI Entry Point implementing Architectural Principles
 *
 * This implements:
 * - Principle 2: Composition Root - Single place for dependency wiring
 * - Principle 3: Runtime Environment Decoupling - No process.exit in commands
 * - Principle 5: No Global State - Explicit dependency injection
 */
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const composition_root_1 = require("./composition-root");
/**
 * Main CLI Application - Pure composition root implementation
 */
class CliApplication {
    compositionRoot;
    constructor() {
        this.compositionRoot = new composition_root_1.CompositionRoot();
    }
    async run(argv) {
        const program = new commander_1.Command();
        program
            .name('svc')
            .description('Auditable FedRAMP-Aware CDK Platform CLI')
            .version('0.1.0')
            .option('--verbose, -v', 'Enable verbose logging')
            .option('--ci', 'Enable CI mode (structured JSON output)');
        // Init command
        program
            .command('init')
            .description('Scaffold a new service from a template')
            .option('--name <name>', 'Service name')
            .option('--owner <owner>', 'Service owner/team')
            .option('--framework <framework>', 'Compliance framework', 'commercial')
            .option('--pattern <pattern>', 'Initial pattern', 'empty')
            .action(async (options) => {
            const globalOpts = program.opts();
            return this.handleInitCommand(options, globalOpts);
        });
        // Validate command
        program
            .command('validate')
            .description('Parse and validate the service.yml without connecting to AWS')
            .option('--file, -f <file>', 'Path to service.yml file')
            .action(async (options) => {
            const globalOpts = program.opts();
            return this.handleValidateCommand(options, globalOpts);
        });
        // Plan command
        program
            .command('plan')
            .description('Perform full validation and output resolved configuration')
            .option('--file, -f <file>', 'Path to service.yml file')
            .option('--env <env>', 'Target environment', 'dev')
            .action(async (options) => {
            const globalOpts = program.opts();
            return this.handlePlanCommand(options, globalOpts);
        });
        try {
            await program.parseAsync(argv);
            return { success: true, exitCode: 0 };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return {
                success: false,
                exitCode: 1,
                error: errorMessage
            };
        }
    }
    async handleInitCommand(options, globalOptions) {
        // Create dependencies with proper configuration
        const dependencies = this.compositionRoot.createDependencies({
            verbose: globalOptions.verbose || false,
            ci: globalOptions.ci || false
        });
        // Create command with injected dependencies
        const initCommand = this.compositionRoot.createInitCommand(dependencies);
        // Execute command - returns result object instead of throwing
        const result = await initCommand.execute(options);
        // Handle result and perform final side effects (Principle 3)
        if (!result.success) {
            dependencies.logger.error('Failed to initialize service');
            if (result.error) {
                dependencies.logger.error(result.error);
            }
            process.exit(result.exitCode);
        }
        process.exit(0);
    }
    async handleValidateCommand(options, globalOptions) {
        const dependencies = this.compositionRoot.createDependencies({
            verbose: globalOptions.verbose || false,
            ci: globalOptions.ci || false
        });
        const validateCommand = this.compositionRoot.createValidateCommand(dependencies);
        const result = await validateCommand.execute(options);
        if (!result.success) {
            dependencies.logger.error('Validation failed');
            if (result.error) {
                dependencies.logger.error(result.error);
            }
            process.exit(result.exitCode);
        }
        // In CI mode, output JSON for the resolved configuration
        if (globalOptions.ci && result.data) {
            console.log(JSON.stringify({
                level: 'result',
                type: 'validation',
                data: result.data,
                timestamp: new Date().toISOString()
            }));
        }
        process.exit(0);
    }
    async handlePlanCommand(options, globalOptions) {
        const dependencies = this.compositionRoot.createDependencies({
            verbose: globalOptions.verbose || false,
            ci: globalOptions.ci || false
        });
        const planCommand = this.compositionRoot.createPlanCommand(dependencies);
        const result = await planCommand.execute(options);
        if (!result.success) {
            dependencies.logger.error('Plan failed');
            if (result.error) {
                dependencies.logger.error(result.error);
            }
            process.exit(result.exitCode);
        }
        // Output the resolved configuration JSON (non-CI mode logs this internally)
        if (result.data) {
            if (globalOptions.ci) {
                console.log(JSON.stringify({
                    level: 'result',
                    type: 'plan',
                    data: result.data.resolvedManifest,
                    environment: options.env || 'dev',
                    timestamp: new Date().toISOString()
                }));
            }
            else {
                dependencies.logger.info('\nResolved Configuration:');
                console.log(JSON.stringify(result.data.resolvedManifest, null, 2));
            }
        }
        process.exit(0);
    }
}
// Global error handling - only place where runtime environment is touched
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
    process.exit(1);
});
// Entry point - create and run application
async function main() {
    const app = new CliApplication();
    const result = await app.run(process.argv);
    if (!result.success) {
        console.error('Application failed:', result.error);
        process.exit(result.exitCode);
    }
}
// Only run if called directly (not when imported)
if (require.main === module) {
    main().catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
