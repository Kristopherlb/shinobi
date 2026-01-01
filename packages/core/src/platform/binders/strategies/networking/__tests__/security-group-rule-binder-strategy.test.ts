/**
 * Unit Tests: Security Group Rule Binder Strategy (Unified)
 * Tests for security group rule generation with compliance enforcement
 */

import { SecurityGroupRuleBinderStrategy } from '../security-group-rule-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';

describe('SecurityGroupRuleBinderStrategy', () => {
  describe('SecurityGroupRuleBind__ValidRuleWithExplicitRules__ReturnsSecurityGroupRules', () => {
    const metadata = {
      id: 'TP-binders-security-group-rule-001',
      level: 'unit' as const,
      capability: 'Returns security group rules when rules are explicitly provided in directive.options.rules',
      oracle: 'exact' as const,
      invariants: [
        'Returns EnhancedBindingResult with compliance block',
        'securityGroupRules array contains the specified rules',
        'Environment variables include target security group ID',
        'IAM policies array is empty (rules are network-level)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security-group:rule capability and explicit rules in directive.options',
        notes: 'Basic security group rule generation with explicit rule specifications'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityGroupRuleBind__ValidRuleWithExplicitRules__ReturnsSecurityGroupRules', async () => {
      const strategy = new SecurityGroupRuleBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('security-group-rule', {
        'security-group:rule': {
          type: 'security-group:rule',
          targetSecurityGroupId: 'sg-target123456',
          vpcId: 'vpc-12345678'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security-group:rule',
        access: 'read',
        options: {
          rules: [
            {
              ruleType: 'ingress',
              peer: { kind: 'sg', id: 'sg-source123456' },
              port: { from: 443, to: 443, protocol: 'tcp' },
              description: 'Allow HTTPS from source security group'
            }
          ]
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Security group rules are generated
      expect(result.securityGroupRules.length).toBe(1);
      expect(result.securityGroupRules[0].type).toBe('ingress');
      expect(result.securityGroupRules[0].peer).toEqual({ kind: 'sg', id: 'sg-source123456' });
      expect(result.securityGroupRules[0].port).toEqual({ from: 443, to: 443, protocol: 'tcp' });
      expect(result.securityGroupRules[0].description).toBe('Allow HTTPS from source security group');
      expect(result.environmentVariables['SECURITY_GROUP_RULE_TARGET_SG_ID']).toBe('sg-target123456');
      expect(result.environmentVariables['SECURITY_GROUP_RULE_VPC_ID']).toBe('vpc-12345678');
      expect(result.environmentVariables['SECURITY_GROUP_RULE_COUNT']).toBe('1');
      expect(result.iamPolicies).toEqual([]);
    });
  });

  describe('SecurityGroupRuleBind__MultipleRules__ReturnsAllRules', () => {
    const metadata = {
      id: 'TP-binders-security-group-rule-002',
      level: 'unit' as const,
      capability: 'Returns multiple security group rules when multiple rules are specified',
      oracle: 'exact' as const,
        feature: 'SecurityGroupRuleBind',
        condition: 'MultipleRules',
        outcome: 'ReturnsAllRules'
      },
      invariants: [
        'All specified rules are included in securityGroupRules array',
        'Rule count matches the number of rules provided',
        'Each rule has correct type, peer, port, and description'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security-group:rule capability and multiple rules in directive.options.rules',
        notes: 'Multiple ingress and egress rules'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityGroupRuleBind__MultipleRules__ReturnsAllRules', async () => {
      const strategy = new SecurityGroupRuleBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('security-group-rule', {
        'security-group:rule': {
          type: 'security-group:rule',
          targetSecurityGroupId: 'sg-target123456'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security-group:rule',
        access: 'read',
        options: {
          rules: [
            {
              ruleType: 'ingress',
              peer: { kind: 'sg', id: 'sg-source123456' },
              port: { from: 443, to: 443, protocol: 'tcp' },
              description: 'HTTPS ingress'
            },
            {
              ruleType: 'egress',
              peer: { kind: 'cidr', cidr: '0.0.0.0/0' },
              port: { from: 443, to: 443, protocol: 'tcp' },
              description: 'HTTPS egress'
            }
          ]
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Multiple rules are generated
      expect(result.securityGroupRules.length).toBe(2);
      expect(result.securityGroupRules[0].type).toBe('ingress');
      expect(result.securityGroupRules[1].type).toBe('egress');
      expect(result.securityGroupRules[1].peer).toEqual({ kind: 'cidr', cidr: '0.0.0.0/0' });
      expect(result.environmentVariables['SECURITY_GROUP_RULE_COUNT']).toBe('2');
    });
  });

  describe('SecurityGroupRuleBind__ShorthandRuleSpecification__ReturnsRule', () => {
    const metadata = {
      id: 'TP-binders-security-group-rule-003',
      level: 'unit' as const,
      capability: 'Returns security group rule when using shorthand directive.options format',
      oracle: 'exact' as const,
        feature: 'SecurityGroupRuleBind',
        condition: 'ShorthandRuleSpecification',
        outcome: 'ReturnsRule'
      },
      invariants: [
        'Single rule is generated from shorthand options',
        'Peer is correctly parsed (string SG ID converted to object)',
        'Port number is converted to port range object',
        'Default protocol is tcp'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security-group:rule capability and shorthand peer/port in directive.options',
        notes: 'Shorthand format: directive.options.peer and directive.options.port'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityGroupRuleBind__ShorthandRuleSpecification__ReturnsRule', async () => {
      const strategy = new SecurityGroupRuleBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('security-group-rule', {
        'security-group:rule': {
          type: 'security-group:rule',
          targetSecurityGroupId: 'sg-target123456'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security-group:rule',
        access: 'read',
        options: {
          peer: 'sg-source123456', // String shorthand
          port: 8080, // Number shorthand
          ruleType: 'ingress',
          protocol: 'tcp',
          description: 'Allow HTTP from source'
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Rule is generated from shorthand
      expect(result.securityGroupRules.length).toBe(1);
      expect(result.securityGroupRules[0].peer).toEqual({ kind: 'sg', id: 'sg-source123456' });
      expect(result.securityGroupRules[0].port).toEqual({ from: 8080, to: 8080, protocol: 'tcp' });
      expect(result.securityGroupRules[0].description).toBe('Allow HTTP from source');
    });
  });

  describe('SecurityGroupRuleBind__InferredFromSourceCapabilities__ReturnsIngressRule', () => {
    const metadata = {
      id: 'TP-binders-security-group-rule-004',
      level: 'unit' as const,
      capability: 'Returns ingress rule when source component exposes security group capability',
      oracle: 'exact' as const,
        feature: 'SecurityGroupRuleBind',
        condition: 'InferredFromSourceCapabilities',
        outcome: 'ReturnsIngressRule'
      },
      invariants: [
        'Rule is inferred from source component security group capability',
        'Default rule type is ingress',
        'Default port is 443 (or directive.options.defaultPort)',
        'Description includes source component name'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security-group:rule capability and source component with security group capability',
        notes: 'Rule inference from source capabilities'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityGroupRuleBind__InferredFromSourceCapabilities__ReturnsIngressRule', async () => {
      const strategy = new SecurityGroupRuleBinderStrategy();
      
      // Create source component with security group capability via options
      const source = createMockSourceComponent('lambda-api', 'test-function');
      const sourceWithCapabilities = {
        ...source,
        getCapabilities: () => ({
          'security:security-group': {
            securityGroupId: 'sg-source789012'
          }
        })
      };

      const target = createMockTargetComponent('security-group-rule', {
        'security-group:rule': {
          type: 'security-group:rule',
          targetSecurityGroupId: 'sg-target123456'
        }
      });

      const context = createBindingContext({
        source: sourceWithCapabilities,
        target,
        capability: 'security-group:rule',
        access: 'read',
        options: {
          defaultPort: 3306,
          protocol: 'tcp'
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Rule is inferred from source capabilities
      expect(result.securityGroupRules.length).toBe(1);
      expect(result.securityGroupRules[0].type).toBe('ingress');
      expect(result.securityGroupRules[0].peer).toEqual({ kind: 'sg', id: 'sg-source789012' });
      expect(result.securityGroupRules[0].port.from).toBe(3306);
      expect(result.securityGroupRules[0].port.to).toBe(3306);
      expect(result.securityGroupRules[0].port.protocol).toBe('tcp');
      expect(result.securityGroupRules[0].description).toContain('test-function');
      expect(result.securityGroupRules[0].description).toContain('inferred');
    });
  });

  describe('SecurityGroupRuleBind__MissingTargetSecurityGroupId__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-security-group-rule-005',
      level: 'unit' as const,
      capability: 'Throws actionable error when targetSecurityGroupId is missing',
      oracle: 'exact' as const,
        feature: 'SecurityGroupRuleBind',
        condition: 'MissingTargetSecurityGroupId',
        outcome: 'ThrowsError'
      },
      invariants: [
        'Error message indicates missing targetSecurityGroupId',
        'Error is thrown before rule generation'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security-group:rule capability but missing targetSecurityGroupId',
        notes: 'Negative test case for missing required field'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityGroupRuleBind__MissingTargetSecurityGroupId__ThrowsError', async () => {
      const strategy = new SecurityGroupRuleBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('security-group-rule', {
        'security-group:rule': {
          type: 'security-group:rule'
          // Missing targetSecurityGroupId
        } as any
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security-group:rule',
        access: 'read'
      });

      // Primary assertion: Error is thrown
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(/targetSecurityGroupId/);
    });
  });

  describe('SecurityGroupRuleBind__MissingRulesSpecification__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-security-group-rule-006',
      level: 'unit' as const,
      capability: 'Throws actionable error when no rules can be generated (missing rules, peer, and source capabilities)',
      oracle: 'exact' as const,
        feature: 'SecurityGroupRuleBind',
        condition: 'MissingRulesSpecification',
        outcome: 'ThrowsError'
      },
      invariants: [
        'Error message indicates missing rules specification',
        'Error provides guidance on how to specify rules'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security-group:rule capability but no rules specification',
        notes: 'Negative test case for missing rules'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityGroupRuleBind__MissingRulesSpecification__ThrowsError', async () => {
      const strategy = new SecurityGroupRuleBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('security-group-rule', {
        'security-group:rule': {
          type: 'security-group:rule',
          targetSecurityGroupId: 'sg-target123456'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security-group:rule',
        access: 'read'
        // No options.rules, options.peer, or source capabilities
      });

      // Primary assertion: Error is thrown
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(/rules specification/);
    });
  });

  describe('SecurityGroupRuleBind__CidrPeer__ReturnsRuleWithCidrPeer', () => {
    const metadata = {
      id: 'TP-binders-security-group-rule-007',
      level: 'unit' as const,
      capability: 'Returns security group rule with CIDR peer when CIDR is specified',
      oracle: 'exact' as const,
        feature: 'SecurityGroupRuleBind',
        condition: 'CidrPeer',
        outcome: 'ReturnsRuleWithCidrPeer'
      },
      invariants: [
        'Peer kind is cidr',
        'CIDR block is correctly specified',
        'Rule applies to all IPs in the CIDR range'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security-group:rule capability and CIDR peer',
        notes: 'CIDR-based peer (not security group)'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityGroupRuleBind__CidrPeer__ReturnsRuleWithCidrPeer', async () => {
      const strategy = new SecurityGroupRuleBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('security-group-rule', {
        'security-group:rule': {
          type: 'security-group:rule',
          targetSecurityGroupId: 'sg-target123456'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security-group:rule',
        access: 'read',
        options: {
          rules: [
            {
              ruleType: 'ingress',
              peer: { kind: 'cidr', cidr: '10.0.0.0/16' },
              port: { from: 80, to: 80, protocol: 'tcp' },
              description: 'Allow HTTP from VPC CIDR'
            }
          ]
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: CIDR peer is handled correctly
      expect(result.securityGroupRules.length).toBe(1);
      expect(result.securityGroupRules[0].peer).toEqual({ kind: 'cidr', cidr: '10.0.0.0/16' });
    });
  });

  describe('SecurityGroupRuleBind__NetworkAliasCapability__HandlesAlias', () => {
    const metadata = {
      id: 'TP-binders-security-group-rule-008',
      level: 'unit' as const,
      capability: 'Handles network:security-group-rule alias capability correctly',
      oracle: 'exact' as const,
        feature: 'SecurityGroupRuleBind',
        condition: 'NetworkAliasCapability',
        outcome: 'HandlesAlias'
      },
      invariants: [
        'Alias capability is handled identically to security-group:rule',
        'Rules are generated correctly for alias capability'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with network:security-group-rule alias capability',
        notes: 'Alias capability handling'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityGroupRuleBind__NetworkAliasCapability__HandlesAlias', async () => {
      const strategy = new SecurityGroupRuleBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('security-group-rule', {
        'network:security-group-rule': {
          type: 'network:security-group-rule',
          targetSecurityGroupId: 'sg-target123456'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'network:security-group-rule',
        access: 'read',
        options: {
          rules: [
            {
              ruleType: 'ingress',
              peer: { kind: 'sg', id: 'sg-source123456' },
              port: { from: 443, to: 443, protocol: 'tcp' },
              description: 'HTTPS ingress'
            }
          ]
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Alias capability is handled
      expect(result.securityGroupRules.length).toBe(1);
      expect(result.environmentVariables['SECURITY_GROUP_RULE_TARGET_SG_ID']).toBe('sg-target123456');
    });
  });

  describe('SecurityGroupRuleBind__CommercialCompliance__ReturnsComplianceBlock', () => {
    const metadata = {
      id: 'TP-binders-security-group-rule-009',
      level: 'unit' as const,
      capability: 'Returns compliance block with commercial framework',
      oracle: 'exact' as const,
        feature: 'SecurityGroupRuleBind',
        condition: 'CommercialCompliance',
        outcome: 'ReturnsComplianceBlock'
      },
      invariants: [
        'Compliance block status is one of: compliant, non-compliant, partially-compliant',
        'Compliance framework is set correctly',
        'Compliance block is present and valid'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security-group:rule capability and commercial compliance framework',
        notes: 'Compliance evaluation for commercial framework'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityGroupRuleBind__CommercialCompliance__ReturnsComplianceBlock', async () => {
      const strategy = new SecurityGroupRuleBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('security-group-rule', {
        'security-group:rule': {
          type: 'security-group:rule',
          targetSecurityGroupId: 'sg-target123456'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security-group:rule',
        access: 'read',
        complianceFramework: 'commercial',
        options: {
          rules: [
            {
              ruleType: 'ingress',
              peer: { kind: 'sg', id: 'sg-source123456' },
              port: { from: 443, to: 443, protocol: 'tcp' },
              description: 'HTTPS ingress'
            }
          ]
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Compliance block is present and valid
      expect(result.compliance).toBeDefined();
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
      expect(result.compliance.framework).toBe('commercial');
    });
  });
});

