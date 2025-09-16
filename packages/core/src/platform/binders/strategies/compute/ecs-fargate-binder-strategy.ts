/**
 * ECS Fargate Binder Strategy
 * Handles container orchestration bindings for ECS Fargate services
 */

import { IBinderStrategy } from '../binder-strategy';
import { BindingContext } from '../../binding-context';
import { ComponentBinding } from '../../component-binding';
import { ComplianceFramework } from '../../../compliance/compliance-framework';

export class EcsFargateBinderStrategy implements IBinderStrategy {
  readonly supportedCapabilities = ['ecs:cluster', 'ecs:service', 'ecs:task-definition'];

  async bind(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { capability, access } = binding;

    switch (capability) {
      case 'ecs:cluster':
        await this.bindToCluster(sourceComponent, targetComponent, binding, context);
        break;
      case 'ecs:service':
        await this.bindToService(sourceComponent, targetComponent, binding, context);
        break;
      case 'ecs:task-definition':
        await this.bindToTaskDefinition(sourceComponent, targetComponent, binding, context);
        break;
      default:
        throw new Error(`Unsupported ECS Fargate capability: ${capability}`);
    }
  }

  private async bindToCluster(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant ECS cluster access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'ecs:DescribeClusters',
          'ecs:ListServices',
          'ecs:ListTasks'
        ],
        Resource: targetComponent.clusterArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'ecs:CreateService',
          'ecs:UpdateService',
          'ecs:DeleteService',
          'ecs:RegisterTaskDefinition',
          'ecs:DeregisterTaskDefinition'
        ],
        Resource: [
          targetComponent.clusterArn,
          `arn:aws:ecs:${context.region}:${context.accountId}:service/${targetComponent.clusterName}/*`,
          `arn:aws:ecs:${context.region}:${context.accountId}:task-definition/*`
        ]
      });
    }

    // Inject environment variables
    sourceComponent.addEnvironment('ECS_CLUSTER_NAME', targetComponent.clusterName);
    sourceComponent.addEnvironment('ECS_CLUSTER_ARN', targetComponent.clusterArn);
    sourceComponent.addEnvironment('AWS_REGION', context.region);

    // Configure network connectivity for FedRAMP environments
    if (context.complianceFramework === ComplianceFramework.FEDRAMP_MODERATE ||
      context.complianceFramework === ComplianceFramework.FEDRAMP_HIGH) {
      await this.configureSecureNetworkAccess(sourceComponent, targetComponent, context);
    }
  }

  private async bindToService(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant ECS service access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'ecs:DescribeServices',
          'ecs:ListTasks',
          'ecs:DescribeTasks'
        ],
        Resource: [
          targetComponent.serviceArn,
          `arn:aws:ecs:${context.region}:${context.accountId}:task/${targetComponent.clusterName}/*`
        ]
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'ecs:UpdateService',
          'ecs:DeleteService',
          'ecs:StopTask',
          'ecs:StartTask'
        ],
        Resource: [
          targetComponent.serviceArn,
          `arn:aws:ecs:${context.region}:${context.accountId}:task/${targetComponent.clusterName}/*`
        ]
      });
    }

    // Inject service-specific environment variables
    sourceComponent.addEnvironment('ECS_SERVICE_NAME', targetComponent.serviceName);
    sourceComponent.addEnvironment('ECS_SERVICE_ARN', targetComponent.serviceArn);
    sourceComponent.addEnvironment('ECS_TASK_DEFINITION', targetComponent.taskDefinitionArn);
  }

  private async bindToTaskDefinition(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant task definition access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'ecs:DescribeTaskDefinition',
          'ecs:ListTaskDefinitions'
        ],
        Resource: targetComponent.taskDefinitionArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'ecs:RegisterTaskDefinition',
          'ecs:DeregisterTaskDefinition'
        ],
        Resource: targetComponent.taskDefinitionArn
      });
    }

    // Inject task definition environment variables
    sourceComponent.addEnvironment('ECS_TASK_DEFINITION_ARN', targetComponent.taskDefinitionArn);
    sourceComponent.addEnvironment('ECS_TASK_DEFINITION_FAMILY', targetComponent.taskDefinitionFamily);
  }

  private async configureSecureNetworkAccess(
    sourceComponent: any,
    targetComponent: any,
    context: BindingContext
  ): Promise<void> {
    // Ensure secure network access for FedRAMP environments
    if (sourceComponent.securityGroup) {
      sourceComponent.securityGroup.addIngressRule(
        sourceComponent.securityGroup,
        { port: 443, protocol: 'tcp' },
        'HTTPS access for ECS API calls'
      );
    }

    // Configure VPC endpoints for private connectivity in FedRAMP environments
    if (context.complianceFramework === ComplianceFramework.FEDRAMP_HIGH) {
      // Add VPC endpoint configuration for ECS API calls
      sourceComponent.addEnvironment('ECS_ENDPOINT', `https://ecs.${context.region}.amazonaws.com`);
    }
  }
}
