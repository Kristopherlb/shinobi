import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CrossStackRuleManager, type CrossStackRuleSpec } from '../cross-stack-rule-manager.js';

describe('CrossStackRuleManager__Limitations', () => {
  it('CrossStackBinding__LimitationsDocumented__ClearErrors', () => {
    const app = new cdk.App();
    const invalidRule: CrossStackRuleSpec = {
      ruleId: 'rule-1',
      targetSecurityGroupId: 'sg-123456',
      rule: {
        type: 'ingress',
        // @ts-expect-error intentional invalid peer for test
        peer: { kind: 'invalid', id: 'sg-123456' },
        port: { from: 80, to: 80, protocol: 'tcp' },
        description: 'Invalid peer'
      },
      sourceComponent: 'source',
      targetComponent: 'target',
      bindingId: 'source-target-security-group-rule',
      timestamp: new Date().toISOString()
    };

    expect(() => CrossStackRuleManager.createNetworkRulesStack(app, [invalidRule]))
      .toThrow('Unknown peer kind');
  });

  it('CrossStackBinding__SecurityGroupRules__Works', () => {
    const app = new cdk.App();
    const rule: CrossStackRuleSpec = {
      ruleId: 'rule-1',
      targetSecurityGroupId: 'sg-123456',
      rule: {
        type: 'ingress',
        peer: { kind: 'cidr', cidr: '10.0.0.0/16' },
        port: { from: 443, to: 443, protocol: 'tcp' },
        description: 'Allow HTTPS'
      },
      sourceComponent: 'source',
      targetComponent: 'target',
      bindingId: 'source-target-security-group-rule',
      timestamp: new Date().toISOString()
    };

    const stack = CrossStackRuleManager.createNetworkRulesStack(app, [rule], 'NetworkRulesStack');
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::EC2::SecurityGroupIngress', 1);
  });

  it('CrossStackBinding__Validation__PreSynthesis', () => {
    const app = new cdk.App();
    const rule: CrossStackRuleSpec = {
      ruleId: 'rule-1',
      targetSecurityGroupId: 'sg-123456',
      rule: {
        type: 'ingress',
        peer: { kind: 'cidr', cidr: '10.0.0.0/16' },
        port: { from: 22, to: 22, protocol: 'tcp' },
        description: 'Allow SSH'
      },
      sourceComponent: 'source',
      targetComponent: 'target',
      bindingId: 'source-target-security-group-rule',
      timestamp: new Date().toISOString()
    };
    const duplicateRule: CrossStackRuleSpec = {
      ...rule,
      ruleId: 'rule-2'
    };

    const stack = CrossStackRuleManager.createNetworkRulesStack(app, [rule, duplicateRule], 'NetworkRulesStack');
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::EC2::SecurityGroupIngress', 1);
  });
});
