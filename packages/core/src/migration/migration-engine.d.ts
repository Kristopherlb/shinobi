/**
 * Platform Migration Engine
 * Implements the 4-phase migration workflow for CDK -> Platform conversion
 */
import { Logger } from '../core-engine/logger';
export interface MigrationOptions {
    cdkProjectPath: string;
    stackName: string;
    serviceName: string;
    outputPath: string;
    complianceFramework?: string;
    interactive?: boolean;
}
export interface MigrationResult {
    success: boolean;
    phase: string;
    resourcesFound: number;
    resourcesMapped: number;
    resourcesUnmappable: number;
    finalDiffResult: 'NO CHANGES' | 'HAS CHANGES';
    reportPath: string;
    generatedFiles: string[];
    unmappableResources: UnmappableResource[];
}
export interface UnmappableResource {
    logicalId: string;
    type: string;
    reason: string;
    cfnDefinition: any;
    suggestedAction: string;
}
/**
 * Main migration engine orchestrating the 4-phase process
 */
export declare class MigrationEngine {
    private logger;
    private analyzer;
    private mapper;
    private preserver;
    private validator;
    private reporter;
    constructor(logger: Logger);
    /**
     * Execute the complete 4-phase migration process
     */
    migrate(options: MigrationOptions): Promise<MigrationResult>;
    private createOutputDirectory;
    private generateFiles;
    private generatePatchesTemplate;
    private generateGitignoreTemplate;
    private copyDirectory;
}
//# sourceMappingURL=migration-engine.d.ts.map