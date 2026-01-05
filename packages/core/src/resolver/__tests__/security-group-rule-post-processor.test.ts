/**
 * Security Group Rule Post-Processor Tests
 * 
 * Tests for security group rule post-processing following Platform Testing Standard v1.0
 */

import { SecurityGroupRulePostProcessor } from '../security-group-rule-post-processor.js';
import type { EnhancedBindingResult } from '../../platform/contracts/platform-binding-trigger-spec.js';
import { App, Stack } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

describe('SecurityGroupRulePostProcessor', () => {
  describe('SGPostProcessor__CollectRules__GroupsByTargetSG', () => {
    const metadata = {
      id: 'TP-sg-postprocessor-001',
      level: 'unit' as const,
      capability: 'Collects and groups security group rules by target SG',
      oracle: 'exact' as const,
      invariants: [
        'Rules collected from binding results',
        'Rules grouped by target security group ID',
        'Rules with same target SG are in same group'
      ],
      fixtures: ['SecurityGroupRulePostProcessor', 'BindingResults'],
      inputs: {
        shape: 'Array of binding results with securityGroupRules',
        notes: 'Tests rule collection and grouping'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/tickets/security-groups/SG-006-binding-result-post-processor.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SGPostProcessor__CollectRules__GroupsByTargetSG', () => {
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      const bindings = [
        {
          source: 'service-a',
          target: 'service-b',
          capability: 'security-group:rule',
          result: {
            environmentVariables: {
              'SECURITY_GROUP_RULE_TARGET_SG_ID': 'sg-target123'
            },
            iamPolicies: [],
            securityGroupRules: [
              {
                type: 'ingress' as const,
                peer: { kind: 'sg' as const, id: 'sg-source123' },
                port: { from: 443, to: 443, protocol: 'tcp' as const },
                description: 'Allow HTTPS from source'
              }
            ],
            compliance: {
              status: 'compliant' as const,
              framework: 'commercial',
              actionsTaken: []
            }
          } as EnhancedBindingResult
        },
        {
          source: 'service-c',
          target: 'service-b',
          capability: 'security-group:rule',
          result: {
            environmentVariables: {
              'SECURITY_GROUP_RULE_TARGET_SG_ID': 'sg-target123' // Same target
            },
            iamPolicies: [],
            securityGroupRules: [
              {
                type: 'ingress' as const,
                peer: { kind: 'sg' as const, id: 'sg-source456' },
                port: { from: 80, to: 80, protocol: 'tcp' as const },
                description: 'Allow HTTP from service-c'
              }
            ],
            compliance: {
              status: 'compliant' as const,
              framework: 'commercial',
              actionsTaken: []
            }
          } as EnhancedBindingResult
        }
      ];

      // Create a mock component with the target security group capability
      // This allows the processor to find the security group in the current stack
      const mockComponent = {
        getCapabilities: () => ({
          'security-group:rule': {
            securityGroupId: 'sg-target123'
          }
        })
      };

      const result = SecurityGroupRulePostProcessor.process(bindings, stack, [mockComponent]);

      expect(result.rulesApplied).toBe(2);
      expect(result.securityGroupsAffected).toBe(1); // Both rules target same SG
      expect(result.rulesRemoved).toBe(0); // No previous bindings
    });
  });

  describe('SGPostProcessor__ApplyRules__CreatesCDKConstructs', () => {
    const metadata = {
      id: 'TP-sg-postprocessor-002',
      level: 'unit' as const,
      capability: 'Creates CDK constructs for security group rules',
      oracle: 'exact' as const,
      invariants: [
        'CfnSecurityGroupIngress created for ingress rules',
        'CfnSecurityGroupEgress created for egress rules',
        'Constructs added to stack'
      ],
      fixtures: ['SecurityGroupRulePostProcessor', 'CDK Stack'],
      inputs: {
        shape: 'Binding results with securityGroupRules',
        notes: 'Tests CDK construct creation'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/tickets/security-groups/SG-006-binding-result-post-processor.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SGPostProcessor__ApplyRules__CreatesCDKConstructs', () => {
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      const bindings = [
        {
          source: 'service-a',
          target: 'service-b',
          capability: 'security-group:rule',
          result: {
            environmentVariables: {
              'SECURITY_GROUP_RULE_TARGET_SG_ID': 'sg-target123'
            },
            iamPolicies: [],
            securityGroupRules: [
              {
                type: 'ingress' as const,
                peer: { kind: 'sg' as const, id: 'sg-source123' },
                port: { from: 443, to: 443, protocol: 'tcp' as const },
                description: 'Allow HTTPS'
              },
              {
                type: 'egress' as const,
                peer: { kind: 'cidr' as const, cidr: '0.0.0.0/0' },
                port: { from: 443, to: 443, protocol: 'tcp' as const },
                description: 'Allow HTTPS outbound'
              }
            ],
            compliance: {
              status: 'compliant' as const,
              framework: 'commercial',
              actionsTaken: []
            }
          } as EnhancedBindingResult
        }
      ];

      // Create a mock component with the target security group capability
      // This allows the processor to find the security group in the current stack
      const mockComponent = {
        getCapabilities: () => ({
          'security-group:rule': {
            securityGroupId: 'sg-target123'
          }
        })
      };

      const result = SecurityGroupRulePostProcessor.process(bindings, stack, [mockComponent]);

      expect(result.rulesApplied).toBe(2);
      expect(result.rulesRemoved).toBe(0); // No previous bindings
      
      // Verify constructs were created (check stack for constructs)
      const constructs = stack.node.children.filter(
        child => child.node.id.startsWith('SGRule-')
      );
      expect(constructs.length).toBeGreaterThan(0);
    });
  });

  describe('SGPostProcessor__MissingTargetSG__SkipsRule', () => {
    const metadata = {
      id: 'TP-sg-postprocessor-003',
      level: 'unit' as const,
      capability: 'Skips rules with missing target security group ID',
      oracle: 'exact' as const,
      invariants: [
        'Rules without SECURITY_GROUP_RULE_TARGET_SG_ID are skipped',
        'Warning logged for skipped rules',
        'Other rules still processed'
      ],
      fixtures: ['SecurityGroupRulePostProcessor'],
      inputs: {
        shape: 'Binding results with missing target SG ID',
        notes: 'Tests graceful handling of missing metadata'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/tickets/security-groups/SG-006-binding-result-post-processor.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SGPostProcessor__MissingTargetSG__SkipsRule', () => {
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      const bindings = [
        {
          source: 'service-a',
          target: 'service-b',
          capability: 'security-group:rule',
          result: {
            environmentVariables: {
              // Missing SECURITY_GROUP_RULE_TARGET_SG_ID
            },
            iamPolicies: [],
            securityGroupRules: [
              {
                type: 'ingress' as const,
                peer: { kind: 'sg' as const, id: 'sg-source123' },
                port: { from: 443, to: 443, protocol: 'tcp' as const },
                description: 'Allow HTTPS'
              }
            ],
            compliance: {
              status: 'compliant' as const,
              framework: 'commercial',
              actionsTaken: []
            }
          } as EnhancedBindingResult
        }
      ];

      const result = SecurityGroupRulePostProcessor.process(bindings, stack, []);

      expect(result.rulesApplied).toBe(0);
      expect(result.securityGroupsAffected).toBe(0);
      expect(result.rulesRemoved).toBe(0);
    });
  });

  describe('SGPostProcessor__NonSGRuleCapability__Skipped', () => {
    const metadata = {
      id: 'TP-sg-postprocessor-004',
      level: 'unit' as const,
      capability: 'Skips bindings that are not security-group:rule',
      oracle: 'exact' as const,
      invariants: [
        'Only security-group:rule bindings are processed',
        'Other capabilities are ignored',
        'No errors thrown for non-SG bindings'
      ],
      fixtures: ['SecurityGroupRulePostProcessor'],
      inputs: {
        shape: 'Binding results with mixed capabilities',
        notes: 'Tests capability filtering'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/tickets/security-groups/SG-006-binding-result-post-processor.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SGPostProcessor__NonSGRuleCapability__Skipped', () => {
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      const bindings = [
        {
          source: 'service-a',
          target: 'service-b',
          capability: 's3:bucket', // Not security-group:rule
          result: {
            environmentVariables: {},
            iamPolicies: [],
            securityGroupRules: [],
            compliance: {
              status: 'compliant' as const,
              framework: 'commercial',
              actionsTaken: []
            }
          } as EnhancedBindingResult
        }
      ];

      const result = SecurityGroupRulePostProcessor.process(bindings, stack, []);

      expect(result.rulesApplied).toBe(0);
      expect(result.securityGroupsAffected).toBe(0);
      expect(result.rulesRemoved).toBe(0);
    });
  });

  describe('SGPostProcessor__RemovedBindings__MarksForDeletion', () => {
    const metadata = {
      id: 'TP-sg-postprocessor-005',
      level: 'unit' as const,
      capability: 'Marks cross-stack rules for deletion when bindings are removed',
      oracle: 'exact' as const,
      invariants: [
        'Removed bindings trigger rule deletion',
        'Cross-stack rules are marked for deletion via Custom Resource',
        'Same-stack rules are handled automatically by CDK',
        'No errors when previous bindings list is empty'
      ],
      fixtures: ['SecurityGroupRulePostProcessor', 'CrossStackRuleManager'],
      inputs: {
        shape: 'Current bindings and previous binding IDs',
        notes: 'Tests rule removal when bindings are deleted'
      },
      risks: ['Custom Resource creation complexity'],
      dependencies: ['CrossStackRuleManager.markRuleForDeletion'],
      evidence: ['Custom Resource constructs in stack'],
      compliance_refs: ['docs/tickets/security-groups/SG-006-binding-result-post-processor.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SGPostProcessor__RemovedBindings__MarksForDeletion', () => {
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      // Current bindings (one binding)
      const bindings = [
        {
          source: 'service-a',
          target: 'service-b',
          capability: 'security-group:rule',
          result: {
            environmentVariables: {
              'SECURITY_GROUP_RULE_TARGET_SG_ID': 'sg-target123'
            },
            iamPolicies: [],
            securityGroupRules: [
              {
                type: 'ingress' as const,
                peer: { kind: 'sg' as const, id: 'sg-source123' },
                port: { from: 443, to: 443, protocol: 'tcp' as const },
                description: 'Allow HTTPS from source'
              }
            ],
            compliance: {
              status: 'compliant' as const,
              framework: 'commercial',
              actionsTaken: []
            }
          } as EnhancedBindingResult
        }
      ];

      // Previous bindings (two bindings - one was removed)
      const previousBindingIds = [
        'service-a-service-b-security-group:rule', // Current binding (still exists)
        'service-c-service-b-security-group:rule'  // Removed binding
      ];

      const mockComponent = {
        getCapabilities: () => ({
          'security-group:rule': {
            securityGroupId: 'sg-target123'
          }
        })
      };

      const result = SecurityGroupRulePostProcessor.process(
        bindings,
        stack,
        [mockComponent],
        'test-service',
        previousBindingIds
      );

      expect(result.rulesApplied).toBe(1);
      expect(result.rulesRemoved).toBe(1); // One binding was removed

      // Verify Custom Resource was created for deletion
      // The bindingId 'service-c-service-b-security-group:rule' gets sanitized to 'service-c-service-b-security-group-rule'
      const customResources = stack.node.findAll().filter(
        construct => construct.node.id.startsWith('DeleteCrossStackRule-service-c-service-b-security-group-rule')
      );
      // Should have exactly 1 Custom Resource for deletion (Provider may create nested constructs, but our CR should be unique)
      expect(customResources.length).toBeGreaterThanOrEqual(1);
      
      // Verify the main Custom Resource exists (not just nested Provider constructs)
      const mainCustomResource = customResources.find(
        construct => construct.node.id === 'DeleteCrossStackRule-service-c-service-b-security-group-rule'
      );
      expect(mainCustomResource).toBeDefined();
    });
  });

  describe('SGPostProcessor__NoPreviousBindings__NoRemovals', () => {
    const metadata = {
      id: 'TP-sg-postprocessor-006',
      level: 'unit' as const,
      capability: 'Handles case when no previous bindings exist',
      oracle: 'exact' as const,
      invariants: [
        'No errors when previousBindingIds is undefined',
        'No errors when previousBindingIds is empty array',
        'rulesRemoved is 0 when no previous bindings'
      ],
      fixtures: ['SecurityGroupRulePostProcessor'],
      inputs: {
        shape: 'Current bindings without previous binding IDs',
        notes: 'Tests graceful handling of missing previous state'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/tickets/security-groups/SG-006-binding-result-post-processor.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SGPostProcessor__NoPreviousBindings__NoRemovals', () => {
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      const bindings = [
        {
          source: 'service-a',
          target: 'service-b',
          capability: 'security-group:rule',
          result: {
            environmentVariables: {
              'SECURITY_GROUP_RULE_TARGET_SG_ID': 'sg-target123'
            },
            iamPolicies: [],
            securityGroupRules: [
              {
                type: 'ingress' as const,
                peer: { kind: 'sg' as const, id: 'sg-source123' },
                port: { from: 443, to: 443, protocol: 'tcp' as const },
                description: 'Allow HTTPS'
              }
            ],
            compliance: {
              status: 'compliant' as const,
              framework: 'commercial',
              actionsTaken: []
            }
          } as EnhancedBindingResult
        }
      ];

      const mockComponent = {
        getCapabilities: () => ({
          'security-group:rule': {
            securityGroupId: 'sg-target123'
          }
        })
      };

      // Test with undefined previousBindingIds
      const result1 = SecurityGroupRulePostProcessor.process(
        bindings,
        stack,
        [mockComponent]
      );
      expect(result1.rulesRemoved).toBe(0);

      // Test with empty array - use a new stack to avoid construct ID conflicts
      const stack2 = new Stack(app, 'TestStack2');
      const result2 = SecurityGroupRulePostProcessor.process(
        bindings,
        stack2,
        [mockComponent],
        'test-service',
        []
      );
      expect(result2.rulesRemoved).toBe(0);
    });
  });
});

