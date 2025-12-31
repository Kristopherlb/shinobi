/**
 * Plan Command Factory
 *
 * Creates a Commander.js command for `shinobi plan`, which generates a
 * comprehensive plan of changes and configurations by:
 * - Parsing and validating the service manifest
 * - Resolving all component configurations
 * - Outputting the resolved configuration for review
 *
 * This command does not connect to AWS and is safe to run for validation.
 *
 * @returns A configured Commander.js Command instance
 */

import { Command } from 'commander';
import { CompositionRoot } from '../composition-root.js';

export function createPlanCommand(): Command {
  const root = new CompositionRoot();
  const command = new Command('plan');

  command
    .description('Generate a comprehensive plan of changes and configurations')
    .option('-f, --file <manifest>', 'Path to service manifest file')
    .option('-e, --env <environment>', 'Environment to plan for', 'dev')
    .option('--json', 'Emit plan results as JSON')
    .action(async (options, cmd) => {
      const parent: any = cmd.parent || {};
      const rootOpts = parent.opts ? parent.opts() : {};
      const dependencies = root.createDependencies({
        verbose: !!rootOpts.verbose,
        ci: !!rootOpts.ci
      });

      const planCommand = root.createPlanCommand(dependencies);
      const result = await planCommand.execute({ 
        file: options.file, 
        env: options.env,
        json: options.json
      });

      if (result.success) {
        if (options.json && result.data) {
          // JSON output to stdout (appropriate for structured output)
          console.log(JSON.stringify({
            resolvedManifest: result.data.resolvedManifest,
            warnings: result.data.warnings,
            structuredData: result.data.structuredData
          }, null, 2));
        }
        // Always exit on success to ensure reliable process termination
        process.exit(result.exitCode);
      } else {
        if (options.json && result.error) {
          // JSON error output to stderr (appropriate for structured output)
          console.error(JSON.stringify({ error: result.error }, null, 2));
        }
        process.exit(result.exitCode);
      }
    });

  return command;
}
