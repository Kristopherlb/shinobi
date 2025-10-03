/**
 * Concrete Binder Strategy Implementations
 *
 * PURPOSE: CDK-specific infrastructure code generation
 * - Generates actual CDK constructs and AWS infrastructure
 * - Creates IAM policies, security groups, environment variables
 * - Works with real CDK constructs (lambda.Function, sqs.Queue, etc.)
 * - Most sophisticated layer - handles actual deployment
 *
 * Architecture Layer: Infrastructure generation
 * Above: Platform Binders (validation), Core-Engine (generic logic)
 * Below: Direct CDK synthesis
 */
import { IBinderStrategy, BindingContext, BindingResult } from '../../platform/contracts/platform-binding-trigger-spec.ts';
/**
 * Enhanced Lambda to SQS binding with enterprise security
 */
export declare class LambdaToSqsBinderStrategy implements IBinderStrategy {
    canHandle(sourceType: string, targetCapability: string): boolean;
    getCompatibilityMatrix(): any[];
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
export declare class LambdaToRdsBinderStrategy implements IBinderStrategy {
    canHandle(sourceType: string, targetCapability: string): boolean;
    getCompatibilityMatrix(): any[];
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
export declare class LambdaToS3BucketBinderStrategy implements IBinderStrategy {
    canHandle(sourceType: string, targetCapability: string): boolean;
    getCompatibilityMatrix(): any[];
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
//# sourceMappingURL=concrete-binders.d.ts.map