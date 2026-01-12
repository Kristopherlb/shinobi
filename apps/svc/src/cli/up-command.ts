/**
 * Up Command
 *
 * Implements the `shinobi up` command, which deploys infrastructure to AWS
 * using AWS CDK CLI primitives. This command:
 *
 * - Synthesizes the service manifest to CloudFormation templates
 * - Optionally prompts for user confirmation before deployment
 * - Executes CDK deploy with appropriate approval requirements
 * - Handles stack creation and updates
 * - Manages synthesized asset directories
 *
 * This is the primary deployment command for the platform. It wraps the AWS
 * CDK CLI to provide a consistent interface while maintaining compatibility
 * with CDK's deployment mechanisms.
 *
 * Exit codes:
 * - 0: Deployment successful
 * - 1: Deployment failed (CDK errors, AWS API failures)
 * - 2: User cancelled deployment or missing manifest
 */

import * as path from 'path';
import * as fsp from 'fs/promises';
import inquirer from 'inquirer';
import { AwsCdkCli, RequireApproval } from '@aws-cdk/cli-lib-alpha';
import {
  FileDiscovery,
  SingletonResourceHandlerService,
  RollbackCleanupService
} from '@shinobi/core';
import { Logger } from './console-logger.js';
import {
  readManifest,
  synthesizeService,
  SimpleManifest,
  SynthesizeServiceResult
} from './utils/service-synthesizer.js';
import { copyDirectory } from './utils/file-utils.js';

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
  saveSynthOutput?: string; // Directory path to save synth output (default: not saved)
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
  singletonResourceHandler: SingletonResourceHandlerService;
  rollbackCleanup: RollbackCleanupService;
}

export class UpCommand {
  constructor(private readonly dependencies: UpDependencies) {}

  async execute(options: UpOptions): Promise<UpResult> {
    const logger = this.dependencies.logger;

    try {
      // Resolve manifest path - FileDiscovery handles both file paths and directory searches
      const manifestPath = options.file
        ? await this.dependencies.fileDiscovery.findManifest(options.file)
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
      
      // Account ID resolution: prefer explicit option, then manifest, then environment variable
      // Fail early if we can't determine account ID (no fake fallback)
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

      let latestSynth: SynthesizeServiceResult | undefined;

      // Use manifest directory as working directory to ensure relative paths resolve correctly
      const manifestDir = path.dirname(manifestPath);

      const cli = AwsCdkCli.fromCloudAssemblyDirectoryProducer({
        workingDirectory: manifestDir,
        produce: async (context) => {
          const synthResult = await synthesizeService({
            manifestPath,
            environment,
            region,
            accountId,
            includeExperimental: options.includeExperimental,
            cliContext: context,
            stackName
          });
          
          latestSynth = synthResult;
          
          // Post-process template to handle singleton AWS resources (e.g., ApiGateway Account)
          await this.dependencies.singletonResourceHandler.postProcessTemplate({
            assemblyDir: synthResult.assembly.directory,
            stackId: synthResult.stack.id,
            templateFileName: synthResult.stack.templateFile,
            region
          });
          
          // Save synth output if requested
          if (options.saveSynthOutput) {
            const saveDir = path.resolve(options.saveSynthOutput);
            await copyDirectory(synthResult.assembly.directory, saveDir);
            
            if (!options.json) {
              logger.info(`Synth output saved to: ${saveDir}`);
            }
          }
          
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
            exitCode: 2, // User cancellation is a precondition failure, not a deployment failure
            error: 'Operation cancelled'
          };
        }
      }

      if (!options.json) {
        logger.info('Synthesizing and deploying stack');
      }

      // Check for orphaned resources from previous failed deployments
      // We validate but don't auto-delete to avoid removing resources from other stacks
      try {
        const stackStatusCheck = await this.dependencies.rollbackCleanup.checkOrphanedResources(
          stackName,
          region
        );

        if (stackStatusCheck.stackInFailedState && stackStatusCheck.orphanedResources.length > 0) {
          const existingOrphanedResources = stackStatusCheck.orphanedResources.filter(r => r.exists);
          
          if (existingOrphanedResources.length > 0) {
            const resourceList = existingOrphanedResources.map(r => 
              `    • ${r.logicalId} (${r.resourceType})\n      Physical ID: ${r.physicalResourceId || 'unknown'}`
            ).join('\n\n');

            const errorMessage = 
              `\n${'='.repeat(80)}\n` +
              `⚠️  ORPHANED RESOURCES DETECTED - DEPLOYMENT BLOCKED\n` +
              `${'='.repeat(80)}\n\n` +
              `Stack: ${stackName}\n` +
              `Status: ${stackStatusCheck.stackStatus}\n` +
              `Orphaned Resources: ${existingOrphanedResources.length}\n\n` +
              `${'-'.repeat(80)}\n` +
              `PROBLEM:\n` +
              `${'-'.repeat(80)}\n` +
              `These resources were created during a failed deployment but rolled back.\n` +
              `They still exist in AWS due to DeletionPolicy: Retain and will cause\n` +
              `"Resource already exists" errors on the next deployment.\n\n` +
              `${'-'.repeat(80)}\n` +
              `ORPHANED RESOURCES:\n` +
              `${'-'.repeat(80)}\n` +
              `${resourceList}\n\n` +
              `${'-'.repeat(80)}\n` +
              `SOLUTIONS:\n` +
              `${'-'.repeat(80)}\n` +
              `1. Delete the orphaned resources manually in AWS Console:\n` +
              `   - Go to AWS Console → CloudFormation → Stack Resources\n` +
              `   - Find and delete each orphaned resource listed above\n\n` +
              `2. Use the destroy command with cleanup flag:\n` +
              `   shinobi destroy --cleanup-retained\n` +
              `   This will delete the stack AND cleanup retained resources.\n\n` +
              `3. Change resource names in service.yml to avoid conflicts:\n` +
              `   - Update component names in your service.yml manifest\n` +
              `   - Redeploy with new resource names\n\n` +
              `4. Keep resources but change names (if you need to preserve data):\n` +
              `   - Change component names in service.yml\n` +
              `   - Old resources will remain orphaned but won't conflict\n\n` +
              `${'='.repeat(80)}\n` +
              `Deployment has been blocked to prevent "Resource already exists" errors.\n` +
              `Please resolve the orphaned resources before attempting to deploy again.\n` +
              `${'='.repeat(80)}\n`;

            if (options.json) {
              logger.error(JSON.stringify({
                error: 'Orphaned resources detected',
                stackName,
                stackStatus: stackStatusCheck.stackStatus,
                orphanedResources: existingOrphanedResources.map(r => ({
                  logicalId: r.logicalId,
                  resourceType: r.resourceType,
                  physicalResourceId: r.physicalResourceId
                })),
                message: 'Deployment blocked: orphaned resources from failed deployment must be cleaned up'
              }));
            } else {
              // Use console.error directly to ensure visibility (not buried in logs)
              console.error('\n');
              console.error(errorMessage);
              console.error('\n');
              logger.error('Deployment blocked: orphaned resources detected (see details above)');
            }

            return {
              success: false,
              exitCode: 1,
              error: 'Orphaned resources detected - cannot proceed with deployment'
            };
          }
        }
      } catch (checkError: any) {
        // If stack doesn't exist yet, that's fine - it will be created
        if (checkError.name !== 'ValidationError' || !checkError.message?.includes('does not exist')) {
          // Log error but don't fail deployment for validation errors
          logger.debug(`Error checking for orphaned resources: ${checkError.message || String(checkError)}`);
        }
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        if (!options.json) {
          logger.error('Deploy failed', error);
        }
        
        return {
          success: false,
          exitCode: 1,
          error: errorStack ? `${errorMessage}\n\nStack Trace:\n${errorStack}` : errorMessage
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
        exitCode: 1, // Deployment failure (CDK errors, AWS API failures, unexpected errors)
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
