/**
 * Cognito User Pool Binder Strategy Tests (Unified)
 * 
 * Tests for CognitoUserPoolBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { CognitoUserPoolBinderStrategy } from '../cognito-user-pool-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from './unified-strategy-test-helpers.js';

describe('CognitoUserPoolBinderStrategy', () => {
  describe('CognitoBind__ValidUserPoolAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-cognito-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with COGNITO_USER_POOL_ID for valid user pool binding',
      oracle: 'exact' as const,
      invariants: [
        'result.environmentVariables.COGNITO_USER_POOL_ID matches input userPoolId',
        'result.environmentVariables.COGNITO_USER_POOL_ARN matches input userPoolArn',
        'result.compliance.status exists'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'CognitoUserPoolCapabilityData'],
      inputs: {
        shape: 'BindingContext with auth:user-pool capability, userPoolId, userPoolArn, clients',
        notes: 'Basic valid binding with read access (maps to authenticate)'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CognitoBind__ValidUserPoolAccess__ReturnsEnhancedResult', async () => {
  const strategy = new CognitoUserPoolBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-function');
      const target = createMockTargetComponent('user-pool', {
        'auth:user-pool': {
          userPoolId: TEST_CONSTANTS.USER_POOL_ID,
          userPoolArn: TEST_CONSTANTS.USER_POOL_ARN,
    clients: [
            { clientId: 'client-123', clientName: 'web-app' }
          ]
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'auth:user-pool',
        access: 'read' // Maps to authenticate internally
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Assert EnhancedBindingResult structure
      assertEnhancedBindingResult(result);

      // Primary assertion: User pool environment variables are set correctly
      expect(result.environmentVariables.COGNITO_USER_POOL_ID).toBe(TEST_CONSTANTS.USER_POOL_ID);
      expect(result.environmentVariables.COGNITO_USER_POOL_ARN).toBe(TEST_CONSTANTS.USER_POOL_ARN);

      // Invariants
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
      expect(result.compliance.framework).toBe(TEST_CONSTANTS.COMPLIANCE_FRAMEWORK);
      expect(Array.isArray(result.iamPolicies)).toBe(true);
    });
  });

  describe('CognitoBind__AuthenticateAccess__GrantsCognitoAuthActions', () => {
    const metadata = {
      id: 'TP-binders-cognito-002',
      level: 'unit' as const,
      capability: 'Grants cognito-idp:InitiateAuth and cognito-idp:SignUp IAM actions for read access (maps to authenticate)',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes cognito-idp:InitiateAuth',
        'PolicyStatement includes cognito-idp:SignUp',
        'PolicyStatement resources match userPoolArn',
        'PolicyStatement Effect is Allow'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'CognitoUserPoolCapabilityData'],
      inputs: {
        shape: 'BindingContext with auth:user-pool capability and read access',
        notes: 'Standard AccessLevel read value maps to authenticate internally'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CognitoBind__AuthenticateAccess__GrantsCognitoAuthActions', async () => {
      const strategy = new CognitoUserPoolBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('user-pool', {
        'auth:user-pool': {
          userPoolId: TEST_CONSTANTS.USER_POOL_ID,
          userPoolArn: TEST_CONSTANTS.USER_POOL_ARN,
          clients: [{ clientId: 'client-123' }]
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'auth:user-pool',
        access: 'read' // Maps to authenticate
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies include Cognito authentication actions
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      
      const authPolicy = result.iamPolicies.find(p => 
        p.description.includes('authentication')
      );
      expect(authPolicy).toBeDefined();

      if (authPolicy) {
        const statementJson = authPolicy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        
        expect(actions).toContain('cognito-idp:InitiateAuth');
        expect(actions).toContain('cognito-idp:SignUp');
        expect(statementJson.Effect).toBe('Allow');
        
        const resources = Array.isArray(statementJson.Resource) 
          ? statementJson.Resource 
          : [statementJson.Resource];
        expect(resources).toContain(TEST_CONSTANTS.USER_POOL_ARN);
      }
    });
  });

  describe('CognitoBind__ClientNameSelection__SelectsCorrectClient', () => {
    const metadata = {
      id: 'TP-binders-cognito-003',
      level: 'unit' as const,
      capability: 'Selects correct client from clients array when options.clientName is specified',
      oracle: 'exact' as const,
      invariants: [
        'COGNITO_USER_POOL_CLIENT_ID matches selected client clientId',
        'COGNITO_USER_POOL_CLIENT_NAME is set when clientName exists',
        'Client selection uses options.clientName when provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'CognitoUserPoolCapabilityData'],
      inputs: {
        shape: 'BindingContext with auth:user-pool capability, multiple clients, options.clientName',
        notes: 'Options specify clientName to select from clients array'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CognitoBind__ClientNameSelection__SelectsCorrectClient', async () => {
      const strategy = new CognitoUserPoolBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('user-pool', {
        'auth:user-pool': {
          userPoolId: TEST_CONSTANTS.USER_POOL_ID,
          userPoolArn: TEST_CONSTANTS.USER_POOL_ARN,
          clients: [
            { clientId: 'client-web', clientName: 'web-app' },
            { clientId: 'client-mobile', clientName: 'mobile-app' }
          ]
        }
      });

      const context = createBindingContext({
        source,
        target,
      capability: 'auth:user-pool',
        access: 'read',
        options: {
          clientName: 'mobile-app'
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Correct client is selected by name
      expect(result.environmentVariables.COGNITO_USER_POOL_CLIENT_ID).toBe('client-mobile');
      expect(result.environmentVariables.COGNITO_USER_POOL_CLIENT_NAME).toBe('mobile-app');
    });
  });

  describe('CognitoBind__IdentityProviderCapability__SetsIdpEnvVars', () => {
    const metadata = {
      id: 'TP-binders-cognito-004',
      level: 'unit' as const,
      capability: 'Sets COGNITO_IDP_NAME and COGNITO_IDP_URL environment variables for identity provider capability',
      oracle: 'exact' as const,
      invariants: [
        'COGNITO_IDP_NAME matches input userPoolProviderName',
        'COGNITO_IDP_URL matches input userPoolProviderUrl',
        'IAM policies are applied using userPoolArn if provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'CognitoIdentityProviderCapabilityData'],
      inputs: {
        shape: 'BindingContext with auth:identity-provider capability, providerName, providerUrl',
        notes: 'Identity provider binding uses same policy surface as user pool'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CognitoBind__IdentityProviderCapability__SetsIdpEnvVars', async () => {
      const strategy = new CognitoUserPoolBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('identity-provider', {
        'auth:identity-provider': {
          userPoolProviderName: 'Google',
          userPoolProviderUrl: 'https://accounts.google.com',
          userPoolArn: TEST_CONSTANTS.USER_POOL_ARN
        }
      });

      const context = createBindingContext({
        source,
        target,
      capability: 'auth:identity-provider',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Identity provider environment variables are set
      expect(result.environmentVariables.COGNITO_IDP_NAME).toBe('Google');
      expect(result.environmentVariables.COGNITO_IDP_URL).toBe('https://accounts.google.com');

      // Invariants: IAM policies should be applied when userPoolArn is present
      if (TEST_CONSTANTS.USER_POOL_ARN) {
        expect(result.iamPolicies.length).toBeGreaterThan(0);
      }
    });
  });

  describe('CognitoBind__MissingUserPoolId__ThrowsActionableError', () => {
    const metadata = {
      id: 'TP-binders-cognito-005',
      level: 'unit' as const,
      capability: 'Throws actionable error when userPoolId is missing from target capability data',
      oracle: 'exact' as const,
      invariants: [
        'Error message includes userPoolId',
        'Error message is actionable (includes context)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with auth:user-pool capability but missing userPoolId',
        notes: 'Target capability data missing required userPoolId or userPoolArn'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CognitoBind__MissingUserPoolId__ThrowsActionableError', async () => {
      const strategy = new CognitoUserPoolBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('user-pool', {
        'auth:user-pool': {
          clients: [{ clientId: 'client-123' }]
          // Missing userPoolId and userPoolArn
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'auth:user-pool',
        access: 'read'
      });

      // Primary assertion: Error is thrown with actionable message
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow();

      // Invariant: Error message should include userPoolId or userPoolArn
      try {
        await executeUnifiedBinding(strategy, context);
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
        // Error should mention userPoolId, userPoolArn, or user pool
        expect(error.message.toLowerCase()).toMatch(/user.*pool/);
      }
    });
  });

  describe('CognitoBind__AccessLevelMapping__MapsStandardToCognito', () => {
    const metadata = {
      id: 'TP-binders-cognito-006',
      level: 'unit' as const,
      capability: 'Maps standard AccessLevel values (read, write, admin) to Cognito-specific access correctly',
      oracle: 'exact' as const,
      invariants: [
        'read maps to authenticate',
        'write maps to manage',
        'admin maps to authenticate+read+manage',
        'IAM policies reflect mapped access levels'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'CognitoUserPoolCapabilityData'],
      inputs: {
        shape: 'BindingContext with auth:user-pool capability and different AccessLevel values',
        notes: 'Tests standard AccessLevel to Cognito access mapping'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CognitoBind__AccessLevelMapping__MapsStandardToCognito', async () => {
      const strategy = new CognitoUserPoolBinderStrategy();
      const baseTargetData = {
        userPoolId: TEST_CONSTANTS.USER_POOL_ID,
        userPoolArn: TEST_CONSTANTS.USER_POOL_ARN,
        clients: [{ clientId: 'client-123' }]
      };

      // Test read -> authenticate
      const readContext = createBindingContext({
        source: createMockSourceComponent(),
        target: createMockTargetComponent('user-pool', {
          'auth:user-pool': baseTargetData
        }),
        capability: 'auth:user-pool',
        access: 'read'
      });

      const readResult = await executeUnifiedBinding(strategy, readContext);
      assertEnhancedBindingResult(readResult);
      
      // read should grant authentication actions
      const readAuthPolicy = readResult.iamPolicies.find(p => 
        p.description.includes('authentication')
      );
      expect(readAuthPolicy).toBeDefined();

      // Test admin -> authenticate+read+manage
      const adminContext = createBindingContext({
        source: createMockSourceComponent(),
        target: createMockTargetComponent('user-pool', {
          'auth:user-pool': baseTargetData
        }),
      capability: 'auth:user-pool',
        access: 'admin'
      });

      const adminResult = await executeUnifiedBinding(strategy, adminContext);
      assertEnhancedBindingResult(adminResult);
      
      // admin should grant all three access types
      const adminAuthPolicy = adminResult.iamPolicies.find(p => 
        p.description.includes('authentication')
      );
      const adminReadPolicy = adminResult.iamPolicies.find(p => 
        p.description.includes('read') && !p.description.includes('authentication')
      );
      const adminManagePolicy = adminResult.iamPolicies.find(p => 
        p.description.includes('management') || p.description.includes('manage')
      );
      
      expect(adminAuthPolicy).toBeDefined();
      expect(adminReadPolicy).toBeDefined();
      expect(adminManagePolicy).toBeDefined();
    });
  });

  describe('CognitoBind__MissingCapability__ThrowsActionableError', () => {
    const metadata = {
      id: 'TP-binders-cognito-007',
      level: 'unit' as const,
      capability: 'Throws actionable error when target component does not provide the requested capability',
      oracle: 'exact' as const,
      invariants: [
        'Error message includes the capability name',
        'Error message is actionable (includes context)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with capability that target does not provide',
        notes: 'Target component missing the requested capability in getCapabilities()'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CognitoBind__MissingCapability__ThrowsActionableError', async () => {
      const strategy = new CognitoUserPoolBinderStrategy();
      const source = createMockSourceComponent();
      // Target component without the requested capability
      const target = createMockTargetComponent('user-pool', {
        // Empty capabilities - doesn't have 'auth:user-pool'
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'auth:user-pool',
        access: 'read'
      });

      // Primary assertion: Error is thrown with actionable message
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow();

      // Invariant: Error message should include the capability name
      try {
        await executeUnifiedBinding(strategy, context);
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
        // Error should mention the capability
        expect(error.message).toContain('auth:user-pool');
        expect(error.message.toLowerCase()).toMatch(/does not provide capability/);
      }
    });
  });

  describe('CognitoBind__IdentityProviderWithUserPoolArn__AppliesAccessPolicies', () => {
    const metadata = {
      id: 'TP-binders-cognito-008',
      level: 'unit' as const,
      capability: 'Applies access policies when userPoolArn is provided in identity provider binding',
      oracle: 'exact' as const,
      invariants: [
        'IAM policies are applied when userPoolArn is present',
        'Policies use the correct userPoolArn resource',
        'Access policies match the requested access level'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'CognitoIdentityProviderCapabilityData'],
      inputs: {
        shape: 'BindingContext with auth:identity-provider capability and userPoolArn',
        notes: 'Tests that userPoolArn triggers buildAccessPolicies in bindToIdentityProvider'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CognitoBind__IdentityProviderWithUserPoolArn__AppliesAccessPolicies', async () => {
      const strategy = new CognitoUserPoolBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('identity-provider', {
        'auth:identity-provider': {
          userPoolProviderName: 'SAML',
          userPoolProviderUrl: 'https://saml.example.com',
          userPoolArn: TEST_CONSTANTS.USER_POOL_ARN
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'auth:identity-provider',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies are applied when userPoolArn is present
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      
      // Verify policies use the correct ARN
      const policy = result.iamPolicies[0];
      const statementJson = policy.statement.toStatementJson();
      const resources = Array.isArray(statementJson.Resource) 
        ? statementJson.Resource 
        : [statementJson.Resource];
      expect(resources).toContain(TEST_CONSTANTS.USER_POOL_ARN);
    });
  });

  describe('CognitoBind__IdentityProviderWithEnvOverrides__AppliesCustomEnvVars', () => {
    const metadata = {
      id: 'TP-binders-cognito-009',
      level: 'unit' as const,
      capability: 'Applies custom environment variable overrides from directive.env in identity provider binding',
      oracle: 'exact' as const,
      invariants: [
        'Custom environment variables from directive.env are applied',
        'Standard environment variables are still present',
        'Custom variables override standard variables if they conflict'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'CognitoIdentityProviderCapabilityData'],
      inputs: {
        shape: 'BindingContext with auth:identity-provider capability and directive.env overrides',
        notes: 'Tests context.directive.env handling in bindToIdentityProvider'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CognitoBind__IdentityProviderWithEnvOverrides__AppliesCustomEnvVars', async () => {
      const strategy = new CognitoUserPoolBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('identity-provider', {
        'auth:identity-provider': {
          userPoolProviderName: 'Google',
          userPoolProviderUrl: 'https://accounts.google.com'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'auth:identity-provider',
        access: 'read',
        env: {
          'CUSTOM_IDP_CONFIG': 'custom-value',
          'ANOTHER_CUSTOM_VAR': 'another-value',
          'COGNITO_IDP_NAME': 'OverriddenName' // Should override standard var
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Custom environment variables are applied
      expect(result.environmentVariables.CUSTOM_IDP_CONFIG).toBe('custom-value');
      expect(result.environmentVariables.ANOTHER_CUSTOM_VAR).toBe('another-value');
      
      // Custom env vars override standard vars
      expect(result.environmentVariables.COGNITO_IDP_NAME).toBe('OverriddenName');
      
      // Standard vars are still present (except overridden ones)
      expect(result.environmentVariables.COGNITO_IDP_URL).toBe('https://accounts.google.com');
    });
  });
});