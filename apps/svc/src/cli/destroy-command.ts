/**
 * Destroy Command
 *
 * Implements the `shinobi destroy` command, which tears down deployed
 * infrastructure by deleting CloudFormation stacks. This command:
 *
 * - Discovers the service manifest and resolves stack names
 * - Optionally prompts for user confirmation before deletion
 * - Deletes CloudFormation stacks via AWS SDK
 * - Waits for stack deletion to complete with proper polling
 *
 * This command performs destructive operations and should be used with caution.
 * It requires explicit confirmation unless the `--yes` flag is provided.
 *
 * Exit codes:
 * - 0: Stack deletion successful (or stack already deleted)
 * - 1: Stack deletion failed (AWS API errors, unexpected errors)
 * - 2: Precondition failed (user cancelled, missing manifest, invalid configuration)
 */

import * as path from 'path';
import inquirer from 'inquirer';
import {
  CloudFormationClient,
  DeleteStackCommand
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
      
      // Resolve region with safe fallback (us-east-1 is acceptable default)
      const region = options.region ?? manifest.region ?? process.env.CDK_DEFAULT_REGION ?? 'us-east-1';
      
      // Resolve account ID - fail early if cannot be determined (no fake fallback)
      const accountId = options.account ?? manifest.accountId ?? process.env.CDK_DEFAULT_ACCOUNT;
      if (!accountId) {
        return {
          success: false,
          exitCode: 2,
          error: 'Could not determine AWS account ID. Set via --account, manifest accountId, or CDK_DEFAULT_ACCOUNT environment variable.'
        };
      }
      
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
            exitCode: 2,
            error: 'Operation cancelled by user'
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
      
      // Determine exit code based on error type
      // AWS errors and unexpected errors → exit code 1
      // Precondition errors (missing manifest, bad config) → exit code 2
      // Since we're in catch-all, assume it's an AWS/unexpected error
      return {
        success: false,
        exitCode: 1,
        error: message
      };
    }
  }
}
