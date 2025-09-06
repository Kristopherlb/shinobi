/**
 * Unit Tests for SNS Topic Import Component
 * Tests the import component functionality for existing SNS topics
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { SnsTopicImportComponent, SnsTopicImportConfig } from '../../../src/components/import/sns-topic-import.component';
import { Logger } from '../../../src/utils/logger';
import { Construct } from 'constructs';

// Mock AWS CDK modules
jest.mock('aws-cdk-lib/aws-sns');

// Mock Construct
class MockConstruct {
  constructor(scope: any, id: string) {}
}
jest.mock('constructs', () => ({
  Construct: MockConstruct
}));

describe('SnsTopicImportComponent', () => {
  let mockLogger: jest.Mocked<Logger>;
  let mockScope: Construct;
  let validConfig: SnsTopicImportConfig;

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
      topicArn: 'arn:aws:sns:us-east-1:123456789012:new-order-topic'
    };

    jest.clearAllMocks();
  });

  describe('TC-SNS-UT-01: Component Construction and Validation', () => {
    test('should create component with valid configuration', () => {
      // Act
      const component = new SnsTopicImportComponent(
        mockScope,
        'TestSnsImport',
        validConfig,
        { logger: mockLogger }
      );

      // Assert
      expect(component).toBeInstanceOf(SnsTopicImportComponent);
      expect(mockLogger.debug).toHaveBeenCalledWith('Importing existing SNS topic');
    });

    test('should reject missing topicArn', () => {
      // Arrange
      const invalidConfig = { ...validConfig, topicArn: '' };

      // Act & Assert
      expect(() => new SnsTopicImportComponent(
        mockScope,
        'TestSnsImport',
        invalidConfig,
        { logger: mockLogger }
      )).toThrow('topicArn is required for SNS topic import component');
    });

    test('should validate SNS ARN format', () => {
      // Arrange
      const invalidConfig = { 
        ...validConfig, 
        topicArn: 'arn:aws:sqs:us-east-1:123456789012:my-queue' 
      };

      // Act & Assert
      expect(() => new SnsTopicImportComponent(
        mockScope,
        'TestSnsImport',
        invalidConfig,
        { logger: mockLogger }
      )).toThrow('Invalid SNS topic ARN format');
    });

    test('should validate ARN structure', () => {
      // Arrange
      const invalidConfig = { 
        ...validConfig, 
        topicArn: 'arn:aws:sns:us-east-1:123456789012' // Missing topic name
      };

      // Act & Assert
      expect(() => new SnsTopicImportComponent(
        mockScope,
        'TestSnsImport',
        invalidConfig,
        { logger: mockLogger }
      )).toThrow('Invalid SNS topic ARN format');
    });

    test('should reject ARN with empty topic name', () => {
      // Arrange
      const invalidConfig = { 
        ...validConfig, 
        topicArn: 'arn:aws:sns:us-east-1:123456789012:' // Empty topic name
      };

      // Act & Assert
      expect(() => new SnsTopicImportComponent(
        mockScope,
        'TestSnsImport',
        invalidConfig,
        { logger: mockLogger }
      )).toThrow('Invalid topic name in ARN');
    });
  });

  describe('TC-SNS-UT-02: Component Capabilities', () => {
    test('should provide topic:sns capability', () => {
      // Arrange
      const component = new SnsTopicImportComponent(
        mockScope,
        'TestSnsImport',
        validConfig,
        { logger: mockLogger }
      );

      // Act
      const capabilities = component.getCapabilities();

      // Assert
      expect(capabilities['topic:sns']).toBeDefined();
      expect(capabilities['topic:sns'].description).toBe('SNS topic messaging capabilities');
      expect(capabilities['topic:sns'].bindings.read).toBeDefined();
      expect(capabilities['topic:sns'].bindings.write).toBeDefined();
      expect(capabilities['topic:sns'].bindings.readwrite).toBeDefined();
      expect(capabilities['topic:sns'].bindings.admin).toBeDefined();
    });

    test('should provide environment variables for each access level', () => {
      // Arrange
      const component = new SnsTopicImportComponent(
        mockScope,
        'TestSnsImport',
        validConfig,
        { logger: mockLogger }
      );

      // Act
      const capabilities = component.getCapabilities();

      // Assert
      const snsCapability = capabilities['topic:sns'];
      
      // Check read access environment variables
      expect(snsCapability.bindings.read.environmentVariables.SNS_TOPIC_ARN).toBeDefined();
      expect(snsCapability.bindings.read.environmentVariables.SNS_TOPIC_NAME).toBeDefined();

      // Check write access environment variables
      expect(snsCapability.bindings.write.environmentVariables.SNS_TOPIC_ARN).toBeDefined();
      expect(snsCapability.bindings.write.environmentVariables.SNS_TOPIC_NAME).toBeDefined();

      // Check readwrite access has same variables
      expect(snsCapability.bindings.readwrite.environmentVariables.SNS_TOPIC_ARN).toBeDefined();
      expect(snsCapability.bindings.admin.environmentVariables.SNS_TOPIC_ARN).toBeDefined();
    });
  });

  describe('TC-SNS-UT-03: Resource References', () => {
    test('should provide access to imported topic', () => {
      // Arrange
      const component = new SnsTopicImportComponent(
        mockScope,
        'TestSnsImport',
        validConfig,
        { logger: mockLogger }
      );

      // Act
      const resourceRefs = component.getResourceReferences();

      // Assert
      expect(resourceRefs.topicArn).toBe(validConfig.topicArn);
      expect(resourceRefs.topicName).toBe('new-order-topic'); // Extracted from ARN
      expect(resourceRefs.topic).toBeDefined();
    });

    test('should use custom topic name if provided', () => {
      // Arrange
      const configWithName = {
        ...validConfig,
        topicName: 'Custom Order Topic'
      };

      const component = new SnsTopicImportComponent(
        mockScope,
        'TestSnsImport',
        configWithName,
        { logger: mockLogger }
      );

      // Act
      const resourceRefs = component.getResourceReferences();

      // Assert
      expect(resourceRefs.topicName).toBe('Custom Order Topic');
    });

    test('should provide direct access to CDK topic construct', () => {
      // Arrange
      const component = new SnsTopicImportComponent(
        mockScope,
        'TestSnsImport',
        validConfig,
        { logger: mockLogger }
      );

      // Act & Assert
      expect(component.getTopic()).toBeDefined();
    });
  });

  describe('TC-SNS-UT-04: Synthesis Process', () => {
    test('should complete synthesis without errors', async () => {
      // Arrange
      const component = new SnsTopicImportComponent(
        mockScope,
        'TestSnsImport',
        validConfig,
        { logger: mockLogger }
      );

      const context = {
        environment: 'prod-us-east-1',
        region: 'us-east-1',
        accountId: '123456789012',
        serviceName: 'order-api',
        complianceFramework: 'commercial' as const
      };

      // Act
      await component.synth(context);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Importing existing SNS topic: arn:aws:sns:us-east-1:123456789012:new-order-topic'
      );
      expect(mockLogger.debug).toHaveBeenCalledWith('SNS topic import component synthesis completed');
    });
  });

  describe('TC-SNS-UT-05: Topic Name Extraction', () => {
    test('should extract topic name from ARN correctly', () => {
      // Arrange
      const testCases = [
        {
          arn: 'arn:aws:sns:us-east-1:123456789012:simple-topic',
          expectedName: 'simple-topic'
        },
        {
          arn: 'arn:aws:sns:eu-west-1:987654321098:production-order-events-topic',
          expectedName: 'production-order-events-topic'
        },
        {
          arn: 'arn:aws:sns:ap-southeast-2:555666777888:team-notifications-2024',
          expectedName: 'team-notifications-2024'
        }
      ];

      testCases.forEach(({ arn, expectedName }) => {
        // Arrange
        const config = { topicArn: arn };
        const component = new SnsTopicImportComponent(
          mockScope,
          'TestSnsImport',
          config,
          { logger: mockLogger }
        );

        // Act
        const resourceRefs = component.getResourceReferences();

        // Assert
        expect(resourceRefs.topicName).toBe(expectedName);
      });
    });
  });

  describe('TC-SNS-UT-06: Cross-Region and Cross-Account Support', () => {
    test('should handle cross-region topic imports', () => {
      // Arrange
      const crossRegionConfig = {
        topicArn: 'arn:aws:sns:eu-central-1:123456789012:global-notifications'
      };

      // Act & Assert
      expect(() => new SnsTopicImportComponent(
        mockScope,
        'TestSnsImport',
        crossRegionConfig,
        { logger: mockLogger }
      )).not.toThrow();
    });

    test('should handle cross-account topic imports', () => {
      // Arrange
      const crossAccountConfig = {
        topicArn: 'arn:aws:sns:us-west-2:999888777666:shared-platform-events'
      };

      // Act & Assert
      expect(() => new SnsTopicImportComponent(
        mockScope,
        'TestSnsImport',
        crossAccountConfig,
        { logger: mockLogger }
      )).not.toThrow();
    });

    test('should handle FIFO topics', () => {
      // Arrange
      const fifoConfig = {
        topicArn: 'arn:aws:sns:us-east-1:123456789012:order-events.fifo'
      };

      // Act
      const component = new SnsTopicImportComponent(
        mockScope,
        'TestSnsImport',
        fifoConfig,
        { logger: mockLogger }
      );

      const resourceRefs = component.getResourceReferences();

      // Assert
      expect(resourceRefs.topicName).toBe('order-events.fifo');
    });
  });
});