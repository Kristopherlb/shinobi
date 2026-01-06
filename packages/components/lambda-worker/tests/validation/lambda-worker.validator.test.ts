/**
 * Lambda Worker Validator Tests
 * 
 * Tests comprehensive input validation and error handling for Lambda Worker components.
 * Validates security, compliance, performance, and operational requirements.
 */

import { ComponentContext } from '@shinobi/core';
import { LambdaWorkerValidator } from '../../validation/lambda-worker.validator.js';
import { LambdaWorkerConfig } from '../../lambda-worker.builder.js';

describe('Lambda Worker Validator Tests', () => {
  let context: ComponentContext;
  let config: LambdaWorkerConfig;

  beforeEach(() => {
    context = {
      environment: 'test',
      complianceFramework: 'commercial',
      owner: 'test-owner',
      service: 'test-service'
    };

    config = {
      runtime: 'nodejs20.x',
      architecture: 'x86_64',
      handler: 'index.handler',
      codePath: './test-code',
      memorySize: 512,
      timeoutSeconds: 300,
      functionName: 'test-lambda-worker',
      description: 'Test Lambda worker',
      hardeningProfile: 'standard',
      logging: {
        logFormat: 'json',
        systemLogLevel: 'INFO',
        applicationLogLevel: 'INFO',
        logRetentionDays: 30
      },
      observability: {
        otelEnabled: true,
        otelResourceAttributes: {
          'service.name': 'test-lambda-worker'
        }
      },
      securityTools: {
        falco: false,
        runtimeSecurity: false
      },
      tracing: {
        mode: 'Active'
      },
      eventSources: [],
      environment: {},
      tags: {},
      removalPolicy: 'destroy'
    };
  });

  describe('Core Configuration Validation', () => {
    test('should validate valid configuration', () => {
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.complianceScore).toBeGreaterThan(80);
    });

    test('should reject empty function name', () => {
      config.functionName = '';
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('functionName');
      expect(result.errors[0].message).toContain('Function name is required');
    });

    test('should reject function name longer than 64 characters', () => {
      config.functionName = 'a'.repeat(65);
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('functionName');
      expect(result.errors[0].message).toContain('64 characters or less');
    });

    test('should reject invalid function name characters', () => {
      config.functionName = 'invalid-name!';
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('functionName');
      expect(result.errors[0].message).toContain('alphanumeric characters, hyphens, and underscores');
    });

    test('should reject empty handler', () => {
      config.handler = '';
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('handler');
      expect(result.errors[0].message).toContain('Handler is required');
    });

    test('should reject invalid handler format', () => {
      config.handler = 'invalid-handler';
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('handler');
      expect(result.errors[0].message).toContain('filename.functionName');
    });

    test('should reject unsupported runtime', () => {
      config.runtime = 'unsupported-runtime';
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('runtime');
      expect(result.errors[0].message).toContain('Runtime must be one of');
    });

    test('should reject unsupported architecture', () => {
      config.architecture = 'unsupported-arch';
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('architecture');
      expect(result.errors[0].message).toContain('Architecture must be one of');
    });

    test('should reject empty code path', () => {
      config.codePath = '';
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('codePath');
      expect(result.errors[0].message).toContain('Code path is required');
    });
  });

  describe('Security Configuration Validation', () => {
    test('should require VPC for FedRAMP compliance', () => {
      context.complianceFramework = 'fedramp-moderate';
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('vpc.enabled');
      expect(result.errors[0].message).toContain('VPC configuration is mandatory for FedRAMP compliance');
      expect(result.errors[0].complianceFramework).toBe('fedramp-moderate');
    });

    test('should require KMS encryption for high-compliance frameworks', () => {
      context.complianceFramework = 'fedramp-high';
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('kmsKeyArn');
      expect(result.errors[0].message).toContain('KMS encryption is mandatory for high-compliance frameworks');
      expect(result.errors[0].complianceFramework).toBe('fedramp-high');
    });

    test('should warn about sensitive environment variables without KMS', () => {
      config.environment = {
        'PASSWORD': 'secret-password',
        'API_KEY': 'secret-key'
      };
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0].field).toBe('environment.PASSWORD');
      expect(result.warnings[0].message).toContain('should be encrypted with KMS');
      expect(result.warnings[1].field).toBe('environment.API_KEY');
      expect(result.warnings[1].message).toContain('should be encrypted with KMS');
    });

    test('should not warn about sensitive environment variables with KMS', () => {
      config.environment = {
        'PASSWORD': 'secret-password',
        'API_KEY': 'secret-key'
      };
      config.kmsKeyArn = 'arn:aws:kms:us-east-1:123456789012:key/12345678';
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.warnings).toHaveLength(0);
    });

    test('should recommend runtime security for FedRAMP High', () => {
      context.complianceFramework = 'fedramp-high';
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('securityTools.runtimeSecurity');
      expect(result.warnings[0].message).toContain('Runtime security monitoring is recommended');
      expect(result.warnings[0].complianceFramework).toBe('fedramp-high');
    });
  });

  describe('Compliance Configuration Validation', () => {
    test('should require minimum log retention for commercial', () => {
      config.logging.logRetentionDays = 15; // Less than minimum 30 days
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('logging.logRetentionDays');
      expect(result.errors[0].message).toContain('at least 30 days for commercial compliance');
    });

    test('should require minimum log retention for FedRAMP', () => {
      context.complianceFramework = 'fedramp-moderate';
      config.logging.logRetentionDays = 60; // Less than minimum 90 days
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('logging.logRetentionDays');
      expect(result.errors[0].message).toContain('at least 90 days for fedramp-moderate compliance');
    });

    test('should require active tracing for FedRAMP', () => {
      context.complianceFramework = 'fedramp-moderate';
      config.tracing.mode = 'PassThrough';
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('tracing.mode');
      expect(result.errors[0].message).toContain('Active X-Ray tracing is mandatory for FedRAMP compliance');
    });

    test('should recommend high hardening for FedRAMP High', () => {
      context.complianceFramework = 'fedramp-high';
      config.hardeningProfile = 'standard';
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('hardeningProfile');
      expect(result.warnings[0].message).toContain('High hardening profile is recommended for FedRAMP High compliance');
    });
  });

  describe('Performance Configuration Validation', () => {
    test('should reject memory size below minimum', () => {
      config.memorySize = 64; // Below minimum 128 MB
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('memorySize');
      expect(result.errors[0].message).toContain('Memory size must be at least 128 MB');
    });

    test('should reject memory size above maximum', () => {
      config.memorySize = 10241; // Above maximum 10240 MB
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('memorySize');
      expect(result.errors[0].message).toContain('Memory size cannot exceed 10240 MB');
    });

    test('should reject memory size not multiple of 64', () => {
      config.memorySize = 200; // Not multiple of 64
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('memorySize');
      expect(result.errors[0].message).toContain('Memory size must be a multiple of 64 MB');
    });

    test('should reject timeout below minimum', () => {
      config.timeoutSeconds = 0; // Below minimum 1 second
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('timeoutSeconds');
      expect(result.errors[0].message).toContain('Timeout must be at least 1 second');
    });

    test('should reject timeout above maximum', () => {
      config.timeoutSeconds = 901; // Above maximum 900 seconds
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('timeoutSeconds');
      expect(result.errors[0].message).toContain('Timeout cannot exceed 900 seconds');
    });

    test('should warn about high memory-to-timeout ratio', () => {
      config.memorySize = 10240; // 10 GB
      config.timeoutSeconds = 60; // 1 minute
      // Ratio: 10240/60 = 170.67 > 100
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('memorySize');
      expect(result.warnings[0].message).toContain('High memory-to-timeout ratio may indicate inefficient resource allocation');
    });

    test('should reject invalid reserved concurrency', () => {
      config.reservedConcurrency = 1001; // Above maximum 1000
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('reservedConcurrency');
      expect(result.errors[0].message).toContain('Reserved concurrency must be between 0 and 1000');
    });
  });

  describe('Operational Configuration Validation', () => {
    test('should warn about non-standard environment', () => {
      context.environment = 'custom-environment';
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('environment');
      expect(result.warnings[0].message).toContain('is not a standard environment name');
    });

    test('should validate event sources', () => {
      config.eventSources = [
        { type: 'sqs', arn: 'arn:aws:sqs:us-east-1:123456789012:test-queue' },
        { type: '', arn: 'arn:aws:sqs:us-east-1:123456789012:test-queue' } // Invalid type
      ];
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('eventSources[1]');
      expect(result.errors[0].message).toContain('Event source must have both type and arn specified');
    });

    test('should warn about disabled observability', () => {
      config.observability.otelEnabled = false;
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('observability.otelEnabled');
      expect(result.warnings[0].message).toContain('OpenTelemetry observability is recommended for production workloads');
    });

    test('should reject invalid system log level', () => {
      config.logging.systemLogLevel = 'INVALID_LEVEL';
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('logging.systemLogLevel');
      expect(result.errors[0].message).toContain('System log level must be one of');
    });

    test('should reject invalid application log level', () => {
      config.logging.applicationLogLevel = 'INVALID_LEVEL';
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('logging.applicationLogLevel');
      expect(result.errors[0].message).toContain('Application log level must be one of');
    });
  });

  describe('Compliance Score Calculation', () => {
    test('should calculate perfect compliance score', () => {
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.complianceScore).toBe(100);
    });

    test('should reduce score for errors', () => {
      config.functionName = ''; // Error
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.complianceScore).toBeLessThan(100);
      expect(result.complianceScore).toBe(90); // 100 - (1 error * 10 points)
    });

    test('should reduce score for warnings', () => {
      config.observability.otelEnabled = false; // Warning
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.complianceScore).toBeLessThan(100);
      expect(result.complianceScore).toBe(95); // 100 - (1 warning * 5 points)
    });

    test('should calculate combined score for errors and warnings', () => {
      config.functionName = ''; // Error
      config.observability.otelEnabled = false; // Warning
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.complianceScore).toBe(85); // 100 - (1 error * 10 + 1 warning * 5)
    });

    test('should not allow negative compliance score', () => {
      // Create many errors and warnings to test minimum score
      config.functionName = '';
      config.handler = '';
      config.runtime = 'invalid';
      config.architecture = 'invalid';
      config.codePath = '';
      config.memorySize = 50;
      config.timeoutSeconds = 0;
      config.logging.systemLogLevel = 'INVALID';
      config.logging.applicationLogLevel = 'INVALID';
      config.observability.otelEnabled = false;
      
      const validator = new LambdaWorkerValidator(context, config);
      const result = validator.validate();

      expect(result.complianceScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Field-Specific Validation', () => {
    test('should validate function name field specifically', () => {
      const validator = new LambdaWorkerValidator(context, config);
      const errors = validator.validateField('functionName', '');

      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('functionName');
      expect(errors[0].message).toContain('Function name is required');
    });

    test('should validate memory size field specifically', () => {
      const validator = new LambdaWorkerValidator(context, config);
      const errors = validator.validateField('memorySize', 50);

      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('memorySize');
      expect(errors[0].message).toContain('Memory size must be a number between 128 and 10240 MB');
    });

    test('should validate timeout seconds field specifically', () => {
      const validator = new LambdaWorkerValidator(context, config);
      const errors = validator.validateField('timeoutSeconds', 1000);

      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('timeoutSeconds');
      expect(errors[0].message).toContain('Timeout must be a number between 1 and 900 seconds');
    });
  });

  describe('Validation Summary', () => {
    test('should provide validation summary', () => {
      const validator = new LambdaWorkerValidator(context, config);
      const summary = validator.getValidationSummary();

      expect(summary).toContain('Validation Summary');
      expect(summary).toContain('0 errors');
      expect(summary).toContain('0 warnings');
      expect(summary).toContain('Compliance Score: 100/100');
    });

    test('should provide validation summary with issues', () => {
      config.functionName = ''; // Error
      config.observability.otelEnabled = false; // Warning
      
      const validator = new LambdaWorkerValidator(context, config);
      const summary = validator.getValidationSummary();

      expect(summary).toContain('Validation Summary');
      expect(summary).toContain('1 errors');
      expect(summary).toContain('1 warnings');
      expect(summary).toContain('Compliance Score: 85/100');
    });
  });
});
