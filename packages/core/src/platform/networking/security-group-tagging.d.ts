/**
 * Security Group Tagging Utility
 *
 * Provides standardized tagging for security groups across all components.
 * Extends BaseComponent.applyStandardTags() with security-group-specific tags.
 *
 * Required Tags:
 * - resource-type: security-group
 * - ingress-policy: binder-managed | manual | tier-based
 *
 * Optional Tags:
 * - tier: web | app | db | data
 * - cleanup-candidate: true
 * - marked-date: <iso-date>
 * - last-modified: <iso-date>
 * - binding-count: <number>
 */
import type { IConstruct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
/**
 * Security group tagging options
 */
export interface SecurityGroupTaggingOptions {
    /**
     * How ingress rules are managed
     * - 'binder-managed': Rules created by binder strategies (default)
     * - 'manual': Rules managed manually
     * - 'tier-based': Rules based on tier (web/app/db)
     */
    ingressPolicy?: 'binder-managed' | 'manual' | 'tier-based';
    /**
     * Tier classification for tier-based security groups
     */
    tier?: 'web' | 'app' | 'db' | 'data';
    /**
     * Number of active bindings to this security group
     */
    bindingCount?: number;
    /**
     * Whether this SG is a candidate for cleanup
     */
    cleanupCandidate?: boolean;
    /**
     * Additional custom tags
     */
    additionalTags?: Record<string, string>;
}
/**
 * Apply standardized security group tags
 *
 * This function extends standard component tags with security-group-specific tags.
 * Should be called after BaseComponent.applyStandardTags() or as part of it.
 *
 * @param securityGroup - Security group construct to tag
 * @param options - Security group tagging options
 */
export declare function applySecurityGroupTags(securityGroup: ec2.ISecurityGroup | IConstruct, options?: SecurityGroupTaggingOptions): void;
/**
 * Validate security group tags
 *
 * Checks that required tags are present on a security group.
 *
 * @param securityGroup - Security group to validate
 * @returns Array of missing required tags
 */
export declare function validateSecurityGroupTags(securityGroup: ec2.ISecurityGroup): string[];
/**
 * Get security group tagging documentation
 *
 * @returns Documentation string for security group tagging requirements
 */
export declare function getSecurityGroupTaggingDocumentation(): string;
//# sourceMappingURL=security-group-tagging.d.ts.map