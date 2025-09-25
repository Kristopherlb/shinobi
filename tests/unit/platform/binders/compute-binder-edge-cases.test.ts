/**
 * Edge case tests for compute binder strategies
 * Tests the fixes for IAM role binding and security group binding edge cases
 */

import { Stack } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { ComputeToIamRoleBinder } from '../../../../packages/core/src/bindings/strategies/compute-to-iam-role.strategy';
import { ComputeToSecurityGroupImportBinder } from '../../../../packages/core/_temp-problematic-files/bindings/strategies/compute-to-security-group-import.strategy';
import { BindingContext, BindingResult } from '../../../../packages/core/src/platform/contracts/platform-binding-trigger-spec';

// Mock components for testing
class MockComponent {
  constructor(
    public spec: { name: string; type: string; config: any },
    private construct: any,
    private existingRole?: iam.Role
  ) { }

  getType(): string {
    return this.spec.type;
  }

  getName(): string {
    return this.spec.name;
  }

  get node() {
    return { id: this.spec.name };
  }

  getCapabilities(): any {
    return {
      'iam:assumeRole': {
        roleArn: 'arn:aws:iam::123456789012:role/test-role'
      }
    };
  }

  getConstruct(handle: string): any {
    if (handle === 'function' && this.existingRole) {
      return {
        role: this.existingRole,
        isBoundToVpc: () => false
      };
    }
    return this.construct;
  }
}

// Helper function to create test context
function createTestContext(complianceFramework: string = 'commercial'): BindingContext {
  const stack = new Stack();
  return {
    source: new MockComponent(
      { name: 'test-lambda', type: 'lambda-api', config: {} },
      new lambda.Function(stack, 'TestLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {}')
      })
    ),
    target: new MockComponent(
      { name: 'test-target', type: 'test-type', config: {} },
      null // Will be set per test
    ),
    directive: {
      access: 'read',
      env: {},
      options: {}
    },
    environment: 'us-west-2',
    complianceFramework
  };
}

describe('ComputeToIamRoleBinder Edge Cases', () => {
  let strategy: ComputeToIamRoleBinder;
  let stack: Stack;

  beforeEach(() => {
    strategy = new ComputeToIamRoleBinder();
    stack = new Stack();
  });

  describe('IAM Role Trust Policy Updates', () => {
    it('should update trust policy when Lambda has existing role', () => {
      const context = createTestContext();

      // Create target IAM role
      const targetRole = new iam.Role(stack, 'TargetRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        inlinePolicies: {
          'TestPolicy': new iam.PolicyDocument({
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

      // Create Lambda with existing role
      const existingRole = new iam.Role(stack, 'ExistingRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
      });

      const lambdaFunction = new lambda.Function(stack, 'TestLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {}'),
        role: existingRole
      });

      context.source = new MockComponent(
        { name: 'test-lambda', type: 'lambda-api', config: {} },
        lambdaFunction,
        existingRole
      );
      context.target = new MockComponent(
        { name: 'test-role', type: 'iam-role', config: {} },
        targetRole
      );

      const result = strategy.bind(context);

      expect(result.metadata?.success).toBe(true);
      expect(result.metadata?.policyMerged).toBe(true);
      expect(result.metadata?.trustPolicyUpdated).toBe(true);
      expect(result.environmentVariables).toHaveProperty('IAM_ROLE_ARN');
    });

    it('should update trust policy when Lambda has no existing role', () => {
      const context = createTestContext();

      // Create target IAM role
      const targetRole = new iam.Role(stack, 'TargetRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        inlinePolicies: {
          'TestPolicy': new iam.PolicyDocument({
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

      // Create Lambda without existing role
      const lambdaFunction = new lambda.Function(stack, 'TestLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {}')
      });

      context.source = new MockComponent(
        { name: 'test-lambda', type: 'lambda-api', config: {} },
        lambdaFunction
      );
      context.target = new MockComponent(
        { name: 'test-role', type: 'iam-role', config: {} },
        targetRole
      );

      const result = strategy.bind(context);

      expect(result.metadata?.success).toBe(true);
      expect(result.metadata?.policyMerged).toBe(false);
      expect(result.metadata?.trustPolicyUpdated).toBe(true);
      expect(result.environmentVariables).toHaveProperty('IAM_ROLE_ARN');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing Lambda construct gracefully', () => {
      const context = createTestContext();
      context.source = new MockComponent(
        { name: 'test-lambda', type: 'lambda-api', config: {} },
        null // No construct
      );
      context.target = new MockComponent(
        { name: 'test-role', type: 'iam-role', config: {} },
        new iam.Role(stack, 'TargetRole', {
          assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
        })
      );

      const result = strategy.bind(context);

      expect(result.metadata?.success).toBe(false);
      expect(result.metadata?.error).toContain('Failed to bind');
      expect(result.environmentVariables).toEqual({});
    });

    it('should handle missing IAM role construct gracefully', () => {
      const context = createTestContext();
      context.target = new MockComponent(
        { name: 'test-role', type: 'iam-role', config: {} },
        null // No construct
      );

      const result = strategy.bind(context);

      expect(result.metadata?.success).toBe(false);
      expect(result.metadata?.error).toContain('Failed to bind');
      expect(result.environmentVariables).toEqual({});
    });

    it('should handle unsupported source types', () => {
      const context = createTestContext();
      context.source = new MockComponent(
        { name: 'test-unsupported', type: 'unsupported-type', config: {} },
        new lambda.Function(stack, 'TestLambda', {
          runtime: lambda.Runtime.NODEJS_18_X,
          handler: 'index.handler',
          code: lambda.Code.fromInline('exports.handler = async () => {}')
        })
      );
      context.target = new MockComponent(
        { name: 'test-role', type: 'iam-role', config: {} },
        new iam.Role(stack, 'TargetRole', {
          assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
        })
      );

      const result = strategy.bind(context);

      expect(result.metadata?.success).toBe(false);
      expect(result.metadata?.error).toContain('Unsupported source type');
      expect(result.environmentVariables).toEqual({});
    });
  });
});

describe('ComputeToSecurityGroupImportBinder Edge Cases', () => {
  let strategy: ComputeToSecurityGroupImportBinder;
  let stack: Stack;

  beforeEach(() => {
    strategy = new ComputeToSecurityGroupImportBinder();
    stack = new Stack();
  });

  describe('Lambda VPC Binding Edge Cases', () => {
    it('should successfully bind Lambda in VPC to security group', () => {
      const context = createTestContext();

      // Create VPC and security group
      const vpc = new ec2.Vpc(stack, 'TestVpc');
      const securityGroup = new ec2.SecurityGroup(stack, 'TestSecurityGroup', {
        vpc,
        description: 'Test security group'
      });

      // Create Lambda in VPC
      const lambdaFunction = new lambda.Function(stack, 'TestLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {}'),
        vpc
      });

      // Create a mock Lambda function that reports as bound to VPC
      const mockLambdaFunction = {
        ...lambdaFunction,
        isBoundToVpc: () => true,
        connections: lambdaFunction.connections
      };

      context.source = new MockComponent(
        { name: 'test-lambda', type: 'lambda-api', config: {} },
        mockLambdaFunction
      );
      context.target = new MockComponent(
        { name: 'test-sg', type: 'security-group-import', config: {} },
        securityGroup
      );

      const result = strategy.bind(context);

      expect(result.success).toBe(true);
      expect(result.metadata?.bindingType).toBe('lambda-to-security-group-import');
      expect(result.metadata?.requiresVpc).toBe(false);
    });

    it('should throw error when Lambda is not in VPC', () => {
      const context = createTestContext();

      // Create VPC and security group
      const vpc = new ec2.Vpc(stack, 'TestVpc');
      const securityGroup = new ec2.SecurityGroup(stack, 'TestSecurityGroup', {
        vpc,
        description: 'Test security group'
      });

      // Create Lambda not in VPC
      const lambdaFunction = new lambda.Function(stack, 'TestLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {}')
      });

      // Create a mock Lambda function that reports as not bound to VPC
      const mockLambdaFunction = {
        ...lambdaFunction,
        isBoundToVpc: () => false,
        connections: lambdaFunction.connections
      };

      context.source = new MockComponent(
        { name: 'test-lambda', type: 'lambda-api', config: {} },
        mockLambdaFunction
      );
      context.target = new MockComponent(
        { name: 'test-sg', type: 'security-group-import', config: {} },
        securityGroup
      );

      expect(() => strategy.bind(context)).toThrow(
        'Cannot bind security group: Lambda test-lambda is not in a VPC'
      );
    });

    it('should handle missing Lambda construct gracefully', () => {
      const context = createTestContext();
      context.source = new MockComponent(
        { name: 'test-lambda', type: 'lambda-api', config: {} },
        null // No construct
      );
      context.target = new MockComponent(
        { name: 'test-sg', type: 'security-group-import', config: {} },
        new ec2.SecurityGroup(stack, 'TestSecurityGroup', {
          vpc: new ec2.Vpc(stack, 'TestVpc'),
          description: 'Test security group'
        })
      );

      expect(() => strategy.bind(context)).toThrow(
        'Source component test-lambda does not have a \'function\' construct handle'
      );
    });
  });

  describe('EC2 Instance Binding', () => {
    it('should bind EC2 instance to security group', () => {
      const context = createTestContext();

      // Create VPC and security group
      const vpc = new ec2.Vpc(stack, 'TestVpc');
      const securityGroup = new ec2.SecurityGroup(stack, 'TestSecurityGroup', {
        vpc,
        description: 'Test security group'
      });

      // Create EC2 instance
      const instance = new ec2.Instance(stack, 'TestInstance', {
        vpc,
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
        machineImage: ec2.MachineImage.latestAmazonLinux2()
      });

      context.source = new MockComponent(
        { name: 'test-ec2', type: 'ec2-instance', config: {} },
        instance
      );
      context.target = new MockComponent(
        { name: 'test-sg', type: 'security-group-import', config: {} },
        securityGroup
      );

      const result = strategy.bind(context);

      expect(result.success).toBe(true);
      expect(result.metadata?.bindingType).toBe('ec2-to-security-group-import');
      expect(result.metadata?.securityGroupId).toBe(securityGroup.securityGroupId);
    });
  });
});

describe('Compliance Framework Edge Cases', () => {
  it('should handle different compliance frameworks correctly', () => {
    const frameworks = ['commercial', 'fedramp-moderate', 'fedramp-high'];

    frameworks.forEach(framework => {
      const context = createTestContext(framework);

      // Test IAM role binding
      const iamStrategy = new ComputeToIamRoleBinder();
      const targetRole = new iam.Role(new Stack(), 'TargetRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
      });

      context.target = new MockComponent(
        { name: 'test-role', type: 'iam-role', config: {} },
        targetRole
      );

      const iamResult = iamStrategy.bind(context);
      expect(iamResult.metadata?.success).toBe(true);
    });
  });
});

describe('Cross-Account and Cross-Region Edge Cases', () => {
  it('should handle different regions correctly', () => {
    const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];

    regions.forEach(region => {
      const context = createTestContext();
      context.environment = region;

      // Test IAM role binding
      const iamStrategy = new ComputeToIamRoleBinder();
      const targetRole = new iam.Role(new Stack(), 'TargetRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
      });

      context.target = new MockComponent(
        { name: 'test-role', type: 'iam-role', config: {} },
        targetRole
      );

      const result = iamStrategy.bind(context);
      expect(result.metadata?.success).toBe(true);
    });
  });
});
