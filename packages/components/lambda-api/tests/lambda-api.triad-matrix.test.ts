/**
 * LambdaApiComponent Triad Matrix Tests
 * 
 * Tests component synthesis across all compliance frameworks (commercial, fedramp-moderate, fedramp-high)
 * Validates framework-specific requirements and configuration defaults
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { LambdaApiComponent } from '../src/lambda-api.component.js';
import { LambdaApiConfig } from '../src/lambda-api.builder.js';
import { LambdaApiComponentConfigBuilder } from '../src/lambda-api.builder.js';
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

describe('LambdaApiComponent - Triad Matrix Tests', () => {
  beforeEach(() => {
    platformConfigSpy = vi
      .spyOn(LambdaApiComponentConfigBuilder.prototype as any, '_loadPlatformConfiguration')
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

        const isHighRisk = framework === 'fedrampModerate' || framework === 'fedrampHigh';
        
        // Create VPC for FedRAMP tests (injected via context.vpc to avoid Vpc.fromLookup() in unit tests)
        let testVpc: ec2.IVpc | undefined;
        if (isHighRisk) {
          testVpc = new ec2.Vpc(stack, 'TestVpc', {
            ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
            maxAzs: 2,
            subnetConfiguration: [
              {
                cidrMask: 24,
                name: 'Public',
                subnetType: ec2.SubnetType.PUBLIC
              },
              {
                cidrMask: 24,
                name: 'Private',
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
              }
            ],
            natGateways: 1
          });
        }

        context = {
          ...TEST_CONTEXTS[framework],
          scope: stack,
          ...(testVpc ? { vpc: testVpc } : {})
        } as ComponentContext;

        spec = {
          name: `test-lambda-api-${framework}`,
          type: 'lambda-api',
          config: {
            handler: 'src/api.handler',
            ...(isHighRisk ? { 
              highRiskEnvironment: true,
              // VPC configuration required for FedRAMP compliance
              // vpcId is required by validator, but we use context.vpc for actual VPC (avoids Vpc.fromLookup() in unit tests)
              vpc: {
                enabled: true,
                vpcId: testVpc!.vpcId, // Required by validator when VPC is enabled (even though we use context.vpc)
                // Use empty array to use VPC's privateSubnets (fromSubnetId doesn't work well with injected VPC constructs)
                subnetIds: [],
                securityGroupIds: ['sg-test-123']
              },
              // Encryption is enabled by builder for high-risk environments
              // but we need to ensure it's explicitly set
              encryption: {
                enabled: true
              }
            } : {})
          }
        };
      });

      it(`Synthesis__${framework}__CreatesLambdaApiWithFrameworkDefaults`, () => {
        const component = new LambdaApiComponent(stack, `TestLambdaApi-${framework}`, context, spec);
        component.synth();

        const template = Template.fromStack(stack);
        template.hasResourceProperties('AWS::Lambda::Function', Match.anyValue());
        template.hasResourceProperties('AWS::ApiGateway::RestApi', Match.anyValue());
        expect(component.getType()).toBe('lambda-api');
      });

      it(`Tagging__${framework}__AppliesFrameworkSpecificTags`, () => {
        const component = new LambdaApiComponent(stack, `TestLambdaApi-${framework}`, context, spec);
        component.synth();

        const template = Template.fromStack(stack);
        // Check that required tags exist (order-independent)
        template.hasResourceProperties('AWS::Lambda::Function', {
          Tags: Match.arrayWith([
            Match.objectLike({ Key: 'service-name', Value: TEST_CONTEXTS[framework].serviceName })
          ])
        });
        template.hasResourceProperties('AWS::Lambda::Function', {
          Tags: Match.arrayWith([
            Match.objectLike({ Key: 'compliance-framework', Value: TEST_CONTEXTS[framework].complianceFramework })
          ])
        });
      });
    });
  });
});

