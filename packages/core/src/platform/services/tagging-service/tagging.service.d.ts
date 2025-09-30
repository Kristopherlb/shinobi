/**
 * Tagging Service
 *
 * Provides standardized tagging functionality for platform components and services.
 * Implements the Platform Tagging Standard v1.0.
 */
import { IConstruct } from 'constructs';
import { GovernanceMetadata } from '../governance';
/**
 * Context information needed for building standard tags
 */
export interface TaggingContext {
    serviceName: string;
    serviceLabels?: Record<string, string>;
    componentName: string;
    componentType: string;
    environment: string;
    region?: string;
    accountId?: string;
    complianceFramework?: string;
    tags?: Record<string, string>;
    governance?: GovernanceMetadata;
    standardTagOverrides?: Record<string, string>;
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
    private resolveString;
    private resolveBooleanString;
}
/**
 * Default tagging service instance
 */
export declare const defaultTaggingService: TaggingService;
//# sourceMappingURL=tagging.service.d.ts.map