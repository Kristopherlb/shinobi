/**
 * VPC Component
 *
 * Defines network isolation with compliance-aware networking rules.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { BaseComponent } from '../../../src/platform/contracts/component';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from '../../../src/platform/contracts/component-interfaces';
/**
 * VPC Component implementing Component API Contract v1.1
 */
export declare class VpcComponent extends BaseComponent {
    private vpc?;
    private flowLogGroup?;
    private flowLogRole?;
    private config;
    private logger;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create VPC with compliance hardening
     * Follows the 6-step synthesis process defined in Platform Component API Contract v1.1
     */
    synth(): void;
    /**
     * Get the capabilities this component provides
     */
    getCapabilities(): ComponentCapabilities;
    /**
     * Get the component type identifier
     */
    getType(): string;
    /**
     * Create the VPC with appropriate subnet configuration
     */
    private createVpc;
    /**
     * Create VPC Flow Logs for network monitoring
     */
    private createVpcFlowLogsIfEnabled;
    /**
     * Create VPC Endpoints based on configuration
     */
    private createVpcEndpointsIfNeeded;
    /**
     * Apply compliance-specific hardening
     */
    private applyComplianceHardening;
    private applyCommercialHardening;
    private applyFedrampModerateHardening;
    private applyFedrampHighHardening;
    /**
     * Create default security groups with least privilege
     */
    private createDefaultSecurityGroups;
    /**
     * Create compliance-grade Network ACLs
     */
    private createComplianceNacls;
    /**
     * Create high-security Network ACLs for FedRAMP High
     */
    private createHighSecurityNacls;
    /**
     * Restrict the default security group
     */
    private restrictDefaultSecurityGroup;
    /**
     * Build subnet configuration based on compliance requirements
     */
    private buildSubnetConfiguration;
    /**
     * Build VPC capability data shape
     */
    private buildVpcCapability;
    /**
     * Helper methods for compliance decisions
     */
    private isComplianceFramework;
    /**
     * Maps days to CloudWatch Logs retention enum
     */
    private mapDaysToRetention;
    /**
     * Apply standard platform tags to VPC and related resources
     */
    private applyVpcTags;
    /**
     * Apply standard tags to all taggable resources
     */
    private applyStandardTagsToResources;
    /**
     * Register constructs for patches.ts access
     */
    private registerConstructs;
    /**
     * Register capabilities for binding
     */
    private registerCapabilities;
}
