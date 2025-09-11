/**
 * Compute to Security Group Import Binding Strategy
 *
 * Universal binding strategy for connecting any compute component to
 * imported security groups that provide security-group:import capability.
 * Implements the Platform Security Group Import Binding Standard v1.0.
 */
import { IBinderStrategy, BindingContext, BindingResult, CompatibilityEntry } from '../../platform/contracts/platform-binding-trigger-spec';
/**
 * ComputeToSecurityGroupImportBinder
 *
 * This strategy handles all compute components binding to imported security groups.
 * It automatically adds the imported security group to the compute component's
 * security groups list.
 *
 * Strategy Key: *:security-group:import (Handles any compute type to security-group:import)
 */
export declare class ComputeToSecurityGroupImportBinder implements IBinderStrategy {
    /**
     * Check if this strategy can handle the binding
     */
    canHandle(sourceType: string, targetCapability: string): boolean;
    /**
     * Execute the binding between source compute and target imported security group
     */
    bind(context: BindingContext): BindingResult;
    /**
     * Bind EC2 instance to imported security group
     */
    private bindEc2ToSecurityGroup;
    /**
     * Bind Lambda function to imported security group (VPC configuration)
     */
    private bindLambdaToSecurityGroup;
    /**
     * Bind ECS service to imported security group
     */
    private bindEcsToSecurityGroup;
    /**
     * Get compatibility matrix for this binding strategy
     */
    getCompatibilityMatrix(): CompatibilityEntry[];
}
