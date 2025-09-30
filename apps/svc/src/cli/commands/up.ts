import { Command } from 'commander';
import { CompositionRoot } from '../composition-root';

export function createUpCommand(): Command {
  const root = new CompositionRoot();
  const command = new Command('up');

  command
    .description('Deploy the service to AWS using AWS CDK CLI primitives')
    .option('-f, --file <manifest>', 'Path to service manifest file')
    .option('-e, --env <environment>', 'Environment to deploy', 'dev')
    .option('-r, --region <region>', 'AWS region override')
    .option('-a, --account <accountId>', 'AWS account ID override')
    .option('-s, --stack <stackName>', 'Override CloudFormation stack name')
    .option('-p, --profile <profile>', 'AWS profile to use for credentials')
    .option('--require-approval <level>', 'Change approval level', 'any-change')
    .option('--yes', 'Skip interactive confirmation prompt')
    .option('--json', 'Emit CDK deploy output as JSON (requires --yes)')
    .option('--include-experimental', 'Include non-production components when resolving creators', false)
    .option('--retain-asset-dir', 'Keep the synthesized asset directory after deployment')
    .action(async (options, cmd) => {
      const parent: any = cmd.parent || {};
      const rootOpts = parent.opts ? parent.opts() : {};
      const dependencies = root.createDependencies({
        verbose: !!rootOpts.verbose,
        ci: !!rootOpts.ci
      });

      const upCommand = root.createUpCommand(dependencies);
      const result = await upCommand.execute({
        file: options.file,
        env: options.env,
        region: options.region,
        account: options.account,
        stack: options.stack,
        profile: options.profile,
        requireApproval: options.requireApproval,
        yes: options.yes,
        json: options.json,
        includeExperimental: options.includeExperimental,
        retainAssetDir: options.retainAssetDir
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
