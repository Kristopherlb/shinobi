/**
 * CDK Nag Security Tests for Application Load Balancer Component
 * 
 * Validates that the component follows AWS security best practices
 * using CDK Nag rule packs (AwsSolutions)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { Aspects } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { ApplicationLoadBalancerComponent } from '../../src/application-load-balancer.component';
import { ApplicationLoadBalancerComponentConfigBuilder } from '../../src/application-load-balancer.builder';
import { vi } from 'vitest';

let platformConfigSpy: any;

beforeEach(() => {
  platformConfigSpy = vi
    .spyOn(ApplicationLoadBalancerComponentConfigBuilder.prototype as any, '_loadPlatformConfiguration')
    .mockImplementation(() => ({}));
});

describe.skip('ApplicationLoadBalancerComponent - CDK Nag Security Validation', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let context: ComponentContext;
  let vpc: ec2.IVpc;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });

    // Create a mock VPC for ALB
    vpc = new ec2.Vpc(stack, 'TestVpc', {
      maxAzs: 2
    });

    context = {
      serviceName: 'test-service',
      environment: 'dev',
      complianceFramework: 'commercial',
      accountId: '123456789012',
      region: 'us-east-1',
      scope: stack,
      vpc: vpc,
      serviceLabels: {
        'service-name': 'test-service',
        'environment': 'dev',
        'compliance-framework': 'commercial'
      }
    } as ComponentContext;
  });

  describe('Commercial Framework - AwsSolutions', () => {
    it('passes AwsSolutions security checks for basic ALB', () => {
      const spec: ComponentSpec = {
        name: 'test-alb',
        type: 'application-load-balancer',
        config: {
          vpc: {
            subnetIds: []
          },
          listeners: [
            {
              port: 80,
              protocol: 'HTTP'
            }
          ]
        }
      };

      const component = new ApplicationLoadBalancerComponent(stack, 'TestALB', context, spec);
      
      // Suppress VPC Flow Logs error for test VPC (not created by component)
      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-VPC7',
          reason: 'Test VPC does not require Flow Logs. In production, VPC Flow Logs should be configured at the VPC component level.'
        }
      ]);
      
      // Apply CDK Nag before synthesis
      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));
      
      component.synth();
      app.synth();

      // Check for errors
      const errors = Annotations.fromStack(stack).findError(
        '*',
        Match.stringLikeRegexp('AwsSolutions-.*')
      );

      // Log errors for debugging if they exist
      if (errors.length > 0) {
        console.log('CDK Nag Errors:', JSON.stringify(errors, null, 2));
      }

      expect(errors).toHaveLength(0);
    });
  });

  describe('High Risk Environment - Enhanced Security', () => {
    it('passes AwsSolutions security checks with highRiskEnvironment enabled', () => {
      const spec: ComponentSpec = {
        name: 'test-alb',
        type: 'application-load-balancer',
        config: {
          vpc: {
            subnetIds: []
          },
          listeners: [
            {
              port: 443,
              protocol: 'HTTPS',
              certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test-cert'
            }
          ],
          highRiskEnvironment: true,
          accessLogs: {
            enabled: true
          }
        }
      };

      const component = new ApplicationLoadBalancerComponent(stack, 'TestALB', context, spec);
      
      // Suppress VPC Flow Logs error for test VPC (not created by component)
      NagSuppressions.addStackSuppressions(stack, [
        {
          id: 'AwsSolutions-VPC7',
          reason: 'Test VPC does not require Flow Logs. In production, VPC Flow Logs should be configured at the VPC component level.'
        }
      ]);
      
      // Apply CDK Nag before synthesis
      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));
      
      component.synth();
      app.synth();

      // Check for errors
      const errors = Annotations.fromStack(stack).findError(
        '*',
        Match.stringLikeRegexp('AwsSolutions-.*')
      );

      // Log errors for debugging if they exist
      if (errors.length > 0) {
        console.log('CDK Nag Errors:', JSON.stringify(errors, null, 2));
      }

      expect(errors).toHaveLength(0);
    });
  });
});

