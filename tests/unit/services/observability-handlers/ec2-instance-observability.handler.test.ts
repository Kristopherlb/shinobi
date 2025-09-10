/**
 * Test Metadata:
 * {
 *   "id": "TP-ec2-instance-observability-handler-001",
 *   "level": "unit",
 *   "capability": "Ec2ObservabilityHandler OpenTelemetry instrumentation and CloudWatch alarms",
 *   "oracle": "exact",
 *   "invariants": ["instrumentation applied correctly", "alarms created", "environment variables set"],
 *   "fixtures": ["mock ec2-instance construct", "mock component", "mock context"],
 *   "inputs": { "shape": "BaseComponent with ec2-instance construct", "notes": "Mocked for isolation" },
 *   "risks": ["instrumentation failures", "alarm creation errors", "environment variable conflicts"],
 *   "dependencies": ["Ec2ObservabilityHandler", "AWS CDK constructs", "OpenTelemetry"],
 *   "evidence": ["environment variables", "alarm creation", "execution time"],
 *   "compliance_refs": ["std://platform-testing-standard", "std://platform-observability-standard", "std://platform-tagging-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Ec2ObservabilityHandler } from '../../../../src/services/observability-handlers/ec2-observability.handler';
import { PlatformServiceContext } from '../../../../src/platform/contracts/platform-services';
import { BaseComponent } from '../../../../src/platform/contracts/component';
import { ITaggingService } from '../../../../src/services/tagging.service';
import { ObservabilityConfig } from '../../../../src/services/observability-handlers/observability-handler.interface';

// Mock AWS CDK constructs
jest.mock('aws-cdk-lib/aws-cloudwatch');

describe('Ec2ObservabilityHandler', () => {
  let handler: Ec2ObservabilityHandler;
  let mockContext: PlatformServiceContext;
  let mockComponent: BaseComponent;
  let mockConstruct: any;
  let mockTaggingService: ITaggingService;
  let mockConfig: ObservabilityConfig;
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
      node: { id: 'test-ec2-instance' }
    };

    // Create mock component
    mockComponent = {
      node: { id: 'test-component' },
      getType: jest.fn(() => 'ec2-instance'),
      getConstruct: jest.fn((name: string) => {
        if (name === 'instance') return mockConstruct;
        return undefined;
      })
    } as any;

    // Create mock tagging service
    mockTaggingService = {
      buildStandardTags: jest.fn().mockReturnValue({}) as jest.MockedFunction<(context: any) => Record<string, string>>,
      applyStandardTags: jest.fn() as jest.MockedFunction<(resource: any, context: any, additionalTags?: any) => void>
    };

    // Create mock observability config
    mockConfig = {
      traceSamplingRate: 0.1,
      metricsInterval: 300,
      logsRetentionDays: 365,
      alarmThresholds: {
        ec2: {
          cpuUtilization: 85,
          statusCheckFailed: 1,
          networkIn: 100000000
        },
        rds: {
          freeStorageSpace: 10,
          cpuUtilization: 85,
          connectionCount: 80
        },
        lambda: {
          errorRate: 5,
          duration: 5000,
          throttles: 10
        },
        alb: {
          responseTime: 2,
          http5xxErrors: 10,
          unhealthyTargets: 1
        },
        sqs: {
          messageAge: 300,
          deadLetterMessages: 5
        },
        ecs: {
          cpuUtilization: 80,
          memoryUtilization: 80,
          taskCount: 0
        }
      },
      otelEnvironmentTemplate: {
        'OTEL_EXPORTER_OTLP_ENDPOINT': 'https://otel-collector.commercial.{{ region }}.platform.local:4317',
        'OTEL_EXPORTER_OTLP_HEADERS': 'authorization=Bearer {{ authToken }}',
        'OTEL_SERVICE_NAME': '{{ componentName }}',
        'OTEL_SERVICE_VERSION': '{{ serviceVersion }}',
        'OTEL_RESOURCE_ATTRIBUTES': 'service.name={{ serviceName }},deployment.environment={{ environment }},cloud.provider={{ cloudProvider }}',
        'OTEL_TRACES_SAMPLER': 'traceidratio',
        'OTEL_TRACES_SAMPLER_ARG': '{{ traceSamplingRate }}',
        'OTEL_METRICS_EXPORTER': 'otlp',
        'OTEL_LOGS_EXPORTER': 'otlp',
        'OTEL_PROPAGATORS': 'tracecontext,baggage,xray',
        'OTEL_INSTRUMENTATION_COMMON_DEFAULT_ENABLED': 'true',
        'OTEL_BSP_MAX_EXPORT_BATCH_SIZE': '512',
        'OTEL_BSP_EXPORT_TIMEOUT': '30000',
        'OTEL_METRIC_EXPORT_INTERVAL': '{{ metricsInterval }}'
      },
      ec2OtelUserDataTemplate: '#!/bin/bash\nyum update -y\ncurl -L -o /tmp/otelcol-contrib.deb https://github.com/open-telemetry/opentelemetry-collector-releases/releases/latest/download/otelcol-contrib_linux_amd64.deb\ndpkg -i /tmp/otelcol-contrib.deb\ncat > /opt/aws/otel-collector/config.yaml << \'EOF\'\n{{ otelAgentConfigJson }}\nEOF\n{{ otelEnvironmentVars }}\nsystemctl enable otelcol-contrib\nsystemctl start otelcol-contrib'
    };

    // Create handler
    handler = new Ec2ObservabilityHandler(mockContext, mockTaggingService);
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
      expect(handler.supportedComponentType).toBe('ec2-instance');
    });
  });

  describe('Ec2ObservabilityHandler__CommercialFramework__CreatesStandardAlarms', () => {
    test('Ec2ObservabilityHandler__CommercialFramework__CreatesStandardAlarms', () => {
      // Oracle: exact - deterministic alarm creation based on compliance framework
      const result = handler.apply(mockComponent, mockConfig);

      expect(result.alarmsCreated).toBe(1);
      expect(result.instrumentationApplied).toBe(true);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        'EC2 observability applied successfully',
        expect.objectContaining({
          service: 'ObservabilityService',
          componentType: 'ec2-instance',
          componentName: 'test-component',
          alarmsCreated: 1,
          instrumentationApplied: true
        })
      );
    });
  });

  describe('Ec2ObservabilityHandler__FedrampModerateFramework__CreatesEnhancedAlarms', () => {
    test('Ec2ObservabilityHandler__FedrampModerateFramework__CreatesEnhancedAlarms', () => {
      // Oracle: exact - deterministic alarm creation for compliance frameworks
      mockContext.complianceFramework = 'fedramp-moderate';

      const result = handler.apply(mockComponent, mockConfig);

      expect(result.alarmsCreated).toBe(2);
      expect(result.instrumentationApplied).toBe(true);
    });
  });

  describe('Ec2ObservabilityHandler__FedrampHighFramework__CreatesComprehensiveAlarms', () => {
    test('Ec2ObservabilityHandler__FedrampHighFramework__CreatesComprehensiveAlarms', () => {
      // Oracle: exact - deterministic alarm creation with comprehensive monitoring
      mockContext.complianceFramework = 'fedramp-high';

      const result = handler.apply(mockComponent, mockConfig);

      expect(result.alarmsCreated).toBe(3);
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

      expect(() => handler.apply(mockComponent, mockConfig)).toThrow('Alarm creation failed');
      
      expect(mockContext.logger.error).toHaveBeenCalledWith(
        'Failed to apply EC2 observability',
        expect.objectContaining({
          service: 'ObservabilityService',
          componentType: 'ec2-instance',
          componentName: 'test-component',
          error: 'Alarm creation failed'
        })
      );

      (cloudwatch.Alarm as any) = originalAlarm;
    });
  });

  describe('HandlerInterfaceCompliance__Ec2ObservabilityHandler__ImplementsCorrectly', () => {
    test('HandlerInterfaceCompliance__Ec2ObservabilityHandler__ImplementsCorrectly', () => {
      // Oracle: exact - deterministic interface compliance
      expect(handler.supportedComponentType).toBe('ec2-instance');
      expect(typeof handler.apply).toBe('function');
    });
  });
});
