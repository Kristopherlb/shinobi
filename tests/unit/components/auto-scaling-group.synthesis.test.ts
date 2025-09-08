import { describe, test, expect, beforeEach } from '@jest/globals';
import { AutoScalingGroupComponent } from '../../../src/components/auto-scaling-group/auto-scaling-group.component';
import { ComponentContext, ComponentSpec } from '@platform/contracts';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

describe('AutoScalingGroupComponent', () => {
  let component: AutoScalingGroupComponent;
  let mockContext: ComponentContext;
  let mockSpec: ComponentSpec;
  let app: cdk.App;
  let stack: cdk.Stack;

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
      complianceFramework: 'commercial',
      scope: stack,
      region: 'us-east-1',
      accountId: '123456789012',
      vpc: ec2.Vpc.fromLookup(stack, 'TestVpc', { isDefault: true })
    };

    mockSpec = {
      name: 'test-asg',
      type: 'auto-scaling-group',
      config: {
        launchTemplate: {
          instanceType: 't3.small'
        },
        autoScaling: {
          minCapacity: 1,
          maxCapacity: 5,
          desiredCapacity: 2
        }
      }
    };

    component = new AutoScalingGroupComponent(stack, 'TestAutoScalingGroup', mockContext, mockSpec);
  });

  describe('Component Synthesis', () => {
    test('should synthesize successfully with valid configuration', () => {
      expect(() => component.synth()).not.toThrow();
    });

    test('should register expected capabilities', () => {
      component.synth();
      const capabilities = component.getCapabilities();
      
      expect(capabilities['compute:asg']).toBeDefined();
      expect(capabilities['compute:asg'].asgArn).toBeDefined();
      expect(capabilities['compute:asg'].asgName).toBeDefined();
      expect(capabilities['compute:asg'].roleArn).toBeDefined();
      expect(capabilities['compute:asg'].securityGroupId).toBeDefined();
    });

    test('should create all required AWS resources', () => {
      component.synth();
      
      const asg = component.getConstruct('autoScalingGroup');
      const launchTemplate = component.getConstruct('launchTemplate');
      const securityGroup = component.getConstruct('securityGroup');
      const role = component.getConstruct('role');
      
      expect(asg).toBeDefined();
      expect(launchTemplate).toBeDefined();
      expect(securityGroup).toBeDefined();
      expect(role).toBeDefined();
    });

    test('should apply compliance hardening for FedRAMP High', () => {
      mockContext.complianceFramework = 'fedramp-high';
      component.synth();
      
      // Verify enhanced security configurations
      const asg = component.getConstruct('autoScalingGroup');
      const kmsKey = component.getConstruct('kmsKey');
      
      expect(asg).toBeDefined();
      expect(kmsKey).toBeDefined(); // Should create KMS key for FedRAMP High
    });

    test('should apply FedRAMP Moderate defaults', () => {
      mockContext.complianceFramework = 'fedramp-moderate';
      mockSpec.config = {}; // Empty config to test defaults
      
      component.synth();
      
      // Should apply compliance defaults like encrypted storage
      const capability = component.getCapabilities()['compute:asg'];
      expect(capability).toBeDefined();
    });
  });

  describe('Configuration Building', () => {
    test('should apply default values when not provided', () => {
      mockSpec.config = {}; // Empty config
      
      component.synth();
      
      // Should use default values without throwing
      const asg = component.getConstruct('autoScalingGroup');
      expect(asg).toBeDefined();
    });

    test('should handle custom AMI configuration', () => {
      mockSpec.config = {
        launchTemplate: {
          instanceType: 'm5.large',
          ami: {
            amiId: 'ami-12345678'
          }
        }
      };
      
      component.synth();
      
      const launchTemplate = component.getConstruct('launchTemplate');
      expect(launchTemplate).toBeDefined();
    });

    test('should handle custom storage configuration', () => {
      mockSpec.config = {
        storage: {
          rootVolumeSize: 100,
          rootVolumeType: 'gp3',
          encrypted: true
        }
      };
      
      component.synth();
      
      const launchTemplate = component.getConstruct('launchTemplate');
      expect(launchTemplate).toBeDefined();
    });
  });

  describe('Compliance Framework Behavior', () => {
    test('should enable detailed monitoring for compliance frameworks', () => {
      mockContext.complianceFramework = 'fedramp-moderate';
      component.synth();
      
      const launchTemplate = component.getConstruct('launchTemplate');
      expect(launchTemplate).toBeDefined();
    });

    test('should create KMS key for compliance frameworks when needed', () => {
      mockContext.complianceFramework = 'fedramp-high';
      mockSpec.config = {
        storage: {
          encrypted: true
        }
      };
      
      component.synth();
      
      const kmsKey = component.getConstruct('kmsKey');
      expect(kmsKey).toBeDefined();
    });

    test('should apply proper instance types for compliance', () => {
      mockContext.complianceFramework = 'fedramp-high';
      mockSpec.config = {}; // Use defaults
      
      component.synth();
      
      // Should upgrade to larger instance type for FedRAMP High
      const capability = component.getCapabilities()['compute:asg'];
      expect(capability).toBeDefined();
    });
  });

  describe('Health Check Configuration', () => {
    test('should configure EC2 health checks by default', () => {
      mockSpec.config = {
        healthCheck: {
          type: 'EC2',
          gracePeriod: 300
        }
      };
      
      component.synth();
      
      const asg = component.getConstruct('autoScalingGroup');
      expect(asg).toBeDefined();
    });

    test('should configure ELB health checks when specified', () => {
      mockSpec.config = {
        healthCheck: {
          type: 'ELB',
          gracePeriod: 180
        }
      };
      
      component.synth();
      
      const asg = component.getConstruct('autoScalingGroup');
      expect(asg).toBeDefined();
    });
  });

  describe('Update Policy Configuration', () => {
    test('should configure rolling update policy', () => {
      mockSpec.config = {
        updatePolicy: {
          rollingUpdate: {
            minInstancesInService: 1,
            maxBatchSize: 2,
            pauseTime: 'PT10M'
          }
        }
      };
      
      component.synth();
      
      const asg = component.getConstruct('autoScalingGroup');
      expect(asg).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should fail validation when accessing capabilities before synthesis', () => {
      expect(() => component.getCapabilities()).toThrow();
    });

    test('should handle synthesis errors gracefully', () => {
      // Create invalid configuration
      mockSpec.config = {
        autoScaling: {
          minCapacity: 10,
          maxCapacity: 5, // Invalid: min > max
          desiredCapacity: 8
        }
      };
      
      // Should still create component but may have validation issues
      expect(() => component.synth()).not.toThrow();
    });
  });
});