/**
 * Migration Reporter
 * Generates comprehensive migration reports and documentation
 */
import { Logger } from '../core-engine/logger.ts';
import { StackAnalysisResult } from './cloudformation-analyzer.ts';
import { ResourceMappingResult } from './resource-mapper.ts';
import { MigrationValidationResult } from './migration-validator.ts';
import { MigrationOptions } from './migration-engine.ts';
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