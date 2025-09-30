import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { LambdaApiValidator } from '../../validation/lambda-api.validator';
import { LambdaApiConfig } from '../../src/lambda-api.builder';

describe('LambdaApiValidator', () => {
  const createContext = (framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' | 'hipaa' | 'sox'): ComponentContext => ({
    serviceName: 'test-service',
    environment: 'dev',
    complianceFramework: framework,
    scope: {} as any,
    region: 'us-east-1',
    accountId: '123456789012'
  });

  const createSpec = (): ComponentSpec => ({
    name: 'test-lambda-api',
    type: 'lambda-api',
    config: {}
  });

  const createValidConfig = (): LambdaApiConfig => ({
    functionName: 'test-function',
    handler: 'index.handler',
    runtime: 'nodejs20.x',
    memorySize: 512,
    timeoutSeconds: 30,
    architecture: 'x86_64',
    tracing: 'Active',
    logFormat: 'JSON',
    environment: {
      NODE_ENV: 'development',
      LOG_LEVEL: 'INFO'
    },
    api: {
      type: 'rest',
      stageName: 'dev',
      metricsEnabled: true,
      tracingEnabled: true,
      apiKeyRequired: false,
      throttling: {
        burstLimit: 5000,
        rateLimit: 2000
      },
      usagePlan: {
        enabled: false
      },
      logging: {
        enabled: true,
        retentionDays: 14,
        logFormat: 'json',
        prefix: 'api-logs'
      },
      cors: {
        enabled: false,
        allowOrigins: [],
        allowHeaders: [],
        allowMethods: [],
        allowCredentials: false
      }
    },
    vpc: {
      enabled: false,
      subnetIds: [],
      securityGroupIds: []
    },
    encryption: {
      enabled: false
    },
    monitoring: {
      enabled: true,
      alarms: {
        lambdaErrors: {
          enabled: true,
          threshold: 1,
          evaluationPeriods: 1,
          periodMinutes: 1,
          comparisonOperator: 'gt',
          treatMissingData: 'breaching',
          statistic: 'Sum',
          tags: {}
        },
        lambdaThrottles: {
          enabled: true,
          threshold: 1,
          evaluationPeriods: 1,
          periodMinutes: 1,
          comparisonOperator: 'gt',
          treatMissingData: 'breaching',
          statistic: 'Sum',
          tags: {}
        },
        lambdaDuration: {
          enabled: true,
          threshold: 5000,
          evaluationPeriods: 1,
          periodMinutes: 1,
          comparisonOperator: 'gt',
          treatMissingData: 'breaching',
          statistic: 'Average',
          tags: {}
        },
        api4xxErrors: {
          enabled: true,
          threshold: 10,
          evaluationPeriods: 1,
          periodMinutes: 1,
          comparisonOperator: 'gt',
          treatMissingData: 'breaching',
          statistic: 'Sum',
          tags: {}
        },
        api5xxErrors: {
          enabled: true,
          threshold: 5,
          evaluationPeriods: 1,
          periodMinutes: 1,
          comparisonOperator: 'gt',
          treatMissingData: 'breaching',
          statistic: 'Sum',
          tags: {}
        }
      }
    },
    deployment: {
      codePath: './dist',
      inlineFallbackEnabled: true
    }
  });

  describe('Core Configuration Validation', () => {
    it('should validate a valid configuration', () => {
      const context = createContext('commercial');
      const spec = createSpec();
      const config = createValidConfig();
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.complianceScore).toBe(100);
    });

    it('should reject invalid function name', () => {
      const context = createContext('commercial');
      const spec = createSpec();
      const config = createValidConfig();
      config.functionName = 'ab'; // Too short
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('LAMBDA_API_001');
      expect(result.errors[0].severity).toBe('critical');
    });

    it('should reject function name with invalid characters', () => {
      const context = createContext('commercial');
      const spec = createSpec();
      const config = createValidConfig();
      config.functionName = 'test@function!'; // Invalid characters
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('LAMBDA_API_002');
      expect(result.errors[0].severity).toBe('critical');
    });

    it('should reject invalid handler format', () => {
      const context = createContext('commercial');
      const spec = createSpec();
      const config = createValidConfig();
      config.handler = 'invalid-handler'; // Missing dot
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('LAMBDA_API_003');
      expect(result.errors[0].severity).toBe('critical');
    });

    it('should reject unsupported runtime', () => {
      const context = createContext('commercial');
      const spec = createSpec();
      const config = createValidConfig();
      config.runtime = 'nodejs16.x' as any; // Unsupported runtime
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('LAMBDA_API_004');
      expect(result.errors[0].severity).toBe('high');
    });

    it('should reject invalid memory size', () => {
      const context = createContext('commercial');
      const spec = createSpec();
      const config = createValidConfig();
      config.memorySize = 64; // Too low
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('LAMBDA_API_005');
      expect(result.errors[0].severity).toBe('high');
    });

    it('should reject invalid timeout', () => {
      const context = createContext('commercial');
      const spec = createSpec();
      const config = createValidConfig();
      config.timeoutSeconds = 1000; // Too high
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('LAMBDA_API_006');
      expect(result.errors[0].severity).toBe('high');
    });

    it('should reject empty API stage name', () => {
      const context = createContext('commercial');
      const spec = createSpec();
      const config = createValidConfig();
      config.api.stageName = '';
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('LAMBDA_API_007');
      expect(result.errors[0].severity).toBe('critical');
    });
  });

  describe('Security Configuration Validation', () => {
    it('should reject VPC enabled without subnets', () => {
      const context = createContext('commercial');
      const spec = createSpec();
      const config = createValidConfig();
      config.vpc.enabled = true;
      config.vpc.subnetIds = []; // No subnets
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('LAMBDA_API_SEC_001');
      expect(result.errors[0].severity).toBe('critical');
    });

    it('should reject VPC enabled without security groups', () => {
      const context = createContext('commercial');
      const spec = createSpec();
      const config = createValidConfig();
      config.vpc.enabled = true;
      config.vpc.subnetIds = ['subnet-123'];
      config.vpc.securityGroupIds = []; // No security groups
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('LAMBDA_API_SEC_002');
      expect(result.errors[0].severity).toBe('critical');
    });

    it('should reject API key required without usage plan', () => {
      const context = createContext('commercial');
      const spec = createSpec();
      const config = createValidConfig();
      config.api.apiKeyRequired = true;
      config.api.usagePlan.enabled = false; // Usage plan disabled
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('LAMBDA_API_SEC_003');
      expect(result.errors[0].severity).toBe('high');
    });

    it('should warn about CORS wildcard origins', () => {
      const context = createContext('commercial');
      const spec = createSpec();
      const config = createValidConfig();
      config.api.cors.enabled = true;
      config.api.cors.allowOrigins = ['*']; // Wildcard origin
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('LAMBDA_API_SEC_WARN_001');
    });

    it('should warn about encryption enabled without KMS key', () => {
      const context = createContext('commercial');
      const spec = createSpec();
      const config = createValidConfig();
      config.encryption.enabled = true;
      // No KMS key specified
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('LAMBDA_API_SEC_WARN_002');
    });
  });

  describe('Performance Configuration Validation', () => {
    it('should warn about low memory allocation', () => {
      const context = createContext('commercial');
      const spec = createSpec();
      const config = createValidConfig();
      config.memorySize = 256; // Low memory
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('LAMBDA_API_PERF_WARN_001');
    });

    it('should warn about long timeout', () => {
      const context = createContext('commercial');
      const spec = createSpec();
      const config = createValidConfig();
      config.timeoutSeconds = 600; // Long timeout
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('LAMBDA_API_PERF_WARN_002');
    });
  });

  describe('Compliance Framework Validation', () => {
    it('should require VPC for FedRAMP compliance', () => {
      const context = createContext('fedramp-moderate');
      const spec = createSpec();
      const config = createValidConfig();
      config.vpc.enabled = false; // VPC disabled
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('LAMBDA_API_COMP_001');
      expect(result.errors[0].severity).toBe('critical');
      expect(result.frameworkCompliance.fedrampModerate).toBe(false);
    });

    it('should require encryption for FedRAMP compliance', () => {
      const context = createContext('fedramp-moderate');
      const spec = createSpec();
      const config = createValidConfig();
      config.vpc.enabled = true;
      config.vpc.subnetIds = ['subnet-123'];
      config.vpc.securityGroupIds = ['sg-123'];
      config.encryption.enabled = false; // Encryption disabled
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('LAMBDA_API_COMP_002');
      expect(result.errors[0].severity).toBe('critical');
    });

    it('should require monitoring for FedRAMP compliance', () => {
      const context = createContext('fedramp-moderate');
      const spec = createSpec();
      const config = createValidConfig();
      config.vpc.enabled = true;
      config.vpc.subnetIds = ['subnet-123'];
      config.vpc.securityGroupIds = ['sg-123'];
      config.encryption.enabled = true;
      config.monitoring.enabled = false; // Monitoring disabled
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('LAMBDA_API_COMP_003');
      expect(result.errors[0].severity).toBe('critical');
    });

    it('should require minimum log retention for FedRAMP compliance', () => {
      const context = createContext('fedramp-moderate');
      const spec = createSpec();
      const config = createValidConfig();
      config.vpc.enabled = true;
      config.vpc.subnetIds = ['subnet-123'];
      config.vpc.securityGroupIds = ['sg-123'];
      config.encryption.enabled = true;
      config.monitoring.enabled = true;
      config.api.logging.retentionDays = 14; // Less than 30 days
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('LAMBDA_API_COMP_004');
      expect(result.errors[0].severity).toBe('high');
    });

    it('should require encryption for HIPAA compliance', () => {
      const context = createContext('hipaa');
      const spec = createSpec();
      const config = createValidConfig();
      config.encryption.enabled = false; // Encryption disabled
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('LAMBDA_API_COMP_005');
      expect(result.errors[0].severity).toBe('critical');
    });

    it('should require minimum log retention for HIPAA compliance', () => {
      const context = createContext('hipaa');
      const spec = createSpec();
      const config = createValidConfig();
      config.encryption.enabled = true;
      config.api.logging.retentionDays = 30; // Less than 90 days
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('LAMBDA_API_COMP_006');
      expect(result.errors[0].severity).toBe('high');
    });

    it('should require monitoring for SOX compliance', () => {
      const context = createContext('sox');
      const spec = createSpec();
      const config = createValidConfig();
      config.monitoring.enabled = false; // Monitoring disabled
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('LAMBDA_API_COMP_007');
      expect(result.errors[0].severity).toBe('critical');
    });

    it('should require minimum log retention for SOX compliance', () => {
      const context = createContext('sox');
      const spec = createSpec();
      const config = createValidConfig();
      config.monitoring.enabled = true;
      config.api.logging.retentionDays = 1000; // Less than 7 years (2555 days)
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('LAMBDA_API_COMP_008');
      expect(result.errors[0].severity).toBe('critical');
    });
  });

  describe('Operational Configuration Validation', () => {
    it('should warn about disabled error alarms', () => {
      const context = createContext('commercial');
      const spec = createSpec();
      const config = createValidConfig();
      config.monitoring.alarms.lambdaErrors.enabled = false; // Error alarms disabled
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('LAMBDA_API_OPS_WARN_001');
    });

    it('should warn about disabled API logging', () => {
      const context = createContext('commercial');
      const spec = createSpec();
      const config = createValidConfig();
      config.api.logging.enabled = false; // API logging disabled
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('LAMBDA_API_OPS_WARN_005');
    });
  });

  describe('Compliance Score Calculation', () => {
    it('should calculate correct compliance score for valid configuration', () => {
      const context = createContext('commercial');
      const spec = createSpec();
      const config = createValidConfig();
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.complianceScore).toBe(100);
    });

    it('should deduct points for critical errors', () => {
      const context = createContext('commercial');
      const spec = createSpec();
      const config = createValidConfig();
      config.functionName = 'ab'; // Critical error
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.complianceScore).toBe(80); // 100 - 20 for critical error
    });

    it('should deduct points for high severity errors', () => {
      const context = createContext('commercial');
      const spec = createSpec();
      const config = createValidConfig();
      config.runtime = 'nodejs16.x' as any; // High severity error
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.complianceScore).toBe(90); // 100 - 10 for high severity error
    });

    it('should deduct points for warnings', () => {
      const context = createContext('commercial');
      const spec = createSpec();
      const config = createValidConfig();
      config.memorySize = 256; // Warning
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.complianceScore).toBe(99); // 100 - 1 for warning
    });
  });

  describe('Framework Compliance Check', () => {
    it('should pass commercial compliance for valid configuration', () => {
      const context = createContext('commercial');
      const spec = createSpec();
      const config = createValidConfig();
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.frameworkCompliance.commercial).toBe(true);
    });

    it('should fail commercial compliance for critical errors', () => {
      const context = createContext('commercial');
      const spec = createSpec();
      const config = createValidConfig();
      config.functionName = 'ab'; // Critical error
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.frameworkCompliance.commercial).toBe(false);
    });

    it('should pass FedRAMP compliance for compliant configuration', () => {
      const context = createContext('fedramp-moderate');
      const spec = createSpec();
      const config = createValidConfig();
      config.vpc.enabled = true;
      config.vpc.subnetIds = ['subnet-123'];
      config.vpc.securityGroupIds = ['sg-123'];
      config.encryption.enabled = true;
      config.monitoring.enabled = true;
      config.api.logging.retentionDays = 30;
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.frameworkCompliance.fedrampModerate).toBe(true);
    });

    it('should pass HIPAA compliance for compliant configuration', () => {
      const context = createContext('hipaa');
      const spec = createSpec();
      const config = createValidConfig();
      config.encryption.enabled = true;
      config.api.logging.retentionDays = 90;
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.frameworkCompliance.hipaa).toBe(true);
    });

    it('should pass SOX compliance for compliant configuration', () => {
      const context = createContext('sox');
      const spec = createSpec();
      const config = createValidConfig();
      config.monitoring.enabled = true;
      config.api.logging.retentionDays = 2555; // 7 years
      const validator = new LambdaApiValidator(context, spec);

      const result = validator.validate(config);

      expect(result.frameworkCompliance.sox).toBe(true);
    });
  });
});
