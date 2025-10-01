/**
 * EC2 Instance Observability Tests
 * 
 * Tests observability features including CloudWatch alarms, logging, and monitoring
 * Validates compliance with Platform OpenTelemetry Observability Standard
 */

import { Template } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { Ec2InstanceComponent } from '../ec2-instance.component.js';
import { ComponentContext, ComponentSpec } from '../../@shinobi/core.js';

describe('EC2 Instance Observability Tests', () => {
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

  describe('CloudWatch Alarms', () => {
    test('should create CPU utilization alarm', () => {
      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {}
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'test-service-test-instance-cpu-high',
        AlarmDescription: 'High CPU utilization for EC2 instance test-instance',
        MetricName: 'CPUUtilization',
        Namespace: 'AWS/EC2',
        Statistic: 'Average',
        Threshold: 80,
        ComparisonOperator: 'GreaterThanThreshold',
        EvaluationPeriods: 3,
        DatapointsToAlarm: 2,
        Period: 300,
        TreatMissingData: 'notBreaching'
      });
    });

    test('should create system status check alarm', () => {
      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {}
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'test-service-test-instance-system-check-failed',
        AlarmDescription: 'System status check failed for EC2 instance test-instance',
        MetricName: 'StatusCheckFailed_System',
        Namespace: 'AWS/EC2',
        Statistic: 'Maximum',
        Threshold: 1,
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        EvaluationPeriods: 2,
        DatapointsToAlarm: 1,
        Period: 60,
        TreatMissingData: 'notBreaching'
      });
    });

    test('should create instance status check alarm', () => {
      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {}
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'test-service-test-instance-instance-check-failed',
        AlarmDescription: 'Instance status check failed for EC2 instance test-instance',
        MetricName: 'StatusCheckFailed_Instance',
        Namespace: 'AWS/EC2',
        Statistic: 'Maximum',
        Threshold: 1,
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        EvaluationPeriods: 2,
        DatapointsToAlarm: 1,
        Period: 60,
        TreatMissingData: 'notBreaching'
      });
    });

    test('should configure FedRAMP compliance alarm actions', () => {
      context.complianceFramework = 'fedramp-moderate';

      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {}
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should have alarm actions for compliance frameworks
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmActions: [
          {
            'Fn::Sub': 'arn:aws:sns:${AWS::Region}:${AWS::AccountId}:fedramp-alerts'
          }
        ]
      });
    });
  });

  describe('Monitoring Configuration', () => {
    test('should enable detailed monitoring when configured', () => {
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

      template.hasResourceProperties('AWS::EC2::Instance', {
        Monitoring: true
      });
    });

    test('should disable detailed monitoring by default', () => {
      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {}
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::EC2::Instance', {
        Monitoring: false
      });
    });
  });

  describe('Logging Configuration', () => {
    test('should configure CloudWatch agent for compliance frameworks', () => {
      context.complianceFramework = 'fedramp-moderate';

      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {}
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should create IAM role with CloudWatch permissions
      template.hasResourceProperties('AWS::IAM::Role', {
        Policies: [
          {
            PolicyDocument: {
              Statement: [
                {
                  Effect: 'Allow',
                  Actions: [
                    'cloudwatch:PutMetricData',
                    'logs:PutLogEvents',
                    'logs:CreateLogGroup',
                    'logs:CreateLogStream'
                  ],
                  Resources: ['*']
                }
              ]
            }
          }
        ]
      });
    });

    test('should configure SSM agent installation in user data', () => {
      context.complianceFramework = 'fedramp-moderate';

      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {}
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should include SSM agent installation in user data
      template.hasResourceProperties('AWS::EC2::Instance', {
        UserData: {
          'Fn::Base64': expect.stringContaining('amazon-ssm-agent')
        }
      });
    });
  });

  describe('Security Hardening', () => {
    test('should configure STIG compliance for FedRAMP High', () => {
      context.complianceFramework = 'fedramp-high';

      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {}
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should include STIG hardening commands in user data
      template.hasResourceProperties('AWS::EC2::Instance', {
        UserData: {
          'Fn::Base64': expect.stringContaining('aide')
        }
      });

      // Should include auditd configuration
      template.hasResourceProperties('AWS::EC2::Instance', {
        UserData: {
          'Fn::Base64': expect.stringContaining('auditd')
        }
      });
    });

    test('should configure security agents for compliance', () => {
      context.complianceFramework = 'fedramp-high';

      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {}
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should install security agents
      template.hasResourceProperties('AWS::EC2::Instance', {
        UserData: {
          'Fn::Base64': expect.stringContaining('systemctl disable bluetooth')
        }
      });

      // Should configure log forwarding
      template.hasResourceProperties('AWS::EC2::Instance', {
        UserData: {
          'Fn::Base64': expect.stringContaining('rsyslog')
        }
      });
    });
  });

  describe('Construct Registration', () => {
    test('should register all required constructs', () => {
      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {}
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      // Should register main constructs
      expect(component.getConstruct('instance')).toBeDefined();
      expect(component.getConstruct('securityGroup')).toBeDefined();
      expect(component.getConstruct('role')).toBeDefined();

      // Should register alarm constructs
      expect(component.getConstruct('cpuAlarm')).toBeDefined();
      expect(component.getConstruct('systemCheckAlarm')).toBeDefined();
      expect(component.getConstruct('instanceCheckAlarm')).toBeDefined();
    });

    test('should register KMS key when encryption is enabled', () => {
      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {
          storage: {
            encrypted: true
          }
        }
      };

      context.complianceFramework = 'fedramp-moderate';

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      expect(component.getConstruct('kmsKey')).toBeDefined();
    });
  });

  describe('Capability Registration', () => {
    test('should register compute capability', () => {
      const spec: ComponentSpec = {
        name: 'test-instance',
        type: 'ec2-instance',
        config: {}
      };

      const component = new Ec2InstanceComponent(stack, 'TestInstance', context, spec);
      component.synth();

      const capabilities = component.getCapabilities();

      expect(capabilities['compute:ec2']).toBeDefined();
      expect(capabilities['compute:ec2'].instanceId).toBeDefined();
      expect(capabilities['compute:ec2'].privateIp).toBeDefined();
      expect(capabilities['compute:ec2'].roleArn).toBeDefined();
      expect(capabilities['compute:ec2'].securityGroupId).toBeDefined();
    });
  });
});
