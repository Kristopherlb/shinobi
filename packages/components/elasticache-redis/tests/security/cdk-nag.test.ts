/**
 * CDK Nag Security Tests for ElastiCache Redis Component
 * 
 * Validates that the component follows AWS security best practices
 * using CDK Nag rule packs (AwsSolutions)
 * 
 * Based on AWS best practices:
 * - ElastiCache should be encrypted at rest and in transit
 * - Auth tokens should be used for authentication
 * - VPC deployment required
 * - Automatic backups should be enabled
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks } from 'cdk-nag';
import { Aspects } from 'aws-cdk-lib';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { ElastiCacheRedisComponent } from '../../src/elasticache-redis.component';
import { ElastiCacheRedisComponentConfigBuilder } from '../../src/elasticache-redis.builder';
import { vi } from 'vitest';

let platformConfigSpy: any;

beforeEach(() => {
  platformConfigSpy = vi
    .spyOn(ElastiCacheRedisComponentConfigBuilder.prototype as any, '_loadPlatformConfiguration')
    .mockImplementation(() => ({}));
});

describe.skip('ElastiCacheRedisComponent - CDK Nag Security Validation', () => {
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
    it('passes AwsSolutions security checks for basic cluster', () => {
      const spec: ComponentSpec = {
        name: 'test-redis',
        type: 'elasticache-redis',
        config: {
          replicationGroupId: 'test-redis',
          cacheNodeType: 'cache.t3.micro',
          numCacheNodes: 1,
          vpcId: vpc.vpcId,
          subnetIds: vpc.privateSubnets.map(s => s.subnetId)
        }
      };

      const component = new ElastiCacheRedisComponent(stack, 'TestRedis', context, spec);
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
        name: 'test-redis',
        type: 'elasticache-redis',
        config: {
          replicationGroupId: 'test-redis-encrypted',
          cacheNodeType: 'cache.t3.micro',
          numCacheNodes: 1,
          vpcId: vpc.vpcId,
          subnetIds: vpc.privateSubnets.map(s => s.subnetId),
          encryption: {
            atRest: true,
            inTransit: true,
            authToken: {
              enabled: true,
              removalPolicy: 'retain'
            }
          }
        }
      };

      const component = new ElastiCacheRedisComponent(stack, 'TestRedis', context, spec);
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
        name: 'test-redis',
        type: 'elasticache-redis',
        config: {
          replicationGroupId: 'test-redis-secure',
          cacheNodeType: 'cache.t3.micro',
          numCacheNodes: 1,
          vpcId: vpc.vpcId,
          subnetIds: vpc.privateSubnets.map(s => s.subnetId),
          highRiskEnvironment: true
        }
      };

      const component = new ElastiCacheRedisComponent(stack, 'TestRedis', context, spec);
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

