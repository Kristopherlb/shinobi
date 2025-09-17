/**
 * Unit tests for ComputeToIamRoleBinder
 */

import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { ComputeToIamRoleBinder } from './compute-to-iam-role.strategy';
import { BindingContext } from '../../platform/contracts/platform-binding-trigger-spec';
import { IComponent } from '../../platform/contracts/component-interfaces';

// Mock components for testing
class MockComponent implements IComponent {
  constructor(
    public node: any,
    public type: string,
    public constructs: Record<string, any> = {},
    public capabilities: Record<string, any> = {}
  ) {}

  getType(): string {
    return this.type;
  }

  getConstruct(handle: string): any {
    return this.constructs[handle];
  }

  getCapabilities(): Record<string, any> {
    return this.capabilities;
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
        { id: 'test-instance' },
        'ec2-instance',
        { instance },
        {}
      );

      const targetComponent = new MockComponent(
        { id: 'test-role' },
        'iam-role',
        { role },
        { 'iam:assumeRole': { roleArn: role.roleArn } }
      );

      // Create binding context
      const context: BindingContext = {
        source: sourceComponent,
        target: targetComponent,
        directive: { to: 'test-role' },
        environment: 'test',
        complianceFramework: 'commercial'
      };

      // Execute binding
      const result = binder.bind(context);

      // Verify result
      expect(result.success).toBe(true);
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].type).toBe('AWS::IAM::InstanceProfile');
      expect(result.metadata?.bindingType).toBe('ec2-to-iam-role');

      // Verify CloudFormation template
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::IAM::InstanceProfile', {
        Roles: [{ Ref: 'TestRole' }]
      });
    });

    it('should throw error if source component lacks instance construct', () => {
      const role = new iam.Role(stack, 'TestRole', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
      });

      const sourceComponent = new MockComponent(
        { id: 'test-instance' },
        'ec2-instance',
        {}, // No instance construct
        {}
      );

      const targetComponent = new MockComponent(
        { id: 'test-role' },
        'iam-role',
        { role },
        { 'iam:assumeRole': { roleArn: role.roleArn } }
      );

      const context: BindingContext = {
        source: sourceComponent,
        target: targetComponent,
        directive: { to: 'test-role' },
        environment: 'test',
        complianceFramework: 'commercial'
      };

      const result = binder.bind(context);
      expect(result.success).toBe(false);
      expect(result.error).toContain('does not have an \'instance\' construct handle');
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
        { id: 'test-lambda' },
        'lambda-api',
        { function: lambdaFunction },
        {}
      );

      const targetComponent = new MockComponent(
        { id: 'test-role' },
        'iam-role',
        { role },
        { 'iam:assumeRole': { roleArn: role.roleArn } }
      );

      // Create binding context
      const context: BindingContext = {
        source: sourceComponent,
        target: targetComponent,
        directive: { to: 'test-role' },
        environment: 'test',
        complianceFramework: 'commercial'
      };

      // Execute binding
      const result = binder.bind(context);

      // Verify result
      expect(result.success).toBe(true);
      expect(result.metadata?.bindingType).toBe('lambda-to-iam-role');
      expect(result.metadata?.roleArn).toBe(role.roleArn);
    });
  });

  describe('getCompatibilityMatrix', () => {
    it('should return comprehensive compatibility matrix', () => {
      const matrix = binder.getCompatibilityMatrix();

      expect(matrix).toHaveLength(6);
      expect(matrix.some(entry => 
        entry.sourceType === 'ec2-instance' && 
        entry.targetCapability === 'iam:assumeRole'
      )).toBe(true);
      expect(matrix.some(entry => 
        entry.sourceType === 'lambda-api' && 
        entry.targetCapability === 'iam:assumeRole'
      )).toBe(true);
      expect(matrix.some(entry => 
        entry.sourceType === 'ecs-fargate-service' && 
        entry.targetCapability === 'iam:assumeRole'
      )).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle unsupported source types gracefully', () => {
      const role = new iam.Role(stack, 'TestRole', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
      });

      const sourceComponent = new MockComponent(
        { id: 'test-unsupported' },
        'unsupported-type',
        {},
        {}
      );

      const targetComponent = new MockComponent(
        { id: 'test-role' },
        'iam-role',
        { role },
        { 'iam:assumeRole': { roleArn: role.roleArn } }
      );

      const context: BindingContext = {
        source: sourceComponent,
        target: targetComponent,
        directive: { to: 'test-role' },
        environment: 'test',
        complianceFramework: 'commercial'
      };

      const result = binder.bind(context);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported source type');
    });

    it('should handle missing target capability gracefully', () => {
      const role = new iam.Role(stack, 'TestRole', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
      });

      const sourceComponent = new MockComponent(
        { id: 'test-instance' },
        'ec2-instance',
        {},
        {}
      );

      const targetComponent = new MockComponent(
        { id: 'test-role' },
        'iam-role',
        { role },
        {} // No iam:assumeRole capability
      );

      const context: BindingContext = {
        source: sourceComponent,
        target: targetComponent,
        directive: { to: 'test-role' },
        environment: 'test',
        complianceFramework: 'commercial'
      };

      const result = binder.bind(context);
      expect(result.success).toBe(false);
      expect(result.error).toContain('does not provide iam:assumeRole capability');
    });
  });
});
