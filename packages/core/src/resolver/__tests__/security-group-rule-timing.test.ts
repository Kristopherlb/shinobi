import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template } from 'aws-cdk-lib/assertions';
import { SecurityGroupRulePostProcessor } from '../security-group-rule-post-processor.js';
import type { EnhancedBindingResult } from '../../platform/contracts/platform-binding-trigger-spec.js';

const createStackWithSecurityGroups = () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack', { env: { account: '123456789012', region: 'us-east-1' } });
  const targetSecurityGroup = new ec2.CfnSecurityGroup(stack, 'TargetSG', {
    groupDescription: 'Target SG',
    vpcId: 'vpc-12345678',
    tags: [{ key: 'resource-type', value: 'security-group' }]
  });
  const sourceSecurityGroup = new ec2.CfnSecurityGroup(stack, 'SourceSG', {
    groupDescription: 'Source SG',
    vpcId: 'vpc-12345678',
    tags: [{ key: 'resource-type', value: 'security-group' }]
  });
  return { stack, targetSecurityGroup, sourceSecurityGroup };
};

describe('SecurityGroupRulePostProcessor__Timing', () => {
  it('SGRuleTiming__ComponentCreatesRule__PostProcessorApplies__NoDuplicate', () => {
    const { stack, targetSecurityGroup, sourceSecurityGroup } = createStackWithSecurityGroups();
    const bindings = [
      {
        source: 'lambda-a',
        target: 'rds',
        capability: 'security-group:rule',
        result: {
          environmentVariables: {
            SECURITY_GROUP_RULE_TARGET_SG_ID: targetSecurityGroup.ref
          },
          iamPolicies: [],
          securityGroupRules: [
            {
              type: 'ingress' as const,
              peer: { kind: 'sg' as const, id: sourceSecurityGroup.ref },
              port: { from: 5432, to: 5432, protocol: 'tcp' as const },
              description: 'Allow DB'
            }
          ],
          compliance: { status: 'compliant', framework: 'commercial', actionsTaken: [] }
        } as EnhancedBindingResult
      },
      {
        source: 'lambda-b',
        target: 'rds',
        capability: 'security-group:rule',
        result: {
          environmentVariables: {
            SECURITY_GROUP_RULE_TARGET_SG_ID: targetSecurityGroup.ref
          },
          iamPolicies: [],
          securityGroupRules: [
            {
              type: 'ingress' as const,
              peer: { kind: 'sg' as const, id: sourceSecurityGroup.ref },
              port: { from: 5432, to: 5432, protocol: 'tcp' as const },
              description: 'Allow DB'
            }
          ],
          compliance: { status: 'compliant', framework: 'commercial', actionsTaken: [] }
        } as EnhancedBindingResult
      }
    ];

    SecurityGroupRulePostProcessor.process(bindings, stack, [], 'test-service');

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::EC2::SecurityGroupIngress', 1);
  });

  it('SGRuleTiming__ConflictingRules__Detected', () => {
    const { stack, targetSecurityGroup, sourceSecurityGroup } = createStackWithSecurityGroups();
    const bindings = [
      {
        source: 'lambda-a',
        target: 'rds',
        capability: 'security-group:rule',
        result: {
          environmentVariables: {
            SECURITY_GROUP_RULE_TARGET_SG_ID: targetSecurityGroup.ref
          },
          iamPolicies: [],
          securityGroupRules: [
            {
              type: 'ingress' as const,
              peer: { kind: 'sg' as const, id: sourceSecurityGroup.ref },
              port: { from: 5432, to: 5432, protocol: 'tcp' as const },
              description: 'Allow DB'
            },
            {
              type: 'egress' as const,
              peer: { kind: 'sg' as const, id: sourceSecurityGroup.ref },
              port: { from: 5432, to: 5432, protocol: 'tcp' as const },
              description: 'Conflicting rule'
            }
          ],
          compliance: { status: 'compliant', framework: 'commercial', actionsTaken: [] }
        } as EnhancedBindingResult
      }
    ];

    expect(() => SecurityGroupRulePostProcessor.process(bindings, stack, [], 'test-service'))
      .toThrow('Conflicting security group rules');
  });

  it('SGRuleTiming__RuleDeduplication__Works', () => {
    const { stack, targetSecurityGroup, sourceSecurityGroup } = createStackWithSecurityGroups();
    const bindings = [
      {
        source: 'lambda-a',
        target: 'rds',
        capability: 'security-group:rule',
        result: {
          environmentVariables: {
            SECURITY_GROUP_RULE_TARGET_SG_ID: targetSecurityGroup.ref
          },
          iamPolicies: [],
          securityGroupRules: [
            {
              type: 'ingress' as const,
              peer: { kind: 'sg' as const, id: sourceSecurityGroup.ref },
              port: { from: 443, to: 443, protocol: 'tcp' as const },
              description: 'Allow HTTPS'
            }
          ],
          compliance: { status: 'compliant', framework: 'commercial', actionsTaken: [] }
        } as EnhancedBindingResult
      },
      {
        source: 'lambda-b',
        target: 'rds',
        capability: 'security-group:rule',
        result: {
          environmentVariables: {
            SECURITY_GROUP_RULE_TARGET_SG_ID: targetSecurityGroup.ref
          },
          iamPolicies: [],
          securityGroupRules: [
            {
              type: 'ingress' as const,
              peer: { kind: 'sg' as const, id: sourceSecurityGroup.ref },
              port: { from: 443, to: 443, protocol: 'tcp' as const },
              description: 'Allow HTTPS'
            }
          ],
          compliance: { status: 'compliant', framework: 'commercial', actionsTaken: [] }
        } as EnhancedBindingResult
      }
    ];

    SecurityGroupRulePostProcessor.process(bindings, stack, [], 'test-service');

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::EC2::SecurityGroupIngress', 1);
  });
});
