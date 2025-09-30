/**
 * S3 Bucket Component Validator
 * 
 * Provides comprehensive validation for S3 bucket configurations including
 * security, compliance, and operational requirements.
 */

import { ComponentContext } from '@shinobi/core';

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  remediation?: string;
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  remediation?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  complianceScore: number;
  frameworkCompliance: Record<string, boolean>;
}

export class S3BucketValidator {
  private context: ComponentContext;
  private config: any;

  constructor(context: ComponentContext, config: any) {
    this.context = context;
    this.config = config;
  }

  /**
   * Validates the S3 bucket configuration
   */
  public validate(): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let complianceScore = 100;

    // Core configuration validation
    this.validateBucketName(errors, warnings);
    this.validateEncryption(errors, warnings);
    this.validateSecurity(errors, warnings);
    this.validateCompliance(errors, warnings);
    this.validateLifecycleRules(errors, warnings);
    this.validateMonitoring(errors, warnings);

    // Framework-specific validation
    const frameworkCompliance = this.validateFrameworkCompliance(errors, warnings);

    // Calculate compliance score
    complianceScore = Math.max(0, 100 - (errors.length * 15) - (warnings.length * 5));

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      complianceScore,
      frameworkCompliance
    };
  }

  private validateBucketName(errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (this.config.bucketName) {
      const name = this.config.bucketName;

      // Length validation
      if (name.length < 3) {
        errors.push({
          field: 'bucketName',
          code: 'BUCKET_NAME_TOO_SHORT',
          message: 'Bucket name must be at least 3 characters long',
          remediation: 'Use a bucket name with at least 3 characters'
        });
      }

      if (name.length > 63) {
        errors.push({
          field: 'bucketName',
          code: 'BUCKET_NAME_TOO_LONG',
          message: 'Bucket name must not exceed 63 characters',
          remediation: 'Shorten the bucket name to 63 characters or less'
        });
      }

      // Character validation
      if (!/^[a-z0-9.-]+$/.test(name)) {
        errors.push({
          field: 'bucketName',
          code: 'BUCKET_NAME_INVALID_CHARS',
          message: 'Bucket name can only contain lowercase letters, numbers, dots, and hyphens',
          remediation: 'Use only lowercase letters, numbers, dots, and hyphens in bucket name'
        });
      }

      // Consecutive dots validation
      if (name.includes('..')) {
        errors.push({
          field: 'bucketName',
          code: 'BUCKET_NAME_CONSECUTIVE_DOTS',
          message: 'Bucket name cannot contain consecutive dots',
          remediation: 'Remove consecutive dots from bucket name'
        });
      }

      // IP address validation
      if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) {
        errors.push({
          field: 'bucketName',
          code: 'BUCKET_NAME_IP_ADDRESS',
          message: 'Bucket name cannot be formatted as an IP address',
          remediation: 'Use a non-IP address format for bucket name'
        });
      }

      // Start/end validation
      if (name.startsWith('.') || name.endsWith('.')) {
        errors.push({
          field: 'bucketName',
          code: 'BUCKET_NAME_START_END_DOT',
          message: 'Bucket name cannot start or end with a dot',
          remediation: 'Remove leading and trailing dots from bucket name'
        });
      }
    }
  }

  private validateEncryption(errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (this.config.encryption) {
      const encryption = this.config.encryption;

      if (encryption.type === 'KMS') {
        // KMS validation
        if (!encryption.kmsKeyArn) {
          warnings.push({
            field: 'encryption.kmsKeyArn',
            code: 'KMS_KEY_NOT_SPECIFIED',
            message: 'KMS encryption selected but no KMS key ARN provided',
            remediation: 'Either provide a KMS key ARN or the component will create a managed key'
          });
        } else {
          // Validate KMS key ARN format
          if (!/^arn:aws:kms:[a-z0-9-]+:[0-9]{12}:key\/[a-f0-9-]{36}$/.test(encryption.kmsKeyArn)) {
            errors.push({
              field: 'encryption.kmsKeyArn',
              code: 'INVALID_KMS_KEY_ARN',
              message: 'Invalid KMS key ARN format',
              remediation: 'Provide a valid KMS key ARN in the format: arn:aws:kms:region:account:key/key-id'
            });
          }
        }
      }
    } else {
      warnings.push({
        field: 'encryption',
        code: 'ENCRYPTION_NOT_SPECIFIED',
        message: 'No encryption configuration provided',
        remediation: 'Configure encryption for data protection'
      });
    }
  }

  private validateSecurity(errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (this.config.security) {
      const security = this.config.security;

      // Public access validation
      if (this.config.public === true && security.blockPublicAccess !== false) {
        warnings.push({
          field: 'security.blockPublicAccess',
          code: 'PUBLIC_ACCESS_CONFLICT',
          message: 'Public access enabled but block public access not explicitly disabled',
          remediation: 'Set security.blockPublicAccess to false when enabling public access'
        });
      }

      // MFA delete validation
      if (security.requireMfaDelete && this.config.versioning !== true) {
        errors.push({
          field: 'security.requireMfaDelete',
          code: 'MFA_DELETE_REQUIRES_VERSIONING',
          message: 'MFA delete requires bucket versioning to be enabled',
          remediation: 'Enable versioning when requiring MFA delete'
        });
      }

      // Secure transport validation
      if (security.requireSecureTransport === false) {
        warnings.push({
          field: 'security.requireSecureTransport',
          code: 'SECURE_TRANSPORT_DISABLED',
          message: 'Secure transport (HTTPS) requirement is disabled',
          remediation: 'Consider enabling secure transport for data protection'
        });
      }
    }
  }

  private validateCompliance(errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (this.config.compliance) {
      const compliance = this.config.compliance;

      // Object Lock validation
      if (compliance.objectLock?.enabled) {
        if (this.config.versioning !== true) {
          errors.push({
            field: 'compliance.objectLock.enabled',
            code: 'OBJECT_LOCK_REQUIRES_VERSIONING',
            message: 'Object Lock requires bucket versioning to be enabled',
            remediation: 'Enable versioning when using Object Lock'
          });
        }

        if (!compliance.objectLock.retentionDays || compliance.objectLock.retentionDays < 1) {
          errors.push({
            field: 'compliance.objectLock.retentionDays',
            code: 'OBJECT_LOCK_INVALID_RETENTION',
            message: 'Object Lock retention days must be at least 1',
            remediation: 'Set retention days to at least 1 for Object Lock'
          });
        }
      }

      // Audit logging validation
      if (compliance.auditLogging) {
        if (compliance.auditBucketRetentionDays && compliance.auditBucketRetentionDays < 30) {
          warnings.push({
            field: 'compliance.auditBucketRetentionDays',
            code: 'AUDIT_RETENTION_TOO_SHORT',
            message: 'Audit bucket retention is less than 30 days',
            remediation: 'Consider longer retention for compliance requirements'
          });
        }
      }
    }
  }

  private validateLifecycleRules(errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (this.config.lifecycleRules) {
      const rules = this.config.lifecycleRules;

      rules.forEach((rule: any, index: number) => {
        // Rule ID validation
        if (!rule.id || rule.id.trim().length === 0) {
          errors.push({
            field: `lifecycleRules[${index}].id`,
            code: 'LIFECYCLE_RULE_ID_REQUIRED',
            message: 'Lifecycle rule ID is required',
            remediation: 'Provide a unique ID for each lifecycle rule'
          });
        }

        // Transitions validation
        if (rule.transitions) {
          rule.transitions.forEach((transition: any, transIndex: number) => {
            if (transition.transitionAfter < 1) {
              errors.push({
                field: `lifecycleRules[${index}].transitions[${transIndex}].transitionAfter`,
                code: 'INVALID_TRANSITION_DAYS',
                message: 'Transition days must be at least 1',
                remediation: 'Set transition days to at least 1'
              });
            }
          });
        }

        // Expiration validation
        if (rule.expiration && rule.expiration.days < 1) {
          errors.push({
            field: `lifecycleRules[${index}].expiration.days`,
            code: 'INVALID_EXPIRATION_DAYS',
            message: 'Expiration days must be at least 1',
            remediation: 'Set expiration days to at least 1'
          });
        }
      });
    }
  }

  private validateMonitoring(errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (this.config.monitoring?.enabled) {
      const monitoring = this.config.monitoring;

      if (monitoring.clientErrorThreshold && monitoring.clientErrorThreshold < 0) {
        errors.push({
          field: 'monitoring.clientErrorThreshold',
          code: 'INVALID_CLIENT_ERROR_THRESHOLD',
          message: 'Client error threshold must be non-negative',
          remediation: 'Set client error threshold to 0 or higher'
        });
      }

      if (monitoring.serverErrorThreshold && monitoring.serverErrorThreshold < 0) {
        errors.push({
          field: 'monitoring.serverErrorThreshold',
          code: 'INVALID_SERVER_ERROR_THRESHOLD',
          message: 'Server error threshold must be non-negative',
          remediation: 'Set server error threshold to 0 or higher'
        });
      }
    }
  }

  private validateFrameworkCompliance(errors: ValidationError[], warnings: ValidationWarning[]): Record<string, boolean> {
    const compliance: Record<string, boolean> = {
      commercial: true,
      fedrampModerate: true,
      fedrampHigh: true
    };

    // Commercial compliance
    if (this.context.complianceFramework === 'commercial') {
      // Basic requirements
      if (!this.config.encryption) {
        compliance.commercial = false;
        warnings.push({
          field: 'encryption',
          code: 'COMMERCIAL_ENCRYPTION_RECOMMENDED',
          message: 'Encryption is recommended for commercial environments',
          remediation: 'Enable encryption for data protection'
        });
      }

      if (this.config.security?.blockPublicAccess !== false && this.config.public === true) {
        compliance.commercial = false;
        errors.push({
          field: 'security.blockPublicAccess',
          code: 'COMMERCIAL_PUBLIC_ACCESS_BLOCK',
          message: 'Public access must be explicitly allowed for public buckets',
          remediation: 'Set security.blockPublicAccess to false for public buckets'
        });
      }
    }

    // FedRAMP Moderate compliance
    if (this.context.complianceFramework === 'fedramp-moderate') {
      // Encryption requirement
      if (!this.config.encryption || this.config.encryption.type !== 'KMS') {
        compliance.fedrampModerate = false;
        errors.push({
          field: 'encryption.type',
          code: 'FEDRAMP_MODERATE_KMS_REQUIRED',
          message: 'FedRAMP Moderate requires KMS encryption',
          remediation: 'Set encryption.type to KMS for FedRAMP Moderate compliance'
        });
      }

      // Audit logging requirement
      if (!this.config.compliance?.auditLogging) {
        compliance.fedrampModerate = false;
        errors.push({
          field: 'compliance.auditLogging',
          code: 'FEDRAMP_MODERATE_AUDIT_LOGGING_REQUIRED',
          message: 'FedRAMP Moderate requires audit logging',
          remediation: 'Enable compliance.auditLogging for FedRAMP Moderate compliance'
        });
      }

      // MFA delete requirement
      if (!this.config.security?.requireMfaDelete) {
        compliance.fedrampModerate = false;
        errors.push({
          field: 'security.requireMfaDelete',
          code: 'FEDRAMP_MODERATE_MFA_DELETE_REQUIRED',
          message: 'FedRAMP Moderate requires MFA delete',
          remediation: 'Enable security.requireMfaDelete for FedRAMP Moderate compliance'
        });
      }
    }

    // FedRAMP High compliance
    if (this.context.complianceFramework === 'fedramp-high') {
      // All FedRAMP Moderate requirements plus additional ones
      compliance.fedrampHigh = compliance.fedrampModerate;

      // Extended audit retention
      if (this.config.compliance?.auditLogging &&
        this.config.compliance.auditBucketRetentionDays &&
        this.config.compliance.auditBucketRetentionDays < 2555) {
        compliance.fedrampHigh = false;
        errors.push({
          field: 'compliance.auditBucketRetentionDays',
          code: 'FEDRAMP_HIGH_AUDIT_RETENTION_REQUIRED',
          message: 'FedRAMP High requires audit retention of at least 2555 days',
          remediation: 'Set auditBucketRetentionDays to at least 2555 for FedRAMP High compliance'
        });
      }

      // Object Lock requirement for sensitive data
      if (!this.config.compliance?.objectLock?.enabled) {
        warnings.push({
          field: 'compliance.objectLock.enabled',
          code: 'FEDRAMP_HIGH_OBJECT_LOCK_RECOMMENDED',
          message: 'Object Lock is recommended for FedRAMP High compliance',
          remediation: 'Consider enabling Object Lock for enhanced data protection'
        });
      }
    }

    return compliance;
  }
}
