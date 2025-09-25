import { Command } from 'commander';
import { Logger } from '../utils/logger';
import { FileDiscovery } from '../utils/file-discovery';

const createLogger = (ci?: boolean, verbose?: boolean) => {
  const logger = new Logger('shinobi.cli.up');
  logger.configure({ ci: !!ci, verbose: !!verbose });
  return logger;
};

export const createUpCommand = (): Command => {
  const command = new Command('up');

  command
    .description('Deploy the service to AWS using CDK (placeholder)')
    .argument('[manifest]', 'Path to service manifest file', 'service.yml')
    .option('-e, --env <environment>', 'Environment to deploy to', 'dev')
    .option('--ci', 'Enable CI mode (structured JSON output)')
    .option('--verbose', 'Enable verbose logging')
    .action(async (manifest: string | undefined, options: { env?: string; ci?: boolean; verbose?: boolean }) => {
      const logger = createLogger(options.ci, options.verbose);
      const fileDiscovery = new FileDiscovery();

      const manifestPath = manifest && manifest !== 'service.yml' ? manifest : await fileDiscovery.findManifest('.');

      if (!manifestPath) {
        const message = 'No service.yml found in this directory or any parent directories.';
        if (options.ci) {
          console.error(
            JSON.stringify({
              level: 'error',
              logger: 'shinobi.cli.up',
              message,
              exitCode: 2,
              timestamp: new Date().toISOString()
            })
          );
        } else {
          logger.error(message);
        }
        process.exit(2);
      }

      const warning =
        'shinobi up is not yet supported. Run "shinobi plan" and deploy through your CDK pipeline or CI workflow.';

      if (options.ci) {
        console.warn(
          JSON.stringify({
            level: 'warn',
            logger: 'shinobi.cli.up',
            message: warning,
            manifest: manifestPath,
            environment: options.env ?? 'dev',
            timestamp: new Date().toISOString()
          })
        );
      } else {
        logger.warn(warning);
      }

      process.exit(64);
    });

  return command;
};

export default createUpCommand;
