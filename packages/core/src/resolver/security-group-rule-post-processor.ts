/**
 * Security Group Rule Post-Processor
 * 
 * Collects securityGroupRules from binding results and applies them to target security groups.
 * This enables cross-stack security group rule application without requiring target service redeployment.
 * 
 * Architecture:
 * - Collects all securityGroupRules from binding results
 * - Groups rules by target security group ID
 * - Creates CDK constructs (CfnSecurityGroupIngress/Egress) to apply rules
 * - Handles cross-stack rules via separate stack or SSM Parameter Store
 * 
 * This post-processor runs after all bindings are complete but before CDK synthesis.
 */

import * as cdk from 'aws-cdk-lib';
import { CfnSecurityGroupIngress, CfnSecurityGroupEgress } from 'aws-cdk-lib/aws-ec2';
import type { EnhancedBindingResult } from '../platform/contracts/platform-binding-trigger-spec.js';
import type { SecurityGroupRule } from '../platform/contracts/bindings.js';
import type { BindingContext } from '../platform/contracts/platform-binding-trigger-spec.js';
import { CrossStackRuleManager, type CrossStackRuleSpec } from '../platform/networking/cross-stack-rule-manager.js';

/**
 * Security group rule with metadata for tracking
 */
interface TrackedSecurityGroupRule extends SecurityGroupRule {
  targetSecurityGroupId: string;
  sourceComponent: string;
  targetComponent: string;
  bindingId: string; // Unique identifier for this binding
}

/**
 * Grouped rules by target security group
 */
interface SecurityGroupRuleGroup {
  targetSecurityGroupId: string;
  vpcId?: string;
  rules: TrackedSecurityGroupRule[];
}

/**
 * Post-processor result
 */
export interface SecurityGroupRulePostProcessorResult {
  rulesApplied: number;
  securityGroupsAffected: number;
  crossStackRules: number;
  rulesRemoved: number;
}

/**
 * Security Group Rule Post-Processor
 * 
 * Processes securityGroupRules from binding results and applies them to security groups.
 */
export class SecurityGroupRulePostProcessor {
  /**
   * Process binding results and apply security group rules
   * 
   * @param bindings - Array of binding results from resolver engine
   * @param stack - CDK stack to add rule constructs to
   * @param components - Array of components for resolving security group IDs
   * @param serviceName - Service name for cross-stack rule storage
   * @param previousBindingIds - Optional array of binding IDs from previous synthesis run (for rule removal)
   * @returns Post-processor result with statistics
   */
  static process(
    bindings: Array<{
      source: string;
      target: string;
      capability: string;
      result: EnhancedBindingResult;
    }>,
    stack: cdk.Stack,
    components: any[],
    serviceName?: string,
    previousBindingIds?: string[]
  ): SecurityGroupRulePostProcessorResult {
    // Phase 1: Collect all security group rules from binding results
    const allRules: TrackedSecurityGroupRule[] = [];
    
    for (const binding of bindings) {
      const { source, target, capability, result } = binding;
      
      // Only process security-group:rule capability bindings
      if (capability !== 'security-group:rule' && capability !== 'network:security-group-rule') {
        continue;
      }
      
      // Extract target security group ID from environment variables
      // Check if securityGroupRules exist first
      if (!result.securityGroupRules || result.securityGroupRules.length === 0) {
        continue; // No rules to process
      }
      
      // Check if environmentVariables exists
      if (!result.environmentVariables) {
        console.warn(
          `[SG-PostProcessor] Binding ${source} -> ${target} (${capability}) ` +
          `has securityGroupRules but missing environmentVariables. Skipping.`
        );
        continue;
      }
      
      // Access the target security group ID - handle both bracket and dot notation
      const targetSecurityGroupId = result.environmentVariables['SECURITY_GROUP_RULE_TARGET_SG_ID'] 
        || result.environmentVariables.SECURITY_GROUP_RULE_TARGET_SG_ID;
      
      if (!targetSecurityGroupId) {
        const envKeys = Object.keys(result.environmentVariables);
        console.warn(
          `[SG-PostProcessor] Binding ${source} -> ${target} (${capability}) ` +
          `has securityGroupRules but missing SECURITY_GROUP_RULE_TARGET_SG_ID. ` +
          `Available env vars: ${envKeys.join(', ') || '(none)'}. Skipping.`
        );
        continue;
      }
      
      // Track each rule with metadata
      for (const rule of result.securityGroupRules) {
        allRules.push({
          ...rule,
          targetSecurityGroupId,
          sourceComponent: source,
          targetComponent: target,
          bindingId: `${source}-${target}-${capability}`
        });
      }
    }
    
    // Phase 1.5: Track current binding IDs and handle rule removal
    const currentBindingIds = new Set<string>();
    const crossStackBindingIds = new Set<string>();
    const effectiveServiceName = serviceName || 
                                stack.stackName.split('-')[0] || 
                                'default-service';
    
    // Phase 2: Group rules by target security group ID
    const ruleGroups = this.groupRulesByTargetSecurityGroup(allRules);
    
    // Phase 3: Apply rules to security groups via CDK constructs
    let rulesApplied = 0;
    let crossStackRules = 0;
    let securityGroupsAffected = 0;
    
    for (const group of ruleGroups) {
      // Check if target security group is in the same stack
      // For now, we'll apply all rules to the current stack
      // Cross-stack handling will be added in SG-003
      const isCrossStack = this.isCrossStackRule(group, components);
      
      if (isCrossStack) {
        crossStackRules += group.rules.length;
        
        // Store cross-stack rules in SSM Parameter Store for network-rules stack
        for (const rule of group.rules) {
          // Track this binding ID for removal detection
          currentBindingIds.add(rule.bindingId);
          crossStackBindingIds.add(rule.bindingId);
          
          const ruleSpec: CrossStackRuleSpec = {
            ruleId: this.generateRuleId(rule),
            targetSecurityGroupId: group.targetSecurityGroupId,
            rule: {
              type: rule.type,
              peer: rule.peer,
              port: rule.port,
              description: rule.description
            },
            sourceComponent: rule.sourceComponent,
            targetComponent: rule.targetComponent,
            bindingId: rule.bindingId,
            timestamp: new Date().toISOString(),
            vpcId: group.vpcId
          };
          
          CrossStackRuleManager.storeRuleSpec(stack, effectiveServiceName, ruleSpec);
        }
        
        continue;
      }
      
      // Track same-stack binding IDs (for completeness, though same-stack rules are auto-removed by CDK)
      for (const rule of group.rules) {
        currentBindingIds.add(rule.bindingId);
      }
      
      // Apply rules to security group in current stack
      securityGroupsAffected++; // Only count same-stack security groups
      for (const rule of group.rules) {
        try {
          this.applyRuleToSecurityGroup(rule, group.targetSecurityGroupId, stack);
          rulesApplied++;
        } catch (error) {
          console.error(
            `[SG-PostProcessor] Failed to apply rule to SG ${group.targetSecurityGroupId}: ` +
            `${error instanceof Error ? error.message : 'Unknown error'}`
          );
          throw error;
        }
      }
    }
    
    // Phase 4: Handle rule removal for deleted bindings
    let rulesRemoved = 0;
    if (previousBindingIds && previousBindingIds.length > 0) {
      const previousBindingSet = new Set(previousBindingIds);
      
      // Find bindings that existed before but not now (deleted bindings)
      for (const previousBindingId of previousBindingSet) {
        if (!currentBindingIds.has(previousBindingId)) {
          // This binding was removed - delete its cross-stack rules
          // Note: We mark all removed bindings for deletion since we can't determine
          // if they were cross-stack without additional state. This is idempotent -
          // if the SSM parameter doesn't exist, the deletion will be a no-op.
          // Same-stack rules are automatically removed by CDK when constructs
          // are not in the template, so we only need to handle cross-stack rules here.
          CrossStackRuleManager.markRuleForDeletion(
            stack,
            effectiveServiceName,
            previousBindingId
          );
          rulesRemoved++;
        }
      }
    }
    
    return {
      rulesApplied,
      securityGroupsAffected,
      crossStackRules,
      rulesRemoved
    };
  }
  
  /**
   * Group rules by target security group ID
   * 
   * @param rules - Array of tracked security group rules
   * @returns Array of rule groups
   */
  private static groupRulesByTargetSecurityGroup(
    rules: TrackedSecurityGroupRule[]
  ): SecurityGroupRuleGroup[] {
    const groupsMap = new Map<string, SecurityGroupRuleGroup>();
    
    for (const rule of rules) {
      const targetId = rule.targetSecurityGroupId;
      
      if (!groupsMap.has(targetId)) {
        groupsMap.set(targetId, {
          targetSecurityGroupId: targetId,
          rules: []
        });
      }
      
      const group = groupsMap.get(targetId)!;
      group.rules.push(rule);
    }
    
    return Array.from(groupsMap.values());
  }
  
  /**
   * Check if a rule group is cross-stack
   * 
   * For now, we consider a rule cross-stack if the target security group
   * is not found in the current stack's components.
   * 
   * @param group - Rule group
   * @param components - Array of components in current stack
   * @returns True if rule is cross-stack
   */
  private static isCrossStackRule(
    group: SecurityGroupRuleGroup,
    components: any[]
  ): boolean {
    // If we weren't given any components, fall back to a conservative heuristic:
    // - If the target SG id looks like a CloudFormation token, assume SAME-STACK
    // - If it's a literal "sg-..." id, assume CROSS-STACK (since it's not resolvable in this stack)
    if (!components || components.length === 0) {
      const targetId = String(group.targetSecurityGroupId);
      const looksLikeToken =
        targetId.includes('${Token[') ||
        targetId.includes('${AWS::') ||
        targetId.includes('Fn::') ||
        targetId.includes('Ref');

      if (looksLikeToken) {
        return false;
      }

      if (/^sg-[0-9A-Za-z-]+$/.test(targetId)) {
        return true;
      }

      // Default safe behavior: treat unknown formats as cross-stack.
      return true;
    }

    // Check if target security group exists in any component's capabilities
    for (const component of components) {
      const capabilities = component.getCapabilities?.() || {};
      
      // Check various security group capability formats
      for (const [capabilityKey, capabilityData] of Object.entries(capabilities)) {
        if (capabilityKey.includes('security-group') || capabilityKey.includes('security:security-group')) {
          const data = capabilityData as any;
          const sgId = data.securityGroupId || data.sgId || data.id;
          
          if (sgId === group.targetSecurityGroupId) {
            return false; // Found in current stack
          }
        }
      }
    }
    
    // Not found in current stack - consider it cross-stack
    return true;
  }
  
  /**
   * Apply a security group rule to a security group via CDK construct
   * 
   * @param rule - Security group rule
   * @param targetSecurityGroupId - Target security group ID
   * @param stack - CDK stack
   */
  private static applyRuleToSecurityGroup(
    rule: TrackedSecurityGroupRule,
    targetSecurityGroupId: string,
    stack: cdk.Stack
  ): void {
    // Create unique ID for the rule construct
    // Include bindingId in hash to ensure uniqueness per binding, not just per rule content
    // This prevents collisions when the same rule is applied by different bindings
    const ruleHash = this.hashRule(rule);
    const bindingHash = this.simpleHash(rule.bindingId);
    const constructId = `SGRule-${ruleHash.substring(0, 8)}-${bindingHash.substring(0, 4)}`;
    
    // Prepare peer configuration
    let peerConfig: any;
    if (rule.peer.kind === 'sg') {
      peerConfig = {
        sourceSecurityGroupId: rule.peer.id
      };
    } else if (rule.peer.kind === 'cidr') {
      peerConfig = {
        cidrIp: rule.peer.cidr
      };
    } else {
      throw new Error(`Unknown peer kind: ${(rule.peer as any).kind}`);
    }
    
    // Create CDK construct based on rule type
    if (rule.type === 'ingress') {
      new CfnSecurityGroupIngress(stack, constructId, {
        groupId: targetSecurityGroupId,
        ipProtocol: rule.port.protocol,
        fromPort: rule.port.from,
        toPort: rule.port.to,
        description: rule.description,
        ...peerConfig
      });
    } else if (rule.type === 'egress') {
      new CfnSecurityGroupEgress(stack, constructId, {
        groupId: targetSecurityGroupId,
        ipProtocol: rule.port.protocol,
        fromPort: rule.port.from,
        toPort: rule.port.to,
        description: rule.description,
        ...peerConfig
      });
    } else {
      throw new Error(`Unknown rule type: ${rule.type}`);
    }
  }
  
  /**
   * Generate a hash for a rule to ensure idempotency
   * 
   * @param rule - Security group rule
   * @returns Hash string
   */
  private static hashRule(rule: TrackedSecurityGroupRule): string {
    // Simple hash based on rule content
    const content = JSON.stringify({
      type: rule.type,
      peer: rule.peer,
      port: rule.port,
      target: rule.targetSecurityGroupId
    });
    
    return this.simpleHash(content);
  }

  /**
   * Simple hash function (for idempotency, not cryptographic security)
   * 
   * @param input - String to hash
   * @returns Hash string
   */
  private static simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  /**
   * Generate a unique rule ID
   * 
   * @param rule - Tracked security group rule
   * @returns Unique rule ID
   */
  private static generateRuleId(rule: TrackedSecurityGroupRule): string {
    const hash = this.hashRule(rule);
    return `${rule.sourceComponent}-${rule.targetComponent}-${hash.substring(0, 8)}`;
  }
}

