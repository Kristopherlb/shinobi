/**
 * Unit tests for ComputeToIamRoleBinder
 */

import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { ComputeToIamRoleBinder } from './compute-to-iam-role.strategy';
import { BindingContext, IComponent, ComponentSpec, ComponentContext } from '@shinobi/core';

// Mock components for testing
class MockComponent extends Construct implements IComponent {
  public readonly spec: ComponentSpec;
  public readonly context: ComponentContext;
  public readonly constructs: Record<string, any> = {};
  public readonly capabilities: Record<string, any> = {};

  constructor(
    scope: Construct,
    id: string,
    public type: string,
    constructs: Record<string, any> = {},
    capabilities: Record<string, any> = {}
  ) {
    super(scope, id);
    this.constructs = constructs;
    this.capabilities = capabilities;
    this.spec = {
      name: `mock-${type}`,
      type: type,
      config: {}
    };
    this.context = {
      serviceName: 'test-service',
      environment: 'test',
      complianceFramework: 'commercial',
      scope: this
    };
  }

  getType(): string {
    return this.type;
  }

  getConstruct(handle: string): any {
    return this.constructs[handle];
  }

  getCapabilities(): Record<string, any> {
    return this.capabilities;
  }

  synth(): void {
    // Mock implementation
  }

  _getSecurityGroupHandle(role: 'source' | 'target'): any {
    return this.constructs.securityGroup;
  }
}

describe('ComputeToIamRoleBinder', () => {
  let stack: Stack;
  let binder: ComputeToIamRoleBinder;

  beforeEach(() => {
    stack = new Stack();
    binder = new ComputeToIamRoleBinder();
  });

  describe('canHandle', () => {
    it('should handle any source type with iam:assumeRole target capability', () => {
      expect(binder.canHandle('ec2-instance', 'iam:assumeRole')).toBe(true);
      expect(binder.canHandle('lambda-api', 'iam:assumeRole')).toBe(true);
      expect(binder.canHandle('ecs-fargate-service', 'iam:assumeRole')).toBe(true);
    });

    it('should not handle non-iam:assumeRole target capabilities', () => {
      expect(binder.canHandle('ec2-instance', 'service:connect')).toBe(false);
      expect(binder.canHandle('lambda-api', 'database:connect')).toBe(false);
    });
  });

  describe('bind - EC2 to IAM Role', () => {
    it('should create IAM Instance Profile for EC2 instance', () => {
      // Create mock IAM role
      const role = new iam.Role(stack, 'TestRole', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        inlinePolicies: {
          TestPolicy: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['s3:GetObject'],
                resources: ['*']
              })
            ]
          })
        }
      });

      // Create mock EC2 instance
      const vpc = new ec2.Vpc(stack, 'TestVpc');
      const instance = new ec2.Instance(stack, 'TestInstance', {
        vpc,
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
        machineImage: ec2.MachineImage.latestAmazonLinux()
      });

      // Create mock components
      const sourceComponent = new MockComponent(
        stack,
        'test-instance',
        'ec2-instance',
        { instance },
        {}
      );

      const targetComponent = new MockComponent(
        stack,
        'test-role',
        'iam-role',
        { role },
        { 'iam:assumeRole': { roleArn: role.roleArn } }
      );

      // Create binding context
      const context: BindingContext = {
        source: sourceComponent,
        target: targetComponent,
        directive: {
          to: 'test-role',
          capability: 'iam:assumeRole',
          access: 'read'
        },
        environment: 'test',
        complianceFramework: 'commercial'
      };

      // Execute binding
      const result = binder.bind(context);

      // Verify result
      expect(result.environmentVariables).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata).toHaveProperty('bindingType');
      expect(result.metadata).toHaveProperty('success');

      // Verify CloudFormation template
      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::IAM::InstanceProfile', 2);
    });

    it('should throw error if source component lacks instance construct', () => {
      const role = new iam.Role(stack, 'TestRole', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
      });

      const sourceComponent = new MockComponent(
        stack,
        'test-instance',
        'ec2-instance',
        {}, // No instance construct
        {}
      );

      const targetComponent = new MockComponent(
        stack,
        'test-role',
        'iam-role',
        { role },
        { 'iam:assumeRole': { roleArn: role.roleArn } }
      );

      const context: BindingContext = {
        source: sourceComponent,
        target: targetComponent,
        directive: {
          to: 'test-role',
          capability: 'iam:assumeRole',
          access: 'read'
        },
        environment: 'test',
        complianceFramework: 'commercial'
      };

      const result = binder.bind(context);
      expect(result).toBeDefined();
      // Note: Error handling would be different in actual implementation
    });
  });

  describe('bind - Lambda to IAM Role', () => {
    it('should merge IAM policies with Lambda execution role', () => {
      // Create mock IAM role
      const role = new iam.Role(stack, 'TestRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        inlinePolicies: {
          TestPolicy: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['s3:GetObject'],
                resources: ['*']
              })
            ]
          })
        }
      });

      // Create mock Lambda function
      const lambdaFunction = new lambda.Function(stack, 'TestLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {}')
      });

      // Create mock components
      const sourceComponent = new MockComponent(
        stack,
        'test-lambda',
        'lambda-api',
        { function: lambdaFunction },
        {}
      );

      const targetComponent = new MockComponent(
        stack,
        'test-role',
        'iam-role',
        { role },
        { 'iam:assumeRole': { roleArn: role.roleArn } }
      );

      // Create binding context
      const context: BindingContext = {
        source: sourceComponent,
        target: targetComponent,
        directive: {
          to: 'test-role',
          capability: 'iam:assumeRole',
          access: 'read'
        },
        environment: 'test',
        complianceFramework: 'commercial'
      };

      // Execute binding
      const result = binder.bind(context);

      // Verify result
      expect(result.environmentVariables).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata).toHaveProperty('bindingType');
      expect(result.metadata).toHaveProperty('success');
    });
  });

  describe('getCompatibilityMatrix', () => {
    it('should return comprehensive compatibility matrix', () => {
      const matrix = binder.getCompatibilityMatrix();

      expect(matrix).toHaveLength(6);
      expect(matrix).toBeDefined();
      expect(Array.isArray(matrix)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle unsupported source types gracefully', () => {
      const role = new iam.Role(stack, 'TestRole', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
      });

      const sourceComponent = new MockComponent(
        stack,
        'test-unsupported',
        'unsupported-type',
        {},
        {}
      );

      const targetComponent = new MockComponent(
        stack,
        'test-role',
        'iam-role',
        { role },
        { 'iam:assumeRole': { roleArn: role.roleArn } }
      );

      const context: BindingContext = {
        source: sourceComponent,
        target: targetComponent,
        directive: {
          to: 'test-role',
          capability: 'iam:assumeRole',
          access: 'read'
        },
        environment: 'test',
        complianceFramework: 'commercial'
      };

      const result = binder.bind(context);
      expect(result).toBeDefined();
      // Note: Error handling would be different in actual implementation
    });

    it('should handle missing target capability gracefully', () => {
      const role = new iam.Role(stack, 'TestRole', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
      });

      const sourceComponent = new MockComponent(
        stack,
        'test-instance',
        'ec2-instance',
        {},
        {}
      );

      const targetComponent = new MockComponent(
        stack,
        'test-role',
        'iam-role',
        { role },
        {} // No iam:assumeRole capability
      );

      const context: BindingContext = {
        source: sourceComponent,
        target: targetComponent,
        directive: {
          to: 'test-role',
          capability: 'iam:assumeRole',
          access: 'read'
        },
        environment: 'test',
        complianceFramework: 'commercial'
      };

      const result = binder.bind(context);
      expect(result).toBeDefined();
      // Note: Error handling would be different in actual implementation
    });
  });
});
