/**
 * Lambda to RDS Binder Strategy
 * Enterprise-grade binding with CDK L2 construct integration
 */
import { BindingContext, BindingResult, IBinderStrategy } from '@platform/contracts';
/**
 * Enhanced Lambda to RDS binding with enterprise security
 */
export declare class LambdaToRdsBinderStrategy implements IBinderStrategy {
    canHandle(sourceType: string, targetCapability: string): boolean;
    bind(context: BindingContext): BindingResult;
    /**
     * Grant Lambda access to the database using CDK L2 methods
     */
    private grantRDSAccess;
    /**
     * Configure VPC network access using CDK security groups
     */
    private configureNetworkAccess;
    /**
     * Apply FedRAMP-specific security enhancements using CDK
     */
    private applyFedRAMPSecurityEnhancements;
    /**
     * Configure SSL/TLS secure connection requirements
     */
    private configureSecureConnection;
    /**
     * Build secure connection string with proper SSL configuration
     */
    private buildConnectionString;
}
