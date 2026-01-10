/**
 * Network Rules Command Factory
 *
 * Creates a Commander.js command for `shinobi network-rules`, which deploys
 * the cross-stack security group rules stack by:
 * - Querying SSM Parameter Store for all cross-stack security group rule specifications
 * - Creating a CDK stack with the network rules
 * - Synthesizing the stack to CloudFormation templates
 * - Optionally deploying the stack using AWS CDK CLI
 *
 * @returns A configured Commander.js Command instance
 */

import { Command } from 'commander';
import { CompositionRoot } from '../composition-root.js';

export function createNetworkRulesCommand(): Command {
  const root = new CompositionRoot();
  const command = new Command('network-rules');

  command
    .description('Deploy cross-stack security group rules stack from SSM Parameter Store')
    .option('-r, --region <region>', 'AWS region override')
    .option('-a, --account <accountId>', 'AWS account ID override')
    .option('-p, --profile <profile>', 'AWS profile to use for credentials')
    .option('-s, --stack-name <name>', 'CloudFormation stack name', 'NetworkRulesStack')
    .option('--deploy', 'Deploy the stack after synthesis')
    .option('--require-approval <level>', 'Change approval level (only used with --deploy)', 'any-change')
    .option('--yes', 'Skip interactive confirmation prompt (only used with --deploy)')
    .option('--json', 'Emit output as JSON')
    .option('--output-dir <path>', 'CDK output directory', 'cdk.out')
    .action(async (options, cmd) => {
      const parent: any = cmd.parent || {};
      const rootOpts = parent.opts ? parent.opts() : {};
      const dependencies = await root.createDependencies({
        verbose: !!rootOpts.verbose,
        ci: !!rootOpts.ci
      });

      const networkRulesCommand = root.createNetworkRulesCommand(dependencies);
      const result = await networkRulesCommand.execute({
        region: options.region,
        account: options.account,
        profile: options.profile,
        stackName: options.stackName,
        deploy: options.deploy,
        requireApproval: options.requireApproval,
        yes: options.yes,
        json: options.json,
        outputDir: options.outputDir
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

