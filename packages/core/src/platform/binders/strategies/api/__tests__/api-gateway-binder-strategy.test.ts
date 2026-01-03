/**
 * API Gateway Binder Strategy Tests (Unified)
 * 
 * Tests for ApiGatewayBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { ApiGatewayBinderStrategy } from '../api-gateway-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';
import type { EnhancedBindingResult } from '../../../../../platform/contracts/platform-binding-trigger-spec.js';

describe('ApiGatewayBinderStrategy', () => {
  describe('ApiGatewayBind__ValidRestApiReadAccess__ReturnsEnhancedResultWithCompliance', () => {
    const metadata = {
      id: 'TP-binders-api-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ApiGatewayBind__Condition__Outcome', example: 'ApiGatewayBind__ValidRestApiReadAccess__ReturnsEnhancedResultWithCompliance' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables.API_GATEWAY_REST_API_ID matches input apiId',
        'result.iamPolicies is an array',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'ApiGatewayCapabilityData'],
      inputs: {
        shape: 'BindingContext with api:rest capability, resources.arn, resources.apiId, resources.stage, endpoints.invokeUrl, endpoints.executeApiArn',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ApiGatewayBind__ValidRestApiReadAccess__ReturnsEnhancedResultWithCompliance', async () => {
      const strategy = new ApiGatewayBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-function');
      const apiId = 'abc123def456';
      const apiArn = 'arn:aws:apigateway:us-east-1::/restapis/abc123def456';
      const invokeUrl = 'https://abc123def456.execute-api.us-east-1.amazonaws.com/prod';
      const executeApiArn = 'arn:aws:execute-api:us-east-1:123456789012:abc123def456/prod/*/*';
      const target = createMockTargetComponent('api-gateway-rest', {
        'api:rest': {
          type: 'api:rest',
          resources: {
            arn: apiArn,
            apiId,
            stage: 'prod'
          },
          endpoints: {
            invokeUrl,
            executeApiArn
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'api:rest',
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
      expect(result.environmentVariables.API_GATEWAY_REST_API_ID).toBe(apiId);
      expect(result.environmentVariables.API_GATEWAY_REST_INVOKE_URL).toBe(invokeUrl);
      expect(Array.isArray(result.iamPolicies)).toBe(true);
      expect(Array.isArray(result.securityGroupRules)).toBe(true);
    });
  });

  describe('ApiGatewayBind__RestApiReadAccess__GrantsRestApiReadActions', () => {
    const metadata = {
      id: 'TP-binders-api-002',
      level: 'unit' as const,
      capability: 'Grants API Gateway REST API read IAM actions for read access level',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ApiGatewayBind__Condition__Outcome', example: 'ApiGatewayBind__RestApiReadAccess__GrantsRestApiReadActions' },
      invariants: [
        'PolicyStatement resources match executeApiArn',
        'PolicyStatement Effect is Allow',
        'Actions array includes apigateway:GET, apigateway:HEAD'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'ApiGatewayCapabilityData'],
      inputs: {
        shape: 'BindingContext with api:rest capability and read access',
        notes: 'Standard AccessLevel read value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ApiGatewayBind__RestApiReadAccess__GrantsRestApiReadActions', async () => {
      const strategy = new ApiGatewayBinderStrategy();
      const source = createMockSourceComponent();
      const executeApiArn = 'arn:aws:execute-api:us-east-1:123456789012:abc123def456/prod/*/*';
      const target = createMockTargetComponent('api-gateway-rest', {
        'api:rest': {
          type: 'api:rest',
          resources: {
            arn: 'arn:aws:apigateway:us-east-1::/restapis/abc123def456',
            apiId: 'abc123def456',
            stage: 'prod'
          },
          endpoints: {
            invokeUrl: 'https://abc123def456.execute-api.us-east-1.amazonaws.com/prod',
            executeApiArn
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'api:rest',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies exist and contain API Gateway read actions
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      
      const policy = result.iamPolicies[0];
      const statementJson = policy.statement.toStatementJson();
      
      // Invariants
      expect(statementJson.Effect).toBe('Allow');
      
      // Action can be a string or array - normalize to array
      const actions = Array.isArray(statementJson.Action) 
        ? statementJson.Action 
        : [statementJson.Action];
      expect(actions.length).toBeGreaterThan(0);
      
      // Check that resources match executeApiArn
      const resources = Array.isArray(statementJson.Resource) 
        ? statementJson.Resource 
        : [statementJson.Resource];
      expect(resources).toContain(executeApiArn);
      
      // Check that read actions are present
      expect(actions.some(a => a.includes('GET') || a.includes('HEAD'))).toBe(true);
    });
  });

  describe('ApiGatewayBind__RestApiWriteAccess__GrantsRestApiInvokeActions', () => {
    const metadata = {
      id: 'TP-binders-api-003',
      level: 'unit' as const,
      capability: 'Grants API Gateway REST API invoke/write IAM actions for write access level',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ApiGatewayBind__Condition__Outcome', example: 'ApiGatewayBind__RestApiWriteAccess__GrantsRestApiInvokeActions' },
      invariants: [
        'PolicyStatement resources match executeApiArn',
        'Actions array includes execute-api:Invoke'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'ApiGatewayCapabilityData'],
      inputs: {
        shape: 'BindingContext with api:rest capability and write access',
        notes: 'Standard AccessLevel write value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ApiGatewayBind__RestApiWriteAccess__GrantsRestApiInvokeActions', async () => {
      const strategy = new ApiGatewayBinderStrategy();
      const executeApiArn = 'arn:aws:execute-api:us-east-1:123456789012:abc123def456/prod/*/*';
      const target = createMockTargetComponent('api-gateway-rest', {
        'api:rest': {
          type: 'api:rest',
          resources: {
            arn: 'arn:aws:apigateway:us-east-1::/restapis/abc123def456',
            apiId: 'abc123def456',
            stage: 'prod'
          },
          endpoints: {
            invokeUrl: 'https://abc123def456.execute-api.us-east-1.amazonaws.com/prod',
            executeApiArn
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'api:rest',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies contain API Gateway invoke actions
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      
      const policy = result.iamPolicies.find(p => 
        p.description?.includes('invoke') || p.description?.includes('write')
      );
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action) 
        ? statementJson.Action 
        : [statementJson.Action];
      expect(actions.some(a => a.includes('Invoke'))).toBe(true);
    });
  });

  describe('ApiGatewayBind__HttpApiAccess__HandlesHttpApiCorrectly', () => {
    const metadata = {
      id: 'TP-binders-api-004',
      level: 'unit' as const,
      capability: 'Handles API Gateway HTTP API (v2) bindings correctly',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ApiGatewayBind__Condition__Outcome', example: 'ApiGatewayBind__HttpApiAccess__HandlesHttpApiCorrectly' },
      invariants: [
        'Environment variables use API_GATEWAY_HTTP prefix',
        'Binding succeeds with api:http capability',
        'Results match REST API binding pattern'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'ApiGatewayCapabilityData HTTP'],
      inputs: {
        shape: 'BindingContext with api:http capability',
        notes: 'HTTP API Gateway v2 binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ApiGatewayBind__HttpApiAccess__HandlesHttpApiCorrectly', async () => {
      const strategy = new ApiGatewayBinderStrategy();
      const apiId = 'xyz789abc123';
      const target = createMockTargetComponent('api-gateway-http', {
        'api:http': {
          type: 'api:http',
          resources: {
            arn: 'arn:aws:apigateway:us-east-1::/apis/xyz789abc123',
            apiId,
            stage: '$default'
          },
          endpoints: {
            invokeUrl: 'https://xyz789abc123.execute-api.us-east-1.amazonaws.com',
            executeApiArn: 'arn:aws:execute-api:us-east-1:123456789012:xyz789abc123/$default/*/*'
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'api:http',
        access: 'readwrite'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: HTTP API environment variables are set correctly
      expect(result.environmentVariables.API_GATEWAY_HTTP_API_ID).toBe(apiId);
      expect(result.environmentVariables.API_GATEWAY_HTTP_STAGE).toBe('$default');
      
      // Generic API Gateway variables should also be set
      expect(result.environmentVariables.API_GATEWAY_API_ID).toBe(apiId);
    });
  });

  describe('ApiGatewayBind__WithCorsConfiguration__ExposesCorsInfo', () => {
    const metadata = {
      id: 'TP-binders-api-005',
      level: 'unit' as const,
      capability: 'Exposes CORS configuration in environment variables when CORS is configured',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ApiGatewayBind__Condition__Outcome', example: 'ApiGatewayBind__WithCorsConfiguration__ExposesCorsInfo' },
      invariants: [
        'Environment variables include API_GATEWAY_REST_CORS_ENABLED',
        'CORS origins are exposed as comma-separated list when present'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'ApiGatewayCapabilityData with CORS'],
      inputs: {
        shape: 'BindingContext with api:rest capability and cors configuration',
        notes: 'CORS configuration exposure'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ApiGatewayBind__WithCorsConfiguration__ExposesCorsInfo', async () => {
      const strategy = new ApiGatewayBinderStrategy();
      const corsOrigins = ['https://example.com', 'https://app.example.com'];
      const target = createMockTargetComponent('api-gateway-rest', {
        'api:rest': {
          type: 'api:rest',
          resources: {
            arn: 'arn:aws:apigateway:us-east-1::/restapis/abc123def456',
            apiId: 'abc123def456',
            stage: 'prod'
          },
          endpoints: {
            invokeUrl: 'https://abc123def456.execute-api.us-east-1.amazonaws.com/prod',
            executeApiArn: 'arn:aws:execute-api:us-east-1:123456789012:abc123def456/prod/*/*'
          },
          cors: {
            enabled: true,
            origins: corsOrigins
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'api:rest',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: CORS configuration is exposed
      expect(result.environmentVariables.API_GATEWAY_REST_CORS_ENABLED).toBe('true');
      expect(result.environmentVariables.API_GATEWAY_REST_CORS_ORIGINS).toBe(corsOrigins.join(','));
    });
  });

  describe('ApiGatewayBind__WithCustomDomain__ExposesCustomDomainInfo', () => {
    const metadata = {
      id: 'TP-binders-api-006',
      level: 'unit' as const,
      capability: 'Exposes custom domain configuration in environment variables when custom domain is configured',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ApiGatewayBind__Condition__Outcome', example: 'ApiGatewayBind__WithCustomDomain__ExposesCustomDomainInfo' },
      invariants: [
        'Environment variables include API_GATEWAY_REST_CUSTOM_DOMAIN',
        'Regional domain and hosted zone ID are exposed when available'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'ApiGatewayCapabilityData with custom domain'],
      inputs: {
        shape: 'BindingContext with api:rest capability and customDomain configuration',
        notes: 'Custom domain configuration exposure'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ApiGatewayBind__WithCustomDomain__ExposesCustomDomainInfo', async () => {
      const strategy = new ApiGatewayBinderStrategy();
      const domainName = 'api.example.com';
      const regionalDomain = 'd-abc123.execute-api.us-east-1.amazonaws.com';
      const hostedZoneId = 'Z1234567890ABC';
      const target = createMockTargetComponent('api-gateway-rest', {
        'api:rest': {
          type: 'api:rest',
          resources: {
            arn: 'arn:aws:apigateway:us-east-1::/restapis/abc123def456',
            apiId: 'abc123def456',
            stage: 'prod'
          },
          endpoints: {
            invokeUrl: 'https://abc123def456.execute-api.us-east-1.amazonaws.com/prod',
            executeApiArn: 'arn:aws:execute-api:us-east-1:123456789012:abc123def456/prod/*/*'
          },
          customDomain: {
            domainName,
            regionalDomainName: regionalDomain,
            hostedZoneId
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'api:rest',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Custom domain configuration is exposed
      expect(result.environmentVariables.API_GATEWAY_REST_CUSTOM_DOMAIN).toBe(domainName);
      expect(result.environmentVariables.API_GATEWAY_REST_REGIONAL_DOMAIN).toBe(regionalDomain);
      expect(result.environmentVariables.API_GATEWAY_REST_HOSTED_ZONE_ID).toBe(hostedZoneId);
    });
  });

  describe('ApiGatewayBind__WithSecurityConfiguration__ExposesSecurityInfo', () => {
    const metadata = {
      id: 'TP-binders-api-007',
      level: 'unit' as const,
      capability: 'Exposes security configuration (API key, WAF) in environment variables when security is configured',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ApiGatewayBind__Condition__Outcome', example: 'ApiGatewayBind__WithSecurityConfiguration__ExposesSecurityInfo' },
      invariants: [
        'Environment variables include API_GATEWAY_REST_API_KEY_ENABLED and API_GATEWAY_REST_WAF_ENABLED',
        'Security flags are exposed as true/false strings'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'ApiGatewayCapabilityData with security'],
      inputs: {
        shape: 'BindingContext with api:rest capability and security configuration',
        notes: 'Security configuration exposure'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ApiGatewayBind__WithSecurityConfiguration__ExposesSecurityInfo', async () => {
      const strategy = new ApiGatewayBinderStrategy();
      const target = createMockTargetComponent('api-gateway-rest', {
        'api:rest': {
          type: 'api:rest',
          resources: {
            arn: 'arn:aws:apigateway:us-east-1::/restapis/abc123def456',
            apiId: 'abc123def456',
            stage: 'prod'
          },
          endpoints: {
            invokeUrl: 'https://abc123def456.execute-api.us-east-1.amazonaws.com/prod',
            executeApiArn: 'arn:aws:execute-api:us-east-1:123456789012:abc123def456/prod/*/*'
          },
          security: {
            apiKeyEnabled: true,
            wafEnabled: true
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'api:rest',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Security configuration is exposed
      expect(result.environmentVariables.API_GATEWAY_REST_API_KEY_ENABLED).toBe('true');
      expect(result.environmentVariables.API_GATEWAY_REST_WAF_ENABLED).toBe('true');
    });
  });

  describe('ApiGatewayBind__MissingRequiredFields__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-api-008',
      level: 'unit' as const,
      capability: 'Throws error when required target capability data is missing',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ApiGatewayBind__Condition__Outcome', example: 'ApiGatewayBind__MissingRequiredFields__ThrowsError' },
      invariants: [
        'Error message indicates missing field',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent with incomplete data'],
      inputs: {
        shape: 'BindingContext with api:rest capability but missing resources.arn',
        notes: 'Error case - missing required field'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ApiGatewayBind__MissingRequiredFields__ThrowsError', async () => {
      const strategy = new ApiGatewayBinderStrategy();
      const target = createMockTargetComponent('api-gateway-rest', {
        'api:rest': {
          type: 'api:rest',
          resources: {
            // Missing arn
            apiId: 'abc123def456',
            stage: 'prod'
          },
          endpoints: {
            invokeUrl: 'https://abc123def456.execute-api.us-east-1.amazonaws.com/prod',
            executeApiArn: 'arn:aws:execute-api:us-east-1:123456789012:abc123def456/prod/*/*'
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'api:rest',
        access: 'read'
      });

      // Primary assertion: Error is thrown
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'missing required resources.arn property'
      );
    });
  });

  describe('ApiGatewayBind__InvalidAccessLevel__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-api-009',
      level: 'unit' as const,
      capability: 'Throws error when invalid access level is provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ApiGatewayBind__Condition__Outcome', example: 'ApiGatewayBind__InvalidAccessLevel__ThrowsError' },
      invariants: [
        'Error message indicates invalid access level',
        'Error specifies valid access levels'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with api:rest capability and invalid access level (e.g., "admin")',
        notes: 'Error case - invalid access level for API Gateway'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ApiGatewayBind__InvalidAccessLevel__ThrowsError', async () => {
      const strategy = new ApiGatewayBinderStrategy();
      const target = createMockTargetComponent('api-gateway-rest', {
        'api:rest': {
          type: 'api:rest',
          resources: {
            arn: 'arn:aws:apigateway:us-east-1::/restapis/abc123def456',
            apiId: 'abc123def456',
            stage: 'prod'
          },
          endpoints: {
            invokeUrl: 'https://abc123def456.execute-api.us-east-1.amazonaws.com/prod',
            executeApiArn: 'arn:aws:execute-api:us-east-1:123456789012:abc123def456/prod/*/*'
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'api:rest',
        access: 'admin' as any // Invalid access level
      });

      // Primary assertion: Error is thrown
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'Invalid access level for API Gateway'
      );
    });
  });

  describe('ApiGatewayBind__RestApiReadWriteAccess__GrantsBothReadAndWriteActions', () => {
    const metadata = {
      id: 'TP-binders-api-010',
      level: 'unit' as const,
      capability: 'Grants both API Gateway read and write IAM actions for readwrite access level',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ApiGatewayBind__Condition__Outcome', example: 'ApiGatewayBind__RestApiReadWriteAccess__GrantsBothReadAndWriteActions' },
      invariants: [
        'Multiple IAM policies or single policy with both read and write actions',
        'Actions include both GET/HEAD and Invoke/POST'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'ApiGatewayCapabilityData'],
      inputs: {
        shape: 'BindingContext with api:rest capability and readwrite access',
        notes: 'Standard AccessLevel readwrite value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ApiGatewayBind__RestApiReadWriteAccess__GrantsBothReadAndWriteActions', async () => {
      const strategy = new ApiGatewayBinderStrategy();
      const target = createMockTargetComponent('api-gateway-rest', {
        'api:rest': {
          type: 'api:rest',
          resources: {
            arn: 'arn:aws:apigateway:us-east-1::/restapis/abc123def456',
            apiId: 'abc123def456',
            stage: 'prod'
          },
          endpoints: {
            invokeUrl: 'https://abc123def456.execute-api.us-east-1.amazonaws.com/prod',
            executeApiArn: 'arn:aws:execute-api:us-east-1:123456789012:abc123def456/prod/*/*'
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'api:rest',
        access: 'readwrite'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Both read and write policies exist
      expect(result.iamPolicies.length).toBeGreaterThanOrEqual(2);
      
      const allActions = result.iamPolicies.flatMap(p => {
        const json = p.statement.toStatementJson();
        const actions = Array.isArray(json.Action) ? json.Action : [json.Action];
        return actions;
      });
      
      expect(allActions.some(a => a.includes('GET') || a.includes('HEAD'))).toBe(true);
      expect(allActions.some(a => a.includes('Invoke') || a.includes('POST'))).toBe(true);
    });
  });

  describe('ApiGatewayBind__CustomEnvMappings__AppliesCustomEnvironmentVariableMappings', () => {
    const metadata = {
      id: 'TP-binders-api-011',
      level: 'unit' as const,
      capability: 'Applies custom environment variable mappings from directive.env',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ApiGatewayBind__Condition__Outcome', example: 'ApiGatewayBind__CustomEnvMappings__AppliesCustomEnvironmentVariableMappings' },
      invariants: [
        'Custom environment variable keys are used',
        'Values map to correct API Gateway properties'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with api:rest capability and directive.env mappings',
        notes: 'Custom environment variable mappings'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ApiGatewayBind__CustomEnvMappings__AppliesCustomEnvironmentVariableMappings', async () => {
      const strategy = new ApiGatewayBinderStrategy();
      const apiId = 'abc123def456';
      const invokeUrl = 'https://abc123def456.execute-api.us-east-1.amazonaws.com/prod';
      const target = createMockTargetComponent('api-gateway-rest', {
        'api:rest': {
          type: 'api:rest',
          resources: {
            arn: 'arn:aws:apigateway:us-east-1::/restapis/abc123def456',
            apiId,
            stage: 'prod'
          },
          endpoints: {
            invokeUrl,
            executeApiArn: 'arn:aws:execute-api:us-east-1:123456789012:abc123def456/prod/*/*'
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'api:rest',
        access: 'read',
        env: {
          'MY_API_ID': 'apiId',
          'MY_API_URL': 'invokeUrl'
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Custom environment variable mappings are applied
      expect(result.environmentVariables.MY_API_ID).toBe(apiId);
      expect(result.environmentVariables.MY_API_URL).toBe(invokeUrl);
    });
  });
});

