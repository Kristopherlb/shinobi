/**
 * Security Group Rule Binder Strategy (Unified)
 * Handles security group rule generation for ingress/egress rules with mandatory compliance enforcement
 * 
 * Design Philosophy:
 * This strategy generates SecurityGroupRule objects that can be applied to security groups.
 * It separates rule generation from security group ID exposure (which is handled by SecurityGroupBinderStrategy).
 * 
 * The strategy expects:
 * - Target capability data: targetSecurityGroupId (the SG to apply rules to)
 * - Directive options: rules array specifying peer, port, protocol, description
 * - Source component: may provide peer security group ID via capabilities
 * 
 * This enables:
 * - Explicit rule generation without requiring CDK construct access
 * - Cross-account/cross-region rule generation (rules are data structures)
 * - Compliance validation of rule configurations
 */

import { UnifiedBinderStrategyBase } from '../../../contracts/unified-binder-strategy-base.js';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '../../../contracts/platform-binding-trigger-spec.js';
import type { SecurityGroupRule } from '../../../contracts/bindings.js';

/**
 * Security Group Rule capability data structure
 * @property type - Capability type identifier
 * @property targetSecurityGroupId - Security group ID to apply rules to (required)
 * @property vpcId - VPC ID where the security group exists (optional, for metadata)
 */
interface SecurityGroupRuleCapabilityData {
  type: 'security-group:rule';
  targetSecurityGroupId: string;
  vpcId?: string;
}

/**
 * Rule specification from directive options
 * Matches SecurityGroupRule structure for clarity
 */
interface RuleSpecification {
  ruleType: 'ingress' | 'egress';
  peer: { kind: 'sg'; id: string } | { kind: 'cidr'; cidr: string };
  port: {
    from: number;
    to: number;
    protocol: 'tcp' | 'udp' | 'icmp';
  };
  description: string;
}

export class SecurityGroupRuleBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = [
    'security-group:rule',
    'network:security-group-rule'
  ];

  getStrategyName(): string {
    return 'Security Group Rule Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceTypes: ['*'],
        capability: 'security-group:rule',
        supportedAccess: ['read', 'write', 'readwrite'],
        notes: 'Generates security group ingress/egress rules. Rules specified in directive.options.rules'
      },
      {
        sourceTypes: ['*'],
        capability: 'network:security-group-rule',
        supportedAccess: ['read', 'write', 'readwrite'],
        notes: 'Alias for security-group:rule'
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for Security Group Rule binding');
    }
    if (!source) {
      throw new Error('Source component is required for Security Group Rule binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[directive.capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${directive.capability}'`);
    }

    // Validate capability data structure
    if (!this.isSecurityGroupRuleCapabilityData(targetCapabilityData)) {
      throw new Error(`Invalid Security Group Rule capability data structure for capability '${directive.capability}'. Expected targetSecurityGroupId.`);
    }

    const targetSecurityGroupId = targetCapabilityData.targetSecurityGroupId;
    if (!targetSecurityGroupId) {
      throw new Error(`Security Group Rule capability is missing targetSecurityGroupId for capability '${directive.capability}'`);
    }

    // Get rules from directive options
    const ruleSpecs = this.getRuleSpecifications(directive, source);

    // Generate SecurityGroupRule objects
    const securityGroupRules: SecurityGroupRule[] = ruleSpecs.map(spec => ({
      type: spec.ruleType,
      peer: spec.peer,
      port: spec.port,
      description: spec.description
    }));

    // Set environment variables for metadata
    const environmentVariables: Record<string, string> = {
      'SECURITY_GROUP_RULE_TARGET_SG_ID': targetSecurityGroupId
    };

    if (targetCapabilityData.vpcId) {
      environmentVariables['SECURITY_GROUP_RULE_VPC_ID'] = targetCapabilityData.vpcId;
    }

    if (securityGroupRules.length > 0) {
      environmentVariables['SECURITY_GROUP_RULE_COUNT'] = securityGroupRules.length.toString();
      environmentVariables['SECURITY_GROUP_RULES'] = JSON.stringify(securityGroupRules);
    }

    return {
      iamPolicies: [], // No IAM policies needed for rule generation (rules are network-level)
      environmentVariables,
      securityGroupRules
    };
  }

  /**
   * Extract rule specifications from directive options or infer from source/target context
   */
  private getRuleSpecifications(directive: any, source: any): RuleSpecification[] {
    // Option 1: Rules explicitly provided in directive.options.rules
    if (directive.options?.rules && Array.isArray(directive.options.rules)) {
      return directive.options.rules.map((rule: any) => ({
        ruleType: rule.ruleType || rule.type || 'ingress',
        peer: rule.peer,
        port: rule.port,
        description: rule.description || `Security group rule from ${source.getName()}`
      }));
    }

    // Option 2: Single rule specified in directive.options (shorthand)
    if (directive.options?.peer || directive.options?.port) {
      const peer = directive.options.peer;
      const port = directive.options.port;
      const ruleType = directive.options.ruleType || directive.options.type || 'ingress';
      const description = directive.options.description || `Security group rule from ${source.getName()}`;

      if (!peer) {
        throw new Error('Security Group Rule binding requires peer (sg ID or CIDR) in directive.options');
      }
      if (!port) {
        throw new Error('Security Group Rule binding requires port specification in directive.options');
      }

      return [{
        ruleType,
        peer: typeof peer === 'string' ? { kind: 'sg', id: peer } : peer,
        port: typeof port === 'number' 
          ? { from: port, to: port, protocol: directive.options.protocol || 'tcp' }
          : port,
        description
      }];
    }

    // Option 3: Try to infer from source component capabilities (peer SG ID from source)
    const sourceCapabilities = source.getCapabilities();
    const sourceSecurityGroupCapability = 
      sourceCapabilities['security:security-group'] || 
      sourceCapabilities['vpc:security-group'] ||
      sourceCapabilities['security-group:import'] ||
      sourceCapabilities['net:security-group'];

    if (sourceSecurityGroupCapability && typeof sourceSecurityGroupCapability === 'object') {
      const sourceSecurityGroupId = 
        (sourceSecurityGroupCapability as any).securityGroupId || 
        (sourceSecurityGroupCapability as any).sgId ||
        (sourceSecurityGroupCapability as any).id;

      if (sourceSecurityGroupId) {
        // Default rule: ingress from source SG on common ports
        const defaultPort = directive.options?.defaultPort || 443;
        return [{
          ruleType: 'ingress',
          peer: { kind: 'sg', id: sourceSecurityGroupId },
          port: {
            from: defaultPort,
            to: defaultPort,
            protocol: directive.options?.protocol || 'tcp'
          },
          description: `Allow traffic from ${source.getName()} (inferred from source capabilities)`
        }];
      }
    }

    // No rules can be generated
    throw new Error(
      'Security Group Rule binding requires rules specification. ' +
      'Provide directive.options.rules array, or directive.options with peer/port, ' +
      'or ensure source component exposes security group capability.'
    );
  }

  /**
   * Type guard for Security Group Rule capability data
   */
  private isSecurityGroupRuleCapabilityData(data: unknown): data is SecurityGroupRuleCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      (d.type === 'security-group:rule' || d.type === 'network:security-group-rule') &&
      typeof d.targetSecurityGroupId === 'string'
    );
  }
}

