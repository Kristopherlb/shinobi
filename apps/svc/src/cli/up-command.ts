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
  CloudFormationClient,
  DescribeStacksCommand,
  DescribeStackEventsCommand,
  ListChangeSetsCommand,
  DeleteChangeSetCommand,
  DescribeChangeSetCommand
} from '@aws-sdk/client-cloudformation';
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
          
          // Save template to filesystem for manual use
          try {
            const templatePath = path.join(synthResult.assembly.directory, synthResult.stack.templateFile);
            const savedTemplatePath = path.join(process.cwd(), `${stackName}-template.json`);
            const templateContent = await fsp.readFile(templatePath, 'utf-8');
            await fsp.writeFile(savedTemplatePath, templateContent, 'utf-8');
            
            if (!options.json) {
              logger.info(`Template saved to: ${savedTemplatePath}`);
            }

          } catch (saveError) {
            // Log error but don't fail deployment
            const errorMsg = saveError instanceof Error ? saveError.message : String(saveError);
            logger.warn(`Failed to save template file: ${errorMsg}`);
          }
          
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

      // #region agent log - Check stack state before deployment
      const getDebugLogPath = async (): Promise<string | null> => {
        try {
          const { findRepoRoot } = await import('./utils/repo-root.js');
          const repoRoot = await findRepoRoot(process.cwd());
          return path.join(repoRoot, '.cursor', 'debug.log');
        } catch {
          return null; // Silently fail if we can't determine path
        }
      };
      
      const debugLog = async (data: any) => {
        try {
          await fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, timestamp: Date.now(), sessionId: 'debug-session', runId: 'stack-state-check' })
          }).catch(async () => {
            const debugLogPath = await getDebugLogPath();
            if (debugLogPath) {
              await fsp.appendFile(debugLogPath, JSON.stringify({ ...data, timestamp: Date.now(), sessionId: 'debug-session', runId: 'stack-state-check' }) + '\n', 'utf-8');
            }
          });
        } catch {}
      };

      // Check stack state before deployment
      try {
        const cfnClient = new CloudFormationClient({ region });
        const describeStacksCmd = new DescribeStacksCommand({ StackName: stackName });
        const stackResponse = await cfnClient.send(describeStacksCmd);
        
        if (stackResponse.Stacks && stackResponse.Stacks.length > 0) {
          const stack = stackResponse.Stacks[0];
          const stackStatus = stack.StackStatus;
          
          await debugLog({
            location: 'up-command.ts:check-stack-state',
            message: 'Stack state before deployment',
            hypothesisId: 'A',
            data: {
              stackName,
              stackStatus,
              isFailedState: stackStatus?.includes('ROLLBACK') || stackStatus?.includes('FAILED'),
              stackStatusReason: stack.StackStatusReason
            }
          });

          // Get recent stack events if stack is in a failed state
          if (stackStatus?.includes('ROLLBACK') || stackStatus?.includes('FAILED')) {
            const eventsCmd = new DescribeStackEventsCommand({ StackName: stackName });
            const eventsResponse = await cfnClient.send(eventsCmd);
            const failedEvents = eventsResponse.StackEvents?.filter(e => 
              e.ResourceStatus?.includes('FAILED') || e.ResourceStatus?.includes('ROLLBACK')
            ).slice(0, 10) || [];
            
            await debugLog({
              location: 'up-command.ts:check-stack-state',
              message: 'Failed stack events found',
              hypothesisId: 'A',
              data: {
                stackName,
                failedEventsCount: failedEvents.length,
                failedResources: failedEvents.map(e => ({
                  logicalId: e.LogicalResourceId,
                  resourceType: e.ResourceType,
                  status: e.ResourceStatus,
                  statusReason: e.ResourceStatusReason,
                  timestamp: e.Timestamp?.toISOString()
                }))
              }
            });
          }

          // Always check for stuck change sets (regardless of stack status)
          // Stuck change sets can cause Early Validation errors when trying to create new ones
          // A stack can be in any state while having a change set stuck in REVIEW_IN_PROGRESS
          try {
            const listChangeSetsCmd = new ListChangeSetsCommand({ StackName: stackName });
            const changeSetsResponse = await cfnClient.send(listChangeSetsCmd);
            const changeSets = changeSetsResponse.Summaries || [];
            
            // Filter for stuck change sets
            // REVIEW_IN_PROGRESS is a valid status but may not be in TypeScript types
            const stuckChangeSets = changeSets.filter(cs => 
              cs.ChangeSetName && 
              (cs.Status === 'CREATE_PENDING' || 
               cs.Status === 'CREATE_IN_PROGRESS' ||
               cs.Status === 'FAILED' ||
               (cs.Status as string) === 'REVIEW_IN_PROGRESS')
            );
            
            // Check if stack is in REVIEW_IN_PROGRESS but has no change sets
            // This indicates the stack is stuck after a change set was manually deleted
            const isStuckInReview = (stackStatus as string) === 'REVIEW_IN_PROGRESS' && changeSets.length === 0;
            
            // Delete stuck change sets if any exist
            if (stuckChangeSets.length > 0) {
              await debugLog({
                location: 'up-command.ts:check-stack-state',
                message: 'Found stuck change sets - deleting to prevent Early Validation errors',
                hypothesisId: 'A',
                data: {
                  stackName,
                  stackStatus,
                  stuckChangeSetsCount: stuckChangeSets.length,
                  stuckChangeSets: stuckChangeSets.map(cs => ({
                    changeSetName: cs.ChangeSetName,
                    status: cs.Status,
                    statusReason: cs.StatusReason,
                    creationTime: cs.CreationTime?.toISOString()
                  }))
                }
              });

              // Delete all stuck change sets (they're blocking new deployments)
              for (const changeSet of stuckChangeSets) {
                if (changeSet.ChangeSetName) {
                  try {
                    await cfnClient.send(new DeleteChangeSetCommand({
                      StackName: stackName,
                      ChangeSetName: changeSet.ChangeSetName
                    }));
                    logger.info(`Deleted stuck change set: ${changeSet.ChangeSetName} (status: ${changeSet.Status})`);
                    await debugLog({
                      location: 'up-command.ts:check-stack-state',
                      message: 'Deleted stuck change set',
                      hypothesisId: 'A',
                      data: {
                        stackName,
                        changeSetName: changeSet.ChangeSetName,
                        status: changeSet.Status
                      }
                    });
                  } catch (deleteError: any) {
                    logger.warn(`Failed to delete change set ${changeSet.ChangeSetName}: ${deleteError.message}`);
                  }
                }
              }
            }
            
            // If stack is in REVIEW_IN_PROGRESS (with or without change sets), wait for transition
            // CloudFormation should automatically transition back to previous state after change sets are deleted
            if ((stackStatus as string) === 'REVIEW_IN_PROGRESS') {
              if (isStuckInReview) {
                logger.warn(
                  `Stack ${stackName} is stuck in REVIEW_IN_PROGRESS with no change sets. ` +
                  `This can happen after manually deleting a change set. Waiting for CloudFormation to transition...`
                );
              } else {
                logger.info(`Stack ${stackName} is in REVIEW_IN_PROGRESS. Waiting for transition after deleting change sets...`);
              }
              
              let currentStatus: string = stackStatus ?? '';
              let attempts = 0;
              const maxAttempts = 60; // Wait up to 60 seconds (CloudFormation can be slow)
              
              while ((currentStatus as string) === 'REVIEW_IN_PROGRESS' && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between checks
                try {
                  const statusResponse = await cfnClient.send(new DescribeStacksCommand({ StackName: stackName }));
                  if (statusResponse.Stacks && statusResponse.Stacks.length > 0) {
                    currentStatus = statusResponse.Stacks[0].StackStatus || '';
                    if ((currentStatus as string) !== 'REVIEW_IN_PROGRESS') {
                      logger.info(`Stack ${stackName} transitioned to: ${currentStatus}`);
                      await debugLog({
                        location: 'up-command.ts:check-stack-state',
                        message: 'Stack transitioned out of REVIEW_IN_PROGRESS',
                        hypothesisId: 'A',
                        data: {
                          stackName,
                          previousStatus: stackStatus,
                          newStatus: currentStatus,
                          waitSeconds: (attempts + 1) * 2
                        }
                      });
                      break;
                    }
                  }
                } catch (statusError) {
                  // If we can't check status, continue anyway
                  logger.debug(`Error checking stack status: ${statusError}`);
                  break;
                }
                attempts++;
                
                // Log progress every 10 attempts (20 seconds)
                if (attempts % 10 === 0) {
                  logger.info(`Still waiting for stack ${stackName} to transition (${attempts * 2}s elapsed)...`);
                }
              }
              
              if ((currentStatus as string) === 'REVIEW_IN_PROGRESS') {
                logger.error(
                  `Stack ${stackName} is still stuck in REVIEW_IN_PROGRESS after ${maxAttempts * 2} seconds. ` +
                  `This is a CloudFormation issue. You may need to manually delete and recreate the stack, ` +
                  `or wait longer for CloudFormation to automatically transition. Proceeding with deployment attempt...`
                );
              }
            }
          } catch (changeSetError: any) {
            logger.debug(`Error checking change sets: ${changeSetError.message}`);
          }
        } else {
          await debugLog({
            location: 'up-command.ts:check-stack-state',
            message: 'Stack does not exist (will be created)',
            hypothesisId: 'A',
            data: { stackName }
          });
        }
      } catch (checkError: any) {
        // Stack might not exist yet, which is fine
        if (checkError.name !== 'ValidationError' || !checkError.message?.includes('does not exist')) {
          await debugLog({
            location: 'up-command.ts:check-stack-state',
            message: 'Error checking stack state',
            hypothesisId: 'A',
            data: {
              stackName,
              error: checkError.message || String(checkError),
              errorName: checkError.name
            }
          });
        }
      }
      // #endregion

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

      // #region agent log - Before deployment
      await debugLog({
        location: 'up-command.ts:before-deploy',
        message: 'About to call cli.deploy()',
        hypothesisId: 'A',
        data: { stackName, region, profile: options.profile }
      });
      // #endregion

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
        
        // #region agent log - Deployment error captured
        const isEarlyValidation = errorMessage.includes('EarlyValidation') || errorMessage.includes('ResourceExistenceCheck');
        await debugLog({
          location: 'up-command.ts:deployment-error',
          message: 'Deployment error captured',
          hypothesisId: 'A',
          data: {
            stackName,
            isEarlyValidation,
            errorMessage: errorMessage.substring(0, 500), // Truncate for log size
            hasStack: !!errorStack
          }
        });
        
        // If Early Validation error, try to extract resource details and query change set
        if (isEarlyValidation) {
          const resourceMatch = errorMessage.match(/Resource\s+([A-Za-z0-9]+)\s+\(([A-Za-z0-9:]+)\)/);
          
          // Query the failed change set for detailed validation errors
          try {
            const cfnClient = new CloudFormationClient({ region });
            const describeChangeSetCmd = new DescribeChangeSetCommand({
              StackName: stackName,
              ChangeSetName: 'cdk-deploy-change-set'
            });
            const changeSetResponse = await cfnClient.send(describeChangeSetCmd);
            
            await debugLog({
              location: 'up-command.ts:early-validation-details',
              message: 'Early Validation error details from change set',
              hypothesisId: 'A',
              data: {
                stackName,
                extractedResource: resourceMatch ? {
                  logicalId: resourceMatch[1],
                  resourceType: resourceMatch[2]
                } : null,
                changeSetStatus: changeSetResponse.Status,
                changeSetStatusReason: changeSetResponse.StatusReason,
                changes: changeSetResponse.Changes?.map(c => ({
                  type: c.Type,
                  resourceChange: c.ResourceChange ? {
                    action: c.ResourceChange.Action,
                    logicalResourceId: c.ResourceChange.LogicalResourceId,
                    resourceType: c.ResourceChange.ResourceType,
                    replacement: c.ResourceChange.Replacement
                  } : null
                })),
                fullError: errorMessage.substring(0, 1000)
              }
            });
          } catch (changeSetError: any) {
            // Change set might not exist or might have been deleted
            await debugLog({
              location: 'up-command.ts:early-validation-details',
              message: 'Early Validation error details (could not query change set)',
              hypothesisId: 'A',
              data: {
                stackName,
                extractedResource: resourceMatch ? {
                  logicalId: resourceMatch[1],
                  resourceType: resourceMatch[2]
                } : null,
                changeSetQueryError: changeSetError.message || String(changeSetError),
                fullError: errorMessage.substring(0, 1000)
              }
            });
          }
        }
        // #endregion
        
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
