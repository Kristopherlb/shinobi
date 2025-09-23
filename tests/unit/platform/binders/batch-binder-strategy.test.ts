/**
 * Batch Binder Strategy Tests
 * Comprehensive tests following Platform Testing Standard
 */

/**
 * Test Metadata:
 * {
 *   "id": "TP-batch-binder-001",
 *   "level": "unit",
 *   "capability": "Batch binding strategy validation and error handling",
 *   "oracle": "exact",
 *   "invariants": ["null safety", "access pattern validation", "ARN construction safety"],
 *   "fixtures": ["deterministic clock", "seeded RNG", "mock components"],
 *   "inputs": { "shape": "Batch component properties and binding configurations", "notes": "includes null/undefined edge cases" },
 *   "risks": ["null reference errors", "ARN construction failures", "access pattern validation bypass"],
 *   "dependencies": ["BatchBinderStrategy", "BindingContext", "ComponentBinding"],
 *   "evidence": ["null safety validation", "error message quality", "access pattern coverage"],
 *   "compliance_refs": ["std://platform-testing-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BatchBinderStrategy } from '../../../../packages/core/src/platform/binders/strategies/compute/batch-binder-strategy';
import { BindingContext } from '../../../../packages/core/src/platform/binders/binding-context';
import { ComponentBinding } from '../../../../packages/core/src/platform/binders/component-binding';
import { ComplianceFramework } from '../../../../packages/core/src/platform/compliance/compliance-framework';

// Deterministic setup
let originalDateNow: () => number;
let mockDateNow: jest.SpiedFunction<typeof Date.now>;

beforeEach(() => {
  // Freeze clock for determinism
  originalDateNow = Date.now;
  const fixedTime = 1640995200000; // 2022-01-01T00:00:00Z
  mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(fixedTime);

  // Seed RNG for deterministic behavior
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  // Restore original functions
  mockDateNow.mockRestore();
  jest.restoreAllMocks();
});

describe('BatchBinderStrategy', () => {
  let strategy: BatchBinderStrategy;
  let mockSourceComponent: any;
  let mockTargetComponent: any;
  let mockBinding: ComponentBinding;
  let mockContext: BindingContext;

  beforeEach(() => {
    strategy = new BatchBinderStrategy();
    
    mockSourceComponent = {
      addToRolePolicy: jest.fn(),
      addEnvironment: jest.fn()
    };

    mockTargetComponent = {
      jobQueueArn: 'arn:aws:batch:us-east-1:123456789012:job-queue/test-queue',
      jobQueueName: 'test-queue',
      priority: 1,
      state: 'ENABLED',
      computeEnvironmentOrder: [
        { computeEnvironment: 'test-ce-1' },
        { computeEnvironment: 'test-ce-2' }
      ],
      computeEnvironmentArn: 'arn:aws:batch:us-east-1:123456789012:compute-environment/test-ce',
      computeEnvironmentName: 'test-ce',
      type: 'MANAGED',
      ecsClusterArn: 'arn:aws:ecs:us-east-1:123456789012:cluster/test-cluster',
      instanceRoleArn: 'arn:aws:iam::123456789012:role/test-role',
      computeResources: {
        instanceTypes: ['m5.large', 'm5.xlarge'],
        minvCpus: 0,
        maxvCpus: 256,
        desiredvCpus: 4
      },
      jobDefinitionArn: 'arn:aws:batch:us-east-1:123456789012:job-definition/test-job-def:1',
      jobDefinitionName: 'test-job-def',
      revision: 1,
      containerProperties: {
        image: '123456789012.dkr.ecr.us-east-1.amazonaws.com/test-repo:latest',
        vcpus: 2,
        memory: 4096,
        jobRoleArn: 'arn:aws:iam::123456789012:role/test-job-role'
      },
      ecrRepositoryArn: 'arn:aws:ecr:us-east-1:123456789012:repository/test-repo',
      jobArn: 'arn:aws:batch:us-east-1:123456789012:job/test-job',
      jobName: 'test-job',
      jobId: 'test-job-id',
      jobQueue: 'test-queue',
      jobDefinition: 'test-job-def:1',
      status: 'SUBMITTED',
      logStreamName: 'test-log-stream',
      networkConfiguration: {
        subnets: ['subnet-12345', 'subnet-67890'],
        securityGroups: ['sg-12345', 'sg-67890']
      },
      encryptionKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key',
      secrets: [
        { secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret-1' },
        { secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret-2' }
      ]
    };

    mockBinding = {
      from: 'test-source',
      to: 'test-target',
      capability: 'batch:job-queue',
      access: ['read', 'write']
    };

    mockContext = {
      region: 'us-east-1',
      accountId: '123456789012',
      complianceFramework: ComplianceFramework.COMMERCIAL
    };
  });

  describe('Constructor__ValidSetup__InitializesCorrectly', () => {
    test('should initialize with correct supported capabilities', () => {
      expect(strategy.supportedCapabilities).toEqual([
        'batch:job-queue',
        'batch:compute-environment',
        'batch:job-definition',
        'batch:job'
      ]);
    });
  });

  describe('Bind__NullTargetComponent__ThrowsError', () => {
    test('should throw error when target component is null', async () => {
      await expect(strategy.bind(mockSourceComponent, null, mockBinding, mockContext))
        .rejects.toThrow('Target component is required for Batch binding');
    });
  });

  describe('Bind__NullBinding__ThrowsError', () => {
    test('should throw error when binding is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, null as any, mockContext))
        .rejects.toThrow('Binding is required for Batch binding');
    });
  });

  describe('Bind__NullContext__ThrowsError', () => {
    test('should throw error when context is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, null as any))
        .rejects.toThrow('Context is required for Batch binding');
    });
  });

  describe('Bind__MissingCapability__ThrowsError', () => {
    test('should throw error when capability is missing', async () => {
      const invalidBinding = { ...mockBinding, capability: undefined as any };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Binding capability is required');
    });
  });

  describe('Bind__MissingAccess__ThrowsError', () => {
    test('should throw error when access is missing', async () => {
      const invalidBinding = { ...mockBinding, access: undefined as any };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Binding access is required');
    });
  });

  describe('Bind__InvalidCapability__ThrowsError', () => {
    test('should throw error for unsupported capability', async () => {
      const invalidBinding = { ...mockBinding, capability: 'invalid:capability' };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Unsupported Batch capability: invalid:capability');
    });
  });

  describe('Bind__BatchJobQueueCapability__ConfiguresJobQueueAccess', () => {
    test('should configure read access for job queue', async () => {
      const readOnlyBinding = { ...mockBinding, access: ['read'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, readOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'batch:DescribeJobQueues',
          'batch:ListJobs'
        ],
        Resource: mockTargetComponent.jobQueueArn
      });
    });

    test('should configure write access for job queue', async () => {
      const writeOnlyBinding = { ...mockBinding, access: ['write'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, writeOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'batch:SubmitJob',
          'batch:CancelJob',
          'batch:TerminateJob',
          'batch:UpdateJobQueue'
        ],
        Resource: [
          mockTargetComponent.jobQueueArn,
          `arn:aws:batch:${mockContext.region}:${mockContext.accountId}:job-queue/*`
        ]
      });
    });

    test('should inject job queue environment variables', async () => {
      await strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_JOB_QUEUE_NAME', mockTargetComponent.jobQueueName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_JOB_QUEUE_ARN', mockTargetComponent.jobQueueArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_JOB_QUEUE_PRIORITY', mockTargetComponent.priority.toString());
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_JOB_QUEUE_STATE', mockTargetComponent.state);
    });

    test('should configure compute environment association', async () => {
      await strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_COMPUTE_ENVIRONMENTS', 'test-ce-1,test-ce-2');
    });
  });

  describe('Bind__BatchComputeEnvironmentCapability__ConfiguresComputeEnvironmentAccess', () => {
    test('should configure read access for compute environment', async () => {
      const computeEnvBinding = { ...mockBinding, capability: 'batch:compute-environment', access: ['read'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, computeEnvBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'batch:DescribeComputeEnvironments'
        ],
        Resource: mockTargetComponent.computeEnvironmentArn
      });
    });

    test('should configure write access for compute environment', async () => {
      const computeEnvBinding = { ...mockBinding, capability: 'batch:compute-environment', access: ['write'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, computeEnvBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'batch:CreateComputeEnvironment',
          'batch:UpdateComputeEnvironment',
          'batch:DeleteComputeEnvironment'
        ],
        Resource: mockTargetComponent.computeEnvironmentArn
      });
    });

    test('should configure ECS cluster access for managed compute environments', async () => {
      const computeEnvBinding = { ...mockBinding, capability: 'batch:compute-environment' };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, computeEnvBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'ecs:DescribeClusters',
          'ecs:ListContainerInstances',
          'ecs:DescribeContainerInstances'
        ],
        Resource: mockTargetComponent.ecsClusterArn
      });
    });

    test('should configure instance role access for unmanaged compute environments', async () => {
      const computeEnvBinding = { ...mockBinding, capability: 'batch:compute-environment' };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, computeEnvBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'iam:PassRole'
        ],
        Resource: mockTargetComponent.instanceRoleArn
      });
    });

    test('should inject compute environment environment variables', async () => {
      const computeEnvBinding = { ...mockBinding, capability: 'batch:compute-environment' };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, computeEnvBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_COMPUTE_ENVIRONMENT_NAME', mockTargetComponent.computeEnvironmentName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_COMPUTE_ENVIRONMENT_ARN', mockTargetComponent.computeEnvironmentArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_COMPUTE_ENVIRONMENT_TYPE', mockTargetComponent.type);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_COMPUTE_ENVIRONMENT_STATE', mockTargetComponent.state);
    });

    test('should configure instance configuration', async () => {
      const computeEnvBinding = { ...mockBinding, capability: 'batch:compute-environment' };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, computeEnvBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_INSTANCE_TYPES', 'm5.large,m5.xlarge');
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_MIN_VCPUS', '0');
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_MAX_VCPUS', '256');
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_DESIRED_VCPUS', '4');
    });
  });

  describe('Bind__BatchJobDefinitionCapability__ConfiguresJobDefinitionAccess', () => {
    test('should configure read access for job definition', async () => {
      const jobDefBinding = { ...mockBinding, capability: 'batch:job-definition', access: ['read'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, jobDefBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'batch:DescribeJobDefinitions',
          'batch:ListJobs'
        ],
        Resource: mockTargetComponent.jobDefinitionArn
      });
    });

    test('should configure write access for job definition', async () => {
      const jobDefBinding = { ...mockBinding, capability: 'batch:job-definition', access: ['write'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, jobDefBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'batch:RegisterJobDefinition',
          'batch:DeregisterJobDefinition'
        ],
        Resource: mockTargetComponent.jobDefinitionArn
      });
    });

    test('should configure ECR access for container images', async () => {
      const jobDefBinding = { ...mockBinding, capability: 'batch:job-definition' };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, jobDefBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'ecr:GetAuthorizationToken',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage'
        ],
        Resource: mockTargetComponent.ecrRepositoryArn
      });
    });

    test('should inject job definition environment variables', async () => {
      const jobDefBinding = { ...mockBinding, capability: 'batch:job-definition' };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, jobDefBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_JOB_DEFINITION_NAME', mockTargetComponent.jobDefinitionName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_JOB_DEFINITION_ARN', mockTargetComponent.jobDefinitionArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_JOB_DEFINITION_REVISION', mockTargetComponent.revision.toString());
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_JOB_DEFINITION_TYPE', mockTargetComponent.type);
    });

    test('should configure container environment', async () => {
      const jobDefBinding = { ...mockBinding, capability: 'batch:job-definition' };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, jobDefBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_CONTAINER_IMAGE', mockTargetComponent.containerProperties.image);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_VCPUS', mockTargetComponent.containerProperties.vcpus.toString());
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_MEMORY', mockTargetComponent.containerProperties.memory.toString());
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_JOB_ROLE_ARN', mockTargetComponent.containerProperties.jobRoleArn);
    });
  });

  describe('Bind__BatchJobCapability__ConfiguresJobAccess', () => {
    test('should configure read access for job', async () => {
      const jobBinding = { ...mockBinding, capability: 'batch:job', access: ['read'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, jobBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'batch:DescribeJobs',
          'batch:ListJobs'
        ],
        Resource: mockTargetComponent.jobArn
      });
    });

    test('should configure write access for job', async () => {
      const jobBinding = { ...mockBinding, capability: 'batch:job', access: ['write'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, jobBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'batch:SubmitJob',
          'batch:CancelJob',
          'batch:TerminateJob'
        ],
        Resource: mockTargetComponent.jobArn
      });
    });

    test('should configure CloudWatch Logs access for job logs', async () => {
      const jobBinding = { ...mockBinding, capability: 'batch:job' };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, jobBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'logs:DescribeLogStreams',
          'logs:GetLogEvents'
        ],
        Resource: `arn:aws:logs:${mockContext.region}:${mockContext.accountId}:log-group:/aws/batch/job:log-stream:${mockTargetComponent.logStreamName}`
      });
    });

    test('should inject job environment variables', async () => {
      const jobBinding = { ...mockBinding, capability: 'batch:job' };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, jobBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_JOB_NAME', mockTargetComponent.jobName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_JOB_ARN', mockTargetComponent.jobArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_JOB_ID', mockTargetComponent.jobId);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_JOB_QUEUE', mockTargetComponent.jobQueue);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_JOB_DEFINITION', mockTargetComponent.jobDefinition);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_JOB_STATUS', mockTargetComponent.status);
    });
  });

  describe('Bind__FedRampModerateCompliance__ConfiguresSecureJobEnvironment', () => {
    test('should configure VPC networking for FedRAMP Moderate', async () => {
      const fedrampContext = { ...mockContext, complianceFramework: ComplianceFramework.FEDRAMP_MODERATE };
      const jobBinding = { ...mockBinding, capability: 'batch:job' };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, jobBinding, fedrampContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_SUBNETS', 'subnet-12345,subnet-67890');
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_SECURITY_GROUPS', 'sg-12345,sg-67890');
    });
  });

  describe('Bind__FedRampHighCompliance__ConfiguresEncryptionAndSecrets', () => {
    test('should configure encryption and secrets for FedRAMP High', async () => {
      const fedrampHighContext = { ...mockContext, complianceFramework: ComplianceFramework.FEDRAMP_HIGH };
      const jobBinding = { ...mockBinding, capability: 'batch:job' };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, jobBinding, fedrampHighContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_ENCRYPTION_ENABLED', 'true');
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_ENCRYPTION_KEY_ARN', mockTargetComponent.encryptionKeyArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BATCH_SECRETS_ARN', 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret-1,arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret-2');

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'kms:Decrypt',
          'kms:GenerateDataKey'
        ],
        Resource: mockTargetComponent.encryptionKeyArn
      });

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'secretsmanager:GetSecretValue'
        ],
        Resource: mockTargetComponent.secrets.map((s: any) => s.secretArn)
      });
    });
  });

  describe('Bind__EmptyAccessArray__ThrowsError', () => {
    test('should throw error when access array is empty', async () => {
      const emptyAccessBinding = { ...mockBinding, access: [] };
      
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, emptyAccessBinding, mockContext))
        .rejects.toThrow('Access array cannot be empty for Batch binding');
    });
  });

  describe('Bind__InvalidAccessType__ThrowsError', () => {
    test('should throw error for invalid access type', async () => {
      const invalidAccessBinding = { ...mockBinding, access: ['invalid'] };
      
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidAccessBinding, mockContext))
        .rejects.toThrow('Invalid access types for Batch binding: invalid. Valid types: read, write, admin, submit, cancel');
    });
  });
});
