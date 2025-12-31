/**
 * Validate Command Factory
 *
 * Creates a Commander.js command for `shinobi validate`, which parses and
 * validates service manifests without connecting to AWS by:
 * - Discovering the service manifest file
 * - Parsing YAML and validating syntax
 * - Validating against JSON Schema
 * - Validating component references
 * - Hydrating context and environment resolution
 *
 * This command does not connect to AWS and is safe to run for validation.
 *
 * @returns A configured Commander.js Command instance
 */

import { Command } from 'commander';
import { CompositionRoot } from '../composition-root.js';

export function createValidateCommand(): Command {
  const root = new CompositionRoot();
  const command = new Command('validate');

  command
    .description('Parse and validate the service.yml without connecting to AWS')
    .option('-f, --file <manifest>', 'Path to service manifest file')
    .option('--json', 'Emit validation results as JSON')
    .action(async (options, cmd) => {
      const parent: any = cmd.parent || {};
      const rootOpts = parent.opts ? parent.opts() : {};
      const dependencies = root.createDependencies({
        verbose: !!rootOpts.verbose,
        ci: !!rootOpts.ci
      });

      const validateCommand = root.createValidateCommand(dependencies);
      const result = await validateCommand.execute({ 
        file: options.file,
        json: options.json
      });

      if (result.success) {
        if (options.json && result.data) {
          // JSON output to stdout (appropriate for structured output)
          console.log(JSON.stringify({
            manifest: result.data.manifest,
            warnings: result.data.warnings
          }, null, 2));
        }
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

