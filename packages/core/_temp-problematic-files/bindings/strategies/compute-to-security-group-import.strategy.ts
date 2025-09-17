/**
 * Compute to Security Group Import Binding Strategy
 * 
 * Universal binding strategy for connecting any compute component to 
 * imported security groups that provide security-group:import capability.
 * Implements the Platform Security Group Import Binding Standard v1.0.
 */

import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { 
  IBinderStrategy,
  BindingContext,
  BindingResult,
  CompatibilityEntry
} from '../../platform/contracts/platform-binding-trigger-spec';
import { IComponent } from '../../platform/contracts/component-interfaces';

/**
 * ComputeToSecurityGroupImportBinder
 * 
 * This strategy handles all compute components binding to imported security groups.
 * It automatically adds the imported security group to the compute component's
 * security groups list.
 * 
 * Strategy Key: *:security-group:import (Handles any compute type to security-group:import)
 */
export class ComputeToSecurityGroupImportBinder implements IBinderStrategy {

  /**
   * Check if this strategy can handle the binding
   */
  canHandle(sourceType: string, targetCapability: string): boolean {
    // This strategy handles any compute type binding to security-group:import capability
    return targetCapability === 'security-group:import';
  }

  /**
   * Execute the binding between source compute and target imported security group
   */
  bind(context: BindingContext): BindingResult {
    const { source, target, directive, environment, complianceFramework } = context;
    
    try {
      // Get security group import capability information from target
      const sgCapability = target.getCapabilities()['security-group:import'];
      if (!sgCapability) {
        throw new Error(`Target component ${target.node.id} does not provide security-group:import capability`);
      }

      // Get the imported security group construct from target
      const securityGroup = target.getConstruct('securityGroup') as ec2.ISecurityGroup;
      if (!securityGroup) {
        throw new Error(`Target component ${target.node.id} does not have a 'securityGroup' construct handle`);
      }

      // Route to appropriate binding method based on source type
      switch (source.getType()) {
        case 'ec2-instance':
          return this.bindEc2ToSecurityGroup(source, securityGroup, context);
        case 'lambda-api':
        case 'lambda-worker':
        case 'lambda-scheduled':
          return this.bindLambdaToSecurityGroup(source, securityGroup, context);
        case 'ecs-fargate-service':
        case 'ecs-ec2-service':
          return this.bindEcsToSecurityGroup(source, securityGroup, context);
        default:
          throw new Error(`Unsupported source type '${source.getType()}' for security group import binding`);
      }

    } catch (error) {
      return {
        success: false,
        error: `Failed to bind ${source.getType()} to imported security group: ${(error as Error).message}`,
        resources: []
      };
    }
  }

  /**
   * Bind EC2 instance to imported security group
   */
  private bindEc2ToSecurityGroup(source: IComponent, securityGroup: ec2.ISecurityGroup, context: BindingContext): BindingResult {
    const instance = source.getConstruct('instance') as ec2.Instance;
    if (!instance) {
      throw new Error(`Source component ${source.node.id} does not have an 'instance' construct handle`);
    }

    // Add the imported security group to the EC2 instance
    instance.addSecurityGroup(securityGroup);

    return {
      success: true,
      resources: [],
      metadata: {
        bindingType: 'ec2-to-security-group-import',
        securityGroupId: securityGroup.securityGroupId,
        vpcId: securityGroup.vpc?.vpcId
      }
    };
  }

  /**
   * Bind Lambda function to imported security group (VPC configuration)
   */
  private bindLambdaToSecurityGroup(source: IComponent, securityGroup: ec2.ISecurityGroup, context: BindingContext): BindingResult {
    const lambdaFunction = source.getConstruct('function') as lambda.Function;
    if (!lambdaFunction) {
      throw new Error(`Source component ${source.node.id} does not have a 'function' construct handle`);
    }

    // Lambda functions need to be in a VPC to use security groups
    // Add the security group to the Lambda's VPC configuration
    if (lambdaFunction.isBoundToVpc()) {
      lambdaFunction.connections.addSecurityGroup(securityGroup);
    } else {
      // If Lambda is not in a VPC, we need to configure it to be in the same VPC as the security group
      if (securityGroup.vpc) {
        lambdaFunction.addToRolePolicy(new lambda.PolicyStatement({
          effect: lambda.Effect.ALLOW,
          actions: [
            'ec2:CreateNetworkInterface',
            'ec2:DescribeNetworkInterfaces',
            'ec2:DeleteNetworkInterface'
          ],
          resources: [`arn:aws:ec2:${context.region}:${context.account}:vpc/${securityGroup.vpc.vpcId}`]
        }));
      }
    }

    return {
      success: true,
      resources: [],
      metadata: {
        bindingType: 'lambda-to-security-group-import',
        securityGroupId: securityGroup.securityGroupId,
        vpcId: securityGroup.vpc?.vpcId,
        requiresVpc: !lambdaFunction.isBoundToVpc()
      }
    };
  }

  /**
   * Bind ECS service to imported security group
   */
  private bindEcsToSecurityGroup(source: IComponent, securityGroup: ec2.ISecurityGroup, context: BindingContext): BindingResult {
    const service = source.getConstruct('service') as ecs.FargateService | ecs.Ec2Service;
    if (!service) {
      throw new Error(`Source component ${source.node.id} does not have a 'service' construct handle`);
    }

    // Add the imported security group to the ECS service
    service.connections.addSecurityGroup(securityGroup);

    return {
      success: true,
      resources: [],
      metadata: {
        bindingType: 'ecs-to-security-group-import',
        securityGroupId: securityGroup.securityGroupId,
        vpcId: securityGroup.vpc?.vpcId,
        serviceArn: service.serviceArn
      }
    };
  }

  /**
   * Get compatibility matrix for this binding strategy
   */
  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: 'ec2-instance',
        targetCapability: 'security-group:import',
        supported: true,
        description: 'Adds imported security group to EC2 instance security groups'
      },
      {
        sourceType: 'lambda-api',
        targetCapability: 'security-group:import',
        supported: true,
        description: 'Configures Lambda VPC access to use imported security group'
      },
      {
        sourceType: 'lambda-worker',
        targetCapability: 'security-group:import',
        supported: true,
        description: 'Configures Lambda VPC access to use imported security group'
      },
      {
        sourceType: 'lambda-scheduled',
        targetCapability: 'security-group:import',
        supported: true,
        description: 'Configures Lambda VPC access to use imported security group'
      },
      {
        sourceType: 'ecs-fargate-service',
        targetCapability: 'security-group:import',
        supported: true,
        description: 'Adds imported security group to ECS Fargate service'
      },
      {
        sourceType: 'ecs-ec2-service',
        targetCapability: 'security-group:import',
        supported: true,
        description: 'Adds imported security group to ECS EC2 service'
      }
    ];
  }
}
