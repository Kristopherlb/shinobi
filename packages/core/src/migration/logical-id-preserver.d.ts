/**
 * Logical ID Preserver
 * Phase 3: Generates logical ID mapping to preserve CloudFormation resource state
 */
import { Logger } from '../core-engine/logger';
import { StackAnalysisResult } from './cloudformation-analyzer';
import { ResourceMappingResult } from './resource-mapper';
export interface LogicalIdPreservationMapping {
    originalId: string;
    newId: string;
    resourceType: string;
    componentName: string;
    componentType: string;
    preservationStrategy: 'exact-match' | 'hash-suffix' | 'naming-convention';
}
export interface LogicalIdPreservationResult {
    logicalIdMap: Record<string, string>;
    mappings: LogicalIdPreservationMapping[];
    preservationStrategies: Record<string, number>;
    warnings: string[];
}
/**
 * Generates logical ID mappings to ensure CloudFormation state preservation
 */
export declare class LogicalIdPreserver {
    private logger;
    constructor(logger: Logger);
    generateLogicalIdMap(analysisResult: StackAnalysisResult, mappingResult: ResourceMappingResult): Promise<LogicalIdPreservationResult>;
    private generateExpectedLogicalId;
    private normalizeComponentName;
    private getResourceSuffix;
    private determinePreservationStrategy;
    private hasCdkHashSuffix;
    private detectLogicalIdConflicts;
    /**
     * Generate CDK Aspect code for applying logical ID overrides
     */
    generateCdkAspectCode(preservationResult: LogicalIdPreservationResult): string;
    /**
     * Generate instructions for manual logical ID preservation
     */
    generatePreservationInstructions(preservationResult: LogicalIdPreservationResult): string[];
    /**
     * Validate that logical ID preservation will work correctly
     */
    validatePreservation(preservationResult: LogicalIdPreservationResult, originalTemplate: any, newTemplate: any): {
        valid: boolean;
        issues: string[];
    };
    private isStatefulResourceType;
}
//# sourceMappingURL=logical-id-preserver.d.ts.map