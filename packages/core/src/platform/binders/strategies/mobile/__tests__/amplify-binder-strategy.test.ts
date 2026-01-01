/**
 * Amplify Binder Strategy Tests (Unified)
 * 
 * Tests for AmplifyBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { AmplifyBinderStrategy } from '../amplify-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';
import type { EnhancedBindingResult } from '../../../../../platform/contracts/platform-binding-trigger-spec.js';

describe('AmplifyBinderStrategy', () => {
  describe('AmplifyBind__AppReadAccess__ReturnsEnhancedResultWithCompliance', () => {
    const metadata = {
      id: 'TP-binders-amplify-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables.AMPLIFY_APP_ARN matches input appArn',
        'result.iamPolicies is an array',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'AmplifyAppCapabilityData'],
      inputs: {
        shape: 'BindingContext with amplify:app capability, appArn, appId, name',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AmplifyBind__AppReadAccess__ReturnsEnhancedResultWithCompliance', async () => {
      const strategy = new AmplifyBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-function');
      const appArn = 'arn:aws:amplify:us-east-1:123456789012:apps/test-app';
      const target = createMockTargetComponent('amplify-app', {
        'amplify:app': {
          appArn,
          appId: 'test-app',
          name: 'test-app'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'amplify:app',
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
      expect(result.environmentVariables.AMPLIFY_APP_ARN).toBe(appArn);
      expect(result.environmentVariables.AMPLIFY_APP_ID).toBe('test-app');
      expect(Array.isArray(result.iamPolicies)).toBe(true);
      expect(Array.isArray(result.securityGroupRules)).toBe(true);
    });
  });

  describe('AmplifyBind__AppWriteAccess__GrantsAppWriteActions', () => {
    test('AmplifyBind__AppWriteAccess__GrantsAppWriteActions', async () => {
      const strategy = new AmplifyBinderStrategy();
      const appArn = 'arn:aws:amplify:us-east-1:123456789012:apps/test-app';
      const target = createMockTargetComponent('amplify-app', {
        'amplify:app': {
          appArn,
          appId: 'test-app',
          name: 'test-app'
        }
      });

      const context = createBindingContext({
        target,
        capability: 'amplify:app',
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
      expect(actions.some(a => a.includes('CreateApp') || a.includes('UpdateApp'))).toBe(true);
    });
  });

  describe('AmplifyBind__AppDeployAccess__GrantsDeploymentPermissions', () => {
    test('AmplifyBind__AppDeployAccess__GrantsDeploymentPermissions', async () => {
      const strategy = new AmplifyBinderStrategy();
      const appArn = 'arn:aws:amplify:us-east-1:123456789012:apps/test-app';
      const target = createMockTargetComponent('amplify-app', {
        'amplify:app': {
          appArn,
          appId: 'test-app',
          name: 'test-app'
        }
      });

      const context = createBindingContext({
        target,
        capability: 'amplify:app',
        access: 'deploy'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      const deployPolicy = result.iamPolicies.find(p => 
        p.description.includes('deployment')
      );
      expect(deployPolicy).toBeDefined();
      const statementJson = deployPolicy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action) 
        ? statementJson.Action 
        : [statementJson.Action];
      expect(actions.some(a => a.includes('StartDeployment'))).toBe(true);
    });
  });

  describe('AmplifyBind__BranchReadAccess__GrantsBranchReadActions', () => {
    test('AmplifyBind__BranchReadAccess__GrantsBranchReadActions', async () => {
      const strategy = new AmplifyBinderStrategy();
      const branchArn = 'arn:aws:amplify:us-east-1:123456789012:apps/test-app/branches/main';
      const target = createMockTargetComponent('amplify-branch', {
        'amplify:branch': {
          branchArn,
          branchName: 'main'
        }
      });

      const context = createBindingContext({
        target,
        capability: 'amplify:branch',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.AMPLIFY_BRANCH_ARN).toBe(branchArn);
      expect(result.environmentVariables.AMPLIFY_BRANCH_NAME).toBe('main');
    });
  });

  describe('AmplifyBind__DomainReadAccess__GrantsDomainReadActions', () => {
    test('AmplifyBind__DomainReadAccess__GrantsDomainReadActions', async () => {
      const strategy = new AmplifyBinderStrategy();
      const domainArn = 'arn:aws:amplify:us-east-1:123456789012:apps/test-app/domains/example.com';
      const target = createMockTargetComponent('amplify-domain', {
        'amplify:domain': {
          domainAssociationArn: domainArn,
          domainName: 'example.com'
        }
      });

      const context = createBindingContext({
        target,
        capability: 'amplify:domain',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.AMPLIFY_DOMAIN_ASSOCIATION_ARN).toBe(domainArn);
      expect(result.environmentVariables.AMPLIFY_DOMAIN_NAME).toBe('example.com');
    });
  });

  describe('AmplifyBind__DomainSubdomainMapping__SetsSubdomainDetails', () => {
    test('AmplifyBind__DomainSubdomainMapping__SetsSubdomainDetails', async () => {
      const strategy = new AmplifyBinderStrategy();
      const domainArn = 'arn:aws:amplify:us-east-1:123456789012:apps/test-app/domains/example.com';
      const target = createMockTargetComponent('amplify-domain', {
        'amplify:domain': {
          domainAssociationArn: domainArn,
          domainName: 'example.com',
          subDomains: [
            {
              subDomainSetting: {
                prefix: 'www',
                branchName: 'main'
              },
              verified: true,
              dnsRecord: 'www.example.com'
            },
            {
              subDomainSetting: {
                prefix: 'staging',
                branchName: 'staging'
              },
              verified: false
            }
          ]
        }
      });

      const context = createBindingContext({
        target,
        capability: 'amplify:domain',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.AMPLIFY_SUBDOMAIN_MAPPINGS).toBeDefined();
      const mappings = JSON.parse(result.environmentVariables.AMPLIFY_SUBDOMAIN_MAPPINGS);
      expect(mappings).toHaveLength(2);
      expect(result.environmentVariables.AMPLIFY_SUBDOMAIN_WWW_PREFIX).toBe('www');
      expect(result.environmentVariables.AMPLIFY_SUBDOMAIN_WWW_BRANCH).toBe('main');
      expect(result.environmentVariables.AMPLIFY_SUBDOMAIN_WWW_VERIFIED).toBe('true');
    });
  });

  describe('AmplifyBind__BackendEnvironmentReadAccess__GrantsBackendEnvironmentReadActions', () => {
    test('AmplifyBind__BackendEnvironmentReadAccess__GrantsBackendEnvironmentReadActions', async () => {
      const strategy = new AmplifyBinderStrategy();
      const backendEnvArn = 'arn:aws:amplifybackend:us-east-1:123456789012:backend/test-app/env';
      const target = createMockTargetComponent('amplify-backend-environment', {
        'amplify:backend-environment': {
          backendEnvironmentArn: backendEnvArn,
          backendEnvironmentName: 'env'
        }
      });

      const context = createBindingContext({
        target,
        capability: 'amplify:backend-environment',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.AMPLIFY_BACKEND_ENVIRONMENT_ARN).toBe(backendEnvArn);
    });
  });

  describe('AmplifyBind__BackendAuthReadAccess__GrantsBackendAuthReadActions', () => {
    test('AmplifyBind__BackendAuthReadAccess__GrantsBackendAuthReadActions', async () => {
      const strategy = new AmplifyBinderStrategy();
      const userPoolArn = 'arn:aws:cognito-idp:us-east-1:123456789012:userpool/us-east-1_test';
      const target = createMockTargetComponent('amplify-backend-auth', {
        'amplify:backend-auth': {
          authResourceName: 'auth',
          userPoolArn,
          userPoolId: 'us-east-1_test'
        }
      });

      const context = createBindingContext({
        target,
        capability: 'amplify:backend-auth',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.AMPLIFY_BACKEND_USER_POOL_ARN).toBe(userPoolArn);
    });
  });

  describe('AmplifyBind__BackendApiReadAccess__GrantsBackendApiReadActions', () => {
    test('AmplifyBind__BackendApiReadAccess__GrantsBackendApiReadActions', async () => {
      const strategy = new AmplifyBinderStrategy();
      const graphqlApiArn = 'arn:aws:appsync:us-east-1:123456789012:apis/test-api';
      const target = createMockTargetComponent('amplify-backend-api', {
        'amplify:backend-api': {
          apiResourceName: 'api',
          graphqlApiArn,
          graphqlApiId: 'test-api',
          apiEndpoint: 'https://test-api.appsync-api.us-east-1.amazonaws.com/graphql'
        }
      });

      const context = createBindingContext({
        target,
        capability: 'amplify:backend-api',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.AMPLIFY_BACKEND_GRAPHQL_API_ARN).toBe(graphqlApiArn);
      expect(result.environmentVariables.AMPLIFY_BACKEND_API_ENDPOINT).toBeDefined();
    });
  });

  describe('AmplifyBind__BackendStorageReadAccess__GrantsBackendStorageReadActions', () => {
    test('AmplifyBind__BackendStorageReadAccess__GrantsBackendStorageReadActions', async () => {
      const strategy = new AmplifyBinderStrategy();
      const target = createMockTargetComponent('amplify-backend-storage', {
        'amplify:backend-storage': {
          storageResourceName: 'storage',
          storageType: 'S3',
          bucketName: 'test-bucket'
        }
      });

      const context = createBindingContext({
        target,
        capability: 'amplify:backend-storage',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.AMPLIFY_BACKEND_STORAGE_BUCKET_NAME).toBe('test-bucket');
      expect(result.environmentVariables.AMPLIFY_BACKEND_STORAGE_TYPE).toBe('S3');
    });
  });

  describe('AmplifyBind__BackendStorageDynamoDB__GrantsDynamoDBPermissions', () => {
    test('AmplifyBind__BackendStorageDynamoDB__GrantsDynamoDBPermissions', async () => {
      const strategy = new AmplifyBinderStrategy();
      const target = createMockTargetComponent('amplify-backend-storage', {
        'amplify:backend-storage': {
          storageResourceName: 'storage',
          storageType: 'DynamoDB',
          tableName: 'test-table'
        }
      });

      const context = createBindingContext({
        target,
        capability: 'amplify:backend-storage',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.AMPLIFY_BACKEND_STORAGE_TABLE_NAME).toBe('test-table');
      const policy = result.iamPolicies.find(p => 
        p.description.includes('Storage read')
      );
      expect(policy).toBeDefined();
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action) 
        ? statementJson.Action 
        : [statementJson.Action];
      expect(actions.some(a => a.includes('dynamodb:GetItem') || a.includes('dynamodb:Query'))).toBe(true);
    });
  });

  describe('AmplifyBind__AppSecureAccess__AppliesSecureConfig', () => {
    test('AmplifyBind__AppSecureAccess__AppliesSecureConfig', async () => {
      const strategy = new AmplifyBinderStrategy();
      const appArn = 'arn:aws:amplify:us-east-1:123456789012:apps/test-app';
      const target = createMockTargetComponent('amplify-app', {
        'amplify:app': {
          appArn,
          appId: 'test-app',
          name: 'test-app',
          wafWebAclArn: 'arn:aws:wafv2:us-east-1:123456789012:regional/webacl/test-waf',
          customHeaders: { 'X-Custom': 'value' }
        }
      });

      const context = createBindingContext({
        target,
        capability: 'amplify:app',
        access: 'read',
        options: { requireSecureAccess: true }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.AMPLIFY_SECURITY_ENABLED).toBe('true');
      expect(result.environmentVariables.AMPLIFY_HTTPS_REDIRECT_ENABLED).toBe('true');
      expect(result.environmentVariables.AMPLIFY_WAF_WEB_ACL_ARN).toBe('arn:aws:wafv2:us-east-1:123456789012:regional/webacl/test-waf');
    });
  });

  describe('AmplifyBind__InvalidCapability__ThrowsError', () => {
    test('AmplifyBind__InvalidCapability__ThrowsError', async () => {
      const strategy = new AmplifyBinderStrategy();
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

  describe('AmplifyBind__MissingRequiredProperties__ThrowsError', () => {
    test('AmplifyBind__MissingRequiredProperties__ThrowsError', async () => {
      const strategy = new AmplifyBinderStrategy();
      const target = createMockTargetComponent('amplify-app', {
        'amplify:app': {
          appId: 'test-app'
          // Missing appArn and name
        }
      });

      const context = createBindingContext({
        target,
        capability: 'amplify:app',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow('appArn');
    });
  });
});
