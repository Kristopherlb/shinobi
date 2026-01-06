/**
 * CDK Nag Security Tests for EC2 Instance Component
 * 
 * Validates that the component follows AWS security best practices
 * using CDK Nag rule packs (AwsSolutions)
 * 
 * Based on AWS best practices:
 * - EC2 instances should use IMDSv2
 * - Security groups should be restrictive
 * - VPC deployment required
 * - EBS volumes should be encrypted
 * - CloudWatch agent should be installed
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks } from 'cdk-nag';
import { Aspects } from 'aws-cdk-lib';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { Ec2InstanceComponent } from '../../ec2-instance.component';
import { Ec2InstanceComponentConfigBuilder } from '../../ec2-instance.builder';
import { vi } from 'vitest';

let platformConfigSpy: any;

beforeEach(() => {
  platformConfigSpy = vi
    .spyOn(Ec2InstanceComponentConfigBuilder.prototype as any, '_loadPlatformConfiguration')
    .mockImplementation(() => ({}));
});

describe('Ec2InstanceComponent - CDK Nag Security Validation', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;
  let context: ComponentContext;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });

    vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

    context = {
      serviceName: 'test-service',
      environment: 'dev',
      complianceFramework: 'commercial',
      accountId: '123456789012',
      region: 'us-east-1',
      scope: stack,
      vpc,
      serviceLabels: {
        'service-name': 'test-service',
        'environment': 'dev',
        'compliance-framework': 'commercial'
      }
    } as ComponentContext;
  });

  describe('Commercial Framework - AwsSolutions', () => {
    it('passes AwsSolutions security checks for basic instance', () => {
      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {
          instanceType: 't3.micro',
          vpcId: vpc.vpcId,
          subnetId: vpc.privateSubnets[0].subnetId
        }
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
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

    it('passes AwsSolutions security checks with encryption enabled', () => {
      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {
          instanceType: 't3.micro',
          vpcId: vpc.vpcId,
          subnetId: vpc.privateSubnets[0].subnetId,
          storage: {
            volumes: [
              {
                device: '/dev/sda1',
                volumeSize: 20,
                encrypted: true
              }
            ]
          }
        }
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
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
        name: 'test-instance',
        type: 'ec2-instance',
        config: {
          instanceType: 't3.micro',
          vpcId: vpc.vpcId,
          subnetId: vpc.privateSubnets[0].subnetId,
          highRiskEnvironment: true
        }
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
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

