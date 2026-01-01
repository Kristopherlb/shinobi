/**
 * SageMaker Binder Strategy (Unified)
 * Handles machine learning bindings for Amazon SageMaker with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase } from '../../../contracts/unified-binder-strategy-base.js';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '../../../contracts/platform-binding-trigger-spec.js';
import type { IamPolicy } from '../../../contracts/bindings.js';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class SageMakerBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = [
    'sagemaker:notebook',
    'sagemaker:model',
    'sagemaker:endpoint',
    'sagemaker:training-job',
    'sagemaker:studio-domain',
    'sagemaker:studio-user-profile',
    'sagemaker:processing-job'
  ];

  getStrategyName(): string {
    return 'SageMaker Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'sagemaker:notebook',
        capability: 'sagemaker:notebook',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to SageMaker notebook instance for ML development',
        examples: ['lambda-api -> sagemaker:notebook (read)', 'ci-cd -> sagemaker:notebook (write)']
      },
      {
        sourceType: '*',
        targetType: 'sagemaker:model',
        capability: 'sagemaker:model',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to SageMaker model for ML model management',
        examples: ['lambda-api -> sagemaker:model (read)', 'ci-cd -> sagemaker:model (write)']
      },
      {
        sourceType: '*',
        targetType: 'sagemaker:endpoint',
        capability: 'sagemaker:endpoint',
        supportedAccess: ['read', 'write', 'readwrite', 'invoke'],
        description: 'Bind to SageMaker endpoint for ML inference (supports sync, async, and multi-model endpoints). Use access="invoke" and options.asyncInvoke=true for async invocation.',
        examples: ['lambda-api -> sagemaker:endpoint (invoke)', 'lambda-api -> sagemaker:endpoint (invoke) with options.asyncInvoke=true', 'ci-cd -> sagemaker:endpoint (write)']
      },
      {
        sourceType: '*',
        targetType: 'sagemaker:training-job',
        capability: 'sagemaker:training-job',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to SageMaker training job for ML model training',
        examples: ['lambda-api -> sagemaker:training-job (read)', 'ci-cd -> sagemaker:training-job (write)']
      },
      {
        sourceType: '*',
        targetType: 'sagemaker:studio-domain',
        capability: 'sagemaker:studio-domain',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to SageMaker Studio domain for collaborative ML development',
        examples: ['lambda-api -> sagemaker:studio-domain (read)', 'ci-cd -> sagemaker:studio-domain (write)']
      },
      {
        sourceType: '*',
        targetType: 'sagemaker:studio-user-profile',
        capability: 'sagemaker:studio-user-profile',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to SageMaker Studio user profile for user-specific ML workspace',
        examples: ['lambda-api -> sagemaker:studio-user-profile (read)', 'ci-cd -> sagemaker:studio-user-profile (write)']
      },
      {
        sourceType: '*',
        targetType: 'sagemaker:processing-job',
        capability: 'sagemaker:processing-job',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to SageMaker processing job for data preprocessing and model evaluation',
        examples: ['lambda-api -> sagemaker:processing-job (read)', 'ci-cd -> sagemaker:processing-job (write)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for SageMaker binding');
    }
    if (!capability) {
      throw new Error('Binding capability is required');
    }

    // Normalize access to array (directive.access is a single AccessLevel string)
    const access = directive.access ? [directive.access] : [];

    // Validate access patterns
    const validAccessTypes = ['read', 'write', 'readwrite', 'invoke', 'async-invoke'];
    const invalidAccess = access.filter(a => !validAccessTypes.includes(a));
    if (invalidAccess.length > 0) {
      throw new Error(`Invalid access types for SageMaker binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (access.length === 0) {
      throw new Error('Access cannot be empty for SageMaker binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Route to appropriate binding method
    switch (capability) {
      case 'sagemaker:notebook':
        return await this.bindToNotebook(context, targetCapabilityData, access);
      case 'sagemaker:model':
        return await this.bindToModel(context, targetCapabilityData, access);
      case 'sagemaker:endpoint':
        return await this.bindToEndpoint(context, targetCapabilityData, access);
      case 'sagemaker:training-job':
        return await this.bindToTrainingJob(context, targetCapabilityData, access);
      case 'sagemaker:studio-domain':
        return await this.bindToStudioDomain(context, targetCapabilityData, access);
      case 'sagemaker:studio-user-profile':
        return await this.bindToStudioUserProfile(context, targetCapabilityData, access);
      case 'sagemaker:processing-job':
        return await this.bindToProcessingJob(context, targetCapabilityData, access);
      default:
        throw new Error(`Unsupported SageMaker capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  /**
   * Bind to SageMaker notebook instance
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - notebookInstanceArn (required): string - ARN of the notebook instance
   *   - notebookInstanceName (required): string - Name of the notebook instance
   *   - instanceType?: string - Instance type
   *   - notebookInstanceStatus?: string - Status of the notebook instance
   *   - defaultCodeRepository?: string - Default code repository S3 URI
   *   - subnetId?: string - Subnet ID for VPC configuration (when requireSecureAccess is true)
   *   - securityGroupIds?: string[] - Security group IDs (when requireSecureAccess is true)
   *   - kmsKeyId?: string - KMS key ID for encryption (when requireSecureAccess is true)
   *   - disableRootAccess?: boolean - Disable root access (when requireSecureAccess is true)
   *   - lifecycleConfigName?: string - Lifecycle configuration name (when requireSecureAccess is true)
   * @param access - Array of access levels (read, write, readwrite)
   */
  private async bindToNotebook(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.notebookInstanceArn) {
      throw new Error('Target component missing required notebookInstanceArn property for SageMaker notebook binding');
    }
    if (!targetData?.notebookInstanceName) {
      throw new Error('Target component missing required notebookInstanceName property for SageMaker notebook binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];
    const region = context.target.context?.region || context.environment || 'us-east-1';
    const accountId = context.target.context?.accountId || '*';

    // Grant notebook access permissions
    if (access.includes('read') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sagemaker:DescribeNotebookInstance',
          'sagemaker:ListNotebookInstances'
        ],
        resources: [targetData.notebookInstanceArn]
      });
      iamPolicies.push({
        statement,
        description: 'SageMaker notebook read access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    if (access.includes('write') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sagemaker:CreateNotebookInstance',
          'sagemaker:DeleteNotebookInstance',
          'sagemaker:UpdateNotebookInstance',
          'sagemaker:StartNotebookInstance',
          'sagemaker:StopNotebookInstance'
        ],
        resources: [targetData.notebookInstanceArn]
      });
      iamPolicies.push({
        statement,
        description: 'SageMaker notebook write access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Grant ECR access for container images
    if (targetData.defaultCodeRepository) {
      const ecrStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'ecr:GetAuthorizationToken',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage'
        ],
        resources: ['*']
      });
      iamPolicies.push({
        statement: ecrStatement,
        description: 'ECR permissions for SageMaker notebook container images',
        complianceRequirement: 'Container image access'
      });
    }

    // Grant S3 access for data and model storage
    if (targetData.defaultCodeRepository) {
      const s3Statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:ListBucket'
        ],
        resources: [
          targetData.defaultCodeRepository,
          `${targetData.defaultCodeRepository}/*`
        ]
      });
      iamPolicies.push({
        statement: s3Statement,
        description: 'S3 permissions for SageMaker notebook data storage',
        complianceRequirement: 'Data storage access'
      });
    }

    // Set notebook environment variables
    environmentVariables['SAGEMAKER_NOTEBOOK_INSTANCE_NAME'] = targetData.notebookInstanceName;
    environmentVariables['SAGEMAKER_NOTEBOOK_INSTANCE_ARN'] = targetData.notebookInstanceArn;
    if (targetData.instanceType) {
      environmentVariables['SAGEMAKER_NOTEBOOK_INSTANCE_TYPE'] = targetData.instanceType;
    }
    if (targetData.notebookInstanceStatus) {
      environmentVariables['SAGEMAKER_NOTEBOOK_INSTANCE_STATUS'] = targetData.notebookInstanceStatus;
    }

    // Configure secure access when requested via options/config
    if (context.directive.options?.requireSecureAccess === true) {
      const secureConfig = await this.buildSecureNotebookAccessConfig(context, targetData);
      Object.assign(environmentVariables, secureConfig.environmentVariables);
      iamPolicies.push(...secureConfig.iamPolicies);
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to SageMaker model
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - modelArn (required): string - ARN of the model
   *   - modelName (required): string - Name of the model
   *   - executionRoleArn?: string - IAM execution role ARN
   *   - primaryContainer?: { image?: string, modelDataUrl?: string, environment?: object } - Primary container configuration
   * @param access - Array of access levels (read, write, readwrite)
   */
  private async bindToModel(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.modelArn) {
      throw new Error('Target component missing required modelArn property for SageMaker model binding');
    }
    if (!targetData?.modelName) {
      throw new Error('Target component missing required modelName property for SageMaker model binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Grant model access permissions
    if (access.includes('read') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sagemaker:DescribeModel',
          'sagemaker:ListModels'
        ],
        resources: [targetData.modelArn]
      });
      iamPolicies.push({
        statement,
        description: 'SageMaker model read access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    if (access.includes('write') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sagemaker:CreateModel',
          'sagemaker:DeleteModel'
        ],
        resources: [targetData.modelArn]
      });
      iamPolicies.push({
        statement,
        description: 'SageMaker model write access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Grant ECR access for model containers
    if (targetData.primaryContainer?.image) {
      const ecrStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'ecr:GetAuthorizationToken',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage'
        ],
        resources: ['*']
      });
      iamPolicies.push({
        statement: ecrStatement,
        description: 'ECR permissions for SageMaker model containers',
        complianceRequirement: 'Container image access'
      });
    }

    // Grant S3 access for model artifacts
    if (targetData.primaryContainer?.modelDataUrl) {
      const s3Statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:GetObject'],
        resources: [targetData.primaryContainer.modelDataUrl]
      });
      iamPolicies.push({
        statement: s3Statement,
        description: 'S3 permissions for SageMaker model artifacts',
        complianceRequirement: 'Model artifact access'
      });
    }

    // Set model environment variables
    environmentVariables['SAGEMAKER_MODEL_NAME'] = targetData.modelName;
    environmentVariables['SAGEMAKER_MODEL_ARN'] = targetData.modelArn;
    if (targetData.executionRoleArn) {
      environmentVariables['SAGEMAKER_MODEL_EXECUTION_ROLE_ARN'] = targetData.executionRoleArn;
    }

    // Configure container environment
    if (targetData.primaryContainer) {
      if (targetData.primaryContainer.image) {
        environmentVariables['SAGEMAKER_MODEL_IMAGE'] = targetData.primaryContainer.image;
      }
      if (targetData.primaryContainer.modelDataUrl) {
        environmentVariables['SAGEMAKER_MODEL_DATA_URL'] = targetData.primaryContainer.modelDataUrl;
      }
      if (targetData.primaryContainer.environment) {
        environmentVariables['SAGEMAKER_MODEL_ENVIRONMENT'] = JSON.stringify(targetData.primaryContainer.environment);
      }
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to SageMaker endpoint
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - endpointArn (required): string - ARN of the endpoint
   *   - endpointName (required): string - Name of the endpoint
   *   - endpointConfigArn?: string - Endpoint configuration ARN
   *   - endpointConfigName?: string - Endpoint configuration name
   *   - endpointStatus?: string - Status of the endpoint
   *   - autoScalingPolicy?: object - Auto-scaling policy configuration
   *   - multiModelConfig?: { modelCacheSetting?: string } - Multi-model endpoint configuration
   *   - asyncInferenceConfig?: { outputConfig?: { s3OutputPath?: string, notificationConfig?: object } } - Async inference configuration
   * @param access - Array of access levels (read, write, readwrite, invoke, async-invoke)
   */
  private async bindToEndpoint(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.endpointArn) {
      throw new Error('Target component missing required endpointArn property for SageMaker endpoint binding');
    }
    if (!targetData?.endpointName) {
      throw new Error('Target component missing required endpointName property for SageMaker endpoint binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];
    const resources = [targetData.endpointArn];
    if (targetData.endpointConfigArn) {
      resources.push(targetData.endpointConfigArn);
    }

    // Grant endpoint access permissions
    if (access.includes('read') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sagemaker:DescribeEndpoint',
          'sagemaker:DescribeEndpointConfig',
          'sagemaker:ListEndpoints'
        ],
        resources
      });
      iamPolicies.push({
        statement,
        description: 'SageMaker endpoint read access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    if (access.includes('write') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sagemaker:CreateEndpoint',
          'sagemaker:DeleteEndpoint',
          'sagemaker:UpdateEndpoint',
          'sagemaker:CreateEndpointConfig',
          'sagemaker:DeleteEndpointConfig'
        ],
        resources
      });
      iamPolicies.push({
        statement,
        description: 'SageMaker endpoint write access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Grant invoke permissions for endpoint (synchronous)
    if (access.includes('invoke') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sagemaker-runtime:InvokeEndpoint'],
        resources: [targetData.endpointArn]
      });
      iamPolicies.push({
        statement,
        description: 'SageMaker endpoint synchronous invoke permissions',
        complianceRequirement: 'Inference access'
      });
    }

    // Grant async invoke permissions for endpoint
    if (access.includes('async-invoke') || access.includes('readwrite')) {
      const asyncStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sagemaker-runtime:InvokeEndpointAsync'],
        resources: [targetData.endpointArn]
      });
      iamPolicies.push({
        statement: asyncStatement,
        description: 'SageMaker endpoint asynchronous invoke permissions',
        complianceRequirement: 'Asynchronous inference access'
      });

      // Async invoke requires S3 permissions for input/output locations
      if (targetData.asyncInferenceConfig?.outputConfig?.s3OutputPath) {
        const s3Statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:PutObject', 's3:GetObject'],
          resources: [
            targetData.asyncInferenceConfig.outputConfig.s3OutputPath,
            `${targetData.asyncInferenceConfig.outputConfig.s3OutputPath}/*`
          ]
        });
        iamPolicies.push({
          statement: s3Statement,
          description: 'S3 permissions for SageMaker async inference input/output',
          complianceRequirement: 'Async inference data storage'
        });
      }
    }

    // Set endpoint environment variables
    environmentVariables['SAGEMAKER_ENDPOINT_NAME'] = targetData.endpointName;
    environmentVariables['SAGEMAKER_ENDPOINT_ARN'] = targetData.endpointArn;
    if (targetData.endpointConfigName) {
      environmentVariables['SAGEMAKER_ENDPOINT_CONFIG_NAME'] = targetData.endpointConfigName;
    }
    if (targetData.endpointStatus) {
      environmentVariables['SAGEMAKER_ENDPOINT_STATUS'] = targetData.endpointStatus;
    }

    // Configure auto-scaling
    if (targetData.autoScalingPolicy) {
      environmentVariables['SAGEMAKER_AUTO_SCALING_ENABLED'] = 'true';
      environmentVariables['SAGEMAKER_AUTO_SCALING_POLICY'] = JSON.stringify(targetData.autoScalingPolicy);
    }

    // Configure multi-model endpoint support
    if (targetData.multiModelConfig?.modelCacheSetting) {
      environmentVariables['SAGEMAKER_MULTI_MODEL_ENABLED'] = 'true';
      environmentVariables['SAGEMAKER_MODEL_CACHE_SETTING'] = targetData.multiModelConfig.modelCacheSetting;
    }

    // Configure async inference
    if (targetData.asyncInferenceConfig) {
      environmentVariables['SAGEMAKER_ASYNC_INFERENCE_ENABLED'] = 'true';
      if (targetData.asyncInferenceConfig.outputConfig?.s3OutputPath) {
        environmentVariables['SAGEMAKER_ASYNC_OUTPUT_S3_PATH'] = targetData.asyncInferenceConfig.outputConfig.s3OutputPath;
      }
      if (targetData.asyncInferenceConfig.outputConfig?.notificationConfig) {
        environmentVariables['SAGEMAKER_ASYNC_NOTIFICATION_CONFIG'] = JSON.stringify(targetData.asyncInferenceConfig.outputConfig.notificationConfig);
      }
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to SageMaker training job
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - trainingJobArn (required): string - ARN of the training job
   *   - trainingJobName (required): string - Name of the training job
   *   - trainingJobStatus?: string - Status of the training job
   *   - roleArn?: string - IAM role ARN for the training job
   *   - inputDataConfig?: Array<{ dataSource: { s3DataSource: { s3Uri: string } } }> - Input data configuration
   *   - outputDataConfig?: { s3OutputPath: string } - Output data configuration
   *   - hyperParameters?: object - Hyperparameters
   * @param access - Array of access levels (read, write, readwrite)
   */
  private async bindToTrainingJob(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.trainingJobArn) {
      throw new Error('Target component missing required trainingJobArn property for SageMaker training job binding');
    }
    if (!targetData?.trainingJobName) {
      throw new Error('Target component missing required trainingJobName property for SageMaker training job binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Grant training job access permissions
    if (access.includes('read') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sagemaker:DescribeTrainingJob',
          'sagemaker:ListTrainingJobs'
        ],
        resources: [targetData.trainingJobArn]
      });
      iamPolicies.push({
        statement,
        description: 'SageMaker training job read access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    if (access.includes('write') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sagemaker:CreateTrainingJob',
          'sagemaker:StopTrainingJob'
        ],
        resources: [targetData.trainingJobArn]
      });
      iamPolicies.push({
        statement,
        description: 'SageMaker training job write access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Grant S3 access for training data and output
    if (targetData.inputDataConfig && Array.isArray(targetData.inputDataConfig)) {
      for (const input of targetData.inputDataConfig) {
        if (input.dataSource?.s3DataSource?.s3Uri) {
          const s3Uri = input.dataSource.s3DataSource.s3Uri;
          const s3Statement = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['s3:GetObject', 's3:ListBucket'],
            resources: [s3Uri, `${s3Uri}/*`]
          });
          iamPolicies.push({
            statement: s3Statement,
            description: 'S3 permissions for SageMaker training input data',
            complianceRequirement: 'Training data access'
          });
        }
      }
    }

    if (targetData.outputDataConfig?.s3OutputPath) {
      const s3Statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:PutObject', 's3:GetObject'],
        resources: [
          targetData.outputDataConfig.s3OutputPath,
          `${targetData.outputDataConfig.s3OutputPath}/*`
        ]
      });
      iamPolicies.push({
        statement: s3Statement,
        description: 'S3 permissions for SageMaker training output data',
        complianceRequirement: 'Training output access'
      });
    }

    // Set training job environment variables
    environmentVariables['SAGEMAKER_TRAINING_JOB_NAME'] = targetData.trainingJobName;
    environmentVariables['SAGEMAKER_TRAINING_JOB_ARN'] = targetData.trainingJobArn;
    if (targetData.trainingJobStatus) {
      environmentVariables['SAGEMAKER_TRAINING_JOB_STATUS'] = targetData.trainingJobStatus;
    }
    if (targetData.roleArn) {
      environmentVariables['SAGEMAKER_TRAINING_JOB_ROLE_ARN'] = targetData.roleArn;
    }

    // Configure hyperparameters
    if (targetData.hyperParameters) {
      environmentVariables['SAGEMAKER_HYPERPARAMETERS'] = JSON.stringify(targetData.hyperParameters);
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to SageMaker Studio domain
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - domainId (required): string - ID of the Studio domain
   *   - domainArn (required): string - ARN of the Studio domain
   *   - domainName?: string - Name of the domain
   *   - status?: string - Status of the domain
   *   - vpcId?: string - VPC ID
   *   - homeEfsFileSystemId?: string - EFS file system ID
   * @param access - Array of access levels (read, write, readwrite)
   */
  private async bindToStudioDomain(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.domainId) {
      throw new Error('Target component missing required domainId property for SageMaker Studio domain binding');
    }
    if (!targetData?.domainArn) {
      throw new Error('Target component missing required domainArn property for SageMaker Studio domain binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Grant domain access permissions
    if (access.includes('read') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sagemaker:DescribeDomain',
          'sagemaker:ListDomains',
          'sagemaker:ListUserProfiles',
          'sagemaker:ListApps'
        ],
        resources: [targetData.domainArn]
      });
      iamPolicies.push({
        statement,
        description: 'SageMaker Studio domain read access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    if (access.includes('write') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sagemaker:CreateDomain',
          'sagemaker:DeleteDomain',
          'sagemaker:UpdateDomain'
        ],
        resources: [targetData.domainArn]
      });
      iamPolicies.push({
        statement,
        description: 'SageMaker Studio domain write access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Set domain environment variables
    environmentVariables['SAGEMAKER_STUDIO_DOMAIN_ID'] = targetData.domainId;
    environmentVariables['SAGEMAKER_STUDIO_DOMAIN_ARN'] = targetData.domainArn;
    if (targetData.domainName) {
      environmentVariables['SAGEMAKER_STUDIO_DOMAIN_NAME'] = targetData.domainName;
    }
    if (targetData.status) {
      environmentVariables['SAGEMAKER_STUDIO_DOMAIN_STATUS'] = targetData.status;
    }
    if (targetData.vpcId) {
      environmentVariables['SAGEMAKER_STUDIO_DOMAIN_VPC_ID'] = targetData.vpcId;
    }
    if (targetData.homeEfsFileSystemId) {
      environmentVariables['SAGEMAKER_STUDIO_DOMAIN_EFS_ID'] = targetData.homeEfsFileSystemId;
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to SageMaker Studio user profile
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - userProfileName (required): string - Name of the user profile
   *   - userProfileArn (required): string - ARN of the user profile
   *   - domainId?: string - ID of the domain
   *   - status?: string - Status of the user profile
   *   - executionRole?: string - IAM execution role ARN
   * @param access - Array of access levels (read, write, readwrite)
   */
  private async bindToStudioUserProfile(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.userProfileName) {
      throw new Error('Target component missing required userProfileName property for SageMaker Studio user profile binding');
    }
    if (!targetData?.userProfileArn) {
      throw new Error('Target component missing required userProfileArn property for SageMaker Studio user profile binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Grant user profile access permissions
    if (access.includes('read') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sagemaker:DescribeUserProfile',
          'sagemaker:ListUserProfiles'
        ],
        resources: [targetData.userProfileArn]
      });
      iamPolicies.push({
        statement,
        description: 'SageMaker Studio user profile read access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    if (access.includes('write') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sagemaker:CreateUserProfile',
          'sagemaker:DeleteUserProfile',
          'sagemaker:UpdateUserProfile'
        ],
        resources: [targetData.userProfileArn]
      });
      iamPolicies.push({
        statement,
        description: 'SageMaker Studio user profile write access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Set user profile environment variables
    environmentVariables['SAGEMAKER_STUDIO_USER_PROFILE_NAME'] = targetData.userProfileName;
    environmentVariables['SAGEMAKER_STUDIO_USER_PROFILE_ARN'] = targetData.userProfileArn;
    if (targetData.domainId) {
      environmentVariables['SAGEMAKER_STUDIO_DOMAIN_ID'] = targetData.domainId;
    }
    if (targetData.status) {
      environmentVariables['SAGEMAKER_STUDIO_USER_PROFILE_STATUS'] = targetData.status;
    }
    if (targetData.executionRole) {
      environmentVariables['SAGEMAKER_STUDIO_USER_PROFILE_EXECUTION_ROLE'] = targetData.executionRole;
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to SageMaker processing job
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - processingJobArn (required): string - ARN of the processing job
   *   - processingJobName (required): string - Name of the processing job
   *   - processingJobStatus?: string - Status of the processing job
   *   - roleArn?: string - IAM role ARN for the processing job
   *   - processingInputs?: Array<{ s3Input?: { s3Uri: string } }> - Processing input configuration
   *   - processingOutputConfig?: { outputs: Array<{ s3Output?: { s3Uri: string } }> } - Processing output configuration
   * @param access - Array of access levels (read, write, readwrite)
   */
  private async bindToProcessingJob(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.processingJobArn) {
      throw new Error('Target component missing required processingJobArn property for SageMaker processing job binding');
    }
    if (!targetData?.processingJobName) {
      throw new Error('Target component missing required processingJobName property for SageMaker processing job binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Grant processing job access permissions
    if (access.includes('read') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sagemaker:DescribeProcessingJob',
          'sagemaker:ListProcessingJobs'
        ],
        resources: [targetData.processingJobArn]
      });
      iamPolicies.push({
        statement,
        description: 'SageMaker processing job read access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    if (access.includes('write') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sagemaker:CreateProcessingJob',
          'sagemaker:StopProcessingJob'
        ],
        resources: [targetData.processingJobArn]
      });
      iamPolicies.push({
        statement,
        description: 'SageMaker processing job write access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Grant S3 access for processing inputs
    if (targetData.processingInputs && Array.isArray(targetData.processingInputs)) {
      for (const input of targetData.processingInputs) {
        if (input.s3Input?.s3Uri) {
          const s3Uri = input.s3Input.s3Uri;
          const s3Statement = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['s3:GetObject', 's3:ListBucket'],
            resources: [s3Uri, `${s3Uri}/*`]
          });
          iamPolicies.push({
            statement: s3Statement,
            description: 'S3 permissions for SageMaker processing input data',
            complianceRequirement: 'Processing input data access'
          });
        }
      }
    }

    // Grant S3 access for processing outputs
    if (targetData.processingOutputConfig?.outputs && Array.isArray(targetData.processingOutputConfig.outputs)) {
      for (const output of targetData.processingOutputConfig.outputs) {
        if (output.s3Output?.s3Uri) {
          const s3Uri = output.s3Output.s3Uri;
          const s3Statement = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['s3:PutObject', 's3:GetObject'],
            resources: [s3Uri, `${s3Uri}/*`]
          });
          iamPolicies.push({
            statement: s3Statement,
            description: 'S3 permissions for SageMaker processing output data',
            complianceRequirement: 'Processing output data access'
          });
        }
      }
    }

    // Set processing job environment variables
    environmentVariables['SAGEMAKER_PROCESSING_JOB_NAME'] = targetData.processingJobName;
    environmentVariables['SAGEMAKER_PROCESSING_JOB_ARN'] = targetData.processingJobArn;
    if (targetData.processingJobStatus) {
      environmentVariables['SAGEMAKER_PROCESSING_JOB_STATUS'] = targetData.processingJobStatus;
    }
    if (targetData.roleArn) {
      environmentVariables['SAGEMAKER_PROCESSING_JOB_ROLE_ARN'] = targetData.roleArn;
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Build secure access configuration for SageMaker notebook
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - subnetId?: string - Subnet ID for VPC configuration
   *   - securityGroupIds?: string[] - Security group IDs
   *   - kmsKeyId?: string - KMS key ID for encryption
   *   - disableRootAccess?: boolean - Disable root access
   *   - lifecycleConfigName?: string - Lifecycle configuration name
   * @returns Secure access configuration with environment variables and IAM policies
   */
  private async buildSecureNotebookAccessConfig(
    context: BindingContext,
    targetData: any
  ): Promise<{ environmentVariables: Record<string, string>; iamPolicies: IamPolicy[] }> {
    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];
    const region = context.target.context?.region || context.environment || 'us-east-1';
    const accountId = context.target.context?.accountId || '*';

    // Configure VPC security groups for private access
    if (targetData.subnetId) {
      environmentVariables['SAGEMAKER_SUBNET_ID'] = targetData.subnetId;
      if (targetData.securityGroupIds && Array.isArray(targetData.securityGroupIds)) {
        environmentVariables['SAGEMAKER_SECURITY_GROUP_IDS'] = targetData.securityGroupIds.join(',');
      }
    }

    // Configure encryption at rest
    if (targetData.kmsKeyId) {
      environmentVariables['SAGEMAKER_KMS_KEY_ID'] = targetData.kmsKeyId;

      // Grant KMS permissions
      const kmsStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
        resources: [targetData.kmsKeyId]
      });
      iamPolicies.push({
        statement: kmsStatement,
        description: 'KMS permissions for SageMaker notebook encryption',
        complianceRequirement: 'Encryption at rest'
      });
    }

    // Optionally restrict root access when configured
    if (targetData.disableRootAccess === true) {
      environmentVariables['SAGEMAKER_ROOT_ACCESS_ENABLED'] = 'false';
    }

    // Configure lifecycle configuration for automatic shutdown
    if (targetData.lifecycleConfigName) {
      environmentVariables['SAGEMAKER_LIFECYCLE_CONFIG'] = targetData.lifecycleConfigName;
    }

    // Configure monitoring and logging
    environmentVariables['SAGEMAKER_MONITORING_ENABLED'] = 'true';

    // Grant CloudWatch Logs permissions
    const logsStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: [`arn:aws:logs:${region}:${accountId}:log-group:/aws/sagemaker/NotebookInstances/*`]
    });
    iamPolicies.push({
      statement: logsStatement,
      description: 'CloudWatch Logs permissions for SageMaker notebook monitoring',
      complianceRequirement: 'Observability and compliance'
    });

    return { environmentVariables, iamPolicies };
  }
}
