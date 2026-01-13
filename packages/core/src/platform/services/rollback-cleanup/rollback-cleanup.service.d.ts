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
export declare class RollbackCleanupService {
    private dependencies;
    constructor(dependencies: RollbackCleanupDependencies);
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
    cleanupOrphanedResources(stackName: string, region: string): Promise<CleanupResult>;
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
    checkOrphanedResources(stackName: string, region: string): Promise<CleanupResult>;
    /**
     * Check if a resource exists in AWS
     */
    private checkResourceExists;
    /**
     * Delete an orphaned resource from AWS
     */
    private deleteResource;
    /**
     * Get retained resources from a stack before deletion
     *
     * Returns a list of resources with DeletionPolicy: Retain or UpdateReplacePolicy: Retain
     * along with their physical resource IDs. This should be called BEFORE stack deletion.
     */
    getRetainedResourcesBeforeDeletion(stackName: string, region: string): Promise<Array<{
        logicalId: string;
        resourceType: string;
        physicalResourceId: string;
    }>>;
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
    cleanupRetainedResourcesAfterDeletion(retainedResources: Array<{
        logicalId: string;
        resourceType: string;
        physicalResourceId: string;
    }>, region: string, deleteRetained?: boolean): Promise<CleanupResult>;
}
//# sourceMappingURL=rollback-cleanup.service.d.ts.map