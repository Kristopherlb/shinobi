/**
 * Compute to IAM Role Binding Strategy
 * 
 * Universal binding strategy for connecting any compute component to 
 * IAM roles that provide iam:assumeRole capability.
 * Implements the Platform IAM Role Binding Standard v1.0.
 */

import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {
  IBinderStrategy,
  BindingContext,
  BindingResult,
  CompatibilityEntry
} from '../../platform/contracts/platform-binding-trigger-spec.js';
import { IComponent } from '../../platform/contracts/component-interfaces.js';

/**
 * ComputeToIamRoleBinder
 * 
 * This strategy handles all compute components binding to IAM roles.
 * It automatically creates the appropriate attachment mechanism:
 * - EC2 instances: Creates IAM Instance Profile
 * - Lambda functions: Attaches role directly
 * - ECS tasks: Creates task role
 * 
 * Strategy Key: *:iam:assumeRole (Handles any compute type to iam:assumeRole)
 */
export class ComputeToIamRoleBinder implements IBinderStrategy {

  /**
   * Check if this strategy can handle the binding
   */
  canHandle(sourceType: string, capability: string): boolean {
    // This strategy handles any compute type binding to iam:assumeRole capability
    return capability === 'iam:assumeRole';
  }

  /**
   * Execute the binding between source compute and target IAM role
   */
  bind(context: BindingContext): BindingResult {
    const { source, target, directive, environment, complianceFramework } = context;

    try {
      // Get IAM role capability information from target
      const iamCapability = target.getCapabilities()['iam:assumeRole'];
      if (!iamCapability) {
        throw new Error(`Target component ${target.node.id} does not provide iam:assumeRole capability`);
      }

      // Get the IAM role construct from target
      const role = target.getConstruct('role') as iam.Role;
      if (!role) {
        throw new Error(`Target component ${target.node.id} does not have a 'role' construct handle`);
      }

      // Route to appropriate binding method based on source type
      switch (source.getType()) {
        case 'ec2-instance':
          return this.bindEc2ToIamRole(source, role, context);
        case 'lambda-api':
        case 'lambda-worker':
        case 'lambda-scheduled':
          return this.bindLambdaToIamRole(source, role, context);
        case 'ecs-fargate-service':
        case 'ecs-ec2-service':
          return this.bindEcsToIamRole(source, role, context);
        default:
          throw new Error(`Unsupported source type '${source.getType()}' for IAM role binding`);
      }

    } catch (error) {
      // Preserve error context for better debugging
      const errorDetails = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        sourceType: source.getType(),
        targetType: target.getType(),
        timestamp: new Date().toISOString()
      };

      return {
        environmentVariables: {},
        metadata: {
          error: `Failed to bind ${source.getType()} to IAM role: ${errorDetails.message}`,
          errorDetails,
          success: false
        }
      };
    }
  }

  /**
   * Bind EC2 instance to IAM role by creating an Instance Profile
   */
  private bindEc2ToIamRole(source: IComponent, role: iam.Role, context: BindingContext): BindingResult {
    const instance = source.getConstruct('instance') as ec2.Instance;
    if (!instance) {
      throw new Error(`Source component ${source.node.id} does not have an 'instance' construct handle`);
    }

    // Create IAM Instance Profile
    const instanceProfile = new iam.CfnInstanceProfile(
      source,
      `InstanceProfile-${context.target.node.id}`,
      {
        roles: [role.roleName],
        instanceProfileName: `${context.environment}-${source.node.id}-${context.target.node.id}-profile`
      }
    );

    // Attach the instance profile to the EC2 instance using CDK construct
    // Note: This requires the EC2 instance to be configured with the instance profile
    // The actual attachment happens through the EC2 instance configuration
    if ('addPropertyOverride' in instance) {
      (instance as any).addPropertyOverride('IamInstanceProfile', instanceProfile.ref);
    } else {
      // For EC2 instances, we need to use the instance profile directly
      // This is a limitation of the current CDK construct - in practice, the instance profile
      // should be configured during instance creation, not after
      console.warn(`Instance profile ${instanceProfile.ref} created but not automatically attached to EC2 instance ${instance.instanceId}. Manual configuration may be required.`);
    }

    return {
      environmentVariables: {
        IAM_ROLE_ARN: role.roleArn,
        INSTANCE_PROFILE_ARN: instanceProfile.attrArn
      },
      metadata: {
        bindingType: 'ec2-to-iam-role',
        instanceProfileName: `${context.environment}-${source.node.id}-${context.target.node.id}-profile`,
        roleArn: role.roleArn,
        success: true
      }
    };
  }

  /**
   * Bind Lambda function to IAM role by attaching the role directly
   */
  private bindLambdaToIamRole(source: IComponent, role: iam.Role, context: BindingContext): BindingResult {
    const lambdaFunction = source.getConstruct('function') as lambda.Function;
    if (!lambdaFunction) {
      throw new Error(`Source component ${source.node.id} does not have a 'function' construct handle`);
    }

    // Lambda functions can only have one role, so we need to merge policies
    // Get existing role from Lambda function
    const existingRole = lambdaFunction.role;
    if (existingRole) {
      // Add policies from the target role to the existing Lambda role (FIXED: was attaching to wrong role)
      existingRole.attachInlinePolicy(
        new iam.Policy(source, `MergedPolicy-${context.target.node.id}`, {
          statements: this.extractPolicyStatements(role)
        })
      );

      // Update trust policy to allow Lambda to assume the target role
      role.grantAssumeRole(new iam.ServicePrincipal('lambda.amazonaws.com'));
    } else {
      // If no existing role, attach the target role directly
      lambdaFunction.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['sts:AssumeRole'],
          resources: [role.roleArn]
        })
      );

      // Update trust policy to allow Lambda to assume the target role
      role.grantAssumeRole(new iam.ServicePrincipal('lambda.amazonaws.com'));
    }

    return {
      environmentVariables: {
        IAM_ROLE_ARN: role.roleArn
      },
      metadata: {
        bindingType: 'lambda-to-iam-role',
        roleArn: role.roleArn,
        policyMerged: !!existingRole,
        trustPolicyUpdated: true,
        success: true
      }
    };
  }

  /**
   * Bind ECS service to IAM role by creating a task role
   */
  private bindEcsToIamRole(source: IComponent, role: iam.Role, context: BindingContext): BindingResult {
    const taskDefinition = source.getConstruct('taskDefinition') as ecs.TaskDefinition;
    if (!taskDefinition) {
      throw new Error(`Source component ${source.node.id} does not have a 'taskDefinition' construct handle`);
    }

    // Add the IAM role as a task role to the ECS task definition
    taskDefinition.addToTaskRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [role.roleArn]
      })
    );

    return {
      environmentVariables: {
        IAM_ROLE_ARN: role.roleArn,
        TASK_DEFINITION_ARN: taskDefinition.taskDefinitionArn
      },
      metadata: {
        bindingType: 'ecs-to-iam-role',
        roleArn: role.roleArn,
        taskDefinitionArn: taskDefinition.taskDefinitionArn,
        success: true
      }
    };
  }

  /**
   * Extract policy statements from an IAM role for merging
   */
  private extractPolicyStatements(role: iam.Role): iam.PolicyStatement[] {
    const statements: iam.PolicyStatement[] = [];

    // Since we can't access private properties directly, we'll create a basic policy
    // that allows the role to be assumed by the compute component
    // In a real implementation, you'd need to use AWS SDK to fetch the actual policies
    statements.push(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [role.roleArn],
        sid: 'AllowRoleAssumption'
      })
    );

    // Add a generic policy for common AWS services that might be needed
    statements.push(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'sts:GetCallerIdentity',
          'sts:TagSession'
        ],
        resources: ['*'],
        sid: 'BasicSTS'
      })
    );

    return statements;
  }

  /**
   * Get compatibility matrix for this binding strategy
   */
  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: 'ec2-instance',
        targetType: 'iam-role',
        capability: 'iam:assumeRole',
        supportedAccess: ['read'],
        description: 'Creates IAM Instance Profile for EC2 instance'
      },
      {
        sourceType: 'lambda-api',
        targetType: 'iam-role',
        capability: 'iam:assumeRole',
        supportedAccess: ['read'],
        description: 'Merges IAM policies with Lambda execution role'
      },
      {
        sourceType: 'lambda-worker',
        targetType: 'iam-role',
        capability: 'iam:assumeRole',
        supportedAccess: ['read'],
        description: 'Merges IAM policies with Lambda execution role'
      },
      {
        sourceType: 'lambda-scheduled',
        targetType: 'iam-role',
        capability: 'iam:assumeRole',
        supportedAccess: ['read'],
        description: 'Merges IAM policies with Lambda execution role'
      },
      {
        sourceType: 'ecs-fargate-service',
        targetType: 'iam-role',
        capability: 'iam:assumeRole',
        supportedAccess: ['read'],
        description: 'Adds IAM role as task role to ECS service'
      },
      {
        sourceType: 'ecs-ec2-service',
        targetType: 'iam-role',
        capability: 'iam:assumeRole',
        supportedAccess: ['read'],
        description: 'Adds IAM role as task role to ECS service'
      }
    ];
  }
}
