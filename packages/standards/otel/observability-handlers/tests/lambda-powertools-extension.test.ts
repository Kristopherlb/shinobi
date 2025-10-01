/**
 * Lambda Powertools Extension Tests
 * 
 * Tests the LambdaPowertoolsExtensionHandler for enhanced observability
 * capabilities while maintaining compatibility with existing OTEL setup.
 */

import { App, Stack } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LambdaPowertoolsExtensionHandler, LambdaPowertoolsConfig, DEFAULT_POWERTOOLS_CONFIG } from '../src/observability-handlers/lambda-powertools-extension.handler.js';
import { ObservabilityConfig } from '../src/observability-handlers/observability-handler.interface.js';
import { BaseComponent } from '@shinobi/core';
import { PlatformServiceContext } from '@shinobi/core/platform-services';

// Mock BaseComponent for testing
class MockLambdaComponent extends BaseComponent {
  constructor(scope: any, id: string) {
    super(scope, id);
    this.lambdaFunction = new lambda.Function(scope, 'MockLambdaFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};'),
      functionName: 'mock-lambda-function'
    });
  }

  private lambdaFunction: lambda.Function;

  public getConstruct(name: string): any {
    if (name === 'function') {
      return this.lambdaFunction;
    }
    return undefined;
  }

  public getType(): string {
    return 'lambda-worker';
  }

  public node = {
    id: 'mock-lambda-component'
  } as any;
}

describe('Lambda Powertools Extension Handler Tests', () => {
  let app: App;
  let stack: Stack;
  let component: MockLambdaComponent;
  let context: PlatformServiceContext;
  let config: ObservabilityConfig;
  let powertoolsConfig: LambdaPowertoolsConfig;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestPowertoolsStack');
    component = new MockLambdaComponent(stack, 'MockLambdaComponent');

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
    };

    powertoolsConfig = {
      enabled: true,
      serviceName: 'test-service',
      metricsNamespace: 'Shinobi/Test',
      businessMetrics: true,
      parameterStore: true,
      auditLogging: true,
      logLevel: 'INFO',
      logEvent: false
    };
  });

  describe('Constructor and Configuration', () => {
    test('should create handler with default configuration', () => {
      const handler = new LambdaPowertoolsExtensionHandler(context);

      expect(handler).toBeDefined();
      expect(handler.getPowertoolsConfig()).toEqual({
        ...DEFAULT_POWERTOOLS_CONFIG,
        serviceName: 'test-service'
      });
    });

    test('should create handler with custom configuration', () => {
      const handler = new LambdaPowertoolsExtensionHandler(context, powertoolsConfig);

      expect(handler).toBeDefined();
      expect(handler.getPowertoolsConfig()).toEqual(powertoolsConfig);
    });

    test('should update configuration', () => {
      const handler = new LambdaPowertoolsExtensionHandler(context);
      const newConfig = {
        logLevel: 'DEBUG' as const,
        businessMetrics: false
      };

      handler.updatePowertoolsConfig(newConfig);

      const updatedConfig = handler.getPowertoolsConfig();
      expect(updatedConfig.logLevel).toBe('DEBUG');
      expect(updatedConfig.businessMetrics).toBe(false);
    });
  });

  describe('Powertools Enhancements Application', () => {
    test('should apply powertools enhancements when enabled', () => {
      const handler = new LambdaPowertoolsExtensionHandler(context, powertoolsConfig);
      
      const result = handler.applyPowertoolsEnhancements(component, config);

      expect(result.instrumentationApplied).toBe(true);
      expect(result.alarmsCreated).toBe(0);
      expect(result.executionTimeMs).toBeGreaterThan(0);
    });

    test('should not apply powertools enhancements when disabled', () => {
      const disabledConfig = { ...powertoolsConfig, enabled: false };
      const handler = new LambdaPowertoolsExtensionHandler(context, disabledConfig);
      
      const result = handler.applyPowertoolsEnhancements(component, config);

      expect(result.instrumentationApplied).toBe(false);
      expect(result.alarmsCreated).toBe(0);
    });

    test('should handle missing Lambda function gracefully', () => {
      const handler = new LambdaPowertoolsExtensionHandler(context, powertoolsConfig);
      
      // Create a component without a Lambda function
      const componentWithoutLambda = {
        getConstruct: () => undefined,
        getType: () => 'lambda-worker',
        node: { id: 'no-lambda-component' }
      } as any;

      const result = handler.applyPowertoolsEnhancements(componentWithoutLambda, config);

      expect(result.instrumentationApplied).toBe(false);
    });

    test('should log enhancement application', () => {
      const handler = new LambdaPowertoolsExtensionHandler(context, powertoolsConfig);
      
      handler.applyPowertoolsEnhancements(component, config);

      expect(context.logger.info).toHaveBeenCalledWith(
        'Lambda Powertools enhancements applied successfully',
        expect.objectContaining({
          service: 'ObservabilityService',
          componentType: 'lambda-worker',
          componentName: 'mock-lambda-component',
          enhancementsApplied: expect.any(Number),
          executionTimeMs: expect.any(Number)
        })
      );
    });
  });

  describe('Powertools Layer Configuration', () => {
    test('should apply Powertools layer for supported runtimes', () => {
      const handler = new LambdaPowertoolsExtensionHandler(context, powertoolsConfig);
      
      handler.applyPowertoolsEnhancements(component, config);

      // The layer should be applied (specific assertions would depend on implementation details)
      expect(context.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Powertools layer applied'),
        expect.any(Object)
      );
    });

    test('should handle unsupported runtime gracefully', () => {
      // Create a component with unsupported runtime
      const unsupportedComponent = new MockLambdaComponent(stack, 'UnsupportedComponent');
      const unsupportedLambdaFunction = new lambda.Function(stack, 'UnsupportedLambdaFunction', {
        runtime: lambda.Runtime.PYTHON_3_8, // Older runtime
        handler: 'index.handler',
        code: lambda.Code.fromInline('# Python code'),
        functionName: 'unsupported-lambda-function'
      });
      
      // Override the getConstruct method to return unsupported function
      unsupportedComponent.getConstruct = (name: string) => {
        if (name === 'function') {
          return unsupportedLambdaFunction;
        }
        return undefined;
      };

      const handler = new LambdaPowertoolsExtensionHandler(context, powertoolsConfig);
      
      handler.applyPowertoolsEnhancements(unsupportedComponent, config);

      expect(context.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No Powertools layer available for runtime'),
        expect.any(Object)
      );
    });
  });

  describe('Environment Variables Configuration', () => {
    test('should apply Powertools environment variables', () => {
      const handler = new LambdaPowertoolsExtensionHandler(context, powertoolsConfig);
      
      handler.applyPowertoolsEnhancements(component, config);

      expect(context.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Powertools environment variables applied'),
        expect.any(Object)
      );
    });

    test('should configure business metrics environment variables', () => {
      const handler = new LambdaPowertoolsExtensionHandler(context, powertoolsConfig);
      
      handler.applyPowertoolsEnhancements(component, config);

      expect(context.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Business metrics configuration applied'),
        expect.any(Object)
      );
    });

    test('should configure parameter store environment variables', () => {
      const handler = new LambdaPowertoolsExtensionHandler(context, powertoolsConfig);
      
      handler.applyPowertoolsEnhancements(component, config);

      expect(context.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Parameter store configuration applied'),
        expect.any(Object)
      );
    });
  });

  describe('IAM Permissions Configuration', () => {
    test('should apply Powertools IAM permissions', () => {
      const handler = new LambdaPowertoolsExtensionHandler(context, powertoolsConfig);
      
      handler.applyPowertoolsEnhancements(component, config);

      expect(context.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Powertools IAM permissions applied'),
        expect.any(Object)
      );
    });

    test('should apply business metrics permissions when enabled', () => {
      const handler = new LambdaPowertoolsExtensionHandler(context, powertoolsConfig);
      
      handler.applyPowertoolsEnhancements(component, config);

      // Business metrics permissions should be applied
      expect(context.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Powertools IAM permissions applied'),
        expect.objectContaining({
          permissionsCount: expect.any(Number)
        })
      );
    });

    test('should apply parameter store permissions when enabled', () => {
      const handler = new LambdaPowertoolsExtensionHandler(context, powertoolsConfig);
      
      handler.applyPowertoolsEnhancements(component, config);

      // Parameter store permissions should be applied
      expect(context.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Powertools IAM permissions applied'),
        expect.objectContaining({
          permissionsCount: expect.any(Number)
        })
      );
    });
  });

  describe('Factory Methods', () => {
    test('should create handler using factory method', () => {
      const handler = LambdaPowertoolsExtensionHandler.create(context, powertoolsConfig);

      expect(handler).toBeDefined();
      expect(handler.getPowertoolsConfig()).toEqual(powertoolsConfig);
    });

    test('should create handler with minimal configuration', () => {
      const handler = LambdaPowertoolsExtensionHandler.create(context);

      expect(handler).toBeDefined();
      expect(handler.getPowertoolsConfig().serviceName).toBe('test-service');
    });
  });

  describe('Error Handling', () => {
    test('should handle errors gracefully during enhancement application', () => {
      const handler = new LambdaPowertoolsExtensionHandler(context, powertoolsConfig);
      
      // Create a component that will cause an error
      const errorComponent = {
        getConstruct: () => {
          throw new Error('Test error');
        },
        getType: () => 'lambda-worker',
        node: { id: 'error-component' }
      } as any;

      expect(() => {
        handler.applyPowertoolsEnhancements(errorComponent, config);
      }).toThrow('Test error');
    });

    test('should log errors during enhancement application', () => {
      const handler = new LambdaPowertoolsExtensionHandler(context, powertoolsConfig);
      
      const errorComponent = {
        getConstruct: () => {
          throw new Error('Test error');
        },
        getType: () => 'lambda-worker',
        node: { id: 'error-component' }
      } as any;

      try {
        handler.applyPowertoolsEnhancements(errorComponent, config);
      } catch (error) {
        expect(context.logger.error).toHaveBeenCalledWith(
          'Failed to apply Lambda Powertools enhancements',
          expect.objectContaining({
            service: 'ObservabilityService',
            componentName: 'error-component',
            error: 'Test error'
          })
        );
      }
    });
  });

  describe('Configuration Validation', () => {
    test('should validate Powertools configuration', () => {
      const handler = new LambdaPowertoolsExtensionHandler(context, powertoolsConfig);
      
      const config = handler.getPowertoolsConfig();
      
      expect(config.enabled).toBe(true);
      expect(config.serviceName).toBe('test-service');
      expect(config.metricsNamespace).toBe('Shinobi/Test');
      expect(config.businessMetrics).toBe(true);
      expect(config.parameterStore).toBe(true);
      expect(config.auditLogging).toBe(true);
      expect(config.logLevel).toBe('INFO');
      expect(config.logEvent).toBe(false);
    });

    test('should handle partial configuration updates', () => {
      const handler = new LambdaPowertoolsExtensionHandler(context, powertoolsConfig);
      
      handler.updatePowertoolsConfig({
        logLevel: 'DEBUG',
        auditLogging: false
      });

      const config = handler.getPowertoolsConfig();
      expect(config.logLevel).toBe('DEBUG');
      expect(config.auditLogging).toBe(false);
      expect(config.businessMetrics).toBe(true); // Should remain unchanged
    });
  });

  describe('Integration with Base OTEL', () => {
    test('should maintain compatibility with existing OTEL setup', () => {
      const handler = new LambdaPowertoolsExtensionHandler(context, powertoolsConfig);
      
      const result = handler.applyPowertoolsEnhancements(component, config);

      // Should successfully apply enhancements without breaking existing OTEL
      expect(result.instrumentationApplied).toBe(true);
    });

    test('should apply OTEL correlation environment variables', () => {
      const handler = new LambdaPowertoolsExtensionHandler(context, powertoolsConfig);
      
      handler.applyPowertoolsEnhancements(component, config);

      // Should log that environment variables were applied
      expect(context.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Powertools environment variables applied'),
        expect.any(Object)
      );
    });
  });
});
