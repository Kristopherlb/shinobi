/**
 * Schema Validator Service - Single responsibility for JSON Schema validation
 * Implements Principle 4: Single Responsibility Principle
 * Enhanced with component-specific schema validation
 */
import AjvImport, { type Ajv as AjvInstance, type ErrorObject } from 'ajv';
import addFormatsImport from 'ajv-formats';
import { Logger } from '../platform/logger/src/index.ts';
import { SchemaManager } from './schema-manager.ts';
import { SchemaErrorFormatter } from './schema-error-formatter.ts';
import { EnhancedSchemaValidator, ValidationResult } from './enhanced-schema-validator.ts';
import { ManifestSchemaComposer } from './manifest-schema-composer.ts';

export interface SchemaValidatorDependencies {
  logger: Logger;
  schemaManager: SchemaManager;
  enhancedValidator?: EnhancedSchemaValidator;
  schemaComposer?: ManifestSchemaComposer;
}

/**
 * Pure service for JSON Schema validation
 * Responsibility: Stage 2 - Schema Validation (AC-P2.1, AC-P2.2, AC-P2.3)
 * Enhanced with comprehensive component-specific validation
 */
export class SchemaValidator {
  private ajv: AjvInstance;
  private enhancedValidator: EnhancedSchemaValidator;

  constructor(private dependencies: SchemaValidatorDependencies) {
    const AjvConstructor = AjvImport as unknown as typeof import('ajv').default;
    const addFormats = addFormatsImport as unknown as (ajv: AjvInstance) => AjvInstance;

    this.ajv = new AjvConstructor({ allErrors: true, verbose: true });
    addFormats(this.ajv);

    // Initialize enhanced validator if not provided
    if (!this.dependencies.enhancedValidator) {
      if (!this.dependencies.schemaComposer) {
        this.dependencies.schemaComposer = new ManifestSchemaComposer({
          logger: this.dependencies.logger
        });
      }

      this.enhancedValidator = new EnhancedSchemaValidator({
        logger: this.dependencies.logger,
        schemaComposer: this.dependencies.schemaComposer
      });
    } else {
      this.enhancedValidator = this.dependencies.enhancedValidator;
    }
  }

  async validateSchema(manifest: any): Promise<void> {
    this.dependencies.logger.debug('Validating manifest schema with enhanced validation');

    if (process.env.SHINOBI_DISABLE_ENHANCED_VALIDATION === 'true') {
      this.dependencies.logger.debug('Enhanced validation disabled via SHINOBI_DISABLE_ENHANCED_VALIDATION=true; using basic schema validation.');
      await this.basicValidateSchema(manifest);
      return;
    }

    let result: ValidationResult | undefined;
    try {
      // Use enhanced validator for comprehensive validation
      result = await this.enhancedValidator.validateManifest(manifest);
    } catch (err) {
      // Crash during composition/compile — safe to fall back
      this.dependencies.logger.warn(`Enhanced validation crashed; falling back to basic validation: ${(err as Error).message}`);
      await this.basicValidateSchema(manifest);
      return;
    }

    if (!result.valid) {
      // Generate detailed error report
      const errorReport = this.enhancedValidator.generateValidationReport(result);

      this.dependencies.logger.error('Enhanced schema validation failed', {
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        componentResults: result.componentValidationResults.length,
        detailedReport: errorReport
      });

      // DO NOT fall back here — surface the failure
      throw new Error(errorReport);
    }

    // Log warnings if any
    if (result.warnings.length > 0) {
      this.dependencies.logger.warn(`Schema validation completed with ${result.warnings.length} warnings`);
      for (const warning of result.warnings) {
        this.dependencies.logger.warn(`  - ${warning.path}: ${warning.message}`);
      }
    }

    // Log component validation summary
    const componentStats = result.componentValidationResults.reduce((stats, component) => {
      stats.total++;
      if (component.valid) stats.valid++;
      else stats.invalid++;
      return stats;
    }, { total: 0, valid: 0, invalid: 0 });

    this.dependencies.logger.debug('Enhanced schema validation completed successfully');
  }

  /**
   * Fallback basic schema validation using the original approach
   */
  private async basicValidateSchema(manifest: any): Promise<void> {
    this.dependencies.logger.debug('Performing basic schema validation');

    // Get the base schema (dynamically composed)
    const schema = await this.dependencies.schemaManager.getBaseSchema();

    const validate = this.ajv.compile(schema);
    const valid = validate(manifest);

    if (!valid) {
      const errors = (validate.errors ?? []) as ErrorObject[];

      // Use the enhanced error formatter for better developer experience
      const errorReport = SchemaErrorFormatter.generateErrorReport(errors);

      this.dependencies.logger.error('Basic schema validation failed', {
        errors: errors,
        formattedReport: errorReport
      });

      throw new Error(errorReport);
    }

    this.dependencies.logger.debug('Basic schema validation completed successfully');
  }

  /**
   * Get validation statistics and schema composition info
   */
  getValidationStats(): any {
    return {
      schemaStats: this.enhancedValidator.getSchemaStats(),
      validatorType: 'enhanced'
    };
  }
}
