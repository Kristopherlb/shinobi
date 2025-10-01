/**
 * Tagging Enforcement Service
 *
 * Enforces tagging standards and data classification requirements
 * across all platform components and resources.
 */
import { ComponentType, ComplianceFramework } from '../contracts/bindings.js';
export interface TaggingConfig {
    service: string;
    environment: string;
    owner: string;
    complianceFramework: ComplianceFramework;
    dataClassification?: 'public' | 'internal' | 'confidential' | 'pii';
    sspId?: string;
    customTags?: Record<string, string>;
}
export interface TagValidationResult {
    valid: boolean;
    missingTags: string[];
    invalidTags: string[];
    errors: string[];
    warnings: string[];
}
export interface ResourceTags {
    [key: string]: string;
}
export declare class TaggingEnforcementService {
    private controlMappingService;
    constructor();
    /**
     * Apply compliance tags to a resource
     */
    applyComplianceTags(componentType: ComponentType, componentId: string, config: TaggingConfig): ResourceTags;
    /**
     * Validate resource tags
     */
    validateTags(componentType: ComponentType, tags: ResourceTags, config: TaggingConfig): TagValidationResult;
    /**
     * Validate specific tag values
     */
    private validateTagValues;
    /**
     * Generate tagging policy for a component
     */
    generateTaggingPolicy(componentType: ComponentType, config: TaggingConfig): {
        requiredTags: string[];
        tagValues: Record<string, string>;
        validationRules: string[];
    };
    /**
     * Generate validation rules for tags
     */
    private generateValidationRules;
    /**
     * Check if data classification is required for a component
     */
    isDataClassificationRequired(componentType: ComponentType): boolean;
    /**
     * Get valid data classification values
     */
    getValidDataClassifications(): string[];
    /**
     * Validate data classification value
     */
    validateDataClassification(value: string): boolean;
    /**
     * Generate CDK tagging configuration
     */
    generateCDKTaggingConfig(componentType: ComponentType, componentId: string, config: TaggingConfig): any;
}
//# sourceMappingURL=tagging-enforcement.d.ts.map