/**
 * EcsEc2ServiceComponent Triad Matrix Tests
 * 
 * Tests component synthesis across all compliance frameworks (commercial, fedramp-moderate, fedramp-high)
 * Validates framework-specific requirements and configuration defaults
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { EcsEc2ServiceComponent } from '../src/ecs-ec2-service.component.js';
import { EcsEc2ServiceConfig } from '../src/ecs-ec2-service.builder.js';
import { EcsEc2ServiceConfigBuilder } from '../src/ecs-ec2-service.builder.js';
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

describe('EcsEc2ServiceComponent - Triad Matrix Tests', () => {
  beforeEach(() => {
    platformConfigSpy = vi
      .spyOn(EcsEc2ServiceConfigBuilder.prototype as any, '_loadPlatformConfiguration')
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
      let vpc: ec2.Vpc;
      let cluster: ecs.Cluster;

      beforeEach(() => {
        app = new cdk.App();
        stack = new cdk.Stack(app, `TestStack-${framework}`, {
          env: { account: '123456789012', region: TEST_CONTEXTS[framework].region }
        });

        vpc = new ec2.Vpc(stack, `TestVpc-${framework}`, { maxAzs: 2 });
        cluster = new ecs.Cluster(stack, `TestCluster-${framework}`, { vpc });
        cluster.addDefaultCloudMapNamespace({ name: 'internal.local' });

        context = {
          ...TEST_CONTEXTS[framework],
          scope: stack,
          vpc
        } as ComponentContext;

        const isHighRisk = framework === 'fedrampModerate' || framework === 'fedrampHigh';
        spec = {
          name: `test-ec2-service-${framework}`,
          type: 'ecs-ec2-service',
          config: {
            cluster: cluster.clusterName,
            image: { repository: 'nginx', tag: 'latest' },
            taskCpu: 256,
            taskMemory: 512,
            port: 8080,
            serviceConnect: { portMappingName: 'api', namespace: 'internal.local' },
            ...(isHighRisk ? { highRiskEnvironment: true } : {})
          }
        };
      });

      it(`Synthesis__${framework}__CreatesServiceWithFrameworkDefaults`, () => {
        const component = new EcsEc2ServiceComponent(stack, `TestService-${framework}`, context, spec);
        component.synth();

        const template = Template.fromStack(stack);
        template.hasResourceProperties('AWS::ECS::Service', {
          LaunchType: 'EC2'
        });
        expect(component.getType()).toBe('ecs-ec2-service');
      });

      it(`Tagging__${framework}__AppliesFrameworkSpecificTags`, () => {
        const component = new EcsEc2ServiceComponent(stack, `TestService-${framework}`, context, spec);
        component.synth();

        const template = Template.fromStack(stack);

        // All frameworks should have mandatory tags - check each tag independently (order-agnostic)
        template.hasResourceProperties('AWS::ECS::Service', {
          Tags: Match.arrayWith([
            Match.objectLike({ Key: 'service-name' })
          ])
        });

        template.hasResourceProperties('AWS::ECS::Service', {
          Tags: Match.arrayWith([
            Match.objectLike({ Key: 'compliance-framework', Value: TEST_CONTEXTS[framework].complianceFramework })
          ])
        });
      });
    });
  });
});

