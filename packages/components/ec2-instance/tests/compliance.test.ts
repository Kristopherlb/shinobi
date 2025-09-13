/**
 * EC2 Instance Compliance Tests
 * 
 * Tests compliance requirements for FedRAMP Moderate and High frameworks
 * Validates security controls, encryption, monitoring, and audit requirements
 */

import { Template } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { Ec2InstanceComponent } from '../ec2-instance.component';
import { ComponentContext, ComponentSpec } from '../../../../src/platform/contracts';

describe('EC2 Instance Compliance Tests', () => {
  let stack: Stack;
  let context: ComponentContext;

  beforeEach(() => {
    stack = new Stack();
    context = {
      serviceName: 'test-service',
      environment: 'test',
      complianceFramework: 'commercial',
      scope: stack,
      region: 'us-east-1',
      accountId: '123456789012'
    };
  });

  describe('FedRAMP Moderate Compliance', () => {
    beforeEach(() => {
      context.complianceFramework = 'fedramp-moderate';
    });

    test('should create customer-managed KMS key for encryption', () => {
      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {
          storage: {
            encrypted: true
          }
        }
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should create KMS key for encryption
      template.hasResourceProperties('AWS::KMS::Key', {
        Description: 'EBS encryption key for test-instance EC2 instance',
        KeyUsage: 'ENCRYPT_DECRYPT',
        KeySpec: 'SYMMETRIC_DEFAULT'
      });

      // Should enable key rotation for FedRAMP Moderate
      template.hasResourceProperties('AWS::KMS::Key', {
        EnableKeyRotation: true
      });
    });

    test('should configure EBS encryption with customer-managed key', () => {
      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {
          storage: {
            encrypted: true,
            rootVolumeSize: 50
          }
        }
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should create EBS volume with encryption
      template.hasResourceProperties('AWS::EC2::Instance', {
        BlockDeviceMappings: [
          {
            DeviceName: '/dev/xvda',
            Ebs: {
              VolumeSize: 50,
              Encrypted: true,
              KmsKeyId: {
                Ref: expect.stringMatching(/TestInstance.*KmsKey/)
              }
            }
          }
        ]
      });
    });

    test('should configure SSM agent for compliance', () => {
      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {}
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should create IAM role with SSM managed policy
      template.hasResourceProperties('AWS::IAM::Role', {
        ManagedPolicyArns: [
          'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore'
        ]
      });
    });

    test('should apply compliance-specific tags', () => {
      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {}
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should apply compliance tags
      template.hasResourceProperties('AWS::EC2::Instance', {
        Tags: [
          {
            Key: 'service-name',
            Value: 'test-service'
          },
          {
            Key: 'environment',
            Value: 'test'
          },
          {
            Key: 'compliance-framework',
            Value: 'fedramp-moderate'
          },
          {
            Key: 'STIGCompliant',
            Value: 'true'
          }
        ]
      });
    });

    test('should configure CloudWatch alarms for monitoring', () => {
      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {}
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should create CPU utilization alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'test-service-test-instance-cpu-high',
        AlarmDescription: 'High CPU utilization for EC2 instance test-instance',
        MetricName: 'CPUUtilization',
        Namespace: 'AWS/EC2',
        Threshold: 80,
        EvaluationPeriods: 3
      });

      // Should create system status check alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'test-service-test-instance-system-check-failed',
        MetricName: 'StatusCheckFailed_System',
        Threshold: 1
      });

      // Should create instance status check alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'test-service-test-instance-instance-check-failed',
        MetricName: 'StatusCheckFailed_Instance',
        Threshold: 1
      });
    });
  });

  describe('FedRAMP High Compliance', () => {
    beforeEach(() => {
      context.complianceFramework = 'fedramp-high';
    });

    test('should apply enhanced security hardening', () => {
      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {}
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should apply FedRAMP High specific tags
      template.hasResourceProperties('AWS::EC2::Instance', {
        Tags: [
          {
            Key: 'compliance-framework',
            Value: 'fedramp-high'
          },
          {
            Key: 'STIGCompliant',
            Value: 'true'
          },
          {
            Key: 'ImmutableInfrastructure',
            Value: 'true'
          }
        ]
      });
    });

    test('should enforce IMDSv2 for security', () => {
      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {
          security: {
            requireImdsv2: true,
            httpTokens: 'required'
          }
        }
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should enforce IMDSv2
      template.hasResourceProperties('AWS::EC2::Instance', {
        MetadataOptions: {
          HttpTokens: 'required',
          HttpEndpoint: 'enabled'
        }
      });
    });

    test('should configure enhanced monitoring thresholds', () => {
      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {
          monitoring: {
            detailed: true
          }
        }
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should enable detailed monitoring
      template.hasResourceProperties('AWS::EC2::Instance', {
        Monitoring: true
      });
    });
  });

  describe('Commercial Compliance', () => {
    test('should use standard configuration for commercial', () => {
      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {}
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should not create KMS key by default
      template.resourceCountIs('AWS::KMS::Key', 0);

      // Should apply commercial tags
      template.hasResourceProperties('AWS::EC2::Instance', {
        Tags: [
          {
            Key: 'compliance-framework',
            Value: 'commercial'
          }
        ]
      });
    });
  });

  describe('Security Group Compliance', () => {
    test('should restrict SSH access for compliance frameworks', () => {
      context.complianceFramework = 'fedramp-moderate';

      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {}
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should create security group with VPC-restricted SSH access
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        SecurityGroupIngress: [
          {
            IpProtocol: 'tcp',
            FromPort: 22,
            ToPort: 22,
            Description: 'SSH access from VPC only'
          }
        ]
      });
    });

    test('should allow unrestricted SSH for commercial', () => {
      context.complianceFramework = 'commercial';

      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {}
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should allow SSH from anywhere for commercial
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        SecurityGroupIngress: [
          {
            IpProtocol: 'tcp',
            FromPort: 22,
            ToPort: 22,
            CidrIp: '0.0.0.0/0',
            Description: 'SSH access'
          }
        ]
      });
    });
  });

  describe('IAM Role Compliance', () => {
    test('should create least-privilege IAM role', () => {
      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {}
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should create IAM role for EC2
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'ec2.amazonaws.com'
              },
              Action: 'sts:AssumeRole'
            }
          ]
        }
      });

      // Should create instance profile
      template.hasResourceProperties('AWS::IAM::InstanceProfile', {
        Roles: [
          {
            Ref: expect.stringMatching(/TestInstance.*Role/)
          }
        ]
      });
    });
  });
});
