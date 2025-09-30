import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { LambdaApiConfig } from '../src/lambda-api.builder';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  complianceScore: number;
  frameworkCompliance: {
    commercial: boolean;
    fedrampModerate: boolean;
    fedrampHigh: boolean;
    hipaa: boolean;
    sox: boolean;
  };
}

export interface ValidationError {
  code: string;
  message: string;
  field: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  remediation: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field: string;
  remediation: string;
}

/**
 * Comprehensive validator for Lambda API component configurations
 * Ensures compliance with security, performance, and operational requirements
 */
export class LambdaApiValidator {
  private context: ComponentContext;
  private spec: ComponentSpec;

  constructor(context: ComponentContext, spec: ComponentSpec) {
    this.context = context;
    this.spec = spec;
  }

  /**
   * Validate the complete Lambda API configuration
   */
  public validate(config: LambdaApiConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Core validation
    this.validateCoreConfiguration(config, errors, warnings);

    // Security validation
    this.validateSecurityConfiguration(config, errors, warnings);

    // Performance validation
    this.validatePerformanceConfiguration(config, errors, warnings);

    // Compliance validation
    this.validateComplianceConfiguration(config, errors, warnings);

    // Operational validation
    this.validateOperationalConfiguration(config, errors, warnings);

    // Calculate compliance score
    const complianceScore = this.calculateComplianceScore(errors, warnings);

    // Check framework compliance
    const frameworkCompliance = this.checkFrameworkCompliance(config, errors);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      complianceScore,
      frameworkCompliance
    };
  }

  /**
   * Validate core Lambda API configuration
   */
  private validateCoreConfiguration(config: LambdaApiConfig, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Function name validation
    if (!config.functionName || config.functionName.length < 3) {
      errors.push({
        code: 'LAMBDA_API_001',
        message: 'Function name must be at least 3 characters long',
        field: 'functionName',
        severity: 'critical',
        remediation: 'Provide a descriptive function name with at least 3 characters'
      });
    }

    if (config.functionName && !/^[a-zA-Z0-9-_]+$/.test(config.functionName)) {
      errors.push({
        code: 'LAMBDA_API_002',
        message: 'Function name contains invalid characters',
        field: 'functionName',
        severity: 'critical',
        remediation: 'Function name must contain only alphanumeric characters, hyphens, and underscores'
      });
    }

    // Handler validation
    if (!config.handler || !config.handler.includes('.')) {
      errors.push({
        code: 'LAMBDA_API_003',
        message: 'Handler must be in format "filename.function"',
        field: 'handler',
        severity: 'critical',
        remediation: 'Specify handler in format "src/api.handler" or "index.lambdaHandler"'
      });
    }

    // Runtime validation
    const supportedRuntimes = ['nodejs20.x', 'nodejs18.x', 'python3.11', 'python3.10', 'python3.9'];
    if (!supportedRuntimes.includes(config.runtime)) {
      errors.push({
        code: 'LAMBDA_API_004',
        message: 'Unsupported runtime version',
        field: 'runtime',
        severity: 'high',
        remediation: `Use one of the supported runtimes: ${supportedRuntimes.join(', ')}`
      });
    }

    // Memory validation
    if (config.memorySize < 128 || config.memorySize > 10240) {
      errors.push({
        code: 'LAMBDA_API_005',
        message: 'Memory size must be between 128 MB and 10,240 MB',
        field: 'memorySize',
        severity: 'high',
        remediation: 'Set memory size between 128 MB and 10,240 MB based on workload requirements'
      });
    }

    // Timeout validation
    if (config.timeoutSeconds < 1 || config.timeoutSeconds > 900) {
      errors.push({
        code: 'LAMBDA_API_006',
        message: 'Timeout must be between 1 and 900 seconds',
        field: 'timeoutSeconds',
        severity: 'high',
        remediation: 'Set timeout between 1 and 900 seconds based on expected execution time'
      });
    }

    // API Gateway validation
    if (!config.api.stageName || config.api.stageName.length < 1) {
      errors.push({
        code: 'LAMBDA_API_007',
        message: 'API Gateway stage name is required',
        field: 'api.stageName',
        severity: 'critical',
        remediation: 'Provide a valid API Gateway stage name'
      });
    }
  }

  /**
   * Validate security configuration
   */
  private validateSecurityConfiguration(config: LambdaApiConfig, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // VPC configuration validation
    if (config.vpc.enabled && config.vpc.subnetIds.length === 0) {
      errors.push({
        code: 'LAMBDA_API_SEC_001',
        message: 'VPC configuration enabled but no subnets specified',
        field: 'vpc.subnetIds',
        severity: 'critical',
        remediation: 'Specify at least one subnet ID when VPC is enabled'
      });
    }

    if (config.vpc.enabled && config.vpc.securityGroupIds.length === 0) {
      errors.push({
        code: 'LAMBDA_API_SEC_002',
        message: 'VPC configuration enabled but no security groups specified',
        field: 'vpc.securityGroupIds',
        severity: 'critical',
        remediation: 'Specify at least one security group ID when VPC is enabled'
      });
    }

    // API Gateway security validation
    if (config.api.apiKeyRequired && !config.api.usagePlan.enabled) {
      errors.push({
        code: 'LAMBDA_API_SEC_003',
        message: 'API key required but usage plan not enabled',
        field: 'api.usagePlan.enabled',
        severity: 'high',
        remediation: 'Enable usage plan when API key is required'
      });
    }

    // CORS security validation
    if (config.api.cors.enabled && config.api.cors.allowOrigins.includes('*')) {
      warnings.push({
        code: 'LAMBDA_API_SEC_WARN_001',
        message: 'CORS allows all origins (*) which may be a security risk',
        field: 'api.cors.allowOrigins',
        remediation: 'Consider restricting CORS origins to specific domains for better security'
      });
    }

    // Encryption validation
    if (config.encryption.enabled && !config.encryption.kmsKeyId) {
      warnings.push({
        code: 'LAMBDA_API_SEC_WARN_002',
        message: 'Encryption enabled but no KMS key specified',
        field: 'encryption.kmsKeyId',
        remediation: 'Specify a KMS key ID for encryption or use default AWS managed key'
      });
    }
  }

  /**
   * Validate performance configuration
   */
  private validatePerformanceConfiguration(config: LambdaApiConfig, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Memory optimization warnings
    if (config.memorySize < 512) {
      warnings.push({
        code: 'LAMBDA_API_PERF_WARN_001',
        message: 'Low memory allocation may impact performance',
        field: 'memorySize',
        remediation: 'Consider increasing memory size to 512 MB or higher for better performance'
      });
    }

    // Timeout optimization warnings
    if (config.timeoutSeconds > 300) {
      warnings.push({
        code: 'LAMBDA_API_PERF_WARN_002',
        message: 'Long timeout may impact cost and user experience',
        field: 'timeoutSeconds',
        remediation: 'Consider optimizing function performance to reduce timeout requirements'
      });
    }

    // API Gateway throttling validation
    if (config.api.throttling.rateLimit > 10000) {
      warnings.push({
        code: 'LAMBDA_API_PERF_WARN_003',
        message: 'High API Gateway rate limit may impact cost',
        field: 'api.throttling.rateLimit',
        remediation: 'Consider implementing application-level rate limiting to reduce costs'
      });
    }

    // Provisioned concurrency validation
    if (config.provisionedConcurrency.enabled && config.provisionedConcurrency.minCapacity > 100) {
      warnings.push({
        code: 'LAMBDA_API_PERF_WARN_004',
        message: 'High provisioned concurrency may significantly increase costs',
        field: 'provisionedConcurrency.minCapacity',
        remediation: 'Review provisioned concurrency requirements and consider using auto-scaling'
      });
    }
  }

  /**
   * Validate compliance configuration
   */
  private validateComplianceConfiguration(config: LambdaApiConfig, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const framework = this.context.complianceFramework;

    // FedRAMP compliance requirements
    if (framework === 'fedramp-moderate' || framework === 'fedramp-high') {
      if (!config.vpc.enabled) {
        errors.push({
          code: 'LAMBDA_API_COMP_001',
          message: 'VPC configuration is required for FedRAMP compliance',
          field: 'vpc.enabled',
          severity: 'critical',
          remediation: 'Enable VPC configuration for FedRAMP compliance'
        });
      }

      if (!config.encryption.enabled) {
        errors.push({
          code: 'LAMBDA_API_COMP_002',
          message: 'Encryption is required for FedRAMP compliance',
          field: 'encryption.enabled',
          severity: 'critical',
          remediation: 'Enable encryption for FedRAMP compliance'
        });
      }

      if (!config.monitoring.enabled) {
        errors.push({
          code: 'LAMBDA_API_COMP_003',
          message: 'Monitoring is required for FedRAMP compliance',
          field: 'monitoring.enabled',
          severity: 'critical',
          remediation: 'Enable monitoring for FedRAMP compliance'
        });
      }

      if (config.api.logging.retentionDays < 30) {
        errors.push({
          code: 'LAMBDA_API_COMP_004',
          message: 'Log retention must be at least 30 days for FedRAMP compliance',
          field: 'api.logging.retentionDays',
          severity: 'high',
          remediation: 'Set log retention to at least 30 days for FedRAMP compliance'
        });
      }
    }

    // HIPAA compliance requirements
    if (framework === 'hipaa') {
      if (!config.encryption.enabled) {
        errors.push({
          code: 'LAMBDA_API_COMP_005',
          message: 'Encryption is required for HIPAA compliance',
          field: 'encryption.enabled',
          severity: 'critical',
          remediation: 'Enable encryption for HIPAA compliance'
        });
      }

      if (config.api.logging.retentionDays < 90) {
        errors.push({
          code: 'LAMBDA_API_COMP_006',
          message: 'Log retention must be at least 90 days for HIPAA compliance',
          field: 'api.logging.retentionDays',
          severity: 'high',
          remediation: 'Set log retention to at least 90 days for HIPAA compliance'
        });
      }
    }

    // SOX compliance requirements
    if (framework === 'sox') {
      if (!config.monitoring.enabled) {
        errors.push({
          code: 'LAMBDA_API_COMP_007',
          message: 'Monitoring is required for SOX compliance',
          field: 'monitoring.enabled',
          severity: 'critical',
          remediation: 'Enable monitoring for SOX compliance'
        });
      }

      if (config.api.logging.retentionDays < 2555) { // 7 years
        errors.push({
          code: 'LAMBDA_API_COMP_008',
          message: 'Log retention must be at least 7 years for SOX compliance',
          field: 'api.logging.retentionDays',
          severity: 'critical',
          remediation: 'Set log retention to at least 7 years (2555 days) for SOX compliance'
        });
      }
    }
  }

  /**
   * Validate operational configuration
   */
  private validateOperationalConfiguration(config: LambdaApiConfig, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Monitoring configuration validation
    if (config.monitoring.enabled) {
      if (!config.monitoring.alarms.lambdaErrors.enabled) {
        warnings.push({
          code: 'LAMBDA_API_OPS_WARN_001',
          message: 'Lambda error alarms are disabled',
          field: 'monitoring.alarms.lambdaErrors.enabled',
          remediation: 'Enable Lambda error alarms for better operational visibility'
        });
      }

      if (!config.monitoring.alarms.lambdaThrottles.enabled) {
        warnings.push({
          code: 'LAMBDA_API_OPS_WARN_002',
          message: 'Lambda throttle alarms are disabled',
          field: 'monitoring.alarms.lambdaThrottles.enabled',
          remediation: 'Enable Lambda throttle alarms for better operational visibility'
        });
      }

      if (!config.monitoring.alarms.api4xxErrors.enabled) {
        warnings.push({
          code: 'LAMBDA_API_OPS_WARN_003',
          message: 'API 4xx error alarms are disabled',
          field: 'monitoring.alarms.api4xxErrors.enabled',
          remediation: 'Enable API 4xx error alarms for better operational visibility'
        });
      }

      if (!config.monitoring.alarms.api5xxErrors.enabled) {
        warnings.push({
          code: 'LAMBDA_API_OPS_WARN_004',
          message: 'API 5xx error alarms are disabled',
          field: 'monitoring.alarms.api5xxErrors.enabled',
          remediation: 'Enable API 5xx error alarms for better operational visibility'
        });
      }
    }

    // Logging configuration validation
    if (!config.api.logging.enabled) {
      warnings.push({
        code: 'LAMBDA_API_OPS_WARN_005',
        message: 'API Gateway access logging is disabled',
        field: 'api.logging.enabled',
        remediation: 'Enable API Gateway access logging for better operational visibility and security'
      });
    }
  }

  /**
   * Calculate compliance score based on errors and warnings
   */
  private calculateComplianceScore(errors: ValidationError[], warnings: ValidationWarning[]): number {
    let score = 100;

    // Deduct points for errors
    errors.forEach(error => {
      switch (error.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    });

    // Deduct points for warnings
    score -= warnings.length * 1;

    return Math.max(0, score);
  }

  /**
   * Check framework compliance based on validation results
   */
  private checkFrameworkCompliance(config: LambdaApiConfig, errors: ValidationError[]): {
    commercial: boolean;
    fedrampModerate: boolean;
    fedrampHigh: boolean;
    hipaa: boolean;
    sox: boolean;
  } {
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    const highErrors = errors.filter(e => e.severity === 'high');

    // Commercial compliance (basic requirements)
    const commercial = criticalErrors.length === 0;

    // FedRAMP Moderate compliance
    const fedrampModerate = criticalErrors.length === 0 &&
      highErrors.length === 0 &&
      config.vpc.enabled &&
      config.encryption.enabled &&
      config.monitoring.enabled;

    // FedRAMP High compliance (same as Moderate for now)
    const fedrampHigh = fedrampModerate;

    // HIPAA compliance
    const hipaa = criticalErrors.length === 0 &&
      config.encryption.enabled &&
      config.api.logging.retentionDays >= 90;

    // SOX compliance
    const sox = criticalErrors.length === 0 &&
      config.monitoring.enabled &&
      config.api.logging.retentionDays >= 2555;

    return {
      commercial,
      fedrampModerate,
      fedrampHigh,
      hipaa,
      sox
    };
  }
}
