/**
 * Cross-Stack Rule Manager Tests
 * 
 * Tests for cross-stack security group rule management following Platform Testing Standard v1.0
 */

import { CrossStackRuleManager, type CrossStackRuleSpec } from '../cross-stack-rule-manager.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

describe('CrossStackRuleManager', () => {
  describe('CreateNetworkRulesStack__EmptyArray__CreatesEmptyStack', () => {
    const metadata = {
      id: 'TP-cross-stack-manager-001',
      level: 'unit' as const,
      capability: 'Creates empty network-rules stack when no rules provided',
      oracle: 'exact' as const,
      invariants: [
        'Stack is created successfully',
        'No security group rules are created',
        'Stack has correct tags and description'
      ],
      fixtures: ['CDK App', 'CrossStackRuleManager'],
      inputs: {
        shape: 'Empty array of rule specifications',
        notes: 'Tests graceful handling of empty rule set (simulates all rules deleted)'
      },
      risks: [],
      dependencies: [],
      evidence: ['CDK Template assertions'],
      compliance_refs: ['docs/tickets/security-groups/SG-003-cross-stack-security-group-dependencies.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CreateNetworkRulesStack__EmptyArray__CreatesEmptyStack', () => {
      const app = new App();
      const stack = CrossStackRuleManager.createNetworkRulesStack(app, [], 'TestNetworkRulesStack');

      const template = Template.fromStack(stack);

      // Verify stack exists with correct description
      expect(stack.stackName).toBe('TestNetworkRulesStack');
      
      // Verify no security group rules are created (empty array = all rules removed)
      template.resourceCountIs('AWS::EC2::SecurityGroupIngress', 0);
      template.resourceCountIs('AWS::EC2::SecurityGroupEgress', 0);

      // Verify stack tags
      const stackTags = stack.tags.tagValues();
      expect(stackTags.ManagedBy).toBe('shinobi');
      expect(stackTags.Purpose).toBe('cross-stack-security-group-rules');
    });
  });

  describe('CreateNetworkRulesStack__WithRules__CreatesRuleConstructs', () => {
    const metadata = {
      id: 'TP-cross-stack-manager-002',
      level: 'unit' as const,
      capability: 'Creates security group rule constructs from rule specifications',
      oracle: 'exact' as const,
      invariants: [
        'Rules are grouped by target security group',
        'Rules are deduplicated',
        'CDK constructs are created correctly'
      ],
      fixtures: ['CDK App', 'CrossStackRuleManager', 'Rule Specifications'],
      inputs: {
        shape: 'Array of rule specifications with multiple rules',
        notes: 'Tests rule application and deduplication'
      },
      risks: [],
      dependencies: [],
      evidence: ['CDK Template assertions', 'Resource counts'],
      compliance_refs: ['docs/tickets/security-groups/SG-003-cross-stack-security-group-dependencies.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CreateNetworkRulesStack__WithRules__CreatesRuleConstructs', () => {
      const app = new App();
      
      const ruleSpecs: CrossStackRuleSpec[] = [
        {
          ruleId: 'rule-1',
          targetSecurityGroupId: 'sg-target123',
          rule: {
            type: 'ingress',
            peer: { kind: 'sg', id: 'sg-source123' },
            port: { from: 443, to: 443, protocol: 'tcp' },
            description: 'Allow HTTPS from source'
          },
          sourceComponent: 'service-a',
          targetComponent: 'service-b',
          bindingId: 'service-a-service-b-security-group:rule',
          timestamp: new Date().toISOString()
        },
        {
          ruleId: 'rule-2',
          targetSecurityGroupId: 'sg-target123',
          rule: {
            type: 'ingress',
            peer: { kind: 'sg', id: 'sg-source456' },
            port: { from: 80, to: 80, protocol: 'tcp' },
            description: 'Allow HTTP from source'
          },
          sourceComponent: 'service-c',
          targetComponent: 'service-b',
          bindingId: 'service-c-service-b-security-group:rule',
          timestamp: new Date().toISOString()
        }
      ];

      const stack = CrossStackRuleManager.createNetworkRulesStack(app, ruleSpecs);

      const template = Template.fromStack(stack);

      // Verify 2 ingress rules were created
      template.resourceCountIs('AWS::EC2::SecurityGroupIngress', 2);

      // Verify rules have correct properties
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        GroupId: 'sg-target123',
        SourceSecurityGroupId: 'sg-source123',
        IpProtocol: 'tcp',
        FromPort: 443,
        ToPort: 443,
        Description: 'Allow HTTPS from source (from service-a)'
      });

      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        GroupId: 'sg-target123',
        SourceSecurityGroupId: 'sg-source456',
        IpProtocol: 'tcp',
        FromPort: 80,
        ToPort: 80,
        Description: 'Allow HTTP from source (from service-c)'
      });
    });
  });

  describe('CreateNetworkRulesStack__RuleRemoval__HandlesMissingRules', () => {
    const metadata = {
      id: 'TP-cross-stack-manager-003',
      level: 'integration' as const,
      capability: 'Handles rule removal when SSM parameters are deleted',
      oracle: 'exact' as const,
      invariants: [
        'Deleted rules are not in the stack (removed from SSM)',
        'Remaining rules are still applied',
        'Stack reflects current state of SSM parameters'
      ],
      fixtures: ['CDK App', 'CrossStackRuleManager', 'Rule Specifications'],
      inputs: {
        shape: 'Rule specifications with some rules removed (simulating SSM deletion)',
        notes: 'Tests rule removal scenario - when bindings are deleted, SSM parameters are deleted, so they won\'t be in ruleSpecs array'
      },
      risks: [],
      dependencies: ['SG-006 rule removal implementation'],
      evidence: ['CDK Template assertions', 'Resource counts'],
      compliance_refs: [
        'docs/tickets/security-groups/SG-003-cross-stack-security-group-dependencies.md',
        'docs/tickets/security-groups/SG-006-binding-result-post-processor.md'
      ],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CreateNetworkRulesStack__RuleRemoval__HandlesMissingRules', () => {
      const app = new App();
      
      // Initial state: 3 rules
      const initialRuleSpecs: CrossStackRuleSpec[] = [
        {
          ruleId: 'rule-1',
          targetSecurityGroupId: 'sg-target123',
          rule: {
            type: 'ingress',
            peer: { kind: 'sg', id: 'sg-source123' },
            port: { from: 443, to: 443, protocol: 'tcp' },
            description: 'Allow HTTPS from source'
          },
          sourceComponent: 'service-a',
          targetComponent: 'service-b',
          bindingId: 'service-a-service-b-security-group:rule',
          timestamp: new Date().toISOString()
        },
        {
          ruleId: 'rule-2',
          targetSecurityGroupId: 'sg-target123',
          rule: {
            type: 'ingress',
            peer: { kind: 'sg', id: 'sg-source456' },
            port: { from: 80, to: 80, protocol: 'tcp' },
            description: 'Allow HTTP from source'
          },
          sourceComponent: 'service-c',
          targetComponent: 'service-b',
          bindingId: 'service-c-service-b-security-group:rule',
          timestamp: new Date().toISOString()
        },
        {
          ruleId: 'rule-3',
          targetSecurityGroupId: 'sg-target123',
          rule: {
            type: 'ingress',
            peer: { kind: 'sg', id: 'sg-source789' },
            port: { from: 8080, to: 8080, protocol: 'tcp' },
            description: 'Allow custom port from source'
          },
          sourceComponent: 'service-d',
          targetComponent: 'service-b',
          bindingId: 'service-d-service-b-security-group:rule',
          timestamp: new Date().toISOString()
        }
      ];

      // Create initial stack with 3 rules
      const initialStack = CrossStackRuleManager.createNetworkRulesStack(app, initialRuleSpecs, 'InitialNetworkRulesStack');
      const initialTemplate = Template.fromStack(initialStack);
      initialTemplate.resourceCountIs('AWS::EC2::SecurityGroupIngress', 3);

      // After rule removal: service-c binding removed, so rule-2 is missing from SSM
      // This simulates what happens when SSM parameters are deleted via markRuleForDeletion()
      const remainingRuleSpecs: CrossStackRuleSpec[] = [
        initialRuleSpecs[0], // rule-1 still exists
        // rule-2 removed (SSM parameter deleted)
        initialRuleSpecs[2]  // rule-3 still exists
      ];

      // Create new stack with remaining rules (simulates network-rules stack redeployment)
      const app2 = new App();
      const updatedStack = CrossStackRuleManager.createNetworkRulesStack(app2, remainingRuleSpecs, 'UpdatedNetworkRulesStack');
      const updatedTemplate = Template.fromStack(updatedStack);

      // Verify only 2 rules remain (rule-2 was removed)
      updatedTemplate.resourceCountIs('AWS::EC2::SecurityGroupIngress', 2);

      // Verify remaining rules are correct
      updatedTemplate.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        GroupId: 'sg-target123',
        SourceSecurityGroupId: 'sg-source123',
        FromPort: 443,
        ToPort: 443
      });

      updatedTemplate.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        GroupId: 'sg-target123',
        SourceSecurityGroupId: 'sg-source789',
        FromPort: 8080,
        ToPort: 8080
      });

      // Verify rule-2 (service-c) is NOT in the template
      const allIngressRules = updatedTemplate.findResources('AWS::EC2::SecurityGroupIngress');
      const rule2Exists = Object.values(allIngressRules).some((rule: any) => 
        rule.Properties.SourceSecurityGroupId === 'sg-source456'
      );
      expect(rule2Exists).toBe(false);
    });
  });

  describe('CreateNetworkRulesStack__Deduplication__PreventsDuplicateRules', () => {
    const metadata = {
      id: 'TP-cross-stack-manager-004',
      level: 'unit' as const,
      capability: 'Deduplicates identical rules from different bindings',
      oracle: 'exact' as const,
      invariants: [
        'Identical rules are deduplicated',
        'First occurrence is kept',
        'Warning is logged for duplicates'
      ],
      fixtures: ['CDK App', 'CrossStackRuleManager', 'Duplicate Rule Specifications'],
      inputs: {
        shape: 'Array with duplicate rule specifications',
        notes: 'Tests deduplication logic'
      },
      risks: [],
      dependencies: [],
      evidence: ['CDK Template assertions', 'Resource counts'],
      compliance_refs: ['docs/tickets/security-groups/SG-003-cross-stack-security-group-dependencies.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CreateNetworkRulesStack__Deduplication__PreventsDuplicateRules', () => {
      const app = new App();
      
      // Two bindings requesting the same rule
      const ruleSpecs: CrossStackRuleSpec[] = [
        {
          ruleId: 'rule-1',
          targetSecurityGroupId: 'sg-target123',
          rule: {
            type: 'ingress',
            peer: { kind: 'sg', id: 'sg-source123' },
            port: { from: 443, to: 443, protocol: 'tcp' },
            description: 'Allow HTTPS from source'
          },
          sourceComponent: 'service-a',
          targetComponent: 'service-b',
          bindingId: 'service-a-service-b-security-group:rule',
          timestamp: new Date().toISOString()
        },
        {
          ruleId: 'rule-2',
          targetSecurityGroupId: 'sg-target123',
          rule: {
            type: 'ingress',
            peer: { kind: 'sg', id: 'sg-source123' },
            port: { from: 443, to: 443, protocol: 'tcp' },
            description: 'Allow HTTPS from source' // Same rule
          },
          sourceComponent: 'service-c',
          targetComponent: 'service-b',
          bindingId: 'service-c-service-b-security-group:rule',
          timestamp: new Date().toISOString()
        }
      ];

      const stack = CrossStackRuleManager.createNetworkRulesStack(app, ruleSpecs);

      const template = Template.fromStack(stack);

      // Verify only 1 rule was created (duplicate removed)
      template.resourceCountIs('AWS::EC2::SecurityGroupIngress', 1);

      // Verify the rule uses description from first occurrence
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        GroupId: 'sg-target123',
        SourceSecurityGroupId: 'sg-source123',
        FromPort: 443,
        ToPort: 443,
        Description: 'Allow HTTPS from source (from service-a)' // First occurrence
      });
    });
  });

  describe('CreateNetworkRulesStack__MultipleTargetSGs__GroupsCorrectly', () => {
    const metadata = {
      id: 'TP-cross-stack-manager-005',
      level: 'unit' as const,
      capability: 'Groups rules by target security group correctly',
      oracle: 'exact' as const,
      invariants: [
        'Rules are grouped by target security group ID',
        'Each target SG gets its own rules',
        'Rules are applied to correct targets'
      ],
      fixtures: ['CDK App', 'CrossStackRuleManager', 'Rule Specifications'],
      inputs: {
        shape: 'Array with rules targeting multiple security groups',
        notes: 'Tests grouping logic'
      },
      risks: [],
      dependencies: [],
      evidence: ['CDK Template assertions', 'Resource counts'],
      compliance_refs: ['docs/tickets/security-groups/SG-003-cross-stack-security-group-dependencies.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CreateNetworkRulesStack__MultipleTargetSGs__GroupsCorrectly', () => {
      const app = new App();
      
      const ruleSpecs: CrossStackRuleSpec[] = [
        {
          ruleId: 'rule-1',
          targetSecurityGroupId: 'sg-target123',
          rule: {
            type: 'ingress',
            peer: { kind: 'sg', id: 'sg-source123' },
            port: { from: 443, to: 443, protocol: 'tcp' },
            description: 'Allow HTTPS to target123'
          },
          sourceComponent: 'service-a',
          targetComponent: 'service-b',
          bindingId: 'service-a-service-b-security-group:rule',
          timestamp: new Date().toISOString()
        },
        {
          ruleId: 'rule-2',
          targetSecurityGroupId: 'sg-target456',
          rule: {
            type: 'ingress',
            peer: { kind: 'sg', id: 'sg-source123' },
            port: { from: 443, to: 443, protocol: 'tcp' },
            description: 'Allow HTTPS to target456'
          },
          sourceComponent: 'service-a',
          targetComponent: 'service-c',
          bindingId: 'service-a-service-c-security-group:rule',
          timestamp: new Date().toISOString()
        }
      ];

      const stack = CrossStackRuleManager.createNetworkRulesStack(app, ruleSpecs);

      const template = Template.fromStack(stack);

      // Verify 2 rules were created (one per target SG)
      template.resourceCountIs('AWS::EC2::SecurityGroupIngress', 2);

      // Verify rules target correct security groups
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        GroupId: 'sg-target123',
        SourceSecurityGroupId: 'sg-source123'
      });

      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        GroupId: 'sg-target456',
        SourceSecurityGroupId: 'sg-source123'
      });
    });
  });
});

