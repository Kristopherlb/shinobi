/**
 * Batch Binder Strategy
 * Handles batch computing workload bindings for AWS Batch
 */

import { IBinderStrategy } from '../binder-strategy';
import { BindingContext } from '../../binding-context';
import { ComponentBinding } from '../../component-binding';
// Compliance framework branching removed; use binding.options/config instead

export class BatchBinderStrategy implements IBinderStrategy {
  readonly supportedCapabilities = ['batch:job-queue', 'batch:compute-environment', 'batch:job-definition', 'batch:job'];

  async bind(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { capability, access } = binding;

    switch (capability) {
      case 'batch:job-queue':
        await this.bindToJobQueue(sourceComponent, targetComponent, binding, context);
        break;
      case 'batch:compute-environment':
        await this.bindToComputeEnvironment(sourceComponent, targetComponent, binding, context);
        break;
      case 'batch:job-definition':
        await this.bindToJobDefinition(sourceComponent, targetComponent, binding, context);
        break;
      case 'batch:job':
        await this.bindToJob(sourceComponent, targetComponent, binding, context);
        break;
      default:
        throw new Error(`Unsupported Batch capability: ${capability}`);
    }
  }

  private async bindToJobQueue(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant job queue access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'batch:DescribeJobQueues',
          'batch:ListJobs'
        ],
        Resource: targetComponent.jobQueueArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'batch:SubmitJob',
          'batch:CancelJob',
          'batch:TerminateJob',
          'batch:UpdateJobQueue'
        ],
        Resource: [
          targetComponent.jobQueueArn,
          `arn:aws:batch:${context.region}:${context.accountId}:job-queue/*`
        ]
      });
    }

    // Inject job queue environment variables
    sourceComponent.addEnvironment('BATCH_JOB_QUEUE_NAME', targetComponent.jobQueueName);
    sourceComponent.addEnvironment('BATCH_JOB_QUEUE_ARN', targetComponent.jobQueueArn);
    sourceComponent.addEnvironment('BATCH_JOB_QUEUE_PRIORITY', targetComponent.priority.toString());
    sourceComponent.addEnvironment('BATCH_JOB_QUEUE_STATE', targetComponent.state);

    // Configure compute environment association
    if (targetComponent.computeEnvironmentOrder) {
      sourceComponent.addEnvironment('BATCH_COMPUTE_ENVIRONMENTS',
        targetComponent.computeEnvironmentOrder.map((ce: any) => ce.computeEnvironment).join(','));
    }
  }

  private async bindToComputeEnvironment(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant compute environment access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'batch:DescribeComputeEnvironments'
        ],
        Resource: targetComponent.computeEnvironmentArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'batch:CreateComputeEnvironment',
          'batch:UpdateComputeEnvironment',
          'batch:DeleteComputeEnvironment'
        ],
        Resource: targetComponent.computeEnvironmentArn
      });
    }

    // Grant ECS cluster access for managed compute environments
    if (targetComponent.ecsClusterArn) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'ecs:DescribeClusters',
          'ecs:ListContainerInstances',
          'ecs:DescribeContainerInstances'
        ],
        Resource: targetComponent.ecsClusterArn
      });
    }

    // Grant EC2 instance profile access for unmanaged compute environments
    if (targetComponent.instanceRoleArn) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'iam:PassRole'
        ],
        Resource: targetComponent.instanceRoleArn
      });
    }

    // Inject compute environment environment variables
    sourceComponent.addEnvironment('BATCH_COMPUTE_ENVIRONMENT_NAME', targetComponent.computeEnvironmentName);
    sourceComponent.addEnvironment('BATCH_COMPUTE_ENVIRONMENT_ARN', targetComponent.computeEnvironmentArn);
    sourceComponent.addEnvironment('BATCH_COMPUTE_ENVIRONMENT_TYPE', targetComponent.type);
    sourceComponent.addEnvironment('BATCH_COMPUTE_ENVIRONMENT_STATE', targetComponent.state);

    // Configure instance configuration
    if (targetComponent.computeResources) {
      sourceComponent.addEnvironment('BATCH_INSTANCE_TYPES', targetComponent.computeResources.instanceTypes.join(','));
      sourceComponent.addEnvironment('BATCH_MIN_VCPUS', targetComponent.computeResources.minvCpus.toString());
      sourceComponent.addEnvironment('BATCH_MAX_VCPUS', targetComponent.computeResources.maxvCpus.toString());
      sourceComponent.addEnvironment('BATCH_DESIRED_VCPUS', targetComponent.computeResources.desiredvCpus.toString());
    }
  }

  private async bindToJobDefinition(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant job definition access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'batch:DescribeJobDefinitions',
          'batch:ListJobs'
        ],
        Resource: targetComponent.jobDefinitionArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'batch:RegisterJobDefinition',
          'batch:DeregisterJobDefinition'
        ],
        Resource: targetComponent.jobDefinitionArn
      });
    }

    // Grant ECR access for container images
    if (targetComponent.containerProperties?.image) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'ecr:GetAuthorizationToken',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage'
        ],
        Resource: targetComponent.ecrRepositoryArn
      });
    }

    // Inject job definition environment variables
    sourceComponent.addEnvironment('BATCH_JOB_DEFINITION_NAME', targetComponent.jobDefinitionName);
    sourceComponent.addEnvironment('BATCH_JOB_DEFINITION_ARN', targetComponent.jobDefinitionArn);
    sourceComponent.addEnvironment('BATCH_JOB_DEFINITION_REVISION', targetComponent.revision.toString());
    sourceComponent.addEnvironment('BATCH_JOB_DEFINITION_TYPE', targetComponent.type);

    // Configure container environment
    if (targetComponent.containerProperties) {
      sourceComponent.addEnvironment('BATCH_CONTAINER_IMAGE', targetComponent.containerProperties.image);
      sourceComponent.addEnvironment('BATCH_VCPUS', targetComponent.containerProperties.vcpus.toString());
      sourceComponent.addEnvironment('BATCH_MEMORY', targetComponent.containerProperties.memory.toString());

      if (targetComponent.containerProperties.jobRoleArn) {
        sourceComponent.addEnvironment('BATCH_JOB_ROLE_ARN', targetComponent.containerProperties.jobRoleArn);
      }
    }
  }

  private async bindToJob(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant job access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'batch:DescribeJobs',
          'batch:ListJobs'
        ],
        Resource: targetComponent.jobArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'batch:SubmitJob',
          'batch:CancelJob',
          'batch:TerminateJob'
        ],
        Resource: targetComponent.jobArn
      });
    }

    // Grant CloudWatch Logs access for job logs
    if (targetComponent.logStreamName) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'logs:DescribeLogStreams',
          'logs:GetLogEvents'
        ],
        Resource: `arn:aws:logs:${context.region}:${context.accountId}:log-group:/aws/batch/job:log-stream:${targetComponent.logStreamName}`
      });
    }

    // Inject job environment variables
    sourceComponent.addEnvironment('BATCH_JOB_NAME', targetComponent.jobName);
    sourceComponent.addEnvironment('BATCH_JOB_ARN', targetComponent.jobArn);
    sourceComponent.addEnvironment('BATCH_JOB_ID', targetComponent.jobId);
    sourceComponent.addEnvironment('BATCH_JOB_QUEUE', targetComponent.jobQueue);
    sourceComponent.addEnvironment('BATCH_JOB_DEFINITION', targetComponent.jobDefinition);
    sourceComponent.addEnvironment('BATCH_JOB_STATUS', targetComponent.status);

    // Configure secure networking if requested by manifest/config (no framework branching)
    if (binding.options?.requireSecureNetworking) {
      await this.configureSecureJobEnvironment(sourceComponent, targetComponent, binding, context);
    }
  }

  private async configureSecureJobEnvironment(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    // Configure VPC networking for batch jobs
    if (targetComponent.networkConfiguration?.subnets) {
      sourceComponent.addEnvironment('BATCH_SUBNETS', targetComponent.networkConfiguration.subnets.join(','));

      if (targetComponent.networkConfiguration.securityGroups) {
        sourceComponent.addEnvironment('BATCH_SECURITY_GROUPS', targetComponent.networkConfiguration.securityGroups.join(','));
      }
    }

    // Configure encryption for sensitive data when requested via options/config
    if (binding.options?.enableEncryption === true) {
      sourceComponent.addEnvironment('BATCH_ENCRYPTION_ENABLED', 'true');

      if (targetComponent.encryptionKeyArn) {
        sourceComponent.addEnvironment('BATCH_ENCRYPTION_KEY_ARN', targetComponent.encryptionKeyArn);

        // Grant KMS permissions
        sourceComponent.addToRolePolicy({
          Effect: 'Allow',
          Action: [
            'kms:Decrypt',
            'kms:GenerateDataKey'
          ],
          Resource: targetComponent.encryptionKeyArn
        });
      }
    }

    // Configure secrets management
    if (targetComponent.secrets) {
      sourceComponent.addEnvironment('BATCH_SECRETS_ARN', targetComponent.secrets.map((s: any) => s.secretArn).join(','));

      // Grant Secrets Manager permissions
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'secretsmanager:GetSecretValue'
        ],
        Resource: targetComponent.secrets.map((s: any) => s.secretArn)
      });
    }
  }
}
