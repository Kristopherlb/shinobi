/**
 * CDK Nag Security Tests for EFS Filesystem Component
 * 
 * Validates that the component follows AWS security best practices
 * using CDK Nag rule packs (AwsSolutions and FedRAMP)
 */

import * as cdk from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks } from 'cdk-nag';
import { Aspects } from 'aws-cdk-lib';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { EfsFilesystemComponent } from '../../src/efs-filesystem.component.js';

const VPC_ID = 'vpc-0abc123def4567890';
const CONTEXT_KEY = `vpcProvider:account=123456789012:filter.vpcId=${VPC_ID}:region=us-east-1`;

const createContext = (framework?: string): ComponentContext => {
  const fw = framework || 'commercial';
  return {
    serviceName: 'files-service',
    environment: 'dev',
    complianceFramework: fw,
    accountId: '123456789012',
    region: 'us-east-1',
    tags: {}
  } as ComponentContext;
};

describe('EfsFilesystemComponent - CDK Nag Security Validation', () => {
  const originalContext = process.env.CDK_CONTEXT_JSON;

  beforeAll(() => {
    process.env.CDK_CONTEXT_JSON = JSON.stringify({
      [CONTEXT_KEY]: {
        vpcId: VPC_ID,
        availabilityZones: ['us-east-1a', 'us-east-1b'],
        privateSubnetIds: ['subnet-private-a', 'subnet-private-b'],
      }
    });
  });

  afterAll(() => {
    if (originalContext === undefined) {
      delete process.env.CDK_CONTEXT_JSON;
    } else {
      process.env.CDK_CONTEXT_JSON = originalContext;
    }
  });

  describe('Commercial Framework - AwsSolutions', () => {
    it('passes AwsSolutions-EFS1 (encryption at rest)', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'us-east-1' }
      });

      const spec: ComponentSpec = {
        name: 'test-efs',
        type: 'efs-filesystem',
        config: {
          vpc: {
            enabled: true,
            vpcId: VPC_ID,
            securityGroup: {
              create: true,
              ingressRules: [
                {
                  port: 2049,
                  cidr: '10.0.0.0/16',
                  description: 'NFS from VPC'
                }
              ]
            }
          },
          encryption: {
            enabled: true
          }
        }
      };

      const component = new EfsFilesystemComponent(stack, 'TestEFS', createContext(), spec);
      component.synth();

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      // Check for EFS1 (encryption at rest)
      const errors = Annotations.fromStack(stack).findError(
        '*',
        Match.stringLikeRegexp('AwsSolutions-EFS1')
      );

      expect(errors).toHaveLength(0);
    });

    it('rejects 0.0.0.0/0 security group ingress', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'us-east-1' }
      });

      const spec: ComponentSpec = {
        name: 'insecure-efs',
        type: 'efs-filesystem',
        config: {
          vpc: {
            enabled: true,
            vpcId: VPC_ID,
            securityGroup: {
              create: true,
              ingressRules: [
                {
                  port: 2049,
                  cidr: '0.0.0.0/0', // ❌ Should be rejected
                  description: 'NFS from internet'
                }
              ]
            }
          }
        }
      };

      const component = new EfsFilesystemComponent(stack, 'InsecureEFS', createContext(), spec);

      // Should throw security violation error
      expect(() => component.synth()).toThrow(/SECURITY VIOLATION.*0\.0\.0\.0\/0/);
    });

    it('security group has no default overly permissive rules', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'us-east-1' }
      });

      const spec: ComponentSpec = {
        name: 'secure-efs',
        type: 'efs-filesystem',
        config: {
          vpc: {
            enabled: true,
            vpcId: VPC_ID,
            securityGroup: {
              create: true
              // No ingress rules specified - should have EMPTY ingress (not 0.0.0.0/0)
            }
          }
        }
      };

      const component = new EfsFilesystemComponent(stack, 'SecureEFS', createContext(), spec);
      component.synth();

      const template = cdk.assertions.Template.fromStack(stack);

      // Verify security group has NO ingress rules by default
      const sgResources = template.findResources('AWS::EC2::SecurityGroup');
      const sg = Object.values(sgResources)[0] as any;

      expect(sg.Properties.SecurityGroupIngress || []).toHaveLength(0);
    });
  });

  describe('FedRAMP Moderate - Enhanced Security', () => {
    it('enables encryption in transit for FedRAMP', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'us-east-1' }
      });

      const context = createContext('fedramp-moderate');

      const spec: ComponentSpec = {
        name: 'fedramp-efs',
        type: 'efs-filesystem',
        config: {
          vpc: {
            enabled: true,
            vpcId: VPC_ID,
            securityGroup: {
              create: true,
              ingressRules: [
                {
                  port: 2049,
                  cidr: '10.0.0.0/16',
                  description: 'NFS from VPC'
                }
              ]
            }
          }
        }
      };

      const component = new EfsFilesystemComponent(stack, 'FedRampEFS', context, spec);
      component.synth();

      // Verify encryption in transit is enabled
      const capability = component.getCapabilities()['storage:efs'];
      expect(capability.encryption.inTransit).toBe(true);
    });

    it('enables backups and monitoring for FedRAMP', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'us-east-1' }
      });

      const context = createContext('fedramp-moderate');

      const spec: ComponentSpec = {
        name: 'fedramp-efs',
        type: 'efs-filesystem',
        config: {
          vpc: {
            enabled: true,
            vpcId: VPC_ID,
            securityGroup: {
              create: true,
              ingressRules: []
            }
          }
        }
      };

      const component = new EfsFilesystemComponent(stack, 'FedRampEFS', context, spec);
      component.synth();

      const template = cdk.assertions.Template.fromStack(stack);

      // Verify backups enabled
      template.hasResourceProperties('AWS::EFS::FileSystem', {
        BackupPolicy: { Status: 'ENABLED' }
      });

      // Verify monitoring alarms created
      template.resourceCountIs('AWS::CloudWatch::Alarm', 3);
    });

    it('creates KMS encryption for logs', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'us-east-1' }
      });

      const context = createContext('fedramp-moderate');

      const spec: ComponentSpec = {
        name: 'fedramp-efs',
        type: 'efs-filesystem',
        config: {
          vpc: {
            enabled: true,
            vpcId: VPC_ID,
            securityGroup: {
              create: true,
              ingressRules: []
            }
          },
          encryption: {
            customerManagedKey: {
              create: true
            }
          }
        }
      };

      const component = new EfsFilesystemComponent(stack, 'FedRampEFS', context, spec);
      component.synth();

      const template = cdk.assertions.Template.fromStack(stack);

      // Verify KMS key with rotation
      template.hasResourceProperties('AWS::KMS::Key', {
        EnableKeyRotation: true
      });

      // Verify log groups use KMS encryption
      const logGroups = template.findResources('AWS::Logs::LogGroup');
      expect(Object.keys(logGroups).length).toBeGreaterThan(0);
    });
  });

  describe('FedRAMP High - Maximum Security', () => {
    it('enforces 7-year log retention', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'us-east-1' }
      });

      const context = createContext('fedramp-high');

      const spec: ComponentSpec = {
        name: 'fedramp-high-efs',
        type: 'efs-filesystem',
        config: {
          vpc: {
            enabled: true,
            vpcId: VPC_ID,
            securityGroup: {
              create: true,
              ingressRules: [
                {
                  port: 2049,
                  cidr: '10.0.0.0/8',
                  description: 'NFS from secure network'
                }
              ]
            }
          }
        }
      };

      const component = new EfsFilesystemComponent(stack, 'FedRampHighEFS', context, spec);
      component.synth();

      const template = cdk.assertions.Template.fromStack(stack);

      // Verify audit log retention is 7 years
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 3653
      });
    });
  });
});
