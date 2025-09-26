import { Command } from 'commander';
import { CompositionRoot } from '../composition-root';

export function createDiffCommand(): Command {
  const root = new CompositionRoot();
  const command = new Command('diff');

  command
    .description('Diff synthesized infrastructure against deployed CloudFormation stack')
    .option('-f, --file <manifest>', 'Path to service manifest file')
    .option('-e, --env <environment>', 'Environment to target', 'dev')
    .option('-r, --region <region>', 'AWS region override')
    .option('-a, --account <accountId>', 'AWS account ID override')
    .option('-p, --profile <profile>', 'AWS profile to use for credentials')
    .option('-s, --stack <stackName>', 'Override CloudFormation stack name')
    .option('--output <dir>', 'Write synthesized output to this directory instead of a temporary folder')
    .option('--keep-output', 'Keep synthesized output when using a temporary directory')
    .option('--json', 'Emit diff summary as JSON')
    .option('--include-experimental', 'Include non-production components when resolving creators', false)
    .action(async (options, cmd) => {
      const parent: any = cmd.parent || {};
      const rootOpts = parent.opts ? parent.opts() : {};
      const dependencies = root.createDependencies({
        verbose: !!rootOpts.verbose,
        ci: !!rootOpts.ci
      });

      const diffCommand = root.createDiffCommand(dependencies);
      const result = await diffCommand.execute({
        file: options.file,
        env: options.env,
        region: options.region,
        account: options.account,
        profile: options.profile,
        stack: options.stack,
        output: options.output,
        keepOutput: options.keepOutput,
        json: options.json,
        includeExperimental: options.includeExperimental,
        suppressLogSummary: !!options.json
      });

      if (result.success) {
        if (options.json && result.data) {
          console.log(JSON.stringify({
            stackName: result.data.stackName,
            stackExists: result.data.stackExists,
            diff: result.data.diff,
            synthesizedTemplatePath: result.data.synthesizedTemplatePath,
            synthesizedAssetDirectory: result.data.synthesizedAssetDirectory,
            components: result.data.components,
            keptArtifacts: result.data.keptArtifacts
          }, null, 2));
        }
        // Exit code 3 indicates differences found – propagate so CI can act on it
        if (result.exitCode !== 0) {
          process.exit(result.exitCode);
        }
      } else {
        process.exit(result.exitCode);
      }
    });

  return command;
}
