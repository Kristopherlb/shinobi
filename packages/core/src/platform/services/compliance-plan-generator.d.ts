/**
 * Compliance Plan Generator
 *
 * Generates and persists compliance plans for components,
 * including control mappings and audit information.
 */
import { ComponentType, ComplianceFramework } from '../contracts/bindings.ts';
import { CompliancePlan } from './compliance-control-mapping.ts';
export interface CompliancePlanConfig {
    outputDir: string;
    includeAuditTrail: boolean;
    includeControlDetails: boolean;
    includeTaggingPolicy: boolean;
}
export declare class CompliancePlanGenerator {
    private controlMappingService;
    private taggingService;
    constructor();
    /**
     * Generate and persist compliance plan for a component
     */
    generateCompliancePlan(componentId: string, componentType: ComponentType, framework: ComplianceFramework, componentConfig: any, config: CompliancePlanConfig): Promise<CompliancePlan>;
    /**
     * Persist compliance plan to file
     */
    private persistCompliancePlan;
    /**
     * Generate compliance summary for all components
     */
    generateComplianceSummary(components: Array<{
        id: string;
        type: ComponentType;
        framework: ComplianceFramework;
        config: any;
    }>, config: CompliancePlanConfig): Promise<{
        summary: {
            totalComponents: number;
            frameworks: Record<ComplianceFramework, number>;
            controls: Record<string, number>;
            dataClassifications: Record<string, number>;
        };
        components: Array<{
            id: string;
            type: ComponentType;
            framework: ComplianceFramework;
            controls: string[];
            dataClassification?: string;
            complianceStatus: 'compliant' | 'non-compliant' | 'partial';
        }>;
    }>;
    /**
     * Validate component manifest for compliance requirements
     */
    validateManifestCompliance(manifest: any, framework: ComplianceFramework): {
        valid: boolean;
        errors: string[];
        warnings: string[];
        missingDataClassifications: string[];
    };
    /**
     * Generate OPA policy for compliance validation
     */
    generateOPAPolicy(framework: ComplianceFramework): string;
    /**
     * Generate compliance report
     */
    generateComplianceReport(components: Array<{
        id: string;
        type: ComponentType;
        framework: ComplianceFramework;
        config: any;
    }>, config: CompliancePlanConfig): Promise<string>;
}
//# sourceMappingURL=compliance-plan-generator.d.ts.map