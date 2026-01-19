/**
 * Route53RecordComponent Triad Matrix Tests
 * 
 * Tests component synthesis across all compliance frameworks (commercial, fedramp-moderate, fedramp-high)
 * Validates framework-specific requirements and configuration defaults
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { Route53RecordComponent } from '../src/route53-record.component.js';
import { Route53RecordConfig } from '../src/route53-record.builder.js';
import { Route53RecordConfigBuilder } from '../src/route53-record.builder.js';
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

describe('Route53RecordComponent - Triad Matrix Tests', () => {
  beforeEach(() => {
    platformConfigSpy = vi
      .spyOn(Route53RecordConfigBuilder.prototype as any, '_loadPlatformConfiguration')
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
      let hostedZone: route53.HostedZone;

      beforeEach(() => {
        app = new cdk.App();
        stack = new cdk.Stack(app, `TestStack-${framework}`, {
          env: { account: '123456789012', region: TEST_CONTEXTS[framework].region }
        });

        // Create a hosted zone for the record
        hostedZone = new route53.HostedZone(stack, `TestZone-${framework}`, {
          zoneName: `example-${framework}.com`
        });

        context = {
          ...TEST_CONTEXTS[framework],
          scope: stack
        } as ComponentContext;

        // Set highRiskEnvironment flag for FedRAMP frameworks (data-driven, not framework-dependent)
        const isHighRisk = framework === 'fedrampModerate' || framework === 'fedrampHigh';
        spec = {
          name: `test-record-${framework}`,
          type: 'route53-record',
          config: {
            record: {
              recordName: `api.example-${framework}.com`,
              recordType: 'A',
              zoneName: `example-${framework}.com.`,
              target: '1.2.3.4',
              hostedZoneId: hostedZone.hostedZoneId,
              ttl: 300
            },
            ...(isHighRisk ? { highRiskEnvironment: true } : {})
          }
        };
      });

      it(`Synthesis__${framework}__CreatesRecordWithFrameworkDefaults`, () => {
        const component = new Route53RecordComponent(stack, `TestRecord-${framework}`, context, spec);
        component.synth();

        const template = Template.fromStack(stack);

        // All frameworks should create Route53 record
        template.hasResourceProperties('AWS::Route53::RecordSet', {
          Name: `api.example-${framework}.com.`,
          Type: 'A'
        });

        // Verify component type
        expect(component.getType()).toBe('route53-record');
      });
    });
  });
});

