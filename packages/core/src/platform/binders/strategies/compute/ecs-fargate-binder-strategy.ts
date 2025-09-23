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
    // Validate inputs
    if (!targetComponent) {
      throw new Error('Target component is required for ECS cluster binding');
    }
    if (!binding?.capability) {
      throw new Error('Binding capability is required');
    }
    if (!binding?.access || !Array.isArray(binding.access)) {
      throw new Error('Binding access array is required');
    }
    if (!context?.region || !context?.accountId) {
      throw new Error('Missing required context properties for ARN construction: region, accountId');
    }

    // Validate access patterns
    const validAccessTypes = ['read', 'write', 'admin', 'encrypt', 'decrypt', 'process'];
    const invalidAccess = binding.access.filter(a => !validAccessTypes.includes(a));
    if (invalidAccess.length > 0) {
      throw new Error(`Invalid access types for ECS cluster binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (binding.access.length === 0) {
      throw new Error('Access array cannot be empty for ECS cluster binding');
    }

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
        throw new Error(`Unsupported ECS Fargate capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  private async bindToCluster(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    // Validate required target component properties
    if (!targetComponent?.clusterArn) {
      throw new Error('Target component missing required clusterArn property for ECS cluster binding');
    }
    if (!targetComponent?.clusterName) {
      throw new Error('Target component missing required clusterName property for ECS cluster binding');
    }

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
    // Validate required target component properties
    if (!targetComponent?.serviceArn) {
      throw new Error('Target component missing required serviceArn property for ECS service binding');
    }
    if (!targetComponent?.serviceName) {
      throw new Error('Target component missing required serviceName property for ECS service binding');
    }
    if (!targetComponent?.clusterName) {
      throw new Error('Target component missing required clusterName property for ECS service binding');
    }

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
    if (targetComponent?.taskDefinitionArn) {
      sourceComponent.addEnvironment('ECS_TASK_DEFINITION', targetComponent.taskDefinitionArn);
    }
  }

  private async bindToTaskDefinition(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    // Validate required target component properties
    if (!targetComponent?.taskDefinitionArn) {
      throw new Error('Target component missing required taskDefinitionArn property for ECS task definition binding');
    }

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
    if (targetComponent?.taskDefinitionFamily) {
      sourceComponent.addEnvironment('ECS_TASK_DEFINITION_FAMILY', targetComponent.taskDefinitionFamily);
    }
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
