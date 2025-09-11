/**
 * Concrete Binder Strategy Implementations
 * Enterprise-grade binding logic for different component combinations
 */
import { BinderStrategy, BindingContext, BindingResult } from '@platform/contracts';
/**
 * Enhanced Lambda to SQS binding with enterprise security
 */
export declare class LambdaToSqsBinderStrategy extends BinderStrategy {
    canHandle(sourceType: string, targetCapability: string): boolean;
    bind(context: BindingContext): BindingResult;
    /**
     * Grant Lambda access to SQS queue using CDK L2 methods
     */
    private grantSQSAccess;
    /**
     * Apply FedRAMP-specific security enhancements using CDK
     */
    private applyFedRAMPSecurityEnhancements;
    /**
     * Configure dead letter queue integration using CDK
     */
    private configureDeadLetterQueue;
}
/**
 * Enhanced Lambda to RDS binding with enterprise security
 */
export declare class LambdaToRdsBinderStrategy extends BinderStrategy {
    canHandle(sourceType: string, targetCapability: string): boolean;
    bind(context: BindingContext): BindingResult;
    /**
     * Grant Lambda access to the database using CDK L2 methods
     */
    private grantDatabaseAccess;
    /**
     * Enable IAM database authentication using CDK methods
     */
    private enableIamDatabaseAuth;
    /**
     * Apply FedRAMP-specific security enhancements using CDK
     */
    private applyFedRAMPSecurityEnhancements;
    /**
     * Build environment variables with tokenized values directly from CDK constructs
     */
    private buildEnvironmentVariables;
}
/**
 * Enhanced Lambda to S3 binding with enterprise security
 */
export declare class LambdaToS3BucketBinderStrategy extends BinderStrategy {
    canHandle(sourceType: string, targetCapability: string): boolean;
    bind(context: BindingContext): BindingResult;
    /**
     * Grant Lambda access to S3 bucket using CDK L2 methods
     */
    private grantS3Access;
    /**
     * Enable KMS encryption for S3 operations using CDK methods
     */
    private enableKMSEncryption;
    /**
     * Apply FedRAMP-specific security enhancements for S3 using CDK
     */
    private applyS3FedRAMPSecurityEnhancements;
    /**
     * Build environment variables with tokenized values directly from CDK constructs
     */
    private buildS3EnvironmentVariables;
}
