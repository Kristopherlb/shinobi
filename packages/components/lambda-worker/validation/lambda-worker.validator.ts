/**
 * Lambda Worker Component Validator
 * 
 * Provides comprehensive input validation and error handling for Lambda Worker components.
 * Ensures all configurations meet security, compliance, and operational requirements.
 */

import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { LambdaWorkerConfig } from '../lambda-worker.builder.js';

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  complianceFramework?: string;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  complianceScore: number;
}

/**
 * Lambda Worker Component Validator
 * 
 * Validates Lambda Worker component configurations against:
 * - Security best practices
 * - Compliance framework requirements
 * - Operational requirements
 * - Performance optimization guidelines
 */
export class LambdaWorkerValidator {
  private context: ComponentContext;
  private config: LambdaWorkerConfig;

  constructor(context: ComponentContext, config: LambdaWorkerConfig) {
    this.context = context;
    this.config = config;
  }

  /**
   * Perform comprehensive validation of the Lambda Worker configuration
   */
  public validate(): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Core configuration validation
    this.validateCoreConfiguration(errors, warnings);

    // Security validation
    this.validateSecurityConfiguration(errors, warnings);

    // Compliance validation
    this.validateComplianceConfiguration(errors, warnings);

    // Performance validation
    this.validatePerformanceConfiguration(errors, warnings);

    // Operational validation
    this.validateOperationalConfiguration(errors, warnings);

    // Calculate compliance score
    const complianceScore = this.calculateComplianceScore(errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      complianceScore
    };
  }

  /**
   * Validate core configuration parameters
   */
  private validateCoreConfiguration(errors: ValidationError[], warnings: ValidationError[]): void {
    // Function name validation
    if (!this.config.functionName || this.config.functionName.trim().length === 0) {
      errors.push({
        field: 'functionName',
        message: 'Function name is required and cannot be empty',
        severity: 'error'
      });
    } else if (this.config.functionName.length > 64) {
      errors.push({
        field: 'functionName',
        message: 'Function name must be 64 characters or less',
        severity: 'error'
      });
    } else if (!/^[a-zA-Z0-9-_]+$/.test(this.config.functionName)) {
      errors.push({
        field: 'functionName',
        message: 'Function name can only contain alphanumeric characters, hyphens, and underscores',
        severity: 'error'
      });
    }

    // Handler validation
    if (!this.config.handler || this.config.handler.trim().length === 0) {
      errors.push({
        field: 'handler',
        message: 'Handler is required and cannot be empty',
        severity: 'error'
      });
    } else if (!/^[a-zA-Z0-9._-]+\.[a-zA-Z0-9_]+$/.test(this.config.handler)) {
      errors.push({
        field: 'handler',
        message: 'Handler must be in format "filename.functionName"',
        severity: 'error'
      });
    }

    // Runtime validation
    const supportedRuntimes = ['nodejs18.x', 'nodejs20.x', 'python3.9', 'python3.10', 'python3.11', 'python3.12', 'java11', 'java17', 'java21'];
    if (!supportedRuntimes.includes(this.config.runtime)) {
      errors.push({
        field: 'runtime',
        message: `Runtime must be one of: ${supportedRuntimes.join(', ')}`,
        severity: 'error'
      });
    }

    // Architecture validation
    const supportedArchitectures = ['x86_64', 'arm64'];
    if (!supportedArchitectures.includes(this.config.architecture)) {
      errors.push({
        field: 'architecture',
        message: `Architecture must be one of: ${supportedArchitectures.join(', ')}`,
        severity: 'error'
      });
    }

    // Code path validation
    if (!this.config.codePath || this.config.codePath.trim().length === 0) {
      errors.push({
        field: 'codePath',
        message: 'Code path is required and cannot be empty',
        severity: 'error'
      });
    }
  }

  /**
   * Validate security configuration
   */
  private validateSecurityConfiguration(errors: ValidationError[], warnings: ValidationError[]): void {
    // VPC configuration for high-security environments
    if (this.context.complianceFramework === 'fedramp-moderate' || this.context.complianceFramework === 'fedramp-high') {
      if (!this.config.vpc?.enabled) {
        errors.push({
          field: 'vpc.enabled',
          message: 'VPC configuration is mandatory for FedRAMP compliance',
          severity: 'error',
          complianceFramework: this.context.complianceFramework
        });
      } else {
        if (!this.config.vpc.vpcId) {
          errors.push({
            field: 'vpc.vpcId',
            message: 'VPC ID is required when VPC is enabled',
            severity: 'error'
          });
        }
        if (!this.config.vpc.securityGroupIds || this.config.vpc.securityGroupIds.length === 0) {
          warnings.push({
            field: 'vpc.securityGroupIds',
            message: 'Security groups should be explicitly configured for VPC Lambda functions',
            severity: 'warning'
          });
        }
      }
    }

    // KMS encryption for sensitive data
    if (this.context.complianceFramework === 'fedramp-high' || this.context.complianceFramework === 'hipaa') {
      if (!this.config.kmsKeyArn) {
        errors.push({
          field: 'kmsKeyArn',
          message: 'KMS encryption is mandatory for high-compliance frameworks',
          severity: 'error',
          complianceFramework: this.context.complianceFramework
        });
      }
    }

    // Environment variable security
    if (this.config.environment) {
      const sensitiveKeys = ['password', 'secret', 'key', 'token', 'credential'];
      for (const [key, value] of Object.entries(this.config.environment)) {
        const keyLower = key.toLowerCase();
        if (sensitiveKeys.some(sensitive => keyLower.includes(sensitive))) {
          if (!this.config.kmsKeyArn) {
            warnings.push({
              field: `environment.${key}`,
              message: `Sensitive environment variable '${key}' should be encrypted with KMS`,
              severity: 'warning'
            });
          }
        }
      }
    }

    // Security tools validation
    if (this.context.complianceFramework === 'fedramp-high') {
      if (!this.config.securityTools?.runtimeSecurity) {
        warnings.push({
          field: 'securityTools.runtimeSecurity',
          message: 'Runtime security monitoring is recommended for high-compliance environments',
          severity: 'warning',
          complianceFramework: this.context.complianceFramework
        });
      }
    }
  }

  /**
   * Validate compliance framework requirements
   */
  private validateComplianceConfiguration(errors: ValidationError[], warnings: ValidationError[]): void {
    // Log retention requirements
    const minLogRetention = this.getMinimumLogRetention();
    if (this.config.logging.logRetentionDays < minLogRetention) {
      errors.push({
        field: 'logging.logRetentionDays',
        message: `Log retention must be at least ${minLogRetention} days for ${this.context.complianceFramework} compliance`,
        severity: 'error',
        complianceFramework: this.context.complianceFramework
      });
    }

    // Tracing requirements for compliance
    if (this.context.complianceFramework === 'fedramp-moderate' || this.context.complianceFramework === 'fedramp-high') {
      if (this.config.tracing.mode !== 'Active') {
        errors.push({
          field: 'tracing.mode',
          message: 'Active X-Ray tracing is mandatory for FedRAMP compliance',
          severity: 'error',
          complianceFramework: this.context.complianceFramework
        });
      }
    }

    // Hardening profile validation
    if (this.context.complianceFramework === 'fedramp-high') {
      if (this.config.hardeningProfile !== 'high') {
        warnings.push({
          field: 'hardeningProfile',
          message: 'High hardening profile is recommended for FedRAMP High compliance',
          severity: 'warning',
          complianceFramework: this.context.complianceFramework
        });
      }
    }
  }

  /**
   * Validate performance configuration
   */
  private validatePerformanceConfiguration(errors: ValidationError[], warnings: ValidationError[]): void {
    // Memory size validation
    if (this.config.memorySize < 128) {
      errors.push({
        field: 'memorySize',
        message: 'Memory size must be at least 128 MB',
        severity: 'error'
      });
    } else if (this.config.memorySize > 10240) {
      errors.push({
        field: 'memorySize',
        message: 'Memory size cannot exceed 10240 MB',
        severity: 'error'
      });
    } else if (this.config.memorySize % 64 !== 0) {
      errors.push({
        field: 'memorySize',
        message: 'Memory size must be a multiple of 64 MB',
        severity: 'error'
      });
    }

    // Timeout validation
    if (this.config.timeoutSeconds < 1) {
      errors.push({
        field: 'timeoutSeconds',
        message: 'Timeout must be at least 1 second',
        severity: 'error'
      });
    } else if (this.config.timeoutSeconds > 900) {
      errors.push({
        field: 'timeoutSeconds',
        message: 'Timeout cannot exceed 900 seconds (15 minutes)',
        severity: 'error'
      });
    }

    // Memory to timeout ratio validation
    const memoryTimeoutRatio = this.config.memorySize / this.config.timeoutSeconds;
    if (memoryTimeoutRatio > 100) {
      warnings.push({
        field: 'memorySize',
        message: 'High memory-to-timeout ratio may indicate inefficient resource allocation',
        severity: 'warning'
      });
    }

    // Reserved concurrency validation
    if (this.config.reservedConcurrency !== undefined) {
      if (this.config.reservedConcurrency < 0 || this.config.reservedConcurrency > 1000) {
        errors.push({
          field: 'reservedConcurrency',
          message: 'Reserved concurrency must be between 0 and 1000',
          severity: 'error'
        });
      }
    }
  }

  /**
   * Validate operational configuration
   */
  private validateOperationalConfiguration(errors: ValidationError[], warnings: ValidationError[]): void {
    // Environment validation
    const validEnvironments = ['development', 'staging', 'production'];
    if (!validEnvironments.includes(this.context.environment)) {
      warnings.push({
        field: 'environment',
        message: `Environment '${this.context.environment}' is not a standard environment name`,
        severity: 'warning'
      });
    }

    // Event sources validation
    if (this.config.eventSources && this.config.eventSources.length > 0) {
      for (let i = 0; i < this.config.eventSources.length; i++) {
        const eventSource = this.config.eventSources[i];
        if (!eventSource.type || !eventSource.arn) {
          errors.push({
            field: `eventSources[${i}]`,
            message: 'Event source must have both type and arn specified',
            severity: 'error'
          });
        }
      }
    }

    // Observability validation
    if (!this.config.observability.otelEnabled) {
      warnings.push({
        field: 'observability.otelEnabled',
        message: 'OpenTelemetry observability is recommended for production workloads',
        severity: 'warning'
      });
    }

    // Log level validation
    const validLogLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    if (!validLogLevels.includes(this.config.logging.systemLogLevel)) {
      errors.push({
        field: 'logging.systemLogLevel',
        message: `System log level must be one of: ${validLogLevels.join(', ')}`,
        severity: 'error'
      });
    }
    if (!validLogLevels.includes(this.config.logging.applicationLogLevel)) {
      errors.push({
        field: 'logging.applicationLogLevel',
        message: `Application log level must be one of: ${validLogLevels.join(', ')}`,
        severity: 'error'
      });
    }
  }

  /**
   * Get minimum log retention days based on compliance framework
   */
  private getMinimumLogRetention(): number {
    switch (this.context.complianceFramework) {
      case 'commercial':
        return 30;
      case 'fedramp-moderate':
        return 90;
      case 'fedramp-high':
        return 180;
      case 'hipaa':
        return 90;
      case 'sox':
        return 2555; // 7 years
      default:
        return 30;
    }
  }

  /**
   * Calculate compliance score based on errors and warnings
   */
  private calculateComplianceScore(errors: ValidationError[], warnings: ValidationError[]): number {
    const totalIssues = errors.length + warnings.length;
    if (totalIssues === 0) return 100;

    const errorWeight = 10;
    const warningWeight = 5;
    const totalPenalty = (errors.length * errorWeight) + (warnings.length * warningWeight);

    return Math.max(0, 100 - totalPenalty);
  }

  /**
   * Get validation summary for logging
   */
  public getValidationSummary(): string {
    const result = this.validate();
    const { errors, warnings, complianceScore } = result;

    return `Validation Summary: ${errors.length} errors, ${warnings.length} warnings, Compliance Score: ${complianceScore}/100`;
  }

  /**
   * Validate specific field
   */
  public validateField(field: string, value: any): ValidationError[] {
    const errors: ValidationError[] = [];

    switch (field) {
      case 'functionName':
        this.validateFunctionName(value, errors);
        break;
      case 'memorySize':
        this.validateMemorySize(value, errors);
        break;
      case 'timeoutSeconds':
        this.validateTimeoutSeconds(value, errors);
        break;
      // Add more field-specific validations as needed
    }

    return errors;
  }

  private validateFunctionName(value: any, errors: ValidationError[]): void {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      errors.push({
        field: 'functionName',
        message: 'Function name is required and must be a non-empty string',
        severity: 'error'
      });
    }
  }

  private validateMemorySize(value: any, errors: ValidationError[]): void {
    if (typeof value !== 'number' || value < 128 || value > 10240 || value % 64 !== 0) {
      errors.push({
        field: 'memorySize',
        message: 'Memory size must be a number between 128 and 10240 MB, in multiples of 64',
        severity: 'error'
      });
    }
  }

  private validateTimeoutSeconds(value: any, errors: ValidationError[]): void {
    if (typeof value !== 'number' || value < 1 || value > 900) {
      errors.push({
        field: 'timeoutSeconds',
        message: 'Timeout must be a number between 1 and 900 seconds',
        severity: 'error'
      });
    }
  }
}
