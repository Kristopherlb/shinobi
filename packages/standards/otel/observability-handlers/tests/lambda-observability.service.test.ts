/**
 * Lambda Observability Service Tests
 * 
 * Tests the LambdaObservabilityService for unified observability management
 * combining base OTEL + Powertools capabilities.
 */

import { App, Stack } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LambdaObservabilityService, LambdaObservabilityServiceConfig } from '../src/services/lambda-observability.service';
import { ObservabilityConfig } from '../src/observability-handlers/observability-handler.interface';
import { PlatformServiceContext } from '@shinobi/core/platform-services';

// Mock BaseComponent for testing
class MockLambdaComponent {
  constructor(public node: { id: string }) {}

  getType(): string {
    return 'lambda-worker';
  }

  getConstruct(name: string): any {
    if (name === 'function') {
      return new lambda.Function({} as any, 'MockFunction', {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {};'),
        functionName: 'mock-lambda-function'
      });
    }
    return undefined;
  }
}

describe('Lambda Observability Service Tests', () => {
  let app: App;
  let stack: Stack;
  let component: MockLambdaComponent;
  let context: PlatformServiceContext;
  let config: LambdaObservabilityServiceConfig;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestObservabilityServiceStack');
    component = new MockLambdaComponent({ id: 'mock-lambda-component' });

    context = {
      serviceName: 'test-service',
      environment: 'test',
      complianceFramework: 'commercial',
      region: 'us-east-1',
      serviceLabels: {
        version: '1.0.0'
      },
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      } as any,
      taggingService: {
        applyStandardTags: jest.fn()
      } as any
    };

    config = {
      observabilityConfig: {
        otelEnvironmentTemplate: {
          'OTEL_SERVICE_NAME': '{{ serviceName }}',
          'OTEL_RESOURCE_ATTRIBUTES': 'service.name={{ serviceName }},service.version={{ serviceVersion }}',
          'OTEL_EXPORTER_OTLP_ENDPOINT': 'http://adot-collector:4317',
          'OTEL_EXPORTER_OTLP_HEADERS': 'x-api-key={{ authToken }}',
          'OTEL_TRACES_EXPORTER': 'otlp',
          'OTEL_METRICS_EXPORTER': 'otlp',
          'OTEL_LOGS_EXPORTER': 'otlp'
        },
        alarmThresholds: {
          lambda: {
            errorRate: 0.05,
            duration: 5000
          }
        },
        traceSamplingRate: 1.0,
        metricsInterval: 60
      },
      powertoolsConfig: {
        serviceName: 'test-service',
        metricsNamespace: 'Shinobi/Test',
        businessMetrics: true,
        parameterStore: true,
        auditLogging: true,
        logLevel: 'INFO',
        logEvent: false
      },
      enableFullIntegration: true,
      serviceName: 'test-service',
      complianceFramework: 'commercial'
    };
  });

  describe('Constructor and Configuration', () => {
    test('should create service with configuration', () => {
      const service = new LambdaObservabilityService(context, config);

      expect(service).toBeDefined();
      expect(service.getConfig()).toEqual(config);
    });

    test('should get current configuration', () => {
      const service = new LambdaObservabilityService(context, config);
      const currentConfig = service.getConfig();

      expect(currentConfig).toEqual(config);
    });

    test('should update configuration', () => {
      const service = new LambdaObservabilityService(context, config);
      const newConfig = {
        enableFullIntegration: false,
        powertoolsConfig: {
          businessMetrics: false
        }
      };

      service.updateConfig(newConfig);

      const updatedConfig = service.getConfig();
      expect(updatedConfig.enableFullIntegration).toBe(false);
      expect(updatedConfig.powertoolsConfig.businessMetrics).toBe(false);
    });

    test('should get Powertools configuration', () => {
      const service = new LambdaObservabilityService(context, config);
      const powertoolsConfig = service.getPowertoolsConfig();

      expect(powertoolsConfig).toEqual(config.powertoolsConfig);
    });

    test('should update Powertools configuration', () => {
      const service = new LambdaObservabilityService(context, config);
      const newPowertoolsConfig = {
        logLevel: 'DEBUG' as const,
        auditLogging: false
      };

      service.updatePowertoolsConfig(newPowertoolsConfig);

      const updatedPowertoolsConfig = service.getPowertoolsConfig();
      expect(updatedPowertoolsConfig.logLevel).toBe('DEBUG');
      expect(updatedPowertoolsConfig.auditLogging).toBe(false);
    });
  });

  describe('Observability Application', () => {
    test('should apply complete observability successfully', async () => {
      const service = new LambdaObservabilityService(context, config);
      
      const result = await service.applyObservability(component);

      expect(result.success).toBe(true);
      expect(result.baseInstrumentation.instrumentationApplied).toBe(true);
      expect(result.powertoolsEnhancements.instrumentationApplied).toBe(true);
      expect(result.totalExecutionTimeMs).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
    });

    test('should apply only base observability when full integration disabled', async () => {
      const serviceConfig = { ...config, enableFullIntegration: false };
      const service = new LambdaObservabilityService(context, serviceConfig);
      
      const result = await service.applyObservability(component);

      expect(result.success).toBe(true);
      expect(result.baseInstrumentation.instrumentationApplied).toBe(true);
      expect(result.powertoolsEnhancements.instrumentationApplied).toBe(false);
    });

    test('should handle errors gracefully', async () => {
      const service = new LambdaObservabilityService(context, config);
      
      // Create a component that will cause an error
      const errorComponent = {
        getType: () => 'lambda-worker',
        node: { id: 'error-component' },
        getConstruct: () => {
          throw new Error('Test error');
        }
      } as any;

      const result = await service.applyObservability(errorComponent);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Test error');
      expect(result.baseInstrumentation.instrumentationApplied).toBe(false);
      expect(result.powertoolsEnhancements.instrumentationApplied).toBe(false);
    });

    test('should log observability application', async () => {
      const service = new LambdaObservabilityService(context, config);
      
      await service.applyObservability(component);

      expect(context.logger.info).toHaveBeenCalledWith(
        'Applying Lambda observability',
        expect.objectContaining({
          service: 'LambdaObservabilityService',
          componentType: 'lambda-worker',
          componentName: 'mock-lambda-component',
          enableFullIntegration: true
        })
      );

      expect(context.logger.info).toHaveBeenCalledWith(
        'Lambda observability applied successfully',
        expect.objectContaining({
          service: 'LambdaObservabilityService',
          componentType: 'lambda-worker',
          componentName: 'mock-lambda-component'
        })
      );
    });

    test('should log errors during application', async () => {
      const service = new LambdaObservabilityService(context, config);
      
      const errorComponent = {
        getType: () => 'lambda-worker',
        node: { id: 'error-component' },
        getConstruct: () => {
          throw new Error('Test error');
        }
      } as any;

      await service.applyObservability(errorComponent);

      expect(context.logger.error).toHaveBeenCalledWith(
        'Failed to apply Lambda observability',
        expect.objectContaining({
          service: 'LambdaObservabilityService',
          componentType: 'lambda-worker',
          componentName: 'error-component',
          error: 'Test error'
        })
      );
    });
  });

  describe('Base Observability Only', () => {
    test('should apply only base observability', () => {
      const service = new LambdaObservabilityService(context, config);
      
      const result = service.applyBaseObservability(component);

      expect(result.instrumentationApplied).toBe(true);
      expect(result.alarmsCreated).toBeGreaterThan(0);
      expect(result.executionTimeMs).toBeGreaterThan(0);
    });
  });

  describe('Powertools Only', () => {
    test('should apply only Powertools enhancements', () => {
      const service = new LambdaObservabilityService(context, config);
      
      const result = service.applyPowertoolsOnly(component);

      expect(result.instrumentationApplied).toBe(true);
      expect(result.alarmsCreated).toBe(0);
      expect(result.executionTimeMs).toBeGreaterThan(0);
    });
  });

  describe('Factory Methods', () => {
    test('should create service using factory method', () => {
      const service = LambdaObservabilityService.create(
        context,
        'test-service',
        'commercial',
        {
          businessMetrics: true,
          auditLogging: true
        }
      );

      expect(service).toBeDefined();
      expect(service.getConfig().serviceName).toBe('test-service');
      expect(service.getConfig().complianceFramework).toBe('commercial');
      expect(service.getPowertoolsConfig().businessMetrics).toBe(true);
      expect(service.getPowertoolsConfig().auditLogging).toBe(true);
    });

    test('should create audit service using factory method', () => {
      const service = LambdaObservabilityService.createAuditService(
        context,
        'audit-service',
        'fedramp-moderate'
      );

      expect(service).toBeDefined();
      expect(service.getConfig().serviceName).toBe('audit-service');
      expect(service.getConfig().complianceFramework).toBe('fedramp-moderate');
      expect(service.getPowertoolsConfig().auditLogging).toBe(true);
      expect(service.getPowertoolsConfig().logEvent).toBe(true);
      expect(service.getPowertoolsConfig().metricsNamespace).toBe('Shinobi/Audit/audit-service');
    });

    test('should create worker service using factory method', () => {
      const service = LambdaObservabilityService.createWorkerService(
        context,
        'worker-service',
        'commercial'
      );

      expect(service).toBeDefined();
      expect(service.getConfig().serviceName).toBe('worker-service');
      expect(service.getConfig().complianceFramework).toBe('commercial');
      expect(service.getPowertoolsConfig().auditLogging).toBe(false);
      expect(service.getPowertoolsConfig().logLevel).toBe('WARN');
      expect(service.getPowertoolsConfig().logEvent).toBe(false);
      expect(service.getPowertoolsConfig().metricsNamespace).toBe('Shinobi/Worker/worker-service');
    });
  });

  describe('Configuration Management', () => {
    test('should handle partial configuration updates', () => {
      const service = new LambdaObservabilityService(context, config);
      
      service.updateConfig({
        enableFullIntegration: false,
        powertoolsConfig: {
          businessMetrics: false
        }
      });

      const updatedConfig = service.getConfig();
      expect(updatedConfig.enableFullIntegration).toBe(false);
      expect(updatedConfig.powertoolsConfig.businessMetrics).toBe(false);
      expect(updatedConfig.powertoolsConfig.parameterStore).toBe(true); // Should remain unchanged
    });

    test('should handle Powertools configuration updates', () => {
      const service = new LambdaObservabilityService(context, config);
      
      service.updatePowertoolsConfig({
        logLevel: 'DEBUG',
        auditLogging: false,
        metricsNamespace: 'Custom/Namespace'
      });

      const updatedPowertoolsConfig = service.getPowertoolsConfig();
      expect(updatedPowertoolsConfig.logLevel).toBe('DEBUG');
      expect(updatedPowertoolsConfig.auditLogging).toBe(false);
      expect(updatedPowertoolsConfig.metricsNamespace).toBe('Custom/Namespace');
      expect(updatedPowertoolsConfig.businessMetrics).toBe(true); // Should remain unchanged
    });
  });

  describe('Error Scenarios', () => {
    test('should handle component without Lambda function', async () => {
      const service = new LambdaObservabilityService(context, config);
      
      const componentWithoutLambda = {
        getType: () => 'lambda-worker',
        node: { id: 'no-lambda-component' },
        getConstruct: () => undefined
      } as any;

      const result = await service.applyObservability(componentWithoutLambda);

      expect(result.success).toBe(true); // Should not fail, just not apply enhancements
    });

    test('should handle missing configuration gracefully', () => {
      const incompleteConfig = {
        observabilityConfig: config.observabilityConfig,
        serviceName: 'test-service',
        complianceFramework: 'commercial'
        // Missing powertoolsConfig and enableFullIntegration
      } as LambdaObservabilityServiceConfig;

      expect(() => {
        new LambdaObservabilityService(context, incompleteConfig);
      }).not.toThrow();
    });
  });

  describe('Integration Scenarios', () => {
    test('should integrate with different compliance frameworks', () => {
      const fedrampContext = { ...context, complianceFramework: 'fedramp-moderate' };
      const service = LambdaObservabilityService.create(
        fedrampContext,
        'fedramp-service',
        'fedramp-moderate'
      );

      expect(service.getConfig().complianceFramework).toBe('fedramp-moderate');
    });

    test('should integrate with different environments', () => {
      const prodContext = { ...context, environment: 'production' };
      const service = LambdaObservabilityService.create(
        prodContext,
        'prod-service',
        'commercial'
      );

      expect(service.getConfig().serviceName).toBe('prod-service');
    });

    test('should handle custom Powertools configurations', () => {
      const customPowertoolsConfig = {
        serviceName: 'custom-service',
        metricsNamespace: 'Custom/Metrics',
        businessMetrics: true,
        parameterStore: false,
        auditLogging: false,
        logLevel: 'DEBUG' as const,
        logEvent: true
      };

      const service = LambdaObservabilityService.create(
        context,
        'custom-service',
        'commercial',
        customPowertoolsConfig
      );

      const powertoolsConfig = service.getPowertoolsConfig();
      expect(powertoolsConfig.serviceName).toBe('custom-service');
      expect(powertoolsConfig.metricsNamespace).toBe('Custom/Metrics');
      expect(powertoolsConfig.businessMetrics).toBe(true);
      expect(powertoolsConfig.parameterStore).toBe(false);
      expect(powertoolsConfig.auditLogging).toBe(false);
      expect(powertoolsConfig.logLevel).toBe('DEBUG');
      expect(powertoolsConfig.logEvent).toBe(true);
    });
  });
});
