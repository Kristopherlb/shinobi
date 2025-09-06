/**
 * Unit Tests for Component Registry
 * Tests the registration and instantiation of import components
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { ComponentRegistry } from '../../../src/components/registry/component-registry';
import { Logger } from '../../../src/utils/logger';
import { Construct } from 'constructs';

// Mock AWS CDK modules
jest.mock('aws-cdk-lib/aws-rds');
jest.mock('aws-cdk-lib/aws-sns');
jest.mock('aws-cdk-lib/aws-secretsmanager');
jest.mock('aws-cdk-lib/aws-ec2');

// Mock Construct
class MockConstruct {
  constructor(scope: any, id: string) {}
}
jest.mock('constructs', () => ({
  Construct: MockConstruct
}));

describe('ComponentRegistry', () => {
  let registry: ComponentRegistry;
  let mockLogger: jest.Mocked<Logger>;
  let mockScope: Construct;

  beforeEach(() => {
    mockLogger = {
      configure: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      success: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      getLogs: jest.fn(),
      config: {},
      logs: [],
      getLevelNumber: jest.fn().mockReturnValue(2),
      addToLogs: jest.fn()
    } as any;

    mockScope = new MockConstruct(null, 'TestScope') as any;
    registry = new ComponentRegistry({ logger: mockLogger });

    jest.clearAllMocks();
  });

  describe('TC-REG-UT-01: Built-in Component Registration', () => {
    test('should register built-in import components during construction', () => {
      // Act
      const availableComponents = registry.getAvailableComponents();

      // Assert
      expect(availableComponents).toContain('rds-postgres-import');
      expect(availableComponents).toContain('sns-topic-import');
      
      expect(mockLogger.debug).toHaveBeenCalledWith('Registering built-in components');
      expect(mockLogger.debug).toHaveBeenCalledWith('Registered component type: rds-postgres-import');
      expect(mockLogger.debug).toHaveBeenCalledWith('Registered component type: sns-topic-import');
    });

    test('should correctly identify import components', () => {
      // Act & Assert
      expect(registry.isImportComponent('rds-postgres-import')).toBe(true);
      expect(registry.isImportComponent('sns-topic-import')).toBe(true);
      expect(registry.isImportComponent('non-existent-component')).toBe(false);
    });

    test('should return all import components', () => {
      // Act
      const importComponents = registry.getImportComponents();

      // Assert
      expect(importComponents).toContain('rds-postgres-import');
      expect(importComponents).toContain('sns-topic-import');
      expect(importComponents).toHaveLength(2);
    });
  });

  describe('TC-REG-UT-02: Component Information Retrieval', () => {
    test('should provide component information for RDS import', () => {
      // Act
      const info = registry.getComponentInfo('rds-postgres-import');

      // Assert
      expect(info).toBeDefined();
      expect(info!.isImportComponent).toBe(true);
      expect(info!.description).toContain('RDS PostgreSQL database');
      expect(info!.supportedCapabilities).toContain('db:postgres');
      expect(info!.configSchema).toBeDefined();
      expect(info!.configSchema.required).toContain('instanceArn');
      expect(info!.configSchema.required).toContain('securityGroupId');
      expect(info!.configSchema.required).toContain('secretArn');
    });

    test('should provide component information for SNS import', () => {
      // Act
      const info = registry.getComponentInfo('sns-topic-import');

      // Assert
      expect(info).toBeDefined();
      expect(info!.isImportComponent).toBe(true);
      expect(info!.description).toContain('SNS topic');
      expect(info!.supportedCapabilities).toContain('topic:sns');
      expect(info!.configSchema).toBeDefined();
      expect(info!.configSchema.required).toContain('topicArn');
    });

    test('should return undefined for non-existent components', () => {
      // Act
      const info = registry.getComponentInfo('non-existent-component');

      // Assert
      expect(info).toBeUndefined();
    });
  });

  describe('TC-REG-UT-03: Component Creation', () => {
    test('should create RDS PostgreSQL import component', () => {
      // Arrange
      const config = {
        instanceArn: 'arn:aws:rds:us-east-1:123456789012:db:test-db',
        securityGroupId: 'sg-12345678',
        secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret-AbCdEf'
      };

      // Act
      const component = registry.create('rds-postgres-import', mockScope, 'TestRds', config);

      // Assert
      expect(component).toBeDefined();
      expect(mockLogger.debug).toHaveBeenCalledWith('Creating component instance: rds-postgres-import (TestRds)');
    });

    test('should create SNS topic import component', () => {
      // Arrange
      const config = {
        topicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic'
      };

      // Act
      const component = registry.create('sns-topic-import', mockScope, 'TestSns', config);

      // Assert
      expect(component).toBeDefined();
      expect(mockLogger.debug).toHaveBeenCalledWith('Creating component instance: sns-topic-import (TestSns)');
    });

    test('should throw error for unknown component type', () => {
      // Arrange
      const config = { someConfig: 'value' };

      // Act & Assert
      expect(() => registry.create('unknown-component', mockScope, 'TestUnknown', config))
        .toThrow('Unknown component type: unknown-component. Available types: rds-postgres-import, sns-topic-import');
    });

    test('should provide helpful error when component creation fails', () => {
      // Arrange - Invalid config that will cause component creation to fail
      const invalidConfig = {
        instanceArn: 'invalid-arn', // This should cause validation to fail
        securityGroupId: 'sg-12345678',
        secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret-AbCdEf'
      };

      // Act & Assert
      expect(() => registry.create('rds-postgres-import', mockScope, 'TestRds', invalidConfig))
        .toThrow(/Failed to create component 'TestRds' of type 'rds-postgres-import'/);
    });
  });

  describe('TC-REG-UT-04: Component Configuration Validation', () => {
    test('should validate RDS import configuration successfully', () => {
      // Arrange
      const validConfig = {
        instanceArn: 'arn:aws:rds:us-east-1:123456789012:db:test-db',
        securityGroupId: 'sg-12345678',
        secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret-AbCdEf'
      };

      // Act & Assert - Should not throw
      expect(() => registry.validateComponentConfig('rds-postgres-import', validConfig))
        .not.toThrow();
    });

    test('should reject RDS config missing required fields', () => {
      // Arrange
      const invalidConfig = {
        instanceArn: 'arn:aws:rds:us-east-1:123456789012:db:test-db'
        // Missing securityGroupId and secretArn
      };

      // Act & Assert
      expect(() => registry.validateComponentConfig('rds-postgres-import', invalidConfig))
        .toThrow("Missing required field 'securityGroupId' in rds-postgres-import configuration");
    });

    test('should validate SNS import configuration successfully', () => {
      // Arrange
      const validConfig = {
        topicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic'
      };

      // Act & Assert - Should not throw
      expect(() => registry.validateComponentConfig('sns-topic-import', validConfig))
        .not.toThrow();
    });

    test('should reject SNS config missing required fields', () => {
      // Arrange
      const invalidConfig = {
        topicName: 'test-topic'
        // Missing topicArn
      };

      // Act & Assert
      expect(() => registry.validateComponentConfig('sns-topic-import', invalidConfig))
        .toThrow("Missing required field 'topicArn' in sns-topic-import configuration");
    });

    test('should throw error for unknown component type in validation', () => {
      // Arrange
      const config = { someField: 'value' };

      // Act & Assert
      expect(() => registry.validateComponentConfig('unknown-component', config))
        .toThrow('Unknown component type: unknown-component');
    });
  });

  describe('TC-REG-UT-05: Custom Component Registration', () => {
    test('should allow registration of custom components', () => {
      // Arrange
      const customFactory = jest.fn();
      const customEntry = {
        factory: customFactory,
        isImportComponent: false,
        description: 'Custom test component',
        supportedCapabilities: ['custom:capability']
      };

      // Act
      registry.register('custom-component', customEntry);

      // Assert
      expect(registry.getAvailableComponents()).toContain('custom-component');
      expect(registry.isImportComponent('custom-component')).toBe(false);
    });

    test('should prevent duplicate component registration', () => {
      // Arrange
      const customFactory = jest.fn();
      const customEntry = {
        factory: customFactory,
        isImportComponent: false,
        description: 'Custom test component',
        supportedCapabilities: ['custom:capability']
      };

      // Act & Assert
      registry.register('custom-component', customEntry);
      expect(() => registry.register('custom-component', customEntry))
        .toThrow("Component type 'custom-component' is already registered");
    });
  });

  describe('TC-REG-UT-06: Registry State Management', () => {
    test('should maintain registry state across operations', () => {
      // Act - Perform multiple operations
      const initialComponents = registry.getAvailableComponents();
      const rdsInfo = registry.getComponentInfo('rds-postgres-import');
      const importComponents = registry.getImportComponents();
      const finalComponents = registry.getAvailableComponents();

      // Assert - State should remain consistent
      expect(finalComponents).toEqual(initialComponents);
      expect(rdsInfo).toBeDefined();
      expect(importComponents.length).toBe(2);
    });
  });
});