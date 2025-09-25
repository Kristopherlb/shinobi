/**
 * Lightsail Binder Strategy Tests
 * Comprehensive tests following Platform Testing Standard
 */

/**
 * Test Metadata:
 * {
 *   "id": "TP-lightsail-binder-001",
 *   "level": "unit",
 *   "capability": "Lightsail binding strategy validation and error handling",
 *   "oracle": "exact",
 *   "invariants": ["null safety", "access pattern validation", "ARN construction safety"],
 *   "fixtures": ["deterministic clock", "seeded RNG", "mock components"],
 *   "inputs": { "shape": "Lightsail component properties and binding configurations", "notes": "includes null/undefined edge cases" },
 *   "risks": ["null reference errors", "ARN construction failures", "access pattern validation bypass"],
 *   "dependencies": ["LightsailBinderStrategy", "BindingContext", "ComponentBinding"],
 *   "evidence": ["null safety validation", "error message quality", "access pattern coverage"],
 *   "compliance_refs": ["std://platform-testing-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { LightsailBinderStrategy } from '../../../../packages/core/src/platform/binders/strategies/compute/lightsail-binder-strategy';
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

describe('LightsailBinderStrategy', () => {
  let strategy: LightsailBinderStrategy;
  let mockSourceComponent: any;
  let mockTargetComponent: any;
  let mockBinding: ComponentBinding;
  let mockContext: BindingContext;

  beforeEach(() => {
    strategy = new LightsailBinderStrategy();

    mockSourceComponent = {
      addToRolePolicy: jest.fn(),
      addEnvironment: jest.fn()
    };

    mockTargetComponent = {
      instanceName: 'test-instance',
      instanceArn: 'arn:aws:lightsail:us-east-1:123456789012:Instance/test-instance',
      blueprintId: 'ubuntu_20_04',
      bundleId: 'nano_2_0',
      state: 'running',
      publicIpAddress: '54.123.45.67',
      privateIpAddress: '10.0.1.100',
      username: 'ubuntu',
      sshKeyName: 'test-key',
      databaseName: 'test-database',
      databaseArn: 'arn:aws:lightsail:us-east-1:123456789012:RelationalDatabase/test-database',
      engine: 'mysql',
      engineVersion: '8.0.23',
      masterUsername: 'admin',
      masterDatabaseName: 'testdb',
      backupRetentionEnabled: true,
      preferredBackupWindow: '03:00-04:00',
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00'
    };

    mockBinding = {
      capability: 'lightsail:instance',
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
        'lightsail:instance',
        'lightsail:database',
        'lightsail:load-balancer'
      ]);
    });
  });

  describe('Bind__NullTargetComponent__ThrowsError', () => {
    test('should throw error when target component is null', async () => {
      await expect(strategy.bind(mockSourceComponent, null, mockBinding, mockContext))
        .rejects.toThrow('Target component is required for Lightsail binding');
    });
  });

  describe('Bind__NullBinding__ThrowsError', () => {
    test('should throw error when binding is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, null, mockContext))
        .rejects.toThrow('Binding is required for Lightsail binding');
    });
  });

  describe('Bind__NullContext__ThrowsError', () => {
    test('should throw error when context is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, null))
        .rejects.toThrow('Context is required for Lightsail binding');
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
        .rejects.toThrow('Unsupported Lightsail capability: invalid:capability');
    });
  });

  describe('Bind__LightsailInstanceCapability__ConfiguresInstanceAccess', () => {
    test('should configure read access for instance', async () => {
      const readOnlyBinding = { ...mockBinding, access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, readOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'lightsail:GetInstance',
          'lightsail:GetInstances'
        ],
        Resource: mockTargetComponent.instanceArn
      });
    });

    test('should configure write access for instance', async () => {
      const writeOnlyBinding = { ...mockBinding, access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, writeOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'lightsail:CreateInstances',
          'lightsail:StartInstance',
          'lightsail:StopInstance',
          'lightsail:RebootInstance',
          'lightsail:DeleteInstance'
        ],
        Resource: mockTargetComponent.instanceArn
      });
    });

    test('should inject instance environment variables', async () => {
      await strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('LIGHTSAIL_INSTANCE_NAME', mockTargetComponent.instanceName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('LIGHTSAIL_INSTANCE_ARN', mockTargetComponent.instanceArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('LIGHTSAIL_BLUEPRINT_ID', mockTargetComponent.blueprintId);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('LIGHTSAIL_BUNDLE_ID', mockTargetComponent.bundleId);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('LIGHTSAIL_STATE', mockTargetComponent.state);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('LIGHTSAIL_PUBLIC_IP', mockTargetComponent.publicIpAddress);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('LIGHTSAIL_PRIVATE_IP', mockTargetComponent.privateIpAddress);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('LIGHTSAIL_USERNAME', mockTargetComponent.username);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('LIGHTSAIL_SSH_KEY_NAME', mockTargetComponent.sshKeyName);
    });
  });

  describe('Bind__LightsailDatabaseCapability__ConfiguresDatabaseAccess', () => {
    test('should configure read access for database', async () => {
      const databaseBinding = { ...mockBinding, capability: 'lightsail:database', access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, databaseBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'lightsail:GetRelationalDatabase',
          'lightsail:GetRelationalDatabases'
        ],
        Resource: mockTargetComponent.databaseArn
      });
    });

    test('should configure write access for database', async () => {
      const databaseBinding = { ...mockBinding, capability: 'lightsail:database', access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, databaseBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'lightsail:CreateRelationalDatabase',
          'lightsail:UpdateRelationalDatabase',
          'lightsail:DeleteRelationalDatabase'
        ],
        Resource: mockTargetComponent.databaseArn
      });
    });

    test('should inject database environment variables', async () => {
      const databaseBinding = { ...mockBinding, capability: 'lightsail:database' };

      await strategy.bind(mockSourceComponent, mockTargetComponent, databaseBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('LIGHTSAIL_DATABASE_NAME', mockTargetComponent.databaseName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('LIGHTSAIL_DATABASE_ARN', mockTargetComponent.databaseArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('LIGHTSAIL_DATABASE_ENGINE', mockTargetComponent.engine);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('LIGHTSAIL_DATABASE_VERSION', mockTargetComponent.engineVersion);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('LIGHTSAIL_MASTER_USERNAME', mockTargetComponent.masterUsername);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('LIGHTSAIL_MASTER_DATABASE', mockTargetComponent.masterDatabaseName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('LIGHTSAIL_BACKUP_RETENTION', mockTargetComponent.backupRetentionEnabled.toString());
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('LIGHTSAIL_BACKUP_WINDOW', mockTargetComponent.preferredBackupWindow);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('LIGHTSAIL_MAINTENANCE_WINDOW', mockTargetComponent.preferredMaintenanceWindow);
    });
  });

  describe('Bind__LightsailLoadBalancerCapability__ConfiguresLoadBalancerAccess', () => {
    test('should configure read access for load balancer', async () => {
      const lbBinding = { ...mockBinding, capability: 'lightsail:load-balancer', access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, lbBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'lightsail:GetLoadBalancer',
          'lightsail:GetLoadBalancers'
        ],
        Resource: `arn:aws:lightsail:${mockContext.region}:${mockContext.accountId}:LoadBalancer/*`
      });
    });

    test('should configure write access for load balancer', async () => {
      const lbBinding = { ...mockBinding, capability: 'lightsail:load-balancer', access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, lbBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'lightsail:CreateLoadBalancer',
          'lightsail:UpdateLoadBalancerAttribute',
          'lightsail:DeleteLoadBalancer'
        ],
        Resource: `arn:aws:lightsail:${mockContext.region}:${mockContext.accountId}:LoadBalancer/*`
      });
    });
  });

  describe('Bind__EmptyAccessArray__ThrowsError', () => {
    test('should throw error when access array is empty', async () => {
      const emptyAccessBinding = { ...mockBinding, access: [] };

      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, emptyAccessBinding, mockContext))
        .rejects.toThrow('Access array cannot be empty for Lightsail binding');
    });
  });

  describe('Bind__InvalidAccessType__ThrowsError', () => {
    test('should throw error for invalid access type', async () => {
      const invalidAccessBinding = { ...mockBinding, access: ['invalid'] };

      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidAccessBinding, mockContext))
        .rejects.toThrow('Invalid access types for Lightsail binding: invalid. Valid types: read, write, admin, manage');
    });
  });
});
