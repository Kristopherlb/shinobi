/**
 * Integration Tests for Import Components
 * Tests the complete workflow from schema validation to component binding
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { ComponentRegistry } from '../../src/components/registry/component-registry';
import { LambdaToRdsImportStrategy } from '../../src/bindings/strategies/lambda-to-rds-import.strategy';
import { LambdaToSnsImportStrategy } from '../../src/bindings/strategies/lambda-to-sns-import.strategy';
import { Logger } from '../../src/utils/logger';
import { Construct } from 'constructs';

// Mock AWS CDK modules
jest.mock('aws-cdk-lib/aws-rds');
jest.mock('aws-cdk-lib/aws-sns');
jest.mock('aws-cdk-lib/aws-secretsmanager');
jest.mock('aws-cdk-lib/aws-ec2');
jest.mock('aws-cdk-lib/aws-lambda');
jest.mock('aws-cdk-lib/aws-iam');

// Mock Construct
class MockConstruct {
  constructor(scope: any, id: string) {}
}
jest.mock('constructs', () => ({
  Construct: MockConstruct
}));

describe('Import Components Integration', () => {
  let registry: ComponentRegistry;
  let mockLogger: jest.Mocked<Logger>;
  let mockScope: Construct;
  let lambdaToRdsStrategy: LambdaToRdsImportStrategy;
  let lambdaToSnsStrategy: LambdaToSnsImportStrategy;

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
    lambdaToRdsStrategy = new LambdaToRdsImportStrategy({ logger: mockLogger });
    lambdaToSnsStrategy = new LambdaToSnsImportStrategy({ logger: mockLogger });

    jest.clearAllMocks();
  });

  describe('TC-INT-01: End-to-End RDS Import Workflow', () => {
    test('should support complete RDS import and binding workflow', async () => {
      // Arrange - Configuration that would come from service.yml
      const rdsImportConfig = {
        instanceArn: 'arn:aws:rds:us-east-1:123456789012:db:shared-qa-database',
        securityGroupId: 'sg-0a1b2c3d4e5f6g7h8',
        secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:qa-db-credentials-AbCdEf'
      };

      const lambdaConfig = {
        handler: 'index.handler',
        runtime: 'nodejs18.x'
      };

      // Act - Create import component
      const rdsImport = registry.create('rds-postgres-import', mockScope, 'SharedDatabase', rdsImportConfig);
      
      // Mock lambda component for binding test
      const mockLambdaComponent = {
        getResourceReferences: () => ({
          lambdaFunction: {} // Mock Lambda function
        }),
        getCapabilities: () => ({}),
        synth: jest.fn()
      };

      // Test binding context
      const bindingContext = {
        sourceComponent: mockLambdaComponent as any,
        targetComponent: rdsImport,
        capability: 'db:postgres',
        access: 'readwrite' as const,
        customEnvVars: {
          DATABASE_URL: 'CUSTOM_DATABASE_URL'
        }
      };

      // Assert - Component creation successful
      expect(rdsImport).toBeDefined();
      expect(mockLogger.debug).toHaveBeenCalledWith('Creating component instance: rds-postgres-import (SharedDatabase)');

      // Assert - Binding strategy can handle this scenario
      expect(lambdaToRdsStrategy.canHandle(bindingContext)).toBe(true);

      // Act - Apply binding (mocked Lambda function)
      await lambdaToRdsStrategy.apply(bindingContext);

      // Assert - Binding applied successfully
      expect(mockLogger.debug).toHaveBeenCalledWith('Applying Lambda to RDS import binding: readwrite access');
    });
  });

  describe('TC-INT-02: End-to-End SNS Import Workflow', () => {
    test('should support complete SNS import and binding workflow', async () => {
      // Arrange - Configuration that would come from service.yml
      const snsImportConfig = {
        topicArn: 'arn:aws:sns:us-east-1:123456789012:order-events-topic',
        topicName: 'Order Events'
      };

      // Act - Create import component
      const snsImport = registry.create('sns-topic-import', mockScope, 'OrderEventsTopic', snsImportConfig);

      // Mock lambda component for binding test
      const mockLambdaComponent = {
        getResourceReferences: () => ({
          lambdaFunction: {} // Mock Lambda function
        }),
        getCapabilities: () => ({}),
        synth: jest.fn()
      };

      // Test binding context for publishing
      const publishBindingContext = {
        sourceComponent: mockLambdaComponent as any,
        targetComponent: snsImport,
        capability: 'topic:sns',
        access: 'write' as const,
        options: {
          filterPolicy: { eventType: ['order.created', 'order.updated'] }
        }
      };

      // Assert - Component creation successful
      expect(snsImport).toBeDefined();
      expect(mockLogger.debug).toHaveBeenCalledWith('Creating component instance: sns-topic-import (OrderEventsTopic)');

      // Assert - Binding strategy can handle this scenario
      expect(lambdaToSnsStrategy.canHandle(publishBindingContext)).toBe(true);

      // Act - Apply binding (mocked Lambda function)
      await lambdaToSnsStrategy.apply(publishBindingContext);

      // Assert - Binding applied successfully
      expect(mockLogger.debug).toHaveBeenCalledWith('Applying Lambda to SNS import binding: write access');
    });
  });

  describe('TC-INT-03: Multi-Component Service Scenario', () => {
    test('should support service with multiple import components', async () => {
      // Arrange - Multi-component service configuration
      const serviceComponents = [
        {
          name: 'shared-database',
          type: 'rds-postgres-import',
          config: {
            instanceArn: 'arn:aws:rds:us-east-1:123456789012:db:shared-prod-db',
            securityGroupId: 'sg-prod123456',
            secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:prod-db-secret-XyZ123'
          }
        },
        {
          name: 'notification-topic',
          type: 'sns-topic-import',
          config: {
            topicArn: 'arn:aws:sns:us-east-1:123456789012:system-notifications'
          }
        }
      ];

      // Act - Create all import components
      const components = serviceComponents.map(comp => ({
        ...comp,
        instance: registry.create(comp.type, mockScope, comp.name, comp.config)
      }));

      // Assert - All components created successfully
      expect(components).toHaveLength(2);
      expect(components[0].instance).toBeDefined();
      expect(components[1].instance).toBeDefined();

      // Assert - Components have correct capabilities
      const dbCapabilities = components[0].instance.getCapabilities();
      const snsCapabilities = components[1].instance.getCapabilities();

      expect(dbCapabilities['db:postgres']).toBeDefined();
      expect(snsCapabilities['topic:sns']).toBeDefined();

      // Assert - Registry tracks all components correctly
      expect(mockLogger.debug).toHaveBeenCalledWith('Creating component instance: rds-postgres-import (shared-database)');
      expect(mockLogger.debug).toHaveBeenCalledWith('Creating component instance: sns-topic-import (notification-topic)');
    });
  });

  describe('TC-INT-04: Cross-Region Import Support', () => {
    test('should handle cross-region resource imports', async () => {
      // Arrange - Cross-region resources
      const crossRegionConfigs = [
        {
          name: 'eu-central-database',
          type: 'rds-postgres-import',
          config: {
            instanceArn: 'arn:aws:rds:eu-central-1:123456789012:db:eu-shared-db',
            securityGroupId: 'sg-eu123456',
            secretArn: 'arn:aws:secretsmanager:eu-central-1:123456789012:secret:eu-db-secret-AbC123'
          }
        },
        {
          name: 'ap-southeast-topic',
          type: 'sns-topic-import',
          config: {
            topicArn: 'arn:aws:sns:ap-southeast-2:123456789012:apac-notifications'
          }
        }
      ];

      // Act - Create cross-region components
      const components = crossRegionConfigs.map(config => 
        registry.create(config.type, mockScope, config.name, config.config)
      );

      // Assert - Cross-region components created successfully
      expect(components).toHaveLength(2);
      components.forEach(component => {
        expect(component).toBeDefined();
      });

      // Assert - Resource references include correct regional information
      const dbResourceRefs = components[0].getResourceReferences();
      const snsResourceRefs = components[1].getResourceReferences();

      expect(dbResourceRefs.instanceArn).toContain('eu-central-1');
      expect(snsResourceRefs.topicArn).toContain('ap-southeast-2');
    });
  });

  describe('TC-INT-05: Configuration Validation Integration', () => {
    test('should validate configurations before component creation', () => {
      // Test data for different validation scenarios
      const validationTestCases = [
        {
          name: 'valid RDS config',
          type: 'rds-postgres-import',
          config: {
            instanceArn: 'arn:aws:rds:us-west-2:123456789012:db:valid-db',
            securityGroupId: 'sg-validsg123',
            secretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:valid-secret-123'
          },
          shouldPass: true
        },
        {
          name: 'invalid RDS config - missing secretArn',
          type: 'rds-postgres-import',
          config: {
            instanceArn: 'arn:aws:rds:us-west-2:123456789012:db:valid-db',
            securityGroupId: 'sg-validsg123'
          },
          shouldPass: false,
          expectedError: "Missing required field 'secretArn'"
        },
        {
          name: 'valid SNS config',
          type: 'sns-topic-import',
          config: {
            topicArn: 'arn:aws:sns:us-east-1:123456789012:valid-topic'
          },
          shouldPass: true
        },
        {
          name: 'invalid SNS config - missing topicArn',
          type: 'sns-topic-import',
          config: {
            topicName: 'Some Topic'
          },
          shouldPass: false,
          expectedError: "Missing required field 'topicArn'"
        }
      ];

      // Test each validation scenario
      validationTestCases.forEach(testCase => {
        if (testCase.shouldPass) {
          // Should not throw
          expect(() => registry.validateComponentConfig(testCase.type, testCase.config))
            .not.toThrow();
        } else {
          // Should throw with expected message
          expect(() => registry.validateComponentConfig(testCase.type, testCase.config))
            .toThrow(testCase.expectedError);
        }
      });
    });
  });

  describe('TC-INT-06: Registry Extension and Discovery', () => {
    test('should support registry extension with custom import components', () => {
      // Arrange - Custom import component factory
      const customImportFactory = jest.fn().mockReturnValue({
        synth: jest.fn(),
        getCapabilities: () => ({ 'custom:capability': { description: 'Custom', bindings: {} } }),
        getResourceReferences: () => ({ customResource: 'mock' })
      });

      const customComponentEntry = {
        factory: customImportFactory,
        isImportComponent: true,
        description: 'Custom import component for testing',
        supportedCapabilities: ['custom:capability'],
        configSchema: {
          type: 'object',
          required: ['resourceArn'],
          properties: {
            resourceArn: { type: 'string', pattern: '^arn:aws:custom:' }
          }
        }
      };

      // Act - Register custom component
      registry.register('custom-import', customComponentEntry);

      // Assert - Custom component available
      expect(registry.getAvailableComponents()).toContain('custom-import');
      expect(registry.isImportComponent('custom-import')).toBe(true);
      expect(registry.getImportComponents()).toContain('custom-import');

      // Act - Create instance of custom component
      const customConfig = { resourceArn: 'arn:aws:custom:us-east-1:123456789012:resource/test' };
      const customComponent = registry.create('custom-import', mockScope, 'CustomTest', customConfig);

      // Assert - Custom component created successfully
      expect(customComponent).toBeDefined();
      expect(customImportFactory).toHaveBeenCalledWith(
        mockScope,
        'CustomTest',
        customConfig,
        expect.any(Object) // Dependencies
      );
    });
  });
});