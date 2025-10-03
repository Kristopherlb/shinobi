/**
 * Migration Validator
 * Phase 4: Validates migration and compares templates for zero-diff guarantee
 */
import { Logger } from '../core-engine/logger.ts';
import { MigrationOptions } from './migration-engine.ts';
export interface MigrationValidationResult {
    success: boolean;
    diffResult: 'NO CHANGES' | 'HAS CHANGES';
    planOutput: string;
    diffOutput: string;
    validationErrors: string[];
    warnings: string[];
    templateComparison: TemplateComparison;
}
export interface TemplateComparison {
    originalResourceCount: number;
    migratedResourceCount: number;
    matchingResources: number;
    missingResources: string[];
    extraResources: string[];
    modifiedResources: Array<{
        logicalId: string;
        differences: string[];
    }>;
}
/**
 * Validates the migration by comparing templates and running platform validation
 */
export declare class MigrationValidator {
    private logger;
    constructor(logger: Logger);
    validateMigration(migratedProjectPath: string, originalTemplatePath: string, options: MigrationOptions): Promise<MigrationValidationResult>;
    private runPlatformPlan;
    private generateMigratedTemplate;
    private compareTemplates;
    private compareResources;
    private diffValues;
    private diffArrays;
    private isPrimitive;
    private isPlainObject;
    private describeType;
    private compareByStableString;
    private buildValueCounts;
    private stableStringify;
    private formatValue;
    private runCdkDiff;
    private analyzeDiffResults;
    private areChangesNonFunctional;
    /**
     * Generate detailed validation report
     */
    generateValidationReport(result: MigrationValidationResult): string[];
}
//# sourceMappingURL=migration-validator.d.ts.map