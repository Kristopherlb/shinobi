/**
 * S3 Bucket configuration builder.
 *
 * Implements the shared ConfigBuilder precedence chain so that
 * all deployment defaults are sourced from the platform configuration
 * files in /config and developer overrides in service manifests.
 */
import { ConfigBuilder, ConfigBuilderContext, ComponentConfigSchema } from '@shinobi/core';
export type S3BucketEncryptionType = 'AES256' | 'KMS';
export type S3BucketStorageClass = 'STANDARD_IA' | 'ONEZONE_IA' | 'GLACIER' | 'DEEP_ARCHIVE' | 'GLACIER_IR';
export interface S3BucketLifecycleTransition {
    storageClass: S3BucketStorageClass;
    transitionAfter: number;
}
export interface S3BucketLifecycleRule {
    id: string;
    enabled: boolean;
    prefix?: string;
    tags?: Record<string, string>;
    transitions?: S3BucketLifecycleTransition[];
    expiration?: {
        days: number;
        expiredObjectDeleteMarker?: boolean;
    };
    abortIncompleteMultipartUpload?: {
        daysAfterInitiation: number;
    };
}
export interface S3BucketEncryptionConfig {
    type?: S3BucketEncryptionType;
    kmsKeyArn?: string;
}
export interface S3BucketSecurityConfig {
    blockPublicAccess?: boolean;
    requireSecureTransport?: boolean;
    requireMfaDelete?: boolean;
    denyDeleteActions?: boolean;
    tools?: {
        clamavScan?: boolean;
    };
}
export interface S3BucketObjectLockConfig {
    enabled: boolean;
    mode?: 'GOVERNANCE' | 'COMPLIANCE';
    retentionDays?: number;
}
export interface S3BucketComplianceConfig {
    auditLogging?: boolean;
    auditBucketName?: string;
    auditBucketRetentionDays?: number;
    auditBucketObjectLock?: S3BucketObjectLockConfig;
    auditBucketLifecycleRules?: S3BucketLifecycleRule[];
    objectLock?: S3BucketObjectLockConfig;
}
export interface S3BucketMonitoringConfig {
    enabled?: boolean;
    clientErrorThreshold?: number;
    serverErrorThreshold?: number;
}
export interface S3BucketWebsiteConfig {
    enabled?: boolean;
    indexDocument?: string;
    errorDocument?: string;
}
export interface S3BucketConfig {
    bucketName?: string;
    public?: boolean;
    website?: S3BucketWebsiteConfig;
    eventBridgeEnabled?: boolean;
    versioning?: boolean;
    encryption?: S3BucketEncryptionConfig;
    lifecycleRules?: S3BucketLifecycleRule[];
    security?: S3BucketSecurityConfig;
    compliance?: S3BucketComplianceConfig;
    monitoring?: S3BucketMonitoringConfig;
}
export declare const S3_BUCKET_CONFIG_SCHEMA: ComponentConfigSchema;
export declare class S3BucketComponentConfigBuilder extends ConfigBuilder<S3BucketConfig> {
    constructor(builderContext: ConfigBuilderContext);
    protected getHardcodedFallbacks(): Partial<S3BucketConfig>;
    protected getComplianceFrameworkDefaults(): Partial<S3BucketConfig>;
}
//# sourceMappingURL=s3-bucket.builder.d.ts.map