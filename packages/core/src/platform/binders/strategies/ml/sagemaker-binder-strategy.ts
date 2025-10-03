/**
 * SageMaker Binder Strategy
 * Handles machine learning bindings for Amazon SageMaker
 */

import { IBinderStrategy } from '../binder-strategy.js';
import { BindingContext } from '../../binding-context.js';
import { ComponentBinding } from '../../component-binding.js';
// Compliance framework branching removed; use binding.options/config instead

export class SageMakerBinderStrategy implements IBinderStrategy {
  readonly supportedCapabilities = ['sagemaker:notebook', 'sagemaker:model', 'sagemaker:endpoint', 'sagemaker:training-job'];

  async bind(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { capability, access } = binding;

    switch (capability) {
      case 'sagemaker:notebook':
        await this.bindToNotebook(sourceComponent, targetComponent, binding, context);
        break;
      case 'sagemaker:model':
        await this.bindToModel(sourceComponent, targetComponent, binding, context);
        break;
      case 'sagemaker:endpoint':
        await this.bindToEndpoint(sourceComponent, targetComponent, binding, context);
        break;
      case 'sagemaker:training-job':
        await this.bindToTrainingJob(sourceComponent, targetComponent, binding, context);
        break;
      default:
        throw new Error(`Unsupported SageMaker capability: ${capability}`);
    }
  }

  private async bindToNotebook(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant notebook access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'sagemaker:DescribeNotebookInstance',
          'sagemaker:ListNotebookInstances'
        ],
        Resource: targetComponent.notebookInstanceArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'sagemaker:CreateNotebookInstance',
          'sagemaker:DeleteNotebookInstance',
          'sagemaker:UpdateNotebookInstance',
          'sagemaker:StartNotebookInstance',
          'sagemaker:StopNotebookInstance'
        ],
        Resource: targetComponent.notebookInstanceArn
      });
    }

    // Grant ECR access for container images
    if (targetComponent.defaultCodeRepository) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'ecr:GetAuthorizationToken',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage'
        ],
        Resource: '*'
      });
    }

    // Grant S3 access for data and model storage
    sourceComponent.addToRolePolicy({
      Effect: 'Allow',
      Action: [
        's3:GetObject',
        's3:PutObject',
        's3:ListBucket'
      ],
      Resource: [
        targetComponent.defaultCodeRepository,
        `${targetComponent.defaultCodeRepository}/*`
      ]
    });

    // Inject notebook environment variables
    sourceComponent.addEnvironment('SAGEMAKER_NOTEBOOK_INSTANCE_NAME', targetComponent.notebookInstanceName);
    sourceComponent.addEnvironment('SAGEMAKER_NOTEBOOK_INSTANCE_ARN', targetComponent.notebookInstanceArn);
    sourceComponent.addEnvironment('SAGEMAKER_NOTEBOOK_INSTANCE_TYPE', targetComponent.instanceType);
    sourceComponent.addEnvironment('SAGEMAKER_NOTEBOOK_INSTANCE_STATUS', targetComponent.notebookInstanceStatus);

    // Configure secure access when requested via options/config
    if (binding.options?.requireSecureAccess === true) {
      await this.configureSecureNotebookAccess(sourceComponent, targetComponent, context);
    }
  }

  private async bindToModel(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant model access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'sagemaker:DescribeModel',
          'sagemaker:ListModels'
        ],
        Resource: targetComponent.modelArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'sagemaker:CreateModel',
          'sagemaker:DeleteModel'
        ],
        Resource: targetComponent.modelArn
      });
    }

    // Grant ECR access for model containers
    if (targetComponent.primaryContainer?.image) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'ecr:GetAuthorizationToken',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage'
        ],
        Resource: '*'
      });
    }

    // Grant S3 access for model artifacts
    if (targetComponent.primaryContainer?.modelDataUrl) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          's3:GetObject'
        ],
        Resource: targetComponent.primaryContainer.modelDataUrl
      });
    }

    // Inject model environment variables
    sourceComponent.addEnvironment('SAGEMAKER_MODEL_NAME', targetComponent.modelName);
    sourceComponent.addEnvironment('SAGEMAKER_MODEL_ARN', targetComponent.modelArn);
    sourceComponent.addEnvironment('SAGEMAKER_MODEL_EXECUTION_ROLE_ARN', targetComponent.executionRoleArn);

    // Configure container environment
    if (targetComponent.primaryContainer) {
      sourceComponent.addEnvironment('SAGEMAKER_MODEL_IMAGE', targetComponent.primaryContainer.image);
      sourceComponent.addEnvironment('SAGEMAKER_MODEL_DATA_URL', targetComponent.primaryContainer.modelDataUrl);

      if (targetComponent.primaryContainer.environment) {
        sourceComponent.addEnvironment('SAGEMAKER_MODEL_ENVIRONMENT', JSON.stringify(targetComponent.primaryContainer.environment));
      }
    }
  }

  private async bindToEndpoint(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant endpoint access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'sagemaker:DescribeEndpoint',
          'sagemaker:DescribeEndpointConfig',
          'sagemaker:ListEndpoints'
        ],
        Resource: [
          targetComponent.endpointArn,
          targetComponent.endpointConfigArn
        ]
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'sagemaker:CreateEndpoint',
          'sagemaker:DeleteEndpoint',
          'sagemaker:UpdateEndpoint',
          'sagemaker:CreateEndpointConfig',
          'sagemaker:DeleteEndpointConfig'
        ],
        Resource: [
          targetComponent.endpointArn,
          targetComponent.endpointConfigArn
        ]
      });
    }

    // Grant invoke permissions for endpoint
    if (access.includes('invoke')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'sagemaker:InvokeEndpoint'
        ],
        Resource: targetComponent.endpointArn
      });
    }

    // Inject endpoint environment variables
    sourceComponent.addEnvironment('SAGEMAKER_ENDPOINT_NAME', targetComponent.endpointName);
    sourceComponent.addEnvironment('SAGEMAKER_ENDPOINT_ARN', targetComponent.endpointArn);
    sourceComponent.addEnvironment('SAGEMAKER_ENDPOINT_CONFIG_NAME', targetComponent.endpointConfigName);
    sourceComponent.addEnvironment('SAGEMAKER_ENDPOINT_STATUS', targetComponent.endpointStatus);

    // Configure auto-scaling
    if (targetComponent.autoScalingPolicy) {
      sourceComponent.addEnvironment('SAGEMAKER_AUTO_SCALING_ENABLED', 'true');
      sourceComponent.addEnvironment('SAGEMAKER_AUTO_SCALING_POLICY', JSON.stringify(targetComponent.autoScalingPolicy));
    }
  }

  private async bindToTrainingJob(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant training job access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'sagemaker:DescribeTrainingJob',
          'sagemaker:ListTrainingJobs'
        ],
        Resource: targetComponent.trainingJobArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'sagemaker:CreateTrainingJob',
          'sagemaker:StopTrainingJob'
        ],
        Resource: targetComponent.trainingJobArn
      });
    }

    // Grant S3 access for training data and output
    if (targetComponent.inputDataConfig) {
      targetComponent.inputDataConfig.forEach((input: any) => {
        sourceComponent.addToRolePolicy({
          Effect: 'Allow',
          Action: [
            's3:GetObject',
            's3:ListBucket'
          ],
          Resource: [
            input.dataSource.s3DataSource.s3Uri,
            `${input.dataSource.s3DataSource.s3Uri}/*`
          ]
        });
      });
    }

    if (targetComponent.outputDataConfig) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          's3:PutObject',
          's3:GetObject'
        ],
        Resource: [
          targetComponent.outputDataConfig.s3OutputPath,
          `${targetComponent.outputDataConfig.s3OutputPath}/*`
        ]
      });
    }

    // Inject training job environment variables
    sourceComponent.addEnvironment('SAGEMAKER_TRAINING_JOB_NAME', targetComponent.trainingJobName);
    sourceComponent.addEnvironment('SAGEMAKER_TRAINING_JOB_ARN', targetComponent.trainingJobArn);
    sourceComponent.addEnvironment('SAGEMAKER_TRAINING_JOB_STATUS', targetComponent.trainingJobStatus);
    sourceComponent.addEnvironment('SAGEMAKER_TRAINING_JOB_ROLE_ARN', targetComponent.roleArn);

    // Configure hyperparameters
    if (targetComponent.hyperParameters) {
      sourceComponent.addEnvironment('SAGEMAKER_HYPERPARAMETERS', JSON.stringify(targetComponent.hyperParameters));
    }
  }

  private async configureSecureNotebookAccess(
    sourceComponent: any,
    targetComponent: any,
    context: BindingContext
  ): Promise<void> {
    // Configure VPC security groups for private access
    if (targetComponent.subnetId) {
      sourceComponent.addEnvironment('SAGEMAKER_SUBNET_ID', targetComponent.subnetId);
      sourceComponent.addEnvironment('SAGEMAKER_SECURITY_GROUP_IDS', targetComponent.securityGroupIds.join(','));
    }

    // Configure encryption at rest
    if (targetComponent.kmsKeyId) {
      sourceComponent.addEnvironment('SAGEMAKER_KMS_KEY_ID', targetComponent.kmsKeyId);

      // Grant KMS permissions
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'kms:Decrypt',
          'kms:GenerateDataKey'
        ],
        Resource: targetComponent.kmsKeyId
      });
    }

    // Optionally restrict root access when configured
    if ((targetComponent as any)?.disableRootAccess === true) {
      sourceComponent.addEnvironment('SAGEMAKER_ROOT_ACCESS_ENABLED', 'false');
    }

    // Configure lifecycle configuration for automatic shutdown
    if (targetComponent.lifecycleConfigName) {
      sourceComponent.addEnvironment('SAGEMAKER_LIFECYCLE_CONFIG', targetComponent.lifecycleConfigName);
    }

    // Configure monitoring and logging
    sourceComponent.addEnvironment('SAGEMAKER_MONITORING_ENABLED', 'true');

    // Grant CloudWatch Logs permissions
    sourceComponent.addToRolePolicy({
      Effect: 'Allow',
      Action: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      Resource: `arn:aws:logs:${context.region}:${context.accountId}:log-group:/aws/sagemaker/NotebookInstances/*`
    });
  }
}
