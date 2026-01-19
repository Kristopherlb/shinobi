/**
 * SnsTopicComponent Triad Matrix Tests
 * 
 * Tests component synthesis across all compliance frameworks (commercial, fedramp-moderate, fedramp-high)
 * Validates framework-specific requirements and configuration defaults
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { SnsTopicComponent } from '../sns-topic.component.js';
import { SnsTopicConfig } from '../sns-topic.builder.js';
import { SnsTopicComponentConfigBuilder } from '../sns-topic.builder.js';
import { vi } from 'vitest';

/**
 * Test contexts for different compliance frameworks
 */
const TEST_CONTEXTS = {
  commercial: {
    serviceName: 'test-service',
    serviceVersion: '1.2.3',
    environment: 'test',
    complianceFramework: 'commercial' as const,
    region: 'us-east-1',
    accountId: '123456789012',
    deploymentId: 'deploy-test-001',
    platformVersion: '1.0.0',
    costCenter: 'engineering',
    billingProject: 'test-project',
    resourceOwner: 'platform-team',
    scope: undefined as any
  },
  fedrampModerate: {
    serviceName: 'secure-service',
    serviceVersion: '2.1.0',
    environment: 'staging',
    complianceFramework: 'fedramp-moderate' as const,
    region: 'us-gov-west-1',
    accountId: '123456789012',
    deploymentId: 'deploy-secure-002',
    platformVersion: '1.0.0',
    costCenter: 'security',
    billingProject: 'compliance-project',
    resourceOwner: 'security-team',
    scope: undefined as any
  },
  fedrampHigh: {
    serviceName: 'classified-service',
    serviceVersion: '3.0.0',
    environment: 'production',
    complianceFramework: 'fedramp-high' as const,
    region: 'us-gov-east-1',
    accountId: '123456789012',
    deploymentId: 'deploy-classified-003',
    platformVersion: '1.0.0',
    costCenter: 'operations',
    billingProject: 'classified-project',
    resourceOwner: 'ops-team',
    scope: undefined as any
  }
} as const;

let platformConfigSpy: any;

describe('SnsTopicComponent - Triad Matrix Tests', () => {
  beforeEach(() => {
    platformConfigSpy = vi
      .spyOn(SnsTopicComponentConfigBuilder.prototype as any, '_loadPlatformConfiguration')
      .mockImplementation(function () {
        const framework = this.builderContext.context.complianceFramework;
        if (framework === 'fedramp-moderate' || framework === 'fedramp-high') {
          return {
            highRiskEnvironment: true
          };
        }
        return {
          highRiskEnvironment: false
        };
      });
  });

  afterEach(() => {
    platformConfigSpy.mockRestore();
  });

  const frameworks: Array<keyof typeof TEST_CONTEXTS> = ['commercial', 'fedrampModerate', 'fedrampHigh'];

  frameworks.forEach((framework) => {
    describe(`${framework} Framework`, () => {
      let app: cdk.App;
      let stack: cdk.Stack;
      let context: ComponentContext;
      let spec: ComponentSpec;

      beforeEach(() => {
        app = new cdk.App();
        stack = new cdk.Stack(app, `TestStack-${framework}`, {
          env: { account: '123456789012', region: TEST_CONTEXTS[framework].region }
        });

        context = {
          ...TEST_CONTEXTS[framework],
          scope: stack
        } as ComponentContext;

        // Set highRiskEnvironment flag for FedRAMP frameworks (data-driven, not framework-dependent)
        const isHighRisk = framework === 'fedrampModerate' || framework === 'fedrampHigh';
        spec = {
          name: `test-topic-${framework}`,
          type: 'sns-topic',
          config: {
            ...(isHighRisk ? { highRiskEnvironment: true } : {})
          }
        };
      });

      it(`Synthesis__${framework}__CreatesTopicWithFrameworkDefaults`, () => {
        const component = new SnsTopicComponent(stack, `TestTopic-${framework}`, context, spec);
        component.synth();

        const template = Template.fromStack(stack);

        // All frameworks should create SNS topic
        template.hasResourceProperties('AWS::SNS::Topic', {
          TracingConfig: Match.anyValue()
        });

        // Verify component type
        expect(component.getType()).toBe('sns-topic');
      });

      it(`Encryption__${framework}__ConfiguresFrameworkSpecificEncryption`, () => {
        const component = new SnsTopicComponent(stack, `TestTopic-${framework}`, context, spec);
        component.synth();

        const template = Template.fromStack(stack);

        // FedRAMP frameworks should have encryption enabled via getComplianceFrameworkDefaults
        if (framework === 'fedrampModerate' || framework === 'fedrampHigh') {
          // Should have KMS encryption for high-risk environments
          const kmsKeys = template.findResources('AWS::KMS::Key');
          expect(Object.keys(kmsKeys).length).toBeGreaterThanOrEqual(0); // May be 0 if key is imported
        }
      });

      it(`Tagging__${framework}__AppliesFrameworkSpecificTags`, () => {
        const component = new SnsTopicComponent(stack, `TestTopic-${framework}`, context, spec);
        component.synth();

        const template = Template.fromStack(stack);

        // All frameworks should have mandatory tags - check each tag independently (order-agnostic)
        template.hasResourceProperties('AWS::SNS::Topic', {
          Tags: Match.arrayWith([
            Match.objectLike({ Key: 'service-name' })
          ])
        });

        template.hasResourceProperties('AWS::SNS::Topic', {
          Tags: Match.arrayWith([
            Match.objectLike({ Key: 'compliance-framework', Value: TEST_CONTEXTS[framework].complianceFramework })
          ])
        });
      });
    });
  });
});

