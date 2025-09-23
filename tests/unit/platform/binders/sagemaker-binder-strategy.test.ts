/**
 * SageMaker Binder Strategy Tests
 * Comprehensive tests following Platform Testing Standard
 */

/**
 * Test Metadata:
 * {
 *   "id": "TP-sagemaker-binder-001",
 *   "level": "unit",
 *   "capability": "SageMaker binding strategy validation and error handling",
 *   "oracle": "exact",
 *   "invariants": ["null safety", "access pattern validation", "ARN construction safety"],
 *   "fixtures": ["deterministic clock", "seeded RNG", "mock components"],
 *   "inputs": { "shape": "SageMaker component properties and binding configurations", "notes": "includes null/undefined edge cases" },
 *   "risks": ["null reference errors", "ARN construction failures", "access pattern validation bypass"],
 *   "dependencies": ["SageMakerBinderStrategy", "BindingContext", "ComponentBinding"],
 *   "evidence": ["null safety validation", "error message quality", "access pattern coverage"],
 *   "compliance_refs": ["std://platform-testing-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SageMakerBinderStrategy } from '../../../../packages/core/src/platform/binders/strategies/ml/sagemaker-binder-strategy';
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

describe('SageMakerBinderStrategy', () => {
  let strategy: SageMakerBinderStrategy;
  let mockSourceComponent: any;
  let mockTargetComponent: any;
  let mockBinding: ComponentBinding;
  let mockContext: BindingContext;

  beforeEach(() => {
    strategy = new SageMakerBinderStrategy();

    mockSourceComponent = {
      addToRolePolicy: jest.fn(),
      addEnvironment: jest.fn()
    };

    mockTargetComponent = {
      notebookInstanceName: 'test-notebook',
      notebookInstanceArn: 'arn:aws:sagemaker:us-east-1:123456789012:notebook-instance/test-notebook',
      instanceType: 'ml.t3.medium',
      status: 'InService',
      modelName: 'test-model',
      modelArn: 'arn:aws:sagemaker:us-east-1:123456789012:model/test-model',
      modelPackageName: 'test-model-package',
      modelPackageArn: 'arn:aws:sagemaker:us-east-1:123456789012:model-package/test-model-package',
      endpointName: 'test-endpoint',
      endpointArn: 'arn:aws:sagemaker:us-east-1:123456789012:endpoint/test-endpoint',
      endpointConfigName: 'test-endpoint-config',
      trainingJobName: 'test-training-job',
      trainingJobArn: 'arn:aws:sagemaker:us-east-1:123456789012:training-job/test-training-job',
      algorithmSpecification: {
        trainingImage: '123456789012.dkr.ecr.us-east-1.amazonaws.com/test-algorithm:latest',
        trainingInputMode: 'File'
      },
      inputDataConfig: [
        {
          channelName: 'training',
          dataSource: {
            s3DataSource: {
              s3Uri: 's3://test-bucket/training-data/'
            }
          }
        }
      ],
      outputDataConfig: {
        s3OutputPath: 's3://test-bucket/output/'
      },
      resourceConfig: {
        instanceType: 'ml.m5.large',
        instanceCount: 1,
        volumeSizeInGB: 30
      },
      stoppingCondition: {
        maxRuntimeInSeconds: 3600
      }
    };

    mockBinding = {
      capability: 'sagemaker:notebook',
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
        'sagemaker:notebook',
        'sagemaker:model',
        'sagemaker:endpoint',
        'sagemaker:training-job'
      ]);
    });
  });

  describe('Bind__NullTargetComponent__ThrowsError', () => {
    test('should throw error when target component is null', async () => {
      await expect(strategy.bind(mockSourceComponent, null, mockBinding, mockContext))
        .rejects.toThrow('Target component is required for SageMaker binding');
    });
  });

  describe('Bind__NullBinding__ThrowsError', () => {
    test('should throw error when binding is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, null, mockContext))
        .rejects.toThrow('Binding is required for SageMaker binding');
    });
  });

  describe('Bind__NullContext__ThrowsError', () => {
    test('should throw error when context is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, null))
        .rejects.toThrow('Context is required for SageMaker binding');
    });
  });

  describe('Bind__MissingCapability__ThrowsError', () => {
    test('should throw error when capability is missing', async () => {
      const invalidBinding = { ...mockBinding, capability: undefined };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Binding capability is required');
    });
  });

  describe('Bind__MissingAccess__ThrowsError', () => {
    test('should throw error when access is missing', async () => {
      const invalidBinding = { ...mockBinding, access: undefined };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Binding access is required');
    });
  });

  describe('Bind__InvalidCapability__ThrowsError', () => {
    test('should throw error for unsupported capability', async () => {
      const invalidBinding = { ...mockBinding, capability: 'invalid:capability' };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Unsupported SageMaker capability: invalid:capability');
    });
  });

  describe('Bind__SageMakerNotebookCapability__ConfiguresNotebookAccess', () => {
    test('should configure read access for notebook', async () => {
      const readOnlyBinding = { ...mockBinding, access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, readOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'sagemaker:DescribeNotebookInstance',
          'sagemaker:ListNotebookInstances'
        ],
        Resource: mockTargetComponent.notebookInstanceArn
      });
    });

    test('should configure write access for notebook', async () => {
      const writeOnlyBinding = { ...mockBinding, access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, writeOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'sagemaker:CreateNotebookInstance',
          'sagemaker:UpdateNotebookInstance',
          'sagemaker:StartNotebookInstance',
          'sagemaker:StopNotebookInstance',
          'sagemaker:DeleteNotebookInstance'
        ],
        Resource: mockTargetComponent.notebookInstanceArn
      });
    });

    test('should inject notebook environment variables', async () => {
      await strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SAGEMAKER_NOTEBOOK_NAME', mockTargetComponent.notebookInstanceName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SAGEMAKER_NOTEBOOK_ARN', mockTargetComponent.notebookInstanceArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SAGEMAKER_INSTANCE_TYPE', mockTargetComponent.instanceType);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SAGEMAKER_STATUS', mockTargetComponent.status);
    });
  });

  describe('Bind__SageMakerModelCapability__ConfiguresModelAccess', () => {
    test('should configure read access for model', async () => {
      const modelBinding = { ...mockBinding, capability: 'sagemaker:model', access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, modelBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'sagemaker:DescribeModel',
          'sagemaker:ListModels'
        ],
        Resource: mockTargetComponent.modelArn
      });
    });

    test('should configure write access for model', async () => {
      const modelBinding = { ...mockBinding, capability: 'sagemaker:model', access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, modelBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'sagemaker:CreateModel',
          'sagemaker:UpdateModel',
          'sagemaker:DeleteModel'
        ],
        Resource: mockTargetComponent.modelArn
      });
    });

    test('should inject model environment variables', async () => {
      const modelBinding = { ...mockBinding, capability: 'sagemaker:model' };

      await strategy.bind(mockSourceComponent, mockTargetComponent, modelBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SAGEMAKER_MODEL_NAME', mockTargetComponent.modelName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SAGEMAKER_MODEL_ARN', mockTargetComponent.modelArn);
    });
  });

  describe('Bind__SageMakerEndpointCapability__ConfiguresEndpointAccess', () => {
    test('should configure read access for endpoint', async () => {
      const endpointBinding = { ...mockBinding, capability: 'sagemaker:endpoint', access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, endpointBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'sagemaker:DescribeEndpoint',
          'sagemaker:ListEndpoints'
        ],
        Resource: mockTargetComponent.endpointArn
      });
    });

    test('should configure write access for endpoint', async () => {
      const endpointBinding = { ...mockBinding, capability: 'sagemaker:endpoint', access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, endpointBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'sagemaker:CreateEndpoint',
          'sagemaker:UpdateEndpoint',
          'sagemaker:DeleteEndpoint'
        ],
        Resource: mockTargetComponent.endpointArn
      });
    });

    test('should inject endpoint environment variables', async () => {
      const endpointBinding = { ...mockBinding, capability: 'sagemaker:endpoint' };

      await strategy.bind(mockSourceComponent, mockTargetComponent, endpointBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SAGEMAKER_ENDPOINT_NAME', mockTargetComponent.endpointName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SAGEMAKER_ENDPOINT_ARN', mockTargetComponent.endpointArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SAGEMAKER_ENDPOINT_CONFIG', mockTargetComponent.endpointConfigName);
    });
  });

  describe('Bind__SageMakerTrainingJobCapability__ConfiguresTrainingJobAccess', () => {
    test('should configure read access for training job', async () => {
      const trainingBinding = { ...mockBinding, capability: 'sagemaker:training-job', access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, trainingBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'sagemaker:DescribeTrainingJob',
          'sagemaker:ListTrainingJobs'
        ],
        Resource: mockTargetComponent.trainingJobArn
      });
    });

    test('should configure write access for training job', async () => {
      const trainingBinding = { ...mockBinding, capability: 'sagemaker:training-job', access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, trainingBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'sagemaker:CreateTrainingJob',
          'sagemaker:StopTrainingJob'
        ],
        Resource: mockTargetComponent.trainingJobArn
      });
    });

    test('should inject training job environment variables', async () => {
      const trainingBinding = { ...mockBinding, capability: 'sagemaker:training-job' };

      await strategy.bind(mockSourceComponent, mockTargetComponent, trainingBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SAGEMAKER_TRAINING_JOB_NAME', mockTargetComponent.trainingJobName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SAGEMAKER_TRAINING_JOB_ARN', mockTargetComponent.trainingJobArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SAGEMAKER_ALGORITHM_IMAGE', mockTargetComponent.algorithmSpecification.trainingImage);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SAGEMAKER_INPUT_MODE', mockTargetComponent.algorithmSpecification.trainingInputMode);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SAGEMAKER_OUTPUT_PATH', mockTargetComponent.outputDataConfig.s3OutputPath);
    });
  });

  describe('Bind__EmptyAccessArray__ThrowsError', () => {
    test('should throw error when access array is empty', async () => {
      const emptyAccessBinding = { ...mockBinding, access: [] };

      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, emptyAccessBinding, mockContext))
        .rejects.toThrow('Access array cannot be empty for SageMaker binding');
    });
  });

  describe('Bind__InvalidAccessType__ThrowsError', () => {
    test('should throw error for invalid access type', async () => {
      const invalidAccessBinding = { ...mockBinding, access: ['invalid'] };

      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidAccessBinding, mockContext))
        .rejects.toThrow('Invalid access types for SageMaker binding: invalid. Valid types: read, write, admin, train, deploy');
    });
  });
});
