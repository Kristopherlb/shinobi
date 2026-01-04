/**
 * Batch Binder Strategy (Unified)
 * Handles batch computing workload bindings for AWS Batch with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

/**
 * Batch Job Queue capability data structure
 * @property type - Capability type identifier
 * @property jobQueueArn - Job queue ARN (required)
 * @property jobQueueName - Job queue name (required)
 * @property priority - Job queue priority (required)
 * @property state - Job queue state (required)
 * @property computeEnvironmentOrder - Compute environment order (optional)
 */
interface BatchJobQueueCapabilityData {
  type: 'batch:job-queue';
  jobQueueArn: string;
  jobQueueName: string;
  priority: number;
  state: string;
  computeEnvironmentOrder?: Array<{
    computeEnvironment: string;
    order: number;
  }>;
}

/**
 * Batch Compute Environment capability data structure
 * @property type - Capability type identifier
 * @property computeEnvironmentArn - Compute environment ARN (required)
 * @property computeEnvironmentName - Compute environment name (required)
 * @property computeEnvironmentType - Compute environment type (required, e.g., 'MANAGED', 'UNMANAGED')
 * @property state - Compute environment state (required)
 * @property ecsClusterArn - ECS cluster ARN for managed environments (optional)
 * @property instanceRoleArn - Instance role ARN for unmanaged environments (optional)
 * @property computeResources - Compute resources configuration (optional)
 */
interface BatchComputeEnvironmentCapabilityData {
  type: 'batch:compute-environment';
  computeEnvironmentArn: string;
  computeEnvironmentName: string;
  computeEnvironmentType: string;
  state: string;
  ecsClusterArn?: string;
  instanceRoleArn?: string;
  computeResources?: {
    instanceTypes?: string[];
    minvCpus?: number;
    maxvCpus?: number;
    desiredvCpus?: number;
  };
}

/**
 * Batch Job Definition capability data structure
 * @property type - Capability type identifier
 * @property jobDefinitionArn - Job definition ARN (required)
 * @property jobDefinitionName - Job definition name (required)
 * @property revision - Job definition revision (required)
 * @property jobDefinitionType - Job definition type (required, e.g., 'container')
 * @property containerProperties - Container properties (optional)
 * @property ecrRepositoryArn - ECR repository ARN (optional)
 */
interface BatchJobDefinitionCapabilityData {
  type: 'batch:job-definition';
  jobDefinitionArn: string;
  jobDefinitionName: string;
  revision: number;
  jobDefinitionType: string;
  containerProperties?: {
    image: string;
    vcpus: number;
    memory: number;
    jobRoleArn?: string;
  };
  ecrRepositoryArn?: string;
}

/**
 * Batch Job capability data structure
 * @property type - Capability type identifier
 * @property jobArn - Job ARN (required)
 * @property jobName - Job name (required)
 * @property jobId - Job ID (required)
 * @property jobQueue - Job queue name (required)
 * @property jobDefinition - Job definition name (required)
 * @property status - Job status (required)
 * @property logStreamName - CloudWatch Logs log stream name (optional)
 * @property networkConfiguration - Network configuration (optional)
 * @property encryptionKeyArn - KMS encryption key ARN (optional)
 * @property secrets - Secrets Manager secrets (optional)
 * @property arrayProperties - Array job properties (optional)
 * @property retryStrategy - Retry strategy configuration (optional)
 */
interface BatchJobCapabilityData {
  type: 'batch:job';
  jobArn: string;
  jobName: string;
  jobId: string;
  jobQueue: string;
  jobDefinition: string;
  status: string;
  logStreamName?: string;
  networkConfiguration?: {
    subnets?: string[];
    securityGroups?: string[];
  };
  encryptionKeyArn?: string;
  secrets?: Array<{
    secretArn: string;
  }>;
  arrayProperties?: {
    size?: number;
    index?: number;
  };
  retryStrategy?: {
    attempts?: number;
    evaluateOnExit?: Array<{
      action: string;
      onStatusReason?: string;
      onReason?: string;
      onExitCode?: string;
    }>;
  };
}

type BatchCapabilityData =
  | BatchJobQueueCapabilityData
  | BatchComputeEnvironmentCapabilityData
  | BatchJobDefinitionCapabilityData
  | BatchJobCapabilityData;

export class BatchBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = [
    'batch:job-queue',
    'batch:compute-environment',
    'batch:job-definition',
    'batch:job'
  ];

  getStrategyName(): string {
    return 'Batch Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'batch-job-queue',
        capability: 'batch:job-queue',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Batch job queue for job submission and management',
        examples: ['lambda-api -> batch:job-queue (read)', 'ci-cd -> batch:job-queue (write)']
      },
      {
        sourceType: '*',
        targetType: 'batch-compute-environment',
        capability: 'batch:compute-environment',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Batch compute environment for compute resource management',
        examples: ['lambda-api -> batch:compute-environment (read)', 'ci-cd -> batch:compute-environment (write)']
      },
      {
        sourceType: '*',
        targetType: 'batch-job-definition',
        capability: 'batch:job-definition',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Batch job definition for job configuration',
        examples: ['lambda-api -> batch:job-definition (read)', 'ci-cd -> batch:job-definition (write)']
      },
      {
        sourceType: '*',
        targetType: 'batch-job',
        capability: 'batch:job',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Batch job for job execution and monitoring',
        examples: ['lambda-api -> batch:job (read)', 'ci-cd -> batch:job (write)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for Batch binding');
    }
    if (!capability) {
      throw new Error('Binding capability is required');
    }

    // Normalize access to array (directive.access is a single AccessLevel string)
    const access = directive.access ? [directive.access] : [];

    // Validate access patterns
    const validAccessTypes = ['read', 'write', 'readwrite'];
    const invalidAccess = access.filter(a => !validAccessTypes.includes(a));
    if (invalidAccess.length > 0) {
      throw new Error(`Invalid access types for Batch binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (access.length === 0) {
      throw new Error('Access cannot be empty for Batch binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Route to appropriate binding method based on capability
    if (capability === 'batch:job-queue') {
      return await this.bindToJobQueue(context, targetCapabilityData, access);
    } else if (capability === 'batch:compute-environment') {
      return await this.bindToComputeEnvironment(context, targetCapabilityData, access);
    } else if (capability === 'batch:job-definition') {
      return await this.bindToJobDefinition(context, targetCapabilityData, access);
    } else if (capability === 'batch:job') {
      return await this.bindToJob(context, targetCapabilityData, access);
    } else {
        throw new Error(`Unsupported Batch capability: ${capability}`);
    }
  }

  /**
   * Bind to Batch job queue
   */
  private async bindToJobQueue(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isBatchJobQueueCapabilityData(targetData)) {
      throw new Error('Invalid Batch job queue capability data structure. Expected jobQueueArn, jobQueueName, priority, and state.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Get base actions and resources
    const baseActions = this.getBatchJobQueueActionsForAccess(primaryAccess, context);
    
    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getBatchJobQueueActionsForAccess(acc, context).actions,
      'batch'
    );

    // Use resolved actions if granular override provided, otherwise use base actions
    // Resources always come from base (they're capability-specific)
    const finalActions = context.directive.actions ? resolvedActions : baseActions.actions;

    // Create IAM policies based on access level
    if (finalActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: finalActions,
          resources: baseActions.resources
        }),
        description: `Batch job queue ${primaryAccess} access`,
        complianceRequirement: `Batch job queue ${primaryAccess} access policy`
      });
    }

    // Set environment variables
    environmentVariables['BATCH_JOB_QUEUE_NAME'] = targetData.jobQueueName;
    environmentVariables['BATCH_JOB_QUEUE_ARN'] = targetData.jobQueueArn;
    environmentVariables['BATCH_JOB_QUEUE_PRIORITY'] = targetData.priority.toString();
    environmentVariables['BATCH_JOB_QUEUE_STATE'] = targetData.state;

    // Configure compute environment association
    if (targetData.computeEnvironmentOrder && targetData.computeEnvironmentOrder.length > 0) {
      environmentVariables['BATCH_COMPUTE_ENVIRONMENTS'] = targetData.computeEnvironmentOrder
        .map(ce => ce.computeEnvironment)
        .join(',');
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Batch compute environment
   */
  private async bindToComputeEnvironment(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isBatchComputeEnvironmentCapabilityData(targetData)) {
      throw new Error('Invalid Batch compute environment capability data structure. Expected computeEnvironmentArn, computeEnvironmentName, computeEnvironmentType, and state.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getBatchComputeEnvironmentActionsForAccess(acc),
      'batch'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.computeEnvironmentArn]
        }),
        description: `Batch compute environment ${primaryAccess} access`,
        complianceRequirement: `Batch compute environment ${primaryAccess} access policy`
      });
    }

    // Grant ECS cluster access for managed compute environments
    if (targetData.ecsClusterArn) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
          'ecs:DescribeClusters',
          'ecs:ListContainerInstances',
          'ecs:DescribeContainerInstances'
        ],
          resources: [targetData.ecsClusterArn]
        }),
        description: 'ECS cluster access for managed compute environment',
        complianceRequirement: 'ECS cluster access for Batch compute environment'
      });
    }

    // Grant EC2 instance profile access for unmanaged compute environments
    if (targetData.instanceRoleArn) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['iam:PassRole'],
          resources: [targetData.instanceRoleArn]
        }),
        description: 'IAM PassRole permission for unmanaged compute environment',
        complianceRequirement: 'IAM role assumption for Batch compute environment'
      });
    }

    // Set environment variables
    environmentVariables['BATCH_COMPUTE_ENVIRONMENT_NAME'] = targetData.computeEnvironmentName;
    environmentVariables['BATCH_COMPUTE_ENVIRONMENT_ARN'] = targetData.computeEnvironmentArn;
    environmentVariables['BATCH_COMPUTE_ENVIRONMENT_TYPE'] = targetData.computeEnvironmentType;
    environmentVariables['BATCH_COMPUTE_ENVIRONMENT_STATE'] = targetData.state;

    // Configure instance configuration
    if (targetData.computeResources) {
      if (targetData.computeResources.instanceTypes && targetData.computeResources.instanceTypes.length > 0) {
        environmentVariables['BATCH_INSTANCE_TYPES'] = targetData.computeResources.instanceTypes.join(',');
      }
      if (targetData.computeResources.minvCpus !== undefined) {
        environmentVariables['BATCH_MIN_VCPUS'] = targetData.computeResources.minvCpus.toString();
      }
      if (targetData.computeResources.maxvCpus !== undefined) {
        environmentVariables['BATCH_MAX_VCPUS'] = targetData.computeResources.maxvCpus.toString();
      }
      if (targetData.computeResources.desiredvCpus !== undefined) {
        environmentVariables['BATCH_DESIRED_VCPUS'] = targetData.computeResources.desiredvCpus.toString();
      }
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Batch job definition
   */
  private async bindToJobDefinition(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isBatchJobDefinitionCapabilityData(targetData)) {
      throw new Error('Invalid Batch job definition capability data structure. Expected jobDefinitionArn, jobDefinitionName, revision, and jobDefinitionType.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getBatchJobDefinitionActionsForAccess(acc),
      'batch'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.jobDefinitionArn]
        }),
        description: `Batch job definition ${primaryAccess} access`,
        complianceRequirement: `Batch job definition ${primaryAccess} access policy`
      });
    }

    // Grant ECR access for container images
    if (targetData.ecrRepositoryArn) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
          'ecr:GetAuthorizationToken',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage'
        ],
          resources: [targetData.ecrRepositoryArn]
        }),
        description: 'ECR access permissions for container images',
        complianceRequirement: 'Container image access for Batch job definition'
      });
    }

    // Set environment variables
    environmentVariables['BATCH_JOB_DEFINITION_NAME'] = targetData.jobDefinitionName;
    environmentVariables['BATCH_JOB_DEFINITION_ARN'] = targetData.jobDefinitionArn;
    environmentVariables['BATCH_JOB_DEFINITION_REVISION'] = targetData.revision.toString();
    environmentVariables['BATCH_JOB_DEFINITION_TYPE'] = targetData.jobDefinitionType;

    // Configure container environment
    if (targetData.containerProperties) {
      environmentVariables['BATCH_CONTAINER_IMAGE'] = targetData.containerProperties.image;
      environmentVariables['BATCH_VCPUS'] = targetData.containerProperties.vcpus.toString();
      environmentVariables['BATCH_MEMORY'] = targetData.containerProperties.memory.toString();

      if (targetData.containerProperties.jobRoleArn) {
        environmentVariables['BATCH_JOB_ROLE_ARN'] = targetData.containerProperties.jobRoleArn;
      }
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Batch job
   */
  private async bindToJob(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isBatchJobCapabilityData(targetData)) {
      throw new Error('Invalid Batch job capability data structure. Expected jobArn, jobName, jobId, jobQueue, jobDefinition, and status.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getBatchJobActionsForAccess(acc),
      'batch'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.jobArn]
        }),
        description: `Batch job ${primaryAccess} access`,
        complianceRequirement: `Batch job ${primaryAccess} access policy`
      });
    }

    // Grant CloudWatch Logs access for job logs
    if (targetData.logStreamName) {
      const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
      const accountId = (context.target.context as any)?.accountId || '123456789012';
      
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
          'logs:DescribeLogStreams',
          'logs:GetLogEvents'
        ],
          resources: [`arn:aws:logs:${region}:${accountId}:log-group:/aws/batch/job:log-stream:${targetData.logStreamName}`]
        }),
        description: 'CloudWatch Logs access for job logs',
        complianceRequirement: 'Logging and monitoring for Batch jobs'
      });
    }

    // Set environment variables
    environmentVariables['BATCH_JOB_NAME'] = targetData.jobName;
    environmentVariables['BATCH_JOB_ARN'] = targetData.jobArn;
    environmentVariables['BATCH_JOB_ID'] = targetData.jobId;
    environmentVariables['BATCH_JOB_QUEUE'] = targetData.jobQueue;
    environmentVariables['BATCH_JOB_DEFINITION'] = targetData.jobDefinition;
    environmentVariables['BATCH_JOB_STATUS'] = targetData.status;

    // Configure array job properties
    if (targetData.arrayProperties) {
      if (targetData.arrayProperties.size !== undefined) {
        environmentVariables['BATCH_ARRAY_JOB_SIZE'] = targetData.arrayProperties.size.toString();
      }
      if (targetData.arrayProperties.index !== undefined) {
        environmentVariables['BATCH_ARRAY_JOB_INDEX'] = targetData.arrayProperties.index.toString();
      }
    }

    // Configure retry strategy
    if (targetData.retryStrategy) {
      if (targetData.retryStrategy.attempts !== undefined) {
        environmentVariables['BATCH_RETRY_ATTEMPTS'] = targetData.retryStrategy.attempts.toString();
      }
      if (targetData.retryStrategy.evaluateOnExit && targetData.retryStrategy.evaluateOnExit.length > 0) {
        environmentVariables['BATCH_RETRY_STRATEGY'] = JSON.stringify(targetData.retryStrategy.evaluateOnExit);
      }
    }

    // Configure secure networking if requested via options
    if (context.directive.options?.requireSecureNetworking === true) {
      await this.configureSecureJobEnvironment(context, targetData, environmentVariables, iamPolicies);
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Configure secure job environment features
   */
  private async configureSecureJobEnvironment(
    context: BindingContext,
    targetData: BatchJobCapabilityData,
    environmentVariables: Record<string, string>,
    iamPolicies: IamPolicy[]
  ): Promise<void> {
    // Configure VPC networking for batch jobs
    if (targetData.networkConfiguration?.subnets) {
      environmentVariables['BATCH_SUBNETS'] = targetData.networkConfiguration.subnets.join(',');

      if (targetData.networkConfiguration.securityGroups) {
        environmentVariables['BATCH_SECURITY_GROUPS'] = targetData.networkConfiguration.securityGroups.join(',');
      }
    }

    // Configure encryption for sensitive data when requested via options
    if (context.directive.options?.enableEncryption === true) {
      environmentVariables['BATCH_ENCRYPTION_ENABLED'] = 'true';

      if (targetData.encryptionKeyArn) {
        environmentVariables['BATCH_ENCRYPTION_KEY_ARN'] = targetData.encryptionKeyArn;

        // Grant KMS permissions
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
            'kms:Decrypt',
            'kms:GenerateDataKey'
          ],
            resources: [targetData.encryptionKeyArn]
          }),
          description: 'KMS permissions for Batch job encryption',
          complianceRequirement: 'Encryption at rest for sensitive data'
        });
      }
    }

    // Configure secrets management
    if (targetData.secrets && targetData.secrets.length > 0) {
      environmentVariables['BATCH_SECRETS_ARN'] = targetData.secrets.map(s => s.secretArn).join(',');

      // Grant Secrets Manager permissions
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['secretsmanager:GetSecretValue'],
          resources: targetData.secrets.map(s => s.secretArn)
        }),
        description: 'Secrets Manager permissions for Batch job secrets',
        complianceRequirement: 'Secrets management for sensitive configuration'
      });
    }
  }

  /**
   * Get Batch job queue IAM actions and resources for access level
   */
  private getBatchJobQueueActionsForAccess(
    access: string,
    context: BindingContext
  ): { actions: string[]; resources: string[] } {
    const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
    const accountId = (context.target.context as any)?.accountId || '123456789012';

    switch (access) {
      case 'read':
        return {
          actions: [
            'batch:DescribeJobQueues',
            'batch:ListJobs'
          ],
          resources: ['*'] // DescribeJobQueues requires * or specific ARN
        };
      case 'write':
      case 'readwrite':
        return {
          actions: [
            'batch:DescribeJobQueues',
            'batch:ListJobs',
            'batch:SubmitJob',
            'batch:CancelJob',
            'batch:TerminateJob',
            'batch:UpdateJobQueue'
          ],
          resources: [
            '*', // For DescribeJobQueues
            `arn:aws:batch:${region}:${accountId}:job-queue/*`
          ]
        };
      default:
        return { actions: [], resources: [] };
    }
  }

  /**
   * Get Batch compute environment IAM actions for access level
   */
  private getBatchComputeEnvironmentActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return ['batch:DescribeComputeEnvironments'];
      case 'write':
      case 'readwrite':
        return [
          'batch:DescribeComputeEnvironments',
          'batch:CreateComputeEnvironment',
          'batch:UpdateComputeEnvironment',
          'batch:DeleteComputeEnvironment'
        ];
      default:
        return [];
    }
  }

  /**
   * Get Batch job definition IAM actions for access level
   */
  private getBatchJobDefinitionActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'batch:DescribeJobDefinitions',
          'batch:ListJobs'
        ];
      case 'write':
      case 'readwrite':
        return [
          'batch:DescribeJobDefinitions',
          'batch:ListJobs',
          'batch:RegisterJobDefinition',
          'batch:DeregisterJobDefinition'
        ];
      default:
        return [];
    }
  }

  /**
   * Get Batch job IAM actions for access level
   */
  private getBatchJobActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'batch:DescribeJobs',
          'batch:ListJobs'
        ];
      case 'write':
      case 'readwrite':
        return [
          'batch:DescribeJobs',
          'batch:ListJobs',
          'batch:SubmitJob',
          'batch:CancelJob',
          'batch:TerminateJob'
        ];
      default:
        return [];
    }
  }

  // Type guards

  private isBatchJobQueueCapabilityData(data: unknown): data is BatchJobQueueCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'batch:job-queue' &&
      typeof d.jobQueueArn === 'string' &&
      typeof d.jobQueueName === 'string' &&
      typeof d.priority === 'number' &&
      typeof d.state === 'string'
    );
  }

  private isBatchComputeEnvironmentCapabilityData(data: unknown): data is BatchComputeEnvironmentCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'batch:compute-environment' &&
      typeof d.computeEnvironmentArn === 'string' &&
      typeof d.computeEnvironmentName === 'string' &&
      typeof d.computeEnvironmentType === 'string' &&
      typeof d.state === 'string'
    );
  }

  private isBatchJobDefinitionCapabilityData(data: unknown): data is BatchJobDefinitionCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'batch:job-definition' &&
      typeof d.jobDefinitionArn === 'string' &&
      typeof d.jobDefinitionName === 'string' &&
      typeof d.revision === 'number' &&
      typeof d.jobDefinitionType === 'string'
    );
  }

  private isBatchJobCapabilityData(data: unknown): data is BatchJobCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'batch:job' &&
      typeof d.jobArn === 'string' &&
      typeof d.jobName === 'string' &&
      typeof d.jobId === 'string' &&
      typeof d.jobQueue === 'string' &&
      typeof d.jobDefinition === 'string' &&
      typeof d.status === 'string'
    );
  }
}
