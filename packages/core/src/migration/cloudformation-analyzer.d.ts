/**
 * CloudFormation Template Analyzer
 * Phase 1: Analyzes existing CDK project and extracts resource inventory
 */
import { Logger } from '../core-engine/logger';
export interface CloudFormationResource {
    logicalId: string;
    type: string;
    properties: any;
    metadata?: any;
    dependsOn?: string[];
}
export interface StackAnalysisResult {
    stackName: string;
    templatePath: string;
    template: any;
    resources: CloudFormationResource[];
    outputs: Record<string, any>;
    parameters: Record<string, any>;
    metadata: any;
}
/**
 * Analyzes existing CDK projects by synthesizing and parsing CloudFormation templates
 */
export declare class CloudFormationAnalyzer {
    private logger;
    constructor(logger: Logger);
    /**
     * Analyze an existing CDK stack and extract complete resource inventory
     */
    analyzeStack(cdkProjectPath: string, stackName: string): Promise<StackAnalysisResult>;
    private validateCdkProject;
    private synthesizeStack;
    private extractResources;
    private sortResourcesByDependency;
    /**
     * Analyze resource relationships and extract binding patterns
     */
    analyzeResourceRelationships(resources: CloudFormationResource[]): Array<{
        source: string;
        target: string;
        relationship: string;
        evidence: any;
    }>;
    private analyzeIAMRelationships;
    private analyzeNetworkRelationships;
    private analyzeDataRelationships;
}
//# sourceMappingURL=cloudformation-analyzer.d.ts.map