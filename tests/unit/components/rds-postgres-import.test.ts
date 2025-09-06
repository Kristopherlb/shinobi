/**
 * Unit Tests for RDS PostgreSQL Import Component
 * Tests the import component functionality for existing databases
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { RdsPostgresImportComponent, RdsPostgresImportConfig } from '../../../src/components/import/rds-postgres-import.component';
import { Logger } from '../../../src/utils/logger';
import { Construct } from 'constructs';

// Mock AWS CDK modules
jest.mock('aws-cdk-lib/aws-rds');
jest.mock('aws-cdk-lib/aws-secretsmanager');
jest.mock('aws-cdk-lib/aws-ec2');

// Mock Construct
class MockConstruct {
  constructor(scope: any, id: string) {}
}
jest.mock('constructs', () => ({
  Construct: MockConstruct
}));

describe('RdsPostgresImportComponent', () => {
  let mockLogger: jest.Mocked<Logger>;
  let mockScope: Construct;
  let validConfig: RdsPostgresImportConfig;

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

    validConfig = {
      instanceArn: 'arn:aws:rds:us-east-1:123456789012:db:shared-qa-db-instance',
      securityGroupId: 'sg-12345678',
      secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:shared-qa-db-creds-AbCdEf'
    };

    jest.clearAllMocks();
  });

  describe('TC-IMP-UT-01: Component Construction and Validation', () => {
    test('should create component with valid configuration', () => {
      // Act
      const component = new RdsPostgresImportComponent(
        mockScope,
        'TestRdsImport',
        validConfig,
        { logger: mockLogger }
      );

      // Assert
      expect(component).toBeInstanceOf(RdsPostgresImportComponent);
      expect(mockLogger.debug).toHaveBeenCalledWith('Importing existing RDS resources');
    });

    test('should reject missing instanceArn', () => {
      // Arrange
      const invalidConfig = { ...validConfig, instanceArn: '' };

      // Act & Assert
      expect(() => new RdsPostgresImportComponent(
        mockScope,
        'TestRdsImport',
        invalidConfig,
        { logger: mockLogger }
      )).toThrow('instanceArn is required for RDS PostgreSQL import component');
    });

    test('should reject missing securityGroupId', () => {
      // Arrange
      const invalidConfig = { ...validConfig, securityGroupId: '' };

      // Act & Assert
      expect(() => new RdsPostgresImportComponent(
        mockScope,
        'TestRdsImport',
        invalidConfig,
        { logger: mockLogger }
      )).toThrow('securityGroupId is required for RDS PostgreSQL import component');
    });

    test('should reject missing secretArn', () => {
      // Arrange
      const invalidConfig = { ...validConfig, secretArn: '' };

      // Act & Assert
      expect(() => new RdsPostgresImportComponent(
        mockScope,
        'TestRdsImport',
        invalidConfig,
        { logger: mockLogger }
      )).toThrow('secretArn is required for RDS PostgreSQL import component');
    });

    test('should validate RDS ARN format', () => {
      // Arrange
      const invalidConfig = { 
        ...validConfig, 
        instanceArn: 'arn:aws:ec2:us-east-1:123456789012:instance:i-1234567890abcdef0' 
      };

      // Act & Assert
      expect(() => new RdsPostgresImportComponent(
        mockScope,
        'TestRdsImport',
        invalidConfig,
        { logger: mockLogger }
      )).toThrow('Invalid RDS instance ARN format');
    });

    test('should validate Secrets Manager ARN format', () => {
      // Arrange
      const invalidConfig = { 
        ...validConfig, 
        secretArn: 'arn:aws:ssm:us-east-1:123456789012:parameter/database-password' 
      };

      // Act & Assert
      expect(() => new RdsPostgresImportComponent(
        mockScope,
        'TestRdsImport',
        invalidConfig,
        { logger: mockLogger }
      )).toThrow('Invalid Secrets Manager ARN format');
    });

    test('should validate security group ID format', () => {
      // Arrange
      const invalidConfig = { 
        ...validConfig, 
        securityGroupId: 'vpc-12345678' 
      };

      // Act & Assert
      expect(() => new RdsPostgresImportComponent(
        mockScope,
        'TestRdsImport',
        invalidConfig,
        { logger: mockLogger }
      )).toThrow('Invalid security group ID format');
    });
  });

  describe('TC-IMP-UT-02: Component Capabilities', () => {
    test('should provide db:postgres capability', () => {
      // Arrange
      const component = new RdsPostgresImportComponent(
        mockScope,
        'TestRdsImport',
        validConfig,
        { logger: mockLogger }
      );

      // Act
      const capabilities = component.getCapabilities();

      // Assert
      expect(capabilities['db:postgres']).toBeDefined();
      expect(capabilities['db:postgres'].description).toBe('PostgreSQL database access');
      expect(capabilities['db:postgres'].bindings.read).toBeDefined();
      expect(capabilities['db:postgres'].bindings.write).toBeDefined();
      expect(capabilities['db:postgres'].bindings.readwrite).toBeDefined();
      expect(capabilities['db:postgres'].bindings.admin).toBeDefined();
    });

    test('should provide environment variables for each access level', () => {
      // Arrange
      const component = new RdsPostgresImportComponent(
        mockScope,
        'TestRdsImport',
        validConfig,
        { logger: mockLogger }
      );

      // Act
      const capabilities = component.getCapabilities();

      // Assert
      const dbCapability = capabilities['db:postgres'];
      
      // Check read access environment variables
      expect(dbCapability.bindings.read.environmentVariables.DATABASE_URL).toBeDefined();
      expect(dbCapability.bindings.read.environmentVariables.DB_HOST).toBeDefined();
      expect(dbCapability.bindings.read.environmentVariables.DB_PORT).toBeDefined();
      expect(dbCapability.bindings.read.environmentVariables.DB_USERNAME).toBeDefined();
      expect(dbCapability.bindings.read.environmentVariables.DB_PASSWORD).toBeDefined();

      // Check readwrite access has same variables
      expect(dbCapability.bindings.readwrite.environmentVariables.DATABASE_URL).toBeDefined();
      expect(dbCapability.bindings.admin.environmentVariables.DATABASE_URL).toBeDefined();
    });
  });

  describe('TC-IMP-UT-03: Resource References', () => {
    test('should provide access to imported resources', () => {
      // Arrange
      const component = new RdsPostgresImportComponent(
        mockScope,
        'TestRdsImport',
        validConfig,
        { logger: mockLogger }
      );

      // Act
      const resourceRefs = component.getResourceReferences();

      // Assert
      expect(resourceRefs.instanceArn).toBe(validConfig.instanceArn);
      expect(resourceRefs.secretArn).toBe(validConfig.secretArn);
      expect(resourceRefs.securityGroupId).toBe(validConfig.securityGroupId);
      expect(resourceRefs.databaseInstance).toBeDefined();
      expect(resourceRefs.secret).toBeDefined();
      expect(resourceRefs.securityGroup).toBeDefined();
    });

    test('should provide direct access to CDK constructs', () => {
      // Arrange
      const component = new RdsPostgresImportComponent(
        mockScope,
        'TestRdsImport',
        validConfig,
        { logger: mockLogger }
      );

      // Act & Assert
      expect(component.getDatabaseInstance()).toBeDefined();
      expect(component.getSecret()).toBeDefined();
      expect(component.getSecurityGroup()).toBeDefined();
    });
  });

  describe('TC-IMP-UT-04: Synthesis Process', () => {
    test('should complete synthesis without errors', async () => {
      // Arrange
      const component = new RdsPostgresImportComponent(
        mockScope,
        'TestRdsImport',
        validConfig,
        { logger: mockLogger }
      );

      const context = {
        environment: 'qa-us-east-1',
        region: 'us-east-1',
        accountId: '123456789012',
        serviceName: 'order-processor',
        complianceFramework: 'commercial' as const
      };

      // Act
      await component.synth(context);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Importing existing RDS PostgreSQL instance: arn:aws:rds:us-east-1:123456789012:db:shared-qa-db-instance'
      );
      expect(mockLogger.debug).toHaveBeenCalledWith('RDS PostgreSQL import component synthesis completed');
    });
  });

  describe('TC-IMP-UT-05: Configuration Edge Cases', () => {
    test('should handle optional engine parameter', () => {
      // Arrange
      const configWithEngine = {
        ...validConfig,
        engine: 'postgres'
      };

      // Act
      const component = new RdsPostgresImportComponent(
        mockScope,
        'TestRdsImport',
        configWithEngine,
        { logger: mockLogger }
      );

      // Assert
      expect(component).toBeInstanceOf(RdsPostgresImportComponent);
    });

    test('should handle complex ARN formats', () => {
      // Arrange
      const complexConfig = {
        ...validConfig,
        instanceArn: 'arn:aws:rds:eu-west-1:987654321098:db:production-primary-db-instance-2024'
      };

      // Act & Assert
      expect(() => new RdsPostgresImportComponent(
        mockScope,
        'TestRdsImport',
        complexConfig,
        { logger: mockLogger }
      )).not.toThrow();
    });

    test('should reject malformed ARN with insufficient parts', () => {
      // Arrange
      const malformedConfig = {
        ...validConfig,
        instanceArn: 'arn:aws:rds:us-east-1'
      };

      // Act & Assert
      expect(() => new RdsPostgresImportComponent(
        mockScope,
        'TestRdsImport',
        malformedConfig,
        { logger: mockLogger }
      )).toThrow('Invalid RDS ARN format');
    });
  });
});