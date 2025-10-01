import * as path from 'path';
import * as fsp from 'fs/promises';
import inquirer from 'inquirer';
import { AwsCdkCli, RequireApproval } from '@aws-cdk/cli-lib-alpha';
import { FileDiscovery } from '@shinobi/core';
import { Logger } from './utils/logger.js';
import {
  readManifest,
  synthesizeService,
  SimpleManifest,
  SynthesizeServiceResult
} from './utils/service-synthesizer.js';

export interface UpOptions {
  file?: string;
  env?: string;
  region?: string;
  account?: string;
  stack?: string;
  profile?: string;
  requireApproval?: 'never' | 'any-change' | 'broadening';
  yes?: boolean;
  json?: boolean;
  includeExperimental?: boolean;
  retainAssetDir?: boolean;
}

export interface UpResult {
  success: boolean;
  exitCode: number;
  data?: {
    stackName: string;
    region: string;
    accountId: string;
    templatePath: string;
    assetDirectory: string;
    components: { name: string; type: string }[];
    deployed: boolean;
  };
  error?: string;
}

interface UpDependencies {
  fileDiscovery: FileDiscovery;
  logger: Logger;
}

export class UpCommand {
  constructor(private readonly dependencies: UpDependencies) {}

  async execute(options: UpOptions): Promise<UpResult> {
    const logger = this.dependencies.logger;

    try {
      const manifestPath = options.file
        ? path.resolve(options.file)
        : await this.dependencies.fileDiscovery.findManifest('.');

      if (!manifestPath) {
        return {
          success: false,
          exitCode: 2,
          error: 'No service.yml found in this directory or any parent directories.'
        };
      }

      const manifest: SimpleManifest = await readManifest({ manifestPath });
      const environment = options.env ?? manifest.environment ?? 'dev';
      const region = String(options.region ?? manifest.region ?? process.env.CDK_DEFAULT_REGION ?? 'us-east-1');
      const accountId = String(options.account ?? manifest.accountId ?? process.env.CDK_DEFAULT_ACCOUNT ?? '123456789012');
      const stackName = options.stack ?? `${manifest.service}-${environment}`;

      if (options.profile) {
        process.env.AWS_PROFILE = options.profile;
        logger.info(`Using AWS profile: ${options.profile}`);
      }

      let latestSynth: SynthesizeServiceResult | undefined;

      const cli = AwsCdkCli.fromCloudAssemblyDirectoryProducer({
        workingDirectory: process.cwd(),
        produce: async (context) => {
          const synthResult = await synthesizeService({
            manifestPath,
            environment,
            region,
            accountId,
            includeExperimental: options.includeExperimental,
            cliContext: context
          });
          latestSynth = synthResult;
          return synthResult.assembly.directory;
        }
      });

      if (!options.yes) {
        if (options.json) {
          return {
            success: false,
            exitCode: 2,
            error: 'Confirmation required: re-run with --yes to skip interactive prompt.'
          };
        }

        const answer = await inquirer.prompt<{ confirm: boolean }>([
          {
            type: 'confirm',
            name: 'confirm',
            default: false,
            message: `Deploy stack ${stackName} in ${region}?`
          }
        ]);

        if (!answer.confirm) {
          logger.warn('Deployment cancelled by user.');
          return {
            success: false,
            exitCode: 1,
            error: 'Operation cancelled'
          };
        }
      }

      if (!options.json) {
        logger.info('Synthesizing and deploying stack');
      }

      const approvalEnum = mapRequireApproval(options.requireApproval);

      try {
        await cli.deploy({
          stacks: [stackName],
          profile: options.profile,
          requireApproval: approvalEnum,
          json: options.json,
          ci: options.json,
          execute: true
        });
      } catch (error) {
        if (!options.json) {
          logger.error('Deploy failed', error);
        }
        return {
          success: false,
          exitCode: 2,
          error: error instanceof Error ? error.message : 'Deployment failed'
        };
      }

      if (!latestSynth) {
        return {
          success: true,
          exitCode: 0
        };
      }

      if (!options.json) {
        logger.success(`Deployment complete for ${stackName}.`);
      }

      if (!options.retainAssetDir) {
        try {
          await fsp.rm(latestSynth.outputDir, { recursive: true, force: true });
        } catch (cleanupError) {
          if (!options.json) {
            logger.warn(`Failed to remove temporary directory ${latestSynth.outputDir}: ${(cleanupError as Error).message}`);
          }
        }
      }

      return {
        success: true,
        exitCode: 0,
        data: {
          stackName,
          region,
          accountId,
          templatePath: path.join(latestSynth.assembly.directory, latestSynth.stack.templateFile),
          assetDirectory: latestSynth.outputDir,
          components: latestSynth.components,
          deployed: true
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      this.dependencies.logger.error('Deploy failed', error);
      return {
        success: false,
        exitCode: 2,
        error: message
      };
    }
  }
}

const mapRequireApproval = (
  value?: 'never' | 'any-change' | 'broadening'
): RequireApproval | undefined => {
  switch (value) {
    case 'never':
      return RequireApproval.NEVER;
    case 'any-change':
      return RequireApproval.ANYCHANGE;
    case 'broadening':
      return RequireApproval.BROADENING;
    default:
      return undefined;
  }
};
