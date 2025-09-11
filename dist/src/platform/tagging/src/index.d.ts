/**
 * Platform Tagging Standard v1.0
 * Automatic governance and compliance tagging for all AWS resources
 */
export interface StandardTags {
    'platform:managed-by': string;
    'platform:component-type': string;
    'platform:component-name': string;
    'platform:environment': string;
    'platform:cost-center': string;
    'platform:owner': string;
    'platform:created-by': string;
    'platform:created-date': string;
    'compliance:framework': string;
    'compliance:classification': string;
    'compliance:retention-period': string;
    'governance:backup-policy': string;
    'governance:monitoring-level': string;
}
export interface CustomTags {
    [key: string]: string;
}
export interface TaggingContext {
    environment: string;
    costCenter: string;
    owner: string;
    complianceFramework?: 'fedramp-low' | 'fedramp-moderate' | 'fedramp-high' | 'pci-dss' | 'hipaa';
    componentType: string;
    componentName: string;
}
export declare class PlatformTagging {
    private readonly context;
    constructor(context: TaggingContext);
    /**
     * Generate standard platform tags that are automatically applied to all resources
     */
    generateStandardTags(): StandardTags;
    /**
     * Merge standard tags with custom tags, with validation
     */
    mergeTags(customTags?: CustomTags): Record<string, string>;
    /**
     * Get compliance classification based on framework
     */
    private getComplianceClassification;
    /**
     * Get retention period based on compliance requirements
     */
    private getRetentionPeriod;
    /**
     * Get backup policy based on compliance requirements
     */
    private getBackupPolicy;
    /**
     * Get monitoring level based on compliance requirements
     */
    private getMonitoringLevel;
}
