/**
 * CDK Nag Security Tests for OpenSearch Domain Component
 * 
 * Validates that the component follows AWS security best practices
 * using CDK Nag rule packs (AwsSolutions)
 * 
 * Based on AWS best practices:
 * - OpenSearch domains should be encrypted at rest and in transit
 * - Fine-grained access control should be enabled
 * - VPC deployment preferred for high-risk environments
 * - Node-to-node encryption required
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks } from 'cdk-nag';
import { Aspects } from 'aws-cdk-lib';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { OpenSearchDomainComponent } from '../../opensearch-domain.component';
import { OpenSearchDomainComponentConfigBuilder } from '../../opensearch-domain.builder';
import { vi } from 'vitest';

let platformConfigSpy: any;

beforeEach(() => {
  platformConfigSpy = vi
    .spyOn(OpenSearchDomainComponentConfigBuilder.prototype as any, '_loadPlatformConfiguration')
    .mockImplementation(() => ({}));
});

describe('OpenSearchDomainComponent - CDK Nag Security Validation', () => {
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
    it('passes AwsSolutions security checks for basic domain', () => {
      const spec: ComponentSpec = {
        name: 'test-domain',
        type: 'opensearch-domain',
        config: {
          domainName: 'test-domain',
          version: '2.3',
          cluster: {
            instanceType: 't3.small.search',
            instanceCount: 1,
            zoneAwarenessEnabled: false
          }
        }
      };

      const component = new OpenSearchDomainComponent(stack, 'TestDomain', context, spec);
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
        name: 'test-domain',
        type: 'opensearch-domain',
        config: {
          domainName: 'test-domain-encrypted',
          version: '2.3',
          cluster: {
            instanceType: 't3.small.search',
            instanceCount: 1,
            zoneAwarenessEnabled: false
          },
          encryption: {
            atRest: true,
            inTransit: true
          }
        }
      };

      const component = new OpenSearchDomainComponent(stack, 'TestDomain', context, spec);
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
        name: 'test-domain',
        type: 'opensearch-domain',
        config: {
          domainName: 'test-domain-secure',
          version: '2.3',
          cluster: {
            instanceType: 't3.small.search',
            instanceCount: 1,
            zoneAwarenessEnabled: false
          },
          highRiskEnvironment: true
        }
      };

      const component = new OpenSearchDomainComponent(stack, 'TestDomain', context, spec);
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

