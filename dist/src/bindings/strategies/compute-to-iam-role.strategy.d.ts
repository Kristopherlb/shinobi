/**
 * Compute to IAM Role Binding Strategy
 *
 * Universal binding strategy for connecting any compute component to
 * IAM roles that provide iam:assumeRole capability.
 * Implements the Platform IAM Role Binding Standard v1.0.
 */
import { IBinderStrategy, BindingContext, BindingResult, CompatibilityEntry } from '../../platform/contracts/platform-binding-trigger-spec';
/**
 * ComputeToIamRoleBinder
 *
 * This strategy handles all compute components binding to IAM roles.
 * It automatically creates the appropriate attachment mechanism:
 * - EC2 instances: Creates IAM Instance Profile
 * - Lambda functions: Attaches role directly
 * - ECS tasks: Creates task role
 *
 * Strategy Key: *:iam:assumeRole (Handles any compute type to iam:assumeRole)
 */
export declare class ComputeToIamRoleBinder implements IBinderStrategy {
    /**
     * Check if this strategy can handle the binding
     */
    canHandle(sourceType: string, targetCapability: string): boolean;
    /**
     * Execute the binding between source compute and target IAM role
     */
    bind(context: BindingContext): BindingResult;
    /**
     * Bind EC2 instance to IAM role by creating an Instance Profile
     */
    private bindEc2ToIamRole;
    /**
     * Bind Lambda function to IAM role by attaching the role directly
     */
    private bindLambdaToIamRole;
    /**
     * Bind ECS service to IAM role by creating a task role
     */
    private bindEcsToIamRole;
    /**
     * Extract policy statements from an IAM role for merging
     */
    private extractPolicyStatements;
    /**
     * Get compatibility matrix for this binding strategy
     */
    getCompatibilityMatrix(): CompatibilityEntry[];
}
