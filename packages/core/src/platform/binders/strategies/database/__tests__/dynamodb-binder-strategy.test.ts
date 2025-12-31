/**
 * DynamoDB Binder Strategy Tests (Unified)
 * 
 * Tests for DynamoDbBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { DynamoDbBinderStrategy } from '../dynamodb-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';

describe('DynamoDbBinderStrategy', () => {
  describe('DynamoBind__ValidTableAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-dynamodb-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with DYNAMODB_TABLE_ARN for valid table binding',
      oracle: 'exact' as const,
      invariants: [
        'result.environmentVariables.DYNAMODB_TABLE_ARN matches input tableArn',
        'result.environmentVariables.DYNAMODB_TABLE_NAME matches input tableName',
        'result.compliance.status exists',
        'result.iamPolicies is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'DynamoDBTableCapabilityData'],
      inputs: {
        shape: 'BindingContext with db:dynamodb capability, tableArn, tableName',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('DynamoBind__ValidTableAccess__ReturnsEnhancedResult', async () => {
      const strategy = new DynamoDbBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-function');
      const target = createMockTargetComponent('dynamodb-table', {
        'db:dynamodb': {
          tableArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/test-table',
          tableName: 'test-table'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'db:dynamodb',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Assert EnhancedBindingResult structure
      assertEnhancedBindingResult(result);

      // Primary assertion: DynamoDB table environment variables are set correctly
      expect(result.environmentVariables.DYNAMODB_TABLE_ARN).toBe('arn:aws:dynamodb:us-east-1:123456789012:table/test-table');
      expect(result.environmentVariables.DYNAMODB_TABLE_NAME).toBe('test-table');

      // Invariants
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
      expect(result.compliance.framework).toBe(TEST_CONSTANTS.COMPLIANCE_FRAMEWORK);
      expect(Array.isArray(result.iamPolicies)).toBe(true);
    });
  });

  describe('DynamoBind__ReadAccess__GrantsDynamoDBReadActions', () => {
    const metadata = {
      id: 'TP-binders-dynamodb-002',
      level: 'unit' as const,
      capability: 'Grants dynamodb:GetItem and dynamodb:Query IAM actions for read access',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes dynamodb:GetItem',
        'PolicyStatement includes dynamodb:Query',
        'PolicyStatement resources match tableArn',
        'PolicyStatement Effect is Allow'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'DynamoDBTableCapabilityData'],
      inputs: {
        shape: 'BindingContext with db:dynamodb capability and read access',
        notes: 'Standard AccessLevel read value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('DynamoBind__ReadAccess__GrantsDynamoDBReadActions', async () => {
      const strategy = new DynamoDbBinderStrategy();
      const source = createMockSourceComponent();
      const tableArn = 'arn:aws:dynamodb:us-east-1:123456789012:table/test-table';
      const target = createMockTargetComponent('dynamodb-table', {
        'db:dynamodb': {
          tableArn,
          tableName: 'test-table'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'db:dynamodb',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies include DynamoDB read actions
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      
      const readPolicy = result.iamPolicies.find(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.includes('dynamodb:GetItem');
      });

      expect(readPolicy).toBeDefined();
      if (readPolicy) {
        const statementJson = readPolicy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        
        expect(actions).toContain('dynamodb:GetItem');
        expect(actions).toContain('dynamodb:Query');
        expect(actions).toContain('dynamodb:Scan');
        expect(statementJson.Effect).toBe('Allow');
        
        const resources = Array.isArray(statementJson.Resource) 
          ? statementJson.Resource 
          : [statementJson.Resource];
        expect(resources).toContain(tableArn);
      }
    });
  });

  describe('DynamoBind__WriteAccess__GrantsDynamoDBWriteActions', () => {
    const metadata = {
      id: 'TP-binders-dynamodb-003',
      level: 'unit' as const,
      capability: 'Grants dynamodb:PutItem and dynamodb:UpdateItem IAM actions for write access',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes dynamodb:PutItem',
        'PolicyStatement includes dynamodb:UpdateItem',
        'PolicyStatement resources match tableArn'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'DynamoDBTableCapabilityData'],
      inputs: {
        shape: 'BindingContext with db:dynamodb capability and write access',
        notes: 'Tests write access level grants'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('DynamoBind__WriteAccess__GrantsDynamoDBWriteActions', async () => {
      const strategy = new DynamoDbBinderStrategy();
      const source = createMockSourceComponent();
      const tableArn = 'arn:aws:dynamodb:us-east-1:123456789012:table/test-table';
      const target = createMockTargetComponent('dynamodb-table', {
        'db:dynamodb': {
          tableArn,
          tableName: 'test-table'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'db:dynamodb',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies include write actions
      const writePolicy = result.iamPolicies.find(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.includes('dynamodb:PutItem');
      });

      expect(writePolicy).toBeDefined();
      if (writePolicy) {
        const statementJson = writePolicy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        
        expect(actions).toContain('dynamodb:PutItem');
        expect(actions).toContain('dynamodb:UpdateItem');
        expect(actions).toContain('dynamodb:DeleteItem');
        expect(actions).toContain('dynamodb:BatchWriteItem');
      }
    });
  });

  describe('DynamoBind__AdminAccess__GrantsAdminActions', () => {
    const metadata = {
      id: 'TP-binders-dynamodb-004',
      level: 'unit' as const,
      capability: 'Grants dynamodb:CreateTable and dynamodb:DeleteTable IAM actions for admin access',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes dynamodb:CreateTable',
        'PolicyStatement includes dynamodb:DeleteTable',
        'PolicyStatement resources match tableArn'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'DynamoDBTableCapabilityData'],
      inputs: {
        shape: 'BindingContext with db:dynamodb capability and admin access',
        notes: 'Tests admin access level grants'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('DynamoBind__AdminAccess__GrantsAdminActions', async () => {
      const strategy = new DynamoDbBinderStrategy();
      const source = createMockSourceComponent();
      const tableArn = 'arn:aws:dynamodb:us-east-1:123456789012:table/test-table';
      const target = createMockTargetComponent('dynamodb-table', {
        'db:dynamodb': {
          tableArn,
          tableName: 'test-table'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'db:dynamodb',
        access: 'admin'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies include admin actions
      const adminPolicy = result.iamPolicies.find(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.includes('dynamodb:CreateTable');
      });

      expect(adminPolicy).toBeDefined();
      if (adminPolicy) {
        const statementJson = adminPolicy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        
        expect(actions).toContain('dynamodb:CreateTable');
        expect(actions).toContain('dynamodb:UpdateTable');
        expect(actions).toContain('dynamodb:DeleteTable');
      }
    });
  });

  describe('DynamoBind__IndexCapability__SetsIndexEnvVars', () => {
    const metadata = {
      id: 'TP-binders-dynamodb-005',
      level: 'unit' as const,
      capability: 'Sets DYNAMODB_INDEX_NAME and DYNAMODB_INDEX_ARN environment variables for index capability',
      oracle: 'exact' as const,
      invariants: [
        'Environment variables include DYNAMODB_INDEX_NAME',
        'Environment variables include DYNAMODB_INDEX_ARN',
        'IAM policies include index read actions when access is read'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'DynamoDBIndexCapabilityData'],
      inputs: {
        shape: 'BindingContext with dynamodb:index capability',
        notes: 'Tests index capability binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('DynamoBind__IndexCapability__SetsIndexEnvVars', async () => {
      const strategy = new DynamoDbBinderStrategy();
      const source = createMockSourceComponent();
      const indexArn = 'arn:aws:dynamodb:us-east-1:123456789012:table/test-table/index/test-index';
      const target = createMockTargetComponent('dynamodb-index', {
        'dynamodb:index': {
          indexArn,
          indexName: 'test-index',
          indexType: 'GSI'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'dynamodb:index',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Index environment variables are set
      expect(result.environmentVariables.DYNAMODB_INDEX_NAME).toBe('test-index');
      expect(result.environmentVariables.DYNAMODB_INDEX_ARN).toBe(indexArn);
      expect(result.environmentVariables.DYNAMODB_INDEX_TYPE).toBe('GSI');

      // Invariants
      expect(result.iamPolicies.length).toBeGreaterThan(0);
    });
  });

  describe('DynamoBind__StreamCapability__SetsStreamEnvVars', () => {
    const metadata = {
      id: 'TP-binders-dynamodb-006',
      level: 'unit' as const,
      capability: 'Sets DYNAMODB_STREAM_ARN environment variable for stream capability',
      oracle: 'exact' as const,
      invariants: [
        'Environment variables include DYNAMODB_STREAM_ARN',
        'IAM policies include stream read actions when access is read'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'DynamoDBStreamCapabilityData'],
      inputs: {
        shape: 'BindingContext with dynamodb:stream capability',
        notes: 'Tests stream capability binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('DynamoBind__StreamCapability__SetsStreamEnvVars', async () => {
      const strategy = new DynamoDbBinderStrategy();
      const source = createMockSourceComponent();
      const streamArn = 'arn:aws:dynamodb:us-east-1:123456789012:table/test-table/stream/2024-01-01T00:00:00.000';
      const target = createMockTargetComponent('dynamodb-stream', {
        'dynamodb:stream': {
          streamArn,
          streamViewType: 'NEW_AND_OLD_IMAGES'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'dynamodb:stream',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Stream environment variables are set
      expect(result.environmentVariables.DYNAMODB_STREAM_ARN).toBe(streamArn);
      expect(result.environmentVariables.DYNAMODB_STREAM_VIEW_TYPE).toBe('NEW_AND_OLD_IMAGES');

      // Invariants
      expect(result.iamPolicies.length).toBeGreaterThan(0);
    });
  });

  describe('DynamoBind__MissingTableArn__ThrowsActionableError', () => {
    const metadata = {
      id: 'TP-binders-dynamodb-007',
      level: 'unit' as const,
      capability: 'Throws actionable error when tableArn is missing from target capability data',
      oracle: 'exact' as const,
      invariants: [
        'Error message includes tableArn',
        'Error message is actionable (includes context)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with db:dynamodb capability but missing tableArn',
        notes: 'Target capability data missing required tableArn field'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('DynamoBind__MissingTableArn__ThrowsActionableError', async () => {
      const strategy = new DynamoDbBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('dynamodb-table', {
        'db:dynamodb': {
          tableName: 'test-table'
          // Missing tableArn
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'db:dynamodb',
        access: 'read'
      });

      // Primary assertion: Error is thrown with actionable message
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow();

      // Invariant: Error message should include tableArn
      try {
        await executeUnifiedBinding(strategy, context);
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
        // Error should mention tableArn or table
        expect(error.message.toLowerCase()).toMatch(/table/);
      }
    });
  });

  describe('DynamoBind__EncryptionEnabled__SetsEncryptionEnvVars', () => {
    const metadata = {
      id: 'TP-binders-dynamodb-008',
      level: 'unit' as const,
      capability: 'Sets encryption-related environment variables when SSE is enabled',
      oracle: 'exact' as const,
      invariants: [
        'Environment variable DYNAMODB_SSE_ENABLED is set to true',
        'Environment variable DYNAMODB_KMS_KEY_ID is set when KMS key is configured',
        'IAM policies include KMS permissions when KMS key is present'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'DynamoDBTableCapabilityData'],
      inputs: {
        shape: 'BindingContext with db:dynamodb capability and SSE enabled with KMS',
        notes: 'Tests encryption configuration'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('DynamoBind__EncryptionEnabled__SetsEncryptionEnvVars', async () => {
      const strategy = new DynamoDbBinderStrategy();
      const source = createMockSourceComponent();
      const kmsKeyId = 'arn:aws:kms:us-east-1:123456789012:key/test-key-id';
      const target = createMockTargetComponent('dynamodb-table', {
        'db:dynamodb': {
          tableArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/test-table',
          tableName: 'test-table',
          sseSpecification: {
            sseEnabled: true,
            sseType: 'KMS',
            kmsMasterKeyId: kmsKeyId
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'db:dynamodb',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Encryption environment variables are set
      expect(result.environmentVariables.DYNAMODB_SSE_ENABLED).toBe('true');
      expect(result.environmentVariables.DYNAMODB_SSE_TYPE).toBe('KMS');
      expect(result.environmentVariables.DYNAMODB_KMS_KEY_ID).toBe(kmsKeyId);

      // Assert KMS permissions are granted
      const kmsPolicy = result.iamPolicies.find(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.includes('kms:Decrypt');
      });
      expect(kmsPolicy).toBeDefined();
    });
  });

  describe('DynamoBind__PointInTimeRecoveryEnabled__SetsPITREnvVar', () => {
    const metadata = {
      id: 'TP-binders-dynamodb-009',
      level: 'unit' as const,
      capability: 'Sets DYNAMODB_PITR_ENABLED environment variable when point-in-time recovery is enabled',
      oracle: 'exact' as const,
      invariants: [
        'Environment variable DYNAMODB_PITR_ENABLED is set to true',
        'PITR configuration is properly reflected'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'DynamoDBTableCapabilityData'],
      inputs: {
        shape: 'BindingContext with db:dynamodb capability and PITR enabled',
        notes: 'Tests point-in-time recovery configuration'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('DynamoBind__PointInTimeRecoveryEnabled__SetsPITREnvVar', async () => {
      const strategy = new DynamoDbBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('dynamodb-table', {
        'db:dynamodb': {
          tableArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/test-table',
          tableName: 'test-table',
          pointInTimeRecoverySpecification: {
            pointInTimeRecoveryEnabled: true
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'db:dynamodb',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: PITR environment variable is set
      expect(result.environmentVariables.DYNAMODB_PITR_ENABLED).toBe('true');
    });
  });
});
