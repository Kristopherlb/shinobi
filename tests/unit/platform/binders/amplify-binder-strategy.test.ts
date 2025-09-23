/**
 * Amplify Binder Strategy Tests
 * Comprehensive tests following Platform Testing Standard
 */

/**
 * Test Metadata:
 * {
 *   "id": "TP-amplify-binder-001",
 *   "level": "unit",
 *   "capability": "Amplify binding strategy validation and error handling",
 *   "oracle": "exact",
 *   "invariants": ["null safety", "access pattern validation", "ARN construction safety"],
 *   "fixtures": ["deterministic clock", "seeded RNG", "mock components"],
 *   "inputs": { "shape": "Amplify component properties and binding configurations", "notes": "includes null/undefined edge cases" },
 *   "risks": ["null reference errors", "ARN construction failures", "access pattern validation bypass"],
 *   "dependencies": ["AmplifyBinderStrategy", "BindingContext", "ComponentBinding"],
 *   "evidence": ["null safety validation", "error message quality", "access pattern coverage"],
 *   "compliance_refs": ["std://platform-testing-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AmplifyBinderStrategy } from '../../../../packages/core/src/platform/binders/strategies/mobile/amplify-binder-strategy';
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

describe('AmplifyBinderStrategy', () => {
  let strategy: AmplifyBinderStrategy;
  let mockSourceComponent: any;
  let mockTargetComponent: any;
  let mockBinding: ComponentBinding;
  let mockContext: BindingContext;

  beforeEach(() => {
    strategy = new AmplifyBinderStrategy();
    
    mockSourceComponent = {
      addToRolePolicy: jest.fn(),
      addEnvironment: jest.fn()
    };

    mockTargetComponent = {
      appId: 'test-app-id',
      appArn: 'arn:aws:amplify:us-east-1:123456789012:apps/test-app-id',
      appName: 'test-app',
      description: 'Test Amplify app',
      repository: 'https://github.com/test/repo',
      branch: 'main',
      platform: 'WEB',
      status: 'ACTIVE',
      defaultDomain: 'test-app.d1234567890.amplifyapp.com',
      customDomain: 'test.example.com',
      environmentVariables: {
        NODE_ENV: 'production',
        API_URL: 'https://api.example.com'
      },
      buildSpec: 'version: 1\nfrontend:\n  phases:\n    preBuild:\n      commands:\n        - npm install\n    build:\n      commands:\n        - npm run build',
      webhookUrl: 'https://webhooks.amplify.us-east-1.amazonaws.com/webhooks/test-webhook',
      webhookSecret: 'test-secret'
    };

    mockBinding = {
      capability: 'amplify:app',
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
        'amplify:app',
        'amplify:branch',
        'amplify:domain'
      ]);
    });
  });

  describe('Bind__NullTargetComponent__ThrowsError', () => {
    test('should throw error when target component is null', async () => {
      await expect(strategy.bind(mockSourceComponent, null, mockBinding, mockContext))
        .rejects.toThrow('Target component is required for Amplify binding');
    });
  });

  describe('Bind__NullBinding__ThrowsError', () => {
    test('should throw error when binding is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, null, mockContext))
        .rejects.toThrow('Binding is required for Amplify binding');
    });
  });

  describe('Bind__NullContext__ThrowsError', () => {
    test('should throw error when context is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, null))
        .rejects.toThrow('Context is required for Amplify binding');
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
        .rejects.toThrow('Unsupported Amplify capability: invalid:capability');
    });
  });

  describe('Bind__AmplifyAppCapability__ConfiguresAppAccess', () => {
    test('should configure read access for app', async () => {
      const readOnlyBinding = { ...mockBinding, access: ['read'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, readOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'amplify:GetApp',
          'amplify:ListApps'
        ],
        Resource: mockTargetComponent.appArn
      });
    });

    test('should configure write access for app', async () => {
      const writeOnlyBinding = { ...mockBinding, access: ['write'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, writeOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'amplify:CreateApp',
          'amplify:UpdateApp',
          'amplify:DeleteApp'
        ],
        Resource: mockTargetComponent.appArn
      });
    });

    test('should inject app environment variables', async () => {
      await strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('AMPLIFY_APP_ID', mockTargetComponent.appId);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('AMPLIFY_APP_ARN', mockTargetComponent.appArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('AMPLIFY_APP_NAME', mockTargetComponent.appName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('AMPLIFY_APP_DESCRIPTION', mockTargetComponent.description);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('AMPLIFY_REPOSITORY', mockTargetComponent.repository);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('AMPLIFY_BRANCH', mockTargetComponent.branch);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('AMPLIFY_PLATFORM', mockTargetComponent.platform);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('AMPLIFY_STATUS', mockTargetComponent.status);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('AMPLIFY_DEFAULT_DOMAIN', mockTargetComponent.defaultDomain);
    });
  });

  describe('Bind__AmplifyBranchCapability__ConfiguresBranchAccess', () => {
    test('should configure read access for branch', async () => {
      const branchBinding = { ...mockBinding, capability: 'amplify:branch', access: ['read'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, branchBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'amplify:GetBranch',
          'amplify:ListBranches'
        ],
        Resource: `arn:aws:amplify:${mockContext.region}:${mockContext.accountId}:apps/${mockTargetComponent.appId}/branches/*`
      });
    });

    test('should configure write access for branch', async () => {
      const branchBinding = { ...mockBinding, capability: 'amplify:branch', access: ['write'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, branchBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'amplify:CreateBranch',
          'amplify:UpdateBranch',
          'amplify:DeleteBranch'
        ],
        Resource: `arn:aws:amplify:${mockContext.region}:${mockContext.accountId}:apps/${mockTargetComponent.appId}/branches/*`
      });
    });

    test('should inject branch environment variables', async () => {
      const branchBinding = { ...mockBinding, capability: 'amplify:branch' };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, branchBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('AMPLIFY_BRANCH_NAME', mockTargetComponent.branch);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('AMPLIFY_BUILD_SPEC', mockTargetComponent.buildSpec);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('AMPLIFY_WEBHOOK_URL', mockTargetComponent.webhookUrl);
    });
  });

  describe('Bind__AmplifyDomainCapability__ConfiguresDomainAccess', () => {
    test('should configure read access for domain', async () => {
      const domainBinding = { ...mockBinding, capability: 'amplify:domain', access: ['read'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, domainBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'amplify:GetDomainAssociation',
          'amplify:ListDomainAssociations'
        ],
        Resource: `arn:aws:amplify:${mockContext.region}:${mockContext.accountId}:apps/${mockTargetComponent.appId}/domains/*`
      });
    });

    test('should configure write access for domain', async () => {
      const domainBinding = { ...mockBinding, capability: 'amplify:domain', access: ['write'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, domainBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'amplify:CreateDomainAssociation',
          'amplify:UpdateDomainAssociation',
          'amplify:DeleteDomainAssociation'
        ],
        Resource: `arn:aws:amplify:${mockContext.region}:${mockContext.accountId}:apps/${mockTargetComponent.appId}/domains/*`
      });
    });

    test('should inject domain environment variables', async () => {
      const domainBinding = { ...mockBinding, capability: 'amplify:domain' };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, domainBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('AMPLIFY_CUSTOM_DOMAIN', mockTargetComponent.customDomain);
    });
  });

  describe('Bind__EmptyAccessArray__ThrowsError', () => {
    test('should throw error when access array is empty', async () => {
      const emptyAccessBinding = { ...mockBinding, access: [] };
      
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, emptyAccessBinding, mockContext))
        .rejects.toThrow('Access array cannot be empty for Amplify binding');
    });
  });

  describe('Bind__InvalidAccessType__ThrowsError', () => {
    test('should throw error for invalid access type', async () => {
      const invalidAccessBinding = { ...mockBinding, access: ['invalid'] };
      
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidAccessBinding, mockContext))
        .rejects.toThrow('Invalid access types for Amplify binding: invalid. Valid types: read, write, admin, deploy');
    });
  });
});
