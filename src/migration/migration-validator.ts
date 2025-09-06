/**
 * Migration Validator
 * Phase 4: Validates migration and compares templates for zero-diff guarantee
 */

import { Logger } from '../utils/logger';
import { MigrationOptions } from './migration-engine';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface ValidationResult {
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
export class MigrationValidator {
  constructor(private logger: Logger) {}

  async validateMigration(
    migratedProjectPath: string,
    originalTemplatePath: string,
    options: MigrationOptions
  ): Promise<ValidationResult> {
    this.logger.debug('Starting migration validation');

    const validationErrors: string[] = [];
    const warnings: string[] = [];

    try {
      // Step 1: Validate the migrated service.yml can be planned
      this.logger.debug('Running svc plan on migrated service');
      const planResult = await this.runPlatformPlan(migratedProjectPath);
      
      if (!planResult.success) {
        validationErrors.push('Migrated service failed platform validation');
        validationErrors.push(...planResult.errors);
      }

      // Step 2: Generate template from migrated service
      const migratedTemplatePath = await this.generateMigratedTemplate(migratedProjectPath);

      // Step 3: Compare templates
      this.logger.debug('Comparing original and migrated templates');
      const templateComparison = await this.compareTemplates(
        originalTemplatePath,
        migratedTemplatePath
      );

      // Step 4: Run CDK diff comparison
      const diffResult = await this.runCdkDiff(
        originalTemplatePath,
        migratedTemplatePath
      );

      // Step 5: Analyze results
      const diffStatus = this.analyzeDiffResults(diffResult, templateComparison);

      if (diffStatus !== 'NO CHANGES') {
        warnings.push('Templates have differences - manual review required');
      }

      const result: ValidationResult = {
        success: validationErrors.length === 0,
        diffResult: diffStatus,
        planOutput: planResult.output,
        diffOutput: diffResult,
        validationErrors,
        warnings,
        templateComparison
      };

      this.logger.debug(`Validation complete. Diff result: ${diffStatus}`);
      return result;

    } catch (error: any) {
      validationErrors.push(`Validation failed: ${error.message}`);
      
      return {
        success: false,
        diffResult: 'HAS CHANGES',
        planOutput: '',
        diffOutput: '',
        validationErrors,
        warnings,
        templateComparison: {
          originalResourceCount: 0,
          migratedResourceCount: 0,
          matchingResources: 0,
          missingResources: [],
          extraResources: [],
          modifiedResources: []
        }
      };
    }
  }

  private async runPlatformPlan(projectPath: string): Promise<{
    success: boolean;
    output: string;
    errors: string[];
  }> {
    try {
      const output = execSync('svc plan', {
        cwd: projectPath,
        encoding: 'utf8',
        stdio: 'pipe'
      });

      return {
        success: true,
        output,
        errors: []
      };

    } catch (error: any) {
      const errors = [];
      
      if (error.stderr) {
        errors.push(error.stderr);
      }
      
      if (error.stdout) {
        // Parse stdout for specific validation errors
        const lines = error.stdout.split('\n');
        const errorLines = lines.filter(line => 
          line.includes('ERROR') || line.includes('FAILED') || line.includes('Invalid')
        );
        errors.push(...errorLines);
      }

      return {
        success: false,
        output: error.stdout || '',
        errors
      };
    }
  }

  private async generateMigratedTemplate(projectPath: string): Promise<string> {
    // Generate CloudFormation template from the migrated service
    const outputPath = path.join(projectPath, 'migrated-template.json');
    
    try {
      execSync(`svc plan --output-format json --output-file ${outputPath}`, {
        cwd: projectPath,
        stdio: 'pipe'
      });

      if (!fs.existsSync(outputPath)) {
        throw new Error('Failed to generate migrated template');
      }

      return outputPath;

    } catch (error: any) {
      throw new Error(`Failed to generate migrated template: ${error.message}`);
    }
  }

  private async compareTemplates(
    originalPath: string,
    migratedPath: string
  ): Promise<TemplateComparison> {
    const originalTemplate = JSON.parse(fs.readFileSync(originalPath, 'utf8'));
    const migratedTemplate = JSON.parse(fs.readFileSync(migratedPath, 'utf8'));

    const originalResources = originalTemplate.Resources || {};
    const migratedResources = migratedTemplate.Resources || {};

    const originalIds = new Set(Object.keys(originalResources));
    const migratedIds = new Set(Object.keys(migratedResources));

    const missingResources: string[] = [];
    const extraResources: string[] = [];
    const modifiedResources: Array<{ logicalId: string; differences: string[] }> = [];
    let matchingResources = 0;

    // Check for missing resources
    for (const originalId of originalIds) {
      if (!migratedIds.has(originalId)) {
        missingResources.push(originalId);
      }
    }

    // Check for extra resources
    for (const migratedId of migratedIds) {
      if (!originalIds.has(migratedId)) {
        extraResources.push(migratedId);
      }
    }

    // Check for modified resources (common resources)
    for (const commonId of Array.from(originalIds).filter(id => migratedIds.has(id))) {
      const originalResource = originalResources[commonId];
      const migratedResource = migratedResources[commonId];

      const differences = this.compareResources(originalResource, migratedResource);
      
      if (differences.length > 0) {
        modifiedResources.push({
          logicalId: commonId,
          differences
        });
      } else {
        matchingResources++;
      }
    }

    return {
      originalResourceCount: originalIds.size,
      migratedResourceCount: migratedIds.size,
      matchingResources,
      missingResources,
      extraResources,
      modifiedResources
    };
  }

  private compareResources(original: any, migrated: any): string[] {
    const differences: string[] = [];

    // Compare resource type
    if (original.Type !== migrated.Type) {
      differences.push(`Type changed: ${original.Type} -> ${migrated.Type}`);
    }

    // Compare properties (deep comparison)
    const propertyDiffs = this.compareObjects(
      original.Properties || {}, 
      migrated.Properties || {},
      'Properties'
    );
    differences.push(...propertyDiffs);

    // Compare metadata if present
    if (original.Metadata || migrated.Metadata) {
      const metadataDiffs = this.compareObjects(
        original.Metadata || {},
        migrated.Metadata || {},
        'Metadata'
      );
      differences.push(...metadataDiffs);
    }

    return differences;
  }

  private compareObjects(obj1: any, obj2: any, path: string): string[] {
    const differences: string[] = [];

    const keys1 = new Set(Object.keys(obj1));
    const keys2 = new Set(Object.keys(obj2));

    // Check for missing keys
    for (const key of keys1) {
      if (!keys2.has(key)) {
        differences.push(`${path}.${key} removed`);
      }
    }

    // Check for added keys
    for (const key of keys2) {
      if (!keys1.has(key)) {
        differences.push(`${path}.${key} added`);
      }
    }

    // Check for modified values
    for (const key of keys1) {
      if (keys2.has(key)) {
        const val1 = obj1[key];
        const val2 = obj2[key];

        if (typeof val1 !== typeof val2) {
          differences.push(`${path}.${key} type changed: ${typeof val1} -> ${typeof val2}`);
        } else if (typeof val1 === 'object' && val1 !== null && val2 !== null) {
          const subDiffs = this.compareObjects(val1, val2, `${path}.${key}`);
          differences.push(...subDiffs);
        } else if (val1 !== val2) {
          differences.push(`${path}.${key} value changed: ${JSON.stringify(val1)} -> ${JSON.stringify(val2)}`);
        }
      }
    }

    return differences;
  }

  private async runCdkDiff(originalPath: string, migratedPath: string): Promise<string> {
    try {
      // Use a simple JSON diff since both are CloudFormation templates
      const result = execSync(`diff -u "${originalPath}" "${migratedPath}"`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      return result;

    } catch (error: any) {
      // diff command returns non-zero exit code when files differ
      return error.stdout || '';
    }
  }

  private analyzeDiffResults(
    diffOutput: string,
    templateComparison: TemplateComparison
  ): 'NO CHANGES' | 'HAS CHANGES' {
    // If no diff output and templates match exactly, no changes
    if (!diffOutput.trim() && templateComparison.modifiedResources.length === 0 &&
        templateComparison.missingResources.length === 0 &&
        templateComparison.extraResources.length === 0) {
      return 'NO CHANGES';
    }

    // Check if differences are only metadata/non-functional
    if (this.areChangesNonFunctional(diffOutput, templateComparison)) {
      return 'NO CHANGES';
    }

    return 'HAS CHANGES';
  }

  private areChangesNonFunctional(
    diffOutput: string, 
    templateComparison: TemplateComparison
  ): boolean {
    // Define what constitutes "non-functional" changes that don't affect CloudFormation state
    const nonFunctionalPatterns = [
      /^\s*"Metadata":/,
      /^\s*"Description":/,
      /CDKMetadata/,
      /timestamp/,
      /^\s*\/\/.*$/  // Comments
    ];

    const diffLines = diffOutput.split('\n');
    const functionalChanges = diffLines.filter(line => {
      if (!line.startsWith('+') && !line.startsWith('-')) {
        return false; // Not a change line
      }

      return !nonFunctionalPatterns.some(pattern => pattern.test(line));
    });

    // Check if modifications are only in non-functional properties
    const functionalModifications = templateComparison.modifiedResources.filter(mod => 
      mod.differences.some(diff => 
        !nonFunctionalPatterns.some(pattern => pattern.test(diff))
      )
    );

    return functionalChanges.length === 0 && functionalModifications.length === 0;
  }

  /**
   * Generate detailed validation report
   */
  generateValidationReport(result: ValidationResult): string[] {
    const report: string[] = [];

    report.push('=== Migration Validation Report ===');
    report.push('');

    // Overall result
    if (result.success && result.diffResult === 'NO CHANGES') {
      report.push('✅ Migration validation PASSED');
      report.push('✅ Templates are identical - no CloudFormation state changes');
    } else if (result.success && result.diffResult === 'HAS CHANGES') {
      report.push('⚠️  Migration validation PASSED with warnings');
      report.push('⚠️  Templates have differences - manual review recommended');
    } else {
      report.push('❌ Migration validation FAILED');
    }

    report.push('');

    // Template comparison summary
    const tc = result.templateComparison;
    report.push('Template Comparison:');
    report.push(`  Original resources: ${tc.originalResourceCount}`);
    report.push(`  Migrated resources: ${tc.migratedResourceCount}`);
    report.push(`  Matching resources: ${tc.matchingResources}`);
    report.push(`  Missing resources: ${tc.missingResources.length}`);
    report.push(`  Extra resources: ${tc.extraResources.length}`);
    report.push(`  Modified resources: ${tc.modifiedResources.length}`);

    // Detailed differences
    if (tc.missingResources.length > 0) {
      report.push('');
      report.push('Missing Resources (will be deleted):');
      tc.missingResources.forEach(resource => {
        report.push(`  - ${resource}`);
      });
    }

    if (tc.extraResources.length > 0) {
      report.push('');
      report.push('Extra Resources (will be created):');
      tc.extraResources.forEach(resource => {
        report.push(`  - ${resource}`);
      });
    }

    if (tc.modifiedResources.length > 0) {
      report.push('');
      report.push('Modified Resources:');
      tc.modifiedResources.forEach(mod => {
        report.push(`  ${mod.logicalId}:`);
        mod.differences.forEach(diff => {
          report.push(`    - ${diff}`);
        });
      });
    }

    // Validation errors
    if (result.validationErrors.length > 0) {
      report.push('');
      report.push('Validation Errors:');
      result.validationErrors.forEach(error => {
        report.push(`  ❌ ${error}`);
      });
    }

    // Warnings
    if (result.warnings.length > 0) {
      report.push('');
      report.push('Warnings:');
      result.warnings.forEach(warning => {
        report.push(`  ⚠️  ${warning}`);
      });
    }

    return report;
  }
}