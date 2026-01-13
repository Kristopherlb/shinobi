/**
 * Cross-Stack Security Group Rule Manager
 *
 * Manages security group rules that need to be applied across different CDK stacks.
 * Enables Service A to add rules to Service B's security group without requiring
 * Service B to be redeployed.
 *
 * Architecture:
 * - Stores rule specifications in SSM Parameter Store (or S3)
 * - Separate "network-rules" stack reads all rule specs and applies them
 * - Handles rule conflicts and deduplication
 * - Supports rule removal when bindings are deleted
 *
 * This manager works in conjunction with SecurityGroupRulePostProcessor (SG-006).
 */
import * as cdk from 'aws-cdk-lib';
import type { SecurityGroupRule } from '../contracts/bindings.js';
/**
 * Cross-stack rule specification stored in SSM Parameter Store
 */
export interface CrossStackRuleSpec {
    ruleId: string;
    targetSecurityGroupId: string;
    rule: SecurityGroupRule;
    sourceComponent: string;
    targetComponent: string;
    bindingId: string;
    timestamp: string;
    vpcId?: string;
}
/**
 * Cross-Stack Rule Manager
 *
 * Manages storage and retrieval of cross-stack security group rules.
 */
export declare class CrossStackRuleManager {
    /**
     * Store cross-stack rule specification
     *
     * @param stack - CDK stack to add SSM parameter to
     * @param serviceName - Source service name
     * @param ruleSpec - Rule specification to store
     */
    static storeRuleSpec(stack: cdk.Stack, serviceName: string, ruleSpec: CrossStackRuleSpec): void;
    /**
     * Deduplicate rules based on content (peer, port, protocol, type)
     *
     * @param specs - Array of rule specifications
     * @returns Deduplicated array of rule specifications
     */
    private static deduplicateRules;
    /**
     * Generate a unique key for a rule based on its content
     *
     * @param rule - Security group rule
     * @returns Unique key string
     */
    private static getRuleKey;
    /**
     * Apply a rule to a security group via CDK construct
     *
     * @param spec - Rule specification
     * @param targetSecurityGroupId - Target security group ID
     * @param stack - CDK stack
     */
    private static applyRuleToSecurityGroup;
    /**
     * Get SSM parameter path prefix for all network rules
     *
     * @returns SSM parameter path prefix
     */
    static getRulePathPrefix(): string;
    /**
     * Get all rule storage keys for a service
     *
     * @param serviceName - Service name
     * @returns Array of SSM parameter keys for this service's rules
     */
    static getRuleKeysForService(serviceName: string): string[];
    /**
     * Mark rule for deletion (when binding is removed)
     *
     * Creates a Custom Resource that deletes the SSM parameter, which will cause
     * the rule to be removed in the next network-rules stack deployment.
     *
     * **Trade-off: Delayed Revocation**
     * Rules remain active until the network-rules stack is redeployed after this
     * SSM parameter is deleted. This provides eventual consistency and is acceptable
     * for most use cases. For immediate revocation, see SG-011 (EventBridge-triggered cleanup).
     *
     * @param stack - CDK stack
     * @param serviceName - Source service name (will be sanitized)
     * @param bindingId - Binding ID to remove (will be sanitized)
     */
    static markRuleForDeletion(stack: cdk.Stack, serviceName: string, bindingId: string): void;
    /**
     * Create network-rules stack from rule specs
     *
     * **DEPRECATED**: This method is deprecated. Use the `network-rules-stack` component instead.
     * Declare it in your service manifest:
     * ```yaml
     * components:
     *   - name: network-rules-stack
     *     type: network-rules-stack
     *     config:
     *       ssmPathPrefix: "/shinobi/network-rules"
     * ```
     *
     * This method is kept for backward compatibility and testing purposes only.
     *
     * @deprecated Use the `network-rules-stack` component instead. See `@shinobi/components-network-rules-stack`.
     * @param app - CDK app
     * @param ruleSpecs - Array of rule specifications to apply (read from SSM at runtime)
     * @param stackName - Name for the network rules stack
     * @returns CDK stack with rule constructs
     */
    static createNetworkRulesStack(app: cdk.App, ruleSpecs: CrossStackRuleSpec[], stackName?: string): cdk.Stack;
}
//# sourceMappingURL=cross-stack-rule-manager.d.ts.map