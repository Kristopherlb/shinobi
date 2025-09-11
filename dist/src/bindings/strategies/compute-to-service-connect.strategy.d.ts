/**
 * Compute to Service Connect Binding Strategy
 *
 * Universal binding strategy for connecting any compute component to
 * ECS services that provide Service Connect capability.
 * Implements the Platform ECS Service Connect Standard v1.0.
 */
import { IBinderStrategy, BindingContext, BindingResult, CompatibilityEntry } from '../../platform/contracts/platform-binding-trigger-spec';
/**
 * ComputeToServiceConnectBinder
 *
 * This strategy handles all inbound connections to services that provide
 * the service:connect capability. It automatically configures security group
 * rules to enable service-to-service communication.
 *
 * Strategy Key: *:service:connect (Handles any source type to service:connect)
 */
export declare class ComputeToServiceConnectBinder implements IBinderStrategy {
    /**
     * Check if this strategy can handle the binding
     */
    canHandle(sourceType: string, targetCapability: string): boolean;
    /**
     * Execute the binding between source compute and target Service Connect service
     */
    bind(context: BindingContext): BindingResult;
    /**
     * Get compatibility matrix for this binding strategy
     */
    getCompatibilityMatrix(): CompatibilityEntry[];
    /**
     * Configure security group rules for service communication
     */
    private configureSecurityGroupRules;
    /**
     * Build environment variables for service discovery
     */
    private buildServiceDiscoveryEnvironmentVariables;
    /**
     * Configure IAM permissions directly on the source component for service communication
     * Uses direct composition pattern - modifies CDK constructs directly instead of returning JSON
     */
    private configureIamPermissions;
    /**
     * Build network access configuration for the binding
     */
    private buildNetworkConfiguration;
    /**
     * Validate binding access level
     */
    private validateAccess;
    /**
     * Generate binding summary for logging and debugging
     */
    private generateBindingSummary;
    /**
     * Get IAM role from a component based on component type
     */
    private getIamRoleFromComponent;
    /**
     * Configure Lambda-specific Service Connect permissions
     */
    private configureLambdaServiceConnectPermissions;
    /**
     * Configure ECS-specific Service Connect permissions
     */
    private configureEcsServiceConnectPermissions;
    /**
     * Add compliance-specific Service Connect permissions
     */
    private addComplianceServiceConnectPermissions;
}
