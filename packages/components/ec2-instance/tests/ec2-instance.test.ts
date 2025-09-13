/**
 * EC2 Instance Component - Comprehensive Test Suite
 * Tests all functionality including configuration, synthesis, compliance, and capabilities
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { Construct } from 'constructs';
import { Ec2InstanceComponent } from '../ec2-instance.component';
import {
  Ec2InstanceComponentConfigBuilder,
  EC2_INSTANCE_CONFIG_SCHEMA,
  Ec2InstanceConfig
} from '../ec2-instance.builder';
import { ComponentContext, ComponentSpec } from '@platform/contracts';

describe('EC2 Instance Component', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let component: Ec2InstanceComponent;

  let mockContext: ComponentContext;

  const baseSpec: ComponentSpec = {
    name: 'test-instance',
    type: 'ec2-instance',
    config: {}
  };

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1'
      }
    });

    mockContext = {
      serviceName: 'test-service',
      environment: 'test',
      region: 'us-east-1',
      complianceFramework: 'commercial' as 'commercial',
      scope: stack
    };
  });

  describe('Configuration Builder', () => {
    it('should build basic configuration with platform defaults', () => {
      const builder = new Ec2InstanceConfigBuilder(mockContext, baseSpec);
      const config = builder.buildSync();

      expect(config.instanceType).toBe('t3.micro');
      expect(config.ami?.namePattern).toBe('al2023-ami-*-x86_64');
      expect(config.ami?.owner).toBe('amazon');
      expect(config.storage?.rootVolumeSize).toBe(20);
      expect(config.storage?.rootVolumeType).toBe('gp3');
      expect(config.storage?.encrypted).toBe(false);
    });

    it('should apply FedRAMP Moderate compliance defaults', () => {
      const fedrampContext = { ...mockContext, complianceFramework: 'fedramp-moderate' as 'fedramp-moderate' };
      const builder = new Ec2InstanceConfigBuilder(fedrampContext, baseSpec);
      const config = builder.buildSync();

      expect(config.instanceType).toBe('m5.large');
      expect(config.storage?.rootVolumeSize).toBe(50);
      expect(config.storage?.encrypted).toBe(true);
      expect(config.monitoring?.detailed).toBe(true);
      expect(config.monitoring?.cloudWatchAgent).toBe(true);
      expect(config.security?.requireImdsv2).toBe(true);
      expect(config.security?.httpTokens).toBe('required');
    });

    it('should apply FedRAMP High compliance defaults', () => {
      const fedrampHighContext = { ...mockContext, complianceFramework: 'fedramp-high' as 'fedramp-high' };
      const builder = new Ec2InstanceConfigBuilder(fedrampHighContext, baseSpec);
      const config = builder.buildSync();

      expect(config.instanceType).toBe('m5.xlarge');
      expect(config.storage?.rootVolumeSize).toBe(100);
      expect(config.storage?.rootVolumeType).toBe('io2');
      expect(config.storage?.iops).toBe(1000);
      expect(config.storage?.encrypted).toBe(true);
      expect(config.security?.nitroEnclaves).toBe(true);
    });

    it('should merge user configuration with platform defaults', () => {
      const userSpec: ComponentSpec = {
        ...baseSpec,
        config: {
          instanceType: 'c5.large',
          storage: {
            rootVolumeSize: 100,
            encrypted: true
          }
        }
      };

      const builder = new Ec2InstanceConfigBuilder(mockContext, userSpec);
      const config = builder.buildSync();

      expect(config.instanceType).toBe('c5.large'); // User override
      expect(config.storage?.rootVolumeSize).toBe(100); // User override
      expect(config.storage?.encrypted).toBe(true); // User override
      expect(config.ami?.owner).toBe('amazon'); // Platform default
    });
  });

  describe('Component Synthesis', () => {
    it('should synthesize basic EC2 instance in commercial mode', () => {
      component = new Ec2InstanceComponent(stack, 'TestInstance', mockContext, baseSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify EC2 instance is created
      template.hasResourceProperties('AWS::EC2::Instance', {
        InstanceType: 't3.micro',
        IamInstanceProfile: Match.anyValue(),
        SecurityGroupIds: [Match.anyValue()],
        BlockDeviceMappings: Match.arrayWith([
          Match.objectLike({
            DeviceName: '/dev/xvda',
            Ebs: Match.objectLike({
              VolumeSize: 20,
              VolumeType: 'gp3',
              DeleteOnTermination: true
            })
          })
        ])
      });

      // Verify IAM role is created
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Principal: { Service: 'ec2.amazonaws.com' }
            })
          ])
        })
      });

      // Verify security group is created
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: Match.stringLikeRegexp('Security group for.*EC2 instance')
      });
    });

    it('should create KMS key for FedRAMP compliance', () => {
      const fedrampContext = { ...mockContext, complianceFramework: 'fedramp-moderate' as 'fedramp-moderate' };
      component = new Ec2InstanceComponent(stack, 'TestInstance', fedrampContext, baseSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify KMS key is created
      template.hasResourceProperties('AWS::KMS::Key', {
        Description: Match.stringLikeRegexp('EBS encryption key for.*EC2 instance'),
        EnableKeyRotation: false
      });

      // Verify EBS encryption uses the key
      template.hasResourceProperties('AWS::EC2::Instance', {
        BlockDeviceMappings: Match.arrayWith([
          Match.objectLike({
            Ebs: Match.objectLike({
              Encrypted: true,
              KmsKeyId: Match.anyValue()
            })
          })
        ])
      });
    });

    it('should enable key rotation for FedRAMP High', () => {
      const fedrampHighContext = { ...mockContext, complianceFramework: 'fedramp-high' as 'fedramp-high' };
      component = new Ec2InstanceComponent(stack, 'TestInstance', fedrampHighContext, baseSpec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::KMS::Key', {
        EnableKeyRotation: true
      });
    });

    it('should configure instance for compliance monitoring', () => {
      const fedrampContext = { ...mockContext, complianceFramework: 'fedramp-moderate' as 'fedramp-moderate' };
      component = new Ec2InstanceComponent(stack, 'TestInstance', fedrampContext, baseSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify detailed monitoring is enabled
      template.hasResourceProperties('AWS::EC2::Instance', {
        Monitoring: true
      });

      // Verify IMDSv2 is enabled via LaunchTemplate
      template.hasResourceProperties('AWS::EC2::LaunchTemplate', {
        LaunchTemplateData: Match.objectLike({
          MetadataOptions: Match.objectLike({
            HttpTokens: 'required'
          })
        })
      });

      // Verify SSM managed policy is attached
      template.hasResourceProperties('AWS::IAM::Role', {
        ManagedPolicyArns: Match.arrayWith([
          Match.objectLike({
            'Fn::Join': Match.arrayWith([
              Match.arrayWith([
                Match.stringLikeRegexp('.*:iam::aws:policy\\/AmazonSSMManagedInstanceCore.*')
              ])
            ])
          })
        ])
      });
    });

    it('should restrict security group for compliance frameworks', () => {
      const fedrampContext = { ...mockContext, complianceFramework: 'fedramp-moderate' as 'fedramp-moderate' };
      component = new Ec2InstanceComponent(stack, 'TestInstance', fedrampContext, baseSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Security group should have restricted egress (HTTPS only, not all traffic)
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        SecurityGroupEgress: Match.arrayWith([
          Match.objectLike({
            IpProtocol: 'tcp',
            FromPort: 443,
            ToPort: 443,
            CidrIp: '0.0.0.0/0'
          })
        ])
      });

      // Verify egress rules are restricted (should only have HTTPS, not all protocols)
      const securityGroups = template.findResources('AWS::EC2::SecurityGroup');
      const sgValues = Object.values(securityGroups);

      // Check that no security group has unrestricted egress (IpProtocol: -1)
      sgValues.forEach((sg: any) => {
        const egressRules = sg.Properties.SecurityGroupEgress || [];
        const hasUnrestrictedEgress = egressRules.some((rule: any) =>
          rule.IpProtocol === '-1' && rule.CidrIp === '0.0.0.0/0'
        );
        expect(hasUnrestrictedEgress).toBe(false);
      });
    });
  });

  describe('Capabilities', () => {
    beforeEach(() => {
      component = new Ec2InstanceComponent(stack, 'TestInstance', mockContext, baseSpec);
      component.synth();
    });

    it('should provide compute:ec2 capability', () => {
      const capabilities = component.getCapabilities();
      expect(capabilities['compute:ec2']).toBeDefined();
    });

    it('should include required capability properties', () => {
      const capabilities = component.getCapabilities();
      const ec2Capability = capabilities['compute:ec2'];

      expect(ec2Capability.instanceId).toBeDefined();
      expect(ec2Capability.privateIp).toBeDefined();
      expect(ec2Capability.roleArn).toBeDefined();
      expect(ec2Capability.securityGroupId).toBeDefined();
      expect(ec2Capability.availabilityZone).toBeDefined();
    });

    it('should return correct component type', () => {
      expect(component.getType()).toBe('ec2-instance');
    });
  });

  describe('Configuration Validation', () => {
    it('should handle custom AMI configuration', () => {
      const customAmiSpec: ComponentSpec = {
        ...baseSpec,
        config: {
          ami: {
            amiId: 'ami-12345678'
          }
        }
      };

      const builder = new Ec2InstanceConfigBuilder(mockContext, customAmiSpec);
      const config = builder.buildSync();

      expect(config.ami?.amiId).toBe('ami-12345678');
    });

    it('should handle VPC configuration', () => {
      const vpcSpec: ComponentSpec = {
        ...baseSpec,
        config: {
          vpc: {
            vpcId: 'vpc-12345678',
            subnetId: 'subnet-12345678',
            securityGroupIds: ['sg-12345678']
          }
        }
      };

      const builder = new Ec2InstanceConfigBuilder(mockContext, vpcSpec);
      const config = builder.buildSync();

      expect(config.vpc?.vpcId).toBe('vpc-12345678');
      expect(config.vpc?.subnetId).toBe('subnet-12345678');
      expect(config.vpc?.securityGroupIds).toEqual(['sg-12345678']);
    });

    it('should handle user data configuration', () => {
      const userDataSpec: ComponentSpec = {
        ...baseSpec,
        config: {
          userData: {
            script: '#!/bin/bash\necho "Hello World"'
          }
        }
      };

      const builder = new Ec2InstanceConfigBuilder(mockContext, userDataSpec);
      const config = builder.buildSync();

      expect(config.userData?.script).toBe('#!/bin/bash\necho "Hello World"');
    });

    it('should handle key pair configuration', () => {
      const keyPairSpec: ComponentSpec = {
        ...baseSpec,
        config: {
          keyPair: {
            keyName: 'my-key-pair'
          }
        }
      };

      const builder = new Ec2InstanceConfigBuilder(mockContext, keyPairSpec);
      const config = builder.buildSync();

      expect(config.keyPair?.keyName).toBe('my-key-pair');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when accessing capabilities before synthesis', () => {
      component = new Ec2InstanceComponent(stack, 'TestInstance', mockContext, baseSpec);
      expect(() => component.getCapabilities()).toThrow();
    });

    it('should validate and reject invalid instance types', () => {
      const invalidSpec: ComponentSpec = {
        ...baseSpec,
        config: {
          instanceType: 'invalid.type'
        }
      };

      component = new Ec2InstanceComponent(stack, 'TestInstance', mockContext, invalidSpec);

      // Component should validate configuration and throw on invalid instance types
      expect(() => component.synth()).toThrow();
    });
  });

  describe('Compliance Hardening', () => {
    it('should apply commercial hardening', () => {
      component = new Ec2InstanceComponent(stack, 'TestInstance', mockContext, baseSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should include CloudWatch agent policy
      template.hasResourceProperties('AWS::IAM::Role', {
        ManagedPolicyArns: Match.arrayWith([
          Match.objectLike({
            'Fn::Join': Match.arrayWith([
              Match.arrayWith([
                Match.stringLikeRegexp('.*:iam::aws:policy\\/CloudWatchAgentServerPolicy.*')
              ])
            ])
          })
        ])
      });
    });

    it('should apply FedRAMP Moderate hardening', () => {
      const fedrampContext = { ...mockContext, complianceFramework: 'fedramp-moderate' as 'fedramp-moderate' };
      component = new Ec2InstanceComponent(stack, 'TestInstance', fedrampContext, baseSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should include SSM and CloudWatch policies
      template.hasResourceProperties('AWS::IAM::Role', {
        ManagedPolicyArns: Match.arrayWith([
          Match.objectLike({
            'Fn::Join': Match.arrayWith([
              Match.arrayWith([
                Match.stringLikeRegexp('.*:iam::aws:policy\\/AmazonSSMManagedInstanceCore.*')
              ])
            ])
          }),
          Match.objectLike({
            'Fn::Join': Match.arrayWith([
              Match.arrayWith([
                Match.stringLikeRegexp('.*:iam::aws:policy\\/CloudWatchAgentServerPolicy.*')
              ])
            ])
          })
        ])
      });
    });

    it('should apply FedRAMP High hardening with additional security', () => {
      const fedrampHighContext = { ...mockContext, complianceFramework: 'fedramp-high' as 'fedramp-high' };
      component = new Ec2InstanceComponent(stack, 'TestInstance', fedrampHighContext, baseSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should have STIG compliance tags
      template.hasResourceProperties('AWS::EC2::Instance', {
        Tags: Match.arrayWith([
          Match.objectLike({
            Key: 'STIGCompliant',
            Value: 'true'
          })
        ])
      });

      template.hasResourceProperties('AWS::EC2::Instance', {
        Tags: Match.arrayWith([
          Match.objectLike({
            Key: 'ImmutableInfrastructure',
            Value: 'true'
          })
        ])
      });
    });
  });
});