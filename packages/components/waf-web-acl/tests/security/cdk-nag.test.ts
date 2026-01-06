/**
 * CDK Nag Security Tests for WAF Web ACL Component
 * 
 * Validates that the component follows AWS security best practices
 * using CDK Nag rule packs (AwsSolutions)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks } from 'cdk-nag';
import { Aspects } from 'aws-cdk-lib';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { WafWebAclComponent } from '../waf-web-acl.component.js';
import { WafWebAclComponentConfigBuilder } from '../waf-web-acl.builder.js';
import { vi } from 'vitest';

let platformConfigSpy: any;

beforeEach(() => {
  platformConfigSpy = vi
    .spyOn(WafWebAclComponentConfigBuilder.prototype as any, '_loadPlatformConfiguration')
    .mockImplementation(() => ({}));
});

describe('WafWebAclComponent - CDK Nag Security Validation', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let context: ComponentContext;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });

    context = {
      serviceName: 'test-service',
      environment: 'dev',
      complianceFramework: 'commercial',
      accountId: '123456789012',
      region: 'us-east-1',
      scope: stack,
      serviceLabels: {
        'service-name': 'test-service',
        'environment': 'dev',
        'compliance-framework': 'commercial'
      }
    } as ComponentContext;
  });

  describe('Commercial Framework - AwsSolutions', () => {
    it('passes AwsSolutions security checks for basic WAF Web ACL', () => {
      const spec: ComponentSpec = {
        name: 'test-waf',
        type: 'waf-web-acl',
        config: {
          name: 'test-waf',
          scope: 'CLOUDFRONT',
          defaultAction: {
            allow: {}
          },
          rules: []
        }
      };

      const component = new WafWebAclComponent(stack, 'TestWaf', context, spec);
      component.synth();

      // Apply CDK Nag
      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      // Check for errors
      const errors = Annotations.fromStack(stack).findError(
        '*',
        Match.stringLikeRegexp('AwsSolutions-.*')
      );

      expect(errors).toHaveLength(0);
    });
  });

  describe('High Risk Environment - Enhanced Security', () => {
    it('passes AwsSolutions security checks with highRiskEnvironment enabled', () => {
      const spec: ComponentSpec = {
        name: 'test-waf',
        type: 'waf-web-acl',
        config: {
          name: 'test-waf',
          scope: 'CLOUDFRONT',
          highRiskEnvironment: true,
          defaultAction: {
            allow: {}
          },
          rules: [
            {
              name: 'AWSManagedRulesCommonRuleSet',
              priority: 1,
              managedRuleGroup: {
                name: 'AWSManagedRulesCommonRuleSet',
                vendorName: 'AWS'
              },
              overrideAction: {
                none: {}
              },
              visibilityConfig: {
                sampledRequestsEnabled: true,
                cloudWatchMetricsEnabled: true,
                metricName: 'CommonRuleSet'
              }
            }
          ],
          logging: {
            enabled: true,
            cloudWatchLogs: {
              logGroupName: '/aws/waf/test-waf'
            }
          }
        }
      };

      const component = new WafWebAclComponent(stack, 'TestWaf', context, spec);
      component.synth();

      // Apply CDK Nag
      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      // Check for errors
      const errors = Annotations.fromStack(stack).findError(
        '*',
        Match.stringLikeRegexp('AwsSolutions-.*')
      );

      expect(errors).toHaveLength(0);
    });
  });
});

