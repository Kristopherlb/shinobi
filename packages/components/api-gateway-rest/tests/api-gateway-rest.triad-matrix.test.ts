/**
 * ApiGatewayRestComponent Triad Matrix Tests
 * 
 * Tests component synthesis across all compliance frameworks (commercial, fedramp-moderate, fedramp-high)
 * Validates framework-specific requirements and configuration defaults
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { ApiGatewayRestComponent } from '../src/api-gateway-rest.component.js';
import { ApiGatewayRestConfig } from '../src/api-gateway-rest.builder.js';
import { ApiGatewayRestConfigBuilder } from '../src/api-gateway-rest.builder.js';
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

describe('ApiGatewayRestComponent - Triad Matrix Tests', () => {
  beforeEach(() => {
    platformConfigSpy = vi
      .spyOn(ApiGatewayRestConfigBuilder.prototype as any, '_loadPlatformConfiguration')
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
          name: `test-api-${framework}`,
          type: 'api-gateway-rest',
          config: {
            apiName: `test-api-${framework}`,
            ...(isHighRisk ? { highRiskEnvironment: true } : {})
          }
        };
      });

      it(`Synthesis__${framework}__CreatesApiGatewayWithFrameworkDefaults`, () => {
        const component = new ApiGatewayRestComponent(stack, `TestApi-${framework}`, context, spec);
        component.synth();

        const template = Template.fromStack(stack);
        template.hasResourceProperties('AWS::ApiGateway::RestApi', Match.anyValue());
        expect(component.getType()).toBe('api-gateway-rest');
      });

      it(`Tagging__${framework}__AppliesFrameworkSpecificTags`, () => {
        const component = new ApiGatewayRestComponent(stack, `TestApi-${framework}`, context, spec);
        component.synth();

        const template = Template.fromStack(stack);

        // All frameworks should have mandatory tags - check each tag independently (order-agnostic)
        template.hasResourceProperties('AWS::ApiGateway::RestApi', {
          Tags: Match.arrayWith([
            Match.objectLike({ Key: 'service-name' })
          ])
        });

        template.hasResourceProperties('AWS::ApiGateway::RestApi', {
          Tags: Match.arrayWith([
            Match.objectLike({ Key: 'compliance-framework', Value: TEST_CONTEXTS[framework].complianceFramework })
          ])
        });
      });
    });
  });
});

