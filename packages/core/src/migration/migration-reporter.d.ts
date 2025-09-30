/**
 * Migration Reporter
 * Generates comprehensive migration reports and documentation
 */
import { Logger } from '../core-engine/logger';
import { StackAnalysisResult } from './cloudformation-analyzer';
import { ResourceMappingResult } from './resource-mapper';
import { MigrationValidationResult } from './migration-validator';
import { MigrationOptions } from './migration-engine';
/**
 * Generates detailed migration reports and documentation
 */
export declare class MigrationReporter {
    private logger;
    constructor(logger: Logger);
    generateReport(outputDir: string, analysisResult: StackAnalysisResult, mappingResult: ResourceMappingResult, validationResult: MigrationValidationResult, options: MigrationOptions): Promise<string>;
    private buildReport;
    private generateExecutiveSummary;
    private generateSuccessfulComponentsList;
    private generateUnmappableResourcesList;
    private generateOriginalInventory;
    private generateMappingResults;
    private generateValidationResults;
    private generateNextSteps;
    private generateLogicalIdDetails;
    private generateValidationDetails;
}
//# sourceMappingURL=migration-reporter.d.ts.map