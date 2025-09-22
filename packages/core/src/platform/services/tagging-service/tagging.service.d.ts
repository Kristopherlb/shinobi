/**
 * Tagging Service
 *
 * Provides standardized tagging functionality for platform components and services.
 * Implements the Platform Tagging Standard v1.0.
 */
import { IConstruct } from 'constructs';
/**
 * Context information needed for building standard tags
 */
export interface TaggingContext {
    serviceName: string;
    serviceLabels?: Record<string, string>;
    componentName: string;
    componentType: string;
    environment: string;
    complianceFramework: string;
    region?: string;
    accountId?: string;
}
/**
 * Tagging service interface
 */
export interface ITaggingService {
    buildStandardTags(context: TaggingContext): Record<string, string>;
    applyStandardTags(resource: IConstruct, context: TaggingContext, additionalTags?: Record<string, string>): void;
}
/**
 * Standard tagging service implementation
 */
export declare class TaggingService implements ITaggingService {
    /**
     * Build standard tags based on context
     * Implements Platform Tagging Standard v1.0
     */
    buildStandardTags(context: TaggingContext): Record<string, string>;
    /**
     * Apply standard tags to a CDK construct
     */
    applyStandardTags(resource: IConstruct, context: TaggingContext, additionalTags?: Record<string, string>): void;
    /**
     * Get data classification based on compliance framework
     */
    private getDataClassification;
    /**
     * Get encryption requirement based on compliance framework
     */
    private getEncryptionRequired;
    /**
     * Get backup requirement based on compliance framework
     */
    private getBackupRequired;
    /**
     * Get monitoring level based on compliance framework
     */
    private getMonitoringLevel;
    /**
     * Get retention period based on compliance framework
     */
    private getRetentionPeriod;
}
/**
 * Default tagging service instance
 */
export declare const defaultTaggingService: TaggingService;
//# sourceMappingURL=tagging.service.d.ts.map