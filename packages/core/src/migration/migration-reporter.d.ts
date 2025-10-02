/**
 * Migration Reporter
 * Generates comprehensive migration reports and documentation
 */
import { Logger } from '../core-engine/logger.js';
import { StackAnalysisResult } from './cloudformation-analyzer.js';
import { ResourceMappingResult } from './resource-mapper.js';
import { MigrationValidationResult } from './migration-validator.js';
import { MigrationOptions } from './migration-engine.js';
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