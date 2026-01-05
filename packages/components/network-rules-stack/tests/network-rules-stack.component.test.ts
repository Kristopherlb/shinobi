/**
 * Network Rules Stack Component Test Suite
 * 
 * Comprehensive tests following Platform Testing Standard v1.0
 * Tests the network-rules-stack component with full validation
 */

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ComponentSpec, ComponentContext } from '@shinobi/core';
import { NetworkRulesStackComponent } from '../src/network-rules-stack.component.js';
import { NetworkRulesStackConfigBuilder } from '../src/network-rules-stack.builder.js';

describe('NetworkRulesStackComponent', () => {
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
      serviceName: 'test-service',
      environment: 'test',
      complianceFramework: 'commercial',
      scope: stack,
      region: 'us-east-1',
      accountId: '123456789012',
      owner: 'test-team',
      tags: {}
    };
  });

  /*
   * Test Metadata: TP-network-rules-001
   * {
   *   "id": "TP-network-rules-001",
   *   "level": "unit",
   *   "capability": "Component synthesizes with empty SSM results",
   *   "oracle": "exact",
   *   "invariants": ["Component completes successfully", "No security group rules created", "Lambda functions created"],
   *   "fixtures": ["NetworkRulesStackComponent", "ComponentContext"],
   *   "inputs": { "shape": "ComponentSpec with minimal config", "notes": "Tests empty SSM scenario" },
   *   "risks": [],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["CloudFormation template validation", "Lambda function creation"],
   *   "compliance_refs": ["docs/platform-standards/platform-testing-standard.md"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "Platform Engineering"
   * }
   */
  describe('NetworkRulesStackComponent__EmptySSM__CompletesSuccessfully', () => {
    it('NetworkRulesStackComponent__EmptySSM__CompletesSuccessfully', () => {
      const spec: ComponentSpec = {
        name: 'network-rules',
        type: 'network-rules-stack',
        config: {}
      };

      const component = new NetworkRulesStackComponent(stack, 'NetworkRules', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify Lambda functions are created
      template.resourceCountIs('AWS::Lambda::Function', 2); // SSM query + rule application

      // Verify Custom Resources are created
      template.resourceCountIs('AWS::CloudFormation::CustomResource', 1); // Rule application
      template.resourceCountIs('Custom::AWS', 1); // SSM query

      // Verify component has no capabilities (infrastructure-only)
      expect(component.getCapabilities()).toEqual({});
      expect(component.getType()).toBe('network-rules-stack');
    });
  });

  /*
   * Test Metadata: TP-network-rules-002
   * {
   *   "id": "TP-network-rules-002",
   *   "level": "unit",
   *   "capability": "Component applies configurable tags",
   *   "oracle": "exact",
   *   "invariants": ["Tags applied to component", "Tags appear in CloudFormation template"],
   *   "fixtures": ["NetworkRulesStackComponent", "ComponentContext"],
   *   "inputs": { "shape": "ComponentSpec with tags config", "notes": "Tests tag application" },
   *   "risks": [],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["CloudFormation template tag validation"],
   *   "compliance_refs": ["docs/platform-standards/platform-tagging-standard.md"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "Platform Engineering"
   * }
   */
  describe('NetworkRulesStackComponent__ConfigurableTags__AppliedCorrectly', () => {
    it('NetworkRulesStackComponent__ConfigurableTags__AppliedCorrectly', () => {
      const spec: ComponentSpec = {
        name: 'network-rules',
        type: 'network-rules-stack',
        config: {
          tags: {
            Team: 'Platform Engineering',
            CostCenter: 'Infrastructure',
            Purpose: 'Cross-stack networking'
          }
        }
      };

      const component = new NetworkRulesStackComponent(stack, 'NetworkRules', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify tags are applied (check Lambda functions have tags)
      template.hasResourceProperties('AWS::Lambda::Function', {
        Tags: Match.arrayWith([
          Match.objectLike({
            Key: 'Team',
            Value: 'Platform Engineering'
          })
        ])
      });
    });
  });

  /*
   * Test Metadata: TP-network-rules-003
   * {
   *   "id": "TP-network-rules-003",
   *   "level": "unit",
   *   "capability": "Component uses custom SSM path prefix",
   *   "oracle": "exact",
   *   "invariants": ["SSM path prefix used in Lambda code", "IAM permissions scoped to path"],
   *   "fixtures": ["NetworkRulesStackComponent", "ComponentContext"],
   *   "inputs": { "shape": "ComponentSpec with custom ssmPathPrefix", "notes": "Tests path configuration" },
   *   "risks": [],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["Lambda function code inspection", "IAM policy validation"],
   *   "compliance_refs": ["docs/platform-standards/platform-testing-standard.md"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "Platform Engineering"
   * }
   */
  describe('NetworkRulesStackComponent__CustomSSMPath__UsedCorrectly', () => {
    it('NetworkRulesStackComponent__CustomSSMPath__UsedCorrectly', () => {
      const spec: ComponentSpec = {
        name: 'network-rules',
        type: 'network-rules-stack',
        config: {
          ssmPathPrefix: '/custom/path/network-rules'
        }
      };

      const component = new NetworkRulesStackComponent(stack, 'NetworkRules', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify IAM permissions are scoped to custom path
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'ssm:GetParametersByPath',
              Resource: Match.stringLikeRegexp('/custom/path/network-rules')
            })
          ])
        }
      });
    });
  });

  /*
   * Test Metadata: TP-network-rules-004
   * {
   *   "id": "TP-network-rules-004",
   *   "level": "unit",
   *   "capability": "Component handles idempotent synthesis",
   *   "oracle": "exact",
   *   "invariants": ["Multiple synth() calls produce same result", "No duplicate resources"],
   *   "fixtures": ["NetworkRulesStackComponent", "ComponentContext"],
   *   "inputs": { "shape": "ComponentSpec with multiple synth() calls", "notes": "Tests idempotency" },
   *   "risks": [],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["Resource count consistency", "No synthesis errors"],
   *   "compliance_refs": ["docs/platform-standards/platform-testing-standard.md"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "Platform Engineering"
   * }
   */
  describe('NetworkRulesStackComponent__IdempotentSynthesis__NoDuplicates', () => {
    it('NetworkRulesStackComponent__IdempotentSynthesis__NoDuplicates', () => {
      const spec: ComponentSpec = {
        name: 'network-rules',
        type: 'network-rules-stack',
        config: {}
      };

      const component = new NetworkRulesStackComponent(stack, 'NetworkRules', context, spec);
      
      // Call synth() multiple times
      component.synth();
      component.synth();
      component.synth();

      const template = Template.fromStack(stack);

      // Verify resource counts are consistent (no duplicates)
      template.resourceCountIs('AWS::Lambda::Function', 2);
      template.resourceCountIs('AWS::CloudFormation::CustomResource', 1);
      template.resourceCountIs('Custom::AWS', 1);
    });
  });

  /*
   * Test Metadata: TP-network-rules-005
   * {
   *   "id": "TP-network-rules-005",
   *   "level": "unit",
   *   "capability": "Component config builder uses 5-layer precedence",
   *   "oracle": "exact",
   *   "invariants": ["Hardcoded fallbacks applied", "User config overrides defaults"],
   *   "fixtures": ["NetworkRulesStackConfigBuilder", "ComponentContext"],
   *   "inputs": { "shape": "ComponentSpec variations", "notes": "Tests config precedence" },
   *   "risks": [],
   *   "dependencies": ["@shinobi/core"],
   *   "evidence": ["Configuration object property validation"],
   *   "compliance_refs": ["docs/platform-standards/platform-configuration-standard.md"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "Platform Engineering"
   * }
   */
  describe('NetworkRulesStackConfigBuilder__PrecedenceChain__ConfigurationMerging', () => {
    it('NetworkRulesStackConfigBuilder__MinimalConfig__UsesHardcodedFallbacks', () => {
      const builder = new NetworkRulesStackConfigBuilder({
        context,
        spec: {
          name: 'network-rules',
          type: 'network-rules-stack',
          config: {}
        }
      });

      const config = builder.buildSync();

      // Layer 1: Hardcoded fallbacks should be applied
      expect(config.ssmPathPrefix).toBe('/shinobi/network-rules');
      expect(config.description).toBe('Cross-stack security group rules from all services');
      expect(config.tags).toBeDefined();
      expect(config.tags?.['Component']).toBe('network-rules-stack');
    });

    it('NetworkRulesStackConfigBuilder__UserConfig__OverridesDefaults', () => {
      const builder = new NetworkRulesStackConfigBuilder({
        context,
        spec: {
          name: 'network-rules',
          type: 'network-rules-stack',
          config: {
            ssmPathPrefix: '/custom/path',
            description: 'Custom description',
            tags: {
              Team: 'Custom Team'
            }
          }
        }
      });

      const config = builder.buildSync();

      // User configuration should take precedence
      expect(config.ssmPathPrefix).toBe('/custom/path');
      expect(config.description).toBe('Custom description');
      expect(config.tags?.['Team']).toBe('Custom Team');
    });
  });

  /*
   * Test Metadata: TP-network-rules-006
   * {
   *   "id": "TP-network-rules-006",
   *   "level": "unit",
   *   "capability": "Component validates SSM path prefix format",
   *   "oracle": "exact",
   *   "invariants": ["Path starts with /", "Path length validation"],
   *   "fixtures": ["NetworkRulesStackComponentCreator"],
   *   "inputs": { "shape": "ComponentSpec with invalid paths", "notes": "Tests validation" },
   *   "risks": [],
   *   "dependencies": ["@shinobi/core"],
   *   "evidence": ["Validation error messages"],
   *   "compliance_refs": ["docs/platform-standards/platform-testing-standard.md"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "Platform Engineering"
   * }
   */
  describe('NetworkRulesStackComponentCreator__Validation__RejectsInvalidConfig', () => {
    it('NetworkRulesStackComponentCreator__InvalidSSMPath__ReturnsErrors', () => {
      const { NetworkRulesStackComponentCreator } = require('../src/network-rules-stack.creator.js');
      const creator = new NetworkRulesStackComponentCreator();

      const result = creator.validateSpec(
        {
          name: 'network-rules',
          type: 'network-rules-stack',
          config: {
            ssmPathPrefix: 'invalid-path' // Missing leading /
          }
        },
        context
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SSM path prefix must start with /');
    });
  });
});

