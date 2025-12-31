/**
 * Destroy Command
 *
 * Implements the `shinobi destroy` command, which tears down deployed
 * infrastructure by deleting CloudFormation stacks. This command:
 *
 * - Discovers the service manifest and resolves stack names
 * - Optionally prompts for user confirmation before deletion
 * - Deletes CloudFormation stacks via AWS SDK
 * - Waits for stack deletion to complete
 * - Handles force deletion for stacks with retention policies
 *
 * This command performs destructive operations and should be used with caution.
 * It requires explicit confirmation unless the `--yes` flag is provided.
 *
 * Exit codes:
 * - 0: Stack deletion successful
 * - 1: Stack deletion failed (AWS API errors)
 * - 2: User cancelled or missing manifest
 */

import * as path from 'path';
import * as os from 'os';
import * as fsp from 'fs/promises';
import inquirer from 'inquirer';
import {
  CloudFormationClient,
  DeleteStackCommand,
  DescribeStacksCommand
} from '@aws-sdk/client-cloudformation';
import { waitUntilStackDeleteComplete } from '@aws-sdk/client-cloudformation';
import { FileDiscovery } from '@shinobi/core';
import { Logger } from './console-logger.js';
import { readManifest, SimpleManifest } from './utils/service-synthesizer.js';

export interface DestroyOptions {
  file?: string;
  env?: string;
  region?: string;
  account?: string;
  profile?: string;
  stack?: string;
  yes?: boolean;
  json?: boolean;
  force?: boolean;
}

export interface DestroyResult {
  success: boolean;
  exitCode: number;
  data?: {
    stackName: string;
    region: string;
    accountId: string;
    deleted: boolean;
  };
  error?: string;
}

interface DestroyDependencies {
  fileDiscovery: FileDiscovery;
  logger: Logger;
}

const isStackMissing = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const err = error as { name?: string; message?: string };
  return err.name === 'ValidationError' && !!err.message?.includes('does not exist');
};

export class DestroyCommand {
  constructor(private readonly dependencies: DestroyDependencies) {}

  async execute(options: DestroyOptions): Promise<DestroyResult> {
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
            message: `Delete stack ${stackName} in ${region}?`
          }
        ]);

        if (!answer.confirm) {
          logger.warn('Destroy cancelled by user.');
          return {
            success: false,
            exitCode: 1,
            error: 'Operation cancelled'
          };
        }
      }

      const client = new CloudFormationClient({ region });

      try {
        await client.send(new DeleteStackCommand({ StackName: stackName }));
      } catch (error) {
        if (isStackMissing(error)) {
          logger.info(`Stack ${stackName} does not exist. Nothing to delete.`);
          return {
            success: true,
            exitCode: 0,
            data: {
              stackName,
              region,
              accountId,
              deleted: false
            }
          };
        }
        throw error;
      }

      logger.info(`Waiting for stack ${stackName} to be deleted...`);
      await waitUntilStackDeleteComplete(
        {
          client,
          maxWaitTime: 900,
          maxDelay: 15,
          minDelay: 3
        },
        { StackName: stackName }
      );

      logger.success(`Stack ${stackName} deleted.`);

      return {
        success: true,
        exitCode: 0,
        data: {
          stackName,
          region,
          accountId,
          deleted: true
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      this.dependencies.logger.error('Destroy failed', error);
      return {
        success: false,
        exitCode: 2,
        error: message
      };
    }
  }
}
