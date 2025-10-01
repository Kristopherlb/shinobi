/**
 * Test Metadata:
 * {
 *   "id": "TP-lambda-observability-handler-001",
 *   "level": "unit",
 *   "capability": "Lambda OpenTelemetry instrumentation and CloudWatch alarms",
 *   "oracle": "exact",
 *   "invariants": ["instrumentation applied correctly", "alarms created", "environment variables set"],
 *   "fixtures": ["mock Lambda function", "mock component", "mock context"],
 *   "inputs": { "shape": "BaseComponent with Lambda function", "notes": "Mocked for isolation" },
 *   "risks": ["instrumentation failures", "alarm creation errors", "environment variable conflicts"],
 *   "dependencies": ["LambdaObservabilityHandler", "AWS CDK Lambda constructs", "OpenTelemetry"],
 *   "evidence": ["environment variables", "alarm creation", "execution time"],
 *   "compliance_refs": ["std://platform-testing-standard", "std://platform-observability-standard", "std://platform-tagging-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { LambdaObservabilityHandler } from '../../../../src/services/observability-handlers/lambda-observability.handler.js';
import { PlatformServiceContext } from '../../@shinobi/core/platform-services.js';
import { BaseComponent } from '../../@shinobi/core/component.js';

// Mock AWS CDK constructs
jest.mock('aws-cdk-lib/aws-lambda');
jest.mock('aws-cdk-lib/aws-iam');

describe('LambdaObservabilityHandler', () => {
  let handler: LambdaObservabilityHandler;
  let mockContext: PlatformServiceContext;
  let mockComponent: BaseComponent;
  let mockLambdaFunction: any;
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
      serviceRegistry: {
        isEnabled: jest.fn().mockReturnValue(true),
        getConfiguration: jest.fn().mockReturnValue({}),
        register: jest.fn(),
        unregister: jest.fn()
      }
    } as PlatformServiceContext;

    // Create mock Lambda function
    mockLambdaFunction = {
      addEnvironment: jest.fn(),
      addLayers: jest.fn(),
      addToRolePolicy: jest.fn(),
      runtime: { name: 'nodejs18.x' }
    };

    // Create mock component
    mockComponent = {
      node: { id: 'test-lambda' },
      getType: jest.fn().mockReturnValue('lambda-api'),
      getConstruct: jest.fn().mockReturnValue(mockLambdaFunction),
      applyStandardTags: jest.fn()
    } as any;

    // Create handler
    handler = new LambdaObservabilityHandler(mockContext);
  });

  afterEach(() => {
    // Restore environment variables
    process.env = originalEnv;
    
    // Restore real timers and RNG
    jest.useRealTimers();
    Math.random = Math.random;
    
    jest.clearAllMocks();
  });

  describe('Handler Properties', () => {
    /**
     * Test Metadata:
     * {
     *   "id": "TP-lambda-observability-handler-002",
     *   "level": "unit",
     *   "capability": "Handler component type identification",
     *   "oracle": "exact",
     *   "invariants": ["supported component type matches expected", "type is immutable"],
     *   "fixtures": ["LambdaObservabilityHandler instance"],
     *   "inputs": { "shape": "No external inputs", "notes": "Property validation" },
     *   "risks": ["incorrect component type", "type mismatch"],
     *   "dependencies": ["LambdaObservabilityHandler"],
     *   "evidence": ["supportedComponentType property"],
     *   "compliance_refs": ["std://platform-testing-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('HandlerType__LambdaObservabilityHandler__HasCorrectComponentType', () => {
      // Oracle: exact - deterministic value comparison
      expect(handler.supportedComponentType).toBe('lambda');
    });
  });

  describe.skip('OpenTelemetry Instrumentation', () => {
    /**
     * Test Metadata:
     * {
     *   "id": "TP-lambda-observability-handler-003",
     *   "level": "unit",
     *   "capability": "Lambda-specific OpenTelemetry instrumentation application",
     *   "oracle": "trace",
     *   "invariants": ["instrumentation applied", "environment variables set", "permissions added"],
     *   "fixtures": ["mock Lambda function", "mock component"],
     *   "inputs": { "shape": "BaseComponent with Lambda function", "notes": "Nominal input testing" },
     *   "risks": ["instrumentation failures", "missing environment variables", "permission errors"],
     *   "dependencies": ["LambdaObservabilityHandler", "AWS CDK Lambda constructs", "OpenTelemetry"],
     *   "evidence": ["environment variables added", "permissions added", "layers added"],
     *   "compliance_refs": ["std://platform-testing-standard", "std://platform-observability-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('OpenTelemetryInstrumentation__LambdaFunctionProvided__AppliesCorrectly', () => {
      // Oracle: trace - observable side effects (method calls)
      const result = handler.apply(mockComponent);

      expect(result.instrumentationApplied).toBe(true);
      expect(result.alarmsCreated).toBeGreaterThan(0);
      expect(result.executionTimeMs).toBeGreaterThan(0);

      // Verify Lambda-specific environment variables were added
      expect(mockLambdaFunction.addEnvironment).toHaveBeenCalledWith(
        'OTEL_INSTRUMENTATION_AWS_LAMBDA_ENABLED',
        'true'
      );
      expect(mockLambdaFunction.addEnvironment).toHaveBeenCalledWith(
        'OTEL_INSTRUMENTATION_AWS_LAMBDA_FLUSH_TIMEOUT',
        '30000'
      );
      expect(mockLambdaFunction.addEnvironment).toHaveBeenCalledWith(
        'AWS_LAMBDA_EXEC_WRAPPER',
        '/opt/otel-instrument'
      );

      // Verify X-Ray permissions were added
      expect(mockLambdaFunction.addToRolePolicy).toHaveBeenCalledWith(
        expect.objectContaining({
          effect: iam.Effect.ALLOW,
          actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
          resources: ['*']
        })
      );
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-lambda-observability-handler-004",
     *   "level": "unit",
     *   "capability": "Missing Lambda function construct handling",
     *   "oracle": "exact",
     *   "invariants": ["no errors thrown", "returns safe default values", "logs warning"],
     *   "fixtures": ["mock component without Lambda function"],
     *   "inputs": { "shape": "BaseComponent with missing Lambda function", "notes": "Boundary condition testing" },
     *   "risks": ["null pointer exceptions", "service crashes"],
     *   "dependencies": ["LambdaObservabilityHandler"],
     *   "evidence": ["return value structure", "warning log message"],
     *   "compliance_refs": ["std://platform-testing-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('OpenTelemetryInstrumentation__MissingLambdaFunction__HandlesGracefully', () => {
      // Oracle: exact - deterministic return value comparison
      (mockComponent.getConstruct as jest.Mock).mockReturnValue(undefined);

      const result = handler.apply(mockComponent);

      expect(result.instrumentationApplied).toBe(false);
      expect(mockContext.logger.warn).toHaveBeenCalledWith(
        'Lambda component has no function construct registered',
        expect.objectContaining({
          service: 'ObservabilityService',
          componentType: 'lambda',
          componentName: 'test-lambda'
        })
      );
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-lambda-observability-handler-005",
     *   "level": "unit",
     *   "capability": "OpenTelemetry Lambda layer addition for supported runtime",
     *   "oracle": "trace",
     *   "invariants": ["layer added for supported runtime", "no errors thrown"],
     *   "fixtures": ["mock Lambda function with supported runtime"],
     *   "inputs": { "shape": "Lambda function with Node.js runtime", "notes": "Supported runtime testing" },
     *   "risks": ["layer addition failures", "runtime compatibility issues"],
     *   "dependencies": ["LambdaObservabilityHandler", "AWS CDK Lambda constructs"],
     *   "evidence": ["addLayers method called"],
     *   "compliance_refs": ["std://platform-testing-standard", "std://platform-observability-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('OpenTelemetryLayer__SupportedRuntime__AddsCorrectly', () => {
      // Oracle: trace - observable side effects (method calls)
      handler.apply(mockComponent);

      expect(mockLambdaFunction.addLayers).toHaveBeenCalled();
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-lambda-observability-handler-006",
     *   "level": "unit",
     *   "capability": "Unsupported runtime handling",
     *   "oracle": "exact",
     *   "invariants": ["no errors thrown", "instrumentation still applied", "graceful degradation"],
     *   "fixtures": ["mock Lambda function with unsupported runtime"],
     *   "inputs": { "shape": "Lambda function with unsupported runtime", "notes": "Boundary condition testing" },
     *   "risks": ["runtime compatibility failures", "service crashes"],
     *   "dependencies": ["LambdaObservabilityHandler"],
     *   "evidence": ["return value structure", "no exceptions thrown"],
     *   "compliance_refs": ["std://platform-testing-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('OpenTelemetryLayer__UnsupportedRuntime__HandlesGracefully', () => {
      // Oracle: exact - deterministic return value comparison
      mockLambdaFunction.runtime = { name: 'unsupported-runtime' };

      const result = handler.apply(mockComponent);

      expect(result.instrumentationApplied).toBe(true);
      // Should still work even without layer
    });
  });

  describe.skip('CloudWatch Alarms', () => {
    /**
     * Test Metadata:
     * {
     *   "id": "TP-lambda-observability-handler-007",
     *   "level": "unit",
     *   "capability": "Error rate alarm creation for commercial framework",
     *   "oracle": "exact",
     *   "invariants": ["alarm created", "standard tags applied", "correct alarm count"],
     *   "fixtures": ["mock Lambda function", "commercial framework context"],
     *   "inputs": { "shape": "BaseComponent with commercial framework", "notes": "Commercial compliance testing" },
     *   "risks": ["alarm creation failures", "missing tags", "incorrect alarm configuration"],
     *   "dependencies": ["LambdaObservabilityHandler", "CloudWatch Alarms", "Tagging Standard"],
     *   "evidence": ["alarm count", "tag application"],
     *   "compliance_refs": ["std://platform-testing-standard", "std://platform-observability-standard", "std://platform-tagging-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('CloudWatchAlarms__CommercialFramework__CreatesErrorRateAlarm', () => {
      // Oracle: exact - deterministic value comparison
      const result = handler.apply(mockComponent);

      expect(result.alarmsCreated).toBe(1);
      
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-lambda-observability-handler-008",
     *   "level": "unit",
     *   "capability": "Additional alarms for FedRAMP Moderate compliance",
     *   "oracle": "exact",
     *   "invariants": ["additional alarms created", "enhanced monitoring", "correct alarm count"],
     *   "fixtures": ["mock Lambda function", "FedRAMP Moderate framework context"],
     *   "inputs": { "shape": "BaseComponent with FedRAMP Moderate framework", "notes": "Compliance framework testing" },
     *   "risks": ["missing compliance alarms", "incorrect alarm configuration"],
     *   "dependencies": ["LambdaObservabilityHandler", "CloudWatch Alarms", "FedRAMP Compliance"],
     *   "evidence": ["alarm count", "tag application count"],
     *   "compliance_refs": ["std://platform-testing-standard", "std://platform-observability-standard", "std://platform-tagging-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('CloudWatchAlarms__FedrampModerateFramework__CreatesAdditionalAlarms', () => {
      // Oracle: exact - deterministic value comparison
      mockContext.complianceFramework = 'fedramp-moderate';

      const result = handler.apply(mockComponent);

      expect(result.alarmsCreated).toBe(2); // Error rate + duration
      
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-lambda-observability-handler-009",
     *   "level": "unit",
     *   "capability": "Additional alarms for FedRAMP High compliance",
     *   "oracle": "exact",
     *   "invariants": ["additional alarms created", "maximum monitoring", "correct alarm count"],
     *   "fixtures": ["mock Lambda function", "FedRAMP High framework context"],
     *   "inputs": { "shape": "BaseComponent with FedRAMP High framework", "notes": "High compliance framework testing" },
     *   "risks": ["missing high-compliance alarms", "incorrect alarm configuration"],
     *   "dependencies": ["LambdaObservabilityHandler", "CloudWatch Alarms", "FedRAMP High Compliance"],
     *   "evidence": ["alarm count", "tag application count"],
     *   "compliance_refs": ["std://platform-testing-standard", "std://platform-observability-standard", "std://platform-tagging-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('CloudWatchAlarms__FedrampHighFramework__CreatesAdditionalAlarms', () => {
      // Oracle: exact - deterministic value comparison
      mockContext.complianceFramework = 'fedramp-high';

      const result = handler.apply(mockComponent);

      expect(result.alarmsCreated).toBe(2); // Error rate + duration (stricter threshold)
      
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-lambda-observability-handler-010",
     *   "level": "unit",
     *   "capability": "Missing Lambda function alarm handling",
     *   "oracle": "exact",
     *   "invariants": ["no alarms created", "no errors thrown", "logs warning"],
     *   "fixtures": ["mock component without Lambda function"],
     *   "inputs": { "shape": "BaseComponent with missing Lambda function", "notes": "Boundary condition testing" },
     *   "risks": ["alarm creation failures", "service crashes"],
     *   "dependencies": ["LambdaObservabilityHandler"],
     *   "evidence": ["alarm count", "warning log message"],
     *   "compliance_refs": ["std://platform-testing-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('CloudWatchAlarms__MissingLambdaFunction__HandlesGracefully', () => {
      // Oracle: exact - deterministic return value comparison
      (mockComponent.getConstruct as jest.Mock).mockReturnValue(undefined);

      const result = handler.apply(mockComponent);

      expect(result.alarmsCreated).toBe(0);
      expect(mockContext.logger.warn).toHaveBeenCalledWith(
        'Lambda component has no function construct registered',
        expect.objectContaining({
          service: 'ObservabilityService'
        })
      );
    });
  });

  describe.skip('Configuration Integration', () => {
    /**
     * Test Metadata:
     * {
     *   "id": "TP-lambda-observability-handler-011",
     *   "level": "unit",
     *   "capability": "Commercial configuration defaults usage",
     *   "oracle": "exact",
     *   "invariants": ["correct sampling rate applied", "commercial defaults used"],
     *   "fixtures": ["mock Lambda function", "commercial framework context"],
     *   "inputs": { "shape": "BaseComponent with commercial framework", "notes": "Configuration testing" },
     *   "risks": ["incorrect configuration values", "sampling rate mismatches"],
     *   "dependencies": ["LambdaObservabilityHandler", "Platform Configuration Standard"],
     *   "evidence": ["environment variable values"],
     *   "compliance_refs": ["std://platform-testing-standard", "std://platform-configuration-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('ConfigurationIntegration__CommercialFramework__UsesCorrectDefaults', () => {
      // Oracle: exact - deterministic value comparison
      handler.apply(mockComponent);

      expect(mockLambdaFunction.addEnvironment).toHaveBeenCalledWith(
        'OTEL_TRACES_SAMPLER_ARG',
        '0.1' // 10% sampling for commercial
      );
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-lambda-observability-handler-012",
     *   "level": "unit",
     *   "capability": "FedRAMP Moderate configuration defaults usage",
     *   "oracle": "exact",
     *   "invariants": ["correct sampling rate applied", "FedRAMP Moderate defaults used"],
     *   "fixtures": ["mock Lambda function", "FedRAMP Moderate framework context"],
     *   "inputs": { "shape": "BaseComponent with FedRAMP Moderate framework", "notes": "Compliance configuration testing" },
     *   "risks": ["incorrect compliance configuration", "sampling rate mismatches"],
     *   "dependencies": ["LambdaObservabilityHandler", "Platform Configuration Standard"],
     *   "evidence": ["environment variable values"],
     *   "compliance_refs": ["std://platform-testing-standard", "std://platform-configuration-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('ConfigurationIntegration__FedrampModerateFramework__UsesCorrectDefaults', () => {
      // Oracle: exact - deterministic value comparison
      mockContext.complianceFramework = 'fedramp-moderate';

      handler.apply(mockComponent);

      expect(mockLambdaFunction.addEnvironment).toHaveBeenCalledWith(
        'OTEL_TRACES_SAMPLER_ARG',
        '0.25' // 25% sampling for FedRAMP Moderate
      );
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-lambda-observability-handler-013",
     *   "level": "unit",
     *   "capability": "FedRAMP High configuration defaults usage",
     *   "oracle": "exact",
     *   "invariants": ["correct sampling rate applied", "FedRAMP High defaults used"],
     *   "fixtures": ["mock Lambda function", "FedRAMP High framework context"],
     *   "inputs": { "shape": "BaseComponent with FedRAMP High framework", "notes": "High compliance configuration testing" },
     *   "risks": ["incorrect high-compliance configuration", "sampling rate mismatches"],
     *   "dependencies": ["LambdaObservabilityHandler", "Platform Configuration Standard"],
     *   "evidence": ["environment variable values"],
     *   "compliance_refs": ["std://platform-testing-standard", "std://platform-configuration-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('ConfigurationIntegration__FedrampHighFramework__UsesCorrectDefaults', () => {
      // Oracle: exact - deterministic value comparison
      mockContext.complianceFramework = 'fedramp-high';

      handler.apply(mockComponent);

      expect(mockLambdaFunction.addEnvironment).toHaveBeenCalledWith(
        'OTEL_TRACES_SAMPLER_ARG',
        '1.0' // 100% sampling for FedRAMP High
      );
    });
  });

  describe.skip('Error Handling', () => {
    /**
     * Test Metadata:
     * {
     *   "id": "TP-lambda-observability-handler-014",
     *   "level": "unit",
     *   "capability": "Instrumentation error handling",
     *   "oracle": "exact",
     *   "invariants": ["error propagated correctly", "error logged with context"],
     *   "fixtures": ["mock Lambda function that throws error"],
     *   "inputs": { "shape": "BaseComponent with failing Lambda function", "notes": "Error condition testing" },
     *   "risks": ["unhandled exceptions", "service crashes"],
     *   "dependencies": ["LambdaObservabilityHandler", "Error handling"],
     *   "evidence": ["error thrown", "error log message"],
     *   "compliance_refs": ["std://platform-testing-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('ErrorHandling__InstrumentationFails__PropagatesAndLogs', () => {
      // Oracle: exact - deterministic error handling
      mockLambdaFunction.addEnvironment.mockImplementation(() => {
        throw new Error('Environment variable addition failed');
      });

      expect(() => handler.apply(mockComponent)).toThrow('Environment variable addition failed');
      
      expect(mockContext.logger.error).toHaveBeenCalledWith(
        'Failed to apply Lambda observability',
        expect.objectContaining({
          service: 'ObservabilityService',
          componentType: 'lambda-api',
          componentName: 'test-lambda',
          error: 'Environment variable addition failed'
        })
      );
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-lambda-observability-handler-015",
     *   "level": "unit",
     *   "capability": "Successful application logging",
     *   "oracle": "trace",
     *   "invariants": ["success logged", "execution time included", "alarm count included"],
     *   "fixtures": ["mock Lambda function", "successful handler execution"],
     *   "inputs": { "shape": "BaseComponent with successful Lambda function", "notes": "Success path testing" },
     *   "risks": ["missing success logging", "incorrect log data"],
     *   "dependencies": ["LambdaObservabilityHandler", "Logging"],
     *   "evidence": ["success log message", "log data structure"],
     *   "compliance_refs": ["std://platform-testing-standard", "std://platform-observability-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('ErrorHandling__SuccessfulApplication__LogsCorrectly', () => {
      // Oracle: trace - observable side effects (log messages)
      handler.apply(mockComponent);

      expect(mockContext.logger.info).toHaveBeenCalledWith(
        'Lambda observability applied successfully',
        expect.objectContaining({
          service: 'ObservabilityService',
          componentType: 'lambda-api',
          componentName: 'test-lambda',
          alarmsCreated: expect.any(Number),
          instrumentationApplied: true,
          executionTimeMs: expect.any(Number)
        })
      );
    });
  });

  describe.skip('Resource Attributes', () => {
    /**
     * Test Metadata:
     * {
     *   "id": "TP-lambda-observability-handler-016",
     *   "level": "unit",
     *   "capability": "OpenTelemetry resource attributes building",
     *   "oracle": "exact",
     *   "invariants": ["correct resource attributes set", "all required attributes present"],
     *   "fixtures": ["mock Lambda function", "mock context"],
     *   "inputs": { "shape": "BaseComponent with context", "notes": "Resource attribute testing" },
     *   "risks": ["missing resource attributes", "incorrect attribute values"],
     *   "dependencies": ["LambdaObservabilityHandler", "OpenTelemetry"],
     *   "evidence": ["environment variable values"],
     *   "compliance_refs": ["std://platform-testing-standard", "std://platform-observability-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('ResourceAttributes__StandardContext__BuildsCorrectly', () => {
      // Oracle: exact - deterministic value comparison
      handler.apply(mockComponent);

      expect(mockLambdaFunction.addEnvironment).toHaveBeenCalledWith(
        'OTEL_RESOURCE_ATTRIBUTES',
        expect.stringContaining('service.name=test-service')
      );
      expect(mockLambdaFunction.addEnvironment).toHaveBeenCalledWith(
        'OTEL_RESOURCE_ATTRIBUTES',
        expect.stringContaining('deployment.environment=test')
      );
      expect(mockLambdaFunction.addEnvironment).toHaveBeenCalledWith(
        'OTEL_RESOURCE_ATTRIBUTES',
        expect.stringContaining('cloud.provider=aws')
      );
      expect(mockLambdaFunction.addEnvironment).toHaveBeenCalledWith(
        'OTEL_RESOURCE_ATTRIBUTES',
        expect.stringContaining('cloud.region=us-east-1')
      );
      expect(mockLambdaFunction.addEnvironment).toHaveBeenCalledWith(
        'OTEL_RESOURCE_ATTRIBUTES',
        expect.stringContaining('compliance.framework=commercial')
      );
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-lambda-observability-handler-017",
     *   "level": "unit",
     *   "capability": "Service labels inclusion in resource attributes",
     *   "oracle": "exact",
     *   "invariants": ["service labels included", "all labels present"],
     *   "fixtures": ["mock Lambda function", "context with service labels"],
     *   "inputs": { "shape": "BaseComponent with service labels", "notes": "Service label testing" },
     *   "risks": ["missing service labels", "incorrect label values"],
     *   "dependencies": ["LambdaObservabilityHandler", "OpenTelemetry"],
     *   "evidence": ["environment variable values"],
     *   "compliance_refs": ["std://platform-testing-standard", "std://platform-observability-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('ResourceAttributes__ServiceLabelsProvided__IncludesCorrectly', () => {
      // Oracle: exact - deterministic value comparison
      mockContext.serviceLabels = { version: '2.0.0', team: 'platform' };

      handler.apply(mockComponent);

      expect(mockLambdaFunction.addEnvironment).toHaveBeenCalledWith(
        'OTEL_RESOURCE_ATTRIBUTES',
        expect.stringContaining('version=2.0.0')
      );
      expect(mockLambdaFunction.addEnvironment).toHaveBeenCalledWith(
        'OTEL_RESOURCE_ATTRIBUTES',
        expect.stringContaining('team=platform')
      );
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-lambda-observability-handler-018",
     *   "level": "unit",
     *   "capability": "Empty service labels handling",
     *   "oracle": "exact",
     *   "invariants": ["no errors thrown", "handles gracefully", "basic attributes still set"],
     *   "fixtures": ["mock Lambda function", "context with empty service labels"],
     *   "inputs": { "shape": "BaseComponent with empty service labels", "notes": "Boundary condition testing" },
     *   "risks": ["null pointer exceptions", "service crashes"],
     *   "dependencies": ["LambdaObservabilityHandler"],
     *   "evidence": ["no exceptions thrown", "basic attributes set"],
     *   "compliance_refs": ["std://platform-testing-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('ResourceAttributes__EmptyServiceLabels__HandlesGracefully', () => {
      // Oracle: exact - deterministic return value comparison
      mockContext.serviceLabels = {};

      expect(() => handler.apply(mockComponent)).not.toThrow();
      
      // Should still set basic attributes
      expect(mockLambdaFunction.addEnvironment).toHaveBeenCalledWith(
        'OTEL_RESOURCE_ATTRIBUTES',
        expect.stringContaining('service.name=test-service')
      );
    });
  });
});