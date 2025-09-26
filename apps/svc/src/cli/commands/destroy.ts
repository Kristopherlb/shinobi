import { Command } from 'commander';
import { CompositionRoot } from '../composition-root';

export function createDestroyCommand(): Command {
  const root = new CompositionRoot();
  const command = new Command('destroy');

  command
    .description('Delete the CloudFormation stack associated with the manifest')
    .option('-f, --file <manifest>', 'Path to service manifest file')
    .option('-e, --env <environment>', 'Environment to target', 'dev')
    .option('-r, --region <region>', 'AWS region override')
    .option('-a, --account <accountId>', 'AWS account ID override')
    .option('-p, --profile <profile>', 'AWS profile to use for credentials')
    .option('-s, --stack <stackName>', 'Override CloudFormation stack name')
    .option('-y, --yes', 'Skip interactive confirmation prompt')
    .option('--json', 'Emit results as JSON (requires --yes for destructive actions)')
    .action(async (options, cmd) => {
      const parent: any = cmd.parent || {};
      const rootOpts = parent.opts ? parent.opts() : {};
      const dependencies = root.createDependencies({
        verbose: !!rootOpts.verbose,
        ci: !!rootOpts.ci
      });

      const destroyCommand = root.createDestroyCommand(dependencies);
      const result = await destroyCommand.execute({
        file: options.file,
        env: options.env,
        region: options.region,
        account: options.account,
        profile: options.profile,
        stack: options.stack,
        yes: options.yes,
        json: options.json
      });

      if (result.success) {
        if (options.json && result.data) {
          console.log(JSON.stringify(result.data, null, 2));
        }
        process.exit(result.exitCode);
      } else {
        if (options.json && result.error) {
          console.error(JSON.stringify({ error: result.error }, null, 2));
        }
        process.exit(result.exitCode);
      }
    });

  return command;
}
