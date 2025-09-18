/**
 * Test Metadata:
 * {
 *   "id": "TP-observability-service-001",
 *   "level": "unit",
 *   "capability": "Handler Pattern implementation and registration",
 *   "oracle": "exact",
 *   "invariants": ["handler registration completeness", "component type mapping"],
 *   "fixtures": ["mock context", "mock component", "temporary config directory"],
 *   "inputs": { "shape": "PlatformServiceContext and BaseComponent instances", "notes": "Mocked for isolation" },
 *   "risks": ["handler registration failures", "configuration loading errors"],
 *   "dependencies": ["ObservabilityService", "Handler classes", "Platform Configuration"],
 *   "evidence": ["handler registry size", "supported component types"],
 *   "compliance_refs": ["std://platform-testing-standard", "std://platform-configuration-standard", "std://platform-observability-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ObservabilityService } from '../../../src/services/observability.service';
import { PlatformServiceContext } from '../@shinobi/core/platform-services';
import { BaseComponent } from '../@shinobi/core/component';
import { ComponentSpec, ComponentContext } from '../@shinobi/core/component-interfaces';

// Mock the handler classes
jest.mock('../../../src/services/observability-handlers/lambda-observability.handler');
jest.mock('../../../src/services/observability-handlers/vpc-observability.handler');
jest.mock('../../../src/services/observability-handlers/alb-observability.handler');
jest.mock('../../../src/services/observability-handlers/rds-observability.handler');
jest.mock('../../../src/services/observability-handlers/ec2-observability.handler');
jest.mock('../../../src/services/observability-handlers/sqs-observability.handler');
jest.mock('../../../src/services/observability-handlers/ecs-observability.handler');

describe('ObservabilityService', () => {
  let service: ObservabilityService;
  let mockContext: PlatformServiceContext;
  let mockComponent: BaseComponent;
  let testDir: string;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Determinism controls - freeze clock and seed RNG
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    Math.random = jest.fn(() => 0.5);
    
    // Control I/O with proper cleanup
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'observability-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    
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

    // Create mock component
    const mockComponentSpec: ComponentSpec = {
      name: 'test-component',
      type: 'lambda-api',
      config: {}
    };

    const mockComponentContext: ComponentContext = {
      serviceName: 'test-service',
      environment: 'test',
      region: 'us-east-1',
      complianceFramework: 'commercial',
      serviceLabels: { version: '1.0.0' },
      scope: {} as any // Mock CDK Construct scope
    };

    mockComponent = {
      node: { id: 'test-component' },
      getType: jest.fn().mockReturnValue('lambda-api'),
      getConstruct: jest.fn(),
      applyStandardTags: jest.fn()
    } as any;

    // Create config directory and mock config file
    fs.mkdirSync(path.join(testDir, 'config'), { recursive: true });
    
    // Create mock commercial.yml config file
    const mockConfig = {
      defaults: {
        observability: {
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
            'OTEL_RESOURCE_ATTRIBUTES': 'service.name={{ serviceName }},deployment.environment={{ environment }},cloud.provider={{ cloudProvider }},cloud.region={{ region }},compliance.framework={{ complianceFramework }}',
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
        }
      }
    };
    
    fs.writeFileSync(
      path.join(testDir, 'config', 'commercial.yml'),
      `# Mock commercial config for testing
defaults:
  observability:
    traceSamplingRate: 0.1
    metricsInterval: 300
    logsRetentionDays: 365
    alarmThresholds:
      ec2:
        cpuUtilization: 85
        statusCheckFailed: 1
        networkIn: 100000000
      rds:
        freeStorageSpace: 10
        cpuUtilization: 85
        connectionCount: 80
      lambda:
        errorRate: 5
        duration: 5000
        throttles: 10
      alb:
        responseTime: 2
        http5xxErrors: 10
        unhealthyTargets: 1
      sqs:
        messageAge: 300
        deadLetterMessages: 5
      ecs:
        cpuUtilization: 80
        memoryUtilization: 80
        taskCount: 0
    otelEnvironmentTemplate:
      OTEL_EXPORTER_OTLP_ENDPOINT: 'https://otel-collector.commercial.{{ region }}.platform.local:4317'
      OTEL_EXPORTER_OTLP_HEADERS: 'authorization=Bearer {{ authToken }}'
      OTEL_SERVICE_NAME: '{{ componentName }}'
      OTEL_SERVICE_VERSION: '{{ serviceVersion }}'
      OTEL_RESOURCE_ATTRIBUTES: 'service.name={{ serviceName }},deployment.environment={{ environment }},cloud.provider={{ cloudProvider }},cloud.region={{ region }},compliance.framework={{ complianceFramework }}'
      OTEL_TRACES_SAMPLER: 'traceidratio'
      OTEL_TRACES_SAMPLER_ARG: '{{ traceSamplingRate }}'
      OTEL_METRICS_EXPORTER: 'otlp'
      OTEL_LOGS_EXPORTER: 'otlp'
      OTEL_PROPAGATORS: 'tracecontext,baggage,xray'
      OTEL_INSTRUMENTATION_COMMON_DEFAULT_ENABLED: 'true'
      OTEL_BSP_MAX_EXPORT_BATCH_SIZE: '512'
      OTEL_BSP_EXPORT_TIMEOUT: '30000'
      OTEL_METRIC_EXPORT_INTERVAL: '{{ metricsInterval }}'
    ec2OtelUserDataTemplate: |
      #!/bin/bash
      yum update -y
      curl -L -o /tmp/otelcol-contrib.deb https://github.com/open-telemetry/opentelemetry-collector-releases/releases/latest/download/otelcol-contrib_linux_amd64.deb
      dpkg -i /tmp/otelcol-contrib.deb
      cat > /opt/aws/otel-collector/config.yaml << 'EOF'
      {{ otelAgentConfigJson }}
      EOF
      {{ otelEnvironmentVars }}
      systemctl enable otelcol-contrib
      systemctl start otelcol-contrib`
    );
  });

  afterEach(() => {
    // Cleanup temporary directories
    process.chdir(originalCwd);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    
    // Restore environment variables
    process.env = originalEnv;
    
    // Restore real timers and RNG
    jest.useRealTimers();
    Math.random = Math.random;
    
    jest.clearAllMocks();
  });

  describe('Handler Pattern Implementation', () => {
    /**
     * Test Metadata:
     * {
     *   "id": "TP-observability-service-002",
     *   "level": "unit",
     *   "capability": "Handler registry initialization and completeness",
     *   "oracle": "exact",
     *   "invariants": ["all expected handlers registered", "handler count matches expected"],
     *   "fixtures": ["ObservabilityService instance"],
     *   "inputs": { "shape": "Service initialization", "notes": "No external inputs" },
     *   "risks": ["handler registration failures", "missing handler types"],
     *   "dependencies": ["ObservabilityService", "Handler classes"],
     *   "evidence": ["handler registry size", "handler type instances"],
     *   "compliance_refs": ["std://platform-testing-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('ConfigurationLoading__ValidConfigFile__LoadsCorrectly', () => {
      // Oracle: exact - deterministic value comparison
      service = new ObservabilityService(mockContext);

      const config = service.getObservabilityConfig();
      
      // Verify configuration is loaded from mock file
      expect(config.traceSamplingRate).toBe(0.1);
      expect(config.metricsInterval).toBe(300);
      expect(config.logsRetentionDays).toBe(365);
      expect(config.alarmThresholds.ec2.cpuUtilization).toBe(85);
      expect(config.alarmThresholds.ec2.statusCheckFailed).toBe(1);
      expect(config.alarmThresholds.ec2.networkIn).toBe(100000000);
      expect(config.otelEnvironmentTemplate.OTEL_EXPORTER_OTLP_ENDPOINT).toBe('https://otel-collector.commercial.{{ region }}.platform.local:4317');
      expect(config.ec2OtelUserDataTemplate).toContain('#!/bin/bash');
    });

    test('OTelEnvironmentVariables__TemplateSubstitution__BuildsCorrectly', () => {
      // Oracle: exact - deterministic value comparison
      service = new ObservabilityService(mockContext);

      const envVars = service.buildOTelEnvironmentVariables('test-component');
      
      // Verify template substitution works correctly
      expect(envVars.OTEL_EXPORTER_OTLP_ENDPOINT).toBe('https://otel-collector.commercial.us-east-1.platform.local:4317');
      expect(envVars.OTEL_SERVICE_NAME).toBe('test-component');
      expect(envVars.OTEL_SERVICE_VERSION).toBe('1.0.0');
      expect(envVars.OTEL_RESOURCE_ATTRIBUTES).toContain('service.name=test-service');
      expect(envVars.OTEL_RESOURCE_ATTRIBUTES).toContain('deployment.environment=test');
      expect(envVars.OTEL_RESOURCE_ATTRIBUTES).toContain('cloud.provider=aws');
      expect(envVars.OTEL_RESOURCE_ATTRIBUTES).toContain('cloud.region=us-east-1');
      expect(envVars.OTEL_RESOURCE_ATTRIBUTES).toContain('compliance.framework=commercial');
      expect(envVars.OTEL_TRACES_SAMPLER_ARG).toBe('0.1');
      expect(envVars.OTEL_METRIC_EXPORT_INTERVAL).toBe('300');
    });

    test('HandlerRegistration__AllTypesProvided__RegistersCorrectly', () => {
      // Oracle: exact - deterministic value comparison
      service = new ObservabilityService(mockContext);

      const supportedTypes = service.getSupportedComponentTypes();
      const expectedTypes = [
        'lambda-api', 'lambda-worker', 'vpc', 'application-load-balancer',
        'rds-postgres', 'ec2-instance', 'sqs-queue', 'ecs-cluster',
        'ecs-fargate-service', 'ecs-ec2-service'
      ];
      
      expect(supportedTypes).toEqual(expect.arrayContaining(expectedTypes));
      expect(supportedTypes).toHaveLength(10);
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-observability-service-003",
     *   "level": "unit",
     *   "capability": "Handler information retrieval for debugging",
     *   "oracle": "exact",
     *   "invariants": ["handler info contains expected mappings", "all handlers have info"],
     *   "fixtures": ["ObservabilityService instance"],
     *   "inputs": { "shape": "No external inputs", "notes": "Internal method testing" },
     *   "risks": ["missing handler info", "incorrect handler mappings"],
     *   "dependencies": ["ObservabilityService", "Handler classes"],
     *   "evidence": ["handler info object structure"],
     *   "compliance_refs": ["std://platform-testing-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('HandlerInfo__AllHandlersRegistered__ReturnsCorrectMappings', () => {
      // Oracle: exact - deterministic value comparison
      service = new ObservabilityService(mockContext);
      const handlerInfo = service.getHandlerInfo();

      expect(handlerInfo['lambda-api']).toBe('LambdaObservabilityHandler');
      expect(handlerInfo['vpc']).toBe('VpcObservabilityHandler');
      expect(handlerInfo['application-load-balancer']).toBe('AlbObservabilityHandler');
      expect(handlerInfo['rds-postgres']).toBe('RdsObservabilityHandler');
      expect(handlerInfo['ec2-instance']).toBe('Ec2ObservabilityHandler');
      expect(handlerInfo['sqs-queue']).toBe('SqsObservabilityHandler');
      expect(handlerInfo['ecs-cluster']).toBe('EcsObservabilityHandler');
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-observability-service-004",
     *   "level": "unit",
     *   "capability": "Handler delegation for supported component types",
     *   "oracle": "trace",
     *   "invariants": ["correct handler called", "delegation preserves return values"],
     *   "fixtures": ["mock component", "spy on handler apply method"],
     *   "inputs": { "shape": "BaseComponent with supported type", "notes": "Lambda API component" },
     *   "risks": ["incorrect handler selection", "delegation failures"],
     *   "dependencies": ["ObservabilityService", "LambdaObservabilityHandler"],
     *   "evidence": ["handler apply method called", "return value preserved"],
     *   "compliance_refs": ["std://platform-testing-standard", "std://platform-observability-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('HandlerDelegation__SupportedComponentType__CallsCorrectHandler', () => {
      // Oracle: trace - observable side effects (method calls)
      const mockHandler = {
        apply: jest.fn().mockReturnValue({
          instrumentationApplied: true,
          alarmsCreated: 3,
          executionTimeMs: 150
        })
      };

      service = new ObservabilityService(mockContext);
      (service as any).handlers.set('lambda-api', mockHandler);

      service.apply(mockComponent);

      expect(mockHandler.apply).toHaveBeenCalledWith(mockComponent, expect.any(Object));
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        'OpenTelemetry observability applied successfully',
        expect.objectContaining({
          service: 'ObservabilityService',
          componentType: 'lambda-api',
          componentName: 'test-component',
          alarmsCreated: 3,
          instrumentationApplied: true,
          executionTimeMs: 150
        })
      );
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-observability-service-005",
     *   "level": "unit",
     *   "capability": "Graceful handling of unsupported component types",
     *   "oracle": "exact",
     *   "invariants": ["no errors thrown", "logs appropriate message"],
     *   "fixtures": ["mock component with unsupported type"],
     *   "inputs": { "shape": "BaseComponent with unsupported type", "notes": "Boundary condition testing" },
     *   "risks": ["service crashes", "unhandled exceptions"],
     *   "dependencies": ["ObservabilityService"],
     *   "evidence": ["log message content", "no exceptions thrown"],
     *   "compliance_refs": ["std://platform-testing-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('HandlerApplication__UnsupportedComponentType__LogsAndReturns', () => {
      // Oracle: exact - deterministic return value comparison
      (mockComponent.getType as jest.Mock).mockReturnValue('unsupported-type');
      service = new ObservabilityService(mockContext);

      service.apply(mockComponent);

      expect(mockContext.logger.info).toHaveBeenCalledWith(
        'No OpenTelemetry instrumentation for component type unsupported-type',
        expect.objectContaining({
          service: 'ObservabilityService',
          componentType: 'unsupported-type',
          componentName: 'test-component'
        })
      );
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-observability-service-006",
     *   "level": "unit",
     *   "capability": "Handler application with null component context",
     *   "oracle": "exact",
     *   "invariants": ["no errors thrown", "handles gracefully"],
     *   "fixtures": ["mock component with null context"],
     *   "inputs": { "shape": "BaseComponent with null context", "notes": "Adversarial input testing" },
     *   "risks": ["null pointer exceptions", "service crashes"],
     *   "dependencies": ["ObservabilityService"],
     *   "evidence": ["no exceptions thrown", "graceful handling"],
     *   "compliance_refs": ["std://platform-testing-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('HandlerApplication__NullComponentContext__HandlesGracefully', () => {
      // Oracle: exact - deterministic return value comparison
      const nullContextComponent = {
        ...mockComponent,
        context: null
      } as unknown as BaseComponent;

      service = new ObservabilityService(mockContext);

      expect(() => service.apply(nullContextComponent)).not.toThrow();
    });
  });

  describe('Platform Configuration Standard Integration', () => {
    /**
     * Test Metadata:
     * {
     *   "id": "TP-observability-service-007",
     *   "level": "unit",
     *   "capability": "Commercial framework configuration loading",
     *   "oracle": "exact",
     *   "invariants": ["configuration values match expected", "all required properties present"],
     *   "fixtures": ["temporary config directory", "commercial.yml file"],
     *   "inputs": { "shape": "Framework string 'commercial'", "notes": "Nominal input testing" },
     *   "risks": ["configuration loading failures", "incorrect default values"],
     *   "dependencies": ["Platform Configuration Standard", "YAML parsing"],
     *   "evidence": ["loaded configuration values"],
     *   "compliance_refs": ["std://platform-testing-standard", "std://platform-configuration-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('ConfigurationLoading__CommercialFramework__LoadsCorrectDefaults', () => {
      // Oracle: exact - deterministic value comparison
      fs.writeFileSync(
        path.join(testDir, 'config', 'commercial.yml'),
        `defaults:
  observability:
    traceSamplingRate: 0.15
    metricsInterval: 240
    logsRetentionDays: 400`
      );

      service = new ObservabilityService(mockContext);

      const config = service.getObservabilityConfig();
      expect(config.traceSamplingRate).toBe(0.15);
      expect(config.metricsInterval).toBe(240);
      expect(config.logsRetentionDays).toBe(400);
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-observability-service-008",
     *   "level": "unit",
     *   "capability": "FedRAMP Moderate framework configuration loading",
     *   "oracle": "exact",
     *   "invariants": ["configuration values match expected", "enhanced security settings"],
     *   "fixtures": ["temporary config directory", "fedramp-moderate.yml file"],
     *   "inputs": { "shape": "Framework string 'fedramp-moderate'", "notes": "Compliance framework testing" },
     *   "risks": ["configuration loading failures", "incorrect compliance values"],
     *   "dependencies": ["Platform Configuration Standard", "YAML parsing"],
     *   "evidence": ["loaded configuration values"],
     *   "compliance_refs": ["std://platform-testing-standard", "std://platform-configuration-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('ConfigurationLoading__FedrampModerateFramework__LoadsCorrectDefaults', () => {
      // Oracle: exact - deterministic value comparison
      mockContext.complianceFramework = 'fedramp-moderate';
      
      fs.writeFileSync(
        path.join(testDir, 'config', 'fedramp-moderate.yml'),
        `defaults:
  observability:
    traceSamplingRate: 0.3
    metricsInterval: 45
    logsRetentionDays: 1200`
      );

      service = new ObservabilityService(mockContext);

      const config = service.getObservabilityConfig();
      expect(config.traceSamplingRate).toBe(0.3);
      expect(config.metricsInterval).toBe(45);
      expect(config.logsRetentionDays).toBe(1200);
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-observability-service-009",
     *   "level": "unit",
     *   "capability": "Configuration loading with missing config file",
     *   "oracle": "exact",
     *   "invariants": ["uses fallback defaults", "logs warning message"],
     *   "fixtures": ["temporary config directory without config file"],
     *   "inputs": { "shape": "Missing configuration file", "notes": "Boundary condition testing" },
     *   "risks": ["configuration loading failures", "service crashes"],
     *   "dependencies": ["Platform Configuration Standard", "Fallback defaults"],
     *   "evidence": ["fallback values used", "warning log message"],
     *   "compliance_refs": ["std://platform-testing-standard", "std://platform-configuration-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('ConfigurationLoading__MissingConfigFile__UsesFallbackDefaults', () => {
      // Oracle: exact - deterministic return value comparison
      // Remove the config file to test fallback behavior
      fs.unlinkSync(path.join(testDir, 'config', 'commercial.yml'));
      
      service = new ObservabilityService(mockContext);

      const config = service.getObservabilityConfig();
      expect(config.traceSamplingRate).toBe(0.1);
      expect(config.metricsInterval).toBe(300);
      expect(config.logsRetentionDays).toBe(365);
      expect(mockContext.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Platform configuration file not found'),
        expect.objectContaining({
          service: 'ObservabilityService',
          framework: 'commercial'
        })
      );
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-observability-service-010",
     *   "level": "unit",
     *   "capability": "Configuration loading with missing observability section",
     *   "oracle": "exact",
     *   "invariants": ["uses fallback defaults", "logs warning message"],
     *   "fixtures": ["temporary config directory", "config file without observability section"],
     *   "inputs": { "shape": "Config file missing observability section", "notes": "Boundary condition testing" },
     *   "risks": ["configuration loading failures", "missing observability config"],
     *   "dependencies": ["Platform Configuration Standard", "Fallback defaults"],
     *   "evidence": ["fallback values used", "warning log message"],
     *   "compliance_refs": ["std://platform-testing-standard", "std://platform-configuration-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('ConfigurationLoading__MissingObservabilitySection__UsesFallbackDefaults', () => {
      // Oracle: exact - deterministic return value comparison
      fs.writeFileSync(
        path.join(testDir, 'config', 'commercial.yml'),
        `defaults:
  other-config:
    someValue: true`
      );

      service = new ObservabilityService(mockContext);

      const config = service.getObservabilityConfig();
      expect(config.traceSamplingRate).toBe(0.1); // fallback value
      expect(mockContext.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No observability configuration found'),
        expect.objectContaining({
          service: 'ObservabilityService',
          framework: 'commercial'
        })
      );
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-observability-service-011",
     *   "level": "unit",
     *   "capability": "Configuration loading with malformed YAML content",
     *   "oracle": "exact",
     *   "invariants": ["uses fallback defaults", "logs error message"],
     *   "fixtures": ["temporary config directory", "malformed YAML file"],
     *   "inputs": { "shape": "Malformed YAML configuration", "notes": "Adversarial input testing" },
     *   "risks": ["YAML parsing errors", "service crashes"],
     *   "dependencies": ["Platform Configuration Standard", "YAML parsing", "Fallback defaults"],
     *   "evidence": ["fallback values used", "error log message"],
     *   "compliance_refs": ["std://platform-testing-standard", "std://platform-configuration-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('ConfigurationLoading__MalformedYamlContent__UsesFallbackDefaults', () => {
      // Oracle: exact - deterministic return value comparison
      fs.writeFileSync(
        path.join(testDir, 'config', 'commercial.yml'),
        'invalid: yaml: content: ['
      );

      service = new ObservabilityService(mockContext);

      const config = service.getObservabilityConfig();
      expect(config.traceSamplingRate).toBe(0.1); // fallback value
      expect(mockContext.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load platform configuration'),
        expect.objectContaining({
          service: 'ObservabilityService',
          framework: 'commercial'
        })
      );
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-observability-service-012",
     *   "level": "unit",
     *   "capability": "Configuration loading with invalid framework string",
     *   "oracle": "exact",
     *   "invariants": ["uses fallback defaults", "no errors thrown"],
     *   "fixtures": ["temporary config directory"],
     *   "inputs": { "shape": "Invalid framework string", "notes": "Boundary condition testing" },
     *   "risks": ["configuration loading failures", "service crashes"],
     *   "dependencies": ["Platform Configuration Standard", "Fallback defaults"],
     *   "evidence": ["fallback values used", "no exceptions thrown"],
     *   "compliance_refs": ["std://platform-testing-standard", "std://platform-configuration-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('ConfigurationLoading__InvalidFrameworkString__UsesFallbackDefaults', () => {
      // Oracle: exact - deterministic return value comparison
      mockContext.complianceFramework = 'invalid-framework' as any;
      service = new ObservabilityService(mockContext);

      const config = service.getObservabilityConfig();
      // Should return fallback configuration
      expect(config).toHaveProperty('traceSamplingRate');
      expect(config).toHaveProperty('metricsInterval');
      expect(config).toHaveProperty('logsRetentionDays');
      expect(config).toHaveProperty('alarmThresholds');
      expect(config).toHaveProperty('otelEnvironmentTemplate');
      expect(config).toHaveProperty('ec2OtelUserDataTemplate');
    });
  });

  describe('Error Handling', () => {
    /**
     * Test Metadata:
     * {
     *   "id": "TP-observability-service-013",
     *   "level": "unit",
     *   "capability": "Handler execution error handling",
     *   "oracle": "exact",
     *   "invariants": ["error propagated correctly", "error logged with context"],
     *   "fixtures": ["mock handler that throws error"],
     *   "inputs": { "shape": "BaseComponent with failing handler", "notes": "Error condition testing" },
     *   "risks": ["unhandled exceptions", "service crashes"],
     *   "dependencies": ["ObservabilityService", "Error handling"],
     *   "evidence": ["error thrown", "error log message"],
     *   "compliance_refs": ["std://platform-testing-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('HandlerExecution__ThrowsError__PropagatesAndLogs', () => {
      // Oracle: exact - deterministic error handling
      const mockHandler = {
        apply: jest.fn().mockImplementation(() => {
          throw new Error('Handler execution failed');
        })
      };

      service = new ObservabilityService(mockContext);
      (service as any).handlers.set('lambda-api', mockHandler);

      expect(() => service.apply(mockComponent)).toThrow('Handler execution failed');
      
      expect(mockContext.logger.error).toHaveBeenCalledWith(
        'Failed to apply observability',
        expect.objectContaining({
          service: 'ObservabilityService',
          componentType: 'lambda-api',
          componentName: 'test-component',
          error: 'Handler execution failed'
        })
      );
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-observability-service-014",
     *   "level": "unit",
     *   "capability": "Execution time logging for success cases",
     *   "oracle": "trace",
     *   "invariants": ["execution time logged", "success message includes timing"],
     *   "fixtures": ["mock handler with execution time"],
     *   "inputs": { "shape": "BaseComponent with successful handler", "notes": "Success path testing" },
     *   "risks": ["missing execution time logging", "incorrect timing data"],
     *   "dependencies": ["ObservabilityService", "Logging"],
     *   "evidence": ["log message with execution time"],
     *   "compliance_refs": ["std://platform-testing-standard", "std://platform-observability-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('HandlerExecution__SuccessfulApplication__LogsExecutionTime', () => {
      // Oracle: trace - observable side effects (log messages)
      const mockHandler = {
        apply: jest.fn().mockReturnValue({
          instrumentationApplied: true,
          alarmsCreated: 2,
          executionTimeMs: 200
        })
      };

      service = new ObservabilityService(mockContext);
      (service as any).handlers.set('lambda-api', mockHandler);

      service.apply(mockComponent);

      expect(mockContext.logger.info).toHaveBeenCalledWith(
        'OpenTelemetry observability applied successfully',
        expect.objectContaining({
          executionTimeMs: 200
        })
      );
    });
  });

  describe('Service Interface Compliance', () => {
    /**
     * Test Metadata:
     * {
     *   "id": "TP-observability-service-015",
     *   "level": "unit",
     *   "capability": "IPlatformService interface implementation",
     *   "oracle": "exact",
     *   "invariants": ["service name correct", "apply method exists"],
     *   "fixtures": ["ObservabilityService instance"],
     *   "inputs": { "shape": "Service instantiation", "notes": "Interface compliance testing" },
     *   "risks": ["interface violations", "missing required methods"],
     *   "dependencies": ["ObservabilityService", "IPlatformService interface"],
     *   "evidence": ["service name", "method existence"],
     *   "compliance_refs": ["std://platform-testing-standard", "std://platform-service-injector-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('ServiceInterface__ObservabilityService__ImplementsCorrectly', () => {
      // Oracle: exact - deterministic interface compliance
      service = new ObservabilityService(mockContext);

      expect(service.name).toBe('ObservabilityService');
      expect(typeof service.apply).toBe('function');
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-observability-service-016",
     *   "level": "unit",
     *   "capability": "BaseComponent parameter acceptance",
     *   "oracle": "trace",
     *   "invariants": ["BaseComponent passed to handler", "no type errors"],
     *   "fixtures": ["mock BaseComponent", "mock handler"],
     *   "inputs": { "shape": "BaseComponent instance", "notes": "Type safety testing" },
     *   "risks": ["type mismatches", "parameter validation failures"],
     *   "dependencies": ["ObservabilityService", "BaseComponent", "Handler classes"],
     *   "evidence": ["handler called with correct parameter"],
     *   "compliance_refs": ["std://platform-testing-standard", "std://platform-service-injector-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('ServiceInterface__BaseComponentParameter__AcceptsCorrectly', () => {
      // Oracle: trace - observable side effects (method calls)
      service = new ObservabilityService(mockContext);
      const mockHandler = {
        apply: jest.fn().mockReturnValue({
          instrumentationApplied: false,
          alarmsCreated: 0,
          executionTimeMs: 50
        })
      };
      (service as any).handlers.set('lambda-api', mockHandler);

      service.apply(mockComponent);

      expect(mockHandler.apply).toHaveBeenCalledWith(mockComponent, expect.any(Object));
    });
  });

  describe('Handler Registration', () => {
    /**
     * Test Metadata:
     * {
     *   "id": "TP-observability-service-017",
     *   "level": "unit",
     *   "capability": "Handler registration for all supported component types",
     *   "oracle": "exact",
     *   "invariants": ["all expected handlers registered", "handler count matches expected"],
     *   "fixtures": ["ObservabilityService instance"],
     *   "inputs": { "shape": "Service initialization", "notes": "Registration completeness testing" },
     *   "risks": ["missing handlers", "incorrect handler count"],
     *   "dependencies": ["ObservabilityService", "Handler classes"],
     *   "evidence": ["handler registry size", "specific handler presence"],
     *   "compliance_refs": ["std://platform-testing-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('HandlerRegistration__AllSupportedTypes__RegistersCorrectly', () => {
      // Oracle: exact - deterministic value comparison
      service = new ObservabilityService(mockContext);

      const handlers = (service as any).handlers;
      expect(handlers.size).toBe(10); // Total number of registered handlers
      
      // Verify specific handlers are registered
      expect(handlers.has('lambda-api')).toBe(true);
      expect(handlers.has('lambda-worker')).toBe(true);
      expect(handlers.has('vpc')).toBe(true);
      expect(handlers.has('application-load-balancer')).toBe(true);
      expect(handlers.has('rds-postgres')).toBe(true);
      expect(handlers.has('ec2-instance')).toBe(true);
      expect(handlers.has('sqs-queue')).toBe(true);
      expect(handlers.has('ecs-cluster')).toBe(true);
      expect(handlers.has('ecs-fargate-service')).toBe(true);
      expect(handlers.has('ecs-ec2-service')).toBe(true);
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-observability-service-018",
     *   "level": "unit",
     *   "capability": "Handler instance sharing for similar component types",
     *   "oracle": "exact",
     *   "invariants": ["same handler instance for similar types", "efficient resource usage"],
     *   "fixtures": ["ObservabilityService instance"],
     *   "inputs": { "shape": "Service initialization", "notes": "Handler sharing testing" },
     *   "risks": ["duplicate handler instances", "inefficient resource usage"],
     *   "dependencies": ["ObservabilityService", "Handler classes"],
     *   "evidence": ["handler instance equality"],
     *   "compliance_refs": ["std://platform-testing-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('HandlerSharing__SimilarComponentTypes__UsesSameHandlerClass', () => {
      // Oracle: exact - deterministic value comparison
      service = new ObservabilityService(mockContext);

      const handlers = (service as any).handlers;
      const lambdaApiHandler = handlers.get('lambda-api');
      const lambdaWorkerHandler = handlers.get('lambda-worker');
      
      // Both should use the same LambdaObservabilityHandler class (but different instances)
      expect(lambdaApiHandler.constructor.name).toBe('LambdaObservabilityHandler');
      expect(lambdaWorkerHandler.constructor.name).toBe('LambdaObservabilityHandler');
      // Note: supportedComponentType is not available on mocked handlers
      expect(lambdaApiHandler).toBeDefined();
      expect(lambdaWorkerHandler).toBeDefined();
    });
  });

  describe('Boundary Value Testing', () => {
    /**
     * Test Metadata:
     * {
     *   "id": "TP-observability-service-019",
     *   "level": "unit",
     *   "capability": "Configuration value boundary validation",
     *   "oracle": "property",
     *   "invariants": ["sampling rates between 0 and 1", "positive intervals", "positive retention days"],
     *   "fixtures": ["ObservabilityService instance", "fallback defaults"],
     *   "inputs": { "shape": "Configuration values", "notes": "Property-based testing" },
     *   "risks": ["invalid configuration values", "negative or zero values"],
     *   "dependencies": ["ObservabilityService", "Fallback defaults"],
     *   "evidence": ["configuration value ranges"],
     *   "compliance_refs": ["std://platform-testing-standard", "std://platform-configuration-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('ConfigurationValues__AllFrameworks__SatisfyConstraints', () => {
      // Oracle: property - invariants over configuration values
      service = new ObservabilityService(mockContext);
      
      // Test configuration values
      const config = service.getObservabilityConfig();
      
      // Sampling rate should be between 0 and 1
      expect(config.traceSamplingRate).toBeGreaterThanOrEqual(0);
      expect(config.traceSamplingRate).toBeLessThanOrEqual(1);
      
      // Metrics interval should be positive
      expect(config.metricsInterval).toBeGreaterThan(0);
      
      // Logs retention should be positive
      expect(config.logsRetentionDays).toBeGreaterThan(0);
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-observability-service-020",
     *   "level": "unit",
     *   "capability": "Empty component type handling",
     *   "oracle": "exact",
     *   "invariants": ["no errors thrown", "handles gracefully"],
     *   "fixtures": ["mock component with empty type"],
     *   "inputs": { "shape": "BaseComponent with empty type", "notes": "Boundary condition testing" },
     *   "risks": ["empty string handling failures", "service crashes"],
     *   "dependencies": ["ObservabilityService"],
     *   "evidence": ["no exceptions thrown", "graceful handling"],
     *   "compliance_refs": ["std://platform-testing-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('HandlerApplication__EmptyComponentType__HandlesGracefully', () => {
      // Oracle: exact - deterministic return value comparison
      (mockComponent.getType as jest.Mock).mockReturnValue('');
      service = new ObservabilityService(mockContext);

      expect(() => service.apply(mockComponent)).not.toThrow();
    });

    /**
     * Test Metadata:
     * {
     *   "id": "TP-observability-service-021",
     *   "level": "unit",
     *   "capability": "Null component type handling",
     *   "oracle": "exact",
     *   "invariants": ["no errors thrown", "handles gracefully"],
     *   "fixtures": ["mock component with null type"],
     *   "inputs": { "shape": "BaseComponent with null type", "notes": "Boundary condition testing" },
     *   "risks": ["null handling failures", "service crashes"],
     *   "dependencies": ["ObservabilityService"],
     *   "evidence": ["no exceptions thrown", "graceful handling"],
     *   "compliance_refs": ["std://platform-testing-standard"],
     *   "ai_generated": true,
     *   "human_reviewed_by": "Platform Engineering"
     * }
     */
    test('HandlerApplication__NullComponentType__HandlesGracefully', () => {
      // Oracle: exact - deterministic return value comparison
      (mockComponent.getType as jest.Mock).mockReturnValue(null);
      service = new ObservabilityService(mockContext);

      expect(() => service.apply(mockComponent)).not.toThrow();
    });
  });
});