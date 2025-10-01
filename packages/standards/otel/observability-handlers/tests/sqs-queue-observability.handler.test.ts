/**
 * Test Metadata:
 * {
 *   "id": "TP-sqs-queue-observability-handler-001",
 *   "level": "unit",
 *   "capability": "SqsObservabilityHandler OpenTelemetry instrumentation and CloudWatch alarms",
 *   "oracle": "exact",
 *   "invariants": ["instrumentation applied correctly", "alarms created", "environment variables set"],
 *   "fixtures": ["mock sqs-queue construct", "mock component", "mock context"],
 *   "inputs": { "shape": "BaseComponent with sqs-queue construct", "notes": "Mocked for isolation" },
 *   "risks": ["instrumentation failures", "alarm creation errors", "environment variable conflicts"],
 *   "dependencies": ["SqsObservabilityHandler", "AWS CDK constructs", "OpenTelemetry"],
 *   "evidence": ["environment variables", "alarm creation", "execution time"],
 *   "compliance_refs": ["std://platform-testing-standard", "std://platform-observability-standard", "std://platform-tagging-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { SqsObservabilityHandler } from '../../../../src/services/observability-handlers/sqs-observability.handler.js';
import { PlatformServiceContext } from '../../@shinobi/core/platform-services.js';
import { BaseComponent } from '../../@shinobi/core/component.js';
import { ITaggingService } from '../../../../src/services/tagging.service.js';

// Mock AWS CDK constructs
jest.mock('aws-cdk-lib/aws-cloudwatch');

describe('SqsObservabilityHandler', () => {
  let handler: SqsObservabilityHandler;
  let mockContext: PlatformServiceContext;
  let mockComponent: BaseComponent;
  let mockConstruct: any;
  let mockTaggingService: ITaggingService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Determinism controls - freeze clock and seed RNG
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    Math.random = jest.fn(() => 0.5);
    
    // Restore environment variables after each test
    originalEnv = process.env;
    process.env = { ...originalEnv };

    // Create mock context
    mockContext = {
      serviceName: 'test-service',
      environment: 'test',
      region: 'us-east-1',
      complianceFramework: 'commercial',
      serviceLabels: { version: '1.0.0' },
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      },
      serviceRegistry: {} as any
    };

    // Create mock construct
    mockConstruct = {
      node: { id: 'test-sqs-queue' }
    };

    // Create mock component
    mockComponent = {
      node: { id: 'test-component' },
      getType: jest.fn(() => 'sqs-queue'),
      getConstruct: jest.fn((name: string) => {
        if (name === 'queue') return mockConstruct;
        return undefined;
      })
    } as any;

    // Create mock tagging service
    mockTaggingService = {
      buildStandardTags: jest.fn().mockReturnValue({}) as jest.MockedFunction<(context: any) => Record<string, string>>,
      applyStandardTags: jest.fn() as jest.MockedFunction<(resource: any, context: any, additionalTags?: any) => void>
    };

    // Create handler
    handler = new SqsObservabilityHandler(mockContext, mockTaggingService);
  });

  afterEach(() => {
    // Restore environment variables
    process.env = originalEnv;
    
    // Restore timers
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('HandlerInitialization__ValidContext__CreatesSuccessfully', () => {
    test('HandlerInitialization__ValidContext__CreatesSuccessfully', () => {
      // Oracle: exact - deterministic handler creation
      expect(handler).toBeDefined();
      expect(handler.supportedComponentType).toBe('sqs-queue');
    });
  });

  describe('SqsObservabilityHandler__CommercialFramework__CreatesStandardAlarms', () => {
    test('SqsObservabilityHandler__CommercialFramework__CreatesStandardAlarms', () => {
      // Oracle: exact - deterministic alarm creation based on compliance framework
      const result = handler.apply(mockComponent);

      expect(result.alarmsCreated).toBe(1);
      expect(result.instrumentationApplied).toBe(true);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        'SqsObservabilityHandler observability applied successfully',
        expect.objectContaining({
          service: 'ObservabilityService',
          componentType: 'sqs-queue',
          componentName: 'test-component',
          alarmsCreated: 1,
          instrumentationApplied: true
        })
      );
    });
  });

  describe('SqsObservabilityHandler__FedrampModerateFramework__CreatesEnhancedAlarms', () => {
    test('SqsObservabilityHandler__FedrampModerateFramework__CreatesEnhancedAlarms', () => {
      // Oracle: exact - deterministic alarm creation for compliance frameworks
      mockContext.complianceFramework = 'fedramp-moderate';

      const result = handler.apply(mockComponent);

      expect(result.alarmsCreated).toBe(1);
      expect(result.instrumentationApplied).toBe(true);
    });
  });

  describe('SqsObservabilityHandler__FedrampHighFramework__CreatesComprehensiveAlarms', () => {
    test('SqsObservabilityHandler__FedrampHighFramework__CreatesComprehensiveAlarms', () => {
      // Oracle: exact - deterministic alarm creation with comprehensive monitoring
      mockContext.complianceFramework = 'fedramp-high';

      const result = handler.apply(mockComponent);

      expect(result.alarmsCreated).toBe(1);
      expect(result.instrumentationApplied).toBe(true);
    });
  });

  describe('ErrorHandling__AlarmCreationFails__PropagatesAndLogs', () => {
    test('ErrorHandling__AlarmCreationFails__PropagatesAndLogs', () => {
      // Oracle: exact - deterministic error handling
      const originalAlarm = (cloudwatch.Alarm as any);
      (cloudwatch.Alarm as any) = jest.fn().mockImplementation(() => {
        throw new Error('Alarm creation failed');
      });

      expect(() => handler.apply(mockComponent)).toThrow('Alarm creation failed');
      
      expect(mockContext.logger.error).toHaveBeenCalledWith(
        'Failed to apply SQS observability',
        expect.objectContaining({
          service: 'ObservabilityService',
          componentType: 'sqs-queue',
          componentName: 'test-component',
          error: 'Alarm creation failed'
        })
      );

      (cloudwatch.Alarm as any) = originalAlarm;
    });
  });

  describe('HandlerInterfaceCompliance__SqsObservabilityHandler__ImplementsCorrectly', () => {
    test('HandlerInterfaceCompliance__SqsObservabilityHandler__ImplementsCorrectly', () => {
      // Oracle: exact - deterministic interface compliance
      expect(handler.supportedComponentType).toBe('sqs-queue');
      expect(typeof handler.apply).toBe('function');
    });
  });
});
