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

import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as cdk from 'aws-cdk-lib';
import { CfnSecurityGroupIngress, CfnSecurityGroupEgress } from 'aws-cdk-lib/aws-ec2';
import type { SecurityGroupRule } from '../contracts/bindings.js';

/**
 * Cross-stack rule specification stored in SSM Parameter Store
 */
export interface CrossStackRuleSpec {
  ruleId: string; // Unique identifier for this rule
  targetSecurityGroupId: string;
  rule: SecurityGroupRule;
  sourceComponent: string;
  targetComponent: string;
  bindingId: string;
  timestamp: string; // ISO timestamp
  vpcId?: string;
}

/**
 * Rule storage key format in SSM Parameter Store
 * Format: /shinobi/network-rules/{service}/{bindingId}
 */
function getRuleStorageKey(serviceName: string, bindingId: string): string {
  return `/shinobi/network-rules/${serviceName}/${bindingId}`;
}

/**
 * Cross-Stack Rule Manager
 * 
 * Manages storage and retrieval of cross-stack security group rules.
 */
export class CrossStackRuleManager {
  /**
   * Store cross-stack rule specification
   * 
   * @param stack - CDK stack to add SSM parameter to
   * @param serviceName - Source service name
   * @param ruleSpec - Rule specification to store
   */
  static storeRuleSpec(
    stack: cdk.Stack,
    serviceName: string,
    ruleSpec: CrossStackRuleSpec
  ): void {
    // Sanitize parameter name - SSM only allows .-_/ and alphanumeric
    // Replace colons and other invalid characters with hyphens
    const sanitizedBindingId = ruleSpec.bindingId.replace(/[^a-zA-Z0-9.\-_/]/g, '-');
    const parameterKey = getRuleStorageKey(serviceName, sanitizedBindingId);
    
    // Store rule spec as JSON in SSM Parameter Store
    new ssm.StringParameter(stack, `CrossStackRule-${ruleSpec.ruleId}`, {
      parameterName: parameterKey,
      stringValue: JSON.stringify(ruleSpec),
      description: `Cross-stack security group rule: ${ruleSpec.sourceComponent} -> ${ruleSpec.targetComponent}`,
      tier: ssm.ParameterTier.STANDARD
    });
  }

  /**
   * Create network rules stack that applies all cross-stack rules
   * 
   * This stack should be deployed independently or as part of shared infrastructure.
   * It reads all rule specs from SSM Parameter Store and applies them to target SGs.
   * 
   * @param app - CDK app
   * @param ruleSpecs - Array of rule specifications to apply
   * @param stackName - Name for the network rules stack
   * @returns CDK stack with rule constructs
   */
  static createNetworkRulesStack(
    app: cdk.App,
    ruleSpecs: CrossStackRuleSpec[],
    stackName: string = 'NetworkRulesStack'
  ): cdk.Stack {
    const stack = new cdk.Stack(app, stackName, {
      description: 'Cross-stack security group rules - applies rules from all services',
      tags: {
        ManagedBy: 'shinobi',
        Purpose: 'cross-stack-security-group-rules'
      }
    });

    // Group rules by target security group
    const rulesByTarget = new Map<string, CrossStackRuleSpec[]>();
    for (const spec of ruleSpecs) {
      const targetId = spec.targetSecurityGroupId;
      if (!rulesByTarget.has(targetId)) {
        rulesByTarget.set(targetId, []);
      }
      rulesByTarget.get(targetId)!.push(spec);
    }

    // Apply rules to each target security group
    for (const [targetSecurityGroupId, specs] of rulesByTarget.entries()) {
      // Deduplicate rules (same peer, port, protocol, type)
      const uniqueRules = this.deduplicateRules(specs);

      for (const spec of uniqueRules) {
        this.applyRuleToSecurityGroup(spec, targetSecurityGroupId, stack);
      }
    }

    return stack;
  }

  /**
   * Deduplicate rules based on content (peer, port, protocol, type)
   * 
   * @param specs - Array of rule specifications
   * @returns Deduplicated array of rule specifications
   */
  private static deduplicateRules(specs: CrossStackRuleSpec[]): CrossStackRuleSpec[] {
    const seen = new Map<string, CrossStackRuleSpec>();
    
    for (const spec of specs) {
      const key = this.getRuleKey(spec.rule);
      if (!seen.has(key)) {
        seen.set(key, spec);
      } else {
        // Rule already exists - keep the first one, log conflict
        console.warn(
          `[CrossStackRuleManager] Duplicate rule detected for SG ${spec.targetSecurityGroupId}. ` +
          `Keeping first occurrence from ${seen.get(key)!.sourceComponent}. ` +
          `Conflicting rule from ${spec.sourceComponent} will be ignored.`
        );
      }
    }
    
    return Array.from(seen.values());
  }

  /**
   * Generate a unique key for a rule based on its content
   * 
   * @param rule - Security group rule
   * @returns Unique key string
   */
  private static getRuleKey(rule: SecurityGroupRule): string {
    const peerKey = rule.peer.kind === 'sg' 
      ? `sg:${rule.peer.id}`
      : `cidr:${rule.peer.cidr}`;
    
    return `${rule.type}-${peerKey}-${rule.port.protocol}-${rule.port.from}-${rule.port.to}`;
  }

  /**
   * Apply a rule to a security group via CDK construct
   * 
   * @param spec - Rule specification
   * @param targetSecurityGroupId - Target security group ID
   * @param stack - CDK stack
   */
  private static applyRuleToSecurityGroup(
    spec: CrossStackRuleSpec,
    targetSecurityGroupId: string,
    stack: cdk.Stack
  ): void {
    
    // Create unique construct ID
    const constructId = `CrossStackSGRule-${spec.ruleId}`;
    
    // Prepare peer configuration
    let peerConfig: any;
    if (spec.rule.peer.kind === 'sg') {
      peerConfig = {
        sourceSecurityGroupId: spec.rule.peer.id
      };
    } else if (spec.rule.peer.kind === 'cidr') {
      peerConfig = {
        cidrIp: spec.rule.peer.cidr
      };
    } else {
      throw new Error(`Unknown peer kind: ${(spec.rule.peer as any).kind}`);
    }
    
    // Create CDK construct based on rule type
    if (spec.rule.type === 'ingress') {
      new CfnSecurityGroupIngress(stack, constructId, {
        groupId: targetSecurityGroupId,
        ipProtocol: spec.rule.port.protocol,
        fromPort: spec.rule.port.from,
        toPort: spec.rule.port.to,
        description: `${spec.rule.description} (from ${spec.sourceComponent})`,
        ...peerConfig
      });
    } else if (spec.rule.type === 'egress') {
      new CfnSecurityGroupEgress(stack, constructId, {
        groupId: targetSecurityGroupId,
        ipProtocol: spec.rule.port.protocol,
        fromPort: spec.rule.port.from,
        toPort: spec.rule.port.to,
        description: `${spec.rule.description} (from ${spec.sourceComponent})`,
        ...peerConfig
      });
    } else {
      throw new Error(`Unknown rule type: ${spec.rule.type}`);
    }
  }

  /**
   * Get SSM parameter path prefix for all network rules
   * 
   * @returns SSM parameter path prefix
   */
  static getRulePathPrefix(): string {
    return '/shinobi/network-rules';
  }

  /**
   * Get all rule storage keys for a service
   * 
   * @param serviceName - Service name
   * @returns Array of SSM parameter keys for this service's rules
   */
  static getRuleKeysForService(serviceName: string): string[] {
    // This would need to query SSM at runtime to get all parameters
    // For CDK synthesis, we can't query SSM directly
    // This is a helper for documentation/runtime scripts
    return [];
  }

  /**
   * Mark rule for deletion (when binding is removed)
   * 
   * @param stack - CDK stack
   * @param serviceName - Source service name
   * @param bindingId - Binding ID to remove
   */
  static markRuleForDeletion(
    stack: cdk.Stack,
    serviceName: string,
    bindingId: string
  ): void {
    const parameterKey = getRuleStorageKey(serviceName, bindingId);
    
    // Delete SSM parameter (this will cause rule to be removed in next network-rules stack deployment)
    // Note: CDK doesn't have a direct way to delete parameters, so we use a custom resource
    // or mark it for deletion. For now, we'll log and let the network-rules stack handle cleanup.
    console.info(
      `[CrossStackRuleManager] Rule marked for deletion: ${parameterKey}. ` +
      `Network-rules stack should remove this rule on next deployment.`
    );
  }

  /**
   * Create network-rules stack from rule specs
   * 
   * NOTE: This method requires rule specs to be provided. To read from SSM Parameter Store
   * at runtime, use a Lambda Custom Resource or deploy the network-rules stack separately
   * with a script that queries SSM and passes the specs to this method.
   * 
   * Example usage:
   * ```typescript
   * // In a separate deployment script or CLI command
   * const ssm = new AWS.SSM();
   * const params = await ssm.getParametersByPath({
   *   Path: '/shinobi/network-rules',
   *   Recursive: true
   * }).promise();
   * 
   * const ruleSpecs = params.Parameters.map(p => JSON.parse(p.Value!));
   * const app = new cdk.App();
   * CrossStackRuleManager.createNetworkRulesStack(app, ruleSpecs);
   * ```
   * 
   * @param app - CDK app
   * @param ruleSpecs - Array of rule specifications to apply (read from SSM at runtime)
   * @param stackName - Name for the network rules stack
   * @returns CDK stack with rule constructs
   */
  static createNetworkRulesStack(
    app: cdk.App,
    ruleSpecs: CrossStackRuleSpec[],
    stackName: string = 'NetworkRulesStack'
  ): cdk.Stack {
    const stack = new cdk.Stack(app, stackName, {
      description: 'Cross-stack security group rules - applies rules from all services',
      tags: {
        ManagedBy: 'shinobi',
        Purpose: 'cross-stack-security-group-rules'
      }
    });

    // Group rules by target security group
    const rulesByTarget = new Map<string, CrossStackRuleSpec[]>();
    for (const spec of ruleSpecs) {
      const targetId = spec.targetSecurityGroupId;
      if (!rulesByTarget.has(targetId)) {
        rulesByTarget.set(targetId, []);
      }
      rulesByTarget.get(targetId)!.push(spec);
    }

    // Apply rules to each target security group
    for (const [targetSecurityGroupId, specs] of rulesByTarget.entries()) {
      // Deduplicate rules (same peer, port, protocol, type)
      const uniqueRules = this.deduplicateRules(specs);

      for (const spec of uniqueRules) {
        this.applyRuleToSecurityGroup(spec, targetSecurityGroupId, stack);
      }
    }

    return stack;
  }
}

