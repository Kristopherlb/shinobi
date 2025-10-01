import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

import { WafWebAclComponent } from '../waf-web-acl.component.js';

const createContext = (
  framework: 'commercial' | 'fedramp-high' = 'commercial'
): { stack: Stack; context: ComponentContext } => {
  const app = new App();
  const stack = new Stack(app, `Test${framework}`);

  return {
    stack,
    context: {
      serviceName: 'edge',
      environment: 'dev',
      complianceFramework: framework,
      scope: stack,
      region: 'us-east-1',
      accountId: '123456789012'
    }
  };
};

const createSpec = (config: ComponentSpec['config'] = {}): ComponentSpec => ({
  name: 'edge-waf',
  type: 'waf-web-acl',
  config
});

describe('WafWebAclComponent synthesis', () => {
  it('creates a regional Web ACL with logging when using commercial defaults', () => {
    const { stack, context } = createContext('commercial');
    const spec = createSpec();

    const component = new WafWebAclComponent(stack, spec.name, context, spec);
    component.synth();

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::WAFv2::WebACL', Match.objectLike({
      Scope: 'REGIONAL',
      DefaultAction: { Allow: {} },
      Rules: Match.arrayWith([
        Match.objectLike({
          Name: 'AWSManagedRulesCommonRuleSet'
        })
      ])
    }));

    template.hasResourceProperties('AWS::Logs::LogGroup', Match.objectLike({
      RetentionInDays: Match.anyValue()
    }));

    template.resourceCountIs('AWS::WAFv2::LoggingConfiguration', 1);
  });

  it('reflects fedramp-high defaults and retains resources', () => {
    const { stack, context } = createContext('fedramp-high');
    const spec = createSpec();

    const component = new WafWebAclComponent(stack, spec.name, context, spec);
    component.synth();

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::WAFv2::WebACL', Match.objectLike({
      DefaultAction: { Block: {} }
    }));

    template.hasResourceProperties('AWS::Logs::LogGroup', Match.objectLike({
      RetentionInDays: Match.anyValue()
    }));

    template.hasResourceProperties('AWS::CloudWatch::Alarm', Match.objectLike({
      MetricName: 'BlockedRequests'
    }));
  });
});
