/**
 * Unit Tests: Batch Binder Strategy (Unified)
 * Tests for AWS Batch workload bindings with compliance enforcement
 */

import { BatchBinderStrategy } from '../batch-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';

describe('BatchBinderStrategy', () => {
  describe('BatchBind__ValidJobQueueAccess__ReturnsJobQueueEnvVars', () => {
    const metadata = {
      id: 'TP-binders-batch-001',
      level: 'unit' as const,
      capability: 'Returns Batch job queue environment variables for valid job queue access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'BatchBind',
        condition: 'ValidJobQueueAccess',
        outcome: 'ReturnsJobQueueEnvVars'
      },
      invariants: [
        'Returns EnhancedBindingResult with compliance block',
        'Environment variables include BATCH_JOB_QUEUE_NAME, BATCH_JOB_QUEUE_ARN, BATCH_JOB_QUEUE_PRIORITY',
        'IAM policies include Batch read actions (DescribeJobQueues, ListJobs)',
        'Security group rules array is empty'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with batch:job-queue capability and read access',
        notes: 'Basic Batch job queue read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BatchBind__ValidJobQueueAccess__ReturnsJobQueueEnvVars', async () => {
      const strategy = new BatchBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('batch-job-queue', {
        'batch:job-queue': {
          type: 'batch:job-queue',
          jobQueueArn: 'arn:aws:batch:us-east-1:123456789012:job-queue/test-queue',
          jobQueueName: 'test-queue',
          priority: 1,
          state: 'ENABLED'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'batch:job-queue',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Job queue environment variables are set
      expect(result.environmentVariables['BATCH_JOB_QUEUE_NAME']).toBe('test-queue');
      expect(result.environmentVariables['BATCH_JOB_QUEUE_ARN']).toBe('arn:aws:batch:us-east-1:123456789012:job-queue/test-queue');
      expect(result.environmentVariables['BATCH_JOB_QUEUE_PRIORITY']).toBe('1');
      expect(result.environmentVariables['BATCH_JOB_QUEUE_STATE']).toBe('ENABLED');
      
      // Assert IAM policies include Batch read actions
      const queuePolicy = result.iamPolicies.find(p => p.description.includes('job queue') && p.description.includes('read'));
      expect(queuePolicy).toBeDefined();
      expect(queuePolicy!.statement.actions).toContain('batch:DescribeJobQueues');
      expect(queuePolicy!.statement.actions).toContain('batch:ListJobs');
      
      expect(result.securityGroupRules).toEqual([]);
    });
  });

  describe('BatchBind__JobQueueWriteAccess__GrantsJobQueueWriteActions', () => {
    const metadata = {
      id: 'TP-binders-batch-002',
      level: 'unit' as const,
      capability: 'Grants Batch job queue write actions including SubmitJob and UpdateJobQueue for write access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'BatchBind',
        condition: 'JobQueueWriteAccess',
        outcome: 'GrantsJobQueueWriteActions'
      },
      invariants: [
        'IAM policies include Batch write actions (SubmitJob, CancelJob, TerminateJob, UpdateJobQueue)',
        'Read actions are included in write access',
        'Resources include job queue ARN and wildcard for job submissions'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with batch:job-queue capability and write access',
        notes: 'Batch job queue write access with job submission permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BatchBind__JobQueueWriteAccess__GrantsJobQueueWriteActions', async () => {
      const strategy = new BatchBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('batch-job-queue', {
        'batch:job-queue': {
          type: 'batch:job-queue',
          jobQueueArn: 'arn:aws:batch:us-east-1:123456789012:job-queue/test-queue',
          jobQueueName: 'test-queue',
          priority: 1,
          state: 'ENABLED'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'batch:job-queue',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Write actions are granted
      const writePolicy = result.iamPolicies.find(p => p.description.includes('job queue') && p.description.includes('write'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('batch:SubmitJob');
      expect(writePolicy!.statement.actions).toContain('batch:CancelJob');
      expect(writePolicy!.statement.actions).toContain('batch:TerminateJob');
      expect(writePolicy!.statement.actions).toContain('batch:UpdateJobQueue');
      expect(writePolicy!.statement.actions).toContain('batch:DescribeJobQueues');
    });
  });

  describe('BatchBind__ValidComputeEnvironmentAccess__ReturnsComputeEnvironmentEnvVars', () => {
    const metadata = {
      id: 'TP-binders-batch-003',
      level: 'unit' as const,
      capability: 'Returns Batch compute environment environment variables for valid compute environment access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'BatchBind',
        condition: 'ValidComputeEnvironmentAccess',
        outcome: 'ReturnsComputeEnvironmentEnvVars'
      },
      invariants: [
        'Environment variables include BATCH_COMPUTE_ENVIRONMENT_NAME, BATCH_COMPUTE_ENVIRONMENT_ARN, BATCH_COMPUTE_ENVIRONMENT_TYPE',
        'IAM policies include Batch compute environment read actions',
        'ECS cluster access is granted for managed compute environments',
        'IAM PassRole permission is granted for unmanaged compute environments'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with batch:compute-environment capability and read access',
        notes: 'Basic Batch compute environment read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BatchBind__ValidComputeEnvironmentAccess__ReturnsComputeEnvironmentEnvVars', async () => {
      const strategy = new BatchBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('batch-compute-environment', {
        'batch:compute-environment': {
          type: 'batch:compute-environment',
          computeEnvironmentArn: 'arn:aws:batch:us-east-1:123456789012:compute-environment/test-ce',
          computeEnvironmentName: 'test-ce',
          computeEnvironmentType: 'MANAGED',
          state: 'ENABLED',
          ecsClusterArn: 'arn:aws:ecs:us-east-1:123456789012:cluster/test-cluster',
          computeResources: {
            instanceTypes: ['m5.large'],
            minvCpus: 0,
            maxvCpus: 256,
            desiredvCpus: 4
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'batch:compute-environment',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Compute environment environment variables are set
      expect(result.environmentVariables['BATCH_COMPUTE_ENVIRONMENT_NAME']).toBe('test-ce');
      expect(result.environmentVariables['BATCH_COMPUTE_ENVIRONMENT_ARN']).toBe('arn:aws:batch:us-east-1:123456789012:compute-environment/test-ce');
      expect(result.environmentVariables['BATCH_COMPUTE_ENVIRONMENT_TYPE']).toBe('MANAGED');
      expect(result.environmentVariables['BATCH_INSTANCE_TYPES']).toBe('m5.large');
      expect(result.environmentVariables['BATCH_MIN_VCPUS']).toBe('0');
      expect(result.environmentVariables['BATCH_MAX_VCPUS']).toBe('256');
      expect(result.environmentVariables['BATCH_DESIRED_VCPUS']).toBe('4');
      
      // Assert IAM policies include ECS cluster access
      const ecsPolicy = result.iamPolicies.find(p => p.description.includes('ECS cluster'));
      expect(ecsPolicy).toBeDefined();
      expect(ecsPolicy!.statement.actions).toContain('ecs:DescribeClusters');
      expect(ecsPolicy!.statement.resources).toEqual(['arn:aws:ecs:us-east-1:123456789012:cluster/test-cluster']);
    });
  });

  describe('BatchBind__ValidJobDefinitionAccess__ReturnsJobDefinitionEnvVars', () => {
    const metadata = {
      id: 'TP-binders-batch-004',
      level: 'unit' as const,
      capability: 'Returns Batch job definition environment variables for valid job definition access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'BatchBind',
        condition: 'ValidJobDefinitionAccess',
        outcome: 'ReturnsJobDefinitionEnvVars'
      },
      invariants: [
        'Environment variables include BATCH_JOB_DEFINITION_NAME, BATCH_JOB_DEFINITION_ARN, BATCH_JOB_DEFINITION_REVISION',
        'IAM policies include Batch job definition read actions',
        'ECR access is granted when ECR repository ARN is provided',
        'Container properties are exposed as environment variables'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with batch:job-definition capability and read access',
        notes: 'Basic Batch job definition read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BatchBind__ValidJobDefinitionAccess__ReturnsJobDefinitionEnvVars', async () => {
      const strategy = new BatchBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('batch-job-definition', {
        'batch:job-definition': {
          type: 'batch:job-definition',
          jobDefinitionArn: 'arn:aws:batch:us-east-1:123456789012:job-definition/test-job-def:1',
          jobDefinitionName: 'test-job-def',
          revision: 1,
          jobDefinitionType: 'container',
          ecrRepositoryArn: 'arn:aws:ecr:us-east-1:123456789012:repository/test-repo',
          containerProperties: {
            image: '123456789012.dkr.ecr.us-east-1.amazonaws.com/test-repo:latest',
            vcpus: 2,
            memory: 4096,
            jobRoleArn: 'arn:aws:iam::123456789012:role/batch-job-role'
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'batch:job-definition',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Job definition environment variables are set
      expect(result.environmentVariables['BATCH_JOB_DEFINITION_NAME']).toBe('test-job-def');
      expect(result.environmentVariables['BATCH_JOB_DEFINITION_ARN']).toBe('arn:aws:batch:us-east-1:123456789012:job-definition/test-job-def:1');
      expect(result.environmentVariables['BATCH_JOB_DEFINITION_REVISION']).toBe('1');
      expect(result.environmentVariables['BATCH_CONTAINER_IMAGE']).toBe('123456789012.dkr.ecr.us-east-1.amazonaws.com/test-repo:latest');
      expect(result.environmentVariables['BATCH_VCPUS']).toBe('2');
      expect(result.environmentVariables['BATCH_MEMORY']).toBe('4096');
      expect(result.environmentVariables['BATCH_JOB_ROLE_ARN']).toBe('arn:aws:iam::123456789012:role/batch-job-role');
      
      // Assert IAM policies include ECR access
      const ecrPolicy = result.iamPolicies.find(p => p.description.includes('ECR'));
      expect(ecrPolicy).toBeDefined();
      expect(ecrPolicy!.statement.actions).toContain('ecr:GetAuthorizationToken');
      expect(ecrPolicy!.statement.resources).toEqual(['arn:aws:ecr:us-east-1:123456789012:repository/test-repo']);
    });
  });

  describe('BatchBind__ValidJobAccess__ReturnsJobEnvVars', () => {
    const metadata = {
      id: 'TP-binders-batch-005',
      level: 'unit' as const,
      capability: 'Returns Batch job environment variables for valid job access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'BatchBind',
        condition: 'ValidJobAccess',
        outcome: 'ReturnsJobEnvVars'
      },
      invariants: [
        'Environment variables include BATCH_JOB_NAME, BATCH_JOB_ARN, BATCH_JOB_ID, BATCH_JOB_STATUS',
        'IAM policies include Batch job read actions',
        'CloudWatch Logs access is granted when log stream name is provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with batch:job capability and read access',
        notes: 'Basic Batch job read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BatchBind__ValidJobAccess__ReturnsJobEnvVars', async () => {
      const strategy = new BatchBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('batch-job', {
        'batch:job': {
          type: 'batch:job',
          jobArn: 'arn:aws:batch:us-east-1:123456789012:job/test-queue/abc123',
          jobName: 'test-job',
          jobId: 'abc123',
          jobQueue: 'test-queue',
          jobDefinition: 'test-job-def:1',
          status: 'RUNNING',
          logStreamName: 'test-log-stream'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'batch:job',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Job environment variables are set
      expect(result.environmentVariables['BATCH_JOB_NAME']).toBe('test-job');
      expect(result.environmentVariables['BATCH_JOB_ARN']).toBe('arn:aws:batch:us-east-1:123456789012:job/test-queue/abc123');
      expect(result.environmentVariables['BATCH_JOB_ID']).toBe('abc123');
      expect(result.environmentVariables['BATCH_JOB_QUEUE']).toBe('test-queue');
      expect(result.environmentVariables['BATCH_JOB_DEFINITION']).toBe('test-job-def:1');
      expect(result.environmentVariables['BATCH_JOB_STATUS']).toBe('RUNNING');
      
      // Assert IAM policies include CloudWatch Logs access
      const logsPolicy = result.iamPolicies.find(p => p.description.includes('CloudWatch Logs'));
      expect(logsPolicy).toBeDefined();
      expect(logsPolicy!.statement.actions).toContain('logs:DescribeLogStreams');
      expect(logsPolicy!.statement.actions).toContain('logs:GetLogEvents');
    });
  });

  describe('BatchBind__SecureNetworkingEnabled__ConfiguresVpcEncryptionSecrets', () => {
    const metadata = {
      id: 'TP-binders-batch-006',
      level: 'unit' as const,
      capability: 'Configures VPC networking, encryption, and secrets when secure networking is enabled',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'BatchBind',
        condition: 'SecureNetworkingEnabled',
        outcome: 'ConfiguresVpcEncryptionSecrets'
      },
      invariants: [
        'Environment variables include BATCH_SUBNETS, BATCH_SECURITY_GROUPS when network configuration is provided',
        'KMS permissions are granted when encryption is enabled',
        'Secrets Manager permissions are granted when secrets are provided',
        'Secure networking configuration is optional and only applied when requireSecureNetworking is true'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with batch:job capability and requireSecureNetworking option',
        notes: 'Batch job binding with secure networking enabled'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BatchBind__SecureNetworkingEnabled__ConfiguresVpcEncryptionSecrets', async () => {
      const strategy = new BatchBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('batch-job', {
        'batch:job': {
          type: 'batch:job',
          jobArn: 'arn:aws:batch:us-east-1:123456789012:job/test-queue/abc123',
          jobName: 'test-job',
          jobId: 'abc123',
          jobQueue: 'test-queue',
          jobDefinition: 'test-job-def:1',
          status: 'RUNNING',
          networkConfiguration: {
            subnets: ['subnet-123', 'subnet-456'],
            securityGroups: ['sg-123', 'sg-456']
          },
          encryptionKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/abc123',
          secrets: [
            { secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret-abc123' }
          ]
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'batch:job',
        access: 'read',
        options: {
          requireSecureNetworking: true,
          enableEncryption: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Secure networking environment variables are set
      expect(result.environmentVariables['BATCH_SUBNETS']).toBe('subnet-123,subnet-456');
      expect(result.environmentVariables['BATCH_SECURITY_GROUPS']).toBe('sg-123,sg-456');
      expect(result.environmentVariables['BATCH_ENCRYPTION_ENABLED']).toBe('true');
      expect(result.environmentVariables['BATCH_ENCRYPTION_KEY_ARN']).toBe('arn:aws:kms:us-east-1:123456789012:key/abc123');
      expect(result.environmentVariables['BATCH_SECRETS_ARN']).toBe('arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret-abc123');
      
      // Assert IAM policies include KMS and Secrets Manager permissions
      const kmsPolicy = result.iamPolicies.find(p => p.description.includes('KMS'));
      expect(kmsPolicy).toBeDefined();
      expect(kmsPolicy!.statement.actions).toContain('kms:Decrypt');
      expect(kmsPolicy!.statement.resources).toEqual(['arn:aws:kms:us-east-1:123456789012:key/abc123']);
      
      const secretsPolicy = result.iamPolicies.find(p => p.description.includes('Secrets Manager'));
      expect(secretsPolicy).toBeDefined();
      expect(secretsPolicy!.statement.actions).toContain('secretsmanager:GetSecretValue');
      expect(secretsPolicy!.statement.resources).toContain('arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret-abc123');
    });
  });

  describe('BatchBind__ArrayJobAndRetryStrategy__ExposesConfiguration', () => {
    const metadata = {
      id: 'TP-binders-batch-007',
      level: 'unit' as const,
      capability: 'Exposes array job and retry strategy configuration as environment variables',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'BatchBind',
        condition: 'ArrayJobAndRetryStrategy',
        outcome: 'ExposesConfiguration'
      },
      invariants: [
        'Array job size and index are exposed as environment variables when provided',
        'Retry strategy attempts and evaluateOnExit are exposed as environment variables when provided',
        'Array job and retry strategy configuration is optional'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with batch:job capability including arrayProperties and retryStrategy',
        notes: 'Batch job binding with array job and retry strategy configuration'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BatchBind__ArrayJobAndRetryStrategy__ExposesConfiguration', async () => {
      const strategy = new BatchBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('batch-job', {
        'batch:job': {
          type: 'batch:job',
          jobArn: 'arn:aws:batch:us-east-1:123456789012:job/test-queue/abc123',
          jobName: 'test-job',
          jobId: 'abc123',
          jobQueue: 'test-queue',
          jobDefinition: 'test-job-def:1',
          status: 'RUNNING',
          arrayProperties: {
            size: 10,
            index: 5
          },
          retryStrategy: {
            attempts: 3,
            evaluateOnExit: [
              {
                action: 'RETRY',
                onExitCode: '1'
              },
              {
                action: 'EXIT',
                onReason: 'ContainerCannotRun'
              }
            ]
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'batch:job',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Array job properties are exposed
      expect(result.environmentVariables['BATCH_ARRAY_JOB_SIZE']).toBe('10');
      expect(result.environmentVariables['BATCH_ARRAY_JOB_INDEX']).toBe('5');
      
      // Primary assertion: Retry strategy is exposed
      expect(result.environmentVariables['BATCH_RETRY_ATTEMPTS']).toBe('3');
      expect(result.environmentVariables['BATCH_RETRY_STRATEGY']).toBeDefined();
      
      // Verify retry strategy JSON structure
      const retryStrategy = JSON.parse(result.environmentVariables['BATCH_RETRY_STRATEGY']);
      expect(retryStrategy).toHaveLength(2);
      expect(retryStrategy[0]).toMatchObject({
        action: 'RETRY',
        onExitCode: '1'
      });
      expect(retryStrategy[1]).toMatchObject({
        action: 'EXIT',
        onReason: 'ContainerCannotRun'
      });
    });

    test('BatchBind__ArrayJobAndRetryStrategy__OptionalConfiguration', async () => {
      const strategy = new BatchBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('batch-job', {
        'batch:job': {
          type: 'batch:job',
          jobArn: 'arn:aws:batch:us-east-1:123456789012:job/test-queue/abc123',
          jobName: 'test-job',
          jobId: 'abc123',
          jobQueue: 'test-queue',
          jobDefinition: 'test-job-def:1',
          status: 'RUNNING'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'batch:job',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Array job and retry strategy env vars are not set when not provided
      expect(result.environmentVariables['BATCH_ARRAY_JOB_SIZE']).toBeUndefined();
      expect(result.environmentVariables['BATCH_ARRAY_JOB_INDEX']).toBeUndefined();
      expect(result.environmentVariables['BATCH_RETRY_ATTEMPTS']).toBeUndefined();
      expect(result.environmentVariables['BATCH_RETRY_STRATEGY']).toBeUndefined();
    });
  });

  describe('BatchBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-compute-batch-010',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default Batch actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BatchBind__Condition__Outcome', example: 'BatchBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default Batch actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with batch:job-queue capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BatchBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new BatchBinderStrategy();
      const customActions = ['batch:DescribeJobQueues', 'batch:ListJobs'];
      const target = createMockTargetComponent('batch-job-queue', {
        'batch:job-queue': {
          type: 'batch:job-queue',
          jobQueueArn: 'arn:aws:batch:us-east-1:123456789012:job-queue/test-queue',
          jobQueueName: 'test-queue',
          priority: 1,
          state: 'ENABLED'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'batch:job-queue',
        access: 'read',
        actions: customActions
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.iamPolicies.length).toBeGreaterThan(0);
      const policy = result.iamPolicies.find(p => p.description.includes('job queue'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toEqual(expect.arrayContaining(customActions));
      expect(actions.length).toBe(customActions.length);
    });
  });
});
