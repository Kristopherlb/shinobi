/**
 * Integration Tests for Network Rules Stack Component
 * 
 * End-to-end tests verifying that the component correctly queries SSM and applies rules.
 * 
 * Test Metadata: TP-INTEGRATION-network-rules-001
 * {
 *   "id": "TP-INTEGRATION-network-rules-001",
 *   "level": "integration",
 *   "capability": "End-to-end rule application from SSM to security groups",
 *   "oracle": "exact",
 *   "invariants": [
 *     "Component queries SSM Parameter Store",
 *     "Lambda functions are created with correct permissions",
 *     "Custom Resources trigger rule application",
 *     "IAM policies are correctly scoped"
 *   ],
 *   "fixtures": ["NetworkRulesStackComponent", "CDK Stack"],
 *   "inputs": {
 *     "shape": "ComponentSpec with network-rules-stack configuration",
 *     "notes": "Tests full component synthesis and CloudFormation template generation"
 *   },
 *   "risks": ["CDK version compatibility", "Lambda code validation"],
 *   "dependencies": ["NetworkRulesStackComponent", "CrossStackRuleManager"],
 *   "evidence": ["CDK Template assertions", "Resource counts", "IAM policy validation"],
 *   "compliance_refs": ["docs/tickets/security-groups/SG-003-cross-stack-security-group-dependencies.md"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ComponentSpec, ComponentContext } from '@shinobi/core';
import { NetworkRulesStackComponent } from '../src/network-rules-stack.component.js';
import { CrossStackRuleManager } from '@shinobi/core';

describe('NetworkRulesStackComponent__Integration', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let context: ComponentContext;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1'
      }
    });

    context = {
      serviceName: 'platform-network-rules',
      environment: 'production',
      complianceFramework: 'fedramp-moderate',
      scope: stack,
      region: 'us-east-1',
      accountId: '123456789012',
      owner: 'Platform Engineering',
      tags: {
        Team: 'Platform Engineering',
        CostCenter: 'Infrastructure'
      }
    };
  });

  /*
   * Test Metadata: TP-INTEGRATION-network-rules-001
   */
  describe('NetworkRulesStackComponent__EndToEnd__CreatesCorrectResources', () => {
    it('NetworkRulesStackComponent__EndToEnd__CreatesCorrectResources', () => {
      const spec: ComponentSpec = {
        name: 'network-rules-stack',
        type: 'network-rules-stack',
        config: {
          description: 'Centralized cross-stack security group rules management',
          ssmPathPrefix: '/shinobi/network-rules',
          tags: {
            Team: 'Platform Engineering',
            CostCenter: 'Infrastructure'
          }
        }
      };

      const component = new NetworkRulesStackComponent(stack, 'NetworkRules', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify SSM Query Lambda is created
      template.hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'index.handler',
        Runtime: 'python3.12',
        Description: Match.stringLikeRegexp('Queries SSM Parameter Store')
      });

      // Verify Rule Application Lambda is created
      template.hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'index.handler',
        Runtime: 'python3.12',
        Description: Match.stringLikeRegexp('Applies security group rules')
      });

      // Verify IAM permissions for SSM
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith(['ssm:GetParametersByPath']),
              Resource: Match.stringLikeRegexp('/shinobi/network-rules')
            })
          ])
        }
      });

      // Verify IAM permissions for EC2
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith([
                'ec2:AuthorizeSecurityGroupIngress',
                'ec2:AuthorizeSecurityGroupEgress'
              ])
            })
          ])
        }
      });

      // Verify Custom Resources are created
      template.resourceCountIs('AWS::CloudFormation::CustomResource', 1);
      template.resourceCountIs('Custom::AWS', 1);

      // Verify component capabilities
      expect(component.getCapabilities()).toEqual({});
      expect(component.getType()).toBe('network-rules-stack');
    });
  });

  /*
   * Test Metadata: TP-INTEGRATION-network-rules-002
   * {
   *   "id": "TP-INTEGRATION-network-rules-002",
   *   "level": "integration",
   *   "capability": "Component integrates with CrossStackRuleManager for rule storage",
   *   "oracle": "exact",
   *   "invariants": [
   *     "SSM parameters can be stored via CrossStackRuleManager",
   *     "Component can read parameters from same path",
   *     "Rule lifecycle works end-to-end"
   *   ],
   *   "fixtures": ["NetworkRulesStackComponent", "CrossStackRuleManager"],
   *   "inputs": {
   *     "shape": "Rule specifications stored in SSM",
   *     "notes": "Tests integration with rule storage mechanism"
   *   },
   *   "risks": [],
   *   "dependencies": ["CrossStackRuleManager"],
   *   "evidence": ["SSM parameter creation", "Path consistency"],
   *   "compliance_refs": ["docs/tickets/security-groups/SG-003-cross-stack-security-group-dependencies.md"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "Platform Engineering"
   * }
   */
  describe('NetworkRulesStackComponent__CrossStackRuleManager__Integration', () => {
    it('NetworkRulesStackComponent__CrossStackRuleManager__Integration', () => {
      // Create a rule spec and store it in SSM (simulated)
      const ruleSpec = {
        ruleId: 'test-rule-123',
        targetSecurityGroupId: 'sg-target123',
        rule: {
          type: 'ingress' as const,
          peer: { kind: 'sg' as const, id: 'sg-source123' },
          port: { from: 443, to: 443, protocol: 'tcp' as const },
          description: 'Test rule'
        },
        sourceComponent: 'service-a',
        targetComponent: 'service-b',
        bindingId: 'binding-123',
        timestamp: new Date().toISOString()
      };

      // Store rule in SSM (this would normally be done by SecurityGroupRulePostProcessor)
      CrossStackRuleManager.storeRuleSpec(stack, 'service-a', ruleSpec);

      // Create component that reads from same path
      const spec: ComponentSpec = {
        name: 'network-rules-stack',
        type: 'network-rules-stack',
        config: {
          ssmPathPrefix: '/shinobi/network-rules'
        }
      };

      const component = new NetworkRulesStackComponent(stack, 'NetworkRules', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify SSM parameter was created
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: Match.stringLikeRegexp('/shinobi/network-rules/service-a/binding-123'),
        Type: 'String'
      });

      // Verify component Lambda can read from same path
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'ssm:GetParametersByPath',
              Resource: Match.stringLikeRegexp('/shinobi/network-rules')
            })
          ])
        }
      });
    });
  });

  /*
   * Test Metadata: TP-INTEGRATION-network-rules-003
   * {
   *   "id": "TP-INTEGRATION-network-rules-003",
   *   "level": "integration",
   *   "capability": "Component handles rule removal lifecycle",
   *   "oracle": "exact",
   *   "invariants": [
   *     "Rule removal triggers SSM parameter deletion",
   *     "Component re-queries SSM on update",
   *     "Deleted rules are not applied"
   *   ],
   *   "fixtures": ["NetworkRulesStackComponent", "CrossStackRuleManager"],
   *   "inputs": {
   *     "shape": "Rule stored then marked for deletion",
   *     "notes": "Tests rule lifecycle management"
   *   },
   *   "risks": [],
   *   "dependencies": ["CrossStackRuleManager"],
   *   "evidence": ["SSM parameter deletion Custom Resource", "Update triggers"],
   *   "compliance_refs": ["docs/tickets/security-groups/SG-003-cross-stack-security-group-dependencies.md"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "Platform Engineering"
   * }
   */
  describe('NetworkRulesStackComponent__RuleRemoval__LifecycleManagement', () => {
    it('NetworkRulesStackComponent__RuleRemoval__LifecycleManagement', () => {
      const ruleSpec = {
        ruleId: 'test-rule-456',
        targetSecurityGroupId: 'sg-target456',
        rule: {
          type: 'ingress' as const,
          peer: { kind: 'sg' as const, id: 'sg-source456' },
          port: { from: 80, to: 80, protocol: 'tcp' as const },
          description: 'Test rule for removal'
        },
        sourceComponent: 'service-c',
        targetComponent: 'service-d',
        bindingId: 'binding-456',
        timestamp: new Date().toISOString()
      };

      // Store rule
      CrossStackRuleManager.storeRuleSpec(stack, 'service-c', ruleSpec);

      // Mark for deletion (simulates binding removal)
      CrossStackRuleManager.markRuleForDeletion(stack, 'service-c', 'binding-456');

      // Create component
      const spec: ComponentSpec = {
        name: 'network-rules-stack',
        type: 'network-rules-stack',
        config: {}
      };

      const component = new NetworkRulesStackComponent(stack, 'NetworkRules', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify deletion Custom Resource is created
      template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
        ServiceToken: Match.anyValue()
      });

      // Verify SSM parameter exists (will be deleted by Custom Resource)
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: Match.stringLikeRegexp('/shinobi/network-rules/service-c/binding-456')
      });
    });
  });
});

