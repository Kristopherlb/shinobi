/**
 * Logging Configuration Interface
 * 
 * Defines the structure for centralized logging configuration
 * sourced from platform configuration files.
 */

export interface LoggingConfig {
  retentionPolicies: {
    default: LogRetentionPolicy;
  };
  securityClassifications: {
    default: LogSecurityClassification;
    lambda: LogSecurityClassification;
    ecs: LogSecurityClassification;
    rds: LogSecurityClassification;
    s3: LogSecurityClassification;
    sqs: LogSecurityClassification;
    vpc: LogSecurityClassification;
  };
  samplingRates: {
    ERROR: number;
    WARN: number;
    INFO: number;
    DEBUG: number;
    TRACE: number;
  };
  logLevels: {
    default: LogLevel;
    lambda: LogLevel;
    ecs: LogLevel;
    rds: LogLevel;
    s3: LogLevel;
    sqs: LogLevel;
    vpc: LogLevel;
  };
  redactionRules: {
    base: string[];
    phi: string[];
    cui: string[];
  };
  correlationFields: string[];
}

export interface LogRetentionPolicy {
  retentionDays: number;
  immutable: boolean;
  encryptionLevel: 'standard' | 'enhanced' | 'customer-managed';
  auditRequired: boolean;
  maxSamplingRate: number;
}

export type LogSecurityClassification = 'public' | 'internal' | 'confidential' | 'cui' | 'phi';
export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE';
