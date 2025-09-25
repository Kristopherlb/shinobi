/**
 * Comprehensive Binder Registry Tests
 * Comprehensive tests following Platform Testing Standard
 */

/**
 * Test Metadata:
 * {
 *   "id": "TP-binder-registry-001",
 *   "level": "unit",
 *   "capability": "Comprehensive binder registry validation and error handling",
 *   "oracle": "exact",
 *   "invariants": ["registry consistency", "strategy isolation", "capability validation"],
 *   "fixtures": ["deterministic clock", "seeded RNG", "mock strategies"],
 *   "inputs": { "shape": "service types and capabilities", "notes": "includes invalid service types and capabilities" },
 *   "risks": ["strategy conflicts", "capability validation bypass", "registry corruption"],
 *   "dependencies": ["ComprehensiveBinderRegistry", "IBinderStrategy", "mock strategies"],
 *   "evidence": ["registry consistency validation", "capability validation", "error message quality"],
 *   "compliance_refs": ["std://platform-testing-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ComprehensiveBinderRegistry } from '../../../../packages/core/src/platform/binders/registry/comprehensive-binder-registry';
import { IBinderStrategy } from '../../../../packages/core/src/platform/binders/strategies/binder-strategy';
import { BindingContext } from '../../../../packages/core/src/platform/binders/binding-context';
import { ComponentBinding } from '../../../../packages/core/src/platform/binders/component-binding';

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

// Mock strategy for testing
class MockBinderStrategy implements IBinderStrategy {
  constructor(
    public readonly supportedCapabilities: string[] = ['test:capability']
  ) { }

  async bind(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    // Mock implementation
  }
}

describe('ComprehensiveBinderRegistry', () => {
  let registry: ComprehensiveBinderRegistry;

  beforeEach(() => {
    registry = new ComprehensiveBinderRegistry();
  });

  describe('RegistryInitialization__ValidSetup__RegistersAllStrategies', () => {
    test('should register all binder strategies on initialization', () => {
      // Arrange & Act
      const serviceTypes = registry.getAllServiceTypes();

      // Assert - Check that all expected service types are registered
      expect(serviceTypes).toContain('ecs-fargate');
      expect(serviceTypes).toContain('eks');
      expect(serviceTypes).toContain('app-runner');
      expect(serviceTypes).toContain('batch');
      expect(serviceTypes).toContain('elastic-beanstalk');
      expect(serviceTypes).toContain('lightsail');
      expect(serviceTypes).toContain('dynamodb');
      expect(serviceTypes).toContain('neptune');
      expect(serviceTypes).toContain('vpc');
      expect(serviceTypes).toContain('kinesis');
      expect(serviceTypes).toContain('emr');
      expect(serviceTypes).toContain('efs');
      expect(serviceTypes).toContain('secrets-manager');
      expect(serviceTypes).toContain('kms');
      expect(serviceTypes).toContain('sagemaker');
      expect(serviceTypes).toContain('eventbridge');
      expect(serviceTypes).toContain('step-functions');
      expect(serviceTypes).toContain('amplify');
      expect(serviceTypes).toContain('iot-core');
      expect(serviceTypes).toContain('cloudfront');
    });

    test('should have correct number of registered strategies', () => {
      // Arrange & Act
      const serviceTypes = registry.getAllServiceTypes();

      // Assert - Should have exactly 21 registered strategies
      expect(serviceTypes).toHaveLength(21);
    });
  });

  describe('GetServiceTypes__ValidRegistry__ReturnsAllServiceTypes', () => {
    test('should return all registered service types', () => {
      // Arrange & Act
      const serviceTypes = registry.getAllServiceTypes();

      // Assert
      expect(Array.isArray(serviceTypes)).toBe(true);
      expect(serviceTypes.length).toBeGreaterThan(0);
      expect(serviceTypes.every(type => typeof type === 'string')).toBe(true);
    });

    test('should return unique service types', () => {
      // Arrange & Act
      const serviceTypes = registry.getAllServiceTypes();
      const uniqueTypes = new Set(serviceTypes);

      // Assert
      expect(uniqueTypes.size).toBe(serviceTypes.length);
    });
  });

  describe('GetServicesByCategory__ValidRegistry__ReturnsCorrectCategories', () => {
    test('should return services organized by category', () => {
      // Arrange & Act
      const categories = registry.getServicesByCategory();

      // Assert
      expect(categories).toHaveProperty('Compute');
      expect(categories).toHaveProperty('Database');
      expect(categories).toHaveProperty('Storage');
      expect(categories).toHaveProperty('Security');
      expect(categories).toHaveProperty('ML');
      expect(categories).toHaveProperty('Messaging');
      expect(categories).toHaveProperty('Mobile');
      expect(categories).toHaveProperty('IoT');
      expect(categories).toHaveProperty('Networking');
      expect(categories).toHaveProperty('Analytics');
      expect(categories).toHaveProperty('CDN');
    });

    test('should have correct services in Compute category', () => {
      // Arrange & Act
      const categories = registry.getServicesByCategory();

      // Assert
      expect(categories.Compute).toContain('ecs-fargate');
      expect(categories.Compute).toContain('eks');
      expect(categories.Compute).toContain('app-runner');
      expect(categories.Compute).toContain('batch');
      expect(categories.Compute).toContain('elastic-beanstalk');
      expect(categories.Compute).toContain('lightsail');
    });

    test('should have correct services in Database category', () => {
      // Arrange & Act
      const categories = registry.getServicesByCategory();

      // Assert
      expect(categories.Database).toContain('dynamodb');
      expect(categories.Database).toContain('neptune');
    });

    test('should have correct services in Security category', () => {
      // Arrange & Act
      const categories = registry.getServicesByCategory();

      // Assert
      expect(categories.Security).toContain('secrets-manager');
      expect(categories.Security).toContain('kms');
    });
  });

  describe('ValidateBinding__ValidInputs__ReturnsCorrectResults', () => {
    test('should return true for valid service type and capability', () => {
      // Arrange & Act
      const isValid = registry.validateBinding('ecs-fargate', 'ecs:cluster');

      // Assert
      expect(isValid).toBe(true);
    });

    test('should return true for valid DynamoDB binding', () => {
      // Arrange & Act
      const isValid = registry.validateBinding('dynamodb', 'dynamodb:table');

      // Assert
      expect(isValid).toBe(true);
    });

    test('should return true for valid KMS binding', () => {
      // Arrange & Act
      const isValid = registry.validateBinding('kms', 'kms:key');

      // Assert
      expect(isValid).toBe(true);
    });

    test('should return false for invalid service type', () => {
      // Arrange & Act
      const isValid = registry.validateBinding('invalid-service', 'valid:capability');

      // Assert
      expect(isValid).toBe(false);
    });

    test('should return false for valid service type with invalid capability', () => {
      // Arrange & Act
      const isValid = registry.validateBinding('ecs-fargate', 'invalid:capability');

      // Assert
      expect(isValid).toBe(false);
    });

    test('should return false for null service type', () => {
      // Arrange & Act
      const isValid = registry.validateBinding(null as any, 'valid:capability');

      // Assert
      expect(isValid).toBe(false);
    });

    test('should return false for undefined service type', () => {
      // Arrange & Act
      const isValid = registry.validateBinding(undefined as any, 'valid:capability');

      // Assert
      expect(isValid).toBe(false);
    });

    test('should return false for null capability', () => {
      // Arrange & Act
      const isValid = registry.validateBinding('ecs-fargate', null as any);

      // Assert
      expect(isValid).toBe(false);
    });

    test('should return false for undefined capability', () => {
      // Arrange & Act
      const isValid = registry.validateBinding('ecs-fargate', undefined as any);

      // Assert
      expect(isValid).toBe(false);
    });
  });

  describe('GetStrategy__ValidServiceType__ReturnsStrategy', () => {
    test('should return strategy for valid service type', () => {
      // Arrange & Act
      const strategy = registry.get('ecs-fargate');

      // Assert
      expect(strategy).toBeDefined();
      expect(strategy).toHaveProperty('supportedCapabilities');
      expect(strategy).toHaveProperty('bind');
      expect(Array.isArray(strategy?.supportedCapabilities)).toBe(true);
    });

    test('should return undefined for invalid service type', () => {
      // Arrange & Act
      const strategy = registry.get('invalid-service');

      // Assert
      expect(strategy).toBeUndefined();
    });

    test('should return undefined for null service type', () => {
      // Arrange & Act
      const strategy = registry.get(null as any);

      // Assert
      expect(strategy).toBeUndefined();
    });

    test('should return undefined for undefined service type', () => {
      // Arrange & Act
      const strategy = registry.get(undefined as any);

      // Assert
      expect(strategy).toBeUndefined();
    });
  });

  describe('GetSupportedCapabilities__ValidServiceType__ReturnsCapabilities', () => {
    test('should return capabilities for valid service type', () => {
      // Arrange & Act
      const capabilities = registry.getSupportedCapabilities('ecs-fargate');

      // Assert
      expect(Array.isArray(capabilities)).toBe(true);
      expect(capabilities).toContain('ecs:cluster');
      expect(capabilities).toContain('ecs:service');
      expect(capabilities).toContain('ecs:task-definition');
    });

    test('should return empty array for invalid service type', () => {
      // Arrange & Act
      const capabilities = registry.getSupportedCapabilities('invalid-service');

      // Assert
      expect(Array.isArray(capabilities)).toBe(true);
      expect(capabilities).toHaveLength(0);
    });

    test('should return empty array for null service type', () => {
      // Arrange & Act
      const capabilities = registry.getSupportedCapabilities(null as any);

      // Assert
      expect(Array.isArray(capabilities)).toBe(true);
      expect(capabilities).toHaveLength(0);
    });
  });

  describe('RegisterStrategy__ValidInputs__RegistersSuccessfully', () => {
    test('should register custom strategy successfully', () => {
      // Arrange
      const customStrategy = new MockBinderStrategy(['custom:capability']);
      const serviceType = 'custom-service';

      // Act
      registry.register(serviceType, customStrategy);
      const retrievedStrategy = registry.get(serviceType);
      const capabilities = registry.getSupportedCapabilities(serviceType);

      // Assert
      expect(retrievedStrategy).toBe(customStrategy);
      expect(capabilities).toEqual(['custom:capability']);
    });

    test('should overwrite existing strategy when registering same service type', () => {
      // Arrange
      const originalStrategy = registry.get('ecs-fargate');
      const newStrategy = new MockBinderStrategy(['new:capability']);

      // Act
      registry.register('ecs-fargate', newStrategy);
      const retrievedStrategy = registry.get('ecs-fargate');

      // Assert
      expect(retrievedStrategy).toBe(newStrategy);
      expect(retrievedStrategy).not.toBe(originalStrategy);
    });

    test('should handle null strategy gracefully', () => {
      // Arrange
      const serviceType = 'null-strategy-service';

      // Act & Assert - Should not throw
      expect(() => {
        registry.register(serviceType, null as any);
      }).not.toThrow();
    });

    test('should handle undefined strategy gracefully', () => {
      // Arrange
      const serviceType = 'undefined-strategy-service';

      // Act & Assert - Should not throw
      expect(() => {
        registry.register(serviceType, undefined as any);
      }).not.toThrow();
    });
  });

  describe('GetBindingRecommendations__ValidServiceType__ReturnsRecommendations', () => {
    test('should return recommendations for ECS Fargate', () => {
      // Arrange & Act
      const recommendations = registry.getBindingRecommendations('ecs-fargate');

      // Assert
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations).toContain('Bind to ECS cluster for container orchestration');
      expect(recommendations).toContain('Configure IAM roles for task execution');
    });

    test('should return recommendations for DynamoDB', () => {
      // Arrange & Act
      const recommendations = registry.getBindingRecommendations('dynamodb');

      // Assert
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations).toContain('Configure appropriate read/write capacity');
      expect(recommendations).toContain('Set up global secondary indexes for query optimization');
    });

    test('should return recommendations for KMS', () => {
      // Arrange & Act
      const recommendations = registry.getBindingRecommendations('kms');

      // Assert
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations).toContain('Configure key policies for access control');
      expect(recommendations).toContain('Enable automatic key rotation for compliance');
    });

    test('should return empty array for unknown service type', () => {
      // Arrange & Act
      const recommendations = registry.getBindingRecommendations('unknown-service');

      // Assert
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations).toHaveLength(0);
    });

    test('should return empty array for null service type', () => {
      // Arrange & Act
      const recommendations = registry.getBindingRecommendations(null as any);

      // Assert
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations).toHaveLength(0);
    });

    test('should return empty array for undefined service type', () => {
      // Arrange & Act
      const recommendations = registry.getBindingRecommendations(undefined as any);

      // Assert
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations).toHaveLength(0);
    });
  });

  describe('RegistryConsistency__ValidOperations__MaintainsConsistency', () => {
    test('should maintain consistency after registering new strategy', () => {
      // Arrange
      const customStrategy = new MockBinderStrategy(['custom:capability']);
      const serviceType = 'consistency-test-service';

      // Act
      const initialCount = registry.getAllServiceTypes().length;
      registry.register(serviceType, customStrategy);
      const finalCount = registry.getAllServiceTypes().length;

      // Assert
      expect(finalCount).toBe(initialCount + 1);
      expect(registry.get(serviceType)).toBe(customStrategy);
      expect(registry.validateBinding(serviceType, 'custom:capability')).toBe(true);
    });

    test('should maintain category consistency after registration', () => {
      // Arrange
      const customStrategy = new MockBinderStrategy(['custom:capability']);
      const serviceType = 'category-test-service';

      // Act
      const initialCategories = registry.getServicesByCategory();
      registry.register(serviceType, customStrategy);
      const finalCategories = registry.getServicesByCategory();

      // Assert - Categories should remain unchanged for unregistered services
      expect(finalCategories.Compute).toEqual(initialCategories.Compute);
      expect(finalCategories.Database).toEqual(initialCategories.Database);
    });
  });

  describe('EdgeCases__BoundaryConditions__HandlesGracefully', () => {
    test('should handle empty string service type', () => {
      // Arrange & Act
      const strategy = registry.get('');
      const capabilities = registry.getSupportedCapabilities('');
      const isValid = registry.validateBinding('', 'valid:capability');
      const recommendations = registry.getBindingRecommendations('');

      // Assert
      expect(strategy).toBeUndefined();
      expect(capabilities).toEqual([]);
      expect(isValid).toBe(false);
      expect(recommendations).toEqual([]);
    });

    test('should handle empty string capability', () => {
      // Arrange & Act
      const isValid = registry.validateBinding('ecs-fargate', '');

      // Assert
      expect(isValid).toBe(false);
    });

    test('should handle very long service type names', () => {
      // Arrange
      const longServiceType = 'a'.repeat(1000);
      const customStrategy = new MockBinderStrategy(['long:capability']);

      // Act & Assert - Should not throw
      expect(() => {
        registry.register(longServiceType, customStrategy);
        const strategy = registry.get(longServiceType);
        expect(strategy).toBe(customStrategy);
      }).not.toThrow();
    });

    test('should handle special characters in service type', () => {
      // Arrange
      const specialServiceType = 'service-with-special-chars-!@#$%^&*()';
      const customStrategy = new MockBinderStrategy(['special:capability']);

      // Act & Assert - Should not throw
      expect(() => {
        registry.register(specialServiceType, customStrategy);
        const strategy = registry.get(specialServiceType);
        expect(strategy).toBe(customStrategy);
      }).not.toThrow();
    });
  });
});
