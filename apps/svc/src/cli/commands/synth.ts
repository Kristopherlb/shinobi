/**
 * Synth Command Factory
 * 
 * Creates a Commander.js command for `shinobi synth`, which synthesizes a
 * service manifest into AWS CDK templates by:
 * - Resolving the service manifest file
 * - Synthesizing the manifest to CDK constructs
 * - Generating CloudFormation templates
 * - Outputting synthesis results
 * 
 * @returns A configured Commander.js Command instance
 */
import { Command } from 'commander';
import { CompositionRoot } from '../composition-root.js';

export function createSynthCommand(): Command {
  const root = new CompositionRoot();
  const command = new Command('synth');

  command
    .description('Synthesize a service manifest into AWS CDK templates')
    .option('-f, --file <manifest>', 'Path to service manifest file', 'service.yml')
    .option('--env <environment>', 'Target environment (defaults to manifest value or dev)')
    .option('--region <region>', 'AWS region (defaults to CDK_DEFAULT_REGION or us-east-1)')
    .option('--account <account>', 'AWS account ID (defaults to CDK_DEFAULT_ACCOUNT, required if not set)')
    .option('--output <dir>', 'CDK output directory', 'cdk.out')
    .option('--json', 'Emit synthesis summary as JSON')
    .option('--include-experimental', 'Include non-production components when resolving creators', false)
    .action(async (options, cmd) => {
      const parent: any = cmd.parent || {};
      const rootOpts = parent.opts ? parent.opts() : {};
      const dependencies = root.createDependencies({
        verbose: !!rootOpts.verbose,
        ci: !!rootOpts.ci
      });

      const synthCommand = root.createSynthCommand(dependencies);
      const result = await synthCommand.execute({
        file: options.file,
        env: options.env,
        region: options.region,
        account: options.account,
        output: options.output,
        json: options.json,
        includeExperimental: options.includeExperimental
      });

      if (result.success) {
        if (options.json && result.data) {
          // JSON output to stdout (appropriate for structured output)
          console.log(JSON.stringify(result.data, null, 2));
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
