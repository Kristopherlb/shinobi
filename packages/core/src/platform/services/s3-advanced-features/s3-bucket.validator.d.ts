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
export declare class S3BucketValidator {
    private context;
    private config;
    constructor(context: ComponentContext, config: any);
    /**
     * Validates the S3 bucket configuration
     */
    validate(): ValidationResult;
    private validateBucketName;
    private validateEncryption;
    private validateSecurity;
    private validateCompliance;
    private validateLifecycleRules;
    private validateMonitoring;
    private validateFrameworkCompliance;
}
//# sourceMappingURL=s3-bucket.validator.d.ts.map