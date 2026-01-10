/**
 * Rollback Cleanup Service
 * 
 * SAFETY POLICY:
 * ==============
 * ⚠️ NO AUTOMATIC DELETION IN NORMAL OPERATIONS
 * 
 * This service follows a strict safety model:
 * - VALIDATION ONLY: Normal operations (e.g., `shinobi up`) validate orphaned resources
 *   and BLOCK deployment with clear error messages. Resources are NEVER automatically deleted.
 * - EXPLICIT CLEANUP ONLY: Resources are only deleted when:
 *   1. `shinobi destroy --cleanup-retained` is explicitly called by the user
 *   2. The user has confirmed the deletion operation
 *   3. Resources belong to the specific stack being destroyed
 * 
 * When a CloudFormation stack fails and rolls back, some resources may be
 * created but then rolled back. These resources become "orphaned" - they
 * exist in AWS but are not managed by CloudFormation. On the next deployment,
 * CloudFormation's Early Validation checks if referenced resources exist,
 * and fails because the orphaned resources exist but aren't in the stack.
 * 
 * SAFE METHODS (validation only, no deletion):
 * - checkOrphanedResources(): Validates orphaned resources, blocks deployment, provides
 *   clear error messages with actionable guidance. Used by `shinobi up`.
 * 
 * CONTROLLED METHODS (deletion only with explicit user action):
 * - cleanupRetainedResourcesAfterDeletion(): Deletes resources with DeletionPolicy: Retain
 *   ONLY when called from `shinobi destroy --cleanup-retained` with explicit confirmation.
 * 
 * DANGEROUS METHODS (marked as deprecated, should not be used):
 * - cleanupOrphanedResources(): Automatically deletes resources - DEPRECATED and not called
 *   by normal platform operations. Only present for legacy compatibility.
 */

import {
  CloudFormationClient,
  DescribeStacksCommand,
  DescribeStackResourcesCommand,
  GetTemplateCommand
} from '@aws-sdk/client-cloudformation';
import {
  LambdaClient,
  GetFunctionCommand,
  DeleteFunctionCommand
} from '@aws-sdk/client-lambda';
import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  DeleteLogGroupCommand
} from '@aws-sdk/client-cloudwatch-logs';
import {
  S3Client,
  HeadBucketCommand,
  DeleteBucketCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3';
import type { Logger } from '../../logger/src/index.js';

export interface RollbackCleanupDependencies {
  logger: Logger;
}

export interface OrphanedResource {
  logicalId: string;
  resourceType: string;
  physicalResourceId?: string;
  exists: boolean;
  deleted: boolean;
  error?: string;
}

export interface CleanupResult {
  stackInFailedState: boolean;
  stackStatus?: string;
  orphanedResources: OrphanedResource[];
  cleanedUp: number;
  errors: string[];
}

export class RollbackCleanupService {
  constructor(private dependencies: RollbackCleanupDependencies) {}

  /**
   * ⚠️ DANGEROUS: Automatically deletes resources - DO NOT USE in normal operations
   * 
   * This method DELETES orphaned resources without explicit user confirmation.
   * It should ONLY be used in very controlled contexts (e.g., CI/CD cleanup scripts)
   * with explicit understanding of what will be deleted.
   * 
   * ⚠️ WARNING: This method is NOT called by the platform's normal deployment flow.
   * Use `checkOrphanedResources()` for validation-only checks that block deployment
   * and require manual user action.
   * 
   * ⚠️ WARNING: Only resources that belong to the specified stack should be deleted.
   * This method only checks resources within the failed stack, but still performs
   * automatic deletion which could be dangerous if called incorrectly.
   * 
   * @deprecated This method may be removed in a future version. Use `checkOrphanedResources()`
   * for validation and `cleanupRetainedResourcesAfterDeletion()` with explicit flags
   * for cleanup operations.
   * 
   * @param stackName - Name of the CloudFormation stack
   * @param region - AWS region
   * @returns CleanupResult with information about deleted resources
   */
  async cleanupOrphanedResources(
    stackName: string,
    region: string
  ): Promise<CleanupResult> {
    const { logger } = this.dependencies;
    const result: CleanupResult = {
      stackInFailedState: false,
      orphanedResources: [],
      cleanedUp: 0,
      errors: []
    };

          try {
            const cfnClient = new CloudFormationClient({ region });

            // Check stack status
            const describeStacksCmd = new DescribeStacksCommand({ StackName: stackName });
            const stackResponse = await cfnClient.send(describeStacksCmd);

            if (!stackResponse.Stacks || stackResponse.Stacks.length === 0) {
              // Stack doesn't exist - check for orphaned retained resources that might cause name conflicts
              logger.debug(`Stack ${stackName} does not exist. Checking for orphaned retained resources...`);
              // Note: We can't check for orphaned resources here without the template
              // This will be handled by checking for name conflicts during deployment
              return result;
            }

      const stack = stackResponse.Stacks[0];
      const stackStatus = stack.StackStatus || '';

      // Check if stack is in a failed/rollback state
      const isFailedState = stackStatus.includes('ROLLBACK') || 
                           stackStatus.includes('FAILED') ||
                           stackStatus === 'ROLLBACK_COMPLETE' ||
                           stackStatus === 'UPDATE_ROLLBACK_COMPLETE';

      result.stackInFailedState = isFailedState;
      result.stackStatus = stackStatus;

      if (!isFailedState) {
        // Stack is healthy - no cleanup needed
        logger.debug(`Stack ${stackName} is in healthy state: ${stackStatus}`);
        return result;
      }

      logger.info(`Stack ${stackName} is in failed state: ${stackStatus}. Checking for orphaned resources...`);

      // Get all stack resources
      const describeResourcesCmd = new DescribeStackResourcesCommand({ StackName: stackName });
      const resourcesResponse = await cfnClient.send(describeResourcesCmd);

      // Find resources that were rolled back
      const rolledBackResources = (resourcesResponse.StackResources || []).filter(
        (resource) =>
          resource.ResourceStatus === 'CREATE_FAILED' ||
          resource.ResourceStatus === 'ROLLBACK_COMPLETE' ||
          resource.ResourceStatus === 'UPDATE_ROLLBACK_COMPLETE' ||
          resource.ResourceStatus === 'DELETE_FAILED'
      );

      if (rolledBackResources.length === 0) {
        logger.debug(`No rolled-back resources found in stack ${stackName}`);
        return result;
      }

      logger.info(`Found ${rolledBackResources.length} rolled-back resources. Checking if they still exist in AWS...`);

      // Check each rolled-back resource and delete if it exists
      for (const resource of rolledBackResources) {
        const orphanedResource: OrphanedResource = {
          logicalId: resource.LogicalResourceId || 'unknown',
          resourceType: resource.ResourceType || 'unknown',
          physicalResourceId: resource.PhysicalResourceId,
          exists: false,
          deleted: false
        };

        try {
          // Check if resource exists in AWS
          const exists = await this.checkResourceExists(
            resource.ResourceType || '',
            resource.PhysicalResourceId || '',
            region
          );

          orphanedResource.exists = exists;

          if (exists) {
            logger.warn(
              `Orphaned resource found: ${orphanedResource.logicalId} (${orphanedResource.resourceType}) - ${orphanedResource.physicalResourceId}`
            );

            // Delete the orphaned resource
            const deleted = await this.deleteResource(
              resource.ResourceType || '',
              resource.PhysicalResourceId || '',
              region
            );

            orphanedResource.deleted = deleted;

            if (deleted) {
              result.cleanedUp++;
              logger.info(
                `Deleted orphaned resource: ${orphanedResource.logicalId} (${orphanedResource.resourceType})`
              );
            } else {
              result.errors.push(
                `Failed to delete ${orphanedResource.logicalId}: Resource exists but deletion failed`
              );
            }
          } else {
            logger.debug(
              `Rolled-back resource ${orphanedResource.logicalId} does not exist in AWS (already cleaned up)`
            );
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          orphanedResource.error = errorMsg;
          result.errors.push(`Error checking ${orphanedResource.logicalId}: ${errorMsg}`);
          logger.warn(`Error checking resource ${orphanedResource.logicalId}: ${errorMsg}`);
        }

        result.orphanedResources.push(orphanedResource);
      }

      if (result.cleanedUp > 0) {
        logger.info(`Cleaned up ${result.cleanedUp} orphaned resource(s) from failed deployment`);
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Error during cleanup: ${errorMsg}`);
      logger.error(`Error during rollback cleanup: ${errorMsg}`, error);
      return result;
    }
  }

  /**
   * Check if stack is in a failed/rollback state and identify orphaned resources
   * 
   * This method validates but does NOT delete resources. It's used to detect
   * orphaned resources that would cause deployment failures, allowing the user
   * to take manual action.
   * 
   * @param stackName - Name of the CloudFormation stack
   * @param region - AWS region
   * @returns CleanupResult with orphaned resources (deleted field will always be false)
   */
  async checkOrphanedResources(
    stackName: string,
    region: string
  ): Promise<CleanupResult> {
    const { logger } = this.dependencies;
    const result: CleanupResult = {
      stackInFailedState: false,
      orphanedResources: [],
      cleanedUp: 0, // Always 0 for check-only method
      errors: []
    };

    try {
      const cfnClient = new CloudFormationClient({ region });

      // Check stack status
      const describeStacksCmd = new DescribeStacksCommand({ StackName: stackName });
      const stackResponse = await cfnClient.send(describeStacksCmd);

      if (!stackResponse.Stacks || stackResponse.Stacks.length === 0) {
        // Stack doesn't exist - no orphaned resources to check
        logger.debug(`Stack ${stackName} does not exist. No orphaned resources to check.`);
        return result;
      }

      const stack = stackResponse.Stacks[0];
      const stackStatus = stack.StackStatus || '';

      // Check if stack is in a failed/rollback state
      const isFailedState = stackStatus.includes('ROLLBACK') || 
                           stackStatus.includes('FAILED') ||
                           stackStatus === 'ROLLBACK_COMPLETE' ||
                           stackStatus === 'UPDATE_ROLLBACK_COMPLETE';

      result.stackInFailedState = isFailedState;
      result.stackStatus = stackStatus;

      if (!isFailedState) {
        // Stack is healthy - no orphaned resources
        logger.debug(`Stack ${stackName} is in healthy state: ${stackStatus}`);
        return result;
      }

      logger.debug(`Stack ${stackName} is in failed state: ${stackStatus}. Checking for orphaned resources...`);

      // Get all stack resources
      const describeResourcesCmd = new DescribeStackResourcesCommand({ StackName: stackName });
      const resourcesResponse = await cfnClient.send(describeResourcesCmd);

      // Find resources that were rolled back
      const rolledBackResources = (resourcesResponse.StackResources || []).filter(
        (resource) =>
          resource.ResourceStatus === 'CREATE_FAILED' ||
          resource.ResourceStatus === 'ROLLBACK_COMPLETE' ||
          resource.ResourceStatus === 'UPDATE_ROLLBACK_COMPLETE' ||
          resource.ResourceStatus === 'DELETE_FAILED'
      );

      if (rolledBackResources.length === 0) {
        logger.debug(`No rolled-back resources found in stack ${stackName}`);
        return result;
      }

      logger.debug(`Found ${rolledBackResources.length} rolled-back resources. Checking if they still exist in AWS...`);

      // Check each rolled-back resource but DO NOT delete
      for (const resource of rolledBackResources) {
        const orphanedResource: OrphanedResource = {
          logicalId: resource.LogicalResourceId || 'unknown',
          resourceType: resource.ResourceType || 'unknown',
          physicalResourceId: resource.PhysicalResourceId,
          exists: false,
          deleted: false // Always false for check-only method
        };

        try {
          // Check if resource exists in AWS
          const exists = await this.checkResourceExists(
            resource.ResourceType || '',
            resource.PhysicalResourceId || '',
            region
          );

          orphanedResource.exists = exists;

          if (exists) {
            logger.debug(
              `Orphaned resource found: ${orphanedResource.logicalId} (${orphanedResource.resourceType}) - ${orphanedResource.physicalResourceId}`
            );
          } else {
            logger.debug(
              `Rolled-back resource ${orphanedResource.logicalId} does not exist in AWS (already cleaned up)`
            );
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          orphanedResource.error = errorMsg;
          result.errors.push(`Error checking ${orphanedResource.logicalId}: ${errorMsg}`);
          logger.debug(`Error checking resource ${orphanedResource.logicalId}: ${errorMsg}`);
        }

        result.orphanedResources.push(orphanedResource);
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Error during check: ${errorMsg}`);
      logger.error(`Error during orphaned resource check: ${errorMsg}`, error);
      return result;
    }
  }

  /**
   * Check if a resource exists in AWS
   */
  private async checkResourceExists(
    resourceType: string,
    physicalResourceId: string,
    region: string
  ): Promise<boolean> {
    try {
      if (resourceType === 'AWS::Lambda::Function') {
        const lambdaClient = new LambdaClient({ region });
        await lambdaClient.send(new GetFunctionCommand({ FunctionName: physicalResourceId }));
        return true;
      } else if (resourceType === 'AWS::Logs::LogGroup') {
        const logsClient = new CloudWatchLogsClient({ region });
        const logGroups = await logsClient.send(
          new DescribeLogGroupsCommand({ logGroupNamePrefix: physicalResourceId })
        );
        return (logGroups.logGroups || []).some((lg: { logGroupName?: string }) => lg.logGroupName === physicalResourceId);
      } else if (resourceType === 'AWS::S3::Bucket') {
        const s3Client = new S3Client({ region });
        try {
          await s3Client.send(new HeadBucketCommand({ Bucket: physicalResourceId }));
          return true;
        } catch {
          return false;
        }
      }
      // For other resource types, we can't easily check existence
      // Return false to be safe (don't try to delete if we're not sure)
      return false;
    } catch (error: any) {
      // Resource doesn't exist if we get a 404/NotFound error
      if (error.name === 'ResourceNotFoundException' || 
          error.name === 'NoSuchBucket' ||
          error.name === 'ResourceNotFound') {
        return false;
      }
      // For other errors, assume resource exists (be conservative)
      return true;
    }
  }

  /**
   * Delete an orphaned resource from AWS
   */
  private async deleteResource(
    resourceType: string,
    physicalResourceId: string,
    region: string
  ): Promise<boolean> {
    try {
      if (resourceType === 'AWS::Lambda::Function') {
        const lambdaClient = new LambdaClient({ region });
        await lambdaClient.send(new DeleteFunctionCommand({ FunctionName: physicalResourceId }));
        return true;
      } else if (resourceType === 'AWS::Logs::LogGroup') {
        const logsClient = new CloudWatchLogsClient({ region });
        await logsClient.send(new DeleteLogGroupCommand({ logGroupName: physicalResourceId }));
        return true;
      } else if (resourceType === 'AWS::S3::Bucket') {
        const s3Client = new S3Client({ region });
        
        // S3 buckets must be empty before deletion
        // List and delete all objects
        const listObjects = await s3Client.send(
          new ListObjectsV2Command({ Bucket: physicalResourceId })
        );
        
        if (listObjects.Contents && listObjects.Contents.length > 0) {
          // Bucket has objects - can't delete automatically
          // Log warning and return false
          this.dependencies.logger.warn(
            `S3 bucket ${physicalResourceId} has ${listObjects.Contents.length} objects. Cannot delete automatically. Please empty the bucket manually.`
          );
          return false;
        }
        
        await s3Client.send(new DeleteBucketCommand({ Bucket: physicalResourceId }));
        return true;
      }
      
      // For other resource types, we can't easily delete them
      // Return false to indicate we couldn't delete
      return false;
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.dependencies.logger.warn(
        `Failed to delete ${resourceType} ${physicalResourceId}: ${errorMsg}`
      );
      return false;
    }
  }

  /**
   * Get retained resources from a stack before deletion
   * 
   * Returns a list of resources with DeletionPolicy: Retain or UpdateReplacePolicy: Retain
   * along with their physical resource IDs. This should be called BEFORE stack deletion.
   */
  async getRetainedResourcesBeforeDeletion(
    stackName: string,
    region: string
  ): Promise<Array<{ logicalId: string; resourceType: string; physicalResourceId: string }>> {
    const { logger } = this.dependencies;
    const retainedResources: Array<{ logicalId: string; resourceType: string; physicalResourceId: string }> = [];

    try {
      const cfnClient = new CloudFormationClient({ region });

      // Get stack template to find resources with Retain policies
      let template: any;
      try {
        const getTemplateCmd = new GetTemplateCommand({ 
          StackName: stackName,
          TemplateStage: 'Original'
        });
        const templateResponse = await cfnClient.send(getTemplateCmd);
        template = typeof templateResponse.TemplateBody === 'string' 
          ? JSON.parse(templateResponse.TemplateBody)
          : templateResponse.TemplateBody;
      } catch (error: any) {
        // Stack might not exist
        if (error.name === 'ValidationError' && error.message?.includes('does not exist')) {
          logger.debug(`Stack ${stackName} does not exist. No retained resources to track.`);
          return [];
        }
        logger.warn(`Failed to get stack template: ${error.message || String(error)}`);
        return [];
      }

      // Find resources with Retain policies
      const retainedLogicalIds: Array<{ logicalId: string; resourceType: string }> = [];
      if (template.Resources) {
        for (const [logicalId, resource] of Object.entries(template.Resources)) {
          const res = resource as any;
          if (res.DeletionPolicy === 'Retain' || res.UpdateReplacePolicy === 'Retain') {
            retainedLogicalIds.push({
              logicalId,
              resourceType: res.Type || 'unknown'
            });
          }
        }
      }

      if (retainedLogicalIds.length === 0) {
        return [];
      }

      // Get physical resource IDs for retained resources
      const describeResourcesCmd = new DescribeStackResourcesCommand({ StackName: stackName });
      const resourcesResponse = await cfnClient.send(describeResourcesCmd);
      const stackResources = resourcesResponse.StackResources || [];

      // Map logical IDs to physical resource IDs
      for (const retained of retainedLogicalIds) {
        const stackResource = stackResources.find(
          r => r.LogicalResourceId === retained.logicalId
        );
        if (stackResource?.PhysicalResourceId) {
          retainedResources.push({
            logicalId: retained.logicalId,
            resourceType: retained.resourceType,
            physicalResourceId: stackResource.PhysicalResourceId
          });
        }
      }

      return retainedResources;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`Error getting retained resources: ${errorMsg}`);
      return [];
    }
  }

  /**
   * Clean up retained resources after stack deletion
   * 
   * Resources with DeletionPolicy: Retain or UpdateReplacePolicy: Retain
   * are not deleted when the stack is destroyed. These become orphaned
   * and can cause Early Validation errors on subsequent deployments.
   * 
   * This method should be called AFTER stack deletion completes.
   * The retainedResources parameter should come from getRetainedResourcesBeforeDeletion().
   */
  async cleanupRetainedResourcesAfterDeletion(
    retainedResources: Array<{ logicalId: string; resourceType: string; physicalResourceId: string }>,
    region: string,
    deleteRetained: boolean = false
  ): Promise<CleanupResult> {
    const { logger } = this.dependencies;
    const result: CleanupResult = {
      stackInFailedState: false,
      orphanedResources: [],
      cleanedUp: 0,
      errors: []
    };

    try {
      if (retainedResources.length === 0) {
        logger.debug(`No retained resources to clean up`);
        return result;
      }

      // Log retained resources
      if (!deleteRetained) {
        logger.warn(
          `The following ${retainedResources.length} resource(s) will be retained after stack deletion:`
        );
        for (const retained of retainedResources) {
          logger.warn(
            `  - ${retained.logicalId} (${retained.resourceType}) - ${retained.physicalResourceId}`
          );
        }
        logger.warn(
          `These resources may cause Early Validation errors on subsequent deployments. ` +
          `Use --cleanup-retained to automatically delete them after stack deletion.`
        );
        return result;
      }

      // Wait a moment for stack deletion to complete
      // (This method should be called after stack deletion completes)
      logger.info(`Checking for orphaned retained resources after stack deletion...`);

      // Check each retained resource and delete if it exists
      for (const retained of retainedResources) {
        const orphanedResource: OrphanedResource = {
          logicalId: retained.logicalId,
          resourceType: retained.resourceType,
          physicalResourceId: retained.physicalResourceId,
          exists: false,
          deleted: false
        };

        try {
          // Check if resource exists in AWS
          const exists = await this.checkResourceExists(
            retained.resourceType,
            retained.physicalResourceId,
            region
          );

          orphanedResource.exists = exists;

          if (exists) {
            logger.warn(
              `Orphaned retained resource found: ${orphanedResource.logicalId} ` +
              `(${orphanedResource.resourceType}) - ${retained.physicalResourceId}`
            );

            // Delete the orphaned resource
            const deleted = await this.deleteResource(
              retained.resourceType,
              retained.physicalResourceId,
              region
            );

            orphanedResource.deleted = deleted;

            if (deleted) {
              result.cleanedUp++;
              logger.info(
                `Deleted orphaned retained resource: ${orphanedResource.logicalId} ` +
                `(${orphanedResource.resourceType})`
              );
            } else {
              result.errors.push(
                `Failed to delete ${orphanedResource.logicalId}: Resource exists but deletion failed`
              );
            }
          } else {
            logger.debug(
              `Retained resource ${orphanedResource.logicalId} does not exist in AWS (already cleaned up)`
            );
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          orphanedResource.error = errorMsg;
          result.errors.push(`Error checking ${orphanedResource.logicalId}: ${errorMsg}`);
          logger.warn(`Error checking resource ${orphanedResource.logicalId}: ${errorMsg}`);
        }

        result.orphanedResources.push(orphanedResource);
      }

      if (result.cleanedUp > 0) {
        logger.info(`Cleaned up ${result.cleanedUp} orphaned retained resource(s) after stack deletion`);
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Error during retained resource cleanup: ${errorMsg}`);
      logger.error(`Error during retained resource cleanup: ${errorMsg}`, error);
      return result;
    }
  }

}

