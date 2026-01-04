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

import * as cdk from 'aws-cdk-lib';
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
export function applySecurityGroupTags(
  securityGroup: ec2.ISecurityGroup | IConstruct,
  options: SecurityGroupTaggingOptions = {}
): void {
  const tags: Record<string, string> = {
    'resource-type': 'security-group',
    'ingress-policy': options.ingressPolicy || 'binder-managed'
  };

  // Add tier tag if specified
  if (options.tier) {
    tags['tier'] = options.tier;
  }

  // Add binding count if specified
  if (options.bindingCount !== undefined) {
    tags['binding-count'] = options.bindingCount.toString();
  }

  // Add cleanup candidate tag if marked
  if (options.cleanupCandidate) {
    tags['cleanup-candidate'] = 'true';
    tags['marked-date'] = new Date().toISOString();
  }

  // Add last modified timestamp
  tags['last-modified'] = new Date().toISOString();

  // Merge additional tags
  if (options.additionalTags) {
    Object.assign(tags, options.additionalTags);
  }

  // Apply tags to security group
  Object.entries(tags).forEach(([key, value]) => {
    cdk.Tags.of(securityGroup).add(key, value);
  });
}

/**
 * Validate security group tags
 * 
 * Checks that required tags are present on a security group.
 * 
 * @param securityGroup - Security group to validate
 * @returns Array of missing required tags
 */
export function validateSecurityGroupTags(securityGroup: ec2.ISecurityGroup): string[] {
  const requiredTags = [
    'resource-type',
    'ingress-policy'
  ];

  const missingTags: string[] = [];
  
  // Note: CDK doesn't provide a way to read tags at synthesis time
  // This validation would need to be done at runtime or via AWS Config
  // For now, this is a placeholder for documentation purposes
  
  return missingTags;
}

/**
 * Get security group tagging documentation
 * 
 * @returns Documentation string for security group tagging requirements
 */
export function getSecurityGroupTaggingDocumentation(): string {
  return `
# Security Group Tagging Standard

## Required Tags

All security groups must have the following tags:

- **resource-type**: Must be 'security-group'
- **ingress-policy**: How ingress rules are managed
  - 'binder-managed': Rules created by binder strategies (default)
  - 'manual': Rules managed manually
  - 'tier-based': Rules based on tier classification

## Optional Tags

- **tier**: Tier classification ('web', 'app', 'db', 'data')
- **binding-count**: Number of active bindings to this security group
- **cleanup-candidate**: Set to 'true' if marked for cleanup
- **marked-date**: ISO timestamp when marked for cleanup
- **last-modified**: ISO timestamp of last modification

## Usage

\`\`\`typescript
import { applySecurityGroupTags } from '@shinobi/core';

// In component code
this.applyStandardTags(this.securityGroup, {
  'component-type': 'ecs-fargate-service'
});

// Apply security-group-specific tags
applySecurityGroupTags(this.securityGroup, {
  ingressPolicy: 'binder-managed',
  tier: 'app',
  bindingCount: 3
});
\`\`\`
`;
}

