import { Command } from 'commander';
import { CompositionRoot } from '../composition-root';

export function createPlanCommand(): Command {
  const root = new CompositionRoot();
  const command = new Command('plan');

  command
    .description('Generate a comprehensive plan of changes and configurations')
    .option('-f, --file <manifest>', 'Path to service manifest file')
    .option('-e, --env <environment>', 'Environment to plan for', 'dev')
    .action(async (options, cmd) => {
      const parent: any = cmd.parent || {};
      const rootOpts = parent.opts ? parent.opts() : {};
      const dependencies = root.createDependencies({
        verbose: !!rootOpts.verbose,
        ci: !!rootOpts.ci
      });

      const planCommand = root.createPlanCommand(dependencies);
      const result = await planCommand.execute({ file: options.file, env: options.env });

      if (!result.success) {
        process.exit(result.exitCode);
      }
    });

  return command;
}
