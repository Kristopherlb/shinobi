/**
 * Compliance Control Mapping Service
 *
 * Maps components to NIST/FedRAMP controls based on component type and framework.
 * Provides compliance plan generation and control validation.
 */
import { ComponentType, ComplianceFramework } from '../contracts/bindings.ts';
export interface NISTControl {
    id: string;
    title: string;
    description: string;
    category: 'AC' | 'AT' | 'AU' | 'CA' | 'CM' | 'CP' | 'IA' | 'IR' | 'MA' | 'MP' | 'PE' | 'PL' | 'PS' | 'RA' | 'SA' | 'SC' | 'SI';
    severity: 'low' | 'moderate' | 'high';
    implementation_guidance: string[];
    assessment_procedures: string[];
}
export interface ComponentControlMapping {
    componentType: ComponentType;
    controls: string[];
    dataClassification?: 'public' | 'internal' | 'confidential' | 'pii';
    requiredTags: string[];
    complianceRules: ComplianceRule[];
}
export interface ComplianceRule {
    ruleId: string;
    description: string;
    severity: 'error' | 'warning' | 'info';
    validation: (component: any) => boolean;
    remediation?: string;
}
export interface CompliancePlan {
    componentId: string;
    componentType: ComponentType;
    framework: ComplianceFramework;
    controls: NISTControl[];
    dataClassification?: string;
    requiredTags: Record<string, string>;
    complianceRules: ComplianceRule[];
    generatedAt: string;
    expiresAt: string;
}
export declare class ComplianceControlMappingService {
    /**
     * Get control mapping for a component type
     */
    getControlMapping(componentType: ComponentType): ComponentControlMapping | undefined;
    /**
     * Get NIST control definition
     */
    getNISTControl(controlId: string): NISTControl | undefined;
    /**
     * Generate compliance plan for a component
     */
    generateCompliancePlan(componentId: string, componentType: ComponentType, framework: ComplianceFramework, componentConfig: any): CompliancePlan;
    /**
     * Generate required tags for a component
     */
    private generateRequiredTags;
    /**
     * Validate component compliance
     */
    validateCompliance(component: any, framework: ComplianceFramework): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Get all supported component types
     */
    getSupportedComponentTypes(): ComponentType[];
    /**
     * Get controls for a specific framework
     */
    getControlsForFramework(framework: ComplianceFramework): NISTControl[];
}
//# sourceMappingURL=compliance-control-mapping.d.ts.map