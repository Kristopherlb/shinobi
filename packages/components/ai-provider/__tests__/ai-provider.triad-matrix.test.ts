/**
 * AIProviderComponent Triad Matrix Tests
 * 
 * Tests component synthesis across all compliance frameworks (commercial, fedramp-moderate, fedramp-high)
 * Validates framework-specific requirements and configuration defaults
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { AIProviderComponent } from '../src/ai-provider.component.js';
import { AIProviderComponentConfig } from '../src/ai-provider.builder.js';
import { AIProviderComponentConfigBuilder } from '../src/ai-provider.builder.js';
import { vi } from 'vitest';

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

describe('AIProviderComponent - Triad Matrix Tests', () => {
  beforeEach(() => {
    platformConfigSpy = vi
      .spyOn(AIProviderComponentConfigBuilder.prototype as any, '_loadPlatformConfiguration')
      .mockImplementation(function () {
        const framework = this.builderContext.context.complianceFramework;
        if (framework === 'fedramp-moderate' || framework === 'fedramp-high') {
          return { highRiskEnvironment: true };
        }
        return { highRiskEnvironment: false };
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

        const isHighRisk = framework === 'fedrampModerate' || framework === 'fedrampHigh';
        spec = {
          name: `test-ai-provider-${framework}`,
          type: 'ai-provider',
          config: {
            provider: 'bedrock',
            model: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
            ...(isHighRisk ? { highRiskEnvironment: true } : {})
          }
        };
      });

      it(`Synthesis__${framework}__CreatesProviderWithFrameworkDefaults`, () => {
        const component = new AIProviderComponent(stack, `TestProvider-${framework}`, context, spec);
        component.synth();

        expect(component.getType()).toBe('ai-provider');
        const capabilities = component.getCapabilities();
        expect(capabilities['ai:provider']).toBeDefined();
      });

      it(`Capabilities__${framework}__RegistersAICapability`, () => {
        const component = new AIProviderComponent(stack, `TestProvider-${framework}`, context, spec);
        component.synth();

        const capabilities = component.getCapabilities();
        const aiCapability = capabilities['ai:provider'];
        expect(aiCapability).toMatchObject({
          providerType: 'bedrock',
          model: 'anthropic.claude-3-5-sonnet-20240620-v1:0'
        });
      });
    });
  });
});

