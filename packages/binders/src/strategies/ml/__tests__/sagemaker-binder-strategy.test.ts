/**
 * SageMaker Binder Strategy Tests (Unified)
 * 
 * Tests for SageMakerBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { SageMakerBinderStrategy } from '../sagemaker-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';

describe('SageMakerBinderStrategy', () => {
  describe('SageMakerBind__NotebookReadAccess__ReturnsEnhancedResultWithCompliance', () => {
    const metadata = {
      id: 'TP-binders-sagemaker-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables.SAGEMAKER_NOTEBOOK_INSTANCE_ARN matches input notebookInstanceArn',
        'result.iamPolicies is an array',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'SageMakerNotebookCapabilityData'],
      inputs: {
        shape: 'BindingContext with sagemaker:notebook capability, notebookInstanceArn, notebookInstanceName',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SageMakerBind__NotebookReadAccess__ReturnsEnhancedResultWithCompliance', async () => {
      const strategy = new SageMakerBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-function');
      const notebookArn = 'arn:aws:sagemaker:us-east-1:123456789012:notebook-instance/test-notebook';
      const target = createMockTargetComponent('sagemaker-notebook', {
        'sagemaker:notebook': {
          notebookInstanceArn: notebookArn,
          notebookInstanceName: 'test-notebook',
          instanceType: 'ml.t3.medium',
          notebookInstanceStatus: 'InService'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'sagemaker:notebook',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Assert EnhancedBindingResult structure
      assertEnhancedBindingResult(result);

      // Primary assertion: compliance block exists and has correct structure
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
      expect(result.compliance.framework).toBe(TEST_CONSTANTS.COMPLIANCE_FRAMEWORK);
      expect(Array.isArray(result.compliance.actionsTaken)).toBe(true);

      // Invariants
      expect(result.environmentVariables.SAGEMAKER_NOTEBOOK_INSTANCE_ARN).toBe(notebookArn);
      expect(result.environmentVariables.SAGEMAKER_NOTEBOOK_INSTANCE_NAME).toBe('test-notebook');
      expect(Array.isArray(result.iamPolicies)).toBe(true);
      expect(Array.isArray(result.securityGroupRules)).toBe(true);
    });
  });

  describe('SageMakerBind__NotebookWriteAccess__GrantsNotebookWriteActions', () => {
    test('SageMakerBind__NotebookWriteAccess__GrantsNotebookWriteActions', async () => {
      const strategy = new SageMakerBinderStrategy();
      const notebookArn = 'arn:aws:sagemaker:us-east-1:123456789012:notebook-instance/test-notebook';
      const target = createMockTargetComponent('sagemaker-notebook', {
        'sagemaker:notebook': {
          notebookInstanceArn: notebookArn,
          notebookInstanceName: 'test-notebook'
        }
      });

      const context = createBindingContext({
        target,
        capability: 'sagemaker:notebook',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.iamPolicies.length).toBeGreaterThan(0);

      const policy = result.iamPolicies.find(p => 
        p.description.includes('write')
      );
      expect(policy).toBeDefined();
      const statementJson = policy!.statement.toStatementJson();
      expect(statementJson.Effect).toBe('Allow');
      const actions = Array.isArray(statementJson.Action) 
        ? statementJson.Action 
        : [statementJson.Action];
      expect(actions.some(a => a.includes('CreateNotebookInstance') || a.includes('UpdateNotebookInstance'))).toBe(true);
    });
  });

  describe('SageMakerBind__ModelReadAccess__GrantsModelReadActions', () => {
    test('SageMakerBind__ModelReadAccess__GrantsModelReadActions', async () => {
      const strategy = new SageMakerBinderStrategy();
      const modelArn = 'arn:aws:sagemaker:us-east-1:123456789012:model/test-model';
      const target = createMockTargetComponent('sagemaker-model', {
        'sagemaker:model': {
          modelArn,
          modelName: 'test-model'
        }
      });

      const context = createBindingContext({
        target,
        capability: 'sagemaker:model',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.SAGEMAKER_MODEL_ARN).toBe(modelArn);
      expect(result.iamPolicies.length).toBeGreaterThan(0);
    });
  });

  describe('SageMakerBind__EndpointInvokeAccess__GrantsInvokePermissions', () => {
    test('SageMakerBind__EndpointInvokeAccess__GrantsInvokePermissions', async () => {
      const strategy = new SageMakerBinderStrategy();
      const endpointArn = 'arn:aws:sagemaker:us-east-1:123456789012:endpoint/test-endpoint';
      const target = createMockTargetComponent('sagemaker-endpoint', {
        'sagemaker:endpoint': {
          endpointArn,
          endpointName: 'test-endpoint'
        }
      });

      const context = createBindingContext({
        target,
        capability: 'sagemaker:endpoint',
        access: 'invoke'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      const invokePolicy = result.iamPolicies.find(p => 
        p.description.includes('invoke')
      );
      expect(invokePolicy).toBeDefined();
      const statementJson = invokePolicy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action) 
        ? statementJson.Action 
        : [statementJson.Action];
      expect(actions.some(a => a.includes('InvokeEndpoint'))).toBe(true);
    });
  });

  describe('SageMakerBind__EndpointAsyncInvokeAccess__GrantsAsyncInvokePermissions', () => {
    test('SageMakerBind__EndpointAsyncInvokeAccess__GrantsAsyncInvokePermissions', async () => {
      const strategy = new SageMakerBinderStrategy();
      const endpointArn = 'arn:aws:sagemaker:us-east-1:123456789012:endpoint/test-endpoint';
      const target = createMockTargetComponent('sagemaker-endpoint', {
        'sagemaker:endpoint': {
          endpointArn,
          endpointName: 'test-endpoint',
          asyncInferenceConfig: {
            outputConfig: {
              s3OutputPath: 's3://bucket/async-output'
            }
          }
        }
      });

      const context = createBindingContext({
        target,
        capability: 'sagemaker:endpoint',
        access: 'async-invoke'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      const asyncPolicy = result.iamPolicies.find(p => 
        p.description.includes('asynchronous')
      );
      expect(asyncPolicy).toBeDefined();
      expect(result.environmentVariables.SAGEMAKER_ASYNC_INFERENCE_ENABLED).toBe('true');
    });
  });

  describe('SageMakerBind__EndpointMultiModel__SetsMultiModelConfig', () => {
    test('SageMakerBind__EndpointMultiModel__SetsMultiModelConfig', async () => {
      const strategy = new SageMakerBinderStrategy();
      const endpointArn = 'arn:aws:sagemaker:us-east-1:123456789012:endpoint/test-endpoint';
      const target = createMockTargetComponent('sagemaker-endpoint', {
        'sagemaker:endpoint': {
          endpointArn,
          endpointName: 'test-endpoint',
          multiModelConfig: {
            modelCacheSetting: 'Enabled'
          }
        }
      });

      const context = createBindingContext({
        target,
        capability: 'sagemaker:endpoint',
        access: 'invoke'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.SAGEMAKER_MULTI_MODEL_ENABLED).toBe('true');
      expect(result.environmentVariables.SAGEMAKER_MODEL_CACHE_SETTING).toBe('Enabled');
    });
  });

  describe('SageMakerBind__TrainingJobReadAccess__GrantsTrainingJobReadActions', () => {
    test('SageMakerBind__TrainingJobReadAccess__GrantsTrainingJobReadActions', async () => {
      const strategy = new SageMakerBinderStrategy();
      const trainingJobArn = 'arn:aws:sagemaker:us-east-1:123456789012:training-job/test-job';
      const target = createMockTargetComponent('sagemaker-training-job', {
        'sagemaker:training-job': {
          trainingJobArn,
          trainingJobName: 'test-job'
        }
      });

      const context = createBindingContext({
        target,
        capability: 'sagemaker:training-job',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.SAGEMAKER_TRAINING_JOB_ARN).toBe(trainingJobArn);
    });
  });

  describe('SageMakerBind__StudioDomainReadAccess__GrantsDomainReadActions', () => {
    test('SageMakerBind__StudioDomainReadAccess__GrantsDomainReadActions', async () => {
      const strategy = new SageMakerBinderStrategy();
      const domainArn = 'arn:aws:sagemaker:us-east-1:123456789012:domain/d-test';
      const target = createMockTargetComponent('sagemaker-studio-domain', {
        'sagemaker:studio-domain': {
          domainId: 'd-test',
          domainArn,
          domainName: 'test-domain'
        }
      });

      const context = createBindingContext({
        target,
        capability: 'sagemaker:studio-domain',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.SAGEMAKER_STUDIO_DOMAIN_ARN).toBe(domainArn);
    });
  });

  describe('SageMakerBind__StudioUserProfileReadAccess__GrantsUserProfileReadActions', () => {
    test('SageMakerBind__StudioUserProfileReadAccess__GrantsUserProfileReadActions', async () => {
      const strategy = new SageMakerBinderStrategy();
      const userProfileArn = 'arn:aws:sagemaker:us-east-1:123456789012:user-profile/d-test/user';
      const target = createMockTargetComponent('sagemaker-studio-user-profile', {
        'sagemaker:studio-user-profile': {
          userProfileName: 'user',
          userProfileArn
        }
      });

      const context = createBindingContext({
        target,
        capability: 'sagemaker:studio-user-profile',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.SAGEMAKER_STUDIO_USER_PROFILE_ARN).toBe(userProfileArn);
    });
  });

  describe('SageMakerBind__ProcessingJobReadAccess__GrantsProcessingJobReadActions', () => {
    test('SageMakerBind__ProcessingJobReadAccess__GrantsProcessingJobReadActions', async () => {
      const strategy = new SageMakerBinderStrategy();
      const processingJobArn = 'arn:aws:sagemaker:us-east-1:123456789012:processing-job/test-job';
      const target = createMockTargetComponent('sagemaker-processing-job', {
        'sagemaker:processing-job': {
          processingJobArn,
          processingJobName: 'test-job'
        }
      });

      const context = createBindingContext({
        target,
        capability: 'sagemaker:processing-job',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.SAGEMAKER_PROCESSING_JOB_ARN).toBe(processingJobArn);
    });
  });

  describe('SageMakerBind__NotebookSecureAccess__AppliesSecureConfig', () => {
    test('SageMakerBind__NotebookSecureAccess__AppliesSecureConfig', async () => {
      const strategy = new SageMakerBinderStrategy();
      const notebookArn = 'arn:aws:sagemaker:us-east-1:123456789012:notebook-instance/test-notebook';
      const target = createMockTargetComponent('sagemaker-notebook', {
        'sagemaker:notebook': {
          notebookInstanceArn: notebookArn,
          notebookInstanceName: 'test-notebook',
          subnetId: 'subnet-123',
          securityGroupIds: ['sg-123'],
          kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/test-key'
        }
      });

      const context = createBindingContext({
        target,
        capability: 'sagemaker:notebook',
        access: 'read',
        options: { requireSecureAccess: true }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.SAGEMAKER_SUBNET_ID).toBe('subnet-123');
      expect(result.environmentVariables.SAGEMAKER_KMS_KEY_ID).toBe('arn:aws:kms:us-east-1:123456789012:key/test-key');
      expect(result.environmentVariables.SAGEMAKER_MONITORING_ENABLED).toBe('true');
    });
  });

  describe('SageMakerBind__InvalidCapability__ThrowsError', () => {
    test('SageMakerBind__InvalidCapability__ThrowsError', async () => {
      const strategy = new SageMakerBinderStrategy();
      const target = createMockTargetComponent('invalid', {
        'invalid:capability': {}
      });

      const context = createBindingContext({
        target,
        capability: 'invalid:capability',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow();
    });
  });

  describe('SageMakerBind__MissingRequiredProperties__ThrowsError', () => {
    test('SageMakerBind__MissingRequiredProperties__ThrowsError', async () => {
      const strategy = new SageMakerBinderStrategy();
      const target = createMockTargetComponent('sagemaker-notebook', {
        'sagemaker:notebook': {
          notebookInstanceName: 'test-notebook'
          // Missing notebookInstanceArn
        }
      });

      const context = createBindingContext({
        target,
        capability: 'sagemaker:notebook',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow('notebookInstanceArn');
    });
  });

  describe('SageMakerBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-sagemaker-012',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default SageMaker notebook actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'SageMakerBind__Condition__Outcome', example: 'SageMakerBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default SageMaker notebook actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with sagemaker:notebook capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SageMakerBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new SageMakerBinderStrategy();
      const customActions = ['sagemaker:DescribeNotebookInstance', 'sagemaker:ListNotebookInstances'];
      const notebookArn = 'arn:aws:sagemaker:us-east-1:123456789012:notebook-instance/test-notebook';
      const target = createMockTargetComponent('sagemaker-notebook', {
        'sagemaker:notebook': {
          notebookInstanceArn: notebookArn,
          notebookInstanceName: 'test-notebook'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-api', 'test-source'),
        target,
        capability: 'sagemaker:notebook',
        access: 'read',
        actions: customActions
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.iamPolicies.length).toBeGreaterThan(0);
      const policy = result.iamPolicies.find(p => p.description.includes('granular actions'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      // Primary assertion: Custom actions are used, default actions are not
      expect(actions).toEqual(expect.arrayContaining(customActions));
      expect(actions.length).toBe(customActions.length);
    });
  });
});
